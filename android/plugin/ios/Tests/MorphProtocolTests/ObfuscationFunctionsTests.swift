import XCTest
@testable import MorphProtocol

class ObfuscationFunctionsTests: XCTestCase {
    private let keyArray = Data((0..<256).map { UInt8($0) })
    
    func testAllFunctionsAreReversible() {
        let functions: [ObfuscationFunction] = [
            BitwiseRotationAndXOR(),
            SwapNeighboringBytes(),
            ReverseBuffer(),
            DivideAndSwap(),
            CircularShiftObfuscation(),
            XorWithKey(),
            BitwiseNOT(),
            ReverseBits(),
            ShiftBits()
        ]
        
        let original = Data([10, 20, 30, 40, 50])
        
        for function in functions {
            let obfuscated = function.obfuscate(original, keyArray: keyArray, initor: nil)
            let deobfuscated = function.deobfuscate(obfuscated, keyArray: keyArray, initor: nil)
            
            XCTAssertEqual(original, deobfuscated, "Failed for \(type(of: function))")
        }
    }
    
    func testSubstitutionIsReversible() {
        let function = Substitution()
        let original = Data([10, 20, 30, 40, 50])
        
        // Create substitution table
        var table = Data((0..<256).map { UInt8($0) })
        table.shuffle()
        
        let obfuscated = function.obfuscate(original, keyArray: keyArray, initor: table)
        let deobfuscated = function.deobfuscate(obfuscated, keyArray: keyArray, initor: table)
        
        XCTAssertEqual(original, deobfuscated)
    }
    
    func testAddRandomValueIsReversible() {
        let function = AddRandomValue()
        let original = Data([10, 20, 30, 40, 50])
        let randomValue: UInt8 = 42
        
        let obfuscated = function.obfuscate(original, keyArray: keyArray, initor: randomValue)
        let deobfuscated = function.deobfuscate(obfuscated, keyArray: keyArray, initor: randomValue)
        
        XCTAssertEqual(original, deobfuscated)
    }
    
    func testAllFunctionsWithEmptyInput() {
        let functions: [ObfuscationFunction] = [
            BitwiseRotationAndXOR(),
            SwapNeighboringBytes(),
            ReverseBuffer(),
            DivideAndSwap(),
            CircularShiftObfuscation(),
            XorWithKey(),
            BitwiseNOT(),
            ReverseBits(),
            ShiftBits()
        ]
        
        let empty = Data()
        
        for function in functions {
            let obfuscated = function.obfuscate(empty, keyArray: keyArray, initor: nil)
            XCTAssertEqual(0, obfuscated.count, "Failed for \(type(of: function))")
        }
    }
    
    func testAllFunctionsWithLargeData() {
        let functions: [ObfuscationFunction] = [
            BitwiseRotationAndXOR(),
            SwapNeighboringBytes(),
            ReverseBuffer(),
            DivideAndSwap(),
            CircularShiftObfuscation(),
            XorWithKey(),
            BitwiseNOT(),
            ReverseBits(),
            ShiftBits()
        ]
        
        let large = Data((0..<1500).map { UInt8($0 % 256) })
        
        for function in functions {
            let obfuscated = function.obfuscate(large, keyArray: keyArray, initor: nil)
            let deobfuscated = function.deobfuscate(obfuscated, keyArray: keyArray, initor: nil)
            XCTAssertEqual(large, deobfuscated, "Failed for \(type(of: function))")
        }
    }
}
