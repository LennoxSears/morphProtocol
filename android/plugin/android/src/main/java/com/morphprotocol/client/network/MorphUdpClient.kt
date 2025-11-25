package com.morphprotocol.client.network

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.SystemClock
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
        private const val ACTION_HEARTBEAT = "com.morphprotocol.HEARTBEAT"
        private const val ACTION_INACTIVITY_CHECK = "com.morphprotocol.INACTIVITY_CHECK"
    }
    private val gson = Gson()
    private val random = SecureRandom()
    
    private var socket: DatagramSocket? = null
    private var isRunning = false
    private var localPort: Int = 0
    private var clientID: ByteArray = ByteArray(16)
    private var encryptor: Encryptor
    private var obfuscator: Obfuscator
    private var protocolTemplate: ProtocolTemplate
    private var newServerPort: Int = 0
    private var lastReceivedTime: Long = 0
    
    // Callback for connection success
    private var onConnectedCallback: ((ConnectionResult) -> Unit)? = null
    
    // Use java.util.Timer for handshake (short-term, acceptable)
    private var handshakeTimer: java.util.Timer? = null
    
    // Use AlarmManager for heartbeat and inactivity (Doze-resistant)
    private val alarmManager: AlarmManager by lazy {
        context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    }
    private var heartbeatPendingIntent: PendingIntent? = null
    private var inactivityCheckPendingIntent: PendingIntent? = null
    
    // BroadcastReceivers for alarms
    // Note: BroadcastReceivers run on main thread, so we need to execute network operations in background
    private val heartbeatReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Log.d(TAG, "[${System.currentTimeMillis()}] Heartbeat alarm triggered (Doze-resistant)")
            if (isRunning && newServerPort != 0) {
                // Execute in background thread since BroadcastReceiver runs on main thread
                Thread {
                    sendHeartbeat()
                }.start()
                scheduleNextHeartbeat()  // Reschedule for next time
            }
        }
    }
    
    private val inactivityCheckReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Log.d(TAG, "[${System.currentTimeMillis()}] Inactivity check alarm triggered (Doze-resistant)")
            if (isRunning && newServerPort != 0) {
                // Execute in background thread since BroadcastReceiver runs on main thread
                Thread {
                    checkInactivity()
                }.start()
                scheduleNextInactivityCheck()  // Reschedule for next time
            }
        }
    }
    
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
     * 
     * @param onConnected Callback invoked when handshake succeeds and connection is established
     */
    fun start(onConnected: ((ConnectionResult) -> Unit)? = null): ConnectionResult {
        this.onConnectedCallback = onConnected
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
            localPort = socket!!.localPort
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
     * Start heartbeat mechanism using AlarmManager (Doze-resistant).
     */
    private fun startHeartbeat() {
        Log.d(TAG, "Starting heartbeat with AlarmManager, interval: ${config.heartbeatInterval}ms")
        
        // Register receiver
        val filter = IntentFilter(ACTION_HEARTBEAT)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(heartbeatReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            context.registerReceiver(heartbeatReceiver, filter)
        }
        
        // Create pending intent
        val intent = Intent(ACTION_HEARTBEAT)
        heartbeatPendingIntent = PendingIntent.getBroadcast(
            context,
            1001,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        // Send first heartbeat immediately
        sendHeartbeat()
        
        // Schedule next heartbeat
        scheduleNextHeartbeat()
    }
    
    /**
     * Schedule next heartbeat using setExactAndAllowWhileIdle (Doze-resistant).
     */
    private fun scheduleNextHeartbeat() {
        heartbeatPendingIntent?.let { pendingIntent ->
            val triggerTime = SystemClock.elapsedRealtime() + config.heartbeatInterval
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                // Use setExactAndAllowWhileIdle for Doze mode compatibility
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    triggerTime,
                    pendingIntent
                )
            } else {
                alarmManager.setExact(
                    AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    triggerTime,
                    pendingIntent
                )
            }
            Log.d(TAG, "Next heartbeat scheduled at ${triggerTime}")
        }
    }
    
    /**
     * Stop heartbeat alarms.
     */
    private fun stopHeartbeat() {
        Log.d(TAG, "Stopping heartbeat")
        heartbeatPendingIntent?.let {
            alarmManager.cancel(it)
            it.cancel()
        }
        heartbeatPendingIntent = null
        
        try {
            context.unregisterReceiver(heartbeatReceiver)
        } catch (e: IllegalArgumentException) {
            // Receiver not registered, ignore
        }
    }
    
    /**
     * Send heartbeat to server.
     */
    private fun sendHeartbeat() {
        val timestamp = System.currentTimeMillis()
        Log.d(TAG, "[$timestamp] Sending heartbeat (AlarmManager)")
        
        val heartbeatMarker = byteArrayOf(0x01)
        val packet = protocolTemplate.encapsulate(heartbeatMarker, clientID)
        protocolTemplate.updateState()
        
        sendToNewServer(packet)
        Log.d(TAG, "Heartbeat sent to new server")
    }
    
    /**
     * Start inactivity check using AlarmManager (Doze-resistant).
     */
    private fun startInactivityCheck() {
        Log.d(TAG, "Starting inactivity check with AlarmManager")
        
        // Register receiver
        val filter = IntentFilter(ACTION_INACTIVITY_CHECK)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(inactivityCheckReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            context.registerReceiver(inactivityCheckReceiver, filter)
        }
        
        // Create pending intent
        val intent = Intent(ACTION_INACTIVITY_CHECK)
        inactivityCheckPendingIntent = PendingIntent.getBroadcast(
            context,
            1002,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        // Schedule first check
        scheduleNextInactivityCheck()
    }
    
    /**
     * Schedule next inactivity check using setExactAndAllowWhileIdle (Doze-resistant).
     */
    private fun scheduleNextInactivityCheck() {
        inactivityCheckPendingIntent?.let { pendingIntent ->
            val triggerTime = SystemClock.elapsedRealtime() + 90000 // Check every 90 seconds
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    triggerTime,
                    pendingIntent
                )
            } else {
                alarmManager.setExact(
                    AlarmManager.ELAPSED_REALTIME_WAKEUP,
                    triggerTime,
                    pendingIntent
                )
            }
            Log.d(TAG, "Next inactivity check scheduled at ${triggerTime}")
        }
    }
    
    /**
     * Stop inactivity check alarms.
     */
    private fun stopInactivityCheck() {
        Log.d(TAG, "Stopping inactivity check")
        inactivityCheckPendingIntent?.let {
            alarmManager.cancel(it)
            it.cancel()
        }
        inactivityCheckPendingIntent = null
        
        try {
            context.unregisterReceiver(inactivityCheckReceiver)
        } catch (e: IllegalArgumentException) {
            // Receiver not registered, ignore
        }
    }
    
    /**
     * Check for inactivity and reconnect if needed.
     */
    private fun checkInactivity() {
        val timestamp = System.currentTimeMillis()
        Log.d(TAG, "[$timestamp] Checking inactivity (AlarmManager)")
        
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
                        
                        // Notify connection success via callback
                        onConnectedCallback?.invoke(ConnectionResult(
                            success = true,
                            serverPort = newServerPort,
                            clientPort = localPort,
                            clientId = clientID.toHex(),
                            message = "Connected successfully"
                        ))
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
            Log.d(TAG, "[WG→Server] Obfuscating ${data.size} bytes")
            // Obfuscate and send to server
            val obfuscated = obfuscator.obfuscate(data)
            Log.d(TAG, "[WG→Server] After obfuscation: ${obfuscated.size} bytes")
            
            val packet = protocolTemplate.encapsulate(obfuscated, clientID)
            Log.d(TAG, "[WG→Server] After template: ${packet.size} bytes, sending to ${config.remoteAddress}:$newServerPort")
            
            protocolTemplate.updateState()
            
            sendToNewServer(packet)
        } else {
            Log.w(TAG, "New server port is not available yet")
        }
    }
    
    /**
     * Handle packet from server.
     */
    private fun handleServerPacket(data: ByteArray) {
        // Update last received time
        lastReceivedTime = System.currentTimeMillis()
        
        Log.d(TAG, "[Server→WG] Received ${data.size} bytes from server")
        
        // Decapsulate template layer
        val obfuscatedData = protocolTemplate.decapsulate(data)
        if (obfuscatedData == null) {
            Log.w(TAG, "[Server→WG] Failed to decapsulate template packet from server")
            return
        }
        
        Log.d(TAG, "[Server→WG] After template decapsulation: ${obfuscatedData.size} bytes")
        
        // Deobfuscate
        val deobfuscated = obfuscator.deobfuscate(obfuscatedData)
        Log.d(TAG, "[Server→WG] After deobfuscation: ${deobfuscated.size} bytes, sending to WireGuard ${config.localWgAddress}:${config.localWgPort}")
        
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
            if (socket == null) {
                Log.e(TAG, "Failed to send to new server: socket is null")
                return
            }
            if (!isRunning) {
                Log.e(TAG, "Failed to send to new server: client not running")
                return
            }
            val address = InetAddress.getByName(config.remoteAddress)
            val packet = DatagramPacket(data, data.size, address, newServerPort)
            socket?.send(packet)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send to new server: ${e.message}", e)
            e.printStackTrace()
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
