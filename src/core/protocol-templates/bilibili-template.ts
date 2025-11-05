/**
 * Bilibili Live Template (ID: 11)
 * Mimics Bilibili live streaming protocol (Chinese platform)
 * Overhead: 20 bytes (lowest!)
 */

import { BaseTemplate, TemplateParams } from './base-template';

export class BilibiliTemplate extends BaseTemplate {
  readonly id = 11;
  readonly name = 'Bilibili Live';
  
  private timestamp: number;
  
  constructor(params?: TemplateParams) {
    super(params);
    this.timestamp = params?.timestamp ?? Date.now();
  }
  
  encapsulate(data: Buffer, clientID: Buffer): Buffer {
    // Bilibili header: 20 bytes
    const header = Buffer.alloc(20);
    
    // Magic (4 bytes): "BLIV"
    header.write('BLIV', 0, 4, 'ascii');
    
    // Room ID (4 bytes): first 4 bytes of clientID
    clientID.copy(header, 4, 0, 4);
    
    // User ID (8 bytes): next 8 bytes of clientID
    clientID.copy(header, 8, 4, 12);
    
    // Timestamp (4 bytes): last 4 bytes of clientID
    clientID.copy(header, 16, 12, 16);
    
    return Buffer.concat([header, data]);
  }
  
  decapsulate(packet: Buffer): { clientID: Buffer; data: Buffer } | null {
    if (packet.length < 20) {
      return null; // Too short
    }
    
    // Verify magic
    if (packet.toString('ascii', 0, 4) !== 'BLIV') {
      return null; // Invalid magic
    }
    
    // Extract room ID (first 4 bytes of clientID)
    const clientIDPart1 = packet.slice(4, 8);
    
    // Extract user ID (next 8 bytes of clientID)
    const clientIDPart2 = packet.slice(8, 16);
    
    // Extract timestamp (last 4 bytes of clientID)
    const clientIDPart3 = packet.slice(16, 20);
    
    // Reconstruct full clientID
    const clientID = Buffer.concat([clientIDPart1, clientIDPart2, clientIDPart3]);
    
    // Extract obfuscated data
    const data = packet.slice(20);
    
    return { clientID, data };
  }
  
  updateState(): void {
    super.updateState();
    this.timestamp = Date.now();
  }
  
  getParams(): TemplateParams {
    return {
      initialSeq: this.sequenceNumber,
      timestamp: this.timestamp
    };
  }
}
