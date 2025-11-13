import { KcpTemplate } from '../../../../src/core/protocol-templates/kcp-template';
import { deterministicBuffer, buffersEqual } from '../../../helpers/test-utils';

describe('KcpTemplate', () => {
  let template: KcpTemplate;
  let clientID: Buffer;

  beforeEach(() => {
    template = new KcpTemplate();
    clientID = Buffer.alloc(16);
    for (let i = 0; i < 16; i++) {
      clientID[i] = i;
    }
  });

  describe('basic properties', () => {
    it('should have correct template ID', () => {
      expect(template.id).toBe(2);
    });

    it('should have correct template name', () => {
      expect(template.name).toBe('KCP Protocol');
    });
  });

  describe('encapsulate and decapsulate', () => {
    it('should encapsulate data with KCP header', () => {
      const data = deterministicBuffer(100);
      const packet = template.encapsulate(data, clientID);

      // KCP header: 24 bytes
      expect(packet.length).toBe(24 + data.length);
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
    it('should extract 4-byte conv from packet', () => {
      const data = deterministicBuffer(100);
      const packet = template.encapsulate(data, clientID);
      const headerID = template.extractHeaderID(packet);

      expect(headerID).not.toBeNull();
      expect(headerID!.length).toBe(4);
      // Should match first 4 bytes of clientID
      expect(buffersEqual(headerID!, clientID.slice(0, 4))).toBe(true);
    });

    it('should return null for invalid packet (too short)', () => {
      const invalidPacket = Buffer.alloc(3);
      const headerID = template.extractHeaderID(invalidPacket);

      expect(headerID).toBeNull();
    });

    it('should extract headerID from any packet with 4+ bytes', () => {
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
      const sn1 = packet1.readUInt32LE(12); // Sequence number at offset 12
      
      template.updateState();
      
      const packet2 = template.encapsulate(data, clientID);
      const sn2 = packet2.readUInt32LE(12);
      
      expect(sn2).toBe(sn1 + 1);
    });

    it('should update timestamp', () => {
      const data = deterministicBuffer(100);
      
      const packet1 = template.encapsulate(data, clientID);
      const ts1 = packet1.readUInt32LE(8); // Timestamp at offset 8
      
      template.updateState();
      
      const packet2 = template.encapsulate(data, clientID);
      const ts2 = packet2.readUInt32LE(8);
      
      // Timestamp should be updated (may be same if very fast)
      expect(ts2).toBeGreaterThanOrEqual(ts1);
    });
  });

  describe('getParams', () => {
    it('should return params with initialSeq and initialTs', () => {
      const params = template.getParams();
      
      expect(params).toHaveProperty('initialSeq');
      expect(params).toHaveProperty('initialTs');
      expect(typeof params.initialSeq).toBe('number');
      expect(typeof params.initialTs).toBe('number');
    });
  });

  describe('KCP header structure', () => {
    it('should embed conv from clientID at bytes 0-3', () => {
      const data = deterministicBuffer(100);
      const packet = template.encapsulate(data, clientID);

      const conv = packet.slice(0, 4);
      expect(buffersEqual(conv, clientID.slice(0, 4))).toBe(true);
    });

    it('should have cmd byte 0x51 (data packet)', () => {
      const data = deterministicBuffer(100);
      const packet = template.encapsulate(data, clientID);

      expect(packet[4]).toBe(0x51);
    });

    it('should have frg byte 0 (no fragmentation)', () => {
      const data = deterministicBuffer(100);
      const packet = template.encapsulate(data, clientID);

      expect(packet[5]).toBe(0);
    });

    it('should have window size 256', () => {
      const data = deterministicBuffer(100);
      const packet = template.encapsulate(data, clientID);

      const wnd = packet.readUInt16LE(6);
      expect(wnd).toBe(256);
    });

    it('should have correct payload length in header', () => {
      const data = deterministicBuffer(100);
      const packet = template.encapsulate(data, clientID);

      const len = packet.readUInt32LE(20);
      expect(len).toBe(100);
    });

    it('should have una = sn - 1', () => {
      const data = deterministicBuffer(100);
      const packet = template.encapsulate(data, clientID);

      const sn = packet.readUInt32LE(12);
      const una = packet.readUInt32LE(16);
      
      if (sn > 0) {
        expect(una).toBe(sn - 1);
      } else {
        expect(una).toBe(0);
      }
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
