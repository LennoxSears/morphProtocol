package com.morphprotocol.client.test

import android.util.Log
import com.morphprotocol.client.core.Obfuscator
import com.morphprotocol.client.core.templates.TemplateFactory

/**
 * Runtime test for obfuscation and template encapsulation.
 * Call this from your app to verify the pipeline works correctly.
 */
object ObfuscationDebugTest {
    private const val TAG = "ObfuscationTest"
    
    fun runTests(): String {
        val results = StringBuilder()
        
        results.appendLine("=== OBFUSCATION & TEMPLATE TESTS ===\n")
        
        // Test 1: Obfuscation round-trip
        results.appendLine(testObfuscationRoundTrip())
        
        // Test 2: Template round-trip
        results.appendLine(testTemplateRoundTrip())
        
        // Test 3: Full pipeline
        results.appendLine(testFullPipeline())
        
        return results.toString()
    }
    
    private fun testObfuscationRoundTrip(): String {
        val result = StringBuilder()
        result.appendLine("TEST 1: Obfuscation Round-Trip")
        result.appendLine("================================")
        
        try {
            // Create test data (simulating WireGuard handshake)
            val original = ByteArray(148) { it.toByte() }
            result.appendLine("Original: ${original.size} bytes")
            result.appendLine("First 16: ${original.take(16).joinToString(" ") { "%02x".format(it) }}")
            
            // Create obfuscator
            val obfuscator = Obfuscator(123, 3, 8, 12345)
            
            // Obfuscate
            val obfuscated = obfuscator.obfuscate(original)
            result.appendLine("\nObfuscated: ${obfuscated.size} bytes (expected: ${148 + 3 + 8})")
            
            if (obfuscated.size != 148 + 3 + 8) {
                result.appendLine("❌ FAILED: Wrong obfuscated size!")
                return result.toString()
            }
            
            // Deobfuscate
            val deobfuscated = obfuscator.deobfuscate(obfuscated)
            result.appendLine("Deobfuscated: ${deobfuscated.size} bytes")
            result.appendLine("First 16: ${deobfuscated.take(16).joinToString(" ") { "%02x".format(it) }}")
            
            // Verify
            if (original.contentEquals(deobfuscated)) {
                result.appendLine("\n✅ PASSED: Data matches after round-trip!")
            } else {
                result.appendLine("\n❌ FAILED: Data mismatch!")
                result.appendLine("Expected: ${original.take(16).joinToString(" ") { "%02x".format(it) }}")
                result.appendLine("Got:      ${deobfuscated.take(16).joinToString(" ") { "%02x".format(it) }}")
            }
            
        } catch (e: Exception) {
            result.appendLine("\n❌ EXCEPTION: ${e.message}")
            e.printStackTrace()
        }
        
        return result.toString()
    }
    
    private fun testTemplateRoundTrip(): String {
        val result = StringBuilder()
        result.appendLine("\nTEST 2: Template Round-Trip")
        result.appendLine("============================")
        
        try {
            // Create test data (simulating obfuscated data)
            val original = ByteArray(159) { it.toByte() }
            val clientID = ByteArray(16) { it.toByte() }
            
            result.appendLine("Original: ${original.size} bytes")
            result.appendLine("First 16: ${original.take(16).joinToString(" ") { "%02x".format(it) }}")
            
            // Create KCP template (ID: 2)
            val template = TemplateFactory.createTemplate(2)
            result.appendLine("Template: KCP (ID: 2)")
            
            // Encapsulate
            val encapsulated = template.encapsulate(original, clientID)
            result.appendLine("\nEncapsulated: ${encapsulated.size} bytes")
            
            // Decapsulate
            val decapsulated = template.decapsulate(encapsulated)
            
            if (decapsulated == null) {
                result.appendLine("❌ FAILED: Decapsulation returned null!")
                return result.toString()
            }
            
            result.appendLine("Decapsulated: ${decapsulated.size} bytes")
            result.appendLine("First 16: ${decapsulated.take(16).joinToString(" ") { "%02x".format(it) }}")
            
            // Verify
            if (original.contentEquals(decapsulated)) {
                result.appendLine("\n✅ PASSED: Data matches after round-trip!")
            } else {
                result.appendLine("\n❌ FAILED: Data mismatch!")
            }
            
        } catch (e: Exception) {
            result.appendLine("\n❌ EXCEPTION: ${e.message}")
            e.printStackTrace()
        }
        
        return result.toString()
    }
    
    private fun testFullPipeline(): String {
        val result = StringBuilder()
        result.appendLine("\nTEST 3: Full Pipeline (WG → Server → WG)")
        result.appendLine("==========================================")
        
        try {
            // Simulate WireGuard handshake packet
            val wgPacket = ByteArray(148) { it.toByte() }
            val clientID = ByteArray(16) { it.toByte() }
            
            result.appendLine("1. Original WireGuard packet: ${wgPacket.size} bytes")
            result.appendLine("   First 16: ${wgPacket.take(16).joinToString(" ") { "%02x".format(it) }}")
            
            // CLIENT SIDE: Obfuscate
            val obfuscator = Obfuscator(123, 3, 8, 12345)
            val obfuscated = obfuscator.obfuscate(wgPacket)
            result.appendLine("\n2. After obfuscation: ${obfuscated.size} bytes")
            
            // CLIENT SIDE: Encapsulate
            val template = TemplateFactory.createTemplate(2)
            val encapsulated = template.encapsulate(obfuscated, clientID)
            result.appendLine("3. After template: ${encapsulated.size} bytes")
            result.appendLine("   (This is what gets sent to server)")
            
            // SERVER SIDE: Decapsulate
            val decapsulated = template.decapsulate(encapsulated)
            if (decapsulated == null) {
                result.appendLine("\n❌ FAILED: Template decapsulation failed!")
                return result.toString()
            }
            result.appendLine("\n4. After template decapsulation: ${decapsulated.size} bytes")
            
            // SERVER SIDE: Deobfuscate
            val deobfuscated = obfuscator.deobfuscate(decapsulated)
            result.appendLine("5. After deobfuscation: ${deobfuscated.size} bytes")
            result.appendLine("   First 16: ${deobfuscated.take(16).joinToString(" ") { "%02x".format(it) }}")
            result.appendLine("   (This is what gets sent to WireGuard)")
            
            // Verify
            if (wgPacket.contentEquals(deobfuscated)) {
                result.appendLine("\n✅ PASSED: Full pipeline maintains data integrity!")
            } else {
                result.appendLine("\n❌ FAILED: Data corrupted in pipeline!")
                result.appendLine("Expected: ${wgPacket.take(16).joinToString(" ") { "%02x".format(it) }}")
                result.appendLine("Got:      ${deobfuscated.take(16).joinToString(" ") { "%02x".format(it) }}")
            }
            
        } catch (e: Exception) {
            result.appendLine("\n❌ EXCEPTION: ${e.message}")
            e.printStackTrace()
        }
        
        return result.toString()
    }
}
