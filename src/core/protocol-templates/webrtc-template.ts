/**
 * WebRTC/DTLS Template (ID: 5)
 * Mimics DTLS application data (used by WeChat, DingTalk)
 * Overhead: 29 bytes (13 header + 16 clientID in payload)
 */

import { BaseTemplate, TemplateParams } from './base-template';

export class WebRtcTemplate extends BaseTemplate {
  readonly id = 5;
  readonly name = 'WebRTC/DTLS';
  
  private epoch: number;
  private sequence48bit: number;
  
  constructor(params?: TemplateParams) {
    super(params);
    this.epoch = params?.epoch ?? 0;
    this.sequence48bit = params?.initialSeq ?? Math.floor(Math.random() * 0xffffffffffff);
  }
  
  encapsulate(data: Buffer, clientID: Buffer): Buffer {
    // DTLS header: 13 bytes
    const header = Buffer.alloc(13);
    
    // Content type (1 byte): 0x17 = application data
    header[0] = 0x17;
    
    // Version (2 bytes): 0xfeff = DTLS 1.2
    header.writeUInt16BE(0xfeff, 1);
    
    // Epoch (2 bytes)
    header.writeUInt16BE(this.epoch, 3);
    
    // Sequence number (6 bytes, 48-bit)
    const seqBuf = Buffer.alloc(8);
    seqBuf.writeBigUInt64BE(BigInt(this.sequence48bit));
    seqBuf.copy(header, 5, 2, 8); // Copy last 6 bytes
    
    // Length (2 bytes): clientID (16) + data length
    header.writeUInt16BE(16 + data.length, 11);
    
    // Payload: full 16-byte clientID + obfuscated data
    const payload = Buffer.concat([clientID, data]);
    
    return Buffer.concat([header, payload]);
  }
  
  decapsulate(packet: Buffer): { clientID: Buffer; data: Buffer } | null {
    if (packet.length < 13 + 16) {
      return null; // Too short
    }
    
    // Extract full clientID from payload (first 16 bytes after header)
    const clientID = packet.slice(13, 29);
    
    // Extract obfuscated data
    const data = packet.slice(29);
    
    return { clientID, data };
  }
  
  updateState(): void {
    super.updateState();
    this.sequence48bit = (this.sequence48bit + 1) % 0x1000000000000; // 48-bit wrap
  }
  
  getParams(): TemplateParams {
    return {
      epoch: this.epoch,
      initialSeq: this.sequence48bit
    };
  }
}
