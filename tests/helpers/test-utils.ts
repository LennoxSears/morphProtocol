/**
 * Test utilities and helper functions
 */

/**
 * Generate random buffer of specified length
 */
export function randomBuffer(length: number): Buffer {
  return Buffer.from(Array.from({ length }, () => Math.floor(Math.random() * 256)));
}

/**
 * Generate deterministic buffer for reproducible tests
 */
export function deterministicBuffer(length: number, seed: number = 0): Buffer {
  const buffer = Buffer.alloc(length);
  for (let i = 0; i < length; i++) {
    buffer[i] = (seed + i) % 256;
  }
  return buffer;
}

/**
 * Convert Buffer to ArrayBuffer (proper type)
 * Must slice the underlying ArrayBuffer to get only the relevant bytes
 */
export function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  // Buffer.buffer returns the entire underlying ArrayBuffer pool
  // We need to slice it to get only the bytes we want
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

/**
 * Compare two buffers and return if they're equal
 */
export function buffersEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return a.equals(b);
}

/**
 * Create a mock logger that doesn't output anything
 */
export function createMockLogger() {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

/**
 * Wait for a specified time (for async tests)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate test data of various sizes
 */
export const TEST_DATA = {
  empty: Buffer.alloc(0),
  small: deterministicBuffer(16),
  medium: deterministicBuffer(256),
  large: deterministicBuffer(1500), // MTU size
  jumbo: deterministicBuffer(9000),
};

/**
 * Common test patterns
 */
export const TEST_PATTERNS = {
  zeros: Buffer.alloc(256, 0),
  ones: Buffer.alloc(256, 0xFF),
  sequential: deterministicBuffer(256, 0),
  alternating: Buffer.from(Array.from({ length: 256 }, (_, i) => i % 2 === 0 ? 0xAA : 0x55)),
};

/**
 * Create deterministic function initializer for testing
 * Uses fixed values instead of random ones
 */
export function createDeterministicFnInitor() {
  // Create a deterministic substitution table (identity mapping for simplicity)
  const substitutionTable = Array.from({ length: 256 }, (_, i) => i);
  
  return {
    substitutionTable,
    randomValue: 42, // Fixed value for testing
  };
}

/**
 * Create random function initializer (like production)
 * Uses shuffled substitution table and random value
 */
export function createRandomFnInitor() {
  // Create substitution table with all values 0-255
  const substitutionTable = Array.from({ length: 256 }, (_, i) => i);
  
  // Fisher-Yates shuffle
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = substitutionTable[i];
    substitutionTable[i] = substitutionTable[j];
    substitutionTable[j] = temp;
  }
  
  return {
    substitutionTable,
    randomValue: Math.floor(Math.random() * 256),
  };
}
