/**
 * Steam/Source Engine Template (ID: 9)
 * Mimics Source Engine networking (DOTA 2, CS:GO)
 * Overhead: 21 bytes
 */

import { BaseTemplate, TemplateParams } from './base-template';

export class SteamTemplate extends BaseTemplate {
  readonly id = 9;
  readonly name = 'Steam/Source';
  
  encapsulate(data: Buffer, clientID: Buffer): Buffer {
    // Steam/Source header: 21 bytes
    const header = Buffer.alloc(21);
    
    // Connectionless header (4 bytes): 0xFFFFFFFF
    header.writeUInt32BE(0xFFFFFFFF, 0);
    
    // Type (1 byte): 0x54 = 'T'
    header[4] = 0x54;
    
    // Challenge (4 bytes): first 4 bytes of clientID
    clientID.copy(header, 5, 0, 4);
    
    // Steam ID (8 bytes): next 8 bytes of clientID
    clientID.copy(header, 9, 4, 12);
    
    // Reserved (4 bytes): last 4 bytes of clientID
    clientID.copy(header, 17, 12, 16);
    
    return Buffer.concat([header, data]);
  }
  
  decapsulate(packet: Buffer): { clientID: Buffer; data: Buffer } | null {
    if (packet.length < 21) {
      return null; // Too short
    }
    
    // Verify connectionless header
    if (packet.readUInt32BE(0) !== 0xFFFFFFFF) {
      return null; // Invalid header
    }
    
    // Extract challenge (first 4 bytes of clientID)
    const clientIDPart1 = packet.slice(5, 9);
    
    // Extract steam ID (next 8 bytes of clientID)
    const clientIDPart2 = packet.slice(9, 17);
    
    // Extract reserved (last 4 bytes of clientID)
    const clientIDPart3 = packet.slice(17, 21);
    
    // Reconstruct full clientID
    const clientID = Buffer.concat([clientIDPart1, clientIDPart2, clientIDPart3]);
    
    // Extract obfuscated data
    const data = packet.slice(21);
    
    return { clientID, data };
  }
}
