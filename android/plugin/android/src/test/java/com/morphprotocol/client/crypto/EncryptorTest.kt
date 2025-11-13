package com.morphprotocol.client.crypto

import org.junit.Test
import org.junit.Assert.*

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
