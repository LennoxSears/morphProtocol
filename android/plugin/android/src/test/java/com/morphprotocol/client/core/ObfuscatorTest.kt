package com.morphprotocol.client.core

import org.junit.Test
import org.junit.Assert.*

class ObfuscatorTest {
    
    @Test
    fun `test obfuscation and deobfuscation`() {
        val obfuscator = Obfuscator(key = 42, layer = 3, paddingLength = 4, fnInitor = 12345)
        val original = "Hello, World!".toByteArray()
        
        val obfuscated = obfuscator.obfuscate(original)
        val deobfuscated = obfuscator.deobfuscate(obfuscated)
        
        assertArrayEquals(original, deobfuscated)
    }
    
    @Test
    fun `test obfuscated data has header and padding`() {
        val obfuscator = Obfuscator(key = 42, layer = 2, paddingLength = 5, fnInitor = 12345)
        val original = "Test".toByteArray()
        
        val obfuscated = obfuscator.obfuscate(original)
        
        // Should have 3-byte header + data + 5-byte padding
        assertEquals(3 + original.size + 5, obfuscated.size)
    }
    
    @Test
    fun `test different layers`() {
        val data = "Test data".toByteArray()
        
        for (layer in 1..4) {
            val obfuscator = Obfuscator(key = 42, layer = layer, paddingLength = 4, fnInitor = 12345)
            val obfuscated = obfuscator.obfuscate(data)
            val deobfuscated = obfuscator.deobfuscate(obfuscated)
            
            assertArrayEquals(data, deobfuscated)
        }
    }
    
    @Test
    fun `test empty data`() {
        val obfuscator = Obfuscator(key = 42, layer = 2, paddingLength = 4, fnInitor = 12345)
        val original = ByteArray(0)
        
        val obfuscated = obfuscator.obfuscate(original)
        
        assertEquals(0, obfuscated.size)
    }
    
    @Test
    fun `test large data`() {
        val obfuscator = Obfuscator(key = 42, layer = 3, paddingLength = 8, fnInitor = 12345)
        val original = ByteArray(1500) { it.toByte() }
        
        val obfuscated = obfuscator.obfuscate(original)
        val deobfuscated = obfuscator.deobfuscate(obfuscated)
        
        assertArrayEquals(original, deobfuscated)
    }
    
    @Test
    fun `test header contains padding length`() {
        val paddingLength = 6
        val obfuscator = Obfuscator(key = 42, layer = 2, paddingLength = paddingLength, fnInitor = 12345)
        val original = "Test".toByteArray()
        
        val obfuscated = obfuscator.obfuscate(original)
        
        // Header[2] should contain padding length
        assertEquals(paddingLength.toByte(), obfuscated[2])
    }
}
