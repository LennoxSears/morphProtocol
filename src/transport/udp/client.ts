import * as dgram from 'dgram';
import * as crypto from 'crypto';
import { Obfuscator } from '../../core/obfuscator';
import { fnInitor } from '../../core/function-initializer';
import { Encryptor } from '../../crypto/encryptor';
import { getClientConfig } from '../../config';
import { logger } from '../../utils/logger';
import { ProtocolTemplate } from '../../core/protocol-templates/base-template';
import { createTemplate } from '../../core/protocol-templates/template-factory';
import { selectRandomTemplate } from '../../core/protocol-templates/template-selector';

let client: any;
let handshakeInterval: NodeJS.Timeout;
let heartBeatInterval: NodeJS.Timeout;
let inactivityCheckInterval: NodeJS.Timeout;
let clientOpenStatus = false;
let HANDSHAKE_SERVER_ADDRESS: string;
let HANDSHAKE_SERVER_PORT: number;
let userId: string;
let encryptor: Encryptor;
let clientID: Buffer; // 16 bytes binary
let lastReceivedTime: number = 0; // Track last packet from server
let newServerPort: number; // Store the port of the new server
let protocolTemplate: ProtocolTemplate; // Protocol template for packet encapsulation
let clientPort: number = 0; // Store client port for reuse on reconnection

export function startUdpClient(remoteAddress: string, encryptionKey: string): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const config = getClientConfig(remoteAddress);
    
    HANDSHAKE_SERVER_ADDRESS = config.remoteAddress;
    HANDSHAKE_SERVER_PORT = config.remotePort;
    userId = config.userId;
    
    // Generate 16-byte clientID (per process, ephemeral)
    clientID = crypto.randomBytes(16);
    logger.info(`Generated clientID: ${clientID.toString('hex')}`);
    
    // Initialize encryptor with password from config
    encryptor = new Encryptor(process.env.PASSWORD || 'bumoyu123');
    encryptor.setSimple(encryptionKey);
    const LOCALWG_ADDRESS = config.localWgAddress;
    const LOCALWG_PORT = config.localWgPort;
    const MAX_RETRIES = config.maxRetries;
    const HEARTBEAT_INTERVAL = config.heartbeatInterval;
    const INACTIVITY_TIMEOUT = config.inactivityTimeout;
    const INACTIVITY_CHECK_INTERVAL = 90000; // Check every 90 seconds
    
    // Function to generate heartbeat with current clientID and template
    function getHeartbeatData() {
      const heartbeatMarker = Buffer.from([0x01]); // 1 byte marker
      const packet = protocolTemplate.encapsulate(heartbeatMarker, clientID);
      
      protocolTemplate.updateState();
      return packet;
    }


    // Select random protocol template
    const templateId = selectRandomTemplate();
    protocolTemplate = createTemplate(templateId);
    logger.info(`Selected protocol template: ${protocolTemplate.name} (ID: ${templateId})`);
    
    let handshakeData = {
      clientID: clientID.toString('base64'), // 16 bytes → 24 char base64
      key: config.obfuscation.key,
      obfuscationLayer: config.obfuscation.layer,
      randomPadding: config.obfuscation.paddingLength,
      fnInitor: fnInitor(),
      templateId: templateId,
      templateParams: protocolTemplate.getParams(),
      userId: userId,
      publicKey: 'not implemented',
    };

    // Create an instance of the Obfuscator class
    let obfuscator = new Obfuscator(
      handshakeData.key,
      handshakeData.obfuscationLayer,
      handshakeData.randomPadding,
      handshakeData.fnInitor
    );


    if (handshakeInterval) {
      clearInterval(handshakeInterval);
    }
    if (heartBeatInterval) {
      clearInterval(heartBeatInterval);
    }
    if (inactivityCheckInterval) {
      clearInterval(inactivityCheckInterval);
    }
    // On reconnection, don't close the socket - reuse it to keep the same port
    if (client && clientOpenStatus && clientPort === 0) {
      // Only close on first connection cleanup
      let msgClose = encryptor.simpleEncrypt('close');
      client.send(msgClose, 0, msgClose.length, HANDSHAKE_SERVER_PORT, HANDSHAKE_SERVER_ADDRESS, (error: any) => {
        if (error) {
          logger.error('Failed to send close message:', error);
        } else {
          logger.info('Close message sent to handshake server');
        }
      });
      client.close()
    }
    
    // Create a UDP client socket (or reuse existing on reconnection)
    if (!client || clientPort === 0) {
      client = dgram.createSocket('udp4');
    } else {
      logger.info('Reusing existing socket for reconnection');
    }
    let clientRetry = 0

    // Function to check for inactivity and reconnect
    function checkInactivity() {
      if (!newServerPort || lastReceivedTime === 0) {
        // Not yet connected or no data received yet
        return;
      }
      
      const timeSinceLastReceived = Date.now() - lastReceivedTime;
      
      if (timeSinceLastReceived > INACTIVITY_TIMEOUT) {
        logger.warn(`Inactivity detected: ${timeSinceLastReceived}ms since last packet`);
        logger.info('Attempting to reconnect with NEW clientID and packet pattern...');
        
        // Clear heartbeat interval
        if (heartBeatInterval) {
          clearInterval(heartBeatInterval);
        }
        
        // Reset server port to trigger reconnection
        const oldPort = newServerPort;
        const oldClientID = clientID.toString('hex');
        newServerPort = 0;
        
        // Generate NEW clientID to evade GFW blocking
        clientID = crypto.randomBytes(16);
        logger.info(`Old clientID: ${oldClientID}`);
        logger.info(`New clientID: ${clientID.toString('hex')}`);
        
        // Select NEW protocol template to evade GFW blocking
        const newTemplateId = selectRandomTemplate();
        protocolTemplate = createTemplate(newTemplateId);
        logger.info(`Old template: ${handshakeData.templateId}, New template: ${protocolTemplate.name} (ID: ${newTemplateId})`);
        
        // Generate NEW obfuscation parameters to evade GFW blocking
        handshakeData = {
          clientID: clientID.toString('base64'), // NEW clientID
          key: Math.floor(Math.random() * 256),  // NEW random key
          obfuscationLayer: config.obfuscation.layer,
          randomPadding: config.obfuscation.paddingLength,
          fnInitor: fnInitor(),                  // NEW function initializer
          templateId: newTemplateId,             // NEW template
          templateParams: protocolTemplate.getParams(), // NEW template params
          userId: userId,
          publicKey: 'not implemented',
        };
        
        // Create NEW obfuscator with new parameters
        obfuscator = new Obfuscator(
          handshakeData.key,
          handshakeData.obfuscationLayer,
          handshakeData.randomPadding,
          handshakeData.fnInitor
        );
        
        logger.info(`New obfuscation parameters: key=${handshakeData.key}, fnInitor=${handshakeData.fnInitor}`);
        
        // Send handshake to reconnect (new clientID, new packet pattern)
        sendHandshakeData();
        
        logger.info(`Reconnection handshake sent (old port: ${oldPort})`);
      }
    }

    // Function to send handshake data to the handshake server
    function sendHandshakeData() {
      const handshakeJson = JSON.stringify(handshakeData);
      logger.debug(`Handshake data size: ${handshakeJson.length} bytes`);
      
      const msgEncrypted = encryptor.simpleEncrypt(handshakeJson);
      const message = Buffer.from(msgEncrypted);

      client.send(message, 0, message.length, HANDSHAKE_SERVER_PORT, HANDSHAKE_SERVER_ADDRESS, (error: any) => {
        if (error) {
          logger.error('Failed to send handshake data:', error);
        } else {
          logger.info('Handshake data sent to handshake server');
        }
      });
    }

    // Handle incoming messages from the handshake server and the new UDP server
    client.on('message', (message: any, remote: any) => {
      if (remote.port === HANDSHAKE_SERVER_PORT) {
        // Decrypt message from handshake server
        message = Buffer.from(encryptor.simpleDecrypt(message.toString()));
        
        // Message received from the handshake server
        if (message.toString() === "inactivity") {
          logger.warn('Server detected inactivity, closing connection');
          
          if (handshakeInterval) {
            clearInterval(handshakeInterval);
          }
          if (heartBeatInterval) {
            clearInterval(heartBeatInterval);
          }
          
          const msgClose = encryptor.simpleEncrypt('close');
          client.send(msgClose, 0, msgClose.length, HANDSHAKE_SERVER_PORT, HANDSHAKE_SERVER_ADDRESS, (error: any) => {
            if (error) {
              logger.error('Failed to send close message:', error);
            } else {
              logger.info('Close message sent to handshake server');
            }
          });
          client.close();
        }
        else if (message.toString() === "server_full") {
          // Stop sending handshake data and start communication with the new UDP server
          if (handshakeInterval) {
            clearInterval(handshakeInterval);
          }
          if (heartBeatInterval) {
            clearInterval(heartBeatInterval);
          }
          let msgClose = encryptor.simpleEncrypt('close')
          client.send(msgClose, 0, msgClose.length, HANDSHAKE_SERVER_PORT, HANDSHAKE_SERVER_ADDRESS, (error: any) => {
            if (error) {
              logger.error('Failed to send handshake data:', error);
            } else {
              logger.info('Handshake data sent to the handshake server');
            }
          });
          client.close()
          reject("server_full")
        }
        else {
          // Parse JSON response with port and clientID
          try {
            const response = JSON.parse(message.toString());
            if (response.port && response.clientID) {
              newServerPort = response.port;
              const confirmedClientID = response.clientID;
              
              logger.info(`Received server response:`);
              logger.info(`  Port: ${newServerPort}`);
              logger.info(`  ClientID confirmed: ${confirmedClientID}`);
              logger.info(`  Status: ${response.status || 'unknown'}`);
              
              // Verify clientID matches
              if (confirmedClientID !== clientID.toString('base64')) {
                logger.warn('ClientID mismatch! Server returned different clientID');
              }
              
              // Stop sending handshake data and start heartbeat
              if (handshakeInterval) {
                clearInterval(handshakeInterval);
              }
              
              heartBeatInterval = setInterval(() => {
                const heartbeat = getHeartbeatData();
                client.send(heartbeat, 0, heartbeat.length, newServerPort, HANDSHAKE_SERVER_ADDRESS, (error: any) => {
                  if (error) {
                    logger.error('Failed to send heartbeat to new server:', error);
                  } else {
                    logger.debug('Heartbeat sent to new server');
                  }
                })
              }, HEARTBEAT_INTERVAL);
              
              // Start inactivity check
              lastReceivedTime = Date.now(); // Initialize
              if (inactivityCheckInterval) {
                clearInterval(inactivityCheckInterval);
              }
              inactivityCheckInterval = setInterval(checkInactivity, INACTIVITY_CHECK_INTERVAL);
              logger.info(`Inactivity detection started (timeout: ${INACTIVITY_TIMEOUT}ms)`);
              
              resolve(clientPort);
            } else {
              logger.error('Invalid server response - missing port or clientID:', message.toString());
            }
          } catch (e) {
            logger.error('Failed to parse server response:', message.toString());
          }
        }

      } else if (remote.address === LOCALWG_ADDRESS && remote.port === LOCALWG_PORT) {
        // Received packet from WireGuard - forward to server
        logger.debug(`[WG→Server] Received ${message.length} bytes from WireGuard`);
        
        // Convert Buffer to proper ArrayBuffer (avoid buffer pool issues)
        const wgBuffer = Buffer.from(message);
        const wgArrayBuffer = wgBuffer.buffer.slice(
          wgBuffer.byteOffset,
          wgBuffer.byteOffset + wgBuffer.byteLength
        );
        sendToNewServer(wgArrayBuffer);
      } else if (remote.port === newServerPort) {
        // Update last received time when we get data from server
        lastReceivedTime = Date.now();
        
        logger.debug(`[Server→WG] Received ${message.length} bytes from server`);
        
        // Decapsulate template layer
        const obfuscatedData = protocolTemplate.decapsulate(message);
        if (!obfuscatedData) {
          logger.warn('[Server→WG] Failed to decapsulate template packet from server');
          return;
        }
        
        logger.debug(`[Server→WG] After template decapsulation: ${obfuscatedData.length} bytes`);
        
        // Create proper ArrayBuffer with exact size (avoid buffer pool issues)
        const obfuscatedBuffer = Buffer.from(obfuscatedData);
        const obfuscatedArrayBuffer = obfuscatedBuffer.buffer.slice(
          obfuscatedBuffer.byteOffset,
          obfuscatedBuffer.byteOffset + obfuscatedBuffer.byteLength
        );
        sendToLocalWG(obfuscatedArrayBuffer);
      } else {
        // Message received from unknown server
        logger.info(`Received data from unknown server: ${remote.address}:${remote.port}`);
      }
    });

    // Function to send data to the new UDP server
    function sendToNewServer(message: ArrayBuffer) {
      if (newServerPort) {
        logger.debug(`[WG→Server] Obfuscating ${message.byteLength} bytes`);
        const obfuscatedData = obfuscator.obfuscation(message);
        logger.debug(`[WG→Server] After obfuscation: ${obfuscatedData.length} bytes`);
        
        // Encapsulate with protocol template
        const packet = protocolTemplate.encapsulate(Buffer.from(obfuscatedData), clientID);
        logger.debug(`[WG→Server] After template: ${packet.length} bytes, sending to ${HANDSHAKE_SERVER_ADDRESS}:${newServerPort}`);
        
        // Update template state (sequence numbers, etc.)
        protocolTemplate.updateState();
        
        client.send(packet, 0, packet.length, newServerPort, HANDSHAKE_SERVER_ADDRESS, (error: any) => {
          if (error) {
            logger.error('[WG→Server] Failed to send data to new server:', error);
          } else {
            logger.debug('[WG→Server] Packet sent successfully');
          }
        });
      } else {
        logger.error('New server port is not available yet');
      }
    }

    // Function to send data to WireGuard
    function sendToLocalWG(message: ArrayBuffer) {
      logger.debug(`[Server→WG] Deobfuscating ${message.byteLength} bytes`);
      const deobfuscatedData = obfuscator.deobfuscation(message);
      logger.debug(`[Server→WG] After deobfuscation: ${deobfuscatedData.length} bytes, sending to WireGuard ${LOCALWG_ADDRESS}:${LOCALWG_PORT}`);
      
      client.send(deobfuscatedData, 0, deobfuscatedData.length, LOCALWG_PORT, LOCALWG_ADDRESS, (error: any) => {
        if (error) {
          logger.error('[Server→WG] Failed to send data to WireGuard:', error);
        } else {
          logger.debug('[Server→WG] Packet sent to WireGuard successfully');
        }
      });
    }

    client.on('listening', () => {
      clientOpenStatus = true
    })
    client.on('close', () => {
      clientOpenStatus = false
    })
    // Bind the socket to a specific port (reuse port on reconnection)
    if (clientPort === 0) {
      // First connection - bind to any available port
      client.bind(() => {
        clientPort = client.address().port;
        logger.info(`Client socket bound to port ${clientPort} (will reuse on reconnection)`);
        startHandshake();
      });
    } else {
      // Reconnection - reuse the same port
      client.bind(clientPort, () => {
        logger.info(`Client socket rebound to port ${clientPort} (reused from previous connection)`);
        startHandshake();
      });
    }
    
    function startHandshake() {

      // Send handshake data initially
      sendHandshakeData();

      // Set an interval to send handshake data periodically
      handshakeInterval = setInterval(() => {
        sendHandshakeData();
        clientRetry++
        if (clientRetry >= MAX_RETRIES) {
          clearInterval(handshakeInterval);
          let msgClose = encryptor.simpleEncrypt('close')
          client.send(msgClose, 0, msgClose.length, HANDSHAKE_SERVER_PORT, HANDSHAKE_SERVER_ADDRESS, (error: any) => {
            if (error) {
              logger.error('Failed to send handshake data:', error);
            } else {
              logger.info('Handshake data sent to the handshake server');
            }
          });
          client.close();
          reject("max_retries")
        }
      }, 5000);
    }
  });
}


export function stopUdpClient(): Promise<void> {
  return new Promise<void>((resolve, _reject) => {
    // Stop sending handshake data and heartbeats
    if (handshakeInterval) {
      clearInterval(handshakeInterval);
      logger.info('handshakeInterval stopping...')
    }
    if (heartBeatInterval) {
      clearInterval(heartBeatInterval);
      logger.info('heartBeatInterval stopping...')
    }
    if (inactivityCheckInterval) {
      clearInterval(inactivityCheckInterval);
      logger.info('inactivityCheckInterval stopping...')
    }

    if (client && clientOpenStatus) {
      logger.info('client sending close tag...')
      let msgClose = encryptor.simpleEncrypt('close')
      client.send(msgClose, 0, msgClose.length, HANDSHAKE_SERVER_PORT, HANDSHAKE_SERVER_ADDRESS, (error: any) => {
        if (error) {
          logger.error('Failed to send close msg:', error);
        } else {
          logger.info('close msg sent to the handshake server');
          // Close the UDP socket
          client.close(() => {
            logger.info('client closed')
            // Unreference the socket to allow the application to exit even if the socket is still open
            client.unref();

            // Resolve the promise to indicate that the socket has been closed and destroyed
            resolve();
          });
        }
      });
    } else {
      // If the client variable is not defined, assume that the socket is already closed
      resolve();
    }
  });
}

export function udpClientStatus(): boolean {
  return clientOpenStatus
}

//startUdpClient('155.138.207.53:12301:f47ac10b-58cc-4372-a567-0e02b2c3d479', 'TQfzhkxSK956AX3JWJvjnn47zqHuBNFKcSlTfi0oEgg=:Mnn3mEUHJFnkMvBRRguqYg==')