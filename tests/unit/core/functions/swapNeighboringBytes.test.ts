import swapNeighboringBytesPair from '../../../../src/core/functions/swapNeighboringBytes';
import { buffersEqual } from '../../../helpers/test-utils';

describe('swapNeighboringBytes obfuscation function', () => {
  const keyArray = new Uint8Array(256);
  const initor = 0;

  describe('obfuscation and deobfuscation', () => {
    it('should swap neighboring bytes', () => {
      const input = new Uint8Array([1, 2, 3, 4, 5, 6]);
      const result = swapNeighboringBytesPair.obfuscation(input, keyArray, initor);

      expect(result[0]).toBe(2); // Swapped with index 1
      expect(result[1]).toBe(1);
      expect(result[2]).toBe(4); // Swapped with index 3
      expect(result[3]).toBe(3);
      expect(result[4]).toBe(6); // Swapped with index 5
      expect(result[5]).toBe(5);
    });

    it('should be self-reversible (swap twice returns original)', () => {
      const original = new Uint8Array([10, 20, 30, 40, 50, 60]);

      const obfuscated = swapNeighboringBytesPair.obfuscation(original, keyArray, initor);
      const deobfuscated = swapNeighboringBytesPair.deobfuscation(obfuscated, keyArray, initor);

      expect(buffersEqual(Buffer.from(deobfuscated), Buffer.from(original))).toBe(true);
    });

    it('should handle odd length (last byte unchanged)', () => {
      const input = new Uint8Array([1, 2, 3, 4, 5]);
      const result = swapNeighboringBytesPair.obfuscation(input, keyArray, initor);

      expect(result[0]).toBe(2);
      expect(result[1]).toBe(1);
      expect(result[2]).toBe(4);
      expect(result[3]).toBe(3);
      expect(result[4]).toBe(5); // Odd one out, unchanged
    });

    it('should handle single byte', () => {
      const input = new Uint8Array([42]);
      const result = swapNeighboringBytesPair.obfuscation(input, keyArray, initor);

      expect(result[0]).toBe(42); // No neighbor to swap with
    });

    it('should handle two bytes', () => {
      const input = new Uint8Array([10, 20]);
      const result = swapNeighboringBytesPair.obfuscation(input, keyArray, initor);

      expect(result[0]).toBe(20);
      expect(result[1]).toBe(10);
    });

    it('should handle empty input', () => {
      const input = new Uint8Array(0);
      const result = swapNeighboringBytesPair.obfuscation(input, keyArray, initor);

      expect(result).toHaveLength(0);
    });

    it('should be reversible for large data', () => {
      const original = new Uint8Array(1500);
      for (let i = 0; i < 1500; i++) {
        original[i] = i % 256;
      }

      const obfuscated = swapNeighboringBytesPair.obfuscation(original, keyArray, initor);
      const deobfuscated = swapNeighboringBytesPair.deobfuscation(obfuscated, keyArray, initor);

      expect(buffersEqual(Buffer.from(deobfuscated), Buffer.from(original))).toBe(true);
    });
  });

  describe('swap properties', () => {
    it('should maintain buffer length', () => {
      const input = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const result = swapNeighboringBytesPair.obfuscation(input, keyArray, initor);

      expect(result.length).toBe(input.length);
    });

    it('should preserve all values', () => {
      const input = new Uint8Array([10, 20, 30, 40, 50, 60]);
      const result = swapNeighboringBytesPair.obfuscation(input, keyArray, initor);

      const inputSorted = Array.from(input).sort();
      const resultSorted = Array.from(result).sort();

      expect(resultSorted).toEqual(inputSorted);
    });

    it('should satisfy swap property: swap(swap(x)) = x', () => {
      const input = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

      const step1 = swapNeighboringBytesPair.obfuscation(input, keyArray, initor);
      const step2 = swapNeighboringBytesPair.obfuscation(step1, keyArray, initor);

      expect(buffersEqual(Buffer.from(step2), Buffer.from(input))).toBe(true);
    });
  });
});
