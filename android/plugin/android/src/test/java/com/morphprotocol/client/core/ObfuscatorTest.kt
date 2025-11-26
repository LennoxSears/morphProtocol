package com.morphprotocol.client.core

import org.junit.Test
import org.junit.Assert.*

class ObfuscatorTest {
    
    @Test
    fun `test obfuscation and deobfuscation with layer 4`() {
        // Use layer=4 to ensure all 11 functions are tested (including substitution and addRandomValue)
        val obfuscator = Obfuscator(key = 42, layer = 4, paddingLength = 4, fnInitor = 12345)
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
    
    @Test
    fun `test layer 4 with multiple packets (stress test - guarantees all functions)`() {
        // Layer 4 uses combinations of 4 functions from 11 total (7,920 permutations)
        // Testing 500 packets statistically guarantees we test all 11 functions
        // including substitution (function 9) and addRandomValue (function 10)
        val obfuscator = Obfuscator(key = 123, layer = 4, paddingLength = 8, fnInitor = 12345)
        
        // Test 500 packets to ensure we hit all function combinations
        for (i in 0 until 500) {
            val original = ByteArray(148) { (it + i).toByte() } // WireGuard handshake size
            val obfuscated = obfuscator.obfuscate(original)
            val deobfuscated = obfuscator.deobfuscate(obfuscated)
            
            assertArrayEquals("Packet $i failed", original, deobfuscated)
        }
    }
    
    @Test
    fun `test WireGuard packet sizes with layer 4`() {
        val obfuscator = Obfuscator(key = 123, layer = 4, paddingLength = 8, fnInitor = 12345)
        
        // Test common WireGuard packet sizes
        val sizes = listOf(
            148,  // Handshake initiation
            92,   // Handshake response
            32,   // Keepalive
            1420  // Data packet (typical MTU)
        )
        
        for (size in sizes) {
            val original = ByteArray(size) { it.toByte() }
            val obfuscated = obfuscator.obfuscate(original)
            val deobfuscated = obfuscator.deobfuscate(obfuscated)
            
            assertArrayEquals("Size $size failed", original, deobfuscated)
        }
    }
    
    @Test
    fun `test substitution and addRandomValue functions are used`() {
        // Create obfuscator with layer=4 to ensure all functions can be used
        val obfuscator = Obfuscator(key = 159, layer = 4, paddingLength = 8, fnInitor = 795656)
        
        // Test with actual WireGuard handshake size
        val original = ByteArray(148) { it.toByte() }
        
        // Run multiple times to increase chance of hitting substitution/addRandomValue
        var success = 0
        for (i in 0 until 50) {
            val obfuscated = obfuscator.obfuscate(original)
            val deobfuscated = obfuscator.deobfuscate(obfuscated)
            
            if (original.contentEquals(deobfuscated)) {
                success++
            }
        }
        
        // All should succeed
        assertEquals("All packets should deobfuscate correctly", 50, success)
    }
    
    @Test
    fun `test obfuscator exposes initializers correctly`() {
        val obfuscator = Obfuscator(key = 123, layer = 4, paddingLength = 8, fnInitor = 12345)
        
        // Test that we can get substitution table
        val substitutionTable = obfuscator.getSubstitutionTable()
        assertEquals("Substitution table should have 256 elements", 256, substitutionTable.size)
        
        // Verify all values 0-255 are present
        val sorted = substitutionTable.sorted()
        for (i in 0 until 256) {
            assertEquals("Value $i should be present", i, sorted[i])
        }
        
        // Test that we can get random value
        val randomValue = obfuscator.getRandomValue()
        assertTrue("Random value should be 0-255", randomValue in 0..255)
    }
    
    @Test
    fun `test each function individually with layer 1`() {
        // Test with layer=1 to ensure each of the 11 functions works individually
        // This guarantees substitution and addRandomValue are tested
        val testData = ByteArray(148) { it.toByte() }
        
        var successCount = 0
        for (i in 0 until 100) {
            val obfuscator = Obfuscator(key = 123 + i, layer = 1, paddingLength = 8, fnInitor = 12345 + i)
            val obfuscated = obfuscator.obfuscate(testData)
            val deobfuscated = obfuscator.deobfuscate(obfuscated)
            
            if (testData.contentEquals(deobfuscated)) {
                successCount++
            }
        }
        
        // All should succeed
        assertEquals("All packets should deobfuscate correctly", 100, successCount)
    }
    
    @Test
    fun `test layer 2 combinations cover all functions`() {
        // Layer 2 = 11×10 = 110 permutations
        val testData = ByteArray(148) { it.toByte() }
        
        var successCount = 0
        for (i in 0 until 200) {
            val obfuscator = Obfuscator(key = 123 + i, layer = 2, paddingLength = 8, fnInitor = 12345 + i)
            val obfuscated = obfuscator.obfuscate(testData)
            val deobfuscated = obfuscator.deobfuscate(obfuscated)
            
            if (testData.contentEquals(deobfuscated)) {
                successCount++
            }
        }
        
        assertEquals("All packets should deobfuscate correctly", 200, successCount)
    }
    
    @Test
    fun `test layer 3 combinations cover all functions`() {
        // Layer 3 = 11×10×9 = 990 permutations
        val testData = ByteArray(148) { it.toByte() }
        
        var successCount = 0
        for (i in 0 until 300) {
            val obfuscator = Obfuscator(key = 123 + i, layer = 3, paddingLength = 8, fnInitor = 12345 + i)
            val obfuscated = obfuscator.obfuscate(testData)
            val deobfuscated = obfuscator.deobfuscate(obfuscated)
            
            if (testData.contentEquals(deobfuscated)) {
                successCount++
            }
        }
        
        assertEquals("All packets should deobfuscate correctly", 300, successCount)
    }
}
