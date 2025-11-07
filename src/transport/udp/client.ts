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
import { deriveSessionKeys, encapsulateSecure, decapsulateSecure, SessionKeys } from '../../core/packet-security';

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
let sessionKeys: SessionKeys; // Session keys for packet security
let packetSequence: number = 0; // Packet sequence number for replay protection

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
    const INACTIVITY_CHECK_INTERVAL = 10000; // Check every 10 seconds
    
    // Function to generate heartbeat with current clientID and template
    function getHeartbeatData() {
      const heartbeatMarker = Buffer.from([0x01]); // 1 byte marker
      let packet = protocolTemplate.encapsulate(heartbeatMarker, clientID);
      
      // Add security layer if session keys available
      if (sessionKeys) {
        packet = encapsulateSecure(clientID, packet, packetSequence++, sessionKeys.sessionKey, sessionKeys.hmacKey);
      }
      
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
    if (client && clientOpenStatus) {
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
    // Create a UDP client socket
    client = dgram.createSocket('udp4');
    let clientPort: number
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
          // Try to parse as JSON response with port and clientID
          try {
            const response = JSON.parse(message.toString());
            if (response.port && response.clientID) {
              newServerPort = response.port;
              const confirmedClientID = response.clientID;
              
              logger.info(`Received server response:`);
              logger.info(`  Port: ${newServerPort}`);
              logger.info(`  ClientID confirmed: ${confirmedClientID}`);
              
              // Verify clientID matches
              if (confirmedClientID !== clientID.toString('base64')) {
                logger.warn('ClientID mismatch! Server returned different clientID');
              }
              
              // Derive session keys from session salt
              if (response.sessionSalt) {
                const sharedSecret = Buffer.from(handshakeData.key.toString()); // Use obfuscation key as shared secret
                const salt = Buffer.from(response.sessionSalt, 'base64');
                sessionKeys = deriveSessionKeys(sharedSecret, salt);
                packetSequence = response.serverNonce || 0; // Initialize sequence from server nonce
                logger.info('Session keys derived, packet security enabled');
              } else {
                logger.warn('No session salt received, packet security disabled');
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
            } else if (!isNaN(parseInt(message.toString(), 10))) {
              // Fallback: old format (just port number)
              newServerPort = parseInt(message.toString(), 10);
              logger.info(`Received new server port (legacy format): ${newServerPort}`);
              
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
              logger.error('Invalid server response:', message.toString());
            }
          } catch (e) {
            logger.error('Failed to parse server response:', message.toString());
          }
        }

      } else if (remote.port === LOCALWG_PORT) {
        sendToNewServer(message);
      } else if (remote.port === newServerPort) {
        // Update last received time when we get data from server
        lastReceivedTime = Date.now();
        
        // Decapsulate packet from server
        let packetToProcess = message;
        
        // If security enabled, decapsulate security layer first
        if (sessionKeys) {
          const secureResult = decapsulateSecure(message, sessionKeys.sessionKey, sessionKeys.hmacKey, packetSequence - 1);
          if (!secureResult) {
            logger.warn('Failed to decapsulate secure packet from server');
            return;
          }
          packetToProcess = secureResult.data;
        }
        
        // Decapsulate template layer
        const obfuscatedData = protocolTemplate.decapsulate(packetToProcess);
        if (!obfuscatedData) {
          logger.warn('Failed to decapsulate template packet from server');
          return;
        }
        
        sendToLocalWG(Buffer.from(obfuscatedData).buffer);
      } else {
        // Message received from unknown server
        logger.info(`Received data from unknown server: ${remote.address}:${remote.port}`);
      }
    });

    // Function to send data to the new UDP server
    function sendToNewServer(message: ArrayBuffer) {
      if (newServerPort) {
        const obfuscatedData = obfuscator.obfuscation(message);
        
        // Encapsulate with protocol template
        let packet = protocolTemplate.encapsulate(Buffer.from(obfuscatedData), clientID);
        
        // Add security layer if session keys available
        if (sessionKeys) {
          packet = encapsulateSecure(clientID, packet, packetSequence++, sessionKeys.sessionKey, sessionKeys.hmacKey);
        }
        
        // Update template state (sequence numbers, etc.)
        protocolTemplate.updateState();
        
        client.send(packet, 0, packet.length, newServerPort, HANDSHAKE_SERVER_ADDRESS, (error: any) => {
          if (error) {
            logger.error('Failed to send data to new server:', error);
          } else {
            //logger.info('Data sent to new server');
          }
        });
      } else {
        logger.error('New server port is not available yet');
      }
    }

    // Function to send data to the new UDP server
    function sendToLocalWG(message: ArrayBuffer) {
      const deobfuscatedData = obfuscator.deobfuscation(message);
      client.send(deobfuscatedData, 0, deobfuscatedData.length, LOCALWG_PORT, LOCALWG_ADDRESS, (error: any) => {
        if (error) {
          logger.error('Failed to send data to local-wg server:', error);
        } else {
          //logger.info('Data sent to local-wg server');
        }
      });
    }

    client.on('listening', () => {
      clientOpenStatus = true
    })
    client.on('close', () => {
      clientOpenStatus = false
    })
    // Bind the socket to a specific port
    client.bind(() => {
      clientPort = client.address().port;
      logger.info(`Client socket bound to port ${clientPort}`);

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
    });
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
          logger.error('Failed to send handshake data:', error);
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

//startUdpClient('5.104.80.248')