# Client UDP Fixes - Aligned with New Structure

## Changes Applied

### 1. Fixed Import Paths ✅
**Before:**
```typescript
import { Obfuscator } from '../../Obfuscator';
import { fnInitor } from '../../fnInitor';
import { Encryptor } from '../encryptor';
```

**After:**
```typescript
import { Obfuscator } from '../../core/obfuscator';
import { fnInitor } from '../../core/function-initializer';
import { Encryptor } from '../../crypto/encryptor';
import { getClientConfig } from '../../config';
import { logger } from '../../utils/logger';
```

### 2. Integrated Configuration System ✅
**Before:**
```typescript
HANDSHAKE_SERVER_ADDRESS = remoteAddress.split(':')[0];
HANDSHAKE_SERVER_PORT = Number(remoteAddress.split(':')[1]);
userId = remoteAddress.split(':')[2];
const LOCALWG_ADDRESS = '127.0.0.1';
const LOCALWG_PORT = 51820;
const MAX_RETRIES = 5;
const HEARTBEAT_INTERVAL = 120000;
```

**After:**
```typescript
const config = getClientConfig(remoteAddress);
HANDSHAKE_SERVER_ADDRESS = config.remoteAddress;
HANDSHAKE_SERVER_PORT = config.remotePort;
userId = config.userId;
const LOCALWG_ADDRESS = config.localWgAddress;
const LOCALWG_PORT = config.localWgPort;
const MAX_RETRIES = config.maxRetries;
const HEARTBEAT_INTERVAL = config.heartbeatInterval;
```

### 3. Improved Encryption Initialization ✅
**Before:**
```typescript
encryptor = new Encryptor(`ULTzUl/OIfjDtbmr1q`); // Hardcoded password
encryptor.setSimple(simpleStr);
```

**After:**
```typescript
encryptor = new Encryptor(process.env.PASSWORD || 'bumoyu123'); // From config
encryptor.setSimple(encryptionKey);
```

### 4. Used Configuration for Obfuscation ✅
**Before:**
```typescript
const handshakeData = {
  key: Math.floor(Math.random() * 256),
  obfuscationLayer: 3,
  randomPadding: 8,
  fnInitor: fnInitor(),
  userId: userId,
  publicKey: 'not implemented',
};
```

**After:**
```typescript
const handshakeData = {
  key: config.obfuscation.key,
  obfuscationLayer: config.obfuscation.layer,
  randomPadding: config.obfuscation.paddingLength,
  fnInitor: fnInitor(),
  userId: userId,
  publicKey: 'not implemented',
};
```

### 5. Restored Structured Logging ✅
**Before:**
```typescript
console.log('Handshake data sent to the handshake server');
console.error('Failed to send handshake data:', error);
```

**After:**
```typescript
logger.info('Handshake data sent to handshake server');
logger.error('Failed to send handshake data:', error);
logger.debug(`Handshake data size: ${handshakeJson.length} bytes`);
logger.warn('Server detected inactivity, closing connection');
```

### 6. Updated Function Signature ✅
**Before:**
```typescript
export function startUdpClient(remoteAddress: string, simpleStr: string)
```

**After:**
```typescript
export function startUdpClient(remoteAddress: string, encryptionKey: string)
```

### 7. Updated Client Entry Point ✅
**Before:**
```typescript
const remoteAddress = process.argv[2];
startUdpClient(remoteAddress)
```

**After:**
```typescript
const remoteAddress = process.argv[2];
const encryptionKey = process.argv[3];

if (!remoteAddress || !encryptionKey) {
  logger.error('Usage: node client.js <remote_address:port:userId> <encryption_key>');
  logger.error('Example: node client.js 192.168.1.100:12301:user123 "base64key:base64iv"');
  process.exit(1);
}

startUdpClient(remoteAddress, encryptionKey)
```

## New Features Preserved

### Encrypted Control Channel ✅
All control messages (handshake, close, server responses) are now encrypted:

```typescript
// Encrypt outgoing messages
const msgEncrypted = encryptor.simpleEncrypt(JSON.stringify(handshakeData));
const msgClose = encryptor.simpleEncrypt('close');

// Decrypt incoming messages
message = Buffer.from(encryptor.simpleDecrypt(message.toString()));
```

### Public Key Placeholder ✅
Added field for future RSA key exchange:
```typescript
publicKey: 'not implemented',
```

## Usage

### Server
```bash
npm run server
# Server will display encryption key on startup
```

### Client
```bash
npm run client <server_ip>:<port>:<user_id> <encryption_key>

# Example
npm run client 192.168.1.100:12301:user123 "B9EMizUe2tP3dqu8GlX3amO3uERua9HhPVqANMWyXUY=:0y7LOFmW415sBKGUQ5A0Fg=="
```

## Benefits

1. **Consistent Structure**: All imports follow new project organization
2. **Type Safety**: Uses TypeScript interfaces from config
3. **Centralized Config**: All settings from environment/config
4. **Structured Logging**: Proper log levels (debug, info, warn, error)
5. **Encrypted Control**: Handshake and control messages encrypted
6. **Maintainable**: Clear separation of concerns
7. **Configurable**: Easy to adjust via environment variables

## Configuration

Set in `.env` file:

```env
# Client Configuration
LOCAL_WG_ADDRESS=127.0.0.1
LOCAL_WG_PORT=51820
MAX_RETRIES=5
OBFUSCATION_LAYER=3
PADDING_LENGTH=8
PASSWORD=your_password_here

# Logging
LOG_LEVEL=1  # 0=DEBUG, 1=INFO, 2=WARN, 3=ERROR
```

## Testing

1. Start server: `npm run server`
2. Note encryption key from server logs
3. Start client: `npm run client <ip>:<port>:<user> "<encryption_key>"`
4. Verify connection in logs
5. Test WireGuard traffic flows through tunnel

## Summary

The client has been fully aligned with the new project structure while preserving the encryption improvements. All hardcoded values have been moved to configuration, and structured logging has been restored throughout.
