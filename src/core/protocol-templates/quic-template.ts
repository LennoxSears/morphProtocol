/**
 * QUIC Gaming Protocol Template (ID: 1)
 * Mimics QUIC short header packets
 * Overhead: 19 bytes (11 header + 8 clientID in payload)
 */

import { BaseTemplate, TemplateParams } from './base-template';

export class QuicTemplate extends BaseTemplate {
  readonly id = 1;
  readonly name = 'QUIC Gaming';
  
  private connectionId: Buffer;
  
  constructor(params?: TemplateParams) {
    super(params);
    // Use first 8 bytes of clientID as connection ID (set during encapsulate)
    this.connectionId = params?.connectionId || Buffer.alloc(8);
  }
  
  encapsulate(data: Buffer, clientID: Buffer): Buffer {
    // QUIC short header: [1 byte flags][8 bytes connection ID][2 bytes packet number]
    const header = Buffer.alloc(11);
    
    // Flags: 0x40-0x4f (short header, various spin bits)
    header[0] = 0x40 | (Math.floor(Math.random() * 16));
    
    // Connection ID: first 8 bytes of clientID
    clientID.copy(header, 1, 0, 8);
    
    // Packet number: current sequence (2 bytes)
    header.writeUInt16BE(this.sequenceNumber, 9);
    
    // Payload: last 8 bytes of clientID + obfuscated data
    const payload = Buffer.concat([
      clientID.slice(8, 16),  // Last 8 bytes of clientID
      data
    ]);
    
    return Buffer.concat([header, payload]);
  }
  
  decapsulate(packet: Buffer): { clientID: Buffer; data: Buffer } | null {
    if (packet.length < 11 + 8) {
      return null; // Too short
    }
    
    // Extract connection ID (first 8 bytes of clientID)
    const clientIDPart1 = packet.slice(1, 9);
    
    // Extract last 8 bytes of clientID from payload
    const clientIDPart2 = packet.slice(11, 19);
    
    // Reconstruct full clientID
    const clientID = Buffer.concat([clientIDPart1, clientIDPart2]);
    
    // Extract obfuscated data (after header + clientID part 2)
    const data = packet.slice(19);
    
    return { clientID, data };
  }
  
  getParams(): TemplateParams {
    return {
      connectionId: this.connectionId,
      initialSeq: this.sequenceNumber
    };
  }
}
