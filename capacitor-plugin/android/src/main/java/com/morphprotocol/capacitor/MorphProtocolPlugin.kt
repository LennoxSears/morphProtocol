package com.morphprotocol.capacitor

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.morphprotocol.client.MorphClient
import com.morphprotocol.client.config.ClientConfig
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

@CapacitorPlugin(name = "MorphProtocol")
class MorphProtocolPlugin : Plugin() {
    private var morphClient: MorphClient? = null
    private var isConnected = false
    private var clientId: String? = null
    private var serverPort: Int? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    @PluginMethod
    fun connect(call: PluginCall) {
        if (isConnected) {
            call.reject("Already connected")
            return
        }

        try {
            // Parse connection options
            val remoteAddress = call.getString("remoteAddress")
                ?: return call.reject("remoteAddress is required")
            val remotePort = call.getInt("remotePort")
                ?: return call.reject("remotePort is required")
            val userId = call.getString("userId")
                ?: return call.reject("userId is required")
            val encryptionKey = call.getString("encryptionKey")
                ?: return call.reject("encryptionKey is required")

            // Optional parameters with defaults
            val localWgAddress = call.getString("localWgAddress", "127.0.0.1")
            val localWgPort = call.getInt("localWgPort", 51820)
            val obfuscationLayer = call.getInt("obfuscationLayer", 3)
            val paddingLength = call.getInt("paddingLength", 8)
            val heartbeatInterval = call.getLong("heartbeatInterval", 120000L)
            val inactivityTimeout = call.getLong("inactivityTimeout", 30000L)
            val maxRetries = call.getInt("maxRetries", 10)
            val handshakeInterval = call.getLong("handshakeInterval", 5000L)
            val password = call.getString("password", "bumoyu123")

            // Create configuration
            val config = ClientConfig(
                remoteAddress = remoteAddress,
                remotePort = remotePort,
                userId = userId,
                encryptionKey = encryptionKey,
                localWgAddress = localWgAddress,
                localWgPort = localWgPort,
                obfuscationLayer = obfuscationLayer,
                paddingLength = paddingLength,
                heartbeatInterval = heartbeatInterval,
                inactivityTimeout = inactivityTimeout,
                maxRetries = maxRetries,
                handshakeInterval = handshakeInterval,
                password = password
            )

            // Create and start client
            morphClient = MorphClient(config)

            scope.launch {
                try {
                    morphClient?.startAsync()
                    isConnected = true

                    // Notify listeners
                    val event = JSObject()
                    event.put("type", "connected")
                    event.put("message", "Connected to MorphProtocol server")
                    notifyListeners("connected", event)

                    // Return success
                    val result = JSObject()
                    result.put("success", true)
                    result.put("message", "Connected successfully")
                    result.put("clientId", clientId)
                    call.resolve(result)
                } catch (e: Exception) {
                    isConnected = false
                    morphClient = null

                    // Notify listeners
                    val event = JSObject()
                    event.put("type", "error")
                    event.put("message", "Connection failed: ${e.message}")
                    notifyListeners("error", event)

                    call.reject("Connection failed: ${e.message}")
                }
            }
        } catch (e: Exception) {
            call.reject("Failed to connect: ${e.message}")
        }
    }

    @PluginMethod
    fun disconnect(call: PluginCall) {
        if (!isConnected) {
            call.reject("Not connected")
            return
        }

        scope.launch {
            try {
                morphClient?.stopAsync()
                isConnected = false
                clientId = null
                serverPort = null
                morphClient = null

                // Notify listeners
                val event = JSObject()
                event.put("type", "disconnected")
                event.put("message", "Disconnected from MorphProtocol server")
                notifyListeners("disconnected", event)

                val result = JSObject()
                result.put("success", true)
                result.put("message", "Disconnected successfully")
                call.resolve(result)
            } catch (e: Exception) {
                call.reject("Failed to disconnect: ${e.message}")
            }
        }
    }

    @PluginMethod
    fun getStatus(call: PluginCall) {
        val result = JSObject()
        result.put("connected", isConnected)
        result.put("status", if (isConnected) "Connected" else "Disconnected")

        if (isConnected) {
            clientId?.let { result.put("clientId", it) }
            serverPort?.let { result.put("serverPort", it) }
        }

        call.resolve(result)
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        scope.launch {
            try {
                morphClient?.stopAsync()
            } catch (e: Exception) {
                // Ignore errors during cleanup
            }
        }
    }
}
