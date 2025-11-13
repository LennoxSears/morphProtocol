# morphProtocol Architecture Diagram

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ANDROID CLIENT                              │
│                                                                     │
│  ┌──────────────┐         ┌──────────────┐                        │
│  │   UI Layer   │────────▶│  VpnService  │                        │
│  │              │         │              │                        │
│  │ - MainActivity        │ - VPN Interface│                        │
│  │ - Settings   │         │ - Lifecycle  │                        │
│  └──────────────┘         └──────┬───────┘                        │
│                                   │                                 │
│                                   ▼                                 │
│                          ┌────────────────┐                        │
│                          │ MorphUdpClient │                        │
│                          └────────┬───────┘                        │
└──────────────────────────────────┼──────────────────────────────────┘
                                   │
                                   │ UDP Packets
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
            ┌──────────────┐ ┌──────────┐ ┌──────────────┐
            │   Encryptor  │ │Obfuscator│ │ProtocolTemplate│
            │              │ │          │ │              │
            │ - AES-256    │ │ - 11 Fns │ │ - QUIC       │
            │ - RSA-2048   │ │ - Layers │ │ - KCP        │
            └──────────────┘ └──────────┘ │ - Gaming     │
                                           └──────────────┘
                                                  │
                                                  │ Encapsulated
                                                  │ Packets
                                                  ▼
                                    ┌──────────────────────┐
                                    │  TypeScript Server   │
                                    │                      │
                                    │ - Handshake Handler  │
                                    │ - Session Manager    │
                                    │ - WireGuard Forwarder│
                                    └──────────────────────┘
```

---

## Packet Processing Pipeline

### Outbound (Client → Server)

```
┌──────────────┐
│  WireGuard   │  Raw VPN packet
│  (51820)     │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│                    MorphUdpClient                        │
│                                                          │
│  Step 1: Obfuscation                                    │
│  ┌────────────────────────────────────────────┐         │
│  │           Obfuscator.obfuscation()         │         │
│  │                                            │         │
│  │  1. Generate 3-byte header                │         │
│  │  2. Calculate function combo              │         │
│  │  3. Apply 1-4 obfuscation functions       │         │
│  │  4. Add random padding                    │         │
│  │                                            │         │
│  │  Input:  [VPN packet data]                │         │
│  │  Output: [header][obfuscated][padding]    │         │
│  └────────────────────────────────────────────┘         │
│                       │                                  │
│                       ▼                                  │
│  Step 2: Template Encapsulation                         │
│  ┌────────────────────────────────────────────┐         │
│  │      ProtocolTemplate.encapsulate()        │         │
│  │                                            │         │
│  │  1. Create protocol header (QUIC/KCP/Game)│         │
│  │  2. Embed clientID in header              │         │
│  │  3. Append obfuscated data                │         │
│  │  4. Update sequence number                │         │
│  │                                            │         │
│  │  Input:  [obfuscated data]                │         │
│  │  Output: [protocol header][obfuscated]    │         │
│  └────────────────────────────────────────────┘         │
│                       │                                  │
└───────────────────────┼──────────────────────────────────┘
                        │
                        ▼
                ┌───────────────┐
                │  UDP Socket   │  Send to server
                │  (remote port)│
                └───────────────┘
```

### Inbound (Server → Client)

```
┌───────────────┐
│  UDP Socket   │  Receive from server
│  (remote port)│
└───────┬───────┘
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│                    MorphUdpClient                        │
│                                                          │
│  Step 1: Template Decapsulation                         │
│  ┌────────────────────────────────────────────┐         │
│  │      ProtocolTemplate.decapsulate()        │         │
│  │                                            │         │
│  │  1. Validate protocol header              │         │
│  │  2. Extract obfuscated data               │         │
│  │  3. Verify packet structure               │         │
│  │                                            │         │
│  │  Input:  [protocol header][obfuscated]    │         │
│  │  Output: [obfuscated data]                │         │
│  └────────────────────────────────────────────┘         │
│                       │                                  │
│                       ▼                                  │
│  Step 2: Deobfuscation                                  │
│  ┌────────────────────────────────────────────┐         │
│  │         Obfuscator.deobfuscation()         │         │
│  │                                            │         │
│  │  1. Extract 3-byte header                 │         │
│  │  2. Calculate function combo              │         │
│  │  3. Remove padding                        │         │
│  │  4. Apply deobfuscation in REVERSE order  │         │
│  │                                            │         │
│  │  Input:  [header][obfuscated][padding]    │         │
│  │  Output: [VPN packet data]                │         │
│  └────────────────────────────────────────────┘         │
│                       │                                  │
└───────────────────────┼──────────────────────────────────┘
                        │
                        ▼
                ┌──────────────┐
                │  WireGuard   │  Forward to VPN
                │  (51820)     │
                └──────────────┘
```

---

## Obfuscation Layer Detail

```
┌─────────────────────────────────────────────────────────────┐
│                      Obfuscator                             │
│                                                             │
│  ┌───────────────────────────────────────────────────┐     │
│  │           FunctionRegistry                        │     │
│  │                                                   │     │
│  │  11 Function Pairs:                              │     │
│  │  ┌─────────────────────────────────────────┐     │     │
│  │  │ 1. bitwiseRotationAndXOR                │     │     │
│  │  │ 2. swapNeighboringBytes                 │     │     │
│  │  │ 3. reverseBuffer                        │     │     │
│  │  │ 4. divideAndSwap                        │     │     │
│  │  │ 5. circularShiftObfuscation             │     │     │
│  │  │ 6. xorWithKey                           │     │     │
│  │  │ 7. bitwiseNOT                           │     │     │
│  │  │ 8. reverseBits                          │     │     │
│  │  │ 9. shiftBits                            │     │     │
│  │  │ 10. substitution (needs init)           │     │     │
│  │  │ 11. addRandomValue (needs init)         │     │     │
│  │  └─────────────────────────────────────────┘     │     │
│  │                                                   │     │
│  │  Permutations:                                   │     │
│  │  - Layer 1: 11 combos (single function)         │     │
│  │  - Layer 2: 110 combos (2 functions)            │     │
│  │  - Layer 3: 990 combos (3 functions)            │     │
│  │  - Layer 4: 7920 combos (4 functions)           │     │
│  │                                                   │     │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
│  ┌───────────────────────────────────────────────────┐     │
│  │         FunctionInitializer                       │     │
│  │                                                   │     │
│  │  - substitutionTable: [256 random ints]          │     │
│  │  - randomValue: 0-255                            │     │
│  │                                                   │     │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Handshake Flow

```
┌──────────────┐                              ┌──────────────┐
│    Client    │                              │    Server    │
└──────┬───────┘                              └──────┬───────┘
       │                                             │
       │ 1. Generate clientID (16 bytes)            │
       │    Generate obfuscation params             │
       │    Select protocol template                │
       │                                             │
       │ 2. Handshake JSON (encrypted)              │
       │────────────────────────────────────────────▶│
       │    {                                        │
       │      clientID: "base64...",                 │
       │      key: 123,                              │
       │      obfuscationLayer: 3,                   │
       │      fnInitor: {...},                       │
       │      templateId: 1,                         │
       │      userId: "user123"                      │
       │    }                                        │
       │                                             │
       │                                             │ 3. Create session
       │                                             │    Allocate port
       │                                             │    Store params
       │                                             │
       │ 4. Response JSON (encrypted)                │
       │◀────────────────────────────────────────────│
       │    {                                        │
       │      port: 12345,                           │
       │      clientID: "base64...",                 │
       │      status: "connected"                    │
       │    }                                        │
       │                                             │
       │ 5. Start heartbeat timer                   │
       │    Start inactivity monitor                │
       │                                             │
       │ 6. Heartbeat (every 2 min)                 │
       │────────────────────────────────────────────▶│
       │    [clientID][0x01]                         │
       │                                             │
       │ 7. Data packets                             │
       │◀───────────────────────────────────────────▶│
       │    [template header][obfuscated data]       │
       │                                             │
```

---

## Protocol Template Structure

### QUIC Template (11 bytes)

```
┌──────┬────────────────────┬──────────────┬─────────────┐
│Flags │  Connection ID     │ Packet Num   │   Data      │
│1 byte│    8 bytes         │  2 bytes     │  N bytes    │
└──────┴────────────────────┴──────────────┴─────────────┘
 0x40-   First 8 bytes of    Sequence      Obfuscated
 0x4f    clientID            number        payload
```

### KCP Template (24 bytes)

```
┌──────┬───┬───┬─────┬──────┬──────┬──────┬──────┬─────────┐
│ Conv │Cmd│Frg│ Wnd │  Ts  │  Sn  │ Una  │ Len  │  Data   │
│4 byte│1  │1  │2    │4     │4     │4     │4     │ N bytes │
└──────┴───┴───┴─────┴──────┴──────┴──────┴──────┴─────────┘
 First   0x51 0  256   Time   Seq   Seq-1  Data   Obfuscated
 4 bytes                stamp  num         length  payload
 of clientID
```

### Generic Gaming Template (12 bytes)

```
┌──────────┬────────────┬──────────┬──────┬───────┬─────────┐
│  Magic   │ Session ID │ Sequence │ Type │ Flags │  Data   │
│ 4 bytes  │  4 bytes   │ 2 bytes  │1 byte│1 byte │ N bytes │
└──────────┴────────────┴──────────┴──────┴───────┴─────────┘
  "GAME"    First 4      Sequence   0x01-  Random  Obfuscated
            bytes of     number     0x05          payload
            clientID
```

---

## Class Dependency Graph

```
MorphUdpClient
├── Encryptor
│   ├── javax.crypto.Cipher (AES-256-CBC)
│   ├── java.security.KeyPairGenerator (RSA-2048)
│   └── org.bouncycastle.crypto.generators.SCrypt
│
├── Obfuscator
│   ├── FunctionRegistry
│   │   ├── bitwiseRotationAndXOR
│   │   ├── swapNeighboringBytes
│   │   ├── reverseBuffer
│   │   ├── divideAndSwap
│   │   ├── circularShiftObfuscation
│   │   ├── xorWithKey
│   │   ├── bitwiseNOT
│   │   ├── reverseBits
│   │   ├── shiftBits
│   │   ├── substitution
│   │   └── addRandomValue
│   │
│   └── FunctionInitializer
│       ├── generateSubstitutionTable()
│       └── generateRandomValue()
│
└── ProtocolTemplate
    ├── QuicTemplate
    ├── KcpTemplate
    └── GenericGamingTemplate
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Android Application                      │
│                                                             │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐         │
│  │   UI     │─────▶│ VpnService│─────▶│ UDP Client│         │
│  └──────────┘      └──────────┘      └─────┬────┘         │
│                                             │               │
└─────────────────────────────────────────────┼───────────────┘
                                              │
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                    ▼                         ▼                         ▼
            ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
            │   Handshake   │        │  Data Packets │        │   Heartbeat   │
            │   (encrypted) │        │  (obfuscated) │        │  (template)   │
            └───────┬───────┘        └───────┬───────┘        └───────┬───────┘
                    │                        │                        │
                    └────────────────────────┼────────────────────────┘
                                             │
                                             │ UDP
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │  Server:12301   │
                                    │  (Handshake)    │
                                    └────────┬────────┘
                                             │
                                             │ Allocate port
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │  Server:xxxxx   │
                                    │  (Data tunnel)  │
                                    └────────┬────────┘
                                             │
                                             │ Forward
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │  WireGuard      │
                                    │  (51820)        │
                                    └─────────────────┘
```

---

## State Machine

```
┌─────────────┐
│   INITIAL   │
└──────┬──────┘
       │ start()
       ▼
┌─────────────────┐
│  HANDSHAKING    │◀──────────┐
│                 │           │
│ - Send handshake│           │ Retry
│ - Wait response │           │ (max 5)
└──────┬──────────┘           │
       │ Response received    │
       │                      │
       ▼                      │
┌─────────────────┐           │
│   CONNECTED     │           │
│                 │           │
│ - Forward data  │           │
│ - Send heartbeat│           │
│ - Monitor alive │           │
└──────┬──────────┘           │
       │                      │
       │ Inactivity timeout   │
       │                      │
       ▼                      │
┌─────────────────┐           │
│  RECONNECTING   │───────────┘
│                 │
│ - New clientID  │
│ - New template  │
│ - New params    │
└──────┬──────────┘
       │ stop()
       ▼
┌─────────────┐
│   STOPPED   │
└─────────────┘
```

---

## Memory Layout

### Obfuscated Packet Structure

```
Byte Offset:  0    1    2    3    4    ...    N    N+1  ...  N+P
            ┌────┬────┬────┬─────────────────┬─────────────────┐
            │ H0 │ H1 │ PL │  Obfuscated     │   Padding       │
            │    │    │    │  Data           │   (1-8 bytes)   │
            └────┴────┴────┴─────────────────┴─────────────────┘
             Random  Padding
             bytes   Length

Function Combo Index = (H0 * H1) % totalCombinations
```

### Template Packet Structure (QUIC Example)

```
Byte Offset:  0    1    2    ...  8    9    10   11   ...   N
            ┌────┬──────────────────┬─────┬─────┬─────────────┐
            │Flag│  Connection ID   │ Pkt │ Pkt │ Obfuscated  │
            │    │  (8 bytes)       │ Num │ Num │ Data        │
            └────┴──────────────────┴─────┴─────┴─────────────┘
             0x4x  First 8 bytes     High  Low   From
                   of clientID       byte  byte  Obfuscator
```

---

## Performance Considerations

### Packet Overhead

```
Original VPN Packet: 1500 bytes
                     │
                     ▼
After Obfuscation:   1500 + 3 (header) + 1-8 (padding) = 1504-1511 bytes
                     │
                     ▼
After Template:      1504-1511 + 11-24 (template header) = 1515-1535 bytes

Total Overhead: 15-35 bytes (1-2.3%)
```

### Processing Time (Estimated)

```
Obfuscation:     ~0.5ms  (11 functions, 3 layers)
Encryption:      ~1.0ms  (AES-256-CBC)
Template:        ~0.1ms  (header manipulation)
UDP Send:        ~0.5ms  (kernel + network)
─────────────────────────────────────────
Total:           ~2.1ms per packet

Throughput:      ~476 packets/second
At 1500 bytes:   ~5.7 Mbps per core
```

---

This architecture provides a clear separation of concerns, making the Android port straightforward and maintainable.
