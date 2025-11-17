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
        for i in 0..<input.count {
            let byte = input[i]
            let rotated = (byte << 3) | (byte >> 5)
            output[i] = rotated ^ keyArray[i % keyArray.count]
        }
        return output
    }
    
    func deobfuscate(_ input: Data, keyArray: Data, initor: Any?) -> Data {
        var output = Data(count: input.count)
        for i in 0..<input.count {
            let xored = input[i] ^ keyArray[i % keyArray.count]
            output[i] = (xored >> 3) | (xored << 5)
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
    
    func getFunction(at index: Int) -> ObfuscationFunction {
        return functions[index]
    }
    
    func getFunctionCount() -> Int {
        return functions.count
    }
    
    func calculateTotalCombinations(layer: Int) -> Int {
        var total = 1
        for _ in 0..<layer {
            total *= functions.count
        }
        return total
    }
    
    func getFunctionIndices(comboIndex: Int, layer: Int) -> [Int] {
        var indices = [Int](repeating: 0, count: layer)
        var remaining = comboIndex
        
        for i in (0..<layer).reversed() {
            indices[i] = remaining % functions.count
            remaining /= functions.count
        }
        
        return indices
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
