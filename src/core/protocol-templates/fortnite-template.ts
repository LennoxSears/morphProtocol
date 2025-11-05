/**
 * Fortnite/EOS Template (ID: 6)
 * Mimics Epic Online Services protocol
 * Overhead: 25 bytes
 */

import { BaseTemplate, TemplateParams } from './base-template';

export class FortniteTemplate extends BaseTemplate {
  readonly id = 6;
  readonly name = 'Fortnite/EOS';
  
  private version: number;
  
  constructor(params?: TemplateParams) {
    super(params);
    this.version = params?.version ?? 1;
  }
  
  encapsulate(data: Buffer, clientID: Buffer): Buffer {
    // Fortnite/EOS header: 25 bytes
    const header = Buffer.alloc(25);
    
    // Magic (4 bytes): "EPIC"
    header.write('EPIC', 0, 4, 'ascii');
    
    // Version (2 bytes)
    header.writeUInt16BE(this.version, 4);
    
    // Account ID (8 bytes): first 8 bytes of clientID
    clientID.copy(header, 6, 0, 8);
    
    // Session ID (8 bytes): last 8 bytes of clientID
    clientID.copy(header, 14, 8, 16);
    
    // Sequence (2 bytes)
    header.writeUInt16BE(this.sequenceNumber, 22);
    
    // Flags (1 byte)
    header[24] = Math.floor(Math.random() * 256);
    
    return Buffer.concat([header, data]);
  }
  
  decapsulate(packet: Buffer): { clientID: Buffer; data: Buffer } | null {
    if (packet.length < 25) {
      return null; // Too short
    }
    
    // Verify magic
    if (packet.toString('ascii', 0, 4) !== 'EPIC') {
      return null; // Invalid magic
    }
    
    // Extract account ID (first 8 bytes of clientID)
    const clientIDPart1 = packet.slice(6, 14);
    
    // Extract session ID (last 8 bytes of clientID)
    const clientIDPart2 = packet.slice(14, 22);
    
    // Reconstruct full clientID
    const clientID = Buffer.concat([clientIDPart1, clientIDPart2]);
    
    // Extract obfuscated data
    const data = packet.slice(25);
    
    return { clientID, data };
  }
  
  getParams(): TemplateParams {
    return {
      version: this.version,
      initialSeq: this.sequenceNumber
    };
  }
}
