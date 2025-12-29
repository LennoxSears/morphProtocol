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
import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.morphprotocol.client.test.ObfuscationDebugTest

@CapacitorPlugin(name = "MorphProtocol")
class MorphProtocolPlugin : Plugin() {
    companion object {
        private const val TAG = "MorphProtocolPlugin"
        private const val PLUGIN_VERSION = "1.0.1"
        private const val BUILD_TIMESTAMP = "2025-12-29T07:18:00Z"
    }
    
    private var serviceMessenger: Messenger? = null
    private var serviceConnection: ServiceConnection? = null
    private var isBound = false

    override fun load() {
        super.load()
        Log.i(TAG, "========================================")
        Log.i(TAG, "MorphProtocol Plugin Loading")
        Log.i(TAG, "Version: $PLUGIN_VERSION")
        Log.i(TAG, "Build: $BUILD_TIMESTAMP")
        Log.i(TAG, "Android Version: ${android.os.Build.VERSION.SDK_INT}")
        Log.i(TAG, "========================================")
        
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
        Log.i(TAG, "========================================")
        Log.i(TAG, "connect() called - PLUGIN VERSION $PLUGIN_VERSION")
        Log.i(TAG, "Build timestamp: $BUILD_TIMESTAMP")
        Log.i(TAG, "isBound: $isBound")
        Log.i(TAG, "serviceMessenger: ${if (serviceMessenger != null) "CONNECTED" else "NULL"}")
        Log.i(TAG, "Android SDK: ${android.os.Build.VERSION.SDK_INT}")
        Log.i(TAG, "========================================")
        
        // Ensure service is bound before attempting connection
        if (!isBound || serviceMessenger == null) {
            Log.w(TAG, "Service not bound yet, waiting 500ms for binding...")
            // Try to wait for service binding (Android 15/16 may take longer)
            Handler(Looper.getMainLooper()).postDelayed({
                if (!isBound || serviceMessenger == null) {
                    Log.e(TAG, "Service still not bound after 500ms - REJECTING")
                    call.reject("Service not connected. Please ensure service is started.")
                    return@postDelayed
                }
                Log.i(TAG, "Service bound after delay, proceeding with connect")
                performConnect(call)
            }, 500) // Wait 500ms for service to bind
            return
        }
        
        Log.i(TAG, "Service already bound, proceeding immediately")
        performConnect(call)
    }
    
    private fun performConnect(call: PluginCall) {
        Log.i(TAG, "performConnect() starting...")
        
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
            
            Log.i(TAG, "Connection params: remoteAddress=$remoteAddress, remotePort=$remotePort, userId=$userId")
            
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
            
            Log.i(TAG, "Sending MSG_CONNECT to service...")
            
            message.replyTo = Messenger(object : Handler(Looper.getMainLooper()) {
                override fun handleMessage(msg: Message) {
                    Log.i(TAG, "Received response from service: msg.what=${msg.what}")
                    when (msg.what) {
                        MorphProtocolService.MSG_CONNECT_SUCCESS -> {
                            Log.i(TAG, "Connection SUCCESS received from service")
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
                            
                            Log.e(TAG, "Connection ERROR received from service: $message")
                            
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
            Log.i(TAG, "Message sent to service successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Exception in performConnect: ${e.message}", e)
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
