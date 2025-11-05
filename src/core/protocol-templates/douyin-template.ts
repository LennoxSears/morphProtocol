/**
 * Douyin/TikTok Template (ID: 12)
 * Mimics Douyin (抖音) live streaming protocol (ByteDance)
 * Overhead: 22 bytes
 */

import { BaseTemplate, TemplateParams } from './base-template';

export class DouyinTemplate extends BaseTemplate {
  readonly id = 12;
  readonly name = 'Douyin/TikTok';
  
  encapsulate(data: Buffer, clientID: Buffer): Buffer {
    // Douyin header: 22 bytes
    const header = Buffer.alloc(22);
    
    // Magic (4 bytes): "DYTD" (Douyin TikTok Data)
    header.write('DYTD', 0, 4, 'ascii');
    
    // Device ID (8 bytes): first 8 bytes of clientID
    clientID.copy(header, 4, 0, 8);
    
    // Session ID (8 bytes): last 8 bytes of clientID
    clientID.copy(header, 12, 8, 16);
    
    // Sequence (2 bytes)
    header.writeUInt16BE(this.sequenceNumber, 20);
    
    return Buffer.concat([header, data]);
  }
  
  decapsulate(packet: Buffer): { clientID: Buffer; data: Buffer } | null {
    if (packet.length < 22) {
      return null; // Too short
    }
    
    // Verify magic
    if (packet.toString('ascii', 0, 4) !== 'DYTD') {
      return null; // Invalid magic
    }
    
    // Extract device ID (first 8 bytes of clientID)
    const clientIDPart1 = packet.slice(4, 12);
    
    // Extract session ID (last 8 bytes of clientID)
    const clientIDPart2 = packet.slice(12, 20);
    
    // Reconstruct full clientID
    const clientID = Buffer.concat([clientIDPart1, clientIDPart2]);
    
    // Extract obfuscated data
    const data = packet.slice(22);
    
    return { clientID, data };
  }
}
