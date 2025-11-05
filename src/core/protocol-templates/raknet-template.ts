/**
 * Raknet/MCPE Template (ID: 10)
 * Mimics RakNet protocol (Minecraft Bedrock, mobile games)
 * Overhead: 25 bytes
 */

import { BaseTemplate, TemplateParams } from './base-template';

export class RaknetTemplate extends BaseTemplate {
  readonly id = 10;
  readonly name = 'Raknet/MCPE';
  
  private reliability: number;
  private messageIndex: number;
  private orderIndex: number;
  
  constructor(params?: TemplateParams) {
    super(params);
    this.reliability = params?.reliability ?? 2; // Reliable ordered
    this.messageIndex = params?.messageIndex ?? 0;
    this.orderIndex = params?.orderIndex ?? 0;
  }
  
  encapsulate(data: Buffer, clientID: Buffer): Buffer {
    // Raknet header: 25 bytes
    const header = Buffer.alloc(25);
    
    // Message ID (1 byte): 0x80-0x8f (frame set packet)
    header[0] = 0x80 | Math.floor(Math.random() * 16);
    
    // GUID (8 bytes): first 8 bytes of clientID
    clientID.copy(header, 1, 0, 8);
    
    // Sequence number (2 bytes)
    header.writeUInt16BE(this.sequenceNumber, 9);
    
    // Reliability (1 byte)
    header[11] = this.reliability;
    
    // Message index (2 bytes)
    header.writeUInt16BE(this.messageIndex, 12);
    
    // Order index (2 bytes)
    header.writeUInt16BE(this.orderIndex, 14);
    
    // Order channel (1 byte)
    header[16] = 0;
    
    // Extended GUID (8 bytes): last 8 bytes of clientID
    clientID.copy(header, 17, 8, 16);
    
    return Buffer.concat([header, data]);
  }
  
  decapsulate(packet: Buffer): { clientID: Buffer; data: Buffer } | null {
    if (packet.length < 25) {
      return null; // Too short
    }
    
    // Extract GUID (first 8 bytes of clientID)
    const clientIDPart1 = packet.slice(1, 9);
    
    // Extract extended GUID (last 8 bytes of clientID)
    const clientIDPart2 = packet.slice(17, 25);
    
    // Reconstruct full clientID
    const clientID = Buffer.concat([clientIDPart1, clientIDPart2]);
    
    // Extract obfuscated data
    const data = packet.slice(25);
    
    return { clientID, data };
  }
  
  updateState(): void {
    super.updateState();
    this.messageIndex = (this.messageIndex + 1) % 65536;
    this.orderIndex = (this.orderIndex + 1) % 65536;
  }
  
  getParams(): TemplateParams {
    return {
      reliability: this.reliability,
      initialSeq: this.sequenceNumber,
      messageIndex: this.messageIndex,
      orderIndex: this.orderIndex
    };
  }
}
