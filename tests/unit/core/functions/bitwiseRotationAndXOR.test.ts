import bitwiseRotationAndXORPair from '../../../../src/core/functions/bitwiseRotationAndXOR';
import { buffersEqual } from '../../../helpers/test-utils';

describe('bitwiseRotationAndXOR obfuscation function', () => {
  describe('obfuscation and deobfuscation', () => {
    it('should rotate bits and XOR with key', () => {
      const input = new Uint8Array([0b10101010, 0b11001100, 0b11110000]);
      const keyArray = new Uint8Array([0b00001111, 0b11110000, 0b10101010]);
      const initor = 0;

      const result = bitwiseRotationAndXORPair.obfuscation(input, keyArray, initor);

      expect(result).toHaveLength(3);
      // Each byte should be rotated and XORed
      expect(result[0]).not.toBe(input[0]);
    });

    it('should be reversible', () => {
      const original = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]);
      const keyArray = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const initor = 0;

      const obfuscated = bitwiseRotationAndXORPair.obfuscation(original, keyArray, initor);
      const deobfuscated = bitwiseRotationAndXORPair.deobfuscation(obfuscated, keyArray, initor);

      expect(buffersEqual(Buffer.from(deobfuscated), Buffer.from(original))).toBe(true);
    });

    it('should handle empty input', () => {
      const input = new Uint8Array(0);
      const keyArray = new Uint8Array(0);
      const initor = 0;

      const result = bitwiseRotationAndXORPair.obfuscation(input, keyArray, initor);

      expect(result).toHaveLength(0);
    });

    it('should handle all zeros', () => {
      const input = new Uint8Array([0, 0, 0, 0]);
      const keyArray = new Uint8Array([0xFF, 0xAA, 0x55, 0x11]);
      const initor = 0;

      const obfuscated = bitwiseRotationAndXORPair.obfuscation(input, keyArray, initor);
      const deobfuscated = bitwiseRotationAndXORPair.deobfuscation(obfuscated, keyArray, initor);

      expect(buffersEqual(Buffer.from(deobfuscated), Buffer.from(input))).toBe(true);
    });

    it('should be reversible for all byte values', () => {
      const original = new Uint8Array(256);
      const keyArray = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        original[i] = i;
        keyArray[i] = (i * 7) % 256;
      }
      const initor = 0;

      const obfuscated = bitwiseRotationAndXORPair.obfuscation(original, keyArray, initor);
      const deobfuscated = bitwiseRotationAndXORPair.deobfuscation(obfuscated, keyArray, initor);

      expect(buffersEqual(Buffer.from(deobfuscated), Buffer.from(original))).toBe(true);
    });

    it('should handle large data', () => {
      const original = new Uint8Array(1500);
      const keyArray = new Uint8Array(1500);
      for (let i = 0; i < 1500; i++) {
        original[i] = i % 256;
        keyArray[i] = (i * 3) % 256;
      }
      const initor = 0;

      const obfuscated = bitwiseRotationAndXORPair.obfuscation(original, keyArray, initor);
      const deobfuscated = bitwiseRotationAndXORPair.deobfuscation(obfuscated, keyArray, initor);

      expect(buffersEqual(Buffer.from(deobfuscated), Buffer.from(original))).toBe(true);
    });
  });

  describe('rotation properties', () => {
    it('should change data (not identity)', () => {
      const input = new Uint8Array([42, 100, 200]);
      const keyArray = new Uint8Array([17, 89, 234]);
      const initor = 0;

      const result = bitwiseRotationAndXORPair.obfuscation(input, keyArray, initor);

      // At least one byte should be different
      let different = false;
      for (let i = 0; i < input.length; i++) {
        if (result[i] !== input[i]) {
          different = true;
          break;
        }
      }
      expect(different).toBe(true);
    });
  });
});
