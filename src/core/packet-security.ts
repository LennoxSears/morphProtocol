/**
 * Packet Security Layer
 * Provides replay protection, HMAC authentication, and clientID encryption
 */

import * as crypto from 'crypto';

export interface SecurePacketHeader {
  encryptedClientID: Buffer;  // 16 bytes
  sequence: number;            // 4 bytes
  timestamp: number;           // 4 bytes
  hmac: Buffer;                // 32 bytes
}

export interface SessionKeys {
  sessionKey: Buffer;   // For clientID encryption
  hmacKey: Buffer;      // For HMAC
}

/**
 * Derive session keys from shared secret using HKDF
 */
export function deriveSessionKeys(sharedSecret: Buffer, salt: Buffer): SessionKeys {
  // Use HKDF (HMAC-based Key Derivation Function)
  const sessionKey = crypto.hkdfSync('sha256', sharedSecret, salt, Buffer.from('morph-session-key'), 16);
  const hmacKey = crypto.hkdfSync('sha256', sharedSecret, salt, Buffer.from('morph-hmac-key'), 32);
  
  return { sessionKey, hmacKey };
}

/**
 * Encrypt clientID using AES-128-CTR with sequence as nonce
 */
export function encryptClientID(clientID: Buffer, sessionKey: Buffer, sequence: number): Buffer {
  // Use sequence number as part of IV (ensures uniqueness)
  const iv = Buffer.alloc(16);
  iv.writeUInt32BE(sequence, 0);
  
  const cipher = crypto.createCipheriv('aes-128-ctr', sessionKey, iv);
  const encrypted = Buffer.concat([cipher.update(clientID), cipher.final()]);
  
  return encrypted;
}

/**
 * Decrypt clientID using AES-128-CTR with sequence as nonce
 */
export function decryptClientID(encryptedClientID: Buffer, sessionKey: Buffer, sequence: number): Buffer {
  // Use sequence number as part of IV
  const iv = Buffer.alloc(16);
  iv.writeUInt32BE(sequence, 0);
  
  const decipher = crypto.createDecipheriv('aes-128-ctr', sessionKey, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedClientID), decipher.final()]);
  
  return decrypted;
}

/**
 * Compute HMAC-SHA256 for packet authentication
 */
export function computeHMAC(
  hmacKey: Buffer,
  encryptedClientID: Buffer,
  sequence: number,
  timestamp: number,
  data: Buffer
): Buffer {
  const hmac = crypto.createHmac('sha256', hmacKey);
  
  // HMAC over: encryptedClientID + sequence + timestamp + data
  hmac.update(encryptedClientID);
  
  const seqBuf = Buffer.alloc(4);
  seqBuf.writeUInt32BE(sequence, 0);
  hmac.update(seqBuf);
  
  const tsBuf = Buffer.alloc(4);
  tsBuf.writeUInt32BE(timestamp, 0);
  hmac.update(tsBuf);
  
  hmac.update(data);
  
  return hmac.digest();
}

/**
 * Verify HMAC for packet authentication
 */
export function verifyHMAC(
  hmacKey: Buffer,
  encryptedClientID: Buffer,
  sequence: number,
  timestamp: number,
  data: Buffer,
  receivedHMAC: Buffer
): boolean {
  const computedHMAC = computeHMAC(hmacKey, encryptedClientID, sequence, timestamp, data);
  return crypto.timingSafeEqual(computedHMAC, receivedHMAC);
}

/**
 * Validate timestamp (prevent replay of old packets)
 */
export function validateTimestamp(packetTimestamp: number, maxAgeSeconds: number = 300): boolean {
  const now = Math.floor(Date.now() / 1000);
  const age = Math.abs(now - packetTimestamp);
  return age <= maxAgeSeconds;
}

/**
 * Validate sequence number (prevent replay)
 */
export function validateSequence(packetSequence: number, lastSequence: number): boolean {
  // Allow sequence to wrap around at 2^32
  // Simple check: packet sequence must be greater than last sequence
  // (with wrap-around handling)
  
  if (packetSequence === lastSequence) {
    return false; // Duplicate
  }
  
  // Handle wrap-around: if packet is much smaller than last, assume wrap
  const WRAP_THRESHOLD = 0x80000000; // 2^31
  
  if (lastSequence > WRAP_THRESHOLD && packetSequence < WRAP_THRESHOLD) {
    // Likely wrapped around
    return true;
  }
  
  return packetSequence > lastSequence;
}

/**
 * Encapsulate data with security headers
 */
export function encapsulateSecure(
  clientID: Buffer,
  data: Buffer,
  sequence: number,
  sessionKey: Buffer,
  hmacKey: Buffer
): Buffer {
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Encrypt clientID
  const encryptedClientID = encryptClientID(clientID, sessionKey, sequence);
  
  // Compute HMAC
  const hmac = computeHMAC(hmacKey, encryptedClientID, sequence, timestamp, data);
  
  // Build packet: [encryptedClientID][sequence][timestamp][hmac][data]
  const packet = Buffer.alloc(16 + 4 + 4 + 32 + data.length);
  let offset = 0;
  
  encryptedClientID.copy(packet, offset);
  offset += 16;
  
  packet.writeUInt32BE(sequence, offset);
  offset += 4;
  
  packet.writeUInt32BE(timestamp, offset);
  offset += 4;
  
  hmac.copy(packet, offset);
  offset += 32;
  
  data.copy(packet, offset);
  
  return packet;
}

/**
 * Decapsulate and validate secure packet
 */
export function decapsulateSecure(
  packet: Buffer,
  sessionKey: Buffer,
  hmacKey: Buffer,
  lastSequence: number
): { clientID: Buffer; data: Buffer; sequence: number } | null {
  // Minimum packet size: 16 + 4 + 4 + 32 = 56 bytes
  if (packet.length < 56) {
    return null;
  }
  
  let offset = 0;
  
  // Extract encrypted clientID
  const encryptedClientID = packet.slice(offset, offset + 16);
  offset += 16;
  
  // Extract sequence
  const sequence = packet.readUInt32BE(offset);
  offset += 4;
  
  // Extract timestamp
  const timestamp = packet.readUInt32BE(offset);
  offset += 4;
  
  // Extract HMAC
  const receivedHMAC = packet.slice(offset, offset + 32);
  offset += 32;
  
  // Extract data
  const data = packet.slice(offset);
  
  // Validate timestamp
  if (!validateTimestamp(timestamp)) {
    return null; // Packet too old or from future
  }
  
  // Validate sequence
  if (!validateSequence(sequence, lastSequence)) {
    return null; // Replay or out-of-order
  }
  
  // Verify HMAC
  if (!verifyHMAC(hmacKey, encryptedClientID, sequence, timestamp, data, receivedHMAC)) {
    return null; // Authentication failed
  }
  
  // Decrypt clientID
  const clientID = decryptClientID(encryptedClientID, sessionKey, sequence);
  
  return { clientID, data, sequence };
}
