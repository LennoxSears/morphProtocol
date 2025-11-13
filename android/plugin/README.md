# @morphprotocol/capacitor-plugin

Capacitor plugin for MorphProtocol VPN client. Provides a JavaScript/TypeScript API to control the native Android MorphProtocol client.

## Features

- ✅ Connect to MorphProtocol server
- ✅ Disconnect from server
- ✅ Get connection status
- ✅ Event listeners for connection state changes
- ✅ Full configuration support
- ✅ TypeScript definitions included

## Installation

```bash
npm install @morphprotocol/capacitor-plugin
npx cap sync
```

## Usage

### Import

```typescript
import { MorphProtocol } from '@morphprotocol/capacitor-plugin';
```

### Connect to Server

```typescript
try {
  const result = await MorphProtocol.connect({
    remoteAddress: 'your.server.com',
    remotePort: 12301,
    userId: 'user123',
    encryptionKey: 'base64key:base64iv',
  });

  console.log('Connected:', result.message);
  console.log('Client ID:', result.clientId);
} catch (error) {
  console.error('Connection failed:', error);
}
```

### Disconnect from Server

```typescript
try {
  const result = await MorphProtocol.disconnect();
  console.log('Disconnected:', result.message);
} catch (error) {
  console.error('Disconnection failed:', error);
}
```

### Get Connection Status

```typescript
const status = await MorphProtocol.getStatus();
console.log('Connected:', status.connected);
console.log('Status:', status.status);
if (status.connected) {
  console.log('Client ID:', status.clientId);
  console.log('Server Port:', status.serverPort);
}
```

### Listen to Events

```typescript
// Listen for connection events
MorphProtocol.addListener('connected', (event) => {
  console.log('Connected:', event.message);
});

// Listen for disconnection events
MorphProtocol.addListener('disconnected', (event) => {
  console.log('Disconnected:', event.message);
});

// Listen for error events
MorphProtocol.addListener('error', (event) => {
  console.error('Error:', event.message);
});

// Remove all listeners when done
await MorphProtocol.removeAllListeners();
```

## API

### connect(options: ConnectionOptions)

Connect to MorphProtocol server.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| remoteAddress | string | Yes | - | Server hostname or IP |
| remotePort | number | Yes | - | Server port |
| userId | string | Yes | - | User ID |
| encryptionKey | string | Yes | - | Encryption key (format: "base64key:base64iv") |
| localWgAddress | string | No | "127.0.0.1" | Local WireGuard address |
| localWgPort | number | No | 51820 | Local WireGuard port |
| obfuscationLayer | number | No | 3 | Obfuscation layers (1-4) |
| paddingLength | number | No | 8 | Padding length (1-8) |
| heartbeatInterval | number | No | 120000 | Heartbeat interval (ms) |
| inactivityTimeout | number | No | 30000 | Inactivity timeout (ms) |
| maxRetries | number | No | 10 | Max connection retries |
| handshakeInterval | number | No | 5000 | Handshake interval (ms) |
| password | string | No | "bumoyu123" | Encryption password |

**Returns:** `Promise<ConnectionResult>`

```typescript
{
  success: boolean;
  message: string;
  clientId?: string;
}
```

### disconnect()

Disconnect from MorphProtocol server.

**Returns:** `Promise<DisconnectionResult>`

```typescript
{
  success: boolean;
  message: string;
}
```

### getStatus()

Get current connection status.

**Returns:** `Promise<StatusResult>`

```typescript
{
  connected: boolean;
  status: string;
  clientId?: string;
  serverPort?: number;
}
```

### addListener(eventName, listenerFunc)

Add event listener.

**Parameters:**
- `eventName`: 'connected' | 'disconnected' | 'error'
- `listenerFunc`: Callback function

**Returns:** `Promise<PluginListenerHandle>`

### removeAllListeners()

Remove all event listeners.

**Returns:** `Promise<void>`

## Configuration Examples

### Basic Configuration

```typescript
await MorphProtocol.connect({
  remoteAddress: 'vpn.example.com',
  remotePort: 12301,
  userId: 'user123',
  encryptionKey: 'your-encryption-key',
});
```

### Advanced Configuration

```typescript
await MorphProtocol.connect({
  remoteAddress: 'vpn.example.com',
  remotePort: 12301,
  userId: 'user123',
  encryptionKey: 'your-encryption-key',
  
  // Custom obfuscation
  obfuscationLayer: 4,
  paddingLength: 8,
  
  // Custom timeouts
  heartbeatInterval: 180000,  // 3 minutes
  inactivityTimeout: 60000,   // 1 minute
  maxRetries: 20,
  
  // Custom WireGuard
  localWgAddress: '10.0.0.1',
  localWgPort: 51821,
});
```

### High Security Configuration

```typescript
await MorphProtocol.connect({
  remoteAddress: 'vpn.example.com',
  remotePort: 12301,
  userId: 'user123',
  encryptionKey: 'your-encryption-key',
  obfuscationLayer: 4,  // Maximum obfuscation
  paddingLength: 8,     // Maximum padding
});
```

### Low Latency Configuration

```typescript
await MorphProtocol.connect({
  remoteAddress: 'vpn.example.com',
  remotePort: 12301,
  userId: 'user123',
  encryptionKey: 'your-encryption-key',
  obfuscationLayer: 1,  // Minimum obfuscation
  paddingLength: 1,     // Minimum padding
  heartbeatInterval: 60000,   // 1 minute
  inactivityTimeout: 15000,   // 15 seconds
});
```

## Complete Example

```typescript
import { MorphProtocol } from '@morphprotocol/capacitor-plugin';

class VpnService {
  private isConnected = false;

  async connect(config: {
    server: string;
    port: number;
    userId: string;
    key: string;
  }) {
    try {
      // Add event listeners
      await MorphProtocol.addListener('connected', (event) => {
        console.log('VPN Connected:', event.message);
        this.isConnected = true;
      });

      await MorphProtocol.addListener('disconnected', (event) => {
        console.log('VPN Disconnected:', event.message);
        this.isConnected = false;
      });

      await MorphProtocol.addListener('error', (event) => {
        console.error('VPN Error:', event.message);
        this.isConnected = false;
      });

      // Connect
      const result = await MorphProtocol.connect({
        remoteAddress: config.server,
        remotePort: config.port,
        userId: config.userId,
        encryptionKey: config.key,
      });

      console.log('Connection result:', result);
      return result;
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      const result = await MorphProtocol.disconnect();
      console.log('Disconnection result:', result);
      return result;
    } catch (error) {
      console.error('Failed to disconnect:', error);
      throw error;
    }
  }

  async getStatus() {
    return await MorphProtocol.getStatus();
  }

  async cleanup() {
    await MorphProtocol.removeAllListeners();
  }
}

// Usage
const vpn = new VpnService();

// Connect
await vpn.connect({
  server: 'vpn.example.com',
  port: 12301,
  userId: 'user123',
  key: 'base64key:base64iv',
});

// Check status
const status = await vpn.getStatus();
console.log('Status:', status);

// Disconnect
await vpn.disconnect();

// Cleanup
await vpn.cleanup();
```

## Platform Support

| Platform | Supported | Status |
|----------|-----------|--------|
| Android | ✅ Yes | Production ready |
| iOS | ✅ Yes | Production ready |
| Web | ❌ No | Stub only |

## Requirements

- Capacitor 5.0+
- Android API 22+
- Kotlin 1.9+

## Permissions

The plugin requires the following Android permissions:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

These are automatically added by the plugin.

## Troubleshooting

### Connection Issues

1. **"Already connected"**
   - Disconnect before connecting again
   - Check connection status with `getStatus()`

2. **"Connection failed"**
   - Verify server address and port
   - Check encryption key format
   - Ensure server is running

3. **"Not connected"**
   - Connect before calling disconnect
   - Check connection status

### Build Issues

1. **Gradle sync failed**
   - Run `npx cap sync android`
   - Clean and rebuild: `cd android && ./gradlew clean build`

2. **Missing dependencies**
   - Ensure all dependencies are in `build.gradle`
   - Check Kotlin version compatibility

## License

ISC

## Contributing

Contributions welcome! Please ensure:
- All tests pass
- Code follows Kotlin conventions
- TypeScript definitions are updated
- Documentation is complete

## Support

For issues and questions:
- GitHub Issues: https://github.com/LennoxSears/morphProtocol/issues
- Documentation: See USAGE.md in demo app
