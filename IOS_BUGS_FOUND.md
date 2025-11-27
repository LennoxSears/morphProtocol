# iOS Plugin Bugs Found - First Review

## Critical Bugs (5)

### 1. BitwiseRotationAndXOR - Fixed Shift
**Location**: `ObfuscationFunctions.swift` line 15-16

**Current (WRONG)**:
```swift
let rotated = (byte << 3) | (byte >> 5)
output[i] = rotated ^ keyArray[i % keyArray.count]
```

**Should be**:
```swift
let shift = (i % 8) + 1
let rotated = (byte << shift) | (byte >> (8 - shift))
let keyIndex = (i + input.count - 1) % input.count
output[i] = rotated ^ keyArray[keyIndex % keyArray.count]
```

**Impact**: Completely different obfuscation output, incompatible with TypeScript/Android

---

### 2. Key Generation - Wrong Formula
**Location**: `Obfuscator.swift` line 23

**Current (WRONG)**:
```swift
keyBytes[i] = UInt8((key + i) % 256)
```

**Should be**:
```swift
keyBytes[i] = UInt8((key + i * 37) % 256)
```

**Impact**: Different key array, incompatible encryption

---

### 3. Padding Length - Fixed Instead of Random
**Location**: `Obfuscator.swift` line 42

**Current (WRONG)**:
```swift
header[2] = UInt8(paddingLength)
```

**Should be**:
```swift
let actualPaddingLength = Int.random(in: 1...paddingLength)
header[2] = UInt8(actualPaddingLength)
```

**Impact**: Predictable padding, incompatible with TypeScript/Android

---

### 4. Function Combinations - With Replacement
**Location**: `ObfuscationFunctions.swift` line 285-293

**Current (WRONG)**:
```swift
func getFunctionIndices(comboIndex: Int, layer: Int) -> [Int] {
    var indices = [Int](repeating: 0, count: layer)
    var remaining = comboIndex
    
    for i in (0..<layer).reversed() {
        indices[i] = remaining % functions.count
        remaining /= functions.count
    }
    
    return indices
}
```

This generates combinations WITH replacement (allows repeats like [0,0]).

**Should be**: Permutations WITHOUT replacement (like TypeScript/Android)

**Impact**: Different function selection, incompatible with TypeScript/Android

---

### 5. Total Combinations Calculation
**Location**: `ObfuscationFunctions.swift` line 277-282

**Current (WRONG)**:
```swift
func calculateTotalCombinations(layer: Int) -> Int {
    var total = 1
    for _ in 0..<layer {
        total *= functions.count
    }
    return total
}
```

This calculates n^k (combinations with replacement).

**Should be**: P(n,k) = n!/(n-k)! (permutations without replacement)

**Impact**: Wrong total combinations count (121 vs 110 for layer 2)

---

## Summary

All 5 bugs are **CRITICAL** and make iOS completely incompatible with TypeScript server and Android client.

These are the SAME bugs that were found and fixed in Android during the previous reviews.

## Next Steps

1. Fix all 5 bugs
2. Verify with byte-by-byte tests
3. Test cross-platform compatibility
4. Continue with 4 more review passes
