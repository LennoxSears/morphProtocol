# MorphProtocol Android

Complete Android implementation of MorphProtocol with Capacitor plugin and demo app.

## Overview

This directory contains everything needed to use MorphProtocol on Android:

1. **Capacitor Plugin** (`plugin/`) - Native bridge to MorphProtocol client
2. **Demo App** (`demo-app/`) - Complete working example with beautiful UI

## Quick Start

### Run Demo App

```bash
cd demo-app
npm install
npm run build
npx cap sync
npx cap open android
```

### Use Plugin in Your App

```bash
npm install file:../android/plugin
npx cap sync
```

```typescript
import { MorphProtocol } from '@morphprotocol/capacitor-plugin';

await MorphProtocol.connect({
  remoteAddress: 'vpn.example.com',
  remotePort: 12301,
  userId: 'user123',
  encryptionKey: 'base64key:base64iv',
});
```

## Structure

```
android/
├── plugin/                    # Capacitor plugin
│   ├── src/                   # TypeScript API
│   │   ├── definitions.ts     # Type definitions
│   │   ├── index.ts           # Plugin registration
│   │   └── web.ts             # Web stub
│   ├── android/               # Native Android code
│   │   └── src/main/java/com/morphprotocol/
│   │       ├── client/        # MorphProtocol client (Kotlin)
│   │       └── capacitor/     # Capacitor bridge
│   ├── package.json
│   └── README.md
│
└── demo-app/                  # Demo Capacitor app
    ├── src/
    │   ├── App.vue            # Main UI component
    │   ├── services/          # VPN service wrapper
    │   └── style.css          # Styles
    ├── capacitor.config.ts
    ├── package.json
    └── README.md
```

## Features

### Capacitor Plugin

✅ **Native Android Integration**
- Direct bridge to Kotlin MorphClient
- Full MorphProtocol implementation
- AES-256-CBC encryption
- 11 obfuscation functions
- Protocol templates (QUIC, KCP, Gaming)

✅ **TypeScript API**
- Full type definitions
- Promise-based async methods
- Event system for state changes

✅ **Methods**
- `connect(options)` - Connect to server
- `disconnect()` - Disconnect from server
- `getStatus()` - Get connection status
- `addListener(event, callback)` - Listen to events
- `removeAllListeners()` - Remove all listeners

### Demo App

✅ **User Interface**
- Clean, modern design
- Real-time status indicator
- Configuration form with validation
- Advanced settings panel
- Connection logs

✅ **Configuration**
- Three presets (Default, High Security, Low Latency)
- All MorphProtocol settings exposed
- Persistent storage (localStorage)

✅ **Monitoring**
- Real-time connection status
- Client ID display
- Server port display
- Detailed logs with timestamps

## Documentation

- **Plugin API**: See `plugin/README.md`
- **Demo App**: See `demo-app/README.md`
- **Main Docs**: See `/CAPACITOR_PLUGIN.md` in root

## Requirements

- Node.js 16+
- Android Studio
- Android SDK API 22+
- Capacitor 5.0+

## Installation

### 1. Install Dependencies

```bash
# Plugin
cd plugin
npm install

# Demo App
cd ../demo-app
npm install
```

### 2. Build and Run

```bash
# Build demo app
cd demo-app
npm run build

# Sync to Android
npx cap sync

# Open in Android Studio
npx cap open android
```

### 3. Run on Device

1. Connect Android device via USB
2. Enable USB debugging
3. Click "Run" in Android Studio

## Development

### Plugin Development

```bash
cd plugin

# Make changes to TypeScript or Kotlin code

# Rebuild TypeScript
npm run build

# Sync to demo app
cd ../demo-app
npx cap sync
```

### Demo App Development

```bash
cd demo-app

# Start dev server (UI only)
npm run dev

# Build and test on device
npm run build
npx cap sync
npx cap open android
```

## API Example

```typescript
import { MorphProtocol } from '@morphprotocol/capacitor-plugin';

// Setup event listeners
await MorphProtocol.addListener('connected', (event) => {
  console.log('Connected:', event.message);
});

await MorphProtocol.addListener('disconnected', (event) => {
  console.log('Disconnected:', event.message);
});

await MorphProtocol.addListener('error', (event) => {
  console.error('Error:', event.message);
});

// Connect
await MorphProtocol.connect({
  remoteAddress: 'vpn.example.com',
  remotePort: 12301,
  userId: 'user123',
  encryptionKey: 'base64key:base64iv',
  obfuscationLayer: 3,
  paddingLength: 8,
});

// Get status
const status = await MorphProtocol.getStatus();
console.log('Connected:', status.connected);

// Disconnect
await MorphProtocol.disconnect();

// Cleanup
await MorphProtocol.removeAllListeners();
```

## Configuration Presets

### Default (Balanced)
```typescript
{
  obfuscationLayer: 3,
  paddingLength: 8,
  heartbeatInterval: 120000,  // 2 minutes
  inactivityTimeout: 30000    // 30 seconds
}
```

### High Security
```typescript
{
  obfuscationLayer: 4,        // Maximum
  paddingLength: 8,           // Maximum
  heartbeatInterval: 180000,  // 3 minutes
  inactivityTimeout: 60000    // 1 minute
}
```

### Low Latency
```typescript
{
  obfuscationLayer: 1,        // Minimum
  paddingLength: 1,           // Minimum
  heartbeatInterval: 60000,   // 1 minute
  inactivityTimeout: 15000    // 15 seconds
}
```

## Troubleshooting

### Build Issues

```bash
# Clean and rebuild
cd plugin
rm -rf node_modules
npm install
npm run build

cd ../demo-app
rm -rf node_modules android
npm install
npm run build
npx cap sync
```

### Connection Issues

1. **"Already connected"** - Disconnect first
2. **"Connection failed"** - Check server address and encryption key
3. **"Plugin not available"** - Ensure running on Android device

## Platform Support

| Platform | Supported |
|----------|-----------|
| Android | ✅ Yes |
| iOS | ❌ No |
| Web | ⚠️ Stub only |

## License

ISC

## Support

- GitHub Issues: https://github.com/LennoxSears/morphProtocol/issues
- Plugin Docs: plugin/README.md
- Demo App Docs: demo-app/README.md
