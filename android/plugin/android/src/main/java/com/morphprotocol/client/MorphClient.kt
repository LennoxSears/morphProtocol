package com.morphprotocol.client

import android.content.Context
import com.morphprotocol.client.config.ClientConfig
import com.morphprotocol.client.network.MorphUdpClient

/**
 * Connection result data class.
 */
data class ConnectionResult(
    val success: Boolean,
    val serverPort: Int = 0,
    val clientPort: Int = 0,
    val clientId: String = "",
    val message: String = ""
)

/**
 * Main MorphProtocol client facade.
 * Provides a simple API for starting and stopping the client.
 */
class MorphClient(
    private val config: ClientConfig,
    private val context: Context
) {
    private val udpClient = MorphUdpClient(config, context)
    
    /**
     * Start the client (blocking).
     * Should be called from a background thread in the service.
     * 
     * @param onConnected Callback invoked when connection is established
     */
    fun start(onConnected: ((ConnectionResult) -> Unit)? = null): ConnectionResult {
        return udpClient.start(onConnected)
    }
    
    /**
     * Stop the client.
     */
    fun stop() {
        udpClient.stop()
    }
}


