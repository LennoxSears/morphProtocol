/**
 * Packet Security Layer
 * Provides replay protection and HMAC authentication
 * 
 * NOTE: ClientID is kept in PLAINTEXT for O(1) session lookup.
 * This is a deliberate trade-off:
 * - Pros: O(1) lookup (no need to loop through all sessions)
 * - Cons: ClientID visible to network observers (privacy concern)
 * - Security: Data still encrypted, HMAC prevents forgery, replay protection active
 */

import * as crypto from 'crypto';

export interface SecurePacketHeader {
  clientID: Buffer;     // 16 bytes (PLAINTEXT for O(1) lookup)
  sequence: number;     // 4 bytes
  timestamp: number;    // 4 bytes
  hmac: Buffer;         // 32 bytes
}

export interface SessionKeys {
  sessionKey: Buffer;   // For data encryption (not used for clientID anymore)
  hmacKey: Buffer;      // For HMAC
}

/**
 * Derive session keys from shared secret using HKDF
 */
export function deriveSessionKeys(sharedSecret: Buffer, salt: Buffer): SessionKeys {
  // Use HKDF (HMAC-based Key Derivation Function)
  const sessionKey = Buffer.from(crypto.hkdfSync('sha256', sharedSecret, salt, Buffer.from('morph-session-key'), 16));
  const hmacKey = Buffer.from(crypto.hkdfSync('sha256', sharedSecret, salt, Buffer.from('morph-hmac-key'), 32));
  
  return { sessionKey, hmacKey };
}

// NOTE: ClientID encryption functions removed - clientID is now plaintext for O(1) lookup

/**
 * Compute HMAC-SHA256 for packet authentication
 */
export function computeHMAC(
  hmacKey: Buffer,
  clientID: Buffer,
  sequence: number,
  timestamp: number,
  data: Buffer
): Buffer {
  const hmac = crypto.createHmac('sha256', hmacKey);
  
  // HMAC over: clientID + sequence + timestamp + data
  hmac.update(clientID);
  
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
  clientID: Buffer,
  sequence: number,
  timestamp: number,
  data: Buffer,
  receivedHMAC: Buffer
): boolean {
  const computedHMAC = computeHMAC(hmacKey, clientID, sequence, timestamp, data);
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
 * ClientID is kept in PLAINTEXT for O(1) session lookup
 */
export function encapsulateSecure(
  clientID: Buffer,
  data: Buffer,
  sequence: number,
  _sessionKey: Buffer,
  hmacKey: Buffer
): Buffer {
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Compute HMAC over plaintext clientID
  const hmac = computeHMAC(hmacKey, clientID, sequence, timestamp, data);
  
  // Build packet: [plaintextClientID][sequence][timestamp][hmac][data]
  const packet = Buffer.alloc(16 + 4 + 4 + 32 + data.length);
  let offset = 0;
  
  // ClientID in plaintext
  clientID.copy(packet, offset);
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
 * ClientID is in PLAINTEXT for O(1) session lookup
 */
export function decapsulateSecure(
  packet: Buffer,
  _sessionKey: Buffer,
  hmacKey: Buffer,
  lastSequence: number
): { clientID: Buffer; data: Buffer; sequence: number } | null {
  // Minimum packet size: 16 + 4 + 4 + 32 = 56 bytes
  if (packet.length < 56) {
    return null;
  }
  
  let offset = 0;
  
  // Extract plaintext clientID
  const clientID = packet.slice(offset, offset + 16);
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
  if (!verifyHMAC(hmacKey, clientID, sequence, timestamp, data, receivedHMAC)) {
    return null; // Authentication failed
  }
  
  return { clientID, data, sequence };
}
