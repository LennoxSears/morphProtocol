# Verify Plugin Update - Version 1.0.1

This guide helps you verify that the updated plugin code (v1.0.1) is running in your app.

## What Changed in v1.0.1

Added extensive logging to verify:
1. Plugin version and build timestamp
2. Service version and Android compatibility
3. Connection flow from start to finish
4. Android 15/16 foreground service implementation

## Step 1: Update the Plugin

```bash
# In your app root directory
cd android/plugin
npm install
npm run build
cd ../..

# Reinstall the plugin
npm uninstall @morphprotocol/capacitor-plugin
npm install file:./android/plugin

# Force sync to Android
npx cap sync android --force
```

## Step 2: Verify Permissions

The plugin requires these permissions for Android 15/16:

```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### Automatic Verification Script

Run the verification script:

```bash
cd android/plugin
./verify-permissions.sh
```

Or specify your app's manifest path:

```bash
./verify-permissions.sh /path/to/your/app/android/app/src/main/AndroidManifest.xml
```

The script will:
- ✅ Find your app's AndroidManifest.xml
- ✅ Check for all 3 required permissions
- ✅ Check service configuration
- ✅ Show what's missing (if anything)

### Manual Verification

If you prefer to check manually:

```bash
# Find your app's AndroidManifest.xml
find . -path "*/android/app/src/main/AndroidManifest.xml"

# Check for permissions
grep -E "FOREGROUND_SERVICE|POST_NOTIFICATIONS" /path/to/your/AndroidManifest.xml
```

You should see all 3 permissions listed.

### If Permissions Are Missing

Add them to your app's `AndroidManifest.xml` (usually at `android/app/src/main/AndroidManifest.xml`):

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <!-- Add these permissions -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    
    <application>
        <!-- Your app configuration -->
    </application>
</manifest>
```

**Note**: Capacitor should auto-merge permissions from the plugin's manifest, but on Android 15/16 it's safer to explicitly declare them in your app's manifest.

## Step 3: Check Installation

Verify the plugin files were copied:

```bash
# Check plugin version in node_modules
cat node_modules/@morphprotocol/capacitor-plugin/package.json | grep version

# Should show: "version": "1.0.1"

# Check if Kotlin files exist
ls -la node_modules/@morphprotocol/capacitor-plugin/android/src/main/java/com/morphprotocol/capacitor/

# Should show:
# - MorphProtocolPlugin.kt
# - MorphProtocolService.kt

# Check if files were copied to Android project
ls -la android/capacitor-cordova-android-plugins/src/main/java/com/morphprotocol/capacitor/

# Should show the same .kt files
```

## Step 4: Verify Logs When Running App

### Expected Log Output

When you run the app and call `MorphProtocol.connect()`, you should see these logs in logcat:

#### 1. Plugin Load (when app starts)
```
I/MorphProtocolPlugin: ========================================
I/MorphProtocolPlugin: MorphProtocol Plugin Loading
I/MorphProtocolPlugin: Version: 1.0.1
I/MorphProtocolPlugin: Build: 2025-12-29T07:18:00Z
I/MorphProtocolPlugin: Android Version: 35 (or your Android version)
I/MorphProtocolPlugin: ========================================
```

#### 2. Service Creation
```
I/MorphProtocolService: ========================================
I/MorphProtocolService: MorphProtocol Service Created
I/MorphProtocolService: Version: 1.0.1
I/MorphProtocolService: Build: 2025-12-29T07:18:00Z
I/MorphProtocolService: Android Version: 35
I/MorphProtocolService: ========================================
I/MorphProtocolService: Creating notification channel for Android 35
I/MorphProtocolService: Notification channel created successfully
I/MorphProtocolService: Starting foreground service...
I/MorphProtocolService: Android 35 - Using FOREGROUND_SERVICE_TYPE_DATA_SYNC
I/MorphProtocolService: Foreground service started with DATA_SYNC type (Android 15/16 compatible)
```

#### 3. Connect Call
```
I/MorphProtocolPlugin: ========================================
I/MorphProtocolPlugin: connect() called - PLUGIN VERSION 1.0.1
I/MorphProtocolPlugin: Build timestamp: 2025-12-29T07:18:00Z
I/MorphProtocolPlugin: isBound: true
I/MorphProtocolPlugin: serviceMessenger: CONNECTED
I/MorphProtocolPlugin: Android SDK: 35
I/MorphProtocolPlugin: ========================================
I/MorphProtocolPlugin: Service already bound, proceeding immediately
I/MorphProtocolPlugin: performConnect() starting...
I/MorphProtocolPlugin: Connection params: remoteAddress=X.X.X.X, remotePort=XXXX, userId=...
I/MorphProtocolPlugin: Sending MSG_CONNECT to service...
I/MorphProtocolPlugin: Message sent to service successfully
```

#### 4. Service Receives Connection Request
```
I/MorphProtocolService: ========================================
I/MorphProtocolService: connectClient() called in service
I/MorphProtocolService: Service version: 1.0.1
I/MorphProtocolService: isConnected: false
I/MorphProtocolService: ========================================
I/MorphProtocolService: Parsed connection params: remoteAddress=X.X.X.X, remotePort=XXXX, userId=...
I/MorphProtocolService: Creating MorphClient with config...
I/MorphProtocolService: MorphClient created, starting connection thread...
I/MorphProtocolService: Connection thread started
I/MorphProtocolService: Calling morphClient.start()...
```

#### 5. Connection Success (when handshake completes)
```
I/MorphProtocolService: Connection callback invoked - handshake succeeded!
I/MorphProtocolService: Connected successfully. Server port: XXXX, Client port: XXXX
I/MorphProtocolPlugin: Received response from service: msg.what=2
I/MorphProtocolPlugin: Connection SUCCESS received from service
```

## Step 5: View Logs

### Using Android Studio
1. Open Android Studio
2. Open Logcat tab (bottom of screen)
3. Filter by "MorphProtocol" or "Morph"
4. Run your app
5. Look for the version logs above

### Using adb command line
```bash
# Clear old logs
adb logcat -c

# Watch logs in real-time
adb logcat | grep -E "MorphProtocol|Morph"

# Or save to file
adb logcat | grep -E "MorphProtocol|Morph" > morph_logs.txt
```

### Using Chrome DevTools (for Capacitor)
1. Open Chrome
2. Go to `chrome://inspect`
3. Find your device/app
4. Click "inspect"
5. Check Console for any JavaScript errors

## Verification Checklist

- [ ] **Permissions**: All 3 permissions present (run `./verify-permissions.sh`)
- [ ] **Plugin version**: Shows **1.0.1** in node_modules/package.json
- [ ] **Kotlin files**: Exist in node_modules/@morphprotocol/capacitor-plugin/android/
- [ ] **Files copied**: Kotlin files in android/capacitor-cordova-android-plugins/
- [ ] **Plugin logs**: See "Version: 1.0.1" in plugin load logs
- [ ] **Service logs**: See "Version: 1.0.1" in service creation logs
- [ ] **Build timestamp**: See "Build: 2025-12-29T07:18:00Z" in logs
- [ ] **Android 15/16**: See "Android 15/16 compatible" message (if on Android 10+)
- [ ] **Connect logs**: See "connect() called - PLUGIN VERSION 1.0.1"

## If You DON'T See Version 1.0.1 Logs

The old plugin code is still running. Try:

1. **Clean and rebuild Android project**
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npx cap sync android --force
   ```

2. **Manually copy plugin files** (if Capacitor sync fails)
   ```bash
   rm -rf android/capacitor-cordova-android-plugins/src/main/java/com/morphprotocol
   mkdir -p android/capacitor-cordova-android-plugins/src/main/java/com/morphprotocol
   cp -r node_modules/@morphprotocol/capacitor-plugin/android/src/main/java/com/morphprotocol/* \
         android/capacitor-cordova-android-plugins/src/main/java/com/morphprotocol/
   ```

3. **Verify AndroidManifest.xml has required permissions**
   
   Run the verification script:
   ```bash
   cd android/plugin
   ./verify-permissions.sh
   ```
   
   Or manually check `android/app/src/main/AndroidManifest.xml` contains:
   ```xml
   <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
   <uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
   <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
   ```

4. **Rebuild app completely**
   ```bash
   # In Android Studio: Build > Clean Project
   # Then: Build > Rebuild Project
   
   # Or via command line:
   cd android
   ./gradlew clean build
   ```

## Still Stuck at connect()?

If you see the version 1.0.1 logs but still stuck at `connect()`, check:

1. **Where does it stop?**
   - After "Sending MSG_CONNECT to service"? → Service not receiving message
   - After "Calling morphClient.start()"? → MorphClient library issue
   - No "Connection callback invoked"? → Handshake failing

2. **Check for errors**
   ```bash
   adb logcat | grep -E "ERROR|Exception|FATAL"
   ```

3. **Check network connectivity**
   - Can the device reach the remote server?
   - Is the server running and accepting connections?
   - Check firewall rules

4. **Enable verbose logging in MorphClient**
   - Check if MorphClient library has debug logging options
   - Look for exceptions in the connection thread

## Success Indicators

✅ You should see version **1.0.1** in logs  
✅ You should see "Android 15/16 compatible" message  
✅ You should see detailed connection flow logs  
✅ If it still hangs, the logs will show exactly where it stops  

This helps identify if the issue is:
- Plugin not updated (no v1.0.1 logs)
- Service binding issue (stops before "connectClient() called")
- MorphClient issue (stops after "Calling morphClient.start()")
- Network/handshake issue (stops before "Connection callback invoked")
