/**
 * QUIC Gaming Protocol Template (ID: 1)
 * Mimics QUIC short header packets
 * Packet structure: [QUIC Header: 11 bytes][Data: N bytes]
 * Header: [1 byte flags][8 bytes connection ID][2 bytes packet number]
 * Overhead: 11 bytes
 * 
 * Dual Indexing: Uses 8-byte Connection ID as headerID
 */

import { BaseTemplate, TemplateParams } from './base-template';

export class QuicTemplate extends BaseTemplate {
  readonly id = 1;
  readonly name = 'QUIC Gaming';
  
  constructor(params?: TemplateParams) {
    super(params);
  }
  
  extractHeaderID(packet: Buffer): Buffer | null {
    // Connection ID is at bytes 1-8 (8 bytes)
    if (packet.length < 9) {
      return null;
    }
    return packet.slice(1, 9);
  }
  
  encapsulate(data: Buffer, clientID: Buffer): Buffer {
    // QUIC short header: [1 byte flags][8 bytes connection ID][2 bytes packet number]
    const header = Buffer.alloc(11);
    
    // Flags: 0x40-0x4f (short header, various spin bits)
    header[0] = 0x40 | (Math.floor(Math.random() * 16));
    
    // Connection ID: use first 8 bytes of clientID
    clientID.copy(header, 1, 0, 8);
    
    // Packet number: current sequence (2 bytes)
    header.writeUInt16BE(this.sequenceNumber, 9);
    
    // Packet structure: [header][data]
    return Buffer.concat([header, data]);
  }
  
  decapsulate(packet: Buffer): Buffer | null {
    // Packet must have: 11 (header) bytes minimum
    if (packet.length < 11) {
      return null;
    }
    
    // QUIC header is at bytes 0-10
    // Data starts at byte 11
    
    return packet.slice(11);
  }
}
