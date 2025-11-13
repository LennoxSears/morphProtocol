import Foundation
import CryptoKit
import CommonCrypto

/// Encryptor handles AES-256-CBC encryption/decryption for MorphProtocol
/// Compatible with TypeScript server and Android client
public class Encryptor {
    private var simpleKey: Data
    private var simpleIv: Data
    
    private static let keySize = 32  // 256 bits
    private static let ivSize = 16   // 128 bits
    
    public init(password: String = "bumoyu123") {
        // Generate key and IV from password using PBKDF2 (similar to scrypt)
        let salt = Data(count: 16)
        let keyMaterial = Encryptor.deriveKey(password: password, salt: salt, length: Encryptor.keySize + Encryptor.ivSize)
        
        self.simpleKey = keyMaterial.prefix(Encryptor.keySize)
        self.simpleIv = keyMaterial.suffix(Encryptor.ivSize)
    }
    
    /// Set encryption key and IV from base64 string
    /// Format: "base64key:base64iv"
    public func setSimple(_ keyString: String) throws {
        let parts = keyString.split(separator: ":")
        guard parts.count == 2 else {
            throw EncryptorError.invalidKeyFormat
        }
        
        guard let key = Data(base64Encoded: String(parts[0])),
              let iv = Data(base64Encoded: String(parts[1])) else {
            throw EncryptorError.invalidBase64
        }
        
        guard key.count == Encryptor.keySize else {
            throw EncryptorError.invalidKeySize
        }
        
        guard iv.count == Encryptor.ivSize else {
            throw EncryptorError.invalidIvSize
        }
        
        self.simpleKey = key
        self.simpleIv = iv
    }
    
    /// Get current key and IV as base64 string
    /// Format: "base64key:base64iv"
    public func getSimple() -> String {
        let keyBase64 = simpleKey.base64EncodedString()
        let ivBase64 = simpleIv.base64EncodedString()
        return "\(keyBase64):\(ivBase64)"
    }
    
    /// Encrypt plaintext using AES-256-CBC
    /// Returns base64-encoded ciphertext
    public func simpleEncrypt(_ plaintext: String) throws -> String {
        guard let data = plaintext.data(using: .utf8) else {
            throw EncryptorError.invalidInput
        }
        
        let encrypted = try aesEncrypt(data: data, key: simpleKey, iv: simpleIv)
        return encrypted.base64EncodedString()
    }
    
    /// Decrypt base64-encoded ciphertext using AES-256-CBC
    /// Returns plaintext string
    public func simpleDecrypt(_ ciphertext: String) throws -> String {
        guard let data = Data(base64Encoded: ciphertext) else {
            throw EncryptorError.invalidBase64
        }
        
        let decrypted = try aesDecrypt(data: data, key: simpleKey, iv: simpleIv)
        
        guard let plaintext = String(data: decrypted, encoding: .utf8) else {
            throw EncryptorError.invalidOutput
        }
        
        return plaintext
    }
    
    // MARK: - Private Methods
    
    private static func deriveKey(password: String, salt: Data, length: Int) -> Data {
        var derivedKey = Data(count: length)
        let passwordData = password.data(using: .utf8)!
        
        derivedKey.withUnsafeMutableBytes { derivedKeyBytes in
            salt.withUnsafeBytes { saltBytes in
                passwordData.withUnsafeBytes { passwordBytes in
                    CCKeyDerivationPBKDF(
                        CCPBKDFAlgorithm(kCCPBKDF2),
                        passwordBytes.baseAddress?.assumingMemoryBound(to: Int8.self),
                        passwordData.count,
                        saltBytes.baseAddress?.assumingMemoryBound(to: UInt8.self),
                        salt.count,
                        CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256),
                        10000,
                        derivedKeyBytes.baseAddress?.assumingMemoryBound(to: UInt8.self),
                        length
                    )
                }
            }
        }
        
        return derivedKey
    }
    
    private func aesEncrypt(data: Data, key: Data, iv: Data) throws -> Data {
        var encrypted = Data(count: data.count + kCCBlockSizeAES128)
        var numBytesEncrypted: size_t = 0
        
        let status = encrypted.withUnsafeMutableBytes { encryptedBytes in
            data.withUnsafeBytes { dataBytes in
                key.withUnsafeBytes { keyBytes in
                    iv.withUnsafeBytes { ivBytes in
                        CCCrypt(
                            CCOperation(kCCEncrypt),
                            CCAlgorithm(kCCAlgorithmAES),
                            CCOptions(kCCOptionPKCS7Padding),
                            keyBytes.baseAddress,
                            key.count,
                            ivBytes.baseAddress,
                            dataBytes.baseAddress,
                            data.count,
                            encryptedBytes.baseAddress,
                            encrypted.count,
                            &numBytesEncrypted
                        )
                    }
                }
            }
        }
        
        guard status == kCCSuccess else {
            throw EncryptorError.encryptionFailed
        }
        
        encrypted.count = numBytesEncrypted
        return encrypted
    }
    
    private func aesDecrypt(data: Data, key: Data, iv: Data) throws -> Data {
        var decrypted = Data(count: data.count + kCCBlockSizeAES128)
        var numBytesDecrypted: size_t = 0
        
        let status = decrypted.withUnsafeMutableBytes { decryptedBytes in
            data.withUnsafeBytes { dataBytes in
                key.withUnsafeBytes { keyBytes in
                    iv.withUnsafeBytes { ivBytes in
                        CCCrypt(
                            CCOperation(kCCDecrypt),
                            CCAlgorithm(kCCAlgorithmAES),
                            CCOptions(kCCOptionPKCS7Padding),
                            keyBytes.baseAddress,
                            key.count,
                            ivBytes.baseAddress,
                            dataBytes.baseAddress,
                            data.count,
                            decryptedBytes.baseAddress,
                            decrypted.count,
                            &numBytesDecrypted
                        )
                    }
                }
            }
        }
        
        guard status == kCCSuccess else {
            throw EncryptorError.decryptionFailed
        }
        
        decrypted.count = numBytesDecrypted
        return decrypted
    }
}

// MARK: - Errors

public enum EncryptorError: Error {
    case invalidKeyFormat
    case invalidBase64
    case invalidKeySize
    case invalidIvSize
    case invalidInput
    case invalidOutput
    case encryptionFailed
    case decryptionFailed
}
