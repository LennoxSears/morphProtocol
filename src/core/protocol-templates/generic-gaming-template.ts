/**
 * Generic Gaming UDP Template (ID: 3)
 * Generic game protocol pattern
 * Packet structure: [ClientID: 16 bytes][Gaming Header: 12 bytes][Data: N bytes]
 * Overhead: 28 bytes total (16 clientID + 12 gaming header)
 */

import { BaseTemplate, TemplateParams } from './base-template';

export class GenericGamingTemplate extends BaseTemplate {
  readonly id = 3;
  readonly name = 'Generic Gaming';
  
  encapsulate(data: Buffer, clientID: Buffer): Buffer {
    // Generic gaming header: 12 bytes
    const header = Buffer.alloc(12);
    
    // Magic (4 bytes): "GAME"
    header.write('GAME', 0, 4, 'ascii');
    
    // Session ID (4 bytes): use first 4 bytes of clientID for realism
    clientID.copy(header, 4, 0, 4);
    
    // Sequence number (2 bytes)
    header.writeUInt16BE(this.sequenceNumber, 8);
    
    // Packet type (1 byte): 0x01-0x05
    header[10] = 0x01 + Math.floor(Math.random() * 5);
    
    // Flags (1 byte): random flags
    header[11] = Math.floor(Math.random() * 256);
    
    // Packet structure: [clientID][header][data]
    return Buffer.concat([clientID, header, data]);
  }
  
  decapsulate(packet: Buffer): Buffer | null {
    // Packet must have: 16 (clientID) + 12 (header) = 28 bytes minimum
    if (packet.length < 28) {
      return null;
    }
    
    // Verify magic at bytes 16-19
    if (packet.toString('ascii', 16, 20) !== 'GAME') {
      return null; // Invalid magic
    }
    
    // ClientID is at bytes 0-15 (extracted by caller)
    // Gaming header is at bytes 16-27
    // Data starts at byte 28
    
    return packet.slice(28);
  }
}
