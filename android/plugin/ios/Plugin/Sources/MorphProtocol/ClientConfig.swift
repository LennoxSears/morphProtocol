import Foundation

/// Configuration for MorphProtocol client
public struct ClientConfig {
    // Server connection
    public let remoteAddress: String
    public let remotePort: UInt16
    public let userId: String
    public let encryptionKey: String
    
    // Local WireGuard connection
    public let localWgAddress: String
    public let localWgPort: UInt16
    
    // Obfuscation settings
    public let obfuscationLayer: Int
    public let paddingLength: Int
    
    // Connection settings
    public let heartbeatInterval: TimeInterval
    public let inactivityTimeout: TimeInterval
    public let maxRetries: Int
    public let handshakeInterval: TimeInterval
    
    // Encryption password
    public let password: String
    
    public init(
        remoteAddress: String,
        remotePort: UInt16,
        userId: String,
        encryptionKey: String,
        localWgAddress: String = "127.0.0.1",
        localWgPort: UInt16 = 51820,
        obfuscationLayer: Int = 3,
        paddingLength: Int = 8,
        heartbeatInterval: TimeInterval = 120.0,
        inactivityTimeout: TimeInterval = 30.0,
        maxRetries: Int = 10,
        handshakeInterval: TimeInterval = 5.0,
        password: String = "bumoyu123"
    ) {
        self.remoteAddress = remoteAddress
        self.remotePort = remotePort
        self.userId = userId
        self.encryptionKey = encryptionKey
        self.localWgAddress = localWgAddress
        self.localWgPort = localWgPort
        self.obfuscationLayer = obfuscationLayer
        self.paddingLength = paddingLength
        self.heartbeatInterval = heartbeatInterval
        self.inactivityTimeout = inactivityTimeout
        self.maxRetries = maxRetries
        self.handshakeInterval = handshakeInterval
        self.password = password
    }
}
