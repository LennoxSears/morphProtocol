import * as dgram from 'dgram';
import * as crypto from 'crypto';
import { Obfuscator } from '../../core/obfuscator';
import { fnInitor } from '../../core/function-initializer';
import { Encryptor } from '../../crypto/encryptor';
import { getClientConfig } from '../../config';
import { logger } from '../../utils/logger';

let client: any;
let handshakeInterval: NodeJS.Timeout;
let heartBeatInterval: NodeJS.Timeout;
let clientOpenStatus = false;
let HANDSHAKE_SERVER_ADDRESS: string;
let HANDSHAKE_SERVER_PORT: number;
let userId: string;
let encryptor: Encryptor;
let clientID: Buffer; // 16 bytes binary

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
    
    // Heartbeat with clientID prepended
    const heartbeatData = Buffer.concat([
      clientID,              // 16 bytes
      Buffer.from([0x01])    // 1 byte marker
    ]);

    const handshakeData = {
      clientID: clientID.toString('base64'), // 16 bytes → 24 char base64
      key: config.obfuscation.key,
      obfuscationLayer: config.obfuscation.layer,
      randomPadding: config.obfuscation.paddingLength,
      fnInitor: fnInitor(),
      userId: userId,
      publicKey: 'not implemented',
    };

    // Create an instance of the Obfuscator class
    const obfuscator = new Obfuscator(
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

    let newServerPort: number; // Store the port of the new server

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
              
              // Stop sending handshake data and start heartbeat
              if (handshakeInterval) {
                clearInterval(handshakeInterval);
              }
              
              heartBeatInterval = setInterval(() => {
                client.send(heartbeatData, 0, heartbeatData.length, newServerPort, HANDSHAKE_SERVER_ADDRESS, (error: any) => {
                  if (error) {
                    logger.error('Failed to send heartbeat to new server:', error);
                  } else {
                    logger.debug('Heartbeat sent to new server');
                  }
                })
              }, HEARTBEAT_INTERVAL);
              
              resolve(clientPort);
            } else if (!isNaN(parseInt(message.toString(), 10))) {
              // Fallback: old format (just port number)
              newServerPort = parseInt(message.toString(), 10);
              logger.info(`Received new server port (legacy format): ${newServerPort}`);
              
              if (handshakeInterval) {
                clearInterval(handshakeInterval);
              }
              
              heartBeatInterval = setInterval(() => {
                client.send(heartbeatData, 0, heartbeatData.length, newServerPort, HANDSHAKE_SERVER_ADDRESS, (error: any) => {
                  if (error) {
                    logger.error('Failed to send heartbeat to new server:', error);
                  } else {
                    logger.debug('Heartbeat sent to new server');
                  }
                })
              }, HEARTBEAT_INTERVAL);
              
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
        sendToLocalWG(message);
      } else {
        // Message received from the new UDP server
        logger.info(`Received data from unknown server: ${message.toString()}`);

        // Process the received data from the new server
        // ...
      }
    });

    // Function to send data to the new UDP server
    function sendToNewServer(message: ArrayBuffer) {
      if (newServerPort) {
        const obfuscatedData = obfuscator.obfuscation(message);
        
        // Prepend clientID to obfuscated data
        const packet = Buffer.concat([
          clientID,                    // 16 bytes
          Buffer.from(obfuscatedData)  // N bytes
        ]);
        
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
  return new Promise<void>((resolve, reject) => {
    // Stop sending handshake data and heartbeats
    if (handshakeInterval) {
      clearInterval(handshakeInterval);
      logger.info('handshakeInterval stopping...')
    }
    if (heartBeatInterval) {
      clearInterval(heartBeatInterval);
      logger.info('heartBeatInterval stopping...')
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