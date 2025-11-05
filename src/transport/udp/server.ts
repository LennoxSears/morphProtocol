import * as dgram from 'dgram';
import * as crypto from 'crypto';
import { Obfuscator } from '../../core/obfuscator';
import { subTraffic, subClientNum, addClientNum, updateServerInfo } from '../../api/client';
import { Encryptor } from '../../crypto/encryptor';
import { getServerConfig } from '../../config';
import { logger } from '../../utils/logger';
import { UserInfo } from '../../types';
import { ProtocolTemplate } from '../../core/protocol-templates/base-template';
import { createTemplate } from '../../core/protocol-templates/template-factory';
import { deriveSessionKeys, decapsulateSecure, encapsulateSecure, SessionKeys } from '../../core/packet-security';
import { RateLimiter } from '../../core/rate-limiter';

// //function to record concurrency client and max client
// let clientStatOperation = function(ins:number) {
//   let rawdata = fs.readFileSync('../clientStat.json', { encoding: 'utf8' });
//   let clientStat = JSON.parse(rawdata);
//   clientStat.current = clientStat.current + ins;
//   if(clientStat.current < 0) {
//     clientStat.current = 0
//   }
//   fs.writeFileSync('../clientStat.json', JSON.stringify(clientStat));
//   return clientStat;
// }

const config = getServerConfig();
const HOST_NAME = config.hostName;
const HOST_IP = config.hostIp;
const PORT = config.handshakePortUdp;
const TIMEOUT_DURATION = config.timeoutDuration;
const LOCALWG_PORT = config.localWgPort;
const LOCALWG_ADDRESS = config.localWgAddress;
const TRAFFIC_INTERVAL = config.trafficInterval;
const PASSWORD = config.password;

logger.info(`Starting UDP server on port ${PORT}`);

const server = dgram.createSocket('udp4');
const encryptor = new Encryptor(PASSWORD);
const encryptionInfo = `${encryptor.simpleKey.toString('base64')}:${encryptor.simpleVi.toString('base64')}`;
logger.info(`Encryption info: ${encryptionInfo}`);
updateServerInfo(HOST_NAME, HOST_IP, PORT, encryptionInfo);

// Rate limiters
const handshakeRateLimiter = new RateLimiter(10, 60000); // 10 handshakes per minute per IP
const packetRateLimiter = new RateLimiter(1000, 1000);   // 1000 packets per second per IP
logger.info('Rate limiters initialized');

// Client session structure
interface ClientSession {
  clientID: string;           // hex string (32 chars)
  remoteAddress: string;
  remotePort: number;
  socket: dgram.Socket;
  obfuscator: Obfuscator;
  template: ProtocolTemplate;  // Protocol template for packet encapsulation
  sessionKeys?: SessionKeys;   // Session keys for packet security
  lastSequence: number;        // Last valid sequence number (replay protection)
  packetSequence: number;      // Server's packet sequence number
  userInfo: UserInfo;
  publicKey: string;
  lastSeen: number;
}

// Map to store active sessions by clientID
const activeSessions: Map<string, ClientSession> = new Map();

// Helper function to handle close messages
function handleCloseMessage(remote: any) {
  // Find session by IP:port (since close message doesn't have clientID)
  let foundClientID: string | null = null;
  for (const [clientID, session] of activeSessions.entries()) {
    if (session.remoteAddress === remote.address && session.remotePort === remote.port) {
      foundClientID = clientID;
      break;
    }
  }
  
  if (!foundClientID) {
    logger.warn(`Received close from unknown client ${remote.address}:${remote.port}`);
    return;
  }
  
  const session = activeSessions.get(foundClientID)!;
  logger.info(`Client ${foundClientID} closing connection`);
  
  // Report traffic and cleanup
  subTraffic(session.userInfo.userId, session.userInfo.traffic);
  session.socket.close();
  activeSessions.delete(foundClientID);
  subClientNum(HOST_NAME);
}

// Helper function to handle data packets (with protocol template encapsulation and security)
function handleDataPacket(packet: Buffer, remote: any) {
  // Try to decapsulate with each active session's template
  // (We don't know which session this packet belongs to until we decapsulate)
  let matchedSession: ClientSession | null = null;
  let clientID: string = '';
  let obfuscatedData: Buffer | null = null;
  
  // Try to find matching session by attempting decapsulation
  for (const [sessionClientID, session] of activeSessions.entries()) {
    let packetToDecapsulate = packet;
    
    // If session has security enabled, decapsulate security layer first
    if (session.sessionKeys) {
      const secureResult = decapsulateSecure(packet, session.sessionKeys.sessionKey, session.sessionKeys.hmacKey, session.lastSequence);
      if (!secureResult) {
        continue; // Security validation failed, try next session
      }
      
      // Update last sequence
      session.lastSequence = secureResult.sequence;
      
      // Verify clientID matches
      if (secureResult.clientID.toString('hex') !== sessionClientID) {
        logger.warn(`ClientID mismatch in secure packet: expected ${sessionClientID}, got ${secureResult.clientID.toString('hex')}`);
        continue;
      }
      
      packetToDecapsulate = secureResult.data;
    }
    
    // Decapsulate template layer
    const result = session.template.decapsulate(packetToDecapsulate);
    if (result && result.clientID.toString('hex') === sessionClientID) {
      matchedSession = session;
      clientID = sessionClientID;
      obfuscatedData = result.data;
      break;
    }
  }
  
  if (!matchedSession || !obfuscatedData) {
    logger.warn(`Received packet from unknown session or invalid format from ${remote.address}:${remote.port}`);
    return;
  }
  
  // Update IP if changed (IP migration!)
  if (matchedSession.remoteAddress !== remote.address || matchedSession.remotePort !== remote.port) {
    logger.info(`IP migration detected for client ${clientID}`);
    logger.info(`  Old: ${matchedSession.remoteAddress}:${matchedSession.remotePort}`);
    logger.info(`  New: ${remote.address}:${remote.port}`);
    matchedSession.remoteAddress = remote.address;
    matchedSession.remotePort = remote.port;
  }
  
  matchedSession.lastSeen = Date.now();
  
  // Check if heartbeat
  const isHeartbeat = obfuscatedData.length === 1 && obfuscatedData[0] === 0x01;
  
  if (isHeartbeat) {
    logger.debug(`Heartbeat from client ${clientID}`);
    return;
  }
  
  // Deobfuscate and forward to WireGuard
  const deobfuscatedData = matchedSession.obfuscator.deobfuscation(obfuscatedData.buffer);
  
  matchedSession.socket.send(deobfuscatedData, 0, deobfuscatedData.length, LOCALWG_PORT, LOCALWG_ADDRESS, (error) => {
    if (error) {
      logger.error(`Failed to send data to WireGuard for client ${clientID}`);
    }
  });
  
  // Update traffic
  session.userInfo.traffic += packet.length;
}

// Function to check if session should shut down due to inactivity
function checkInactivityTimeout(clientID: string) {
  const session = activeSessions.get(clientID);
  if (!session) return;
  
  const currentTime = Date.now();
  if (currentTime - session.lastSeen >= TIMEOUT_DURATION) {
    logger.info(`Shutting down session for clientID ${clientID} due to inactivity`);
    
    // Send inactivity message
    const msg = encryptor.simpleEncrypt("inactivity");
    server.send(msg, 0, msg.length, session.remotePort, session.remoteAddress, (error) => {
      if (error) {
        logger.error(`Failed to send inactivity message to ${clientID}`);
      } else {
        logger.info(`Inactivity message sent to ${clientID}`);
      }
    });
    
    // Report traffic and cleanup
    subTraffic(session.userInfo.userId, session.userInfo.traffic);
    session.socket.close();
    activeSessions.delete(clientID);
    subClientNum(HOST_NAME);
  }
}

// Traffic reporting interval
const trafficInterval = setInterval(() => {
  logger.info('Updating traffic for all active sessions');
  activeSessions.forEach((session, clientID) => {
    if (session.userInfo.traffic > 0) {
      subTraffic(session.userInfo.userId, session.userInfo.traffic);
      session.userInfo.traffic = 0;
    }
  });
}, TRAFFIC_INTERVAL);
// Handle incoming messages
server.on('message', async (message, remote) => {
  // Rate limit check for all packets
  if (!packetRateLimiter.isAllowed(remote.address)) {
    logger.warn(`Packet rate limit exceeded for ${remote.address}`);
    return;
  }
  
  try {
    // Try to decrypt as control message (handshake or close)
    let decryptedMessage: Buffer;
    try {
      decryptedMessage = Buffer.from(encryptor.simpleDecrypt(message.toString()));
    } catch (e) {
      // Not a control message, must be data packet with clientID
      handleDataPacket(message, remote);
      return;
    }
    
    // Handle close message
    if (decryptedMessage.toString() === 'close') {
      handleCloseMessage(remote);
      return;
    }
    
    // Handle handshake
    logger.info(`Received handshake from ${remote.address}:${remote.port}`);
    
    // Rate limit check for handshakes
    if (!handshakeRateLimiter.isAllowed(remote.address)) {
      logger.warn(`Handshake rate limit exceeded for ${remote.address}`);
      return;
    }
    // Parse handshake data
    const handshakeData = JSON.parse(decryptedMessage.toString());
    const clientIDBase64 = handshakeData.clientID;
    const clientIDBuffer = Buffer.from(clientIDBase64, 'base64');
    const clientID = clientIDBuffer.toString('hex'); // Use hex as Map key
    
    logger.info(`ClientID: ${clientID}`);
    logger.info(`UserID: ${handshakeData.userId}`);
    logger.info(`Template ID: ${handshakeData.templateId}`);
    
    // Check if session already exists (reconnection/IP migration)
    if (activeSessions.has(clientID)) {
      const session = activeSessions.get(clientID)!;
      logger.info(`Client ${clientID} reconnecting`);
      logger.info(`  Old IP: ${session.remoteAddress}:${session.remotePort}`);
      logger.info(`  New IP: ${remote.address}:${remote.port}`);
      
      // Update IP and port
      session.remoteAddress = remote.address;
      session.remotePort = remote.port;
      session.lastSeen = Date.now();
      
      // Send existing port back
      const responsePort = session.socket.address().port;
      const response = {
        port: responsePort,
        clientID: clientIDBase64,
        status: 'reconnected'
      };
      const responseEncrypted = encryptor.simpleEncrypt(JSON.stringify(response));
      
      server.send(responseEncrypted, 0, responseEncrypted.length, remote.port, remote.address, (error) => {
        if (error) {
          logger.error(`Failed to send reconnection response to ${clientID}`);
        } else {
          logger.info(`Reconnection response sent to ${clientID}`);
        }
      });
      return;
    }
    // New session - create obfuscator, template, and socket
    logger.info(`Creating new session for clientID ${clientID}`);
    
    const obfuscator = new Obfuscator(
      handshakeData.key,
      handshakeData.obfuscationLayer,
      handshakeData.randomPadding,
      handshakeData.fnInitor
    );
    
    // Create protocol template from handshake
    const template = createTemplate(handshakeData.templateId, handshakeData.templateParams);
    logger.info(`Created template: ${template.name} (ID: ${template.id})`);
    
    // Generate session salt and derive keys for packet security
    const sessionSalt = crypto.randomBytes(32);
    const sharedSecret = Buffer.from(handshakeData.key.toString());
    const sessionKeys = deriveSessionKeys(sharedSecret, sessionSalt);
    const serverNonce = Math.floor(Math.random() * 0xFFFFFFFF);
    logger.info('Session keys derived, packet security enabled');
    
    const newSocket = dgram.createSocket('udp4');
    
    // Create session
    const session: ClientSession = {
      clientID,
      remoteAddress: remote.address,
      remotePort: remote.port,
      socket: newSocket,
      obfuscator,
      template,
      sessionKeys,
      lastSequence: serverNonce,
      packetSequence: serverNonce,
      userInfo: { userId: handshakeData.userId, traffic: 0 },
      publicKey: handshakeData.publicKey,
      lastSeen: Date.now()
    };
    
    activeSessions.set(clientID, session);
    addClientNum(HOST_NAME);
    // Handle messages from WireGuard
    newSocket.on('message', (wgMessage, wgRemote) => {
      if (wgRemote.address === LOCALWG_ADDRESS) {
        const session = activeSessions.get(clientID);
        if (!session) return;
        
        // Obfuscate data from WireGuard
        const obfuscatedData = session.obfuscator.obfuscation(wgMessage);
        
        // Encapsulate with protocol template
        let packet = session.template.encapsulate(Buffer.from(obfuscatedData), clientIDBuffer);
        
        // Add security layer if session keys available
        if (session.sessionKeys) {
          packet = encapsulateSecure(clientIDBuffer, packet, session.packetSequence++, session.sessionKeys.sessionKey, session.sessionKeys.hmacKey);
        }
        
        // Update template state
        session.template.updateState();
        
        // Send to client
        newSocket.send(packet, 0, packet.length, session.remotePort, session.remoteAddress, (error) => {
          if (error) {
            logger.error(`Failed to send data to client ${clientID}`);
          }
        });
        
        // Update traffic
        session.userInfo.traffic += packet.length;
        session.lastSeen = Date.now();
      } else {
        // Data from client (with protocol template encapsulation and security)
        const session = activeSessions.get(clientID);
        if (!session) return;
        
        let packetToDecapsulate = wgMessage;
        
        // If session has security enabled, decapsulate security layer first
        if (session.sessionKeys) {
          const secureResult = decapsulateSecure(wgMessage, session.sessionKeys.sessionKey, session.sessionKeys.hmacKey, session.lastSequence);
          if (!secureResult) {
            logger.warn(`Security validation failed for packet from client ${clientID}`);
            return;
          }
          
          // Update last sequence
          session.lastSequence = secureResult.sequence;
          
          // Verify clientID matches
          if (secureResult.clientID.toString('hex') !== clientID) {
            logger.warn(`ClientID mismatch in secure packet: expected ${clientID}, got ${secureResult.clientID.toString('hex')}`);
            return;
          }
          
          packetToDecapsulate = secureResult.data;
        }
        
        // Decapsulate with protocol template
        const result = session.template.decapsulate(packetToDecapsulate);
        if (!result) {
          logger.warn(`Failed to decapsulate packet from client ${clientID}`);
          return;
        }
        
        // Verify clientID matches
        if (result.clientID.toString('hex') !== clientID) {
          logger.warn(`ClientID mismatch: expected ${clientID}, got ${result.clientID.toString('hex')}`);
          return;
        }
        
        const obfuscatedData = result.data;
        
        // Check if heartbeat (1 byte = 0x01)
        const isHeartbeat = obfuscatedData.length === 1 && obfuscatedData[0] === 0x01;
        
        // Update last seen
        session.lastSeen = Date.now();
        
        if (!isHeartbeat) {
          // Deobfuscate and forward to WireGuard
          const deobfuscatedData = session.obfuscator.deobfuscation(obfuscatedData.buffer);
          
          newSocket.send(deobfuscatedData, 0, deobfuscatedData.length, LOCALWG_PORT, LOCALWG_ADDRESS, (error) => {
            if (error) {
              logger.error(`Failed to send data to WireGuard for client ${clientID}`);
            }
          });
          
          // Update traffic
          session.userInfo.traffic += wgMessage.length;
        } else {
          logger.debug(`Heartbeat received from client ${clientID}`);
        }
      }
    });

    // Bind the socket to a random available port
    newSocket.bind(() => {
      const newPort = newSocket.address().port;
      logger.info(`New session socket listening on port ${newPort} for clientID ${clientID}`);

      // Send response with port, clientID confirmation, and security parameters
      const response = {
        port: newPort,
        clientID: clientIDBase64,
        status: 'connected',
        sessionSalt: sessionSalt.toString('base64'),
        serverNonce: serverNonce
      };
      
      server.send(responseEncrypted, 0, responseEncrypted.length, remote.port, remote.address, (error) => {
        if (error) {
          logger.error(`Failed to send response to client ${clientID}`);
        } else {
          logger.info(`Response sent to client ${clientID} at ${remote.address}:${remote.port}`);
        }
      });
      
      // Set up inactivity check timer
      const inactivityTimer = setInterval(() => {
        checkInactivityTimeout(clientID);
      }, TIMEOUT_DURATION);
      
      // Cleanup timer when socket closes
      newSocket.on('close', () => {
        clearInterval(inactivityTimer);
      });
    });
    //clientStatOperation(1)
  }
  catch (e) {
    logger.info('server error: ' + e)
  }
});

// Start the server
server.bind(PORT, () => {
  logger.info(`UDP server listening on port ${PORT}`);
});
