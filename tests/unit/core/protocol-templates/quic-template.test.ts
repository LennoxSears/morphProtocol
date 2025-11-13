import { QuicTemplate } from '../../../../src/core/protocol-templates/quic-template';
import { deterministicBuffer, buffersEqual } from '../../../helpers/test-utils';

describe('QuicTemplate', () => {
  let template: QuicTemplate;
  let clientID: Buffer;

  beforeEach(() => {
    template = new QuicTemplate();
    clientID = Buffer.alloc(16);
    for (let i = 0; i < 16; i++) {
      clientID[i] = i;
    }
  });

  describe('basic properties', () => {
    it('should have correct template ID', () => {
      expect(template.id).toBe(1);
    });

    it('should have correct template name', () => {
      expect(template.name).toBe('QUIC Gaming');
    });
  });

  describe('encapsulate and decapsulate', () => {
    it('should encapsulate data with QUIC header', () => {
      const data = deterministicBuffer(100);
      const packet = template.encapsulate(data, clientID);

      // QUIC header: 1 byte flags + 8 bytes connection ID + 2 bytes packet number = 11 bytes
      expect(packet.length).toBe(11 + data.length);
    });

    it('should correctly decapsulate packet', () => {
      const original = deterministicBuffer(100);
      const packet = template.encapsulate(original, clientID);
      const decapsulated = template.decapsulate(packet);

      expect(decapsulated).not.toBeNull();
      expect(buffersEqual(decapsulated!, original)).toBe(true);
    });

    it('should handle empty data', () => {
      const data = Buffer.alloc(0);
      const packet = template.encapsulate(data, clientID);
      const decapsulated = template.decapsulate(packet);

      expect(decapsulated).not.toBeNull();
      expect(decapsulated!.length).toBe(0);
    });

    it('should handle small data', () => {
      const data = deterministicBuffer(10);
      const packet = template.encapsulate(data, clientID);
      const decapsulated = template.decapsulate(packet);

      expect(decapsulated).not.toBeNull();
      expect(buffersEqual(decapsulated!, data)).toBe(true);
    });

    it('should handle large data (MTU size)', () => {
      const data = deterministicBuffer(1500);
      const packet = template.encapsulate(data, clientID);
      const decapsulated = template.decapsulate(packet);

      expect(decapsulated).not.toBeNull();
      expect(buffersEqual(decapsulated!, data)).toBe(true);
    });
  });

  describe('extractHeaderID', () => {
    it('should extract 8-byte connection ID from packet', () => {
      const data = deterministicBuffer(100);
      const packet = template.encapsulate(data, clientID);
      const headerID = template.extractHeaderID(packet);

      expect(headerID).not.toBeNull();
      expect(headerID!.length).toBe(8);
      // Should match first 8 bytes of clientID (stored at bytes 1-8)
      expect(buffersEqual(headerID!, clientID.slice(0, 8))).toBe(true);
    });

    it('should return null for invalid packet (too short)', () => {
      const invalidPacket = Buffer.alloc(8); // Less than 9 bytes
      const headerID = template.extractHeaderID(invalidPacket);

      expect(headerID).toBeNull();
    });

    it('should extract headerID even with different flags', () => {
      const data = deterministicBuffer(100);
      const packet = template.encapsulate(data, clientID);
      
      // Change the flags byte (doesn't affect extraction)
      packet[0] = 0x00;
      
      const headerID = template.extractHeaderID(packet);
      // Should still extract successfully (no flag validation in extractHeaderID)
      expect(headerID).not.toBeNull();
      expect(buffersEqual(headerID!, clientID.slice(0, 8))).toBe(true);
    });
  });

  describe('updateState', () => {
    it('should increment packet number', () => {
      const data = deterministicBuffer(100);
      
      const packet1 = template.encapsulate(data, clientID);
      const packetNum1 = packet1.readUInt16BE(9); // Packet number is 2 bytes at offset 9
      
      template.updateState();
      
      const packet2 = template.encapsulate(data, clientID);
      const packetNum2 = packet2.readUInt16BE(9);
      
      expect(packetNum2).toBe((packetNum1 + 1) % 65536); // 16-bit wrapping
    });

    it('should wrap packet number at 65536', () => {
      const data = deterministicBuffer(100);
      
      // Set sequence to near max
      template['sequenceNumber'] = 65535;
      
      const packet1 = template.encapsulate(data, clientID);
      const packetNum1 = packet1.readUInt16BE(9);
      expect(packetNum1).toBe(65535);
      
      template.updateState();
      
      const packet2 = template.encapsulate(data, clientID);
      const packetNum2 = packet2.readUInt16BE(9);
      
      // Should wrap back to 0
      expect(packetNum2).toBe(0);
    });
  });

  describe('getParams', () => {
    it('should return params with initialSeq', () => {
      const params = template.getParams();
      expect(params).toHaveProperty('initialSeq');
      expect(typeof params.initialSeq).toBe('number');
    });
  });

  describe('QUIC header structure', () => {
    it('should have flags byte in range 0x40-0x4F', () => {
      const data = deterministicBuffer(100);
      const packet = template.encapsulate(data, clientID);

      // Flags should be 0x40 | (0-15) = 0x40 to 0x4F
      expect(packet[0] & 0xF0).toBe(0x40);
    });

    it('should embed connection ID at bytes 1-8', () => {
      const data = deterministicBuffer(100);
      const packet = template.encapsulate(data, clientID);

      const connectionID = packet.slice(1, 9);
      expect(buffersEqual(connectionID, clientID.slice(0, 8))).toBe(true);
    });

    it('should have 2-byte packet number at bytes 9-10', () => {
      const data = deterministicBuffer(100);
      const packet = template.encapsulate(data, clientID);

      const packetNum = packet.readUInt16BE(9);
      expect(typeof packetNum).toBe('number');
      expect(packetNum).toBeGreaterThanOrEqual(0);
      expect(packetNum).toBeLessThan(65536);
    });
  });

  describe('multiple encapsulate/decapsulate cycles', () => {
    it('should handle multiple cycles correctly', () => {
      const original = deterministicBuffer(100);

      for (let i = 0; i < 10; i++) {
        const packet = template.encapsulate(original, clientID);
        const decapsulated = template.decapsulate(packet);

        expect(decapsulated).not.toBeNull();
        expect(buffersEqual(decapsulated!, original)).toBe(true);
        
        template.updateState();
      }
    });
  });
});
