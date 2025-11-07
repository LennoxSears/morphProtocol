/**
 * Generic Gaming UDP Template (ID: 3)
 * Generic game protocol pattern
 * Packet structure: [Gaming Header: 12 bytes][Data: N bytes]
 * Header: [4 bytes magic "GAME"][4 bytes session ID][2 seq][1 type][1 flags]
 * Overhead: 12 bytes
 * 
 * Dual Indexing: Uses 4-byte Session ID as headerID
 */

import { BaseTemplate } from './base-template';

export class GenericGamingTemplate extends BaseTemplate {
  readonly id = 3;
  readonly name = 'Generic Gaming';
  
  extractHeaderID(packet: Buffer): Buffer | null {
    // Session ID is at bytes 4-7 (4 bytes)
    if (packet.length < 8) {
      return null;
    }
    
    // Verify magic first
    if (packet.toString('ascii', 0, 4) !== 'GAME') {
      return null;
    }
    
    return packet.slice(4, 8);
  }
  
  encapsulate(data: Buffer, clientID: Buffer): Buffer {
    // Generic gaming header: 12 bytes
    const header = Buffer.alloc(12);
    
    // Magic (4 bytes): "GAME"
    header.write('GAME', 0, 4, 'ascii');
    
    // Session ID (4 bytes): use first 4 bytes of clientID
    clientID.copy(header, 4, 0, 4);
    
    // Sequence number (2 bytes)
    header.writeUInt16BE(this.sequenceNumber, 8);
    
    // Packet type (1 byte): 0x01-0x05
    header[10] = 0x01 + Math.floor(Math.random() * 5);
    
    // Flags (1 byte): random flags
    header[11] = Math.floor(Math.random() * 256);
    
    // Packet structure: [header][data]
    return Buffer.concat([header, data]);
  }
  
  decapsulate(packet: Buffer): Buffer | null {
    // Packet must have: 12 (header) bytes minimum
    if (packet.length < 12) {
      return null;
    }
    
    // Verify magic at bytes 0-3
    if (packet.toString('ascii', 0, 4) !== 'GAME') {
      return null; // Invalid magic
    }
    
    // Gaming header is at bytes 0-11
    // Data starts at byte 12
    
    return packet.slice(12);
  }
}
