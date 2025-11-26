package com.morphprotocol

import com.morphprotocol.client.core.FunctionInitializer
import com.morphprotocol.client.core.Obfuscator
import com.morphprotocol.client.core.templates.TemplateFactory
import org.junit.Test
import org.junit.Assert.*

class ObfuscationTest {
    
    @Test
    fun testObfuscationRoundTrip() {
        // Test data - simulating WireGuard handshake packet
        val originalData = ByteArray(148) { it.toByte() }
        
        // Create obfuscator with same parameters
        val key = 123
        val layer = 4  // Use layer=4 to test all 11 functions including substitution and addRandomValue
        val paddingLength = 8
        val fnInitor = 12345
        
        val obfuscator = Obfuscator(key, layer, paddingLength, fnInitor)
        
        // Obfuscate
        val obfuscated = obfuscator.obfuscate(originalData)
        println("Original size: ${originalData.size}")
        println("Obfuscated size: ${obfuscated.size}")
        println("Expected size: ${originalData.size + 3 + paddingLength}")
        
        // Verify size
        assertEquals(originalData.size + 3 + paddingLength, obfuscated.size)
        
        // Deobfuscate
        val deobfuscated = obfuscator.deobfuscate(obfuscated)
        println("Deobfuscated size: ${deobfuscated.size}")
        
        // Verify data integrity
        assertArrayEquals("Data should match after obfuscation/deobfuscation", originalData, deobfuscated)
        
        // Print hex comparison
        println("Original first 16 bytes: ${originalData.take(16).joinToString(" ") { "%02x".format(it) }}")
        println("Deobfuscated first 16 bytes: ${deobfuscated.take(16).joinToString(" ") { "%02x".format(it) }}")
    }
    
    @Test
    fun testTemplateEncapsulationRoundTrip() {
        // Test data
        val originalData = ByteArray(159) { it.toByte() } // Obfuscated data size
        val clientID = ByteArray(16) { it.toByte() }
        
        // Create KCP template (ID: 2)
        val template = TemplateFactory.createTemplate(2)
        
        // Encapsulate
        val encapsulated = template.encapsulate(originalData, clientID)
        println("Original size: ${originalData.size}")
        println("Encapsulated size: ${encapsulated.size}")
        
        // Verify size increased (template adds headers)
        assertTrue("Encapsulated should be larger", encapsulated.size > originalData.size)
        
        // Decapsulate
        val decapsulated = template.decapsulate(encapsulated)
        assertNotNull("Decapsulation should succeed", decapsulated)
        println("Decapsulated size: ${decapsulated!!.size}")
        
        // Verify data integrity
        assertArrayEquals("Data should match after encapsulation/decapsulation", originalData, decapsulated)
        
        // Print hex comparison
        println("Original first 16 bytes: ${originalData.take(16).joinToString(" ") { "%02x".format(it) }}")
        println("Decapsulated first 16 bytes: ${decapsulated.take(16).joinToString(" ") { "%02x".format(it) }}")
    }
    
    @Test
    fun testFullPipeline() {
        // Simulate full WireGuard packet processing
        val wgPacket = ByteArray(148) { it.toByte() }
        val clientID = ByteArray(16) { it.toByte() }
        
        println("\n=== FULL PIPELINE TEST ===")
        println("1. Original WireGuard packet: ${wgPacket.size} bytes")
        println("   First 16 bytes: ${wgPacket.take(16).joinToString(" ") { "%02x".format(it) }}")
        
        // Step 1: Obfuscate (use layer=4 to test all functions)
        val obfuscator = Obfuscator(123, 4, 8, 12345)
        val obfuscated = obfuscator.obfuscate(wgPacket)
        println("\n2. After obfuscation: ${obfuscated.size} bytes")
        
        // Step 2: Encapsulate with template
        val template = TemplateFactory.createTemplate(2) // KCP
        val encapsulated = template.encapsulate(obfuscated, clientID)
        println("\n3. After template encapsulation: ${encapsulated.size} bytes")
        
        // === SERVER SIDE ===
        println("\n=== SERVER SIDE PROCESSING ===")
        
        // Step 3: Decapsulate template
        val decapsulated = template.decapsulate(encapsulated)
        assertNotNull("Template decapsulation should succeed", decapsulated)
        println("4. After template decapsulation: ${decapsulated!!.size} bytes")
        
        // Step 4: Deobfuscate
        val deobfuscated = obfuscator.deobfuscate(decapsulated)
        println("5. After deobfuscation: ${deobfuscated.size} bytes")
        println("   First 16 bytes: ${deobfuscated.take(16).joinToString(" ") { "%02x".format(it) }}")
        
        // Verify final result matches original
        assertArrayEquals("Final data should match original WireGuard packet", wgPacket, deobfuscated)
        println("\n✅ FULL PIPELINE TEST PASSED - Data integrity maintained!")
    }
}
