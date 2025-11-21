package com.morphprotocol.client.network

import android.content.Context
import android.util.Log
import com.google.gson.Gson
import com.morphprotocol.client.ConnectionResult
import com.morphprotocol.client.config.ClientConfig
import com.morphprotocol.client.core.FunctionInitializer
import com.morphprotocol.client.core.Obfuscator
import com.morphprotocol.client.core.templates.ProtocolTemplate
import com.morphprotocol.client.core.templates.TemplateFactory
import com.morphprotocol.client.core.templates.TemplateSelector
import com.morphprotocol.client.crypto.Encryptor

import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.security.SecureRandom
import java.util.Base64
import kotlin.random.Random

/**
 * MorphProtocol UDP client implementation.
 * Compatible with TypeScript server.
 * Uses native Java threads for Doze-resistant background execution.
 */
class MorphUdpClient(
    private val config: ClientConfig,
    private val context: Context
) {
    companion object {
        private const val TAG = "MorphUdpClient"
    }
    private val gson = Gson()
    private val random = SecureRandom()
    
    private var socket: DatagramSocket? = null
    private var isRunning = false
    private var clientID: ByteArray = ByteArray(16)
    private var encryptor: Encryptor
    private var obfuscator: Obfuscator
    private var protocolTemplate: ProtocolTemplate
    private var newServerPort: Int = 0
    private var lastReceivedTime: Long = 0
    
    // Use java.util.Timer (works with native threads, not affected by Doze mode)
    private var handshakeTimer: java.util.Timer? = null
    private var heartbeatTimer: java.util.Timer? = null
    private var inactivityCheckTimer: java.util.Timer? = null
    
    init {
        // Generate random 16-byte clientID
        random.nextBytes(clientID)
        println("Generated clientID: ${clientID.toHex()}")
        
        // Initialize encryptor
        encryptor = Encryptor(config.password)
        encryptor.setSimple(config.encryptionKey)
        
        // Select random protocol template
        val templateId = TemplateSelector.selectRandomTemplate()
        protocolTemplate = TemplateFactory.createTemplate(templateId)
        println("Selected protocol template: ${protocolTemplate.name} (ID: $templateId)")
        
        // Initialize obfuscator
        val key = Random.nextInt(256)
        val fnInitor = FunctionInitializer.generateInitializerId()
        obfuscator = Obfuscator(key, config.obfuscationLayer, config.paddingLength, fnInitor)
        
        println("Obfuscation parameters: key=$key, layer=${config.obfuscationLayer}, padding=${config.paddingLength}, fnInitor=$fnInitor")
    }
    
    /**
     * Start the UDP client.
     * Runs in the calling thread (like old plugin).
     * This function blocks and runs the receive loop.
     */
    fun start(): ConnectionResult {
        if (isRunning) {
            Log.w(TAG, "Client already running")
            return ConnectionResult(
                success = false,
                message = "Client already running"
            )
        }
        
        try {
            isRunning = true
            socket = DatagramSocket()
            val localPort = socket!!.localPort
            Log.d(TAG, "Client socket bound to port $localPort")
            
            // Start handshake timer (like old plugin)
            startHandshake()
            
            // Run receive loop in THIS thread (like old plugin)
            // This blocks until stop() is called
            receivePackets()
            
            // If we get here, connection was stopped
            return ConnectionResult(
                success = true,
                serverPort = newServerPort,
                clientId = clientID.toHex(),
                message = if (newServerPort > 0) "Connected successfully" else "Connection stopped"
            )
        } catch (e: Exception) {
            isRunning = false
            socket?.close()
            socket = null
            return ConnectionResult(
                success = false,
                message = "Connection failed: ${e.message}"
            )
        }
    }
    
    /**
     * Stop the UDP client.
     */
    fun stop() {
        if (!isRunning) {
            return
        }
        
        isRunning = false
        
        // Stop timers
        stopHandshake()
        stopHeartbeat()
        stopInactivityCheck()
        
        // Send close message
        try {
            val closeMsg = encryptor.simpleEncrypt("close")
            sendToHandshakeServer(closeMsg.toByteArray())
            Log.d(TAG, "Close message sent to handshake server")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send close message: ${e.message}")
        }
        
        // Close socket (this will break the receive loop)
        socket?.close()
        socket = null
        
        Log.d(TAG, "Client stopped")
    }
    
    /**
     * Start handshake process using Timer (like old plugin).
     */
    private fun startHandshake() {
        Log.d(TAG, "Starting handshake timer")
        
        handshakeTimer = java.util.Timer("MorphHandshake", true).apply {
            schedule(object : java.util.TimerTask() {
                private var retryCount = 0  // Inside TimerTask like old plugin
                
                override fun run() {
                    if (!isRunning || newServerPort != 0) {
                        cancel()
                        return
                    }
                    
                    sendHandshake()
                    retryCount++
                    
                    if (retryCount >= config.maxRetries) {
                        Log.e(TAG, "Max retries reached, handshake failed")
                        cancel()
                        stop()
                    }
                }
            }, 0, config.handshakeInterval)
        }
    }
    
    /**
     * Stop handshake timer.
     */
    private fun stopHandshake() {
        Log.d(TAG, "Stopping handshake")
        handshakeTimer?.cancel()
        handshakeTimer = null
    }
    
    /**
     * Send handshake data to server.
     */
    private fun sendHandshake() {
        val handshakeData = mapOf(
            "clientID" to Base64.getEncoder().encodeToString(clientID),
            "key" to Random.nextInt(256),
            "obfuscationLayer" to config.obfuscationLayer,
            "randomPadding" to config.paddingLength,
            "fnInitor" to FunctionInitializer.generateInitializerId(),
            "templateId" to protocolTemplate.id,
            "templateParams" to protocolTemplate.getParams(),
            "userId" to config.userId,
            "publicKey" to "not implemented"
        )
        
        val json = gson.toJson(handshakeData)
        val encrypted = encryptor.simpleEncrypt(json)
        
        sendToHandshakeServer(encrypted.toByteArray())
        println("Handshake data sent to handshake server")
    }
    
    /**
     * Start heartbeat mechanism using java.util.Timer.
     * Timer runs in its own thread, not affected by Doze when combined with native threads.
     */
    private fun startHeartbeat() {
        Log.d(TAG, "Starting heartbeat timer, interval: ${config.heartbeatInterval}ms")
        heartbeatTimer = java.util.Timer("MorphHeartbeat", false).apply {
            schedule(object : java.util.TimerTask() {
                override fun run() {
                    if (isRunning && newServerPort != 0) {
                        sendHeartbeat()
                    }
                }
            }, 0, config.heartbeatInterval)
        }
    }
    
    /**
     * Stop heartbeat timer.
     */
    private fun stopHeartbeat() {
        Log.d(TAG, "Stopping heartbeat")
        heartbeatTimer?.cancel()
        heartbeatTimer = null
    }
    
    /**
     * Send heartbeat to server.
     */
    private fun sendHeartbeat() {
        val timestamp = System.currentTimeMillis()
        Log.d(TAG, "[$timestamp] Sending heartbeat")
        
        val heartbeatMarker = byteArrayOf(0x01)
        val packet = protocolTemplate.encapsulate(heartbeatMarker, clientID)
        protocolTemplate.updateState()
        
        sendToNewServer(packet)
        Log.d(TAG, "Heartbeat sent to new server")
    }
    
    /**
     * Start inactivity check using java.util.Timer.
     */
    private fun startInactivityCheck() {
        Log.d(TAG, "Starting inactivity check timer")
        inactivityCheckTimer = java.util.Timer("MorphInactivityCheck", false).apply {
            schedule(object : java.util.TimerTask() {
                override fun run() {
                    if (isRunning && newServerPort != 0) {
                        checkInactivity()
                    }
                }
            }, 90000, 90000) // Check every 90 seconds
        }
    }
    
    /**
     * Stop inactivity check timer.
     */
    private fun stopInactivityCheck() {
        Log.d(TAG, "Stopping inactivity check")
        inactivityCheckTimer?.cancel()
        inactivityCheckTimer = null
    }
    
    /**
     * Check for inactivity and reconnect if needed.
     */
    private fun checkInactivity() {
        val timestamp = System.currentTimeMillis()
        Log.d(TAG, "[$timestamp] Checking inactivity")
        
        if (newServerPort == 0 || lastReceivedTime == 0L) {
            return
        }
        
        val timeSinceLastReceived = System.currentTimeMillis() - lastReceivedTime
        
        if (timeSinceLastReceived > config.inactivityTimeout) {
            println("Inactivity detected: ${timeSinceLastReceived}ms since last packet")
            println("Attempting to reconnect with NEW clientID and packet pattern...")
            
            // Stop timers
            stopHeartbeat()
            stopInactivityCheck()
            
            // Reset server port
            val oldPort = newServerPort
            val oldClientID = clientID.toHex()
            newServerPort = 0
            
            // Generate NEW clientID
            random.nextBytes(clientID)
            println("Old clientID: $oldClientID")
            println("New clientID: ${clientID.toHex()}")
            
            // Select NEW protocol template
            val newTemplateId = TemplateSelector.selectRandomTemplate()
            protocolTemplate = TemplateFactory.createTemplate(newTemplateId)
            println("New template: ${protocolTemplate.name} (ID: $newTemplateId)")
            
            // Generate NEW obfuscation parameters
            val newKey = Random.nextInt(256)
            val newFnInitor = FunctionInitializer.generateInitializerId()
            obfuscator = Obfuscator(newKey, config.obfuscationLayer, config.paddingLength, newFnInitor)
            println("New obfuscation parameters: key=$newKey, fnInitor=$newFnInitor")
            
            // Send handshake to reconnect
            startHandshake()
            println("Reconnection handshake sent (old port: $oldPort)")
        }
    }
    
    /**
     * Receive packets from server.
     * Runs in a native Java thread (not affected by Doze mode).
     */
    private fun receivePackets() {
        val buffer = ByteArray(2048)
        Log.d(TAG, "Receive thread started")
        
        while (isRunning && socket != null && !socket!!.isClosed) {
            try {
                val packet = DatagramPacket(buffer, buffer.size)
                socket?.receive(packet)  // Blocking call - works in native thread during Doze
                
                val data = packet.data.copyOfRange(0, packet.length)
                val remoteAddress = packet.address
                val remotePort = packet.port
                
                handleIncomingPacket(data, remoteAddress, remotePort)
            } catch (e: Exception) {
                if (isRunning) {
                    Log.e(TAG, "Error receiving packet: ${e.message}")
                }
            }
        }
        
        Log.d(TAG, "Receive thread stopped")
    }
    
    /**
     * Handle incoming packet.
     */
    private fun handleIncomingPacket(data: ByteArray, remoteAddress: InetAddress, remotePort: Int) {
        val timestamp = System.currentTimeMillis()
        println("[$timestamp] [PacketRouter] Received ${data.size} bytes from ${remoteAddress.hostAddress}:$remotePort")
        
        when {
            remotePort == config.remotePort -> {
                // Message from handshake server
                println("[$timestamp] [PacketRouter] → Handshake response")
                handleHandshakeResponse(data)
            }
            isLocalAddress(remoteAddress) && remotePort == config.localWgPort -> {
                // Message from local WireGuard (check both address and port for security)
                println("[$timestamp] [PacketRouter] → From WireGuard, sending to server")
                handleWireGuardPacket(data)
            }
            remotePort == newServerPort -> {
                // Message from new server
                println("[$timestamp] [PacketRouter] → From server, sending to WireGuard")
                handleServerPacket(data)
            }
            else -> {
                println("[$timestamp] [PacketRouter] → Unknown source (port: $remotePort), ignoring")
            }
        }
    }
    
    /**
     * Check if address is localhost (handles various formats).
     */
    private fun isLocalAddress(address: InetAddress): Boolean {
        // Check if it's loopback address (handles both IPv4 and IPv6)
        if (address.isLoopbackAddress) {
            return true
        }
        
        // Also check against configured local address
        try {
            val configAddress = InetAddress.getByName(config.localWgAddress)
            return address == configAddress
        } catch (e: Exception) {
            println("Failed to resolve local address: ${e.message}")
            return false
        }
    }
    
    /**
     * Handle handshake response from server.
     */
    private fun handleHandshakeResponse(data: ByteArray) {
        try {
            val decrypted = encryptor.simpleDecrypt(String(data))
            
            when (decrypted) {
                "inactivity" -> {
                    Log.w(TAG, "Server detected inactivity, closing connection")
                    stop()
                }
                "server_full" -> {
                    Log.w(TAG, "Server is full")
                    stop()
                }
                else -> {
                    // Parse JSON response
                    val response = gson.fromJson(decrypted, HandshakeResponse::class.java)
                    
                    if (response.port != null && response.clientID != null) {
                        newServerPort = response.port
                        val confirmedClientID = response.clientID
                        
                        println("Received server response:")
                        println("  Port: $newServerPort")
                        println("  ClientID confirmed: $confirmedClientID")
                        println("  Status: ${response.status ?: "unknown"}")
                        
                        // Verify clientID matches
                        if (confirmedClientID != Base64.getEncoder().encodeToString(clientID)) {
                            println("ClientID mismatch! Server returned different clientID")
                        }
                        
                        // Stop handshake and start heartbeat
                        stopHandshake()
                        startHeartbeat()
                        
                        // Start inactivity check
                        lastReceivedTime = System.currentTimeMillis()
                        startInactivityCheck()
                        println("Inactivity detection started (timeout: ${config.inactivityTimeout}ms)")
                    }
                }
            }
        } catch (e: Exception) {
            println("Failed to parse handshake response: ${e.message}")
        }
    }
    
    /**
     * Handle packet from WireGuard.
     */
    private fun handleWireGuardPacket(data: ByteArray) {
        if (newServerPort != 0) {
            // Obfuscate and send to server
            val obfuscated = obfuscator.obfuscate(data)
            val packet = protocolTemplate.encapsulate(obfuscated, clientID)
            protocolTemplate.updateState()
            
            sendToNewServer(packet)
        } else {
            println("New server port is not available yet")
        }
    }
    
    /**
     * Handle packet from server.
     */
    private fun handleServerPacket(data: ByteArray) {
        // Update last received time
        lastReceivedTime = System.currentTimeMillis()
        
        // Decapsulate template layer
        val obfuscatedData = protocolTemplate.decapsulate(data)
        if (obfuscatedData == null) {
            println("Failed to decapsulate template packet from server")
            return
        }
        
        // Deobfuscate
        val deobfuscated = obfuscator.deobfuscate(obfuscatedData)
        
        // Send to local WireGuard
        sendToLocalWireGuard(deobfuscated)
    }
    
    /**
     * Send data to handshake server.
     */
    private fun sendToHandshakeServer(data: ByteArray) {
        try {
            val address = InetAddress.getByName(config.remoteAddress)
            val packet = DatagramPacket(data, data.size, address, config.remotePort)
            socket?.send(packet)
        } catch (e: Exception) {
            println("Failed to send to handshake server: ${e.message}")
        }
    }
    
    /**
     * Send data to new server.
     */
    private fun sendToNewServer(data: ByteArray) {
        try {
            val address = InetAddress.getByName(config.remoteAddress)
            val packet = DatagramPacket(data, data.size, address, newServerPort)
            socket?.send(packet)
        } catch (e: Exception) {
            println("Failed to send to new server: ${e.message}")
        }
    }
    
    /**
     * Send data to local WireGuard.
     */
    private fun sendToLocalWireGuard(data: ByteArray) {
        try {
            val address = InetAddress.getByName(config.localWgAddress)
            val packet = DatagramPacket(data, data.size, address, config.localWgPort)
            socket?.send(packet)
        } catch (e: Exception) {
            println("Failed to send to local WireGuard: ${e.message}")
        }
    }
    
    /**
     * Convert ByteArray to hex string.
     */
    private fun ByteArray.toHex(): String {
        return joinToString("") { "%02x".format(it) }
    }
    
    /**
     * Handshake response data class.
     */
    private data class HandshakeResponse(
        val port: Int?,
        val clientID: String?,
        val status: String?
    )
}
