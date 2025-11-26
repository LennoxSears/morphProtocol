# Obfuscation Function Initializer Fix

## Problem Summary

The Android client was crashing the server with a `TypeError: Cannot read properties of undefined (reading 'findIndex')` error after successfully processing 3 WireGuard handshake packets.

## Root Cause

### The Issue

1. **Android Client** was sending `fnInitor` as an **integer ID** (e.g., `795656`)
2. **Server** expected `fnInitor` to be an **object** with:
   ```typescript
   {
     substitutionTable: number[],  // 256-element array
     randomValue: number           // single number 0-255
   }
   ```

### Why It Failed Intermittently

The obfuscation system uses a **random header** to select which combination of functions to apply:

```typescript
fnComboIndex = (header[0] * header[1]) % totalCombinations
```

With `layer=3`, there are **990 possible combinations** of 3 functions from 11 total functions.

- **Functions 0-8**: Don't require initializers (work with any value)
- **Function 9 (substitution)**: Requires `substitutionTable` array
- **Function 10 (addRandomValue)**: Requires `randomValue` number

**Packets 1-3**: Randomly selected combos that didn't include functions 9 or 10 → ✅ Success
**Packet 4**: Selected combo #864 which included function 9 or 10 → ❌ Crash

When the server tried to deobfuscate packet 4:
1. It called `de_substitution(data, keyArray, _initor)`
2. `_initor` was `undefined` (because `fnInitor` was just an integer, not an object)
3. `_initor.findIndex()` threw `TypeError`

## The Fix

### 1. Android Client Changes

**File**: `android/plugin/android/src/main/java/com/morphprotocol/client/core/Obfuscator.kt`

Added methods to expose the actual initializers:

```kotlin
/**
 * Get the substitution table for sending in handshake.
 */
fun getSubstitutionTable(): List<Int> {
    val table = initializers[9] as? ByteArray ?: return emptyList()
    return table.map { it.toInt() and 0xFF }
}

/**
 * Get the random value for sending in handshake.
 */
fun getRandomValue(): Int {
    return initializers[10] as? Int ?: 0
}
```

**File**: `android/plugin/android/src/main/java/com/morphprotocol/client/network/MorphUdpClient.kt`

Changed handshake to send actual initializers:

```kotlin
// OLD (WRONG):
"fnInitor" to obfuscationFnInitor,  // Just an integer ID

// NEW (CORRECT):
"fnInitor" to mapOf(
    "substitutionTable" to substitutionTable,  // 256-element array
    "randomValue" to randomValue               // 0-255
),
```

### 2. Server Changes

**File**: `src/core/functions/substitution.ts`

Added guard against undefined `_initor`:

```typescript
function de_substitution(input: Uint8Array, _keyArray: Uint8Array, _initor:number[]): Uint8Array {
    // Guard against undefined _initor
    if (!_initor || !Array.isArray(_initor)) {
        throw new Error('de_substitution: _initor (substitution table) is required but was undefined or invalid');
    }
    // ... rest of function
}
```

**File**: `src/core/obfuscator.ts`

Added error logging in deobfuscation:

```typescript
try {
    deobfuscatedData = functions[i].deobfuscation(deobfuscatedData, keyArray, functions[i].initor) as Uint8Array;
} catch (error: any) {
    console.error(`[Deobfuscation Error] Function: ${functions[i].deobfuscation.name}, Index: ${functions[i].index}`);
    console.error(`[Deobfuscation Error] Initor present: ${functions[i].initor !== undefined}`);
    throw error;
}
```

**File**: `src/transport/udp/server.ts`

Added validation for fnInitor format:

```typescript
// Validate fnInitor format
if (!handshakeData.fnInitor || typeof handshakeData.fnInitor !== 'object') {
    logger.error(`Invalid fnInitor format from client ${clientID}`);
    return;
}
if (!Array.isArray(handshakeData.fnInitor.substitutionTable) || 
    handshakeData.fnInitor.substitutionTable.length !== 256) {
    logger.error(`Invalid substitutionTable from client ${clientID}`);
    return;
}
if (typeof handshakeData.fnInitor.randomValue !== 'number') {
    logger.error(`Invalid randomValue from client ${clientID}`);
    return;
}
```

## Deployment Steps

### 1. Rebuild Android App

```bash
cd android
./gradlew assembleDebug
# Install on device
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 2. Rebuild and Deploy Server

```bash
# Build server
npm run build

# Or build bundled version
npm run bundle

# Deploy to server at 65.20.77.40
# (Copy dist/server.js or dist/server.bundle.js to server)
# Restart server process
```

## Testing

After deployment, test with:

1. Connect Android client to server
2. Monitor server logs for:
   - ✅ No `TypeError: Cannot read properties of undefined`
   - ✅ All packets deobfuscated successfully
   - ✅ WireGuard handshake completes
3. Monitor Android logs for:
   - ✅ Handshake sent with correct fnInitor format
   - ✅ Connection established
   - ✅ VPN tunnel working

## Why WireGuard Handshakes Were Failing

The WireGuard handshakes were being sent and deobfuscated successfully (first 3 packets), but:

1. **Server crashed on 4th packet** → No more processing
2. **Server's WireGuard couldn't respond** → Handshake never completed
3. **Client kept retrying** → Same pattern repeated

With this fix:
- All packets will be deobfuscated successfully
- Server's WireGuard can respond
- Handshake will complete
- VPN tunnel will establish

## Additional Notes

- The `fnInitor` integer ID is still generated but no longer sent to server
- Each connection generates fresh random initializers
- Both client and server must use the same initializers for the session
- The substitution table is 256 bytes, sent as array of integers 0-255
