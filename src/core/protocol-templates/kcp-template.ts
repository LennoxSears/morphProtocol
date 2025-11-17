/**
 * KCP Protocol Template (ID: 2)
 * Mimics KCP (made in China, used by Chinese mobile games)
 * Packet structure: [KCP Header: 24 bytes][Data: N bytes]
 * Header: [4 bytes conv][1 cmd][1 frg][2 wnd][4 ts][4 sn][4 una][4 len]
 * Overhead: 24 bytes
 * 
 * Dual Indexing: Uses 4-byte Conv as headerID
 */

import { BaseTemplate, TemplateParams } from './base-template';

export class KcpTemplate extends BaseTemplate {
  readonly id = 2;
  readonly name = 'KCP Protocol';
  
  private timestamp: number;
  
  constructor(params?: TemplateParams) {
    super(params);
    this.timestamp = params?.initialTs ?? Date.now();
  }
  
  extractHeaderID(packet: Buffer): Buffer | null {
    // Conv is at bytes 0-3 (4 bytes)
    if (packet.length < 4) {
      return null;
    }
    return packet.slice(0, 4);
  }
  
  encapsulate(data: Buffer, clientID: Buffer): Buffer {
    // KCP header: 24 bytes
    const header = Buffer.alloc(24);
    
    // Conv (4 bytes): use first 4 bytes of clientID
    clientID.copy(header, 0, 0, 4);
    
    // Cmd (1 byte): 0x51 = data packet
    header[4] = 0x51;
    
    // Frg (1 byte): fragment number (0 = no fragmentation)
    header[5] = 0;
    
    // Wnd (2 bytes): window size (simulate 256)
    header.writeUInt16LE(256, 6);
    
    // Ts (4 bytes): timestamp (use >>> 0 to ensure unsigned 32-bit)
    header.writeUInt32LE((this.timestamp >>> 0), 8);
    
    // Sn (4 bytes): sequence number
    header.writeUInt32LE(this.sequenceNumber, 12);
    
    // Una (4 bytes): unacknowledged (simulate sn - 1)
    header.writeUInt32LE(Math.max(0, this.sequenceNumber - 1), 16);
    
    // Len (4 bytes): payload length
    header.writeUInt32LE(data.length, 20);
    
    // Packet structure: [header][data]
    return Buffer.concat([header, data]);
  }
  
  decapsulate(packet: Buffer): Buffer | null {
    // Packet must have: 24 (header) bytes minimum
    if (packet.length < 24) {
      return null;
    }
    
    // KCP header is at bytes 0-23
    // Data starts at byte 24
    
    return packet.slice(24);
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
