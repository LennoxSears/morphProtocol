import reverseBitsPair from '../../../../src/core/functions/reverseBits';
import { buffersEqual } from '../../../helpers/test-utils';

describe('reverseBits obfuscation function', () => {
  const keyArray = new Uint8Array(256);
  const initor = 0;

  describe('obfuscation and deobfuscation', () => {
    it('should reverse bits in each byte', () => {
      const input = new Uint8Array([0b10000000, 0b01000000, 0b00100000]);
      const result = reverseBitsPair.obfuscation(input, keyArray, initor);

      expect(result[0]).toBe(0b00000001); // 10000000 reversed
      expect(result[1]).toBe(0b00000010); // 01000000 reversed
      expect(result[2]).toBe(0b00000100); // 00100000 reversed
    });

    it('should be self-reversible', () => {
      const original = new Uint8Array([10, 20, 30, 40, 50]);

      const obfuscated = reverseBitsPair.obfuscation(original, keyArray, initor);
      const deobfuscated = reverseBitsPair.deobfuscation(obfuscated, keyArray, initor);

      expect(buffersEqual(Buffer.from(deobfuscated), Buffer.from(original))).toBe(true);
    });

    it('should handle palindrome bits', () => {
      const input = new Uint8Array([0b10000001, 0b01111110, 0b00111100]);
      const result = reverseBitsPair.obfuscation(input, keyArray, initor);

      // These are bit palindromes
      expect(result[0]).toBe(0b10000001);
      expect(result[1]).toBe(0b01111110);
      expect(result[2]).toBe(0b00111100);
    });

    it('should handle empty input', () => {
      const input = new Uint8Array(0);
      const result = reverseBitsPair.obfuscation(input, keyArray, initor);

      expect(result).toHaveLength(0);
    });

    it('should be reversible for all byte values', () => {
      const original = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        original[i] = i;
      }

      const obfuscated = reverseBitsPair.obfuscation(original, keyArray, initor);
      const deobfuscated = reverseBitsPair.deobfuscation(obfuscated, keyArray, initor);

      expect(buffersEqual(Buffer.from(deobfuscated), Buffer.from(original))).toBe(true);
    });

    it('should be reversible for large data', () => {
      const original = new Uint8Array(1500);
      for (let i = 0; i < 1500; i++) {
        original[i] = i % 256;
      }

      const obfuscated = reverseBitsPair.obfuscation(original, keyArray, initor);
      const deobfuscated = reverseBitsPair.deobfuscation(obfuscated, keyArray, initor);

      expect(buffersEqual(Buffer.from(deobfuscated), Buffer.from(original))).toBe(true);
    });
  });
});
