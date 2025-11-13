# MorphProtocol Android Client - Usage Guide

## Quick Start

### 1. Add Dependencies

Add to your `build.gradle.kts`:

```kotlin
dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")
    implementation("com.google.code.gson:gson:2.10.1")
    implementation("org.bouncycastle:bcprov-jdk15on:1.70")
}
```

### 2. Basic Usage

```kotlin
import com.morphprotocol.client.MorphClient
import com.morphprotocol.client.config.ClientConfig

fun main() {
    // Create configuration
    val config = ClientConfig(
        remoteAddress = "your.server.com",
        remotePort = 12301,
        userId = "user123",
        encryptionKey = "base64key:base64iv"
    )
    
    // Create and start client
    val client = MorphClient(config)
    client.start()
    
    // Client is now running...
    
    // Stop client when done
    client.stop()
}
```

### 3. Async Usage (Recommended)

```kotlin
import kotlinx.coroutines.runBlocking

fun main() = runBlocking {
    val config = ClientConfig(
        remoteAddress = "your.server.com",
        remotePort = 12301,
        userId = "user123",
        encryptionKey = "base64key:base64iv"
    )
    
    val client = MorphClient(config)
    
    // Start asynchronously
    client.startAsync()
    
    // Do other work...
    
    // Stop asynchronously
    client.stopAsync()
}
```

## Configuration Options

### Required Parameters

```kotlin
ClientConfig(
    remoteAddress = "server.example.com",  // Server hostname or IP
    remotePort = 12301,                     // Server handshake port
    userId = "user123",                     // Your user ID
    encryptionKey = "base64key:base64iv"    // Encryption key from server
)
```

### Optional Parameters

```kotlin
ClientConfig(
    // ... required parameters ...
    
    // Local WireGuard connection
    localWgAddress = "127.0.0.1",          // Default: 127.0.0.1
    localWgPort = 51820,                    // Default: 51820
    
    // Obfuscation settings
    obfuscationLayer = 3,                   // Default: 3 (1-4 layers)
    paddingLength = 8,                      // Default: 8 (1-8 bytes)
    
    // Connection settings
    heartbeatInterval = 120000L,            // Default: 2 minutes
    inactivityTimeout = 30000L,             // Default: 30 seconds
    maxRetries = 10,                        // Default: 10
    handshakeInterval = 5000L,              // Default: 5 seconds
    
    // Encryption password
    password = "bumoyu123"                  // Default: bumoyu123
)
```

## Android VPN Integration

### Step 1: Create VPN Service

```kotlin
import android.net.VpnService
import android.content.Intent
import com.morphprotocol.client.MorphClient
import com.morphprotocol.client.config.ClientConfig
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MorphVpnService : VpnService() {
    private lateinit var morphClient: MorphClient
    private val scope = CoroutineScope(Dispatchers.IO)
    
    override fun onCreate() {
        super.onCreate()
        
        // Get configuration from preferences or intent
        val config = ClientConfig(
            remoteAddress = "your.server.com",
            remotePort = 12301,
            userId = getUserId(),
            encryptionKey = getEncryptionKey(),
            localWgAddress = "127.0.0.1",
            localWgPort = 51820
        )
        
        morphClient = MorphClient(config)
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Start MorphProtocol client
        scope.launch {
            morphClient.startAsync()
        }
        
        return START_STICKY
    }
    
    override fun onDestroy() {
        // Stop MorphProtocol client
        scope.launch {
            morphClient.stopAsync()
        }
        
        super.onDestroy()
    }
    
    private fun getUserId(): String {
        // Get from SharedPreferences or other storage
        return "user123"
    }
    
    private fun getEncryptionKey(): String {
        // Get from server or secure storage
        return "base64key:base64iv"
    }
}
```

### Step 2: Add to AndroidManifest.xml

```xml
<manifest>
    <application>
        <service
            android:name=".MorphVpnService"
            android:permission="android.permission.BIND_VPN_SERVICE">
            <intent-filter>
                <action android:name="android.net.VpnService" />
            </intent-filter>
        </service>
    </application>
    
    <uses-permission android:name="android.permission.INTERNET" />
</manifest>
```

### Step 3: Start VPN from Activity

```kotlin
import android.app.Activity
import android.content.Intent
import android.net.VpnService

class MainActivity : Activity() {
    private val VPN_REQUEST_CODE = 1
    
    fun startVpn() {
        // Request VPN permission
        val intent = VpnService.prepare(this)
        if (intent != null) {
            startActivityForResult(intent, VPN_REQUEST_CODE)
        } else {
            onActivityResult(VPN_REQUEST_CODE, RESULT_OK, null)
        }
    }
    
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        if (requestCode == VPN_REQUEST_CODE && resultCode == RESULT_OK) {
            // Start VPN service
            val serviceIntent = Intent(this, MorphVpnService::class.java)
            startService(serviceIntent)
        }
    }
    
    fun stopVpn() {
        val serviceIntent = Intent(this, MorphVpnService::class.java)
        stopService(serviceIntent)
    }
}
```

## Advanced Usage

### Custom Obfuscation Settings

```kotlin
// Maximum obfuscation (4 layers, 8 bytes padding)
val maxObfuscation = ClientConfig(
    remoteAddress = "server.example.com",
    remotePort = 12301,
    userId = "user123",
    encryptionKey = "base64key:base64iv",
    obfuscationLayer = 4,
    paddingLength = 8
)

// Minimum obfuscation (1 layer, 1 byte padding)
val minObfuscation = ClientConfig(
    remoteAddress = "server.example.com",
    remotePort = 12301,
    userId = "user123",
    encryptionKey = "base64key:base64iv",
    obfuscationLayer = 1,
    paddingLength = 1
)
```

### Connection Monitoring

```kotlin
class MonitoredMorphClient(config: ClientConfig) {
    private val client = MorphClient(config)
    private var isConnected = false
    
    suspend fun start() {
        try {
            client.startAsync()
            isConnected = true
            println("Connected to server")
        } catch (e: Exception) {
            isConnected = false
            println("Failed to connect: ${e.message}")
        }
    }
    
    suspend fun stop() {
        try {
            client.stopAsync()
            isConnected = false
            println("Disconnected from server")
        } catch (e: Exception) {
            println("Error during disconnect: ${e.message}")
        }
    }
    
    fun getConnectionStatus(): Boolean = isConnected
}
```

### Error Handling

```kotlin
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.withTimeout

suspend fun connectWithTimeout(config: ClientConfig, timeoutMs: Long = 30000L) {
    val client = MorphClient(config)
    
    try {
        withTimeout(timeoutMs) {
            client.startAsync()
        }
        println("Connected successfully")
    } catch (e: TimeoutCancellationException) {
        println("Connection timeout after ${timeoutMs}ms")
        client.stopAsync()
    } catch (e: Exception) {
        println("Connection error: ${e.message}")
        client.stopAsync()
    }
}
```

## Troubleshooting

### Connection Issues

1. **"Max retries reached"**
   - Check server address and port
   - Verify encryption key is correct
   - Ensure server is running and accessible

2. **"Server is full"**
   - Server has reached maximum client capacity
   - Try again later or contact server administrator

3. **"Inactivity detected"**
   - Network connection lost
   - Client will automatically reconnect with new parameters

### Performance Tuning

```kotlin
// For high-latency networks
val highLatencyConfig = ClientConfig(
    remoteAddress = "server.example.com",
    remotePort = 12301,
    userId = "user123",
    encryptionKey = "base64key:base64iv",
    heartbeatInterval = 180000L,  // 3 minutes
    inactivityTimeout = 60000L,   // 1 minute
    maxRetries = 20
)

// For low-latency networks
val lowLatencyConfig = ClientConfig(
    remoteAddress = "server.example.com",
    remotePort = 12301,
    userId = "user123",
    encryptionKey = "base64key:base64iv",
    heartbeatInterval = 60000L,   // 1 minute
    inactivityTimeout = 15000L,   // 15 seconds
    maxRetries = 5
)
```

## Security Best Practices

1. **Store encryption keys securely**
   ```kotlin
   // Use Android Keystore or encrypted SharedPreferences
   val encryptionKey = secureStorage.getEncryptionKey()
   ```

2. **Validate server certificates**
   ```kotlin
   // Implement certificate pinning for production
   ```

3. **Use strong passwords**
   ```kotlin
   val config = ClientConfig(
       // ...
       password = generateStrongPassword()
   )
   ```

4. **Clear sensitive data on logout**
   ```kotlin
   fun logout() {
       client.stop()
       secureStorage.clearEncryptionKey()
       secureStorage.clearUserId()
   }
   ```

## Protocol Compatibility

This Android client is **100% compatible** with the TypeScript server:

- ✅ Same handshake protocol
- ✅ Same encryption (AES-256-CBC)
- ✅ Same obfuscation functions (11 reversible transformations)
- ✅ Same protocol templates (QUIC, KCP, Generic Gaming)
- ✅ Same packet format
- ✅ IP migration support
- ✅ Automatic reconnection

## License

ISC
