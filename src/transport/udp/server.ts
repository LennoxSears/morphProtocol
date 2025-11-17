import * as dgram from 'dgram';
import { Obfuscator } from '../../core/obfuscator';
import { subTraffic, subClientNum, addClientNum, updateServerInfo } from '../../api/client';
import { Encryptor } from '../../crypto/encryptor';
import { getServerConfig } from '../../config';
import { logger } from '../../utils/logger';
import { UserInfo } from '../../types';
import { ProtocolTemplate } from '../../core/protocol-templates/base-template';
import { createTemplate } from '../../core/protocol-templates/template-factory';

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
  clientID: string;           // hex string (32 chars) - full 16-byte ID
  headerID: string;           // hex string - protocol-specific ID (4-8 bytes)
  remoteAddress: string;
  remotePort: number;
  socket: dgram.Socket;
  obfuscator: Obfuscator;
  template: ProtocolTemplate;  // Protocol template for packet encapsulation
  userInfo: UserInfo;
  publicKey: string;
  lastSeen: number;
}

// DUAL INDEXING for O(1) session lookup
// Index 1: Fast lookup by current network location + headerID
const ipIndex: Map<string, string> = new Map(); // "ip:port:headerID" → fullClientID

// Index 2: Session storage by stable identifier
const activeSessions: Map<string, ClientSession> = new Map(); // fullClientID → Session

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
  
  // Remove from both indexes
  activeSessions.delete(foundClientID);
  const ipKey = `${session.remoteAddress}:${session.remotePort}:${session.headerID}`;
  ipIndex.delete(ipKey);
  logger.info(`Removed from ipIndex: ${ipKey}`);
  subClientNum(HOST_NAME);
}

// Function to shut down inactive session
function shutdownInactiveSession(clientID: string) {
  const session = activeSessions.get(clientID);
  if (!session) return;
  
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
  
  // Remove from both indexes
  activeSessions.delete(clientID);
  const ipKey = `${session.remoteAddress}:${session.remotePort}:${session.headerID}`;
  ipIndex.delete(ipKey);
  logger.info(`Removed from ipIndex: ${ipKey}`);
  
  subClientNum(HOST_NAME);
}

// Traffic reporting interval
setInterval(() => {
  logger.info('Updating traffic for all active sessions');
  activeSessions.forEach((session, _clientID) => {
    if (session.userInfo.traffic > 0) {
      subTraffic(session.userInfo.userId, session.userInfo.traffic);
      session.userInfo.traffic = 0;
    }
  });
}, TRAFFIC_INTERVAL);

// Inactivity check interval - check all sessions periodically
setInterval(() => {
  const currentTime = Date.now();
  activeSessions.forEach((session, clientID) => {
    if (currentTime - session.lastSeen >= TIMEOUT_DURATION) {
      shutdownInactiveSession(clientID);
    }
  });
}, TIMEOUT_DURATION / 2); // Check twice as often as timeout to ensure timely detection
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
      // Not a control message - ignore (data packets go to per-session sockets)
      logger.debug(`Received non-control message on main server port from ${remote.address}:${remote.port}`);
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
      
      // Update ipIndex if IP changed
      if (session.remoteAddress !== remote.address || session.remotePort !== remote.port) {
        const oldIpKey = `${session.remoteAddress}:${session.remotePort}:${session.headerID}`;
        const newIpKey = `${remote.address}:${remote.port}:${session.headerID}`;
        ipIndex.delete(oldIpKey);
        ipIndex.set(newIpKey, clientID);
        logger.info(`Updated ipIndex: ${oldIpKey} → ${newIpKey}`);
      }
      
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
    
    const newSocket = dgram.createSocket('udp4');
    
    // Extract headerID from clientID (protocol-specific)
    let headerIDLength: number;
    switch (template.id) {
      case 1: // QUIC
        headerIDLength = 8;
        break;
      case 2: // KCP
        headerIDLength = 4;
        break;
      case 3: // Generic Gaming
        headerIDLength = 4;
        break;
      default:
        logger.error(`Unknown template ID: ${template.id}`);
        return;
    }
    
    const headerID = clientIDBuffer.slice(0, headerIDLength).toString('hex');
    logger.info(`HeaderID: ${headerID} (${headerIDLength} bytes for ${template.name})`);
    
    // Create session
    const session: ClientSession = {
      clientID,
      headerID,
      remoteAddress: remote.address,
      remotePort: remote.port,
      socket: newSocket,
      obfuscator,
      template,
      userInfo: { userId: handshakeData.userId, traffic: 0 },
      publicKey: handshakeData.publicKey,
      lastSeen: Date.now()
    };
    
    // Add to both indexes
    activeSessions.set(clientID, session);
    const ipKey = `${remote.address}:${remote.port}:${headerID}`;
    ipIndex.set(ipKey, clientID);
    logger.info(`Added to ipIndex: ${ipKey} → ${clientID}`);
    
    addClientNum(HOST_NAME);
    // Handle messages from WireGuard
    newSocket.on('message', (wgMessage, wgRemote) => {
      if (wgRemote.address === LOCALWG_ADDRESS && wgRemote.port === LOCALWG_PORT) {
        const session = activeSessions.get(clientID);
        if (!session) return;
        
        // Obfuscate data from WireGuard
        const obfuscatedData = session.obfuscator.obfuscation(Buffer.from(wgMessage).buffer);
        
        // Encapsulate with protocol template
        const packet = session.template.encapsulate(Buffer.from(obfuscatedData), clientIDBuffer);
        
        // Update template state
        session.template.updateState();
        
        // Send to client
        newSocket.send(packet, 0, packet.length, session.remotePort, session.remoteAddress, (error) => {
          if (error) {
            logger.error(`Failed to send data to client ${clientID}`);
          }
        });
        
        // Track download traffic (server → client) for billing/quota
        session.userInfo.traffic += packet.length;
        session.lastSeen = Date.now();
      } else {
        // Data from client (with protocol template encapsulation)
        const session = activeSessions.get(clientID);
        if (!session) return;
        
        // Decapsulate with protocol template
        const obfuscatedData = session.template.decapsulate(wgMessage);
        if (!obfuscatedData) {
          logger.warn(`Failed to decapsulate packet from client ${clientID}`);
          return;
        }
        
        // Check if heartbeat (1 byte = 0x01)
        const isHeartbeat = obfuscatedData.length === 1 && obfuscatedData[0] === 0x01;
        
        // Update last seen
        session.lastSeen = Date.now();
        
        if (!isHeartbeat) {
          // Deobfuscate and forward to WireGuard
          const deobfuscatedData = session.obfuscator.deobfuscation(Buffer.from(obfuscatedData).buffer);
          
          // DEBUG MODE: Log received data for verification (check AFTER deobfuscation)
          if (config.debugMode && deobfuscatedData.length === 256) {
            logger.info('=== DEBUG MODE: Received test data ===');
            logger.info(`[DEBUG] After template decapsulation (${obfuscatedData.length} bytes):`);
            logger.info(`[DEBUG]   First 32 bytes: ${Buffer.from(obfuscatedData).slice(0, 32).toString('hex')}`);
          }
          
          // DEBUG MODE: Log final deobfuscated data
          if (config.debugMode && deobfuscatedData.length === 256) {
            logger.info(`[DEBUG] After deobfuscation (${deobfuscatedData.length} bytes):`);
            logger.info(`[DEBUG]   First 32 bytes: ${Buffer.from(deobfuscatedData).slice(0, 32).toString('hex')}`);
            logger.info(`[DEBUG]   Last 32 bytes: ${Buffer.from(deobfuscatedData).slice(-32).toString('hex')}`);
            logger.info(`[DEBUG]   Full hex: ${Buffer.from(deobfuscatedData).toString('hex')}`);
            
            // Verify data integrity
            let isValid = true;
            for (let i = 0; i < 256; i++) {
              if (deobfuscatedData[i] !== i) {
                isValid = false;
                logger.error(`[DEBUG] Data mismatch at byte ${i}: expected ${i}, got ${deobfuscatedData[i]}`);
                break;
              }
            }
            if (isValid) {
              logger.info('[DEBUG] ✅ Data integrity verified! All bytes match expected pattern (0x00-0xFF)');
            } else {
              logger.error('[DEBUG] ❌ Data integrity check FAILED!');
            }
          }
          
          newSocket.send(deobfuscatedData, 0, deobfuscatedData.length, LOCALWG_PORT, LOCALWG_ADDRESS, (error) => {
            if (error) {
              logger.error(`Failed to send data to WireGuard for client ${clientID}`);
            }
          });
          
          // Note: We only track download traffic (server → client), not upload
        } else {
          logger.debug(`Heartbeat received from client ${clientID}`);
        }
      }
    });

    // Bind the socket to a random available port
    newSocket.bind(() => {
      const newPort = newSocket.address().port;
      logger.info(`New session socket listening on port ${newPort} for clientID ${clientID}`);

      // Send response with port and clientID confirmation
      const response = {
        port: newPort,
        clientID: clientIDBase64,
        status: 'connected'
      };
      const responseEncrypted = encryptor.simpleEncrypt(JSON.stringify(response));
      
      server.send(responseEncrypted, 0, responseEncrypted.length, remote.port, remote.address, (error) => {
        if (error) {
          logger.error(`Failed to send response to client ${clientID}`);
        } else {
          logger.info(`Response sent to client ${clientID} at ${remote.address}:${remote.port}`);
        }
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
