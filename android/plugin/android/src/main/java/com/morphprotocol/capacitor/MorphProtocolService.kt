package com.morphprotocol.capacitor

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.Message
import android.os.Messenger
import android.os.RemoteException
import android.util.Log
import androidx.core.app.NotificationCompat
import com.morphprotocol.client.ConnectionResult
import com.morphprotocol.client.MorphClient
import com.morphprotocol.client.config.ClientConfig

import java.lang.ref.WeakReference

/**
 * Background service for MorphProtocol client.
 * Keeps the VPN connection alive even when the app is in the background.
 */
class MorphProtocolService : Service() {
    
    companion object {
        private const val TAG = "MorphProtocolService"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "morph_protocol_channel"
        
        // Message types
        const val MSG_CONNECT = 1
        const val MSG_CONNECT_SUCCESS = 2
        const val MSG_CONNECT_ERROR = 3
        const val MSG_DISCONNECT = 4
        const val MSG_DISCONNECT_SUCCESS = 5
        const val MSG_DISCONNECT_ERROR = 6
        const val MSG_GET_STATUS = 7
        const val MSG_STATUS_RESPONSE = 8
        
        // Bundle keys
        const val KEY_REMOTE_ADDRESS = "remoteAddress"
        const val KEY_REMOTE_PORT = "remotePort"
        const val KEY_USER_ID = "userId"
        const val KEY_ENCRYPTION_KEY = "encryptionKey"
        const val KEY_LOCAL_WG_ADDRESS = "localWgAddress"
        const val KEY_LOCAL_WG_PORT = "localWgPort"
        const val KEY_OBFUSCATION_LAYER = "obfuscationLayer"
        const val KEY_PADDING_LENGTH = "paddingLength"
        const val KEY_HEARTBEAT_INTERVAL = "heartbeatInterval"
        const val KEY_INACTIVITY_TIMEOUT = "inactivityTimeout"
        const val KEY_MAX_RETRIES = "maxRetries"
        const val KEY_HANDSHAKE_INTERVAL = "handshakeInterval"
        const val KEY_PASSWORD = "password"
        
        // Response keys
        const val KEY_SUCCESS = "success"
        const val KEY_MESSAGE = "message"
        const val KEY_CLIENT_ID = "clientId"
        const val KEY_SERVER_PORT = "serverPort"
        const val KEY_CLIENT_PORT = "clientPort"
        const val KEY_CONNECTED = "connected"
        const val KEY_STATUS = "status"
    }
    
    private val messenger: Messenger by lazy {
        Messenger(IncomingHandler(this))
    }
    
    private var morphClient: MorphClient? = null
    private var isConnected = false
    private var clientId: String? = null
    private var serverPort: Int? = null
    private var clientPort: Int? = null
    private var connectThread: Thread? = null
    
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Service created")
        createNotificationChannel()
        startForeground()
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "MorphProtocol VPN",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "MorphProtocol VPN Connection"
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager?.createNotificationChannel(channel)
        }
    }
    
    private fun startForeground() {
        val notification = createNotification("MorphProtocol VPN", "Service running")
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Android 10+ (API 29+) with foreground service type
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
        
        Log.d(TAG, "Service started as foreground")
    }
    
    private fun createNotification(title: String, text: String): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }
    
    private fun updateNotification(title: String, text: String) {
        val notification = createNotification(title, text)
        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager?.notify(NOTIFICATION_ID, notification)
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "Service started")
        return START_NOT_STICKY
    }
    
    override fun onBind(intent: Intent?): IBinder {
        Log.d(TAG, "Service bound")
        return messenger.binder
    }
    
    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "Service destroyed")
        disconnectClient()
    }
    

    
    private fun connectClient(data: Bundle, replyTo: Messenger?) {
        if (isConnected) {
            sendResponse(replyTo, MSG_CONNECT_ERROR, Bundle().apply {
                putBoolean(KEY_SUCCESS, false)
                putString(KEY_MESSAGE, "Already connected")
            })
            return
        }
        
        try {
            // Extract connection parameters
            val remoteAddress = data.getString(KEY_REMOTE_ADDRESS)
                ?: throw IllegalArgumentException("remoteAddress is required")
            val remotePort = data.getInt(KEY_REMOTE_PORT, 0)
            if (remotePort == 0) throw IllegalArgumentException("remotePort is required")
            val userId = data.getString(KEY_USER_ID)
                ?: throw IllegalArgumentException("userId is required")
            val encryptionKey = data.getString(KEY_ENCRYPTION_KEY)
                ?: throw IllegalArgumentException("encryptionKey is required")
            
            // Optional parameters with defaults
            val localWgAddress = data.getString(KEY_LOCAL_WG_ADDRESS) ?: "127.0.0.1"
            val localWgPort = data.getInt(KEY_LOCAL_WG_PORT, 51820)
            val obfuscationLayer = data.getInt(KEY_OBFUSCATION_LAYER, 3)
            val paddingLength = data.getInt(KEY_PADDING_LENGTH, 8)
            val heartbeatInterval = data.getLong(KEY_HEARTBEAT_INTERVAL, 30000L)
            val inactivityTimeout = data.getLong(KEY_INACTIVITY_TIMEOUT, 180000L)
            val maxRetries = data.getInt(KEY_MAX_RETRIES, 10)
            val handshakeInterval = data.getLong(KEY_HANDSHAKE_INTERVAL, 5000L)
            val password = data.getString(KEY_PASSWORD) ?: "bumoyu123"
            
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
            
            // Create and start client in a background thread (like old plugin)
            morphClient = MorphClient(config, this@MorphProtocolService)
            
            connectThread = Thread {
                try {
                    // Start client with callback for connection success
                    morphClient?.start { result ->
                        // This callback is invoked when handshake succeeds
                        isConnected = true
                        clientId = result.clientId
                        serverPort = result.serverPort
                        clientPort = result.clientPort
                        
                        Log.d(TAG, "Connected successfully. Server port: ${result.serverPort}, Client port: ${result.clientPort}")
                        
                        // Update notification
                        updateNotification("MorphProtocol VPN", "Connected to server")
                        
                        sendResponse(replyTo, MSG_CONNECT_SUCCESS, Bundle().apply {
                            putBoolean(KEY_SUCCESS, true)
                            putString(KEY_MESSAGE, result.message)
                            putString(KEY_CLIENT_ID, result.clientId)
                            putInt(KEY_SERVER_PORT, result.serverPort)
                            putInt(KEY_CLIENT_PORT, result.clientPort)
                        })
                    }
                    
                    // start() blocks here in receive loop until stop() is called
                    // When it returns, the connection has been stopped
                    Log.d(TAG, "Client stopped")
                    
                } catch (e: Exception) {
                    isConnected = false
                    morphClient = null
                    
                    Log.e(TAG, "Connection exception: ${e.message}", e)
                    
                    sendResponse(replyTo, MSG_CONNECT_ERROR, Bundle().apply {
                        putBoolean(KEY_SUCCESS, false)
                        putString(KEY_MESSAGE, "Connection failed: ${e.message}")
                    })
                }
            }.apply {
                name = "MorphProtocol-Connect"
                start()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start connection: ${e.message}", e)
            sendResponse(replyTo, MSG_CONNECT_ERROR, Bundle().apply {
                putBoolean(KEY_SUCCESS, false)
                putString(KEY_MESSAGE, "Failed to connect: ${e.message}")
            })
        }
    }
    
    private fun disconnectClient(replyTo: Messenger? = null) {
        if (!isConnected) {
            replyTo?.let {
                sendResponse(it, MSG_DISCONNECT_ERROR, Bundle().apply {
                    putBoolean(KEY_SUCCESS, false)
                    putString(KEY_MESSAGE, "Not connected")
                })
            }
            return
        }
        
        try {
            morphClient?.stop()
            isConnected = false
            clientId = null
            serverPort = null
            clientPort = null
            morphClient = null
            
            connectThread?.interrupt()
            connectThread = null
            
            // Update notification
            updateNotification("MorphProtocol VPN", "Disconnected")
            
            Log.d(TAG, "Disconnected successfully")
            
            replyTo?.let {
                sendResponse(it, MSG_DISCONNECT_SUCCESS, Bundle().apply {
                    putBoolean(KEY_SUCCESS, true)
                    putString(KEY_MESSAGE, "Disconnected successfully")
                })
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to disconnect: ${e.message}", e)
            replyTo?.let {
                sendResponse(it, MSG_DISCONNECT_ERROR, Bundle().apply {
                    putBoolean(KEY_SUCCESS, false)
                    putString(KEY_MESSAGE, "Failed to disconnect: ${e.message}")
                })
            }
        }
    }
    
    private fun getStatus(replyTo: Messenger?) {
        val responseBundle = Bundle().apply {
            putBoolean(KEY_CONNECTED, isConnected)
            putString(KEY_STATUS, if (isConnected) "Connected" else "Disconnected")
            clientId?.let { putString(KEY_CLIENT_ID, it) }
            serverPort?.let { putInt(KEY_SERVER_PORT, it) }
            clientPort?.let { putInt(KEY_CLIENT_PORT, it) }
        }
        sendResponse(replyTo, MSG_STATUS_RESPONSE, responseBundle)
    }
    
    private fun sendResponse(replyTo: Messenger?, what: Int, data: Bundle) {
        if (replyTo == null) {
            Log.w(TAG, "Cannot send response: replyTo is null")
            return
        }
        
        val message = Message.obtain(null, what).apply {
            this.data = data
        }
        
        try {
            replyTo.send(message)
        } catch (e: RemoteException) {
            Log.e(TAG, "Failed to send response: ${e.message}", e)
        }
    }
    
    /**
     * Handler for incoming messages from the plugin.
     */
    private class IncomingHandler(service: MorphProtocolService) : Handler(Looper.getMainLooper()) {
        private val serviceRef = WeakReference(service)
        
        override fun handleMessage(msg: Message) {
            val service = serviceRef.get() ?: return
            
            when (msg.what) {
                MSG_CONNECT -> {
                    Log.d(TAG, "Received MSG_CONNECT")
                    service.connectClient(msg.data, msg.replyTo)
                }
                MSG_DISCONNECT -> {
                    Log.d(TAG, "Received MSG_DISCONNECT")
                    service.disconnectClient(msg.replyTo)
                }
                MSG_GET_STATUS -> {
                    Log.d(TAG, "Received MSG_GET_STATUS")
                    service.getStatus(msg.replyTo)
                }
                else -> super.handleMessage(msg)
            }
        }
    }
}
