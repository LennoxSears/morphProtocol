package com.morphprotocol.client.config

/**
 * Configuration for MorphProtocol client.
 */
data class ClientConfig(
    // Server connection
    val remoteAddress: String,
    val remotePort: Int,
    val userId: String,
    val encryptionKey: String,
    
    // Local WireGuard connection
    val localWgAddress: String = "127.0.0.1",
    val localWgPort: Int = 51820,
    
    // Obfuscation settings
    val obfuscationLayer: Int = 3,
    val paddingLength: Int = 8,
    
    // Connection settings
    val heartbeatInterval: Long = 120000L,  // 2 minutes
    val inactivityTimeout: Long = 30000L,   // 30 seconds
    val maxRetries: Int = 10,
    val handshakeInterval: Long = 5000L,    // 5 seconds
    
    // Encryption password (default)
    val password: String = "bumoyu123"
)
