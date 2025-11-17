import XCTest
@testable import MorphProtocol

class ObfuscatorTests: XCTestCase {
    
    func testObfuscationAndDeobfuscation() throws {
        let obfuscator = Obfuscator(key: 42, layer: 3, paddingLength: 4, fnInitor: 12345)
        let original = Data("Hello, World!".utf8)
        
        let obfuscated = obfuscator.obfuscate(original)
        let deobfuscated = try obfuscator.deobfuscate(obfuscated)
        
        XCTAssertEqual(original, deobfuscated)
    }
    
    func testObfuscatedDataHasHeaderAndPadding() {
        let obfuscator = Obfuscator(key: 42, layer: 2, paddingLength: 5, fnInitor: 12345)
        let original = Data("Test".utf8)
        
        let obfuscated = obfuscator.obfuscate(original)
        
        // Should have 3-byte header + data + 5-byte padding
        XCTAssertEqual(3 + original.count + 5, obfuscated.count)
    }
    
    func testDifferentLayers() throws {
        let data = Data("Test data".utf8)
        
        for layer in 1...4 {
            let obfuscator = Obfuscator(key: 42, layer: layer, paddingLength: 4, fnInitor: 12345)
            let obfuscated = obfuscator.obfuscate(data)
            let deobfuscated = try obfuscator.deobfuscate(obfuscated)
            
            XCTAssertEqual(data, deobfuscated, "Failed for layer \(layer)")
        }
    }
    
    func testEmptyData() {
        let obfuscator = Obfuscator(key: 42, layer: 2, paddingLength: 4, fnInitor: 12345)
        let original = Data()
        
        let obfuscated = obfuscator.obfuscate(original)
        
        XCTAssertEqual(0, obfuscated.count)
    }
    
    func testLargeData() throws {
        let obfuscator = Obfuscator(key: 42, layer: 3, paddingLength: 8, fnInitor: 12345)
        let original = Data((0..<1500).map { UInt8($0 % 256) })
        
        let obfuscated = obfuscator.obfuscate(original)
        let deobfuscated = try obfuscator.deobfuscate(obfuscated)
        
        XCTAssertEqual(original, deobfuscated)
    }
    
    func testHeaderContainsPaddingLength() {
        let paddingLength = 6
        let obfuscator = Obfuscator(key: 42, layer: 2, paddingLength: paddingLength, fnInitor: 12345)
        let original = Data("Test".utf8)
        
        let obfuscated = obfuscator.obfuscate(original)
        
        // Header[2] should contain padding length
        XCTAssertEqual(UInt8(paddingLength), obfuscated[2])
    }
}
