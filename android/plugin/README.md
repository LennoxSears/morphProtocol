# @morphprotocol/capacitor-plugin

Capacitor plugin for MorphProtocol VPN client.

## Installation

### From Local Directory

```bash
npm install file:./android/plugin
npx cap sync android
```

### From npm (when published)

```bash
npm install @morphprotocol/capacitor-plugin
npx cap sync android
```

## Required Permissions

Add these to your app's `AndroidManifest.xml`:

```xml
<!-- Foreground service (Android 9+) -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- Exact alarms for heartbeat (Android 12+) -->
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.USE_EXACT_ALARM" />
```

## Usage

```typescript
import { MorphProtocol } from '@morphprotocol/capacitor-plugin';

// Connect
const result = await MorphProtocol.connect({
  remoteAddress: 'server.example.com',
  remotePort: 14942,
  userId: 'user-id',
  encryptionKey: 'encryption-key',
});

// Get status
const status = await MorphProtocol.getStatus();

// Disconnect
await MorphProtocol.disconnect();
```

## API

### connect(options)

Connect to MorphProtocol server.

**Required Parameters:**
- `remoteAddress` (string) - Server hostname or IP
- `remotePort` (number) - Server port
- `userId` (string) - User ID
- `encryptionKey` (string) - Encryption key

**Optional Parameters:**
- `localWgAddress` (string) - Default: "127.0.0.1"
- `localWgPort` (number) - Default: 51820
- `obfuscationLayer` (number) - Default: 3
- `paddingLength` (number) - Default: 8
- `heartbeatInterval` (number) - Default: 30000ms
- `inactivityTimeout` (number) - Default: 180000ms
- `maxRetries` (number) - Default: 10
- `handshakeInterval` (number) - Default: 5000ms
- `password` (string) - Default: "bumoyu123"

### disconnect()

Disconnect from server.

### getStatus()

Get connection status.

Returns:
```typescript
{
  connected: boolean;
  status: string;
  clientId?: string;
  serverPort?: number;
  clientPort?: number;
}
```

## Event Listeners

```typescript
// Connection events
MorphProtocol.addListener('connected', (event) => {
  console.log('Connected:', event);
});

MorphProtocol.addListener('disconnected', (event) => {
  console.log('Disconnected:', event);
});

MorphProtocol.addListener('error', (event) => {
  console.error('Error:', event);
});

// Cleanup
await MorphProtocol.removeAllListeners();
```

## Development

### Build Plugin

```bash
npm install
npm run build
```

### Update in App

```bash
cd android/plugin
npm run build
cd ../..
npm uninstall @morphprotocol/capacitor-plugin
npm install file:./android/plugin
npx cap sync android --force
```

## Platform Support

- ✅ Android (API 22+)
- ❌ iOS (not implemented)
- ❌ Web (stub only)

## Requirements

- Capacitor 5.0+
- Android API 22+
- Kotlin 1.9+

## License

ISC
