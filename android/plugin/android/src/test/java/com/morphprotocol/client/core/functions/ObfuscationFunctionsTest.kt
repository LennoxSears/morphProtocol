package com.morphprotocol.client.core.functions

import org.junit.Test
import org.junit.Assert.*

class ObfuscationFunctionsTest {
    private val keyArray = ByteArray(256) { it.toByte() }
    
    @Test
    fun `test all functions are reversible`() {
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
        
        val original = byteArrayOf(10, 20, 30, 40, 50)
        
        for (function in functions) {
            val obfuscated = function.obfuscate(original, keyArray, null)
            val deobfuscated = function.deobfuscate(obfuscated, keyArray, null)
            
            assertArrayEquals(
                "Failed for ${function.javaClass.simpleName}",
                original,
                deobfuscated
            )
        }
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
            assertEquals(
                "Failed for ${function.javaClass.simpleName}",
                0,
                obfuscated.size
            )
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
            assertArrayEquals(
                "Failed for ${function.javaClass.simpleName}",
                large,
                deobfuscated
            )
        }
    }
}
