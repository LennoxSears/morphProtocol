/**
 * Mobile Legends/MOBA Template (ID: 8)
 * Mimics MOBA game protocols (王者荣耀 - Tencent)
 * Overhead: 24 bytes
 */

import { BaseTemplate, TemplateParams } from './base-template';

export class MobaTemplate extends BaseTemplate {
  readonly id = 8;
  readonly name = 'MOBA';
  
  private frameNumber: number;
  
  constructor(params?: TemplateParams) {
    super(params);
    this.frameNumber = params?.frameNum ?? 0;
  }
  
  encapsulate(data: Buffer, clientID: Buffer): Buffer {
    // MOBA header: 24 bytes
    const header = Buffer.alloc(24);
    
    // Magic (4 bytes): "MOBA"
    header.write('MOBA', 0, 4, 'ascii');
    
    // Match ID (4 bytes): first 4 bytes of clientID
    clientID.copy(header, 4, 0, 4);
    
    // Player ID (8 bytes): next 8 bytes of clientID
    clientID.copy(header, 8, 4, 12);
    
    // Frame number (4 bytes): last 4 bytes of clientID
    clientID.copy(header, 16, 12, 16);
    
    // Sequence (2 bytes)
    header.writeUInt16BE(this.sequenceNumber, 20);
    
    // Packet type (1 byte): 0x01-0x05
    header[22] = 0x01 + Math.floor(Math.random() * 5);
    
    // Flags (1 byte)
    header[23] = Math.floor(Math.random() * 256);
    
    return Buffer.concat([header, data]);
  }
  
  decapsulate(packet: Buffer): { clientID: Buffer; data: Buffer } | null {
    if (packet.length < 24) {
      return null; // Too short
    }
    
    // Verify magic
    if (packet.toString('ascii', 0, 4) !== 'MOBA') {
      return null; // Invalid magic
    }
    
    // Extract match ID (first 4 bytes of clientID)
    const clientIDPart1 = packet.slice(4, 8);
    
    // Extract player ID (next 8 bytes of clientID)
    const clientIDPart2 = packet.slice(8, 16);
    
    // Extract frame number (last 4 bytes of clientID)
    const clientIDPart3 = packet.slice(16, 20);
    
    // Reconstruct full clientID
    const clientID = Buffer.concat([clientIDPart1, clientIDPart2, clientIDPart3]);
    
    // Extract obfuscated data
    const data = packet.slice(24);
    
    return { clientID, data };
  }
  
  updateState(): void {
    super.updateState();
    this.frameNumber++;
  }
  
  getParams(): TemplateParams {
    return {
      initialSeq: this.sequenceNumber,
      frameNum: this.frameNumber
    };
  }
}
