import { Obfuscator } from '../../../src/core/obfuscator';
import { deterministicBuffer, buffersEqual, TEST_DATA, toArrayBuffer, createDeterministicFnInitor } from '../../helpers/test-utils';

describe('Obfuscator', () => {
  const testKey = 123;
  const testLayer = 3;
  const testPadding = 8;
  const testFnInitor = createDeterministicFnInitor(); // Use deterministic initializer for testing

  describe('constructor', () => {
    it('should create an obfuscator instance', () => {
      const obfuscator = new Obfuscator(testKey, testLayer, testPadding, testFnInitor);
      expect(obfuscator).toBeInstanceOf(Obfuscator);
    });

    it('should accept different layer values', () => {
      for (let layer = 1; layer <= 4; layer++) {
        const obfuscator = new Obfuscator(testKey, layer, testPadding, testFnInitor);
        expect(obfuscator).toBeInstanceOf(Obfuscator);
      }
    });
  });

  describe('obfuscation and deobfuscation', () => {
    it('should obfuscate and deobfuscate data correctly', () => {
      const obfuscator = new Obfuscator(testKey, testLayer, testPadding, testFnInitor);
      const original = deterministicBuffer(100);

      const obfuscated = obfuscator.obfuscation(toArrayBuffer(original));
      const deobfuscated = obfuscator.deobfuscation(toArrayBuffer(Buffer.from(obfuscated)));

      expect(buffersEqual(Buffer.from(deobfuscated), original)).toBe(true);
    });

    it('should add header and padding to obfuscated data', () => {
      const obfuscator = new Obfuscator(testKey, testLayer, testPadding, testFnInitor);
      const original = deterministicBuffer(100);

      const obfuscated = obfuscator.obfuscation(toArrayBuffer(original));

      // Header is 3 bytes, padding is 1-8 bytes
      expect(obfuscated.length).toBeGreaterThan(original.length + 3);
      expect(obfuscated.length).toBeLessThanOrEqual(original.length + 3 + testPadding);
    });

    it('should handle empty data', () => {
      const obfuscator = new Obfuscator(testKey, testLayer, testPadding, testFnInitor);
      const original = Buffer.alloc(0);

      const obfuscated = obfuscator.obfuscation(toArrayBuffer(original));
      const deobfuscated = obfuscator.deobfuscation(toArrayBuffer(Buffer.from(obfuscated)));

      expect(deobfuscated.length).toBe(0);
    });

    it('should handle small data', () => {
      const obfuscator = new Obfuscator(testKey, testLayer, testPadding, testFnInitor);
      const original = TEST_DATA.small;

      const obfuscated = obfuscator.obfuscation(toArrayBuffer(original));
      const deobfuscated = obfuscator.deobfuscation(toArrayBuffer(Buffer.from(obfuscated)));

      expect(buffersEqual(Buffer.from(deobfuscated), original)).toBe(true);
    });

    it('should handle medium data', () => {
      const obfuscator = new Obfuscator(testKey, testLayer, testPadding, testFnInitor);
      const original = TEST_DATA.medium;

      const obfuscated = obfuscator.obfuscation(toArrayBuffer(original));
      const deobfuscated = obfuscator.deobfuscation(toArrayBuffer(Buffer.from(obfuscated)));

      expect(buffersEqual(Buffer.from(deobfuscated), original)).toBe(true);
    });

    it('should handle large data (MTU size)', () => {
      const obfuscator = new Obfuscator(testKey, testLayer, testPadding, testFnInitor);
      const original = TEST_DATA.large;

      const obfuscated = obfuscator.obfuscation(toArrayBuffer(original));
      const deobfuscated = obfuscator.deobfuscation(toArrayBuffer(Buffer.from(obfuscated)));

      expect(buffersEqual(Buffer.from(deobfuscated), original)).toBe(true);
    });
  });

  describe('different obfuscation layers', () => {
    it('should work with 1 layer', () => {
      const obfuscator = new Obfuscator(testKey, 1, testPadding, testFnInitor);
      const original = deterministicBuffer(100);

      const obfuscated = obfuscator.obfuscation(toArrayBuffer(original));
      const deobfuscated = obfuscator.deobfuscation(toArrayBuffer(Buffer.from(obfuscated)));

      expect(buffersEqual(Buffer.from(deobfuscated), original)).toBe(true);
    });

    it('should work with 2 layers', () => {
      const obfuscator = new Obfuscator(testKey, 2, testPadding, testFnInitor);
      const original = deterministicBuffer(100);

      const obfuscated = obfuscator.obfuscation(toArrayBuffer(original));
      const deobfuscated = obfuscator.deobfuscation(toArrayBuffer(Buffer.from(obfuscated)));

      expect(buffersEqual(Buffer.from(deobfuscated), original)).toBe(true);
    });

    it('should work with 4 layers', () => {
      const obfuscator = new Obfuscator(testKey, 4, testPadding, testFnInitor);
      const original = deterministicBuffer(100);

      const obfuscated = obfuscator.obfuscation(toArrayBuffer(original));
      const deobfuscated = obfuscator.deobfuscation(toArrayBuffer(Buffer.from(obfuscated)));

      expect(buffersEqual(Buffer.from(deobfuscated), original)).toBe(true);
    });
  });

  describe('different keys produce different results', () => {
    it('should produce different obfuscated data with different keys', () => {
      const obfuscator1 = new Obfuscator(123, testLayer, testPadding, testFnInitor);
      const obfuscator2 = new Obfuscator(456, testLayer, testPadding, testFnInitor);
      const original = deterministicBuffer(100);

      const obfuscated1 = obfuscator1.obfuscation(toArrayBuffer(original));
      const obfuscated2 = obfuscator2.obfuscation(toArrayBuffer(original));

      // Skip header (first 3 bytes) as it's random
      const data1 = Buffer.from(obfuscated1).slice(3);
      const data2 = Buffer.from(obfuscated2).slice(3);

      expect(buffersEqual(data1, data2)).toBe(false);
    });
  });

  describe('setKey', () => {
    it('should allow changing the key', () => {
      const obfuscator = new Obfuscator(testKey, testLayer, testPadding, testFnInitor);
      const original = deterministicBuffer(100);

      const obfuscated1 = obfuscator.obfuscation(toArrayBuffer(original));
      
      obfuscator.setKey(999);
      const obfuscated2 = obfuscator.obfuscation(toArrayBuffer(original));

      // Results should be different with different keys
      const data1 = Buffer.from(obfuscated1).slice(3);
      const data2 = Buffer.from(obfuscated2).slice(3);
      expect(buffersEqual(data1, data2)).toBe(false);
    });
  });

  describe('header structure', () => {
    it('should have 3-byte header', () => {
      const obfuscator = new Obfuscator(testKey, testLayer, testPadding, testFnInitor);
      const original = deterministicBuffer(100);

      const obfuscated = obfuscator.obfuscation(toArrayBuffer(original));

      // Header is first 3 bytes
      expect(obfuscated.length).toBeGreaterThanOrEqual(103); // 100 + 3 header + at least 1 padding
    });

    it('should store padding length in header[2]', () => {
      const obfuscator = new Obfuscator(testKey, testLayer, testPadding, testFnInitor);
      const original = deterministicBuffer(100);

      const obfuscated = obfuscator.obfuscation(toArrayBuffer(original));
      const paddingLength = obfuscated[2];

      expect(paddingLength).toBeGreaterThanOrEqual(1);
      expect(paddingLength).toBeLessThanOrEqual(testPadding);
    });
  });

  describe('randomness', () => {
    it('should produce different obfuscated output for same input (due to random header)', () => {
      const obfuscator = new Obfuscator(testKey, testLayer, testPadding, testFnInitor);
      const original = deterministicBuffer(100);

      const obfuscated1 = obfuscator.obfuscation(toArrayBuffer(original));
      const obfuscated2 = obfuscator.obfuscation(toArrayBuffer(original));

      // Headers should be different (random)
      const header1 = Buffer.from(obfuscated1).slice(0, 3);
      const header2 = Buffer.from(obfuscated2).slice(0, 3);

      // At least one byte should be different
      expect(buffersEqual(header1, header2)).toBe(false);
    });
  });
});
