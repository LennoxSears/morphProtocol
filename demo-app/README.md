# MorphProtocol Demo App

A complete Capacitor demo application showcasing the MorphProtocol VPN plugin.

## Features

- ✅ Connect/Disconnect to MorphProtocol server
- ✅ Real-time connection status
- ✅ Configuration presets (Default, High Security, Low Latency)
- ✅ Advanced settings panel
- ✅ Connection logs
- ✅ Persistent configuration (localStorage)
- ✅ Event listeners for connection state
- ✅ Beautiful, responsive UI

## Screenshots

### Main Screen
- Connection status indicator
- Server configuration form
- Advanced settings
- Connection logs

## Prerequisites

- Node.js 16+
- npm or yarn
- Android Studio (for Android development)
- Android SDK API 22+

## Installation

### 1. Install Dependencies

```bash
cd demo-app
npm install
```

### 2. Build the Plugin

```bash
cd ../capacitor-plugin
npm install
npm run build
cd ../demo-app
```

### 3. Sync Capacitor

```bash
npx cap sync
```

### 4. Open in Android Studio

```bash
npx cap open android
```

## Development

### Run Development Server

```bash
npm run dev
```

This starts a local development server at `http://localhost:3000`.

**Note:** The MorphProtocol plugin only works on Android devices, not in the browser.

### Build for Production

```bash
npm run build
npx cap copy
npx cap sync
```

### Run on Android Device

1. Connect your Android device via USB
2. Enable USB debugging on your device
3. Open the project in Android Studio:
   ```bash
   npx cap open android
   ```
4. Click "Run" in Android Studio

## Usage

### Basic Connection

1. Enter server details:
   - **Server Address**: Your MorphProtocol server hostname or IP
   - **Server Port**: Server handshake port (default: 12301)
   - **User ID**: Your user identifier
   - **Encryption Key**: Key from server (format: `base64key:base64iv`)

2. Click **Connect**

3. Monitor connection status and logs

4. Click **Disconnect** when done

### Configuration Presets

The app includes three presets:

#### Default
- Obfuscation Layers: 3
- Padding Length: 8
- Heartbeat: 2 minutes
- Inactivity Timeout: 30 seconds

#### High Security
- Obfuscation Layers: 4 (maximum)
- Padding Length: 8 (maximum)
- Heartbeat: 3 minutes
- Inactivity Timeout: 1 minute

#### Low Latency
- Obfuscation Layers: 1 (minimum)
- Padding Length: 1 (minimum)
- Heartbeat: 1 minute
- Inactivity Timeout: 15 seconds

### Advanced Settings

Click "Advanced Settings" to customize:

- **Obfuscation Layers** (1-4): More layers = better obfuscation
- **Padding Length** (1-8): Random padding to prevent packet analysis
- **Heartbeat Interval**: How often to send keepalive packets
- **Inactivity Timeout**: Reconnect if no data received
- **Local WireGuard Address**: Local WireGuard interface address
- **Local WireGuard Port**: Local WireGuard interface port

### Connection Logs

The app displays real-time logs showing:
- Connection attempts
- Success/failure messages
- Event notifications
- Status updates

Logs are color-coded:
- 🟢 Green: Success
- 🔴 Red: Error
- 🟡 Yellow: Warning
- ⚪ White: Info

## Project Structure

```
demo-app/
├── src/
│   ├── App.vue                 # Main application component
│   ├── main.ts                 # Application entry point
│   ├── style.css               # Global styles
│   └── services/
│       └── vpn.service.ts      # VPN service wrapper
├── android/                    # Android native project (generated)
├── capacitor.config.ts         # Capacitor configuration
├── package.json                # Dependencies
├── vite.config.ts              # Vite configuration
└── README.md                   # This file
```

## Configuration

### Capacitor Configuration

Edit `capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  appId: 'com.morphprotocol.demo',
  appName: 'MorphProtocol Demo',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};
```

### App Configuration

The app saves configuration to localStorage automatically. Configuration includes:
- Server address and port
- User ID
- Encryption key
- All advanced settings

## Troubleshooting

### Plugin Not Found

```bash
# Rebuild plugin
cd ../capacitor-plugin
npm run build

# Sync Capacitor
cd ../demo-app
npx cap sync
```

### Build Errors

```bash
# Clean and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
npx cap sync
```

### Android Build Issues

1. Open Android Studio
2. File → Invalidate Caches / Restart
3. Build → Clean Project
4. Build → Rebuild Project

### Connection Issues

1. **"Already connected"**
   - Disconnect before connecting again
   - Refresh status

2. **"Connection failed"**
   - Verify server address and port
   - Check encryption key format
   - Ensure server is running

3. **"Not connected"**
   - Connect before disconnecting
   - Check connection status

## Development Tips

### Hot Reload

For faster development:

1. Run dev server: `npm run dev`
2. Open in browser for UI development
3. Test on device for plugin functionality

### Debugging

Enable Chrome DevTools for Android:

1. Connect device via USB
2. Open Chrome: `chrome://inspect`
3. Click "Inspect" on your app
4. View console logs and debug

### Testing on Emulator

1. Create Android Virtual Device (AVD) in Android Studio
2. Start emulator
3. Run app from Android Studio

## API Reference

See the plugin README for complete API documentation:
- [Plugin README](../capacitor-plugin/README.md)
- [Plugin API Definitions](../capacitor-plugin/src/definitions.ts)

## Features Showcase

### Connection Management
- One-click connect/disconnect
- Automatic reconnection on network changes
- Connection state persistence

### Configuration
- Preset configurations for common use cases
- Advanced settings for power users
- Configuration persistence across app restarts

### Monitoring
- Real-time connection status
- Client ID and server port display
- Detailed connection logs

### User Experience
- Clean, modern UI
- Responsive design
- Loading states
- Error handling
- Success feedback

## Building for Release

### 1. Update Version

Edit `package.json`:
```json
{
  "version": "1.0.0"
}
```

### 2. Build Production Bundle

```bash
npm run build
```

### 3. Sync to Android

```bash
npx cap copy
npx cap sync
```

### 4. Generate Signed APK

1. Open in Android Studio: `npx cap open android`
2. Build → Generate Signed Bundle / APK
3. Follow the signing wizard
4. Select "Release" build variant

## License

ISC

## Support

For issues and questions:
- GitHub Issues: https://github.com/LennoxSears/morphProtocol/issues
- Plugin Documentation: See capacitor-plugin/README.md

## Contributing

Contributions welcome! Please ensure:
- Code follows Vue 3 Composition API style
- TypeScript types are properly defined
- UI remains responsive
- All features are tested on Android device
