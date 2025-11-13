package com.morphprotocol.client.core.functions

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*

class ObfuscationFunctionTest {
    private val keyArray = ByteArray(256) { it.toByte() }
    
    @Test
    fun `test BitwiseRotationAndXOR is reversible`() {
        val function = BitwiseRotationAndXOR()
        val original = byteArrayOf(10, 20, 30, 40, 50)
        
        val obfuscated = function.obfuscate(original, keyArray, null)
        val deobfuscated = function.deobfuscate(obfuscated, keyArray, null)
        
        assertArrayEquals(original, deobfuscated)
    }
    
    @Test
    fun `test SwapNeighboringBytes is reversible`() {
        val function = SwapNeighboringBytes()
        val original = byteArrayOf(1, 2, 3, 4, 5, 6)
        
        val obfuscated = function.obfuscate(original, keyArray, null)
        val deobfuscated = function.deobfuscate(obfuscated, keyArray, null)
        
        assertArrayEquals(original, deobfuscated)
    }
    
    @Test
    fun `test ReverseBuffer is reversible`() {
        val function = ReverseBuffer()
        val original = byteArrayOf(1, 2, 3, 4, 5)
        
        val obfuscated = function.obfuscate(original, keyArray, null)
        val deobfuscated = function.deobfuscate(obfuscated, keyArray, null)
        
        assertArrayEquals(original, deobfuscated)
    }
    
    @Test
    fun `test DivideAndSwap is reversible`() {
        val function = DivideAndSwap()
        val original = byteArrayOf(1, 2, 3, 4, 5, 6, 7, 8)
        
        val obfuscated = function.obfuscate(original, keyArray, null)
        val deobfuscated = function.deobfuscate(obfuscated, keyArray, null)
        
        assertArrayEquals(original, deobfuscated)
    }
    
    @Test
    fun `test CircularShiftObfuscation is reversible`() {
        val function = CircularShiftObfuscation()
        val original = byteArrayOf(10, 20, 30, 40, 50)
        
        val obfuscated = function.obfuscate(original, keyArray, null)
        val deobfuscated = function.deobfuscate(obfuscated, keyArray, null)
        
        assertArrayEquals(original, deobfuscated)
    }
    
    @Test
    fun `test XorWithKey is reversible`() {
        val function = XorWithKey()
        val original = byteArrayOf(10, 20, 30, 40, 50)
        
        val obfuscated = function.obfuscate(original, keyArray, null)
        val deobfuscated = function.deobfuscate(obfuscated, keyArray, null)
        
        assertArrayEquals(original, deobfuscated)
    }
    
    @Test
    fun `test BitwiseNOT is reversible`() {
        val function = BitwiseNOT()
        val original = byteArrayOf(10, 20, 30, 40, 50)
        
        val obfuscated = function.obfuscate(original, keyArray, null)
        val deobfuscated = function.deobfuscate(obfuscated, keyArray, null)
        
        assertArrayEquals(original, deobfuscated)
    }
    
    @Test
    fun `test ReverseBits is reversible`() {
        val function = ReverseBits()
        val original = byteArrayOf(10, 20, 30, 40, 50)
        
        val obfuscated = function.obfuscate(original, keyArray, null)
        val deobfuscated = function.deobfuscate(obfuscated, keyArray, null)
        
        assertArrayEquals(original, deobfuscated)
    }
    
    @Test
    fun `test ShiftBits is reversible`() {
        val function = ShiftBits()
        val original = byteArrayOf(10, 20, 30, 40, 50)
        
        val obfuscated = function.obfuscate(original, keyArray, null)
        val deobfuscated = function.deobfuscate(obfuscated, keyArray, null)
        
        assertArrayEquals(original, deobfuscated)
    }
    
    @Test
    fun `test Substitution is reversible`() {
        val function = Substitution()
        val original = byteArrayOf(10, 20, 30, 40, 50)
        
        // Create substitution table
        val table = ByteArray(256) { it.toByte() }
        // Shuffle it
        for (i in 255 downTo 1) {
            val j = (Math.random() * (i + 1)).toInt()
            val temp = table[i]
            table[i] = table[j]
            table[j] = temp
        }
        
        val obfuscated = function.obfuscate(original, keyArray, table)
        val deobfuscated = function.deobfuscate(obfuscated, keyArray, table)
        
        assertArrayEquals(original, deobfuscated)
    }
    
    @Test
    fun `test AddRandomValue is reversible`() {
        val function = AddRandomValue()
        val original = byteArrayOf(10, 20, 30, 40, 50)
        val randomValue = 42
        
        val obfuscated = function.obfuscate(original, keyArray, randomValue)
        val deobfuscated = function.deobfuscate(obfuscated, keyArray, randomValue)
        
        assertArrayEquals(original, deobfuscated)
    }
    
    @Test
    fun `test all functions with empty input`() {
        val functions = listOf(
            BitwiseRotationAndXOR(),
            SwapNeighboringBytes(),
            ReverseBuffer(),
            DivideAndSwap(),
            CircularShiftObfuscation(),
            XorWithKey(),
            BitwiseNOT(),
            ReverseBits(),
            ShiftBits()
        )
        
        val empty = ByteArray(0)
        
        for (function in functions) {
            val obfuscated = function.obfuscate(empty, keyArray, null)
            assertEquals(0, obfuscated.size, "Failed for ${function.javaClass.simpleName}")
        }
    }
    
    @Test
    fun `test all functions with large data`() {
        val functions = listOf(
            BitwiseRotationAndXOR(),
            SwapNeighboringBytes(),
            ReverseBuffer(),
            DivideAndSwap(),
            CircularShiftObfuscation(),
            XorWithKey(),
            BitwiseNOT(),
            ReverseBits(),
            ShiftBits()
        )
        
        val large = ByteArray(1500) { it.toByte() }
        
        for (function in functions) {
            val obfuscated = function.obfuscate(large, keyArray, null)
            val deobfuscated = function.deobfuscate(obfuscated, keyArray, null)
            assertArrayEquals(large, deobfuscated, "Failed for ${function.javaClass.simpleName}")
        }
    }
}
