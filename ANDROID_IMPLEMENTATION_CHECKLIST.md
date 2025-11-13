# Android Implementation Checklist

## Component Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                     ANDROID CLIENT                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    MorphUdpClient                           │
│  Dependencies: Encryptor, Obfuscator, ProtocolTemplate     │
└─────────────────────────────────────────────────────────────┘
                    │           │           │
        ┌───────────┘           │           └───────────┐
        ▼                       ▼                       ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Encryptor   │    │   Obfuscator     │    │ ProtocolTemplate │
│              │    │                  │    │                  │
│ - AES-256    │    │ Dependencies:    │    │ - QUIC           │
│ - RSA-2048   │    │ - FunctionReg    │    │ - KCP            │
│ - scrypt     │    │ - FnInitor       │    │ - Gaming         │
└──────────────┘    └──────────────────┘    └──────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
        ┌──────────────────┐  ┌──────────────────┐
        │ FunctionRegistry │  │  FnInitializer   │
        │                  │  │                  │
        │ - 11 Functions   │  │ - SubstTable     │
        │ - Permutations   │  │ - RandomValue    │
        └──────────────────┘  └──────────────────┘
                    │
                    ▼
        ┌──────────────────────────────┐
        │   11 Obfuscation Functions   │
        │                              │
        │ 1. bitwiseRotationAndXOR     │
        │ 2. swapNeighboringBytes      │
        │ 3. reverseBuffer             │
        │ 4. divideAndSwap             │
        │ 5. circularShiftObfuscation  │
        │ 6. xorWithKey                │
        │ 7. bitwiseNOT                │
        │ 8. reverseBits               │
        │ 9. shiftBits                 │
        │ 10. substitution             │
        │ 11. addRandomValue           │
        └──────────────────────────────┘
```

---

## Phase 1: Foundation Layer (Week 1)

### 1.1 Crypto Package (`com.morph.crypto`)

#### ☐ Encryptor.kt
```kotlin
class Encryptor(password: String = "bumoyu123")
```

**Methods to Implement**:
- [ ] `init()` - Generate RSA key pair, derive AES key
- [ ] `generateSalt(length: Int = 16): String`
- [ ] `setSimple(combinedBase64String: String)`
- [ ] `encrypt(text: String, key: ByteArray, iv: ByteArray): String`
- [ ] `decrypt(encryptedText: String, key: ByteArray, iv: ByteArray): String`
- [ ] `encryptWithPublicKey(data: String, remotePublicKey: String): String`
- [ ] `decryptWithPrivateKey(encryptedData: String): String`
- [ ] `simpleEncrypt(text: String): String`
- [ ] `simpleDecrypt(encryptedText: String): String`
- [ ] `finalEncrypt(text: String, remotePublicKey: String): EncryptedData`
- [ ] `finalDecrypt(data: EncryptedData): String`

**Dependencies**:
- [ ] Add Bouncy Castle library
- [ ] Test AES-256-CBC encryption/decryption
- [ ] Test RSA-2048 encryption/decryption
- [ ] Test scrypt key derivation

**Test Cases**:
- [ ] Encrypt/decrypt round-trip
- [ ] RSA encrypt/decrypt round-trip
- [ ] Key derivation consistency
- [ ] Edge cases (empty string, large data)

---

### 1.2 Core Package - Functions (`com.morph.core.functions`)

#### ☐ FunctionTypes.kt
```kotlin
typealias HouseFunction = (ByteArray, ByteArray, Any?) -> ByteArray

data class HouseFunctionPair(
    val obfuscation: HouseFunction,
    val deobfuscation: HouseFunction,
    val initor: Any?,
    val index: Int
)
```

#### ☐ BitwiseRotationAndXOR.kt
- [ ] `obfuscation(input, keyArray, initor): ByteArray`
- [ ] `deobfuscation(input, keyArray, initor): ByteArray`
- [ ] Test reversibility

#### ☐ SwapNeighboringBytes.kt
- [ ] `obfuscation(input, keyArray, initor): ByteArray`
- [ ] `deobfuscation(input, keyArray, initor): ByteArray`
- [ ] Test reversibility

#### ☐ ReverseBuffer.kt
- [ ] `obfuscation(input, keyArray, initor): ByteArray`
- [ ] `deobfuscation(input, keyArray, initor): ByteArray`
- [ ] Test reversibility

#### ☐ DivideAndSwap.kt
- [ ] `obfuscation(input, keyArray, initor): ByteArray`
- [ ] `deobfuscation(input, keyArray, initor): ByteArray`
- [ ] Test reversibility (odd/even lengths)

#### ☐ CircularShiftObfuscation.kt
- [ ] `obfuscation(input, keyArray, initor): ByteArray`
- [ ] `deobfuscation(input, keyArray, initor): ByteArray`
- [ ] Test reversibility

#### ☐ XorWithKey.kt
- [ ] `obfuscation(input, keyArray, initor): ByteArray`
- [ ] `deobfuscation(input, keyArray, initor): ByteArray`
- [ ] Test XOR properties

#### ☐ BitwiseNOT.kt
- [ ] `obfuscation(input, keyArray, initor): ByteArray`
- [ ] `deobfuscation(input, keyArray, initor): ByteArray`
- [ ] Test reversibility

#### ☐ ReverseBits.kt
- [ ] `obfuscation(input, keyArray, initor): ByteArray`
- [ ] `deobfuscation(input, keyArray, initor): ByteArray`
- [ ] Test reversibility

#### ☐ ShiftBits.kt
- [ ] `obfuscation(input, keyArray, initor): ByteArray`
- [ ] `deobfuscation(input, keyArray, initor): ByteArray`
- [ ] Test reversibility

#### ☐ Substitution.kt
- [ ] `obfuscation(input, keyArray, initor): ByteArray`
- [ ] `deobfuscation(input, keyArray, initor): ByteArray`
- [ ] `generateSubstitutionTable(): IntArray`
- [ ] Test reversibility with random tables

#### ☐ AddRandomValue.kt
- [ ] `obfuscation(input, keyArray, initor): ByteArray`
- [ ] `deobfuscation(input, keyArray, initor): ByteArray`
- [ ] `generateRandomValue(): Int`
- [ ] Test reversibility with modulo arithmetic

---

### 1.3 Function Initializer (`com.morph.core`)

#### ☐ FunctionInitializer.kt
```kotlin
data class FunctionInitializers(
    val substitutionTable: IntArray,
    val randomValue: Int
)

fun fnInitor(): FunctionInitializers
```

**Implementation**:
- [ ] Generate 256-element substitution table (Fisher-Yates shuffle)
- [ ] Generate random value (0-255)
- [ ] Test uniqueness of substitution table
- [ ] Test serialization/deserialization

---

### 1.4 Function Registry (`com.morph.core`)

#### ☐ FunctionRegistry.kt
```kotlin
class FunctionRegistry(
    obfuscationLayer: Int,
    fnInitor: FunctionInitializers
)
```

**Methods**:
- [ ] `init()` - Register all 11 functions
- [ ] `setObfuscationLayer(num: Int)`
- [ ] `getFunctionPairsIndexCombos(): List<List<Int>>`
- [ ] `calculatePermutations(optionLength: Int, length: Int): List<List<Int>>`
- [ ] `addFunctionPair(obf, deobf, initor)`
- [ ] `getRandomFunctionPair(): HouseFunctionPair`
- [ ] `getRandomDistinctFunctionPairs(n: Int): List<HouseFunctionPair>`

**Implementation**:
- [ ] Calculate permutations for layers 1-4
- [ ] Cache permutation results
- [ ] Validate max 17 functions limit
- [ ] Test permutation correctness

---

## Phase 2: Core Logic (Week 2)

### 2.1 Obfuscator (`com.morph.core`)

#### ☐ Obfuscator.kt
```kotlin
class Obfuscator(
    key: Int,
    obfuscationLayer: Int,
    paddingLength: Int,
    funInitor: FunctionInitializers
)
```

**Methods**:
- [ ] `setKey(newKey: Int)`
- [ ] `generateKeyArray(length: Int): ByteArray`
- [ ] `randomPadding(length: Int): ByteArray`
- [ ] `concatenateUint8Arrays(arrays: List<ByteArray>): ByteArray`
- [ ] `extractHeaderAndBody(input: ByteArray): Pair<ByteArray, ByteArray>`
- [ ] `preObfuscation(buffer: ByteArray, functions: List<HouseFunctionPair>): ByteArray`
- [ ] `preDeobfuscation(obfuscated: ByteArray, functions: List<HouseFunctionPair>): ByteArray`
- [ ] `obfuscation(data: ByteArray): ByteArray`
- [ ] `deobfuscation(data: ByteArray): ByteArray`

**Test Cases**:
- [ ] Single layer obfuscation/deobfuscation
- [ ] Multi-layer (2, 3, 4) obfuscation/deobfuscation
- [ ] Random padding extraction
- [ ] Header parsing
- [ ] Large data (1500 bytes)
- [ ] Edge cases (empty, 1 byte)

---

### 2.2 Configuration (`com.morph.config`)

#### ☐ ClientConfig.kt
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
    val key: Int,
    val layer: Int = 3,
    val paddingLength: Int = 8
)
```

**Implementation**:
- [ ] Default values
- [ ] Validation logic
- [ ] Serialization support
- [ ] Builder pattern (optional)

---

### 2.3 Types/Models (`com.morph.types`)

#### ☐ HandshakeData.kt
```kotlin
data class HandshakeData(
    val clientID: String,
    val key: Int,
    val obfuscationLayer: Int,
    val randomPadding: Int,
    val fnInitor: FunctionInitializers,
    val templateId: Int,
    val templateParams: Map<String, Any>,
    val userId: String,
    val publicKey: String
)
```

#### ☐ HandshakeResponse.kt
```kotlin
data class HandshakeResponse(
    val port: Int,
    val clientID: String,
    val status: String
)
```

#### ☐ EncryptedData.kt
```kotlin
data class EncryptedData(
    val d: String,  // encrypted data
    val k: String,  // encrypted key
    val i: String   // initialization vector
)
```

---

## Phase 3: Protocol Layer (Week 3)

### 3.1 Base Template (`com.morph.protocol`)

#### ☐ ProtocolTemplate.kt
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

abstract class BaseTemplate(params: Map<String, Any>?) : ProtocolTemplate {
    protected var sequenceNumber: Int
    
    override fun getParams(): Map<String, Any>
    override fun updateState()
}
```

---

### 3.2 Template Implementations

#### ☐ QuicTemplate.kt
```kotlin
class QuicTemplate(params: Map<String, Any>? = null) : BaseTemplate(params)
```

**Methods**:
- [ ] `extractHeaderID(packet: ByteArray): ByteArray?` - Extract bytes 1-8
- [ ] `encapsulate(data: ByteArray, clientID: ByteArray): ByteArray` - Add 11-byte header
- [ ] `decapsulate(packet: ByteArray): ByteArray?` - Remove header

**Test Cases**:
- [ ] Header extraction
- [ ] Encapsulation/decapsulation round-trip
- [ ] Sequence number increment
- [ ] Invalid packet handling

#### ☐ KcpTemplate.kt
```kotlin
class KcpTemplate(params: Map<String, Any>? = null) : BaseTemplate(params)
```

**Methods**:
- [ ] `extractHeaderID(packet: ByteArray): ByteArray?` - Extract bytes 0-3
- [ ] `encapsulate(data: ByteArray, clientID: ByteArray): ByteArray` - Add 24-byte header
- [ ] `decapsulate(packet: ByteArray): ByteArray?` - Remove header
- [ ] `updateState()` - Update timestamp

**Test Cases**:
- [ ] Header extraction
- [ ] Encapsulation/decapsulation round-trip
- [ ] Timestamp update
- [ ] Conv field validation

#### ☐ GenericGamingTemplate.kt
```kotlin
class GenericGamingTemplate(params: Map<String, Any>? = null) : BaseTemplate(params)
```

**Methods**:
- [ ] `extractHeaderID(packet: ByteArray): ByteArray?` - Extract bytes 4-7
- [ ] `encapsulate(data: ByteArray, clientID: ByteArray): ByteArray` - Add 12-byte header
- [ ] `decapsulate(packet: ByteArray): ByteArray?` - Remove header

**Test Cases**:
- [ ] Magic "GAME" validation
- [ ] Header extraction
- [ ] Encapsulation/decapsulation round-trip

---

### 3.3 Template Factory & Selector

#### ☐ TemplateFactory.kt
```kotlin
fun createTemplate(id: Int, params: Map<String, Any>? = null): ProtocolTemplate
```

**Implementation**:
- [ ] Switch on template ID (1, 2, 3)
- [ ] Throw exception for invalid ID
- [ ] Test all template types

#### ☐ TemplateSelector.kt
```kotlin
data class TemplateWeight(val id: Int, val weight: Int)

val TEMPLATE_WEIGHTS: List<TemplateWeight>

fun selectRandomTemplate(): Int
```

**Implementation**:
- [ ] Weighted random selection
- [ ] Weights: QUIC=40%, KCP=35%, Gaming=25%
- [ ] Test distribution over 1000 selections

---

## Phase 4: Network Layer (Week 4)

### 4.1 UDP Client (`com.morph.transport`)

#### ☐ MorphUdpClient.kt
```kotlin
class MorphUdpClient(
    remoteAddress: String,
    remotePort: Int,
    userId: String,
    encryptionKey: String,
    localWgAddress: String = "127.0.0.1",
    localWgPort: Int = 51820
)
```

**Properties**:
- [ ] `socket: DatagramSocket`
- [ ] `clientID: ByteArray`
- [ ] `encryptor: Encryptor`
- [ ] `obfuscator: Obfuscator`
- [ ] `protocolTemplate: ProtocolTemplate`
- [ ] `newServerPort: Int`
- [ ] `lastReceivedTime: Long`

**Methods**:
- [ ] `start(): suspend fun`
- [ ] `stop(): suspend fun`
- [ ] `sendHandshake(handshakeData: HandshakeData)`
- [ ] `startReceiveLoop()`
- [ ] `handlePacket(packet: DatagramPacket)`
- [ ] `handleHandshakeResponse(packet: DatagramPacket)`
- [ ] `sendToServer(data: ByteArray)`
- [ ] `handleServerData(packet: DatagramPacket)`
- [ ] `sendHeartbeat()`
- [ ] `checkInactivity()`
- [ ] `reconnect()`

**Implementation Details**:

##### ☐ Handshake Flow
- [ ] Generate 16-byte clientID
- [ ] Create handshake JSON
- [ ] Encrypt with simpleEncrypt
- [ ] Send to handshake port
- [ ] Retry up to maxRetries times
- [ ] Parse response JSON
- [ ] Extract newServerPort
- [ ] Start heartbeat timer

##### ☐ Data Flow (Client → Server)
- [ ] Receive from local WireGuard
- [ ] Obfuscate with Obfuscator
- [ ] Encapsulate with ProtocolTemplate
- [ ] Update template state
- [ ] Send to newServerPort

##### ☐ Data Flow (Server → Client)
- [ ] Receive from newServerPort
- [ ] Update lastReceivedTime
- [ ] Decapsulate with ProtocolTemplate
- [ ] Deobfuscate with Obfuscator
- [ ] Send to local WireGuard

##### ☐ Heartbeat Mechanism
- [ ] Create 1-byte marker (0x01)
- [ ] Encapsulate with template
- [ ] Send every heartbeatInterval
- [ ] Update template state

##### ☐ Inactivity Detection
- [ ] Check lastReceivedTime every 10 seconds
- [ ] If timeout exceeded:
  - [ ] Generate NEW clientID
  - [ ] Select NEW template
  - [ ] Generate NEW obfuscation params
  - [ ] Create NEW obfuscator
  - [ ] Send handshake to reconnect

##### ☐ IP Migration Support
- [ ] ClientID remains constant
- [ ] Server detects IP change
- [ ] No client action needed
- [ ] Seamless continuation

**Test Cases**:
- [ ] Successful handshake
- [ ] Handshake timeout
- [ ] Server full response
- [ ] Data obfuscation/deobfuscation
- [ ] Heartbeat sending
- [ ] Inactivity detection
- [ ] Reconnection flow
- [ ] Network change handling

---

### 4.2 Utilities (`com.morph.utils`)

#### ☐ Logger.kt
```kotlin
enum class LogLevel { DEBUG, INFO, WARN, ERROR }

class Logger(private var level: LogLevel = LogLevel.INFO) {
    fun setLevel(level: LogLevel)
    fun debug(message: String, vararg args: Any)
    fun info(message: String, vararg args: Any)
    fun warn(message: String, vararg args: Any)
    fun error(message: String, vararg args: Any)
}
```

#### ☐ Constants.kt
```kotlin
object Constants {
    const val DEFAULT_TIMEOUT_DURATION = 1200000L
    const val DEFAULT_TRAFFIC_INTERVAL = 600000L
    const val DEFAULT_HEARTBEAT_INTERVAL = 120000L
    const val DEFAULT_MAX_RETRIES = 5
    const val DEFAULT_OBFUSCATION_LAYER = 3
    const val DEFAULT_PADDING_LENGTH = 8
    const val DEFAULT_WG_PORT = 51820
    const val MAX_OBFUSCATION_FUNCTIONS = 17
    const val MAX_OBFUSCATION_LAYERS = 4
    const val HEADER_SIZE = 3
}
```

---

## Phase 5: Android Integration (Week 5)

### 5.1 VPN Service

#### ☐ MorphVpnService.kt
```kotlin
class MorphVpnService : VpnService()
```

**Methods**:
- [ ] `onStartCommand(intent: Intent?, flags: Int, startId: Int): Int`
- [ ] `onDestroy()`
- [ ] `establishVpnInterface(): ParcelFileDescriptor`
- [ ] `startPacketForwarding()`
- [ ] `stopPacketForwarding()`
- [ ] `handleVpnPacket(packet: ByteArray)`

**Implementation**:
- [ ] Create VPN interface with Builder
- [ ] Configure routes and DNS
- [ ] Start MorphUdpClient
- [ ] Forward packets between VPN and UDP client
- [ ] Handle service lifecycle
- [ ] Show persistent notification

---

### 5.2 UI Components

#### ☐ MainActivity.kt
- [ ] Connection status display
- [ ] Start/Stop button
- [ ] Server configuration input
- [ ] Encryption key input
- [ ] Statistics display (traffic, latency)

#### ☐ SettingsActivity.kt
- [ ] Obfuscation layer selection
- [ ] Padding length configuration
- [ ] Heartbeat interval
- [ ] Inactivity timeout
- [ ] Log level selection

---

### 5.3 Permissions & Manifest

#### ☐ AndroidManifest.xml
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.CHANGE_NETWORK_STATE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />

<service
    android:name=".MorphVpnService"
    android:permission="android.permission.BIND_VPN_SERVICE">
    <intent-filter>
        <action android:name="android.net.VpnService" />
    </intent-filter>
</service>
```

---

## Testing Checklist

### Unit Tests (Target: 80%+ coverage)

#### Crypto
- [ ] Encryptor - AES encryption/decryption
- [ ] Encryptor - RSA encryption/decryption
- [ ] Encryptor - Key derivation

#### Obfuscation Functions
- [ ] All 11 functions - Reversibility
- [ ] All 11 functions - Edge cases
- [ ] FunctionRegistry - Permutations
- [ ] FunctionInitializer - Random generation

#### Obfuscator
- [ ] Single layer obfuscation
- [ ] Multi-layer obfuscation
- [ ] Header parsing
- [ ] Padding extraction

#### Protocol Templates
- [ ] QUIC - Encapsulation/decapsulation
- [ ] KCP - Encapsulation/decapsulation
- [ ] Gaming - Encapsulation/decapsulation
- [ ] Template selector - Distribution

### Integration Tests

- [ ] Full handshake flow
- [ ] Data packet obfuscation → deobfuscation
- [ ] Template encapsulation → decapsulation
- [ ] Heartbeat mechanism
- [ ] Inactivity detection
- [ ] Reconnection flow

### End-to-End Tests

- [ ] Connect to real server
- [ ] Send/receive data
- [ ] Network change simulation
- [ ] Long-running stability test
- [ ] Performance benchmarks

---

## Performance Benchmarks

### Targets
- [ ] Throughput: \>100 Mbps
- [ ] Latency: \<5ms added
- [ ] Memory: \<50MB
- [ ] Battery: \<5% drain per hour

### Measurements
- [ ] Obfuscation time per packet
- [ ] Encryption time per packet
- [ ] Template encapsulation time
- [ ] Total round-trip time
- [ ] Memory allocation
- [ ] CPU usage
- [ ] Battery consumption

---

## Documentation

- [ ] API documentation (KDoc)
- [ ] Architecture diagram
- [ ] Setup guide
- [ ] Configuration guide
- [ ] Troubleshooting guide
- [ ] Performance tuning guide

---

## Release Checklist

- [ ] All tests passing
- [ ] Code review completed
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Documentation complete
- [ ] ProGuard rules configured
- [ ] APK size optimized
- [ ] Beta testing completed
- [ ] Play Store listing prepared
- [ ] Privacy policy published

---

## Estimated Effort

| Phase | Components | Estimated Time |
|-------|-----------|----------------|
| Phase 1 | Crypto + Functions | 40 hours |
| Phase 2 | Obfuscator + Config | 20 hours |
| Phase 3 | Protocol Templates | 30 hours |
| Phase 4 | UDP Client | 40 hours |
| Phase 5 | Android Integration | 30 hours |
| Testing | Unit + Integration | 40 hours |
| **Total** | | **200 hours** |

**Timeline**: 5 weeks (40 hours/week)

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Crypto API differences | Medium | High | Use Bouncy Castle, extensive testing |
| UDP socket issues | Low | Medium | Test on multiple Android versions |
| Battery drain | Medium | High | Optimize packet handling, batch operations |
| VPN service lifecycle | Medium | Medium | Handle all lifecycle events, persistent notification |
| Performance on low-end devices | High | Medium | Profile and optimize, configurable quality settings |
| Network restrictions | Low | High | Test on various networks, fallback mechanisms |

---

## Success Criteria

✅ **Functional**:
- Successful handshake with TypeScript server
- Data obfuscation/deobfuscation working
- VPN traffic routing correctly
- IP migration working
- Heartbeat mechanism stable

✅ **Performance**:
- \>100 Mbps throughput
- \<5ms added latency
- \<5% battery drain

✅ **Quality**:
- 80%+ test coverage
- Zero critical bugs
- Stable for 24+ hours continuous use

✅ **Compatibility**:
- Android 8.0+ (API 26+)
- Works with TypeScript server v1.0.0
- Compatible with WireGuard
