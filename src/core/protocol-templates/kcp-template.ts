/**
 * KCP Protocol Template (ID: 3)
 * Mimics KCP (made in China, used by Chinese mobile games)
 * Overhead: 32 bytes
 */

import { BaseTemplate, TemplateParams } from './base-template';

export class KcpTemplate extends BaseTemplate {
  readonly id = 3;
  readonly name = 'KCP Protocol';
  
  private timestamp: number;
  
  constructor(params?: TemplateParams) {
    super(params);
    this.timestamp = params?.initialTs ?? Date.now();
  }
  
  encapsulate(data: Buffer, clientID: Buffer): Buffer {
    // KCP header: 32 bytes total
    const header = Buffer.alloc(32);
    
    // Conv (4 bytes): first 4 bytes of clientID
    clientID.copy(header, 0, 0, 4);
    
    // Cmd (1 byte): 0x51 = data packet
    header[4] = 0x51;
    
    // Frg (1 byte): fragment number (0 = no fragmentation)
    header[5] = 0;
    
    // Wnd (2 bytes): window size (simulate 256)
    header.writeUInt16LE(256, 6);
    
    // Ts (4 bytes): timestamp
    header.writeUInt32LE(this.timestamp & 0xffffffff, 8);
    
    // Sn (4 bytes): sequence number
    header.writeUInt32LE(this.sequenceNumber, 12);
    
    // Una (4 bytes): unacknowledged (simulate sn - 1)
    header.writeUInt32LE(Math.max(0, this.sequenceNumber - 1), 16);
    
    // User data (12 bytes): last 12 bytes of clientID
    clientID.copy(header, 20, 4, 16);
    
    return Buffer.concat([header, data]);
  }
  
  decapsulate(packet: Buffer): { clientID: Buffer; data: Buffer } | null {
    if (packet.length < 32) {
      return null; // Too short
    }
    
    // Extract conv (first 4 bytes of clientID)
    const clientIDPart1 = packet.slice(0, 4);
    
    // Extract user data (last 12 bytes of clientID)
    const clientIDPart2 = packet.slice(20, 32);
    
    // Reconstruct full clientID
    const clientID = Buffer.concat([clientIDPart1, clientIDPart2]);
    
    // Extract obfuscated data
    const data = packet.slice(32);
    
    return { clientID, data };
  }
  
  updateState(): void {
    super.updateState();
    this.timestamp = Date.now();
  }
  
  getParams(): TemplateParams {
    return {
      initialSeq: this.sequenceNumber,
      initialTs: this.timestamp
    };
  }
}
