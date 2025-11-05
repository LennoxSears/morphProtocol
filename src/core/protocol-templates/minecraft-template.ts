/**
 * Minecraft Protocol Template (ID: 2)
 * Mimics Minecraft Java Edition packets
 * Overhead: 18-19 bytes (perfect fit for 16-byte UUID!)
 */

import { BaseTemplate, TemplateParams } from './base-template';

export class MinecraftTemplate extends BaseTemplate {
  readonly id = 2;
  readonly name = 'Minecraft';
  
  encapsulate(data: Buffer, clientID: Buffer): Buffer {
    // Minecraft packet: [1 byte packet ID][VarInt length][16 bytes UUID][payload]
    const header = Buffer.alloc(2);
    
    // Packet ID: 0x00-0x0f (various game packets)
    header[0] = Math.floor(Math.random() * 16);
    
    // VarInt length (simplified: 1 byte for lengths < 128)
    // Length = UUID (16) + data length
    const totalLength = 16 + data.length;
    if (totalLength < 128) {
      header[1] = totalLength;
    } else {
      // For larger packets, use 2-byte VarInt (not implemented fully)
      header[1] = 0x80 | (totalLength & 0x7f);
    }
    
    // UUID is our full 16-byte clientID (perfect match!)
    return Buffer.concat([header, clientID, data]);
  }
  
  decapsulate(packet: Buffer): { clientID: Buffer; data: Buffer } | null {
    if (packet.length < 2 + 16) {
      return null; // Too short
    }
    
    // Skip packet ID (1 byte) and VarInt length (1-2 bytes)
    let offset = 2;
    if (packet[1] & 0x80) {
      offset = 3; // 2-byte VarInt
    }
    
    // Extract UUID (16 bytes) = full clientID
    const clientID = packet.slice(offset, offset + 16);
    
    // Extract obfuscated data
    const data = packet.slice(offset + 16);
    
    return { clientID, data };
  }
}
