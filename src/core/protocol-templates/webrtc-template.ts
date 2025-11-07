/**
 * WebRTC/DTLS Template (ID: 4)
 * Mimics DTLS application data (used by WeChat, DingTalk)
 * Packet structure: [ClientID: 16 bytes][DTLS Header: 13 bytes][Data: N bytes]
 * Overhead: 29 bytes total (16 clientID + 13 DTLS header)
 */

import { BaseTemplate, TemplateParams } from './base-template';

export class WebRtcTemplate extends BaseTemplate {
  readonly id = 4;
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
    
    // Length (2 bytes): data length only
    header.writeUInt16BE(data.length, 11);
    
    // Packet structure: [clientID][header][data]
    return Buffer.concat([clientID, header, data]);
  }
  
  decapsulate(packet: Buffer): Buffer | null {
    // Packet must have: 16 (clientID) + 13 (header) = 29 bytes minimum
    if (packet.length < 29) {
      return null;
    }
    
    // ClientID is at bytes 0-15 (extracted by caller)
    // DTLS header is at bytes 16-28
    // Data starts at byte 29
    
    return packet.slice(29);
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
