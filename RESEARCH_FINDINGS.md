# morphProtocol Android Port - Research Findings

## EXECUTIVE SUMMARY

The morphProtocol is a sophisticated VPN traffic obfuscation system designed to evade Deep Packet Inspection (DPI). After comprehensive analysis of the TypeScript codebase, I've identified all core components, their dependencies, and optimal implementation order for Android (Kotlin) port.

**Estimated Effort**: 200 hours (5 weeks)
**Complexity**: Medium-High
**Feasibility**: High (well-documented, tested codebase)

---

## 1. CRYPTO/ENCRYPTION LAYER

### Component: Encryptor
**Location**: `src/crypto/encryptor.ts`

**Functionality**:
- AES-256-CBC encryption/decryption
- RSA-2048 key exchange
- scrypt key derivation
- Hybrid encryption (AES + RSA)

**Key Methods**:
```typescript
encrypt(text, key, iv) → encrypted string
decrypt(encryptedText, key, iv) → decrypted string
encryptWithPublicKey(data, remotePublicKey) → RSA encrypted
decryptWithPrivateKey(encryptedData) → RSA decrypted
simpleEncrypt(text) → AES encrypted (pre-shared key)
simpleDecrypt(encryptedText) → AES decrypted
```

**Android Implementation**:
- Use `javax.crypto.Cipher` for AES-256-CBC
- Use `java.security.KeyPairGenerator` for RSA-2048
- Use Bouncy Castle's `SCrypt` for key derivation
- Replace Node.js `crypto` module with Android equivalents

**Dependencies**: Bouncy Castle library

**Priority**: CRITICAL (required for handshake)

---

## 2. OBFUSCATION FUNCTIONS (11 Total)

### Function Registry
**Location**: `src/core/function-registry.ts`

All functions follow signature: `(input: ByteArray, keyArray: ByteArray, initor: Any?) → ByteArray`

### The 11 Functions:

**1. bitwiseRotationAndXOR**
- Rotate bits by position-dependent amount
- XOR with key array
- Self-reversible with reverse rotation

**2. swapNeighboringBytes**
- Swap adjacent bytes (0↔1, 2↔3, etc.)
- Self-reversible
- Handle odd-length buffers

**3. reverseBuffer**
- Reverse entire byte array
- Self-reversible
- Simple but effective

**4. divideAndSwap**
- Split buffer in half
- Swap the two halves
- Self-reversible
- Handle odd-length buffers

**5. circularShiftObfuscation**
- Circular left shift by 1 bit
- Reverse: circular right shift
- Preserves all bits

**6. xorWithKey**
- XOR each byte with corresponding key byte
- Self-reversible (XOR twice = original)
- Simplest function

**7. bitwiseNOT**
- Bitwise NOT (~) operation
- Self-reversible
- Inverts all bits

**8. reverseBits**
- Reverse bits within each byte
- Requires separate deobfuscation
- 0b10110010 → 0b01001101

**9. shiftBits**
- Left shift by 2 bits with wrap
- Reverse: right shift by 2 bits
- Circular shift

**10. substitution** (requires initialization)
- Byte substitution using 256-element table
- Table generated via Fisher-Yates shuffle
- Deobfuscation: reverse lookup in table

**11. addRandomValue** (requires initialization)
- Add random value (0-255) modulo 256
- Deobfuscation: subtract same value modulo 256
- Random value shared in handshake

### Function Initializer
**Location**: `src/core/function-initializer.ts`

Generates random parameters for functions 10 & 11:
```kotlin
data class FunctionInitializers(
    val substitutionTable: IntArray,  // 256 elements
    val randomValue: Int              // 0-255
)
```

**Priority**: CRITICAL (core obfuscation)

---

## 3. OBFUSCATOR ENGINE

### Component: Obfuscator
**Location**: `src/core/obfuscator.ts`

**Key Features**:
- Applies 1-4 layers of obfuscation
- Dynamic function selection per packet
- Random padding (1-8 bytes)
- 3-byte header encodes function combo

**Packet Structure**:
```
┌────────────┬──────────────────┬──────────────┐
│ Header     │ Obfuscated Data  │ Padding      │
│ (3 bytes)  │ (N bytes)        │ (1-8 bytes)  │
└────────────┴──────────────────┴──────────────┘

Header: [random1][random2][paddingLength]
Function Combo Index = (random1 * random2) % totalCombinations
```

**Algorithm**:
1. Generate 3-byte random header
2. Calculate function combo index from header
3. Apply selected functions in sequence
4. Add random padding
5. Prepend header

**Deobfuscation**:
1. Extract header (first 3 bytes)
2. Calculate function combo index
3. Extract body (remove header and padding)
4. Apply deobfuscation functions in REVERSE order

**Key Method**:
```kotlin
fun generateKeyArray(length: Int): ByteArray {
    val keyArray = ByteArray(length)
    for (i in 0 until length) {
        keyArray[i] = ((key + i * 37) % 256).toByte()
    }
    return keyArray
}
```

**Dependencies**:
- FunctionRegistry
- FunctionInitializers
- All 11 obfuscation functions

**Priority**: CRITICAL (core engine)

---

## 4. PROTOCOL TEMPLATES

### Purpose
Wrap obfuscated data to mimic legitimate protocols, evading DPI systems.

### Base Interface
**Location**: `src/core/protocol-templates/base-template.ts`

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

### Three Template Types

**Template 1: QUIC (ID: 1)**
- Mimics QUIC short header packets
- Header: 11 bytes `[flags][8-byte connID][2-byte packetNum]`
- HeaderID: Connection ID (bytes 1-8)
- Flags: 0x40-0x4f
- Most common, 40% weight

**Template 2: KCP (ID: 2)**
- Mimics KCP protocol (Chinese gaming)
- Header: 24 bytes `[4 conv][1 cmd][1 frg][2 wnd][4 ts][4 sn][4 una][4 len]`
- HeaderID: Conv field (bytes 0-3)
- Cmd: 0x51 (data packet)
- 35% weight

**Template 3: Generic Gaming (ID: 3)**
- Generic game protocol pattern
- Header: 12 bytes `["GAME"][4 sessionID][2 seq][1 type][1 flags]`
- HeaderID: Session ID (bytes 4-7)
- Magic: "GAME" ASCII
- 25% weight

### Template Selection
Weighted random selection for diversity:
```kotlin
fun selectRandomTemplate(): Int {
    val weights = listOf(40, 35, 25)  // QUIC, KCP, Gaming
    // Weighted random selection
}
```

**Priority**: MEDIUM (enhances DPI resistance, optional for basic functionality)

---

## 5. UDP CLIENT LOGIC

### Component: UdpClient
**Location**: `src/transport/udp/client.ts`

**Core Responsibilities**:
1. ClientID generation and management
2. Handshake protocol
3. Heartbeat mechanism
4. Inactivity detection
5. IP migration support
6. Packet forwarding

### ClientID System
- 16-byte random identifier (128-bit)
- Generated once per connection
- Sent in plaintext for O(1) server lookup
- Enables IP migration (QUIC-style)

### Handshake Protocol

**Client → Server**:
```json
{
  "clientID": "base64_16_bytes",
  "key": 123,
  "obfuscationLayer": 3,
  "randomPadding": 8,
  "fnInitor": {
    "substitutionTable": [0,1,2,...,255],
    "randomValue": 42
  },
  "templateId": 1,
  "templateParams": {"initialSeq": 12345},
  "userId": "user123",
  "publicKey": "..."
}
```

**Server → Client**:
```json
{
  "port": 12345,
  "clientID": "base64_16_bytes",
  "status": "connected"
}
```

### Packet Flow

**Outbound (WireGuard → Server)**:
```
1. Receive from local WireGuard (127.0.0.1:51820)
2. Obfuscate with Obfuscator
3. Encapsulate with ProtocolTemplate
4. Update template state (sequence++)
5. Send to server port
```

**Inbound (Server → WireGuard)**:
```
1. Receive from server port
2. Update lastReceivedTime
3. Decapsulate with ProtocolTemplate
4. Deobfuscate with Obfuscator
5. Send to local WireGuard
```

### Heartbeat Mechanism
- Interval: 120 seconds (2 minutes)
- Packet: `[clientID][0x01]` encapsulated with template
- Keeps connection alive
- Updates template state

### Inactivity Detection
- Check interval: 10 seconds
- Timeout: 30 seconds
- On timeout:
  - Generate NEW clientID
  - Select NEW template
  - Generate NEW obfuscation params
  - Send handshake to reconnect

### IP Migration
- ClientID remains constant across IP changes
- Server detects IP change automatically
- No client action needed
- Seamless continuation

**Priority**: CRITICAL (main client logic)

---

## 6. CONFIGURATION MANAGEMENT

### Component: Config
**Location**: `src/config/index.ts`

Simple data structures:

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

**Priority**: LOW (simple data classes)

---

## IMPLEMENTATION ORDER

### Phase 1: Foundation (Week 1 - 40 hours)
1. **Encryptor** - AES-256-CBC + RSA-2048
2. **FunctionInitializer** - Random parameter generation
3. **All 11 Obfuscation Functions** - Core transformations
4. **FunctionRegistry** - Function management and permutations

### Phase 2: Core Logic (Week 2 - 20 hours)
5. **Obfuscator** - Multi-layer obfuscation engine
6. **Configuration** - Data classes and defaults
7. **Types/Models** - All data structures

### Phase 3: Protocol Layer (Week 3 - 30 hours)
8. **BaseTemplate** - Template interface
9. **QuicTemplate** - QUIC protocol mimicry
10. **KcpTemplate** - KCP protocol mimicry
11. **GenericGamingTemplate** - Gaming protocol
12. **TemplateFactory** - Template creation
13. **TemplateSelector** - Weighted random selection

### Phase 4: Network Layer (Week 4 - 40 hours)
14. **MorphUdpClient** - Main client logic
15. **Handshake Protocol** - Connection establishment
16. **Heartbeat Mechanism** - Keep-alive
17. **IP Migration** - Network change handling
18. **Inactivity Detection** - Auto-reconnect

### Phase 5: Android Integration (Week 5 - 30 hours)
19. **VpnService** - Android VPN integration
20. **UI Components** - Connection management
21. **Testing** - Unit, integration, E2E
22. **Optimization** - Performance tuning

### Testing & Polish (Ongoing - 40 hours)
- Unit tests for all components
- Integration tests
- Performance benchmarks
- Bug fixes

**Total**: 200 hours

---

## DEPENDENCY MAPPING

| Node.js | Android Kotlin | Library |
|---------|----------------|---------|
| crypto.randomBytes() | SecureRandom().nextBytes() | java.security |
| crypto.createCipheriv() | Cipher.getInstance("AES/CBC/PKCS5Padding") | javax.crypto |
| crypto.createDecipheriv() | Cipher.getInstance("AES/CBC/PKCS5Padding") | javax.crypto |
| crypto.generateKeyPairSync() | KeyPairGenerator.getInstance("RSA") | java.security |
| crypto.publicEncrypt() | Cipher.getInstance("RSA/ECB/PKCS1Padding") | javax.crypto |
| crypto.privateDecrypt() | Cipher.getInstance("RSA/ECB/PKCS1Padding") | javax.crypto |
| crypto.scryptSync() | SCrypt.generate() | Bouncy Castle |
| dgram.createSocket() | DatagramSocket() | java.net |
| Buffer | ByteArray | Kotlin stdlib |
| JSON.stringify() | Gson().toJson() | Gson |
| JSON.parse() | Gson().fromJson() | Gson |

---

## REQUIRED ANDROID LIBRARIES

```gradle
dependencies {
    // Crypto
    implementation 'org.bouncycastle:bcprov-jdk15on:1.70'
    
    // JSON
    implementation 'com.google.code.gson:gson:2.10.1'
    
    // Coroutines
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
}
```

---

## KEY ARCHITECTURAL CONCEPTS

### 1. Dual Indexing
- Server maintains two indexes for O(1) lookup
- `ipIndex: Map<"ip:port:headerID", clientID>`
- `sessions: Map<clientID, Session>`
- Zero packet overhead (uses protocol-native headers)

### 2. IP Migration
- ClientID-based sessions (16 bytes)
- Survives network changes without reconnection
- QUIC-style connection migration
- Seamless for mobile clients

### 3. Dynamic Obfuscation
- Function combo selected per packet
- Based on random header values
- Unpredictable transformation patterns
- Defeats traffic analysis

### 4. Plaintext ClientID
- ClientID sent unencrypted for O(1) server lookup
- Trade-off: Privacy vs Performance
- Data still encrypted and authenticated
- Industry standard (QUIC does same)

---

## CONCLUSION

The morphProtocol Android port is feasible and well-scoped. The TypeScript implementation is clean, well-documented, and thoroughly tested, making it an excellent reference. All core components have clear responsibilities and minimal coupling.

**Key Success Factors**:
✅ Well-defined component boundaries
✅ Comprehensive test suite in TypeScript
✅ Clear documentation
✅ Proven architecture
✅ Straightforward dependency mapping

**Estimated Timeline**: 5 weeks (200 hours)
**Risk Level**: Low
**Recommendation**: Proceed with implementation
