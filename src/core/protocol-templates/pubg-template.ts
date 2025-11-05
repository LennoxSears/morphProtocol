/**
 * PUBG/Unreal Engine Template (ID: 7)
 * Mimics Unreal Engine networking (和平精英 - Tencent)
 * Overhead: 28 bytes
 */

import { BaseTemplate, TemplateParams } from './base-template';

export class PubgTemplate extends BaseTemplate {
  readonly id = 7;
  readonly name = 'PUBG/Unreal';
  
  private packetType: number;
  
  constructor(params?: TemplateParams) {
    super(params);
    this.packetType = params?.packetType ?? 0;
  }
  
  encapsulate(data: Buffer, clientID: Buffer): Buffer {
    // PUBG/Unreal header: 28 bytes
    const header = Buffer.alloc(28);
    
    // Magic (4 bytes): 0x00000000
    header.writeUInt32BE(0, 0);
    
    // Sequence (4 bytes)
    header.writeUInt32BE(this.sequenceNumber, 4);
    
    // Connection GUID (8 bytes): first 8 bytes of clientID
    clientID.copy(header, 8, 0, 8);
    
    // Packet type (4 bytes)
    header.writeUInt32BE(this.packetType, 16);
    
    // Channel GUID (8 bytes): last 8 bytes of clientID
    clientID.copy(header, 20, 8, 16);
    
    return Buffer.concat([header, data]);
  }
  
  decapsulate(packet: Buffer): { clientID: Buffer; data: Buffer } | null {
    if (packet.length < 28) {
      return null; // Too short
    }
    
    // Extract connection GUID (first 8 bytes of clientID)
    const clientIDPart1 = packet.slice(8, 16);
    
    // Extract channel GUID (last 8 bytes of clientID)
    const clientIDPart2 = packet.slice(20, 28);
    
    // Reconstruct full clientID
    const clientID = Buffer.concat([clientIDPart1, clientIDPart2]);
    
    // Extract obfuscated data
    const data = packet.slice(28);
    
    return { clientID, data };
  }
  
  getParams(): TemplateParams {
    return {
      initialSeq: this.sequenceNumber,
      packetType: this.packetType
    };
  }
}
