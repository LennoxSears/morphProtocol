package com.morphprotocol.client.core

import com.morphprotocol.client.core.functions.*

/**
 * FunctionRegistry manages all obfuscation functions and calculates permutations.
 * Compatible with TypeScript server implementation.
 */
object FunctionRegistry {
    private val functions = listOf<ObfuscationFunction>(
        BitwiseRotationAndXOR(),
        SwapNeighboringBytes(),
        ReverseBuffer(),
        DivideAndSwap(),
        CircularShiftObfuscation(),
        XorWithKey(),
        BitwiseNOT(),
        ReverseBits(),
        ShiftBits(),
        Substitution(),
        AddRandomValue()
    )
    
    /**
     * Get total number of functions.
     */
    fun getFunctionCount(): Int = functions.size
    
    /**
     * Get function by index.
     */
    fun getFunction(index: Int): ObfuscationFunction {
        if (index < 0 || index >= functions.size) {
            throw IndexOutOfBoundsException("Function index $index out of range [0, ${functions.size})")
        }
        return functions[index]
    }
    
    /**
     * Calculate total number of function combinations for given layer count.
     * Formula: n^k where n = function count, k = layer count
     */
    fun calculateTotalCombinations(layer: Int): Int {
        if (layer < 1 || layer > 4) {
            throw IllegalArgumentException("Layer must be between 1 and 4")
        }
        
        var total = 1
        repeat(layer) {
            total *= functions.size
        }
        return total
    }
    
    /**
     * Get function indices for a given combo index and layer count.
     * Converts combo index to base-n representation where n = function count.
     */
    fun getFunctionIndices(comboIndex: Int, layer: Int): IntArray {
        if (layer < 1 || layer > 4) {
            throw IllegalArgumentException("Layer must be between 1 and 4")
        }
        
        val totalCombinations = calculateTotalCombinations(layer)
        if (comboIndex < 0 || comboIndex >= totalCombinations) {
            throw IllegalArgumentException("Combo index $comboIndex out of range [0, $totalCombinations)")
        }
        
        val indices = IntArray(layer)
        var remaining = comboIndex
        
        for (i in layer - 1 downTo 0) {
            indices[i] = remaining % functions.size
            remaining /= functions.size
        }
        
        return indices
    }
}
