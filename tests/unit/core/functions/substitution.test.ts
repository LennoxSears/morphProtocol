import substitutionPair from '../../../../src/core/functions/substitution';
import { buffersEqual } from '../../../helpers/test-utils';

describe('substitution obfuscation function', () => {
  describe('initorFn', () => {
    it('should generate a 256-element substitution table', () => {
      const table = substitutionPair.initorFn();

      expect(Array.isArray(table)).toBe(true);
      expect(table.length).toBe(256);
    });

    it('should contain all values 0-255 exactly once', () => {
      const table = substitutionPair.initorFn();
      const sorted = [...table].sort((a, b) => a - b);

      for (let i = 0; i < 256; i++) {
        expect(sorted[i]).toBe(i);
      }
    });

    it('should generate different tables on multiple calls', () => {
      const table1 = substitutionPair.initorFn();
      const table2 = substitutionPair.initorFn();

      // Tables should be different (shuffled randomly)
      let different = false;
      for (let i = 0; i < 256; i++) {
        if (table1[i] !== table2[i]) {
          different = true;
          break;
        }
      }
      expect(different).toBe(true);
    });
  });

  describe('obfuscation and deobfuscation', () => {
    it('should substitute bytes according to table', () => {
      const input = new Uint8Array([0, 1, 2, 3, 4]);
      const keyArray = new Uint8Array(5);
      const table = [10, 20, 30, 40, 50, ...Array.from({ length: 251 }, (_, i) => i + 5)];

      const result = substitutionPair.obfuscation(input, keyArray, table);

      expect(result[0]).toBe(10); // 0 -> 10
      expect(result[1]).toBe(20); // 1 -> 20
      expect(result[2]).toBe(30); // 2 -> 30
      expect(result[3]).toBe(40); // 3 -> 40
      expect(result[4]).toBe(50); // 4 -> 50
    });

    it('should be reversible with identity table', () => {
      const original = new Uint8Array([10, 20, 30, 40, 50]);
      const keyArray = new Uint8Array(5);
      const identityTable = Array.from({ length: 256 }, (_, i) => i);

      const obfuscated = substitutionPair.obfuscation(original, keyArray, identityTable);
      const deobfuscated = substitutionPair.deobfuscation(obfuscated, keyArray, identityTable);

      expect(buffersEqual(Buffer.from(deobfuscated), Buffer.from(original))).toBe(true);
    });

    it('should be reversible with random table', () => {
      const original = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]);
      const keyArray = new Uint8Array(8);
      const table = substitutionPair.initorFn();

      const obfuscated = substitutionPair.obfuscation(original, keyArray, table);
      const deobfuscated = substitutionPair.deobfuscation(obfuscated, keyArray, table);

      expect(buffersEqual(Buffer.from(deobfuscated), Buffer.from(original))).toBe(true);
    });

    it('should handle empty input', () => {
      const input = new Uint8Array(0);
      const keyArray = new Uint8Array(0);
      const table = substitutionPair.initorFn();

      const result = substitutionPair.obfuscation(input, keyArray, table);

      expect(result).toHaveLength(0);
    });

    it('should be reversible for all byte values', () => {
      const original = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        original[i] = i;
      }
      const keyArray = new Uint8Array(256);
      const table = substitutionPair.initorFn();

      const obfuscated = substitutionPair.obfuscation(original, keyArray, table);
      const deobfuscated = substitutionPair.deobfuscation(obfuscated, keyArray, table);

      expect(buffersEqual(Buffer.from(deobfuscated), Buffer.from(original))).toBe(true);
    });

    it('should handle large data', () => {
      const original = new Uint8Array(1500);
      for (let i = 0; i < 1500; i++) {
        original[i] = i % 256;
      }
      const keyArray = new Uint8Array(1500);
      const table = substitutionPair.initorFn();

      const obfuscated = substitutionPair.obfuscation(original, keyArray, table);
      const deobfuscated = substitutionPair.deobfuscation(obfuscated, keyArray, table);

      expect(buffersEqual(Buffer.from(deobfuscated), Buffer.from(original))).toBe(true);
    });
  });

  describe('substitution properties', () => {
    it('should maintain data length', () => {
      const input = new Uint8Array([1, 2, 3, 4, 5]);
      const keyArray = new Uint8Array(5);
      const table = substitutionPair.initorFn();

      const result = substitutionPair.obfuscation(input, keyArray, table);

      expect(result.length).toBe(input.length);
    });

    it('should change data with non-identity table', () => {
      const input = new Uint8Array([0, 1, 2, 3, 4]);
      const keyArray = new Uint8Array(5);
      // Create a non-identity table
      const table = Array.from({ length: 256 }, (_, i) => (i + 1) % 256);

      const result = substitutionPair.obfuscation(input, keyArray, table);

      // All bytes should be different
      for (let i = 0; i < input.length; i++) {
        expect(result[i]).not.toBe(input[i]);
      }
    });
  });

  describe('error handling', () => {
    it('should throw error when deobfuscating with undefined table', () => {
      const input = new Uint8Array([1, 2, 3, 4, 5]);
      const keyArray = new Uint8Array(5);

      expect(() => {
        substitutionPair.deobfuscation(input, keyArray, undefined as any);
      }).toThrow('de_substitution: _initor (substitution table) is required but was undefined or invalid');
    });

    it('should throw error when deobfuscating with null table', () => {
      const input = new Uint8Array([1, 2, 3, 4, 5]);
      const keyArray = new Uint8Array(5);

      expect(() => {
        substitutionPair.deobfuscation(input, keyArray, null as any);
      }).toThrow('de_substitution: _initor (substitution table) is required but was undefined or invalid');
    });

    it('should throw error when deobfuscating with non-array table', () => {
      const input = new Uint8Array([1, 2, 3, 4, 5]);
      const keyArray = new Uint8Array(5);

      expect(() => {
        substitutionPair.deobfuscation(input, keyArray, 12345 as any);
      }).toThrow('de_substitution: _initor (substitution table) is required but was undefined or invalid');
    });

    it('should work correctly with valid table', () => {
      const input = new Uint8Array([1, 2, 3, 4, 5]);
      const keyArray = new Uint8Array(5);
      const table = substitutionPair.initorFn();

      const obfuscated = substitutionPair.obfuscation(input, keyArray, table);
      const deobfuscated = substitutionPair.deobfuscation(obfuscated, keyArray, table);

      expect(Buffer.from(deobfuscated).equals(Buffer.from(input))).toBe(true);
    });
  });

  describe('WireGuard handshake simulation', () => {
    it('should handle WireGuard handshake initiation size (148 bytes)', () => {
      const input = new Uint8Array(148);
      for (let i = 0; i < 148; i++) {
        input[i] = i % 256;
      }
      const keyArray = new Uint8Array(148);
      const table = substitutionPair.initorFn();

      const obfuscated = substitutionPair.obfuscation(input, keyArray, table);
      const deobfuscated = substitutionPair.deobfuscation(obfuscated, keyArray, table);

      expect(Buffer.from(deobfuscated).equals(Buffer.from(input))).toBe(true);
    });

    it('should handle multiple consecutive packets', () => {
      const table = substitutionPair.initorFn();

      // Simulate 4 consecutive WireGuard handshake packets
      for (let packetNum = 0; packetNum < 4; packetNum++) {
        const input = new Uint8Array(148);
        for (let i = 0; i < 148; i++) {
          input[i] = (i + packetNum * 10) % 256;
        }
        const keyArray = new Uint8Array(148);

        const obfuscated = substitutionPair.obfuscation(input, keyArray, table);
        const deobfuscated = substitutionPair.deobfuscation(obfuscated, keyArray, table);

        expect(Buffer.from(deobfuscated).equals(Buffer.from(input))).toBe(true);
      }
    });
  });
});
