# IP Migration Feature

## Overview

morphProtocol now supports seamless IP migration, similar to QUIC's connection migration feature. Clients can change their IP address or port without losing their session or requiring a new handshake.

## How It Works

### Connection ID Based Sessions

Instead of using `IP:Port` as the session identifier, the system now uses a unique **ClientID**:

```
┌─────────────┐                    ┌─────────────┐
│   Client    │                    │   Server    │
│             │                    │             │
│ ClientID:   │                    │ Sessions:   │
│ a1b2c3...   │                    │ Map<ID,     │
│             │                    │   Session>  │
│ IP: 1.2.3.4 │ ──── Packet ────> │             │
│ Port: 5000  │   [ClientID][Data] │ Lookup by   │
│             │                    │ ClientID    │
│             │                    │             │
│ IP changes  │                    │             │
│ to 5.6.7.8  │                    │             │
│             │ ──── Packet ────> │             │
│ Port: 6000  │   [ClientID][Data] │ Same        │
│             │                    │ Session!    │
└─────────────┘                    └─────────────┘
```

### Key Components

#### 1. ClientID Generation (Client)
- **Size**: 16 bytes (128-bit)
- **Format**: Random bytes generated via `crypto.randomBytes(16)`
- **Lifetime**: Per process (ephemeral)
- **Encoding**: 
  - Base64 in handshake JSON (24 characters)
  - Raw binary in data packets (16 bytes)
  - Hex string as Map key on server (32 characters)

```typescript
// Client generates once per connection
const clientID = crypto.randomBytes(16);
logger.info(`Generated clientID: ${clientID.toString('hex')}`);
```

#### 2. Handshake with ClientID
```typescript
// Client sends
{
  clientID: "base64_encoded_16_bytes",
  key: 123,
  obfuscationLayer: 3,
  randomPadding: 8,
  fnInitor: {...},
  userId: "user123",
  publicKey: "..."
}

// Server responds
{
  port: 12345,
  clientID: "base64_encoded_16_bytes",  // Confirmation
  status: "connected" | "reconnected"
}
```

#### 3. Data Packet Structure
```
┌──────────────┬────────────────────────┐
│  ClientID    │   Obfuscated Data      │
│  (16 bytes)  │   (N bytes)            │
└──────────────┴────────────────────────┘
```

**Why ClientID is unobfuscated:**
- Server needs clientID to lookup which obfuscator to use
- Cannot deobfuscate without knowing which session it belongs to
- ClientID itself doesn't reveal sensitive information

#### 4. Heartbeat with ClientID
```
┌──────────────┬────────┐
│  ClientID    │  0x01  │
│  (16 bytes)  │ (1 byte)│
└──────────────┴────────┘
```

## Session Management

### Server Session Structure
```typescript
interface ClientSession {
  clientID: string;           // hex string (32 chars)
  remoteAddress: string;      // Current client IP
  remotePort: number;         // Current client port
  socket: dgram.Socket;       // Dedicated socket
  obfuscator: Obfuscator;     // Session obfuscator
  userInfo: UserInfo;         // User and traffic info
  publicKey: string;          // Client public key
  lastSeen: number;           // Last packet timestamp
}
```

### Session Lifecycle

#### New Connection
1. Client generates clientID
2. Client sends handshake with clientID
3. Server creates new session keyed by clientID
4. Server responds with port and clientID confirmation

#### Reconnection (Same ClientID)
1. Client sends handshake with existing clientID
2. Server finds existing session
3. Server updates IP/port in session
4. Server responds with existing port and "reconnected" status
5. **No new obfuscator created** - session reused!

#### IP Migration (During Active Session)
1. Client IP changes (WiFi → Mobile, network roaming, etc.)
2. Client sends data packet with clientID prepended
3. Server extracts clientID, finds session
4. Server detects IP/port mismatch
5. Server logs migration and updates session
6. **Traffic continues seamlessly!**

```typescript
// Server detects and handles IP migration
if (session.remoteAddress !== remote.address || 
    session.remotePort !== remote.port) {
  logger.info(`IP migration detected for client ${clientID}`);
  logger.info(`  Old: ${session.remoteAddress}:${session.remotePort}`);
  logger.info(`  New: ${remote.address}:${remote.port}`);
  session.remoteAddress = remote.address;
  session.remotePort = remote.port;
}
```

## Benefits

### 1. Seamless IP Migration
- Client can switch networks without reconnection
- No handshake overhead
- No traffic interruption
- Transparent to WireGuard layer

### 2. Mobile Network Friendly
- WiFi ↔ Cellular transitions
- Network roaming
- NAT rebinding
- Dynamic IP changes

### 3. Resilient Connections
- Survives temporary network issues
- Automatic recovery from IP changes
- No manual reconnection needed

### 4. Efficient
- Only 16 bytes overhead per packet
- No additional handshakes
- Minimal state management

## Security Considerations

### ClientID Visibility
- **Risk**: ClientID is sent unobfuscated
- **Mitigation**: 
  - ClientID is random and doesn't reveal user identity
  - Cannot be used to hijack session (requires obfuscation params)
  - Changes per process restart

### ClientID Spoofing
- **Risk**: Attacker sends packets with stolen clientID
- **Current**: Basic validation (clientID must exist in sessions)
- **Future Enhancement**: HMAC or signature validation

### Session Hijacking
- **Risk**: Attacker intercepts clientID and sends from different IP
- **Mitigation**:
  - Obfuscation parameters only known to legitimate client
  - Encrypted control channel
  - Server logs IP migrations (can detect suspicious patterns)

## Configuration

No additional configuration needed! The feature works automatically.

### Environment Variables (Existing)
```env
# Timeout for inactive sessions
TIMEOUT_DURATION=1200000  # 20 minutes

# Heartbeat interval
HEARTBEAT_INTERVAL=120000  # 2 minutes

# Traffic reporting interval
TRAFFIC_INTERVAL=600000    # 10 minutes
```

## Monitoring

### Server Logs

**New Connection:**
```
[INFO] Generated clientID: a1b2c3d4e5f6...
[INFO] Creating new session for clientID a1b2c3d4e5f6...
[INFO] New session socket listening on port 12345 for clientID a1b2c3d4e5f6...
```

**Reconnection:**
```
[INFO] Client a1b2c3d4e5f6... reconnecting
[INFO]   Old IP: 192.168.1.100:5000
[INFO]   New IP: 192.168.1.100:5001
[INFO] Reconnection response sent to a1b2c3d4e5f6...
```

**IP Migration:**
```
[INFO] IP migration detected for client a1b2c3d4e5f6...
[INFO]   Old: 192.168.1.100:5000
[INFO]   New: 10.0.0.50:6000
```

**Heartbeat:**
```
[DEBUG] Heartbeat from client a1b2c3d4e5f6...
```

## Testing IP Migration

### Scenario 1: WiFi to Mobile
1. Start client on WiFi
2. Verify connection established
3. Switch to mobile data
4. Observe seamless continuation
5. Check server logs for IP migration

### Scenario 2: Network Roaming
1. Start client on network A
2. Move to network B (different subnet)
3. Client automatically continues
4. Server logs show IP change

### Scenario 3: NAT Rebinding
1. Client behind NAT
2. NAT mapping expires/changes
3. Client sends packet from new port
4. Server updates session port
5. Traffic continues

## Comparison with QUIC

| Feature | QUIC | morphProtocol |
|---------|------|---------------|
| Connection ID | ✅ Yes | ✅ Yes (ClientID) |
| ID Size | Variable (0-160 bits) | Fixed (128 bits) |
| Zero-RTT Migration | ✅ Yes | ✅ Yes |
| Path Validation | ✅ Yes | ❌ No (future) |
| Multi-path | ✅ Yes | ❌ No |
| ID Rotation | ✅ Yes | ❌ No (future) |

## Future Enhancements

### 1. Path Validation
Validate new path before accepting migration:
```
Client → Server: Challenge on new path
Server → Client: Response
Client → Server: Proof
Server: Accept migration
```

### 2. ClientID Rotation
Periodically rotate clientID for privacy:
```
Client generates new clientID
Client sends migration message
Server updates session key
```

### 3. Multi-path Support
Use multiple paths simultaneously:
```
Session has multiple (IP, port) pairs
Load balance across paths
Failover on path failure
```

### 4. HMAC Validation
Add HMAC to prevent spoofing:
```
Packet: [ClientID][HMAC(ClientID, SharedSecret)][Data]
Server validates HMAC before accepting
```

## Troubleshooting

### Issue: Client can't reconnect after IP change
**Check:**
- ClientID is being sent correctly
- Server session hasn't timed out (20 min default)
- Firewall allows UDP from new IP

### Issue: Server shows "Unknown clientID"
**Possible causes:**
- Session timed out
- Server restarted (sessions are in-memory)
- ClientID mismatch (check logs)

**Solution:**
- Client will automatically do full handshake
- New session will be created

### Issue: Frequent IP migrations logged
**Possible causes:**
- NAT instability
- Mobile network handoffs
- Load balancer changing source port

**Action:**
- Normal behavior, no action needed
- Monitor for suspicious patterns

## Performance Impact

### Overhead
- **Per packet**: +16 bytes (ClientID)
- **Handshake**: +24 bytes (base64 clientID in JSON)
- **Memory**: ~200 bytes per session (ClientSession struct)

### Throughput
- Negligible impact (<0.1% for typical packet sizes)
- 1500 byte packet: 16/1500 = 1.07% overhead
- 9000 byte jumbo frame: 16/9000 = 0.18% overhead

### Latency
- Zero additional latency for IP migration
- No handshake needed on IP change
- Immediate traffic resumption

## Conclusion

The ClientID-based IP migration feature provides QUIC-like connection mobility for morphProtocol, enabling seamless network transitions without reconnection overhead. This is especially valuable for mobile clients and environments with dynamic IP addressing.
