package com.morphprotocol.client.crypto

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*

class EncryptorTest {
    
    @Test
    fun `test encryption and decryption`() {
        val encryptor = Encryptor("testpassword")
        val plaintext = "Hello, MorphProtocol!"
        
        val ciphertext = encryptor.simpleEncrypt(plaintext)
        val decrypted = encryptor.simpleDecrypt(ciphertext)
        
        assertEquals(plaintext, decrypted)
    }
    
    @Test
    fun `test setSimple with valid key`() {
        val encryptor = Encryptor()
        val keyString = encryptor.getSimple()
        
        // Create new encryptor with same key
        val encryptor2 = Encryptor()
        encryptor2.setSimple(keyString)
        
        val plaintext = "Test message"
        val ciphertext = encryptor.simpleEncrypt(plaintext)
        val decrypted = encryptor2.simpleDecrypt(ciphertext)
        
        assertEquals(plaintext, decrypted)
    }
    
    @Test
    fun `test encryption produces different output for same input`() {
        val encryptor = Encryptor()
        val plaintext = "Same message"
        
        val ciphertext1 = encryptor.simpleEncrypt(plaintext)
        val ciphertext2 = encryptor.simpleEncrypt(plaintext)
        
        // Should be same because IV is fixed per instance
        assertEquals(ciphertext1, ciphertext2)
    }
    
    @Test
    fun `test empty string encryption`() {
        val encryptor = Encryptor()
        val plaintext = ""
        
        val ciphertext = encryptor.simpleEncrypt(plaintext)
        val decrypted = encryptor.simpleDecrypt(ciphertext)
        
        assertEquals(plaintext, decrypted)
    }
    
    @Test
    fun `test long text encryption`() {
        val encryptor = Encryptor()
        val plaintext = "A".repeat(1000)
        
        val ciphertext = encryptor.simpleEncrypt(plaintext)
        val decrypted = encryptor.simpleDecrypt(ciphertext)
        
        assertEquals(plaintext, decrypted)
    }
    
    @Test
    fun `test unicode encryption`() {
        val encryptor = Encryptor()
        val plaintext = "Hello 世界 🌍"
        
        val ciphertext = encryptor.simpleEncrypt(plaintext)
        val decrypted = encryptor.simpleDecrypt(ciphertext)
        
        assertEquals(plaintext, decrypted)
    }
}
