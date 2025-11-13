package com.morphprotocol.client.crypto

import org.bouncycastle.crypto.generators.SCrypt
import java.security.SecureRandom
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.spec.IvParameterSpec
import javax.crypto.spec.SecretKeySpec

/**
 * Encryptor handles AES-256-CBC encryption/decryption for the MorphProtocol client.
 * Compatible with the TypeScript server implementation.
 */
class Encryptor(private val password: String = "bumoyu123") {
    private var simpleKey: ByteArray
    private var simpleIv: ByteArray
    
    companion object {
        private const val ALGORITHM = "AES/CBC/PKCS5Padding"
        private const val KEY_SIZE = 32 // 256 bits
        private const val IV_SIZE = 16  // 128 bits
        
        // Scrypt parameters (matching Node.js defaults)
        private const val SCRYPT_N = 16384
        private const val SCRYPT_R = 8
        private const val SCRYPT_P = 1
    }
    
    init {
        // Generate key and IV from password using scrypt
        val salt = ByteArray(16)
        SecureRandom().nextBytes(salt)
        
        val keyMaterial = SCrypt.generate(
            password.toByteArray(Charsets.UTF_8),
            salt,
            SCRYPT_N,
            SCRYPT_R,
            SCRYPT_P,
            KEY_SIZE + IV_SIZE
        )
        
        simpleKey = keyMaterial.copyOfRange(0, KEY_SIZE)
        simpleIv = keyMaterial.copyOfRange(KEY_SIZE, KEY_SIZE + IV_SIZE)
    }
    
    /**
     * Set encryption key and IV from base64 string.
     * Format: "base64key:base64iv"
     */
    fun setSimple(keyString: String) {
        val parts = keyString.split(":")
        if (parts.size != 2) {
            throw IllegalArgumentException("Invalid key format. Expected 'base64key:base64iv'")
        }
        
        simpleKey = Base64.getDecoder().decode(parts[0])
        simpleIv = Base64.getDecoder().decode(parts[1])
        
        if (simpleKey.size != KEY_SIZE) {
            throw IllegalArgumentException("Key must be $KEY_SIZE bytes")
        }
        if (simpleIv.size != IV_SIZE) {
            throw IllegalArgumentException("IV must be $IV_SIZE bytes")
        }
    }
    
    /**
     * Get current key and IV as base64 string.
     * Format: "base64key:base64iv"
     */
    fun getSimple(): String {
        val keyBase64 = Base64.getEncoder().encodeToString(simpleKey)
        val ivBase64 = Base64.getEncoder().encodeToString(simpleIv)
        return "$keyBase64:$ivBase64"
    }
    
    /**
     * Encrypt plaintext using AES-256-CBC.
     * Returns base64-encoded ciphertext.
     */
    fun simpleEncrypt(plaintext: String): String {
        val cipher = Cipher.getInstance(ALGORITHM)
        val keySpec = SecretKeySpec(simpleKey, "AES")
        val ivSpec = IvParameterSpec(simpleIv)
        
        cipher.init(Cipher.ENCRYPT_MODE, keySpec, ivSpec)
        val ciphertext = cipher.doFinal(plaintext.toByteArray(Charsets.UTF_8))
        
        return Base64.getEncoder().encodeToString(ciphertext)
    }
    
    /**
     * Decrypt base64-encoded ciphertext using AES-256-CBC.
     * Returns plaintext string.
     */
    fun simpleDecrypt(ciphertext: String): String {
        val cipher = Cipher.getInstance(ALGORITHM)
        val keySpec = SecretKeySpec(simpleKey, "AES")
        val ivSpec = IvParameterSpec(simpleIv)
        
        cipher.init(Cipher.DECRYPT_MODE, keySpec, ivSpec)
        val ciphertextBytes = Base64.getDecoder().decode(ciphertext)
        val plaintext = cipher.doFinal(ciphertextBytes)
        
        return String(plaintext, Charsets.UTF_8)
    }
}
