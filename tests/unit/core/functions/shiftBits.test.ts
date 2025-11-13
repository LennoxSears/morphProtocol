import shiftBitsPair from '../../../../src/core/functions/shiftBits';
import { buffersEqual } from '../../../helpers/test-utils';

describe('shiftBits obfuscation function', () => {
  const keyArray = new Uint8Array(256);
  const initor = 0;

  describe('obfuscation and deobfuscation', () => {
    it('should shift bits left', () => {
      const input = new Uint8Array([0b00000001, 0b00000010, 0b00000100]);
      const result = shiftBitsPair.obfuscation(input, keyArray, initor);

      // Each byte should be shifted
      expect(result[0]).not.toBe(input[0]);
      expect(result[1]).not.toBe(input[1]);
      expect(result[2]).not.toBe(input[2]);
    });

    it('should be reversible', () => {
      const original = new Uint8Array([10, 20, 30, 40, 50]);

      const obfuscated = shiftBitsPair.obfuscation(original, keyArray, initor);
      const deobfuscated = shiftBitsPair.deobfuscation(obfuscated);

      expect(buffersEqual(Buffer.from(deobfuscated), Buffer.from(original))).toBe(true);
    });

    it('should handle all zeros', () => {
      const input = new Uint8Array([0, 0, 0, 0]);

      const obfuscated = shiftBitsPair.obfuscation(input, keyArray, initor);
      const deobfuscated = shiftBitsPair.deobfuscation(obfuscated);

      expect(buffersEqual(Buffer.from(deobfuscated), Buffer.from(input))).toBe(true);
    });

    it('should handle all ones', () => {
      const input = new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF]);

      const obfuscated = shiftBitsPair.obfuscation(input, keyArray, initor);
      const deobfuscated = shiftBitsPair.deobfuscation(obfuscated);

      expect(buffersEqual(Buffer.from(deobfuscated), Buffer.from(input))).toBe(true);
    });

    it('should handle empty input', () => {
      const input = new Uint8Array(0);
      const result = shiftBitsPair.obfuscation(input, keyArray, initor);

      expect(result).toHaveLength(0);
    });

    it('should be reversible for all byte values', () => {
      const original = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        original[i] = i;
      }

      const obfuscated = shiftBitsPair.obfuscation(original, keyArray, initor);
      const deobfuscated = shiftBitsPair.deobfuscation(obfuscated);

      expect(buffersEqual(Buffer.from(deobfuscated), Buffer.from(original))).toBe(true);
    });

    it('should be reversible for large data', () => {
      const original = new Uint8Array(1500);
      for (let i = 0; i < 1500; i++) {
        original[i] = i % 256;
      }

      const obfuscated = shiftBitsPair.obfuscation(original, keyArray, initor);
      const deobfuscated = shiftBitsPair.deobfuscation(obfuscated);

      expect(buffersEqual(Buffer.from(deobfuscated), Buffer.from(original))).toBe(true);
    });
  });

  describe('shift properties', () => {
    it('should maintain buffer length', () => {
      const input = new Uint8Array([1, 2, 3, 4, 5]);
      const result = shiftBitsPair.obfuscation(input, keyArray, initor);

      expect(result.length).toBe(input.length);
    });

    it('should change data (not identity)', () => {
      const input = new Uint8Array([42, 100, 200]);
      const result = shiftBitsPair.obfuscation(input, keyArray, initor);

      // At least one byte should be different (unless all zeros)
      let different = false;
      for (let i = 0; i < input.length; i++) {
        if (result[i] !== input[i] && input[i] !== 0) {
          different = true;
          break;
        }
      }
      expect(different).toBe(true);
    });
  });
});
