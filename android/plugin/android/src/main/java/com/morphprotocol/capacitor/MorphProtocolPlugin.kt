package com.morphprotocol.capacitor

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.Message
import android.os.Messenger
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.morphprotocol.client.test.ObfuscationDebugTest

@CapacitorPlugin(name = "MorphProtocol")
class MorphProtocolPlugin : Plugin() {
    private var serviceMessenger: Messenger? = null
    private var serviceConnection: ServiceConnection? = null
    private var isBound = false

    override fun load() {
        super.load()
        
        serviceConnection = object : ServiceConnection {
            override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
                serviceMessenger = Messenger(service)
                isBound = true
            }
            
            override fun onServiceDisconnected(name: ComponentName?) {
                serviceMessenger = null
                isBound = false
            }
        }
        
        // Start and bind to service
        startService()
    }
    
    @PluginMethod
    fun startService(call: PluginCall? = null) {
        try {
            val context = activity.applicationContext
            val intent = Intent(context, MorphProtocolService::class.java)
            context.startService(intent)
            context.bindService(intent, serviceConnection!!, Context.BIND_AUTO_CREATE)
            
            call?.resolve(JSObject().apply {
                put("success", true)
                put("message", "Service started successfully")
            })
        } catch (e: Exception) {
            call?.reject("Failed to start service: ${e.message}")
        }
    }
    
    @PluginMethod
    fun stopService(call: PluginCall) {
        try {
            val context = activity.applicationContext
            if (isBound) {
                context.unbindService(serviceConnection!!)
                val intent = Intent(context, MorphProtocolService::class.java)
                context.stopService(intent)
                serviceMessenger = null
                isBound = false
            }
            
            call.resolve(JSObject().apply {
                put("success", true)
                put("message", "Service stopped successfully")
            })
        } catch (e: Exception) {
            call.reject("Failed to stop service: ${e.message}")
        }
    }
    
    @PluginMethod
    fun connect(call: PluginCall) {
        if (serviceMessenger == null) {
            call.reject("Service not connected")
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
            val localWgAddress = call.getString("localWgAddress") ?: "127.0.0.1"
            val localWgPort = call.getInt("localWgPort") ?: 51820
            val obfuscationLayer = call.getInt("obfuscationLayer") ?: 3
            val paddingLength = call.getInt("paddingLength") ?: 8
            val heartbeatInterval = call.getLong("heartbeatInterval") ?: 30000L
            val inactivityTimeout = call.getLong("inactivityTimeout") ?: 180000L
            val maxRetries = call.getInt("maxRetries") ?: 10
            val handshakeInterval = call.getLong("handshakeInterval") ?: 5000L
            val password = call.getString("password") ?: "bumoyu123"
            
            // Create message with connection parameters
            val message = Message.obtain(null, MorphProtocolService.MSG_CONNECT)
            message.data = Bundle().apply {
                putString(MorphProtocolService.KEY_REMOTE_ADDRESS, remoteAddress)
                putInt(MorphProtocolService.KEY_REMOTE_PORT, remotePort)
                putString(MorphProtocolService.KEY_USER_ID, userId)
                putString(MorphProtocolService.KEY_ENCRYPTION_KEY, encryptionKey)
                putString(MorphProtocolService.KEY_LOCAL_WG_ADDRESS, localWgAddress)
                putInt(MorphProtocolService.KEY_LOCAL_WG_PORT, localWgPort)
                putInt(MorphProtocolService.KEY_OBFUSCATION_LAYER, obfuscationLayer)
                putInt(MorphProtocolService.KEY_PADDING_LENGTH, paddingLength)
                putLong(MorphProtocolService.KEY_HEARTBEAT_INTERVAL, heartbeatInterval)
                putLong(MorphProtocolService.KEY_INACTIVITY_TIMEOUT, inactivityTimeout)
                putInt(MorphProtocolService.KEY_MAX_RETRIES, maxRetries)
                putLong(MorphProtocolService.KEY_HANDSHAKE_INTERVAL, handshakeInterval)
                putString(MorphProtocolService.KEY_PASSWORD, password)
            }
            
            message.replyTo = Messenger(object : Handler(Looper.getMainLooper()) {
                override fun handleMessage(msg: Message) {
                    when (msg.what) {
                        MorphProtocolService.MSG_CONNECT_SUCCESS -> {
                            val data = msg.data
                            val result = JSObject().apply {
                                put("success", data.getBoolean(MorphProtocolService.KEY_SUCCESS))
                                put("message", data.getString(MorphProtocolService.KEY_MESSAGE))
                                put("clientId", data.getString(MorphProtocolService.KEY_CLIENT_ID))
                                put("serverPort", data.getInt(MorphProtocolService.KEY_SERVER_PORT))
                                put("clientPort", data.getInt(MorphProtocolService.KEY_CLIENT_PORT))
                            }
                            
                            // Notify listeners
                            notifyListeners("connected", result)
                            call.resolve(result)
                        }
                        MorphProtocolService.MSG_CONNECT_ERROR -> {
                            val data = msg.data
                            val message = data.getString(MorphProtocolService.KEY_MESSAGE) ?: "Connection failed"
                            
                            // Notify listeners
                            notifyListeners("error", JSObject().apply {
                                put("type", "error")
                                put("message", message)
                            })
                            call.reject(message)
                        }
                    }
                }
            })
            
            serviceMessenger?.send(message)
        } catch (e: Exception) {
            call.reject("Failed to connect: ${e.message}")
        }
    }

    @PluginMethod
    fun disconnect(call: PluginCall) {
        if (serviceMessenger == null) {
            call.reject("Service not connected")
            return
        }
        
        try {
            val message = Message.obtain(null, MorphProtocolService.MSG_DISCONNECT)
            message.replyTo = Messenger(object : Handler(Looper.getMainLooper()) {
                override fun handleMessage(msg: Message) {
                    when (msg.what) {
                        MorphProtocolService.MSG_DISCONNECT_SUCCESS -> {
                            val data = msg.data
                            val result = JSObject().apply {
                                put("success", data.getBoolean(MorphProtocolService.KEY_SUCCESS))
                                put("message", data.getString(MorphProtocolService.KEY_MESSAGE))
                            }
                            
                            // Notify listeners
                            notifyListeners("disconnected", result)
                            call.resolve(result)
                        }
                        MorphProtocolService.MSG_DISCONNECT_ERROR -> {
                            val data = msg.data
                            val message = data.getString(MorphProtocolService.KEY_MESSAGE) ?: "Disconnection failed"
                            call.reject(message)
                        }
                    }
                }
            })
            
            serviceMessenger?.send(message)
        } catch (e: Exception) {
            call.reject("Failed to disconnect: ${e.message}")
        }
    }
    
    @PluginMethod
    fun getStatus(call: PluginCall) {
        if (serviceMessenger == null) {
            call.reject("Service not connected")
            return
        }
        
        try {
            val message = Message.obtain(null, MorphProtocolService.MSG_GET_STATUS)
            message.replyTo = Messenger(object : Handler(Looper.getMainLooper()) {
                override fun handleMessage(msg: Message) {
                    when (msg.what) {
                        MorphProtocolService.MSG_STATUS_RESPONSE -> {
                            val data = msg.data
                            val result = JSObject().apply {
                                put("connected", data.getBoolean(MorphProtocolService.KEY_CONNECTED))
                                put("status", data.getString(MorphProtocolService.KEY_STATUS))
                                if (data.containsKey(MorphProtocolService.KEY_CLIENT_ID)) {
                                    put("clientId", data.getString(MorphProtocolService.KEY_CLIENT_ID))
                                }
                                if (data.containsKey(MorphProtocolService.KEY_SERVER_PORT)) {
                                    put("serverPort", data.getInt(MorphProtocolService.KEY_SERVER_PORT))
                                }
                                if (data.containsKey(MorphProtocolService.KEY_CLIENT_PORT)) {
                                    put("clientPort", data.getInt(MorphProtocolService.KEY_CLIENT_PORT))
                                }
                            }
                            call.resolve(result)
                        }
                    }
                }
            })
            
            serviceMessenger?.send(message)
        } catch (e: Exception) {
            call.reject("Failed to get status: ${e.message}")
        }
    }
    
    @PluginMethod
    fun testObfuscation(call: PluginCall) {
        try {
            val testResults = ObfuscationDebugTest.runTests()
            val result = JSObject().apply {
                put("success", true)
                put("results", testResults)
            }
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("Test failed: ${e.message}")
        }
    }
    
    override fun handleOnDestroy() {
        super.handleOnDestroy()
        try {
            if (isBound) {
                activity.applicationContext.unbindService(serviceConnection!!)
            }
        } catch (e: Exception) {
            // Ignore errors during cleanup
        }
    }
}
