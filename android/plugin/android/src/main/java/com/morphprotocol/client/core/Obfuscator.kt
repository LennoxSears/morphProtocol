package com.morphprotocol.client.core

import java.security.SecureRandom

/**
 * Obfuscator applies multi-layer obfuscation to data packets.
 * Compatible with TypeScript server implementation.
 * 
 * Packet format:
 * [3-byte header][obfuscated data][1-8 bytes random padding]
 * 
 * Header format:
 * - header[0]: random byte (0-255)
 * - header[1]: random byte (0-255)
 * - header[2]: padding length (1-8)
 * 
 * Function combo = (header[0] * header[1]) % totalCombinations
 */
class Obfuscator(
    private val key: Int,
    private val layer: Int,
    private val paddingLength: Int,
    private val fnInitor: Int
) {
    private val random = SecureRandom()
    private val keyArray: ByteArray
    private val initializers: List<Any?>
    private val totalCombinations: Int
    
    init {
        if (layer < 1 || layer > 4) {
            throw IllegalArgumentException("Layer must be between 1 and 4")
        }
        if (paddingLength < 1 || paddingLength > 8) {
            throw IllegalArgumentException("Padding length must be between 1 and 8")
        }
        
        // Generate 256-byte key array from single key value
        // Must match TypeScript implementation: (key + i * 37) % 256
        keyArray = ByteArray(256) { ((key + it * 37) % 256).toByte() }
        
        // Generate function initializers (deterministic based on fnInitor)
        // In production, this should use fnInitor as seed for reproducibility
        // For now, we generate fresh initializers
        initializers = FunctionInitializer.generateInitializers()
        
        totalCombinations = FunctionRegistry.calculateTotalCombinations(layer)
    }
    
    /**
     * Get the substitution table for sending in handshake.
     * Returns the 256-byte substitution table as a list of integers (0-255).
     */
    fun getSubstitutionTable(): List<Int> {
        val table = initializers[9] as? ByteArray ?: return emptyList()
        return table.map { it.toInt() and 0xFF }
    }
    
    /**
     * Get the random value for sending in handshake.
     * Returns the random value (0-255) used by addRandomValue function.
     */
    fun getRandomValue(): Int {
        return initializers[10] as? Int ?: 0
    }
    
    /**
     * Obfuscate data with multi-layer transformations.
     * Returns: [3-byte header][obfuscated data][padding]
     */
    fun obfuscate(input: ByteArray): ByteArray {
        if (input.isEmpty()) {
            return input
        }
        
        // Generate random header
        val header = ByteArray(3)
        header[0] = random.nextInt(256).toByte()
        header[1] = random.nextInt(256).toByte()
        // Generate random padding length between 1 and paddingLength (matching TypeScript)
        val actualPaddingLength = random.nextInt(paddingLength) + 1
        header[2] = actualPaddingLength.toByte()
        
        // Calculate function combo from header
        val comboIndex = ((header[0].toInt() and 0xFF) * (header[1].toInt() and 0xFF)) % totalCombinations
        val functionIndices = FunctionRegistry.getFunctionIndices(comboIndex, layer)
        
        // Apply obfuscation layers
        var data = input
        for (funcIndex in functionIndices) {
            val function = FunctionRegistry.getFunction(funcIndex)
            val initor = initializers[funcIndex]
            data = function.obfuscate(data, keyArray, initor)
        }
        
        // Add random padding
        val padding = ByteArray(actualPaddingLength)
        random.nextBytes(padding)
        
        // Combine: header + obfuscated data + padding
        val result = ByteArray(3 + data.size + actualPaddingLength)
        System.arraycopy(header, 0, result, 0, 3)
        System.arraycopy(data, 0, result, 3, data.size)
        System.arraycopy(padding, 0, result, 3 + data.size, actualPaddingLength)
        
        return result
    }
    
    /**
     * Deobfuscate data by reversing the transformations.
     * Input: [3-byte header][obfuscated data][padding]
     * Returns: original data
     */
    fun deobfuscate(input: ByteArray): ByteArray {
        if (input.size < 4) { // At least 3-byte header + 1 byte data
            throw IllegalArgumentException("Input too short for deobfuscation")
        }
        
        // Extract header
        val header = input.copyOfRange(0, 3)
        val paddingLen = header[2].toInt() and 0xFF
        
        if (paddingLen < 1 || paddingLen > 8) {
            throw IllegalArgumentException("Invalid padding length: $paddingLen")
        }
        
        // Extract obfuscated data (remove header and padding)
        if (input.size < 3 + paddingLen) {
            throw IllegalArgumentException("Input too short for padding length $paddingLen")
        }
        
        val dataLength = input.size - 3 - paddingLen
        val obfuscatedData = input.copyOfRange(3, 3 + dataLength)
        
        // Calculate function combo from header
        val comboIndex = ((header[0].toInt() and 0xFF) * (header[1].toInt() and 0xFF)) % totalCombinations
        val functionIndices = FunctionRegistry.getFunctionIndices(comboIndex, layer)
        
        // Apply deobfuscation layers in reverse order
        var data = obfuscatedData
        for (i in functionIndices.size - 1 downTo 0) {
            val funcIndex = functionIndices[i]
            val function = FunctionRegistry.getFunction(funcIndex)
            val initor = initializers[funcIndex]
            data = function.deobfuscate(data, keyArray, initor)
        }
        
        return data
    }
    
    /**
     * Update the obfuscator with new key.
     */
    fun setKey(newKey: Int) {
        for (i in keyArray.indices) {
            keyArray[i] = ((newKey + i) % 256).toByte()
        }
    }
}
