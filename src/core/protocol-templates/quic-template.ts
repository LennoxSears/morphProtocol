/**
 * QUIC Gaming Protocol Template (ID: 1)
 * Mimics QUIC short header packets
 * Packet structure: [ClientID: 16 bytes][QUIC Header: 11 bytes][Data: N bytes]
 * Overhead: 27 bytes total (16 clientID + 11 QUIC header)
 */

import { BaseTemplate, TemplateParams } from './base-template';

export class QuicTemplate extends BaseTemplate {
  readonly id = 1;
  readonly name = 'QUIC Gaming';
  
  constructor(params?: TemplateParams) {
    super(params);
  }
  
  encapsulate(data: Buffer, clientID: Buffer): Buffer {
    // QUIC short header: [1 byte flags][8 bytes connection ID][2 bytes packet number]
    const header = Buffer.alloc(11);
    
    // Flags: 0x40-0x4f (short header, various spin bits)
    header[0] = 0x40 | (Math.floor(Math.random() * 16));
    
    // Connection ID: use first 8 bytes of clientID for realism
    clientID.copy(header, 1, 0, 8);
    
    // Packet number: current sequence (2 bytes)
    header.writeUInt16BE(this.sequenceNumber, 9);
    
    // Packet structure: [clientID][header][data]
    return Buffer.concat([clientID, header, data]);
  }
  
  decapsulate(packet: Buffer): Buffer | null {
    // Packet must have: 16 (clientID) + 11 (header) = 27 bytes minimum
    if (packet.length < 27) {
      return null;
    }
    
    // ClientID is at bytes 0-15 (extracted by caller)
    // QUIC header is at bytes 16-26
    // Data starts at byte 27
    
    return packet.slice(27);
  }
}
