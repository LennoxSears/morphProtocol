import { Encryptor } from '../../../src/crypto/encryptor';

describe('Encryptor', () => {
  const testPassword = 'test-password-123';

  describe('constructor', () => {
    it('should create an encryptor instance', () => {
      const encryptor = new Encryptor(testPassword);
      expect(encryptor).toBeInstanceOf(Encryptor);
    });

    it('should generate simpleKey and simpleVi', () => {
      const encryptor = new Encryptor(testPassword);
      expect(encryptor.simpleKey).toBeInstanceOf(Buffer);
      expect(encryptor.simpleVi).toBeInstanceOf(Buffer);
      expect(encryptor.simpleKey.length).toBe(32); // AES-256 key
      expect(encryptor.simpleVi.length).toBe(16);  // AES IV
    });
  });

  describe('simpleEncrypt and simpleDecrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      const encryptor = new Encryptor(testPassword);
      const original = 'Hello, World!';

      const encrypted = encryptor.simpleEncrypt(original);
      const decrypted = encryptor.simpleDecrypt(encrypted);

      expect(decrypted).toBe(original);
    });

    it('should handle empty string', () => {
      const encryptor = new Encryptor(testPassword);
      const original = '';

      const encrypted = encryptor.simpleEncrypt(original);
      const decrypted = encryptor.simpleDecrypt(encrypted);

      expect(decrypted).toBe(original);
    });

    it('should handle long text', () => {
      const encryptor = new Encryptor(testPassword);
      const original = 'A'.repeat(10000);

      const encrypted = encryptor.simpleEncrypt(original);
      const decrypted = encryptor.simpleDecrypt(encrypted);

      expect(decrypted).toBe(original);
    });

    it('should handle special characters', () => {
      const encryptor = new Encryptor(testPassword);
      const original = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`';

      const encrypted = encryptor.simpleEncrypt(original);
      const decrypted = encryptor.simpleDecrypt(encrypted);

      expect(decrypted).toBe(original);
    });

    it('should handle unicode characters', () => {
      const encryptor = new Encryptor(testPassword);
      const original = '你好世界 🌍 مرحبا';

      const encrypted = encryptor.simpleEncrypt(original);
      const decrypted = encryptor.simpleDecrypt(encrypted);

      expect(decrypted).toBe(original);
    });

    it('should handle JSON strings', () => {
      const encryptor = new Encryptor(testPassword);
      const obj = { port: 12345, clientID: 'abc123', status: 'connected' };
      const original = JSON.stringify(obj);

      const encrypted = encryptor.simpleEncrypt(original);
      const decrypted = encryptor.simpleDecrypt(encrypted);

      expect(decrypted).toBe(original);
      expect(JSON.parse(decrypted)).toEqual(obj);
    });

    it('should produce same ciphertext for same plaintext (fixed IV per instance)', () => {
      const encryptor = new Encryptor(testPassword);
      const original = 'test message';

      const encrypted1 = encryptor.simpleEncrypt(original);
      const encrypted2 = encryptor.simpleEncrypt(original);

      // Ciphertexts should be the same (fixed IV per encryptor instance)
      expect(encrypted1).toBe(encrypted2);

      // Both should decrypt to the same plaintext
      expect(encryptor.simpleDecrypt(encrypted1)).toBe(original);
      expect(encryptor.simpleDecrypt(encrypted2)).toBe(original);
    });

    it('should produce different ciphertext with different encryptor instances', () => {
      const encryptor1 = new Encryptor(testPassword);
      const encryptor2 = new Encryptor(testPassword);
      const original = 'test message';

      const encrypted1 = encryptor1.simpleEncrypt(original);
      const encrypted2 = encryptor2.simpleEncrypt(original);

      // Different instances have different IVs, so ciphertexts differ
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt correctly with their own instance
      expect(encryptor1.simpleDecrypt(encrypted1)).toBe(original);
      expect(encryptor2.simpleDecrypt(encrypted2)).toBe(original);
    });
  });

  describe('setSimple', () => {
    it('should set key and IV from base64 string', () => {
      const encryptor = new Encryptor(testPassword);
      const key = Buffer.alloc(32, 0xAA);
      const iv = Buffer.alloc(16, 0xBB);
      const keyIvString = `${key.toString('base64')}:${iv.toString('base64')}`;

      encryptor.setSimple(keyIvString);

      expect(encryptor.simpleKey.equals(key)).toBe(true);
      expect(encryptor.simpleVi.equals(iv)).toBe(true);
    });

    it('should allow encryption/decryption with custom key/IV', () => {
      const encryptor1 = new Encryptor(testPassword);
      const encryptor2 = new Encryptor('different-password');

      const keyIvString = `${encryptor1.simpleKey.toString('base64')}:${encryptor1.simpleVi.toString('base64')}`;
      encryptor2.setSimple(keyIvString);

      const original = 'test message';
      const encrypted = encryptor1.simpleEncrypt(original);
      const decrypted = encryptor2.simpleDecrypt(encrypted);

      expect(decrypted).toBe(original);
    });
  });

  describe('different passwords produce different keys', () => {
    it('should generate different keys for different passwords', () => {
      const encryptor1 = new Encryptor('password1');
      const encryptor2 = new Encryptor('password2');

      expect(encryptor1.simpleKey.equals(encryptor2.simpleKey)).toBe(false);
      expect(encryptor1.simpleVi.equals(encryptor2.simpleVi)).toBe(false);
    });

    it('should not decrypt with wrong password', () => {
      const encryptor1 = new Encryptor('correct-password');
      const encryptor2 = new Encryptor('wrong-password');
      const original = 'secret message';

      const encrypted = encryptor1.simpleEncrypt(original);

      expect(() => {
        encryptor2.simpleDecrypt(encrypted);
      }).toThrow();
    });
  });

  describe('encryption properties', () => {
    it('should produce ciphertext longer than plaintext', () => {
      const encryptor = new Encryptor(testPassword);
      const original = 'short';

      const encrypted = encryptor.simpleEncrypt(original);

      // Ciphertext includes IV and padding
      expect(encrypted.length).toBeGreaterThan(original.length);
    });

    it('should produce base64-encoded ciphertext', () => {
      const encryptor = new Encryptor(testPassword);
      const original = 'test';

      const encrypted = encryptor.simpleEncrypt(original);

      // Should be valid base64
      expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should throw error when decrypting invalid data', () => {
      const encryptor = new Encryptor(testPassword);

      expect(() => {
        encryptor.simpleDecrypt('invalid-base64-!@#$');
      }).toThrow();
    });

    it('should throw error when decrypting corrupted data', () => {
      const encryptor = new Encryptor(testPassword);
      const original = 'test message';
      const encrypted = encryptor.simpleEncrypt(original);

      // Corrupt the encrypted data
      const corrupted = encrypted.slice(0, -5) + 'XXXXX';

      expect(() => {
        encryptor.simpleDecrypt(corrupted);
      }).toThrow();
    });
  });
});
