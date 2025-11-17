# MorphProtocol iOS

Complete iOS implementation of MorphProtocol with Capacitor plugin and demo app.

## Overview

This directory contains everything needed to use MorphProtocol on iOS:

1. **Capacitor Plugin** (`plugin/`) - Native bridge to MorphProtocol client
2. **Demo App** (`demo-app/`) - Shared Capacitor app (symlink to android/demo-app)

## Quick Start

### Run Demo App

```bash
cd demo-app
npm install
npm run build
npx cap sync
npx cap open ios
```

### Use Plugin in Your App

```bash
npm install file:../ios/plugin
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
ios/
├── plugin/                    # Capacitor plugin
│   ├── src/                   # TypeScript API (shared with Android)
│   │   ├── definitions.ts     # Type definitions
│   │   ├── index.ts           # Plugin registration
│   │   └── web.ts             # Web stub
│   ├── ios/                   # Native iOS code
│   │   └── Plugin/            # Swift implementation
│   │       ├── MorphProtocolPlugin.swift
│   │       ├── MorphClient.swift
│   │       └── ...
│   ├── package.json
│   └── README.md
│
└── demo-app/                  # Symlink to android/demo-app
```

## Features

### Capacitor Plugin

✅ **Native iOS Integration**
- Direct bridge to Swift MorphClient
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

The demo app is shared between Android and iOS platforms. See `android/demo-app/README.md` for details.

## Documentation

- **Plugin API**: See `plugin/README.md`
- **Demo App**: See `android/demo-app/README.md`
- **Main Docs**: See `/CAPACITOR_PLUGIN.md` in root

## Requirements

- Node.js 16+
- Xcode 14+
- iOS 13.0+
- Capacitor 5.0+
- CocoaPods

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

# Sync to iOS
npx cap sync

# Open in Xcode
npx cap open ios
```

### 3. Run on Device

1. Connect iOS device via USB
2. Select device in Xcode
3. Click "Run" in Xcode

## Development

### Plugin Development

```bash
cd plugin

# Make changes to TypeScript or Swift code

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
npx cap open ios
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
rm -rf node_modules ios
npm install
npm run build
npx cap sync
```

### Connection Issues

1. **"Already connected"** - Disconnect first
2. **"Connection failed"** - Check server address and encryption key
3. **"Plugin not available"** - Ensure running on iOS device

### CocoaPods Issues

```bash
cd demo-app/ios/App
pod deintegrate
pod install
```

## Platform Support

| Platform | Supported | Status |
|----------|-----------|--------|
| iOS | ✅ Yes | Production ready - Full implementation |
| Android | ✅ Yes | Production ready - Full implementation |
| Web | ⚠️ Stub only | Returns errors |

Both iOS and Android implementations are complete and ready for production use!

## License

ISC

## Support

- GitHub Issues: https://github.com/LennoxSears/morphProtocol/issues
- Plugin Docs: plugin/README.md
- Demo App Docs: android/demo-app/README.md
