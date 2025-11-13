# MorphProtocol Android Client

Android/Kotlin implementation of the MorphProtocol client that communicates with the TypeScript server.

## Features

- ✅ AES-256-CBC encryption with RSA key exchange
- ✅ 11 reversible obfuscation functions
- ✅ Multi-layer obfuscation (1-4 layers)
- ✅ Protocol template support (QUIC, KCP, Generic Gaming)
- ✅ UDP transport with automatic reconnection
- ✅ IP migration support (QUIC-style)
- ✅ Heartbeat mechanism
- ✅ Inactivity detection and auto-reconnect

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MorphProtocol Client                      │
├─────────────────────────────────────────────────────────────┤
│  Network Layer                                               │
│  ├── MorphUdpClient (main client logic)                     │
│  ├── Handshake protocol                                      │
│  ├── Heartbeat mechanism                                     │
│  └── IP migration support                                    │
├─────────────────────────────────────────────────────────────┤
│  Protocol Layer                                              │
│  ├── ProtocolTemplate (base)                                │
│  ├── QuicTemplate                                            │
│  ├── KcpTemplate                                             │
│  └── GenericGamingTemplate                                   │
├─────────────────────────────────────────────────────────────┤
│  Obfuscation Layer                                           │
│  ├── Obfuscator (multi-layer engine)                        │
│  ├── FunctionRegistry (11 functions)                        │
│  └── FunctionInitializer                                     │
├─────────────────────────────────────────────────────────────┤
│  Crypto Layer                                                │
│  └── Encryptor (AES-256-CBC + RSA)                          │
└─────────────────────────────────────────────────────────────┘
```

## Dependencies

- Kotlin 1.9.20+
- Bouncy Castle (crypto provider)
- Gson (JSON serialization)
- Kotlin Coroutines

## Usage

### Basic Example

```kotlin
import com.morphprotocol.client.MorphClient
import com.morphprotocol.client.config.ClientConfig

// Create configuration
val config = ClientConfig(
    remoteAddress = "192.168.1.100",
    remotePort = 12301,
    userId = "user123",
    encryptionKey = "base64key:base64iv",
    localWgAddress = "127.0.0.1",
    localWgPort = 51820
)

// Create and start client
val client = MorphClient(config)
client.start()

// Stop client
client.stop()
```

### Advanced Configuration

```kotlin
val config = ClientConfig(
    remoteAddress = "192.168.1.100",
    remotePort = 12301,
    userId = "user123",
    encryptionKey = "base64key:base64iv",
    localWgAddress = "127.0.0.1",
    localWgPort = 51820,
    obfuscationLayer = 3,
    paddingLength = 8,
    heartbeatInterval = 120000L,  // 2 minutes
    inactivityTimeout = 30000L,   // 30 seconds
    maxRetries = 10
)
```

## Project Structure

```
android-client/
├── src/main/kotlin/com/morphprotocol/client/
│   ├── crypto/
│   │   └── Encryptor.kt              # AES-256-CBC + RSA encryption
│   ├── core/
│   │   ├── functions/
│   │   │   ├── BitwiseRotationAndXOR.kt
│   │   │   ├── SwapNeighboringBytes.kt
│   │   │   ├── ReverseBuffer.kt
│   │   │   ├── DivideAndSwap.kt
│   │   │   ├── CircularShiftObfuscation.kt
│   │   │   ├── XorWithKey.kt
│   │   │   ├── BitwiseNOT.kt
│   │   │   ├── ReverseBits.kt
│   │   │   ├── ShiftBits.kt
│   │   │   ├── Substitution.kt
│   │   │   └── AddRandomValue.kt
│   │   ├── FunctionRegistry.kt       # Function management
│   │   ├── FunctionInitializer.kt    # Random parameter generation
│   │   ├── Obfuscator.kt             # Multi-layer obfuscation engine
│   │   └── templates/
│   │       ├── ProtocolTemplate.kt   # Base template interface
│   │       ├── QuicTemplate.kt       # QUIC protocol mimicry
│   │       ├── KcpTemplate.kt        # KCP protocol mimicry
│   │       ├── GenericGamingTemplate.kt
│   │       ├── TemplateFactory.kt    # Template creation
│   │       └── TemplateSelector.kt   # Random template selection
│   ├── network/
│   │   └── MorphUdpClient.kt         # Main UDP client
│   ├── config/
│   │   └── ClientConfig.kt           # Configuration data class
│   ├── utils/
│   │   └── Logger.kt                 # Logging utilities
│   └── MorphClient.kt                # Public API facade
├── build.gradle.kts
└── README.md
```

## Building

```bash
cd android-client
./gradlew build
```

## Testing

```bash
./gradlew test
```

## Integration with Android VPN

To integrate with Android VPN service:

```kotlin
class MorphVpnService : VpnService() {
    private lateinit var morphClient: MorphClient
    
    override fun onCreate() {
        super.onCreate()
        
        val config = ClientConfig(
            remoteAddress = "your.server.com",
            remotePort = 12301,
            userId = "user123",
            encryptionKey = getEncryptionKey(),
            localWgAddress = "127.0.0.1",
            localWgPort = 51820
        )
        
        morphClient = MorphClient(config)
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        morphClient.start()
        return START_STICKY
    }
    
    override fun onDestroy() {
        morphClient.stop()
        super.onDestroy()
    }
}
```

## Protocol Compatibility

This Android client is **100% compatible** with the TypeScript server. It implements:

- Same handshake protocol (encrypted JSON)
- Same obfuscation functions (11 reversible transformations)
- Same protocol templates (QUIC, KCP, Generic Gaming)
- Same packet format (3-byte header + obfuscated data + padding)
- Same encryption (AES-256-CBC)

## Security Notes

- ClientID is transmitted in plaintext for performance (industry standard)
- All payload data is encrypted with AES-256-CBC
- Obfuscation provides DPI resistance
- Random padding prevents packet size analysis
- Dynamic function selection prevents pattern recognition

## License

ISC

## Contributing

Contributions welcome! Please ensure all tests pass before submitting PRs.
