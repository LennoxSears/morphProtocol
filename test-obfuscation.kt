import java.security.SecureRandom

// Minimal test to verify obfuscation logic
fun main() {
    println("=== OBFUSCATION TEST ===\n")
    
    // Test 1: Simple round-trip
    val original = ByteArray(148) { it.toByte() }
    println("Original data (first 16 bytes): ${original.take(16).joinToString(" ") { "%02x".format(it) }}")
    
    // Simulate obfuscation (add header + padding)
    val header = byteArrayOf(0x12, 0x34, 0x08) // random, random, padding length
    val padding = ByteArray(8) { 0xFF.toByte() }
    
    val obfuscated = header + original + padding
    println("Obfuscated size: ${obfuscated.size} (expected: ${148 + 3 + 8})")
    
    // Simulate deobfuscation (remove header + padding)
    val paddingLen = obfuscated[2].toInt() and 0xFF
    val dataLen = obfuscated.size - 3 - paddingLen
    val deobfuscated = obfuscated.copyOfRange(3, 3 + dataLen)
    
    println("Deobfuscated size: ${deobfuscated.size}")
    println("Deobfuscated data (first 16 bytes): ${deobfuscated.take(16).joinToString(" ") { "%02x".format(it) }}")
    
    // Verify
    val matches = original.contentEquals(deobfuscated)
    println("\n✅ Round-trip test: ${if (matches) "PASSED" else "FAILED"}")
    
    if (!matches) {
        println("ERROR: Data mismatch!")
        println("Expected: ${original.take(16).joinToString(" ") { "%02x".format(it) }}")
        println("Got:      ${deobfuscated.take(16).joinToString(" ") { "%02x".format(it) }}")
    }
}

main()
