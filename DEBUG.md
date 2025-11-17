# Debug Mode - Data Integrity Verification

MorphProtocol includes a debug mode that verifies the correctness of template encapsulation/decapsulation and obfuscation/deobfuscation processes.

## Overview

When debug mode is enabled, the client automatically sends a test packet after handshake completion. This test packet contains a known pattern (256 bytes: 0x00, 0x01, 0x02, ..., 0xFF) that allows verification of the entire data transformation pipeline.

## How It Works

### Client Side (Sender)

1. **Generate test data**: 256 bytes with pattern 0x00-0xFF
2. **Obfuscate**: Apply multi-layer obfuscation
3. **Encapsulate**: Wrap with protocol template (QUIC/KCP/Gaming)
4. **Send**: Transmit to server
5. **Log**: Output hex dumps at each stage

### Server Side (Receiver)

1. **Receive**: Get packet from client
2. **Decapsulate**: Remove protocol template header
3. **Deobfuscate**: Reverse obfuscation layers
4. **Verify**: Check if data matches expected pattern
5. **Log**: Output hex dumps and verification result

## Enabling Debug Mode

### Option 1: Environment Variable

Add to your `.env` file:

```bash
DEBUG_MODE=true
```

### Option 2: Command Line

```bash
DEBUG_MODE=true npm run server
DEBUG_MODE=true npm run client <server_ip>:<port>:<user_id> <encryption_key>
```

## Usage Example

### 1. Start Server with Debug Mode

```bash
# Edit .env
echo "DEBUG_MODE=true" >> .env

# Start server
npm run server
```

### 2. Start Client with Debug Mode

```bash
# In another terminal
npm run client 192.168.1.100:12301:testuser "base64key:base64iv"
```

### 3. Observe Logs

**Client Output:**
```
[INFO] Selected protocol template: KCP Protocol (ID: 2)
[INFO] Handshake data sent to handshake server
[INFO] Received server response:
[INFO]   Port: 60276
[INFO]   ClientID confirmed: qzM+F9AfqacaW7iQslBBZg==
[INFO]   Status: connected
[INFO] === DEBUG MODE: Sending test data ===
[INFO] [DEBUG] Raw test data (256 bytes):
[INFO] [DEBUG]   First 32 bytes: 000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f
[INFO] [DEBUG]   Last 32 bytes: e0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff
[INFO] [DEBUG]   Full hex: 000102030405...fcfdfeff
[INFO] [DEBUG] After obfuscation (256 bytes):
[INFO] [DEBUG]   First 32 bytes: a3f5c8d9e2b1...
[INFO] [DEBUG] After template encapsulation (280 bytes):
[INFO] [DEBUG]   Template: KCP Protocol (ID: 2)
[INFO] [DEBUG]   First 32 bytes: ab333e17d01f...
[INFO] [DEBUG] Test data sent to server successfully
```

**Server Output:**
```
[INFO] New session socket listening on port 60276 for clientID ab333e17d01fa9a71a5bb890b2504166
[INFO] Response sent to client ab333e17d01fa9a71a5bb890b2504166
[INFO] === DEBUG MODE: Received test data ===
[INFO] [DEBUG] After template decapsulation (256 bytes):
[INFO] [DEBUG]   First 32 bytes: a3f5c8d9e2b1...
[INFO] [DEBUG] After deobfuscation (256 bytes):
[INFO] [DEBUG]   First 32 bytes: 000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f
[INFO] [DEBUG]   Last 32 bytes: e0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff
[INFO] [DEBUG]   Full hex: 000102030405...fcfdfeff
[INFO] [DEBUG] ✅ Data integrity verified! All bytes match expected pattern (0x00-0xFF)
```

## What Gets Verified

### ✅ Successful Verification

If you see:
```
[DEBUG] ✅ Data integrity verified! All bytes match expected pattern (0x00-0xFF)
```

This confirms:
- Protocol template encapsulation/decapsulation works correctly
- Obfuscation/deobfuscation is reversible and lossless
- All transformation layers preserve data integrity
- Client and server are using compatible configurations

### ❌ Failed Verification

If you see:
```
[DEBUG] ❌ Data integrity check FAILED!
[DEBUG] Data mismatch at byte 42: expected 42, got 137
```

This indicates a problem with:
- Obfuscation parameters mismatch between client/server
- Protocol template implementation bug
- Network corruption (unlikely with UDP checksums)
- Configuration mismatch (key, layer, padding, etc.)

## Troubleshooting

### No Debug Output

**Problem**: Debug mode enabled but no test data logs appear.

**Solutions**:
1. Verify `DEBUG_MODE=true` in `.env`
2. Restart both client and server
3. Check that handshake completes successfully
4. Ensure LOG_LEVEL allows INFO messages

### Data Mismatch Errors

**Problem**: Server reports data integrity check failed.

**Solutions**:
1. Verify client and server use same obfuscation parameters
2. Check that both use same protocol template
3. Ensure no middleware is modifying packets
4. Verify network path doesn't corrupt UDP packets

### Template Decapsulation Fails

**Problem**: Server logs "Failed to decapsulate template packet"

**Solutions**:
1. Verify client and server use same template ID
2. Check template parameters match (sequence numbers, timestamps)
3. Ensure clientID is correctly transmitted in handshake
4. Verify headerID extraction logic

## Technical Details

### Test Data Pattern

The test data is a simple incrementing byte sequence:
```
Byte 0:   0x00
Byte 1:   0x01
Byte 2:   0x02
...
Byte 255: 0xFF
```

This pattern is easy to verify and detects:
- Byte order issues
- Off-by-one errors
- Truncation or padding problems
- Bit flipping or corruption

### Timing

The test data is sent 1 second after handshake completion to ensure:
- Server session is fully initialized
- Heartbeat mechanism is running
- All state is synchronized

### Packet Size

The 256-byte test packet is chosen because:
- Large enough to test obfuscation thoroughly
- Small enough to avoid fragmentation
- Easily distinguishable from heartbeats (1 byte)
- Fits within typical MTU limits

## Production Use

⚠️ **Important**: Debug mode should be **disabled in production** because:

1. **Performance**: Adds logging overhead
2. **Security**: Exposes packet contents in logs
3. **Bandwidth**: Sends extra test packets
4. **Logs**: Generates large log files with hex dumps

Always set `DEBUG_MODE=false` or remove the variable in production environments.

## Integration with Testing

Debug mode can be used in automated tests:

```bash
#!/bin/bash
# test-integration.sh

export DEBUG_MODE=true

# Start server in background
npm run server &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Run client
npm run client localhost:12301:testuser "testkey:testiv" > client.log 2>&1

# Check for success message
if grep -q "Data integrity verified" server.log; then
  echo "✅ Integration test PASSED"
  exit 0
else
  echo "❌ Integration test FAILED"
  exit 1
fi

# Cleanup
kill $SERVER_PID
```

## See Also

- [README.md](README.md) - Main documentation
- [ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md) - System architecture
- [CAPACITOR_PLUGIN.md](CAPACITOR_PLUGIN.md) - Mobile client documentation
