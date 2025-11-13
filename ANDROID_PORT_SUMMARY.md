# morphProtocol Android Port - Executive Summary

## Overview
morphProtocol is a VPN traffic obfuscation system with multi-layer encryption, dynamic obfuscation, and UDP transport. This document outlines the core components needed for Android port.

---

## CORE COMPONENTS TO PORT

### 1. CRYPTO/ENCRYPTION LAYER

**Class**: `Encryptor` (src/crypto/encryptor.ts)

**Key Features**:
- AES-256-CBC encryption/decryption
- RSA-2048 key exchange
- scrypt key derivation
- Simple encrypt/decrypt for handshake

**Android Mapping**:
```
Node crypto → javax.crypto + java.security + Bouncy Castle
```

**Priority**: CRITICAL (needed for handshake)

---

### 2. OBFUSCATION FUNCTIONS

**11 Reversible Functions** (src/core/functions/):

1. `bitwiseRotationAndXOR` - Rotate bits + XOR
2. `swapNeighboringBytes` - Swap adjacent bytes
3. `reverseBuffer` - Reverse entire buffer
4. `divideAndSwap` - Split and swap halves
5. `circularShiftObfuscation` - Circular bit shift
6. `xorWithKey` - XOR with rolling key
7. `bitwiseNOT` - Bitwise NOT
8. `reverseBits` - Reverse bits in each byte
9. `shiftBits` - Shift bits left/right
10. `substitution` - Byte substitution (needs init)
11. `addRandomValue` - Add random value mod 256 (needs init)

**All functions**: `(ByteArray, ByteArray, Any?) -> ByteArray`

**Priority**: CRITICAL (core obfuscation)

---

### 3. OBFUSCATOR ENGINE

**Class**: `Obfuscator` (src/core/obfuscator.ts)

**Key Features**:
- Applies 1-4 layers of obfuscation
- Dynamic function selection per packet
- Random padding (1-8 bytes)
- 3-byte header: [random][random][paddingLength]
- Function combo = (header[0] * header[1]) % totalCombos

**Packet Structure**:
```
[3-byte header][obfuscated data][random padding]
```

**Dependencies**:
- FunctionRegistry (manages 11 functions)
- FunctionInitializer (generates random params)

**Priority**: CRITICAL (core engine)

---

### 4. PROTOCOL TEMPLATES

**Purpose**: Mimic legitimate protocols to evade DPI

**Three Templates**:

| Template | ID | Header Size | HeaderID Location |
|----------|----|-----------|--------------------|
| QUIC | 1 | 11 bytes | Bytes 1-8 (8 bytes) |
| KCP | 2 | 24 bytes | Bytes 0-3 (4 bytes) |
| Gaming | 3 | 12 bytes | Bytes 4-7 (4 bytes) |

**Interface**:
```kotlin
interface ProtocolTemplate {
    fun extractHeaderID(packet: ByteArray): ByteArray?
    fun encapsulate(data: ByteArray, clientID: ByteArray): ByteArray
    fun decapsulate(packet: ByteArray): ByteArray?
    fun updateState()
}
```

**Priority**: MEDIUM (enhances DPI resistance)

---

### 5. UDP CLIENT LOGIC

**Class**: `UdpClient` (src/transport/udp/client.ts)

**Key Features**:
- 16-byte clientID generation
- JSON handshake with encryption
- Heartbeat mechanism (2 min interval)
- Inactivity detection (30 sec timeout)
- IP migration support (QUIC-style)
- Auto-reconnect with new params

**Flow**:
```
1. Generate clientID (16 bytes random)
2. Send encrypted handshake → get server port
3. Start heartbeat timer
4. Forward packets: WireGuard → Obfuscate → Template → Server
5. Receive packets: Server → Decapsulate → Deobfuscate → WireGuard
6. Monitor inactivity → reconnect if needed
```

**Priority**: CRITICAL (main client logic)

---

### 6. CONFIGURATION MANAGEMENT

**Simple Data Classes**:

```kotlin
data class ClientConfig(
    val remoteAddress: String,
    val remotePort: Int,
    val userId: String,
    val obfuscation: ObfuscationConfig
)

data class ObfuscationConfig(
    val key: Int,           // 0-255
    val layer: Int = 3,     // 1-4
    val paddingLength: Int = 8
)
```

**Priority**: LOW (simple structures)

---

## IMPLEMENTATION ORDER

### Week 1: Foundation
1. Encryptor (AES + RSA)
2. All 11 obfuscation functions
3. FunctionInitializer
4. FunctionRegistry

### Week 2: Core Logic
5. Obfuscator class
6. Configuration classes
7. Type definitions

### Week 3: Protocol Layer
8. BaseTemplate interface
9. QuicTemplate
10. KcpTemplate
11. GenericGamingTemplate
12. TemplateFactory + Selector

### Week 4: Network Layer
13. MorphUdpClient
14. Handshake protocol
15. Heartbeat mechanism
16. IP migration handling

### Week 5: Android Integration
17. VpnService implementation
18. UI components
19. Testing
20. Optimization

---

## DEPENDENCY MAPPING

| Node.js | Android Kotlin |
|---------|----------------|
| crypto.randomBytes() | SecureRandom().nextBytes() |
| crypto.createCipheriv() | Cipher.getInstance("AES/CBC/PKCS5Padding") |
| crypto.generateKeyPairSync() | KeyPairGenerator.getInstance("RSA") |
| crypto.scryptSync() | SCrypt.generate() (Bouncy Castle) |
| dgram.createSocket() | DatagramSocket() |
| Buffer | ByteArray |
| JSON.stringify() | Gson().toJson() |

---

## REQUIRED LIBRARIES

```gradle
dependencies {
    implementation 'org.bouncycastle:bcprov-jdk15on:1.70'
    implementation 'com.google.code.gson:gson:2.10.1'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
}
```

---

## KEY ARCHITECTURAL CONCEPTS

### Dual Indexing
- Server uses `Map<"ip:port:headerID", clientID>` for O(1) lookup
- Zero packet overhead (uses protocol-native headers)

### IP Migration
- ClientID-based sessions (16 bytes)
- Survives network changes without reconnection
- QUIC-style connection migration

### Dynamic Obfuscation
- Function combo selected per packet based on random header
- Unpredictable transformation patterns
- Defeats traffic analysis

### Plaintext ClientID
- ClientID sent unencrypted for O(1) server lookup
- Trade-off: Privacy vs Performance
- Data still encrypted and authenticated

---

## TESTING REQUIREMENTS

### Unit Tests
- All 11 functions (reversibility)
- Obfuscator (multi-layer)
- Encryptor (AES + RSA)
- Templates (encap/decap)

### Integration Tests
- Full handshake flow
- Data obfuscation pipeline
- IP migration simulation
- Heartbeat mechanism

### Performance Targets
- Throughput: >100 Mbps
- Latency: <5ms added
- Battery: <5% drain/hour

---

## ESTIMATED EFFORT

| Phase | Hours |
|-------|-------|
| Crypto + Functions | 40 |
| Obfuscator + Config | 20 |
| Protocol Templates | 30 |
| UDP Client | 40 |
| Android Integration | 30 |
| Testing | 40 |
| **TOTAL** | **200 hours** |

**Timeline**: 5 weeks @ 40 hours/week

---

## SUCCESS CRITERIA

✅ Successful handshake with TypeScript server
✅ Data obfuscation/deobfuscation working
✅ VPN traffic routing correctly
✅ IP migration working
✅ >100 Mbps throughput
✅ <5ms added latency
✅ 80%+ test coverage
✅ Stable 24+ hours continuous use

---

## RISK MITIGATION

| Risk | Mitigation |
|------|------------|
| Crypto API differences | Use Bouncy Castle, extensive testing |
| Battery drain | Optimize packet handling, batch operations |
| Performance on low-end devices | Profile and optimize, configurable settings |
| VPN service lifecycle | Handle all lifecycle events properly |

---

## NEXT STEPS

1. Set up Android project with dependencies
2. Implement Encryptor class (Week 1)
3. Implement all 11 obfuscation functions (Week 1)
4. Build Obfuscator engine (Week 2)
5. Implement protocol templates (Week 3)
6. Build UDP client (Week 4)
7. Integrate with VpnService (Week 5)
8. Test with TypeScript server
9. Optimize and release

---

## CONTACT & RESOURCES

- TypeScript Implementation: `/workspaces/morphProtocol/src/`
- Documentation: `README.md`, `SECURITY.md`, `DUAL_INDEXING.md`
- Tests: `/workspaces/morphProtocol/tests/`
