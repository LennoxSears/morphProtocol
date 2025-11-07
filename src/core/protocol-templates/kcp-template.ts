/**
 * KCP Protocol Template (ID: 2)
 * Mimics KCP (made in China, used by Chinese mobile games)
 * Packet structure: [ClientID: 16 bytes][KCP Header: 24 bytes][Data: N bytes]
 * Overhead: 40 bytes total (16 clientID + 24 KCP header)
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
  
  encapsulate(data: Buffer, clientID: Buffer): Buffer {
    // KCP header: 24 bytes
    const header = Buffer.alloc(24);
    
    // Conv (4 bytes): use first 4 bytes of clientID for realism
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
    
    // Len (4 bytes): payload length
    header.writeUInt32LE(data.length, 20);
    
    // Packet structure: [clientID][header][data]
    return Buffer.concat([clientID, header, data]);
  }
  
  decapsulate(packet: Buffer): Buffer | null {
    // Packet must have: 16 (clientID) + 24 (header) = 40 bytes minimum
    if (packet.length < 40) {
      return null;
    }
    
    // ClientID is at bytes 0-15 (extracted by caller)
    // KCP header is at bytes 16-39
    // Data starts at byte 40
    
    return packet.slice(40);
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
