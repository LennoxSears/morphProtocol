import XCTest
@testable import MorphProtocol

class EncryptorTests: XCTestCase {
    
    func testEncryptionAndDecryption() throws {
        let encryptor = Encryptor(password: "testpassword")
        let plaintext = "Hello, MorphProtocol!"
        
        let ciphertext = try encryptor.simpleEncrypt(plaintext)
        let decrypted = try encryptor.simpleDecrypt(ciphertext)
        
        XCTAssertEqual(plaintext, decrypted)
    }
    
    func testSetSimpleWithValidKey() throws {
        let encryptor = Encryptor()
        let keyString = encryptor.getSimple()
        
        // Create new encryptor with same key
        let encryptor2 = Encryptor()
        try encryptor2.setSimple(keyString)
        
        let plaintext = "Test message"
        let ciphertext = try encryptor.simpleEncrypt(plaintext)
        let decrypted = try encryptor2.simpleDecrypt(ciphertext)
        
        XCTAssertEqual(plaintext, decrypted)
    }
    
    func testEmptyStringEncryption() throws {
        let encryptor = Encryptor()
        let plaintext = ""
        
        let ciphertext = try encryptor.simpleEncrypt(plaintext)
        let decrypted = try encryptor.simpleDecrypt(ciphertext)
        
        XCTAssertEqual(plaintext, decrypted)
    }
    
    func testLongTextEncryption() throws {
        let encryptor = Encryptor()
        let plaintext = String(repeating: "A", count: 1000)
        
        let ciphertext = try encryptor.simpleEncrypt(plaintext)
        let decrypted = try encryptor.simpleDecrypt(ciphertext)
        
        XCTAssertEqual(plaintext, decrypted)
    }
    
    func testUnicodeEncryption() throws {
        let encryptor = Encryptor()
        let plaintext = "Hello 世界 🌍"
        
        let ciphertext = try encryptor.simpleEncrypt(plaintext)
        let decrypted = try encryptor.simpleDecrypt(ciphertext)
        
        XCTAssertEqual(plaintext, decrypted)
    }
}
