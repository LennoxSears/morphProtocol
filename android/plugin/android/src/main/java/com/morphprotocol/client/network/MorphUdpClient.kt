package com.morphprotocol.client.network

import com.google.gson.Gson
import com.morphprotocol.client.config.ClientConfig
import com.morphprotocol.client.core.FunctionInitializer
import com.morphprotocol.client.core.Obfuscator
import com.morphprotocol.client.core.templates.ProtocolTemplate
import com.morphprotocol.client.core.templates.TemplateFactory
import com.morphprotocol.client.core.templates.TemplateSelector
import com.morphprotocol.client.crypto.Encryptor
import kotlinx.coroutines.*
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.security.SecureRandom
import java.util.Base64
import kotlin.random.Random

/**
 * MorphProtocol UDP client implementation.
 * Compatible with TypeScript server.
 */
class MorphUdpClient(private val config: ClientConfig) {
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
    
    private var handshakeJob: Job? = null
    private var heartbeatJob: Job? = null
    private var inactivityCheckJob: Job? = null
    private var receiveJob: Job? = null
    
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
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
     */
    suspend fun start() = withContext(Dispatchers.IO) {
        if (isRunning) {
            println("Client already running")
            return@withContext
        }
        
        isRunning = true
        socket = DatagramSocket()
        val localPort = socket!!.localPort
        println("Client socket bound to port $localPort")
        
        // Start receiving packets
        receiveJob = scope.launch {
            receivePackets()
        }
        
        // Start handshake
        startHandshake()
    }
    
    /**
     * Stop the UDP client.
     */
    suspend fun stop() = withContext(Dispatchers.IO) {
        if (!isRunning) {
            return@withContext
        }
        
        isRunning = false
        
        // Cancel all jobs
        handshakeJob?.cancel()
        heartbeatJob?.cancel()
        inactivityCheckJob?.cancel()
        receiveJob?.cancel()
        
        // Send close message
        try {
            val closeMsg = encryptor.simpleEncrypt("close")
            sendToHandshakeServer(closeMsg.toByteArray())
            println("Close message sent to handshake server")
        } catch (e: Exception) {
            println("Failed to send close message: ${e.message}")
        }
        
        // Close socket
        socket?.close()
        socket = null
        
        println("Client stopped")
    }
    
    /**
     * Start handshake process.
     */
    private fun startHandshake() {
        var retryCount = 0
        
        handshakeJob = scope.launch {
            while (isRunning && newServerPort == 0 && retryCount < config.maxRetries) {
                sendHandshake()
                retryCount++
                delay(config.handshakeInterval)
            }
            
            if (retryCount >= config.maxRetries) {
                println("Max retries reached, stopping client")
                stop()
            }
        }
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
     * Start heartbeat mechanism.
     */
    private fun startHeartbeat() {
        heartbeatJob = scope.launch {
            while (isRunning && newServerPort != 0) {
                sendHeartbeat()
                delay(config.heartbeatInterval)
            }
        }
    }
    
    /**
     * Send heartbeat to server.
     */
    private fun sendHeartbeat() {
        val heartbeatMarker = byteArrayOf(0x01)
        val packet = protocolTemplate.encapsulate(heartbeatMarker, clientID)
        protocolTemplate.updateState()
        
        sendToNewServer(packet)
        println("Heartbeat sent to new server")
    }
    
    /**
     * Start inactivity check.
     */
    private fun startInactivityCheck() {
        inactivityCheckJob = scope.launch {
            while (isRunning && newServerPort != 0) {
                delay(10000) // Check every 10 seconds
                checkInactivity()
            }
        }
    }
    
    /**
     * Check for inactivity and reconnect if needed.
     */
    private fun checkInactivity() {
        if (newServerPort == 0 || lastReceivedTime == 0L) {
            return
        }
        
        val timeSinceLastReceived = System.currentTimeMillis() - lastReceivedTime
        
        if (timeSinceLastReceived > config.inactivityTimeout) {
            println("Inactivity detected: ${timeSinceLastReceived}ms since last packet")
            println("Attempting to reconnect with NEW clientID and packet pattern...")
            
            // Cancel heartbeat
            heartbeatJob?.cancel()
            
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
     */
    private suspend fun receivePackets() = withContext(Dispatchers.IO) {
        val buffer = ByteArray(2048)
        
        while (isRunning) {
            try {
                val packet = DatagramPacket(buffer, buffer.size)
                socket?.receive(packet)
                
                val data = packet.data.copyOfRange(0, packet.length)
                val remoteAddress = packet.address
                val remotePort = packet.port
                
                handleIncomingPacket(data, remoteAddress, remotePort)
            } catch (e: Exception) {
                if (isRunning) {
                    println("Error receiving packet: ${e.message}")
                }
            }
        }
    }
    
    /**
     * Handle incoming packet.
     */
    private fun handleIncomingPacket(data: ByteArray, remoteAddress: InetAddress, remotePort: Int) {
        when {
            remotePort == config.remotePort -> {
                // Message from handshake server
                handleHandshakeResponse(data)
            }
            remoteAddress.hostAddress == config.localWgAddress && remotePort == config.localWgPort -> {
                // Message from local WireGuard
                handleWireGuardPacket(data)
            }
            remotePort == newServerPort -> {
                // Message from new server
                handleServerPacket(data)
            }
            else -> {
                println("Received data from unknown server: ${remoteAddress.hostAddress}:$remotePort")
            }
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
                    println("Server detected inactivity, closing connection")
                    scope.launch { stop() }
                }
                "server_full" -> {
                    println("Server is full")
                    scope.launch { stop() }
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
                        handshakeJob?.cancel()
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
