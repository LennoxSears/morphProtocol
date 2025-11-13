import circularShiftPair from '../../../../src/core/functions/circularShiftObfuscation';
import { buffersEqual } from '../../../helpers/test-utils';

describe('circularShiftObfuscation function', () => {
  const keyArray = new Uint8Array(256);
  const initor = 0;

  describe('obfuscation and deobfuscation', () => {
    it('should perform circular shift', () => {
      const input = new Uint8Array([1, 2, 3, 4, 5]);
      const result = circularShiftPair.obfuscation(input, keyArray, initor);

      expect(result).toHaveLength(5);
      // Data should be shifted
      expect(result).not.toEqual(input);
    });

    it('should be reversible', () => {
      const original = new Uint8Array([10, 20, 30, 40, 50]);

      const obfuscated = circularShiftPair.obfuscation(original, keyArray, initor);
      const deobfuscated = circularShiftPair.deobfuscation(obfuscated, keyArray, initor);

      expect(buffersEqual(Buffer.from(deobfuscated), Buffer.from(original))).toBe(true);
    });

    it('should handle empty input', () => {
      const input = new Uint8Array(0);
      const result = circularShiftPair.obfuscation(input, keyArray, initor);

      expect(result).toHaveLength(0);
    });

    it('should be reversible for all byte values', () => {
      const original = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        original[i] = i;
      }

      const obfuscated = circularShiftPair.obfuscation(original, keyArray, initor);
      const deobfuscated = circularShiftPair.deobfuscation(obfuscated, keyArray, initor);

      expect(buffersEqual(Buffer.from(deobfuscated), Buffer.from(original))).toBe(true);
    });

    it('should be reversible for large data', () => {
      const original = new Uint8Array(1500);
      for (let i = 0; i < 1500; i++) {
        original[i] = i % 256;
      }

      const obfuscated = circularShiftPair.obfuscation(original, keyArray, initor);
      const deobfuscated = circularShiftPair.deobfuscation(obfuscated, keyArray, initor);

      expect(buffersEqual(Buffer.from(deobfuscated), Buffer.from(original))).toBe(true);
    });
  });
});
