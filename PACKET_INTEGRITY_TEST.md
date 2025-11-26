# Packet Integrity Test - WireGuard Handshake Verification

## Purpose

Verify that WireGuard packets are NOT corrupted during the obfuscation/deobfuscation and template/de-template process.

## Test Setup

### What We're Testing

```
Android Client                          Server
─────────────────────────────────────────────────────────────────
WireGuard generates                     
148-byte handshake                      
     ↓                                  
[TEST-WG→Server]                        
Log original packet                     
SHA256: <hash1>                         
     ↓                                  
Obfuscate (148→159 bytes)              
     ↓                                  
Template (159→170 bytes)               
     ↓                                  
Send to server ─────────────────────→  Receive 170 bytes
                                            ↓
                                       De-template (170→159 bytes)
                                            ↓
                                       Deobfuscate (159→148 bytes)
                                            ↓
                                       [TEST-Client→WG]
                                       Log deobfuscated packet
                                       SHA256: <hash2>
                                            ↓
                                       Send to WireGuard (127.0.0.1:51820)
                                            ↓
                                       WireGuard processes...
                                            ↓
                                       WireGuard responds (92 bytes)
                                            ↓
                                       [TEST-WG→Client]
                                       Log WireGuard response
                                       SHA256: <hash3>
                                            ↓
                                       Obfuscate + Template
                                            ↓
                                       Send to client ←─────────────
```

## Expected Results

### ✅ Success Criteria

1. **SHA256 hashes match**: `<hash1>` (client) == `<hash2>` (server)
2. **Hex dumps match**: All 148 bytes identical
3. **WireGuard responds**: Server logs show `[TEST-WG→Client]` with 92-byte response
4. **Client receives response**: Android logs show deobfuscated response

### ❌ Failure Scenarios

| Symptom | Likely Cause |
|---------|--------------|
| SHA256 mismatch | Obfuscation/deobfuscation bug |
| Hex differs at specific bytes | Template/de-template issue |
| No WireGuard response | WireGuard config issue (not MorphProtocol) |
| Server crashes | Substitution table issue |

## How to Run Test

### 1. Rebuild Android App

```bash
cd android
./gradlew clean assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 2. Rebuild Server

```bash
cd /workspaces/morphProtocol
npm run build
# Deploy to server and restart
```

### 3. Connect and Capture Logs

**Android logs:**
```bash
adb logcat | grep -E "TEST-WG|TEST-Server"
```

**Server logs:**
```bash
# On server
tail -f /path/to/server.log | grep -E "TEST-Client|TEST-WG"
```

### 4. Trigger Connection

Open the Android app and connect to VPN.

## Log Analysis

### Example: Successful Packet Integrity

**Android Client Log:**
```
[TEST-WG→Server] Original WG packet (148 bytes):
[TEST-WG→Server] HEX: 01 00 00 00 7d 67 5e 70 ce 53 08 70 74 90 06 4e ...
[TEST-WG→Server] SHA256: a1b2c3d4e5f6...
```

**Server Log:**
```
[TEST-Client→WG] Deobfuscated packet (148 bytes):
[TEST-Client→WG] HEX: 01 00 00 00 7d 67 5e 70 ce 53 08 70 74 90 06 4e ...
[TEST-Client→WG] SHA256: a1b2c3d4e5f6...
```

**✅ Result**: SHA256 matches! Packet integrity preserved.

### Example: Packet Corruption

**Android Client Log:**
```
[TEST-WG→Server] HEX: 01 00 00 00 7d 67 5e 70 ...
[TEST-WG→Server] SHA256: a1b2c3d4e5f6...
```

**Server Log:**
```
[TEST-Client→WG] HEX: 01 00 00 00 7d 67 5e 71 ...  ← Byte 15 differs!
[TEST-Client→WG] SHA256: x9y8z7w6v5u4...  ← Different hash!
```

**❌ Result**: Corruption detected! Investigate obfuscation layer.

## Comparison Tool

Use this script to compare hex dumps:

```bash
#!/bin/bash
# compare_packets.sh

CLIENT_HEX="01 00 00 00 7d 67 5e 70 ..."
SERVER_HEX="01 00 00 00 7d 67 5e 70 ..."

if [ "$CLIENT_HEX" == "$SERVER_HEX" ]; then
    echo "✅ Packets match!"
else
    echo "❌ Packets differ!"
    diff <(echo "$CLIENT_HEX") <(echo "$SERVER_HEX")
fi
```

## What to Look For

### 1. Obfuscation Issue
- **Symptom**: SHA256 mismatch, random bytes differ
- **Cause**: Obfuscator using different parameters
- **Check**: Verify `key`, `layer`, `padding`, `fnInitor` match

### 2. Template Issue
- **Symptom**: Consistent byte offset errors
- **Cause**: Template header/footer not stripped correctly
- **Check**: Verify template ID matches (QUIC=1, KCP=2)

### 3. Network Issue
- **Symptom**: Packet size changes unexpectedly
- **Cause**: MTU fragmentation or corruption
- **Check**: Verify packet sizes: 148→159→170→159→148

### 4. WireGuard Config Issue (Not MorphProtocol)
- **Symptom**: Packets match perfectly, but no WireGuard response
- **Cause**: WireGuard peer not configured on server
- **Check**: `sudo wg show wg0` on server

## Next Steps Based on Results

### If SHA256 Matches
✅ **MorphProtocol is working correctly!**
- Obfuscation/deobfuscation: OK
- Template/de-template: OK
- Issue is in WireGuard configuration (not our code)

### If SHA256 Differs
❌ **MorphProtocol has a bug!**
1. Compare hex dumps byte-by-byte
2. Identify which bytes differ
3. Check if pattern is consistent
4. Investigate obfuscation functions used
5. Verify fnInitor (substitutionTable, randomValue) matches

### If No WireGuard Response (But SHA256 Matches)
⚠️ **WireGuard configuration issue**
- Server's WireGuard not responding
- Check peer configuration
- Verify allowed IPs
- Check preshared key
- **This is NOT a MorphProtocol bug**

## Clean Up

After testing, you can reduce log verbosity by removing the `[TEST-*]` logs or adding a debug flag to enable/disable them.

```kotlin
// Android
val DEBUG_PACKET_INTEGRITY = false  // Set to true for testing

if (DEBUG_PACKET_INTEGRITY) {
    Log.d(TAG, "[TEST-WG→Server] HEX: $fullHex")
}
```

```typescript
// Server
const DEBUG_PACKET_INTEGRITY = false;  // Set to true for testing

if (DEBUG_PACKET_INTEGRITY) {
    logger.info(`[TEST-Client→WG] HEX: ${fullHex}`);
}
```
