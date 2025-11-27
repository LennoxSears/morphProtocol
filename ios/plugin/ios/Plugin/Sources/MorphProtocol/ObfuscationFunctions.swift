import Foundation

/// Protocol for obfuscation functions
protocol ObfuscationFunction {
    func obfuscate(_ input: Data, keyArray: Data, initor: Any?) -> Data
    func deobfuscate(_ input: Data, keyArray: Data, initor: Any?) -> Data
}

/// 1. Bitwise Rotation and XOR
class BitwiseRotationAndXOR: ObfuscationFunction {
    func obfuscate(_ input: Data, keyArray: Data, initor: Any?) -> Data {
        var output = Data(count: input.count)
        let length = input.count
        for i in 0..<length {
            let shift = (i % 8) + 1
            let byte = input[i]
            let rotated = (byte << shift) | (byte >> (8 - shift))
            let keyIndex = (i + length - 1) % length
            output[i] = rotated ^ keyArray[keyIndex % keyArray.count]
        }
        return output
    }
    
    func deobfuscate(_ input: Data, keyArray: Data, initor: Any?) -> Data {
        var output = Data(count: input.count)
        let length = input.count
        for i in 0..<length {
            let shift = (i % 8) + 1
            let keyIndex = (i + length - 1) % length
            let xored = input[i] ^ keyArray[keyIndex % keyArray.count]
            output[i] = (xored >> shift) | (xored << (8 - shift))
        }
        return output
    }
}

/// 2. Swap Neighboring Bytes
class SwapNeighboringBytes: ObfuscationFunction {
    func obfuscate(_ input: Data, keyArray: Data, initor: Any?) -> Data {
        var output = input
        for i in stride(from: 0, to: output.count - 1, by: 2) {
            output.swapAt(i, i + 1)
        }
        return output
    }
    
    func deobfuscate(_ input: Data, keyArray: Data, initor: Any?) -> Data {
        return obfuscate(input, keyArray: keyArray, initor: initor)
    }
}

/// 3. Reverse Buffer
class ReverseBuffer: ObfuscationFunction {
    func obfuscate(_ input: Data, keyArray: Data, initor: Any?) -> Data {
        return Data(input.reversed())
    }
    
    func deobfuscate(_ input: Data, keyArray: Data, initor: Any?) -> Data {
        return Data(input.reversed())
    }
}

/// 4. Divide and Swap
class DivideAndSwap: ObfuscationFunction {
    func obfuscate(_ input: Data, keyArray: Data, initor: Any?) -> Data {
        guard !input.isEmpty else { return input }
        
        let mid = input.count / 2
        let firstHalf = input.prefix(mid)
        let secondHalf = input.suffix(input.count - mid)
        
        return secondHalf + firstHalf
    }
    
    func deobfuscate(_ input: Data, keyArray: Data, initor: Any?) -> Data {
        return obfuscate(input, keyArray: keyArray, initor: initor)
    }
}

/// 5. Circular Shift Obfuscation
class CircularShiftObfuscation: ObfuscationFunction {
    func obfuscate(_ input: Data, keyArray: Data, initor: Any?) -> Data {
        var output = Data(count: input.count)
        for i in 0..<input.count {
            let byte = input[i]
            output[i] = (byte << 1) | (byte >> 7)
        }
        return output
    }
    
    func deobfuscate(_ input: Data, keyArray: Data, initor: Any?) -> Data {
        var output = Data(count: input.count)
        for i in 0..<input.count {
            let byte = input[i]
            output[i] = (byte >> 1) | (byte << 7)
        }
        return output
    }
}

/// 6. XOR with Key
class XorWithKey: ObfuscationFunction {
    func obfuscate(_ input: Data, keyArray: Data, initor: Any?) -> Data {
        var output = Data(count: input.count)
        for i in 0..<input.count {
            output[i] = input[i] ^ keyArray[i % keyArray.count]
        }
        return output
    }
    
    func deobfuscate(_ input: Data, keyArray: Data, initor: Any?) -> Data {
        return obfuscate(input, keyArray: keyArray, initor: initor)
    }
}

/// 7. Bitwise NOT
class BitwiseNOT: ObfuscationFunction {
    func obfuscate(_ input: Data, keyArray: Data, initor: Any?) -> Data {
        var output = Data(count: input.count)
        for i in 0..<input.count {
            output[i] = ~input[i]
        }
        return output
    }
    
    func deobfuscate(_ input: Data, keyArray: Data, initor: Any?) -> Data {
        return obfuscate(input, keyArray: keyArray, initor: initor)
    }
}

/// 8. Reverse Bits
class ReverseBits: ObfuscationFunction {
    private func reverseByte(_ byte: UInt8) -> UInt8 {
        var value = byte
        var result: UInt8 = 0
        for _ in 0..<8 {
            result = (result << 1) | (value & 1)
            value >>= 1
        }
        return result
    }
    
    func obfuscate(_ input: Data, keyArray: Data, initor: Any?) -> Data {
        var output = Data(count: input.count)
        for i in 0..<input.count {
            output[i] = reverseByte(input[i])
        }
        return output
    }
    
    func deobfuscate(_ input: Data, keyArray: Data, initor: Any?) -> Data {
        return obfuscate(input, keyArray: keyArray, initor: initor)
    }
}

/// 9. Shift Bits
class ShiftBits: ObfuscationFunction {
    func obfuscate(_ input: Data, keyArray: Data, initor: Any?) -> Data {
        var output = Data(count: input.count)
        for i in 0..<input.count {
            let byte = input[i]
            output[i] = (byte << 2) | (byte >> 6)
        }
        return output
    }
    
    func deobfuscate(_ input: Data, keyArray: Data, initor: Any?) -> Data {
        var output = Data(count: input.count)
        for i in 0..<input.count {
            let byte = input[i]
            output[i] = (byte >> 2) | (byte << 6)
        }
        return output
    }
}

/// 10. Substitution
class Substitution: ObfuscationFunction {
    func obfuscate(_ input: Data, keyArray: Data, initor: Any?) -> Data {
        guard let table = initor as? Data, table.count == 256 else {
            fatalError("Substitution requires 256-byte table")
        }
        
        var output = Data(count: input.count)
        for i in 0..<input.count {
            output[i] = table[Int(input[i])]
        }
        return output
    }
    
    func deobfuscate(_ input: Data, keyArray: Data, initor: Any?) -> Data {
        guard let table = initor as? Data, table.count == 256 else {
            fatalError("Substitution requires 256-byte table")
        }
        
        // Create inverse table
        var inverseTable = Data(count: 256)
        for i in 0..<256 {
            inverseTable[Int(table[i])] = UInt8(i)
        }
        
        var output = Data(count: input.count)
        for i in 0..<input.count {
            output[i] = inverseTable[Int(input[i])]
        }
        return output
    }
}

/// 11. Add Random Value
class AddRandomValue: ObfuscationFunction {
    func obfuscate(_ input: Data, keyArray: Data, initor: Any?) -> Data {
        guard let randomValue = initor as? UInt8 else {
            fatalError("AddRandomValue requires UInt8 initor")
        }
        
        var output = Data(count: input.count)
        for i in 0..<input.count {
            output[i] = input[i] &+ randomValue
        }
        return output
    }
    
    func deobfuscate(_ input: Data, keyArray: Data, initor: Any?) -> Data {
        guard let randomValue = initor as? UInt8 else {
            fatalError("AddRandomValue requires UInt8 initor")
        }
        
        var output = Data(count: input.count)
        for i in 0..<input.count {
            output[i] = input[i] &- randomValue
        }
        return output
    }
}

/// Function Registry
class FunctionRegistry {
    static let shared = FunctionRegistry()
    
    private let functions: [ObfuscationFunction] = [
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
    ]
    
    // Pre-calculated permutations (matching TypeScript/Android)
    private lazy var permutations1: [[Int]] = calculatePermutations(layer: 1)
    private lazy var permutations2: [[Int]] = calculatePermutations(layer: 2)
    private lazy var permutations3: [[Int]] = calculatePermutations(layer: 3)
    private lazy var permutations4: [[Int]] = calculatePermutations(layer: 4)
    
    func getFunction(at index: Int) -> ObfuscationFunction {
        return functions[index]
    }
    
    func getFunctionCount() -> Int {
        return functions.count
    }
    
    /// Calculate permutations without replacement (matching TypeScript/Android)
    private func calculatePermutations(layer: Int) -> [[Int]] {
        let options = Array(0..<functions.count)
        var result: [[Int]] = []
        
        func permute(current: [Int], remaining: [Int]) {
            if current.count == layer {
                result.append(current)
                return
            }
            
            for i in 0..<remaining.count {
                var next = current
                next.append(remaining[i])
                var rest = remaining
                rest.remove(at: i)
                permute(current: next, remaining: rest)
            }
        }
        
        permute(current: [], remaining: options)
        return result
    }
    
    func calculateTotalCombinations(layer: Int) -> Int {
        switch layer {
        case 1: return permutations1.count
        case 2: return permutations2.count
        case 3: return permutations3.count
        case 4: return permutations4.count
        default: return 0
        }
    }
    
    func getFunctionIndices(comboIndex: Int, layer: Int) -> [Int] {
        let permutations: [[Int]]
        switch layer {
        case 1: permutations = permutations1
        case 2: permutations = permutations2
        case 3: permutations = permutations3
        case 4: permutations = permutations4
        default: return []
        }
        
        guard comboIndex >= 0 && comboIndex < permutations.count else {
            return []
        }
        
        return permutations[comboIndex]
    }
}

/// Function Initializer
class FunctionInitializer {
    static func generateInitializers() -> [Any?] {
        var initializers: [Any?] = Array(repeating: nil, count: 9)
        
        // Function 9: Substitution table
        var table = Data((0..<256).map { UInt8($0) })
        table.shuffle()
        initializers.append(table)
        
        // Function 10: Random value
        initializers.append(UInt8.random(in: 0...255))
        
        return initializers
    }
    
    static func generateInitializerId() -> Int {
        return Int.random(in: 0..<1000000)
    }
}

// Extension for Data shuffling
extension Data {
    mutating func shuffle() {
        var bytes = Array(self)
        for i in (1..<bytes.count).reversed() {
            let j = Int.random(in: 0...i)
            bytes.swapAt(i, j)
        }
        self = Data(bytes)
    }
}
