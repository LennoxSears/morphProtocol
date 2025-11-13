package com.morphprotocol.client.core

import java.security.SecureRandom

/**
 * FunctionInitializer generates random parameters for obfuscation functions.
 * Compatible with TypeScript server implementation.
 */
object FunctionInitializer {
    private val random = SecureRandom()
    
    /**
     * Generate function initializer parameters.
     * Returns a list of 11 initializers (one per function).
     * 
     * Functions 0-8: null (no initialization needed)
     * Function 9 (Substitution): 256-byte substitution table
     * Function 10 (AddRandomValue): random byte value (0-255)
     */
    fun generateInitializers(): List<Any?> {
        val initializers = mutableListOf<Any?>()
        
        // Functions 0-8: no initialization
        repeat(9) {
            initializers.add(null)
        }
        
        // Function 9: Substitution table (256 bytes, all values 0-255 shuffled)
        val substitutionTable = ByteArray(256) { it.toByte() }
        // Fisher-Yates shuffle
        for (i in 255 downTo 1) {
            val j = random.nextInt(i + 1)
            val temp = substitutionTable[i]
            substitutionTable[i] = substitutionTable[j]
            substitutionTable[j] = temp
        }
        initializers.add(substitutionTable)
        
        // Function 10: Random value (0-255)
        initializers.add(random.nextInt(256))
        
        return initializers
    }
    
    /**
     * Generate a random function initializer ID.
     * This is used to identify which set of initializers to use.
     * Returns a value between 0 and 999999.
     */
    fun generateInitializerId(): Int {
        return random.nextInt(1000000)
    }
}
