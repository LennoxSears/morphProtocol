# morphProtocol Android Port Analysis

## Executive Summary

This document provides a comprehensive analysis of the morphProtocol codebase for porting to Android (Kotlin). The protocol is a sophisticated VPN traffic obfuscation system with multi-layer encryption, dynamic obfuscation, and UDP transport.

---

## 1. CRYPTO/ENCRYPTION LAYER

### 1.1 Core Class: `Encryptor`
**File**: `src/crypto/encryptor.ts`

**Purpose**: Handles AES-256-CBC encryption with RSA key exchange

**Key Methods**:
- `encrypt(text, key, iv)` - AES-256-CBC encryption
- `decrypt(encryptedText, key, iv)` - AES-256-CBC decryption
- `encryptWithPublicKey(data, remotePublicKey)` - RSA-2048 public key encryption
- `decryptWithPrivateKey(encryptedData)` - RSA-2048 private key decryption
- `simpleEncrypt(text)` - Simple AES encryption with pre-shared key
- `simpleDecrypt(encryptedText)` - Simple AES decryption
- `finalEncrypt(text, remotePublicKey)` - Combined AES + RSA encryption
- `finalDecrypt(data)` - Combined decryption

**Dependencies**:
- Node.js `crypto` module → Android: `javax.crypto` + `java.security`
- RSA-2048 key pair generation
- AES-256-CBC cipher
- scrypt for key derivation

**Android Implementation**:
```kotlin
class Encryptor(private val password: String = "bumoyu123") {
    private val algorithm = "AES/CBC/PKCS5Padding"
    private val keyPair: KeyPair
    var simpleKey: ByteArray
    var simpleIv: ByteArray
    
    init {
        // Generate RSA-2048 key pair
        val keyGen = KeyPairGenerator.getInstance("RSA")
        keyGen.initialize(2048)
        keyPair = keyGen.generateKeyPair()
        
        // Generate AES key from password using scrypt
        val salt = generateSalt()
        simpleKey = SCrypt.generate(password.toByteArray(), salt, 16384, 8, 1, 32)
        simpleIv = SecureRandom().generateSeed(16)
    }
    
    fun encrypt(text: String, key: ByteArray, iv: ByteArray): String
    fun decrypt(encryptedText: String, key: ByteArray, iv: ByteArray): String
    fun encryptWithPublicKey(data: String, remotePublicKey: String): String
    fun decryptWithPrivateKey(encryptedData: String): String
}
```

**Implementation Priority**: HIGH (Required for handshake)

---

## 2. OBFUSCATION FUNCTIONS

### 2.1 Function Registry
**File**: `src/core/function-registry.ts`

**Purpose**: Manages 11 reversible obfuscation functions and their combinations

**11 Obfuscation Functions**:

1. **bitwiseRotationAndXOR** - Rotate bits and XOR with key
2. **swapNeighboringBytes** - Swap adjacent bytes
3. **reverseBuffer** - Reverse entire buffer
4. **divideAndSwap** - Split buffer and swap halves
5. **circularShiftObfuscation** - Circular bit shift
6. **xorWithKey** - XOR with rolling key
7. **bitwiseNOT** - Bitwise NOT operation
8. **reverseBits** - Reverse bits within each byte
9. **shiftBits** - Shift bits left/right
10. **substitution** - Byte substitution table (requires init)
11. **addRandomValue** - Add random value modulo 256 (requires init)

**Function Signature**:
```kotlin
typealias HouseFunction = (input: ByteArray, keyArray: ByteArray, initor: Any?) -> ByteArray

data class HouseFunctionPair(
    val obfuscation: HouseFunction,
    val deobfuscation: HouseFunction,
    val initor: Any?,
    val index: Int
)
```

### 2.2 Function Initializer
**File**: `src/core/function-initializer.ts`

**Purpose**: Generate random parameters for functions that need initialization

```kotlin
data class FunctionInitializers(
    val substitutionTable: IntArray,  // 256-element array
    val randomValue: Int              // 0-255
)

fun fnInitor(): FunctionInitializers {
    return FunctionInitializers(
        substitutionTable = generateSubstitutionTable(),
        randomValue = Random.nextInt(256)
    )
}
```

### 2.3 Example Function Implementation

**XOR with Key** (simplest):
```kotlin
fun xorWithKey(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray {
    val obfuscated = ByteArray(input.size)
    for (i in input.indices) {
        obfuscated[i] = (input[i].toInt() xor keyArray[i].toInt()).toByte()
    }
    return obfuscated
}
```

**Substitution** (requires initor):
```kotlin
fun substitution(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray {
    val table = initor as IntArray
    val obfuscated = ByteArray(input.size)
    for (i in input.indices) {
        obfuscated[i] = table[input[i].toInt() and 0xFF].toByte()
    }
    return obfuscated
}

fun deSubstitution(input: ByteArray, keyArray: ByteArray, initor: Any?): ByteArray {
    val table = initor as IntArray
    val deobfuscated = ByteArray(input.size)
    for (i in input.indices) {
        val value = input[i].toInt() and 0xFF
        val index = table.indexOf(value)
        deobfuscated[i] = if (index != -1) index.toByte() else 0
    }
    return deobfuscated
}
```

**Implementation Priority**: HIGH (Core obfuscation)

---

## 3. OBFUSCATOR CLASS

### 3.1 Core Class: `Obfuscator`
**File**: `src/core/obfuscator.ts`

**Purpose**: Applies 1-4 layers of obfuscation with random function selection

**Key Features**:
- Dynamic function combination selection based on header
- Random padding (1-8 bytes)
- 3-byte header: `[random][random][paddingLength]`
- Function combo index = `(header[0] * header[1]) % totalCombinations`

**Packet Structure**:
```
[3-byte header][obfuscated data][random padding]
```

**Android Implementation**:
```kotlin
class Obfuscator(
    private var key: Int,
    obfuscationLayer: Int,
    private val paddingLength: Int,
    funInitor: FunctionInitializers
) {
    private val functionRegistry: FunctionRegistry
    private val obFunCombosLength: Int
    
    init {
        functionRegistry = FunctionRegistry(obfuscationLayer, funInitor)
        obFunCombosLength = functionRegistry.getFunctionPairsIndexCombos().size
    }
    
    fun obfuscation(data: ByteArray): ByteArray {
        // Generate 3-byte header
        val header = ByteArray(3)
        SecureRandom().nextBytes(header)
        
        // Calculate function combo index
        val fnComboIndex = ((header[0].toInt() and 0xFF) * 
                           (header[1].toInt() and 0xFF)) % obFunCombosLength
        
        // Apply obfuscation functions
        var obfuscatedData = data
        val fnCombo = functionRegistry.getFunctionPairsIndexCombos()[fnComboIndex]
        val keyArray = generateKeyArray(obfuscatedData.size)
        
        for (fnIndex in fnCombo) {
            val fn = functionRegistry.functionPairs[fnIndex]
            obfuscatedData = fn.obfuscation(obfuscatedData, keyArray, fn.initor)
        }
        
        // Add random padding
        val actualPaddingLength = Random.nextInt(paddingLength) + 1
        header[2] = actualPaddingLength.toByte()
        val padding = ByteArray(actualPaddingLength)
        SecureRandom().nextBytes(padding)
        
        // Concatenate: header + obfuscated + padding
        return header + obfuscatedData + padding
    }
    
    fun deobfuscation(data: ByteArray): ByteArray {
        // Extract header and body
        val header = data.sliceArray(0..2)
        val paddingLength = header[2].toInt() and 0xFF
        val body = data.sliceArray(3 until data.size - paddingLength)
        
        // Calculate function combo index
        val fnComboIndex = ((header[0].toInt() and 0xFF) * 
                           (header[1].toInt() and 0xFF)) % obFunCombosLength
        
        // Apply deobfuscation in reverse order
        var deobfuscatedData = body
        val fnCombo = functionRegistry.getFunctionPairsIndexCombos()[fnComboIndex]
        val keyArray = generateKeyArray(deobfuscatedData.size)
        
        for (i in fnCombo.indices.reversed()) {
            val fn = functionRegistry.functionPairs[fnCombo[i]]
            deobfuscatedData = fn.deobfuscation(deobfuscatedData, keyArray, fn.initor)
        }
        
        return deobfuscatedData
    }
    
    private fun generateKeyArray(length: Int): ByteArray {
        val keyArray = ByteArray(length)
        for (i in 0 until length) {
            keyArray[i] = ((key + i * 37) % 256).toByte()
        }
        return keyArray
    }
}
```

**Implementation Priority**: HIGH (Core functionality)

---

## 4. PROTOCOL TEMPLATES

### 4.1 Base Template Interface
**File**: `src/core/protocol-templates/base-template.ts`

**Purpose**: Wrap obfuscated data to mimic legitimate protocols (QUIC, KCP, Gaming)

```kotlin
interface ProtocolTemplate {
    val id: Int
    val name: String
    
    fun extractHeaderID(packet: ByteArray): ByteArray?
    fun encapsulate(data: ByteArray, clientID: ByteArray): ByteArray
    fun decapsulate(packet: ByteArray): ByteArray?
    fun getParams(): Map<String, Any>
    fun updateState()
}
```

### 4.2 Three Template Types

**Template 1: QUIC (ID: 1)**
- Header: 11 bytes `[1 flags][8 connID][2 packetNum]`
- HeaderID: 8-byte Connection ID (bytes 1-8)
- Overhead: 11 bytes

**Template 2: KCP (ID: 2)**
- Header: 24 bytes `[4 conv][1 cmd][1 frg][2 wnd][4 ts][4 sn][4 una][4 len]`
- HeaderID: 4-byte Conv (bytes 0-3)
- Overhead: 24 bytes

**Template 3: Generic Gaming (ID: 3)**
- Header: 12 bytes `[4 "GAME"][4 sessionID][2 seq][1 type][1 flags]`
- HeaderID: 4-byte Session ID (bytes 4-7)
- Overhead: 12 bytes

### 4.3 Android Implementation Example (QUIC)

```kotlin
class QuicTemplate(params: Map<String, Any>? = null) : BaseTemplate(params) {
    override val id = 1
    override val name = "QUIC Gaming"
    
    override fun extractHeaderID(packet: ByteArray): ByteArray? {
        if (packet.size < 9) return null
        return packet.sliceArray(1..8)
    }
    
    override fun encapsulate(data: ByteArray, clientID: ByteArray): ByteArray {
        val header = ByteArray(11)
        
        // Flags: 0x40-0x4f (QUIC short header)
        header[0] = (0x40 or Random.nextInt(16)).toByte()
        
        // Connection ID: first 8 bytes of clientID
        clientID.copyInto(header, 1, 0, 8)
        
        // Packet number: sequence (2 bytes)
        header[9] = (sequenceNumber shr 8).toByte()
        header[10] = (sequenceNumber and 0xFF).toByte()
        
        return header + data
    }
    
    override fun decapsulate(packet: ByteArray): ByteArray? {
        if (packet.size < 11) return null
        return packet.sliceArray(11 until packet.size)
    }
}
```

**Implementation Priority**: MEDIUM (Enhances DPI resistance)

---

## 5. UDP CLIENT LOGIC

### 5.1 Core Client Flow
**File**: `src/transport/udp/client.ts`

**Key Components**:
1. **ClientID Generation**: 16-byte random identifier
2. **Handshake Protocol**: JSON-based encrypted handshake
3. **Heartbeat Mechanism**: Keep-alive with template encapsulation
4. **IP Migration Support**: Seamless network changes
5. **Inactivity Detection**: Auto-reconnect on timeout

### 5.2 Handshake Data Structure

```kotlin
data class HandshakeData(
    val clientID: String,              // Base64-encoded 16 bytes
    val key: Int,                      // 0-255
    val obfuscationLayer: Int,         // 1-4
    val randomPadding: Int,            // 1-8
    val fnInitor: FunctionInitializers,
    val templateId: Int,               // 1-3
    val templateParams: Map<String, Any>,
    val userId: String,
    val publicKey: String
)

data class HandshakeResponse(
    val port: Int,
    val clientID: String,
    val status: String  // "connected" or "reconnected"
)
```

### 5.3 Android UDP Client Implementation

```kotlin
class MorphUdpClient(
    private val remoteAddress: String,
    private val remotePort: Int,
    private val userId: String,
    private val encryptionKey: String,
    private val localWgAddress: String = "127.0.0.1",
    private val localWgPort: Int = 51820
) {
    private lateinit var socket: DatagramSocket
    private lateinit var clientID: ByteArray
    private lateinit var encryptor: Encryptor
    private lateinit var obfuscator: Obfuscator
    private lateinit var protocolTemplate: ProtocolTemplate
    private var newServerPort: Int = 0
    private var lastReceivedTime: Long = 0
    
    private val handshakeInterval = 5000L  // 5 seconds
    private val heartbeatInterval = 120000L  // 2 minutes
    private val inactivityTimeout = 30000L  // 30 seconds
    private val maxRetries = 5
    
    suspend fun start() = withContext(Dispatchers.IO) {
        // Generate 16-byte clientID
        clientID = ByteArray(16)
        SecureRandom().nextBytes(clientID)
        
        // Initialize encryptor
        encryptor = Encryptor()
        encryptor.setSimple(encryptionKey)
        
        // Select random protocol template
        val templateId = selectRandomTemplate()
        protocolTemplate = createTemplate(templateId)
        
        // Create handshake data
        val handshakeData = HandshakeData(
            clientID = Base64.encodeToString(clientID, Base64.NO_WRAP),
            key = Random.nextInt(256),
            obfuscationLayer = 3,
            randomPadding = 8,
            fnInitor = fnInitor(),
            templateId = templateId,
            templateParams = protocolTemplate.getParams(),
            userId = userId,
            publicKey = "not implemented"
        )
        
        // Create obfuscator
        obfuscator = Obfuscator(
            handshakeData.key,
            handshakeData.obfuscationLayer,
            handshakeData.randomPadding,
            handshakeData.fnInitor
        )
        
        // Create UDP socket
        socket = DatagramSocket()
        
        // Start handshake
        startHandshake(handshakeData)
        
        // Start receive loop
        startReceiveLoop()
    }
    
    private suspend fun startHandshake(handshakeData: HandshakeData) {
        val json = Gson().toJson(handshakeData)
        val encrypted = encryptor.simpleEncrypt(json)
        val packet = DatagramPacket(
            encrypted.toByteArray(),
            encrypted.length,
            InetAddress.getByName(remoteAddress),
            remotePort
        )
        
        var retries = 0
        while (newServerPort == 0 && retries < maxRetries) {
            socket.send(packet)
            delay(handshakeInterval)
            retries++
        }
    }
    
    private suspend fun startReceiveLoop() = withContext(Dispatchers.IO) {
        val buffer = ByteArray(65535)
        while (isActive) {
            val packet = DatagramPacket(buffer, buffer.size)
            socket.receive(packet)
            handlePacket(packet)
        }
    }
    
    private fun handlePacket(packet: DatagramPacket) {
        when (packet.port) {
            remotePort -> handleHandshakeResponse(packet)
            localWgPort -> sendToServer(packet.data)
            newServerPort -> handleServerData(packet)
        }
    }
    
    private fun sendToServer(data: ByteArray) {
        if (newServerPort == 0) return
        
        // Obfuscate data
        val obfuscated = obfuscator.obfuscation(data)
        
        // Encapsulate with protocol template
        val encapsulated = protocolTemplate.encapsulate(obfuscated, clientID)
        
        // Update template state
        protocolTemplate.updateState()
        
        // Send to server
        val packet = DatagramPacket(
            encapsulated,
            encapsulated.size,
            InetAddress.getByName(remoteAddress),
            newServerPort
        )
        socket.send(packet)
    }
    
    private fun handleServerData(packet: DatagramPacket) {
        lastReceivedTime = System.currentTimeMillis()
        
        // Decapsulate template
        val obfuscated = protocolTemplate.decapsulate(packet.data) ?: return
        
        // Deobfuscate
        val deobfuscated = obfuscator.deobfuscation(obfuscated)
        
        // Send to local WireGuard
        val wgPacket = DatagramPacket(
            deobfuscated,
            deobfuscated.size,
            InetAddress.getByName(localWgAddress),
            localWgPort
        )
        socket.send(wgPacket)
    }
}
```

**Implementation Priority**: CRITICAL (Core client functionality)

---

## 6. CONFIGURATION MANAGEMENT

### 6.1 Configuration Classes
**File**: `src/config/index.ts`

```kotlin
data class ClientConfig(
    val remoteAddress: String,
    val remotePort: Int,
    val userId: String,
    val localWgAddress: String = "127.0.0.1",
    val localWgPort: Int = 51820,
    val maxRetries: Int = 5,
    val heartbeatInterval: Long = 120000,
    val inactivityTimeout: Long = 30000,
    val obfuscation: ObfuscationConfig
)

data class ObfuscationConfig(
    val key: Int,           // Random 0-255
    val layer: Int = 3,     // 1-4 layers
    val paddingLength: Int = 8  // 1-8 bytes
)
```

**Implementation Priority**: LOW (Simple data classes)

---

## 7. IMPLEMENTATION ORDER

### Phase 1: Foundation (Week 1)
1. **Encryptor** - AES-256-CBC + RSA-2048
2. **FunctionInitializers** - Random parameter generation
3. **All 11 Obfuscation Functions** - Core transformations
4. **FunctionRegistry** - Function management

### Phase 2: Core Logic (Week 2)
5. **Obfuscator** - Multi-layer obfuscation engine
6. **Configuration** - Data classes and defaults
7. **Types/Models** - All data structures

### Phase 3: Protocol Layer (Week 3)
8. **BaseTemplate** - Template interface
9. **QuicTemplate** - QUIC protocol mimicry
10. **KcpTemplate** - KCP protocol mimicry
11. **GenericGamingTemplate** - Gaming protocol
12. **TemplateFactory** - Template creation
13. **TemplateSelector** - Weighted random selection

### Phase 4: Network Layer (Week 4)
14. **UdpClient** - Main client logic
15. **Handshake Protocol** - Connection establishment
16. **Heartbeat Mechanism** - Keep-alive
17. **IP Migration** - Network change handling
18. **Inactivity Detection** - Auto-reconnect

### Phase 5: Testing & Polish (Week 5)
19. **Unit Tests** - All components
20. **Integration Tests** - End-to-end
21. **Performance Optimization**
22. **Error Handling**

---

## 8. DEPENDENCY MAPPING

### Node.js → Android

| Node.js | Android Kotlin |
|---------|----------------|
| `crypto.randomBytes()` | `SecureRandom().nextBytes()` |
| `crypto.createCipheriv()` | `Cipher.getInstance("AES/CBC/PKCS5Padding")` |
| `crypto.createDecipheriv()` | `Cipher.getInstance("AES/CBC/PKCS5Padding")` |
| `crypto.generateKeyPairSync()` | `KeyPairGenerator.getInstance("RSA")` |
| `crypto.publicEncrypt()` | `Cipher.getInstance("RSA/ECB/PKCS1Padding")` |
| `crypto.privateDecrypt()` | `Cipher.getInstance("RSA/ECB/PKCS1Padding")` |
| `crypto.scryptSync()` | `SCrypt.generate()` (Bouncy Castle) |
| `dgram.createSocket()` | `DatagramSocket()` |
| `Buffer` | `ByteArray` |
| `JSON.stringify()` | `Gson().toJson()` |
| `JSON.parse()` | `Gson().fromJson()` |

### Required Android Libraries

```gradle
dependencies {
    // Crypto
    implementation 'org.bouncycastle:bcprov-jdk15on:1.70'
    
    // JSON
    implementation 'com.google.code.gson:gson:2.10.1'
    
    // Coroutines
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
    
    // Networking (optional, for HTTP API)
    implementation 'com.squareup.retrofit2:retrofit:2.9.0'
    implementation 'com.squareup.retrofit2:converter-gson:2.9.0'
}
```

---

## 9. KEY ARCHITECTURAL CONCEPTS

### 9.1 Dual Indexing
- Server uses two indexes for O(1) lookup
- `ipIndex: Map<"ip:port:headerID", clientID>`
- `sessions: Map<clientID, Session>`
- Zero packet overhead

### 9.2 IP Migration
- ClientID-based sessions (16 bytes)
- Survives network changes
- QUIC-style connection migration
- No reconnection needed

### 9.3 Plaintext ClientID
- ClientID sent unencrypted for O(1) lookup
- Trade-off: Privacy vs Performance
- Data still encrypted and authenticated
- Industry standard (QUIC does same)

### 9.4 Dynamic Obfuscation
- Function combo selected per packet
- Based on random header values
- Unpredictable transformation patterns
- Defeats traffic analysis

---

## 10. TESTING STRATEGY

### Unit Tests Required
- All 11 obfuscation functions (reversibility)
- Obfuscator (multi-layer)
- Encryptor (AES + RSA)
- Protocol templates (encapsulation/decapsulation)
- Function registry (permutations)

### Integration Tests Required
- Full handshake flow
- Data packet obfuscation/deobfuscation
- Template encapsulation
- IP migration simulation
- Heartbeat mechanism

### Performance Tests Required
- Throughput (packets/second)
- Latency (ms per packet)
- Memory usage
- Battery consumption (Android-specific)

---

## 11. SECURITY CONSIDERATIONS

### Implemented
✅ AES-256-CBC encryption
✅ RSA-2048 key exchange
✅ Multi-layer obfuscation
✅ Random padding
✅ Dynamic function selection
✅ Heartbeat mechanism

### Not Implemented (Future)
⚠️ Forward secrecy (ECDHE)
⚠️ Mutual authentication
⚠️ Path validation for IP migration
⚠️ HMAC packet authentication
⚠️ Replay protection

---

## 12. PERFORMANCE TARGETS

### Throughput
- Target: 100+ Mbps on modern Android device
- Overhead: ~3-5% (obfuscation + encryption)

### Latency
- Target: \<5ms added latency
- Obfuscation: ~0.5ms
- Encryption: ~1ms
- Template: ~0.1ms

### Battery
- Target: \<5% additional battery drain
- Use efficient crypto APIs
- Minimize wake locks
- Batch operations where possible

---

## 13. ANDROID-SPECIFIC CONSIDERATIONS

### VPN Service Integration
```kotlin
class MorphVpnService : VpnService() {
    private lateinit var morphClient: MorphUdpClient
    private lateinit var vpnInterface: ParcelFileDescriptor
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Establish VPN interface
        vpnInterface = Builder()
            .addAddress("10.0.0.2", 24)
            .addRoute("0.0.0.0", 0)
            .establish()!!
        
        // Start morph client
        morphClient = MorphUdpClient(...)
        morphClient.start()
        
        // Forward packets between VPN interface and morph client
        startPacketForwarding()
        
        return START_STICKY
    }
}
```

### Permissions Required
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.CHANGE_NETWORK_STATE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

### Background Execution
- Use Foreground Service for VPN
- Handle doze mode
- Implement reconnection logic
- Persist configuration

---

## CONCLUSION

The morphProtocol is a well-architected system with clear separation of concerns. The Android port is feasible and can be completed in approximately 5 weeks with a single developer. The most critical components are the obfuscation engine and UDP client logic. Protocol templates are optional but recommended for enhanced DPI resistance.

**Estimated Lines of Code**: ~3,000-4,000 lines of Kotlin
**Complexity**: Medium-High
**Risk**: Low (well-documented, tested TypeScript implementation)
