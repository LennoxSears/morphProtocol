package com.morphprotocol.client

import com.morphprotocol.client.config.ClientConfig
import com.morphprotocol.client.network.MorphUdpClient
import kotlinx.coroutines.runBlocking

/**
 * Main MorphProtocol client facade.
 * Provides a simple API for starting and stopping the client.
 */
class MorphClient(private val config: ClientConfig) {
    private val udpClient = MorphUdpClient(config)
    
    /**
     * Start the client (blocking).
     */
    fun start() = runBlocking {
        udpClient.start()
    }
    
    /**
     * Start the client (suspending).
     */
    suspend fun startAsync() {
        udpClient.start()
    }
    
    /**
     * Stop the client (blocking).
     */
    fun stop() = runBlocking {
        udpClient.stop()
    }
    
    /**
     * Stop the client (suspending).
     */
    suspend fun stopAsync() {
        udpClient.stop()
    }
}

/**
 * Example usage.
 */
fun main() = runBlocking {
    val config = ClientConfig(
        remoteAddress = "192.168.1.100",
        remotePort = 12301,
        userId = "user123",
        encryptionKey = "base64key:base64iv",
        localWgAddress = "127.0.0.1",
        localWgPort = 51820
    )
    
    val client = MorphClient(config)
    
    println("Starting MorphProtocol client...")
    client.startAsync()
    
    // Keep running
    println("Client running. Press Ctrl+C to stop.")
    
    // Add shutdown hook
    Runtime.getRuntime().addShutdownHook(Thread {
        println("\nShutting down...")
        client.stop()
    })
    
    // Keep main thread alive
    Thread.currentThread().join()
}
