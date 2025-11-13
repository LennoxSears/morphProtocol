import { GenericGamingTemplate } from '../../../../src/core/protocol-templates/generic-gaming-template';
import { deterministicBuffer, buffersEqual } from '../../../helpers/test-utils';

describe('GenericGamingTemplate', () => {
  let template: GenericGamingTemplate;
  let clientID: Buffer;

  beforeEach(() => {
    template = new GenericGamingTemplate();
    clientID = Buffer.alloc(16);
    for (let i = 0; i < 16; i++) {
      clientID[i] = i;
    }
  });

  describe('basic properties', () => {
    it('should have correct template ID', () => {
      expect(template.id).toBe(3);
    });

    it('should have correct template name', () => {
      expect(template.name).toBe('Generic Gaming');
    });
  });

  describe('encapsulate and decapsulate', () => {
    it('should encapsulate data with Gaming header', () => {
      const data = deterministicBuffer(100);
      const packet = template.encapsulate(data, clientID);

      // Gaming header: 12 bytes
      expect(packet.length).toBe(12 + data.length);
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

    it('should return null for packet without GAME magic', () => {
      const invalidPacket = Buffer.alloc(20);
      invalidPacket.write('FAKE', 0, 4, 'ascii');
      
      const result = template.decapsulate(invalidPacket);
      expect(result).toBeNull();
    });

    it('should return null for packet too short', () => {
      const invalidPacket = Buffer.alloc(10);
      const result = template.decapsulate(invalidPacket);
      
      expect(result).toBeNull();
    });
  });

  describe('extractHeaderID', () => {
    it('should extract 4-byte session ID from packet', () => {
      const data = deterministicBuffer(100);
      const packet = template.encapsulate(data, clientID);
      const headerID = template.extractHeaderID(packet);

      expect(headerID).not.toBeNull();
      expect(headerID!.length).toBe(4);
      // Should match first 4 bytes of clientID (at bytes 4-7)
      expect(buffersEqual(headerID!, clientID.slice(0, 4))).toBe(true);
    });

    it('should return null for invalid packet (too short)', () => {
      const invalidPacket = Buffer.alloc(7);
      const headerID = template.extractHeaderID(invalidPacket);

      expect(headerID).toBeNull();
    });

    it('should return null for packet without GAME magic', () => {
      const invalidPacket = Buffer.alloc(20);
      invalidPacket.write('FAKE', 0, 4, 'ascii');
      
      const headerID = template.extractHeaderID(invalidPacket);
      expect(headerID).toBeNull();
    });

    it('should extract headerID from valid packet', () => {
      const data = deterministicBuffer(100);
      const packet = template.encapsulate(data, clientID);
      
      const headerID = template.extractHeaderID(packet);
      expect(headerID).not.toBeNull();
      expect(buffersEqual(headerID!, clientID.slice(0, 4))).toBe(true);
    });
  });

  describe('updateState', () => {
    it('should increment sequence number', () => {
      const data = deterministicBuffer(100);
      
      const packet1 = template.encapsulate(data, clientID);
      const seq1 = packet1.readUInt16BE(8); // Sequence at offset 8
      
      template.updateState();
      
      const packet2 = template.encapsulate(data, clientID);
      const seq2 = packet2.readUInt16BE(8);
      
      expect(seq2).toBe((seq1 + 1) % 65536);
    });

    it('should wrap sequence number at 65536', () => {
      const data = deterministicBuffer(100);
      
      // Set sequence to near max
      template['sequenceNumber'] = 65535;
      
      const packet1 = template.encapsulate(data, clientID);
      const seq1 = packet1.readUInt16BE(8);
      expect(seq1).toBe(65535);
      
      template.updateState();
      
      const packet2 = template.encapsulate(data, clientID);
      const seq2 = packet2.readUInt16BE(8);
      
      // Should wrap back to 0
      expect(seq2).toBe(0);
    });
  });

  describe('getParams', () => {
    it('should return params with initialSeq', () => {
      const params = template.getParams();
      
      expect(params).toHaveProperty('initialSeq');
      expect(typeof params.initialSeq).toBe('number');
    });
  });

  describe('Gaming header structure', () => {
    it('should have GAME magic at bytes 0-3', () => {
      const data = deterministicBuffer(100);
      const packet = template.encapsulate(data, clientID);

      const magic = packet.toString('ascii', 0, 4);
      expect(magic).toBe('GAME');
    });

    it('should embed session ID from clientID at bytes 4-7', () => {
      const data = deterministicBuffer(100);
      const packet = template.encapsulate(data, clientID);

      const sessionID = packet.slice(4, 8);
      expect(buffersEqual(sessionID, clientID.slice(0, 4))).toBe(true);
    });

    it('should have 2-byte sequence number at bytes 8-9', () => {
      const data = deterministicBuffer(100);
      const packet = template.encapsulate(data, clientID);

      const seq = packet.readUInt16BE(8);
      expect(typeof seq).toBe('number');
      expect(seq).toBeGreaterThanOrEqual(0);
      expect(seq).toBeLessThan(65536);
    });

    it('should have packet type 0x01-0x05 at byte 10', () => {
      const data = deterministicBuffer(100);
      const packet = template.encapsulate(data, clientID);

      const type = packet[10];
      expect(type).toBeGreaterThanOrEqual(0x01);
      expect(type).toBeLessThanOrEqual(0x05);
    });

    it('should have flags byte at byte 11', () => {
      const data = deterministicBuffer(100);
      const packet = template.encapsulate(data, clientID);

      const flags = packet[11];
      expect(typeof flags).toBe('number');
      expect(flags).toBeGreaterThanOrEqual(0);
      expect(flags).toBeLessThan(256);
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
