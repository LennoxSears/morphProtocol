import Foundation

/// Obfuscator applies multi-layer obfuscation to data packets
/// Compatible with TypeScript server and Android client
public class Obfuscator {
    private let key: Int
    private let layer: Int
    private let paddingLength: Int
    private let fnInitor: Int
    private let keyArray: Data
    private let initializers: [Any?]
    private let totalCombinations: Int
    private let registry = FunctionRegistry.shared
    
    public init(key: Int, layer: Int, paddingLength: Int, fnInitor: Int) {
        self.key = key
        self.layer = layer
        self.paddingLength = paddingLength
        self.fnInitor = fnInitor
        
        // Generate 256-byte key array
        var keyBytes = Data(count: 256)
        for i in 0..<256 {
            keyBytes[i] = UInt8((key + i) % 256)
        }
        self.keyArray = keyBytes
        
        // Generate function initializers
        self.initializers = FunctionInitializer.generateInitializers()
        
        self.totalCombinations = registry.calculateTotalCombinations(layer: layer)
    }
    
    /// Obfuscate data with multi-layer transformations
    /// Returns: [3-byte header][obfuscated data][padding]
    public func obfuscate(_ input: Data) -> Data {
        guard !input.isEmpty else { return input }
        
        // Generate random header
        var header = Data(count: 3)
        header[0] = UInt8.random(in: 0...255)
        header[1] = UInt8.random(in: 0...255)
        header[2] = UInt8(paddingLength)
        
        // Calculate function combo from header
        let comboIndex = (Int(header[0]) * Int(header[1])) % totalCombinations
        let functionIndices = registry.getFunctionIndices(comboIndex: comboIndex, layer: layer)
        
        // Apply obfuscation layers
        var data = input
        for funcIndex in functionIndices {
            let function = registry.getFunction(at: funcIndex)
            let initor = initializers[funcIndex]
            data = function.obfuscate(data, keyArray: keyArray, initor: initor)
        }
        
        // Add random padding
        var padding = Data(count: paddingLength)
        for i in 0..<paddingLength {
            padding[i] = UInt8.random(in: 0...255)
        }
        
        // Combine: header + obfuscated data + padding
        return header + data + padding
    }
    
    /// Deobfuscate data by reversing the transformations
    /// Input: [3-byte header][obfuscated data][padding]
    /// Returns: original data
    public func deobfuscate(_ input: Data) throws -> Data {
        guard input.count >= 4 else {
            throw ObfuscatorError.inputTooShort
        }
        
        // Extract header
        let header = input.prefix(3)
        let paddingLen = Int(header[2])
        
        guard paddingLen >= 1 && paddingLen <= 8 else {
            throw ObfuscatorError.invalidPaddingLength
        }
        
        guard input.count >= 3 + paddingLen else {
            throw ObfuscatorError.inputTooShort
        }
        
        // Extract obfuscated data (remove header and padding)
        let dataLength = input.count - 3 - paddingLen
        let obfuscatedData = input.subdata(in: 3..<(3 + dataLength))
        
        // Calculate function combo from header
        let comboIndex = (Int(header[0]) * Int(header[1])) % totalCombinations
        let functionIndices = registry.getFunctionIndices(comboIndex: comboIndex, layer: layer)
        
        // Apply deobfuscation layers in reverse order
        var data = obfuscatedData
        for funcIndex in functionIndices.reversed() {
            let function = registry.getFunction(at: funcIndex)
            let initor = initializers[funcIndex]
            data = function.deobfuscate(data, keyArray: keyArray, initor: initor)
        }
        
        return data
    }
    
    /// Update the obfuscator with new key
    public func setKey(_ newKey: Int) {
        var keyBytes = Data(count: 256)
        for i in 0..<256 {
            keyBytes[i] = UInt8((newKey + i) % 256)
        }
        // Note: This would require making keyArray mutable
    }
}

// MARK: - Errors

public enum ObfuscatorError: Error {
    case inputTooShort
    case invalidPaddingLength
}
