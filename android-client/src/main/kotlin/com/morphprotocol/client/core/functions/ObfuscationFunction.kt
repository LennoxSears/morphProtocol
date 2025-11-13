package com.morphprotocol.client.core.functions

/**
 * Base interface for all obfuscation functions.
 * Each function must be reversible (obfuscation + deobfuscation = identity).
 */
interface ObfuscationFunction {
    /**
     * Obfuscate the input data.
     */
    fun obfuscate(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray
    
    /**
     * Deobfuscate the input data (reverse the obfuscation).
     */
    fun deobfuscate(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray
}

/**
 * 1. Bitwise Rotation and XOR
 * Rotates bits left by 3 positions and XORs with key.
 */
class BitwiseRotationAndXOR : ObfuscationFunction {
    override fun obfuscate(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray {
        val output = ByteArray(input.size)
        for (i in input.indices) {
            val rotated = ((input[i].toInt() and 0xFF) shl 3) or ((input[i].toInt() and 0xFF) ushr 5)
            output[i] = ((rotated and 0xFF) xor (keyArray[i % keyArray.size].toInt() and 0xFF)).toByte()
        }
        return output
    }
    
    override fun deobfuscate(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray {
        val output = ByteArray(input.size)
        for (i in input.indices) {
            val xored = (input[i].toInt() and 0xFF) xor (keyArray[i % keyArray.size].toInt() and 0xFF)
            output[i] = (((xored and 0xFF) ushr 3) or ((xored and 0xFF) shl 5)).toByte()
        }
        return output
    }
}

/**
 * 2. Swap Neighboring Bytes
 * Swaps adjacent bytes (0↔1, 2↔3, etc.).
 */
class SwapNeighboringBytes : ObfuscationFunction {
    override fun obfuscate(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray {
        val output = input.copyOf()
        for (i in 0 until output.size - 1 step 2) {
            val temp = output[i]
            output[i] = output[i + 1]
            output[i + 1] = temp
        }
        return output
    }
    
    override fun deobfuscate(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray {
        // Self-reversible: swap twice = identity
        return obfuscate(input, keyArray, initor)
    }
}

/**
 * 3. Reverse Buffer
 * Reverses the entire byte array.
 */
class ReverseBuffer : ObfuscationFunction {
    override fun obfuscate(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray {
        return input.reversedArray()
    }
    
    override fun deobfuscate(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray {
        // Self-reversible: reverse twice = identity
        return input.reversedArray()
    }
}

/**
 * 4. Divide and Swap
 * Divides buffer in half and swaps the halves.
 */
class DivideAndSwap : ObfuscationFunction {
    override fun obfuscate(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray {
        if (input.isEmpty()) return input
        
        val mid = input.size / 2
        val output = ByteArray(input.size)
        
        // Copy second half to first
        System.arraycopy(input, mid, output, 0, input.size - mid)
        // Copy first half to second
        System.arraycopy(input, 0, output, input.size - mid, mid)
        
        return output
    }
    
    override fun deobfuscate(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray {
        // Self-reversible: swap twice = identity
        return obfuscate(input, keyArray, initor)
    }
}

/**
 * 5. Circular Shift Obfuscation
 * Rotates each byte left by 1 bit.
 */
class CircularShiftObfuscation : ObfuscationFunction {
    override fun obfuscate(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray {
        val output = ByteArray(input.size)
        for (i in input.indices) {
            output[i] = (((input[i].toInt() and 0xFF) shl 1) or ((input[i].toInt() and 0xFF) ushr 7)).toByte()
        }
        return output
    }
    
    override fun deobfuscate(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray {
        val output = ByteArray(input.size)
        for (i in input.indices) {
            output[i] = (((input[i].toInt() and 0xFF) ushr 1) or ((input[i].toInt() and 0xFF) shl 7)).toByte()
        }
        return output
    }
}

/**
 * 6. XOR with Key
 * XORs each byte with corresponding key byte.
 */
class XorWithKey : ObfuscationFunction {
    override fun obfuscate(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray {
        val output = ByteArray(input.size)
        for (i in input.indices) {
            output[i] = (input[i].toInt() xor keyArray[i % keyArray.size].toInt()).toByte()
        }
        return output
    }
    
    override fun deobfuscate(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray {
        // Self-reversible: XOR twice = identity
        return obfuscate(input, keyArray, initor)
    }
}

/**
 * 7. Bitwise NOT
 * Inverts all bits.
 */
class BitwiseNOT : ObfuscationFunction {
    override fun obfuscate(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray {
        val output = ByteArray(input.size)
        for (i in input.indices) {
            output[i] = input[i].inv()
        }
        return output
    }
    
    override fun deobfuscate(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray {
        // Self-reversible: NOT twice = identity
        return obfuscate(input, keyArray, initor)
    }
}

/**
 * 8. Reverse Bits
 * Reverses the bits within each byte.
 */
class ReverseBits : ObfuscationFunction {
    private fun reverseByte(b: Byte): Byte {
        var value = b.toInt() and 0xFF
        var result = 0
        for (i in 0 until 8) {
            result = (result shl 1) or (value and 1)
            value = value ushr 1
        }
        return result.toByte()
    }
    
    override fun obfuscate(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray {
        val output = ByteArray(input.size)
        for (i in input.indices) {
            output[i] = reverseByte(input[i])
        }
        return output
    }
    
    override fun deobfuscate(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray {
        // Self-reversible: reverse twice = identity
        return obfuscate(input, keyArray, initor)
    }
}

/**
 * 9. Shift Bits
 * Shifts bits left by 2 positions with wraparound.
 */
class ShiftBits : ObfuscationFunction {
    override fun obfuscate(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray {
        val output = ByteArray(input.size)
        for (i in input.indices) {
            output[i] = (((input[i].toInt() and 0xFF) shl 2) or ((input[i].toInt() and 0xFF) ushr 6)).toByte()
        }
        return output
    }
    
    override fun deobfuscate(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray {
        val output = ByteArray(input.size)
        for (i in input.indices) {
            output[i] = (((input[i].toInt() and 0xFF) ushr 2) or ((input[i].toInt() and 0xFF) shl 6)).toByte()
        }
        return output
    }
}

/**
 * 10. Substitution
 * Substitutes each byte using a lookup table.
 * Requires initialization with a 256-byte substitution table.
 */
class Substitution : ObfuscationFunction {
    override fun obfuscate(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray {
        val table = initor as? ByteArray ?: throw IllegalArgumentException("Substitution requires ByteArray initor")
        if (table.size != 256) throw IllegalArgumentException("Substitution table must be 256 bytes")
        
        val output = ByteArray(input.size)
        for (i in input.indices) {
            output[i] = table[input[i].toInt() and 0xFF]
        }
        return output
    }
    
    override fun deobfuscate(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray {
        val table = initor as? ByteArray ?: throw IllegalArgumentException("Substitution requires ByteArray initor")
        if (table.size != 256) throw IllegalArgumentException("Substitution table must be 256 bytes")
        
        // Create inverse table
        val inverseTable = ByteArray(256)
        for (i in 0 until 256) {
            inverseTable[table[i].toInt() and 0xFF] = i.toByte()
        }
        
        val output = ByteArray(input.size)
        for (i in input.indices) {
            output[i] = inverseTable[input[i].toInt() and 0xFF]
        }
        return output
    }
}

/**
 * 11. Add Random Value
 * Adds a random value to each byte (modulo 256).
 * Requires initialization with a random byte value.
 */
class AddRandomValue : ObfuscationFunction {
    override fun obfuscate(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray {
        val randomValue = (initor as? Int) ?: throw IllegalArgumentException("AddRandomValue requires Int initor")
        
        val output = ByteArray(input.size)
        for (i in input.indices) {
            output[i] = ((input[i].toInt() and 0xFF) + randomValue).toByte()
        }
        return output
    }
    
    override fun deobfuscate(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray {
        val randomValue = (initor as? Int) ?: throw IllegalArgumentException("AddRandomValue requires Int initor")
        
        val output = ByteArray(input.size)
        for (i in input.indices) {
            output[i] = ((input[i].toInt() and 0xFF) - randomValue).toByte()
        }
        return output
    }
}
