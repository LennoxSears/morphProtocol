/**
 * Generic Gaming UDP Template (ID: 4)
 * Generic game protocol pattern
 * Overhead: 24 bytes
 */

import { BaseTemplate, TemplateParams } from './base-template';

export class GenericGamingTemplate extends BaseTemplate {
  readonly id = 4;
  readonly name = 'Generic Gaming';
  
  encapsulate(data: Buffer, clientID: Buffer): Buffer {
    // Generic gaming header: 24 bytes
    const header = Buffer.alloc(24);
    
    // Magic (4 bytes): "GAME"
    header.write('GAME', 0, 4, 'ascii');
    
    // Session ID (4 bytes): first 4 bytes of clientID
    clientID.copy(header, 4, 0, 4);
    
    // Sequence number (2 bytes)
    header.writeUInt16BE(this.sequenceNumber, 8);
    
    // Packet type (1 byte): 0x01-0x05
    header[10] = 0x01 + Math.floor(Math.random() * 5);
    
    // Flags (1 byte): random flags
    header[11] = Math.floor(Math.random() * 256);
    
    // Extended session (12 bytes): last 12 bytes of clientID
    clientID.copy(header, 12, 4, 16);
    
    return Buffer.concat([header, data]);
  }
  
  decapsulate(packet: Buffer): { clientID: Buffer; data: Buffer } | null {
    if (packet.length < 24) {
      return null; // Too short
    }
    
    // Verify magic
    if (packet.toString('ascii', 0, 4) !== 'GAME') {
      return null; // Invalid magic
    }
    
    // Extract session ID (first 4 bytes of clientID)
    const clientIDPart1 = packet.slice(4, 8);
    
    // Extract extended session (last 12 bytes of clientID)
    const clientIDPart2 = packet.slice(12, 24);
    
    // Reconstruct full clientID
    const clientID = Buffer.concat([clientIDPart1, clientIDPart2]);
    
    // Extract obfuscated data
    const data = packet.slice(24);
    
    return { clientID, data };
  }
}
