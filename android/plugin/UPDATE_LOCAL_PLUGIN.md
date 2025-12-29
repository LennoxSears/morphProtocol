# How to Update Local Plugin Installed via npm install file:

## Your Setup

```
your-app/
├── test-plugin/              # Your copied plugin folder
│   ├── android/
│   │   └── src/main/java/com/morphprotocol/...
│   ├── package.json
│   └── ...
├── node_modules/
│   └── @morphprotocol/capacitor-plugin/  # Installed from test-plugin
├── android/
│   └── app/src/main/java/...
└── package.json
```

## The Problem

When you run `npm install file:./test-plugin`:
1. ✅ npm copies files from `test-plugin/` to `node_modules/@morphprotocol/capacitor-plugin/`
2. ✅ Capacitor reads plugin from `node_modules/`
3. ❌ **But npm doesn't update node_modules when you change test-plugin/**
4. ❌ **And Capacitor doesn't copy native code automatically**

**Result**: Your updated code in `test-plugin/` is NOT in the app!

---

## Solution: Force Reinstall + Manual Copy

### Method 1: Complete Reinstall (Recommended)

```bash
# 1. Go to your app folder
cd /path/to/your/app

# 2. Remove the old plugin from node_modules
rm -rf node_modules/@morphprotocol/capacitor-plugin

# 3. Remove from package-lock.json
rm package-lock.json

# 4. Reinstall the plugin
npm install file:./test-plugin

# 5. Force Capacitor to update
npx cap sync android --force

# 6. CRITICAL: Manually copy native code to app
# Capacitor copies to node_modules but NOT to android/app
cp -r node_modules/@morphprotocol/capacitor-plugin/android/src/main/java/com/morphprotocol \
      android/app/src/main/java/

# 7. Copy AndroidManifest.xml permissions
# You need to MERGE the permissions into your app's manifest
cat node_modules/@morphprotocol/capacitor-plugin/android/src/main/AndroidManifest.xml

# Then manually add the permissions to android/app/src/main/AndroidManifest.xml

# 8. Clean build
cd android
./gradlew clean build

# 9. Run
cd ..
npx cap run android
```

### Method 2: Direct Update (Faster for Testing)

```bash
# 1. Update test-plugin with new code
cp -r /path/to/morphProtocol/android/plugin/* /path/to/your/app/test-plugin/

# 2. Reinstall
cd /path/to/your/app
npm uninstall @morphprotocol/capacitor-plugin
npm install file:./test-plugin

# 3. Copy native code to app
cp -r node_modules/@morphprotocol/capacitor-plugin/android/src/main/java/com/morphprotocol \
      android/app/src/main/java/

# 4. Update AndroidManifest.xml (see below)

# 5. Rebuild
cd android && ./gradlew clean build && cd ..
npx cap run android
```

### Method 3: Symlink (Best for Development)

```bash
# 1. Remove installed plugin
cd /path/to/your/app
npm uninstall @morphprotocol/capacitor-plugin

# 2. Create symlink instead of copy
npm install --save file:./test-plugin

# 3. But still need to manually copy native code
cp -r test-plugin/android/src/main/java/com/morphprotocol \
      android/app/src/main/java/

# 4. Update AndroidManifest.xml

# 5. Now when you update test-plugin, reinstall:
npm uninstall @morphprotocol/capacitor-plugin
npm install file:./test-plugin
# And copy native code again
```

---

## CRITICAL: Update AndroidManifest.xml

The plugin's AndroidManifest.xml is NOT automatically merged. You must manually add permissions.

### Check your app's AndroidManifest.xml:

```bash
cat android/app/src/main/AndroidManifest.xml
```

### Add these permissions if missing:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <!-- Existing permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    
    <!-- ADD THESE FOR ANDROID 15/16 FIX -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    
    <application>
        <!-- Your app content -->
    </application>
</manifest>
```

**Location**: `android/app/src/main/AndroidManifest.xml`

---

## Verification Steps

### 1. Check if plugin is in node_modules:

```bash
ls -la node_modules/@morphprotocol/capacitor-plugin/android/src/main/java/com/morphprotocol/capacitor/
```

Should show:
- `MorphProtocolPlugin.kt`
- `MorphProtocolService.kt`

### 2. Check if native code is in app:

```bash
ls -la android/app/src/main/java/com/morphprotocol/capacitor/
```

Should show the same files. **If not, the native code wasn't copied!**

### 3. Check for new code in Service:

```bash
grep "startForeground" android/app/src/main/java/com/morphprotocol/capacitor/MorphProtocolService.kt
```

Should show:
```kotlin
private fun startForeground() {
    val notification = createNotification("MorphProtocol VPN", "Service running")
    
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
```

**If you see this, the update worked!** ✅

### 4. Check for new code in Plugin:

```bash
grep "postDelayed" android/app/src/main/java/com/morphprotocol/capacitor/MorphProtocolPlugin.kt
```

Should show:
```kotlin
Handler(Looper.getMainLooper()).postDelayed({
```

### 5. Check AndroidManifest.xml:

```bash
grep "FOREGROUND_SERVICE" android/app/src/main/AndroidManifest.xml
```

Should show:
```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

**If all 5 checks pass, your app has the Android 15/16 fix!** ✅

---

## Why This Is Complicated

**Capacitor's plugin system:**

1. **Web code** (TypeScript/JavaScript)
   - ✅ Automatically synced from `node_modules/`
   
2. **Native code** (Android/iOS)
   - ❌ **NOT automatically synced**
   - Must be manually copied to `android/app/src/`
   
3. **AndroidManifest.xml**
   - ❌ **NOT automatically merged**
   - Must manually add permissions to app's manifest

**This is by design** - Capacitor doesn't want to overwrite your app's native code automatically.

---

## Complete Update Script

Save this as `update-plugin.sh` in your app folder:

```bash
#!/bin/bash

echo "Updating MorphProtocol plugin..."

# 1. Update test-plugin folder
echo "Step 1: Copying latest plugin code to test-plugin/"
cp -r /path/to/morphProtocol/android/plugin/* ./test-plugin/

# 2. Reinstall plugin
echo "Step 2: Reinstalling plugin..."
npm uninstall @morphprotocol/capacitor-plugin
npm install file:./test-plugin

# 3. Copy native code to app
echo "Step 3: Copying native code to app..."
mkdir -p android/app/src/main/java/com/morphprotocol/capacitor
cp -r node_modules/@morphprotocol/capacitor-plugin/android/src/main/java/com/morphprotocol/capacitor/* \
      android/app/src/main/java/com/morphprotocol/capacitor/

# 4. Check AndroidManifest
echo "Step 4: Checking AndroidManifest.xml..."
if ! grep -q "FOREGROUND_SERVICE_DATA_SYNC" android/app/src/main/AndroidManifest.xml; then
    echo "⚠️  WARNING: AndroidManifest.xml needs manual update!"
    echo "Add these permissions to android/app/src/main/AndroidManifest.xml:"
    echo ""
    echo '<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />'
    echo '<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />'
    echo '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />'
    echo ""
else
    echo "✅ AndroidManifest.xml already has required permissions"
fi

# 5. Clean build
echo "Step 5: Clean build..."
cd android
./gradlew clean
cd ..

echo "✅ Plugin updated! Now run: npx cap run android"
```

Make it executable:
```bash
chmod +x update-plugin.sh
```

Run it:
```bash
./update-plugin.sh
```

---

## Quick Fix (Do This Now)

```bash
# In your app folder:

# 1. Copy latest code to test-plugin
cp -r /path/to/morphProtocol/android/plugin/* ./test-plugin/

# 2. Reinstall
npm uninstall @morphprotocol/capacitor-plugin
npm install file:./test-plugin

# 3. Copy native code to app
cp -r node_modules/@morphprotocol/capacitor-plugin/android/src/main/java/com/morphprotocol/capacitor/* \
      android/app/src/main/java/com/morphprotocol/capacitor/

# 4. Edit AndroidManifest.xml
nano android/app/src/main/AndroidManifest.xml
# Add the 3 permissions (FOREGROUND_SERVICE, FOREGROUND_SERVICE_DATA_SYNC, POST_NOTIFICATIONS)

# 5. Clean build
cd android && ./gradlew clean build && cd ..

# 6. Run
npx cap run android
```

---

## Summary

**The issue**: 
- ✅ You updated `test-plugin/`
- ❌ But `node_modules/` still has old code
- ❌ And `android/app/` never got the new native code
- ❌ And `AndroidManifest.xml` doesn't have new permissions

**The solution**:
1. Reinstall plugin: `npm install file:./test-plugin`
2. Copy native code: `cp -r node_modules/.../android/... android/app/...`
3. Update AndroidManifest.xml manually
4. Clean build and run

**After this, your app will have the Android 15/16 fix!** 🚀
