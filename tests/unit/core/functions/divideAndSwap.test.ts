import divideAndSwapPair from '../../../../src/core/functions/divideAndSwap';
import { buffersEqual } from '../../../helpers/test-utils';

describe('divideAndSwap obfuscation function', () => {
  const keyArray = new Uint8Array(256);
  const initor = 0;

  describe('obfuscation and deobfuscation', () => {
    it('should divide and swap buffer halves', () => {
      const input = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const result = divideAndSwapPair.obfuscation(input, keyArray, initor);

      expect(result).toHaveLength(8);
      // Second half should be first, first half should be second
      expect(result[0]).toBe(5);
      expect(result[1]).toBe(6);
      expect(result[2]).toBe(7);
      expect(result[3]).toBe(8);
      expect(result[4]).toBe(1);
      expect(result[5]).toBe(2);
      expect(result[6]).toBe(3);
      expect(result[7]).toBe(4);
    });

    it('should be self-reversible', () => {
      const original = new Uint8Array([10, 20, 30, 40, 50, 60]);

      const obfuscated = divideAndSwapPair.obfuscation(original, keyArray, initor);
      const deobfuscated = divideAndSwapPair.deobfuscation(obfuscated, keyArray, initor);

      expect(buffersEqual(Buffer.from(deobfuscated), Buffer.from(original))).toBe(true);
    });

    it('should handle odd length', () => {
      const input = new Uint8Array([1, 2, 3, 4, 5]);
      const result = divideAndSwapPair.obfuscation(input, keyArray, initor);

      expect(result).toHaveLength(5);
      // Should still swap halves (middle element handling)
    });

    it('should handle empty input', () => {
      const input = new Uint8Array(0);
      const result = divideAndSwapPair.obfuscation(input, keyArray, initor);

      expect(result).toHaveLength(0);
    });

    it('should be reversible for large data', () => {
      const original = new Uint8Array(1500);
      for (let i = 0; i < 1500; i++) {
        original[i] = i % 256;
      }

      const obfuscated = divideAndSwapPair.obfuscation(original, keyArray, initor);
      const deobfuscated = divideAndSwapPair.deobfuscation(obfuscated, keyArray, initor);

      expect(buffersEqual(Buffer.from(deobfuscated), Buffer.from(original))).toBe(true);
    });
  });

  describe('swap properties', () => {
    it('should maintain buffer length', () => {
      const input = new Uint8Array([1, 2, 3, 4, 5, 6]);
      const result = divideAndSwapPair.obfuscation(input, keyArray, initor);

      expect(result.length).toBe(input.length);
    });

    it('should preserve all values', () => {
      const input = new Uint8Array([10, 20, 30, 40, 50, 60]);
      const result = divideAndSwapPair.obfuscation(input, keyArray, initor);

      const inputSorted = Array.from(input).sort();
      const resultSorted = Array.from(result).sort();

      expect(resultSorted).toEqual(inputSorted);
    });
  });
});
