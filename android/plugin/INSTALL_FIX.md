# Fix: Capacitor Not Copying Plugin Native Code

## Problem

After `npm install file:./test-plugin` and `npx cap sync android`, the folder:
```
android/capacitor-cordova-android-plugins/src/main/java/
```
Only contains `.gitkeep` - no plugin code!

## Root Causes

1. **Plugin not built** - `dist/` folder missing
2. **Capacitor can't find the plugin** - package.json issues
3. **Capacitor sync doesn't detect changes** - needs force

---

## Solution 1: Build Plugin First (Most Common)

```bash
# 1. Go to test-plugin folder
cd /path/to/your/app/test-plugin

# 2. Install dependencies
npm install

# 3. Build the plugin (creates dist/ folder)
npm run build

# 4. Go back to app
cd ..

# 5. Reinstall
npm uninstall @morphprotocol/capacitor-plugin
rm -rf node_modules/@morphprotocol
npm install file:./test-plugin

# 6. Force sync
npx cap sync android --force

# 7. Verify
ls android/capacitor-cordova-android-plugins/src/main/java/com/morphprotocol/capacitor/
```

---

## Solution 2: Manual Copy (If Capacitor Still Doesn't Work)

If Capacitor still doesn't copy the files, manually copy them:

```bash
# 1. Make sure plugin is installed
npm install file:./test-plugin

# 2. Manually copy Android code
mkdir -p android/capacitor-cordova-android-plugins/src/main/java/com/morphprotocol
cp -r node_modules/@morphprotocol/capacitor-plugin/android/src/main/java/com/morphprotocol/* \
      android/capacitor-cordova-android-plugins/src/main/java/com/morphprotocol/

# 3. Copy build.gradle
cp node_modules/@morphprotocol/capacitor-plugin/android/build.gradle \
   android/capacitor-cordova-android-plugins/build.gradle

# 4. Verify
ls android/capacitor-cordova-android-plugins/src/main/java/com/morphprotocol/capacitor/
```

---

## Solution 3: Add Plugin to app's build.gradle (Alternative)

If Capacitor doesn't recognize the plugin, add it manually:

### Edit: `android/app/build.gradle`

Add at the bottom:

```gradle
dependencies {
    // ... existing dependencies ...
    
    // Add MorphProtocol plugin manually
    implementation project(':capacitor-cordova-android-plugins')
}
```

### Edit: `android/settings.gradle`

Make sure this line exists:

```gradle
include ':capacitor-cordova-android-plugins'
project(':capacitor-cordova-android-plugins').projectDir = new File('./capacitor-cordova-android-plugins/')
```

---

## Critical: Update AndroidManifest.xml

**Regardless of which solution works**, you MUST add permissions to your app's manifest:

### Edit: `android/app/src/main/AndroidManifest.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <!-- Existing permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    
    <!-- ADD THESE 3 PERMISSIONS -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    
    <application>
        <!-- Your app content -->
    </application>
</manifest>
```

---

## Verification Checklist

### 1. Check plugin in node_modules:
```bash
ls node_modules/@morphprotocol/capacitor-plugin/android/src/main/java/com/morphprotocol/capacitor/
```
✅ Should show: `MorphProtocolPlugin.kt`, `MorphProtocolService.kt`

### 2. Check if Capacitor copied it:
```bash
ls android/capacitor-cordova-android-plugins/src/main/java/com/morphprotocol/capacitor/
```
✅ Should show the same files (NOT just .gitkeep)

### 3. Check for new code:
```bash
grep "startForeground" android/capacitor-cordova-android-plugins/src/main/java/com/morphprotocol/capacitor/MorphProtocolService.kt
```
✅ Should show: `private fun startForeground() {`

### 4. Check AndroidManifest:
```bash
grep "FOREGROUND_SERVICE" android/app/src/main/AndroidManifest.xml
```
✅ Should show 3 permissions

### 5. Check if plugin is registered:
```bash
cat android/app/src/main/assets/capacitor.config.json | grep morphprotocol
```
✅ Should show the plugin

---

## If Still Not Working: Debug Steps

### Check 1: Is plugin installed?
```bash
npm list @morphprotocol/capacitor-plugin
```

### Check 2: Does plugin have dist/?
```bash
ls node_modules/@morphprotocol/capacitor-plugin/dist/
```
If missing, the plugin wasn't built!

### Check 3: Does plugin have android/?
```bash
ls node_modules/@morphprotocol/capacitor-plugin/android/
```
If missing, npm didn't copy it!

### Check 4: What does Capacitor see?
```bash
npx cap ls
```
Should list `@morphprotocol/capacitor-plugin`

### Check 5: Capacitor sync logs
```bash
npx cap sync android --verbose
```
Look for errors about the plugin

---

## Complete Fix Script

Save as `fix-plugin.sh`:

```bash
#!/bin/bash
set -e

echo "=== Fixing MorphProtocol Plugin Installation ==="

APP_DIR=$(pwd)
PLUGIN_DIR="$APP_DIR/test-plugin"

# 1. Build plugin
echo "Step 1: Building plugin..."
cd "$PLUGIN_DIR"
npm install
npm run build
cd "$APP_DIR"

# 2. Reinstall plugin
echo "Step 2: Reinstalling plugin..."
npm uninstall @morphprotocol/capacitor-plugin 2>/dev/null || true
rm -rf node_modules/@morphprotocol
npm install file:./test-plugin

# 3. Verify plugin installed
if [ ! -d "node_modules/@morphprotocol/capacitor-plugin" ]; then
    echo "❌ ERROR: Plugin not installed in node_modules!"
    exit 1
fi
echo "✅ Plugin installed in node_modules"

# 4. Verify Android code exists
if [ ! -f "node_modules/@morphprotocol/capacitor-plugin/android/src/main/java/com/morphprotocol/capacitor/MorphProtocolService.kt" ]; then
    echo "❌ ERROR: Android code not in plugin!"
    exit 1
fi
echo "✅ Android code exists in plugin"

# 5. Force Capacitor sync
echo "Step 3: Syncing with Capacitor..."
npx cap sync android --force

# 6. Check if Capacitor copied files
if [ ! -f "android/capacitor-cordova-android-plugins/src/main/java/com/morphprotocol/capacitor/MorphProtocolService.kt" ]; then
    echo "⚠️  WARNING: Capacitor didn't copy files. Copying manually..."
    mkdir -p android/capacitor-cordova-android-plugins/src/main/java/com/morphprotocol
    cp -r node_modules/@morphprotocol/capacitor-plugin/android/src/main/java/com/morphprotocol/* \
          android/capacitor-cordova-android-plugins/src/main/java/com/morphprotocol/
    echo "✅ Manually copied Android code"
else
    echo "✅ Capacitor copied Android code"
fi

# 7. Check for new code
if grep -q "startForeground" android/capacitor-cordova-android-plugins/src/main/java/com/morphprotocol/capacitor/MorphProtocolService.kt; then
    echo "✅ New Android 15/16 fix code is present"
else
    echo "❌ ERROR: Old code still present! Update didn't work."
    exit 1
fi

# 8. Check AndroidManifest
if grep -q "FOREGROUND_SERVICE_DATA_SYNC" android/app/src/main/AndroidManifest.xml; then
    echo "✅ AndroidManifest.xml has required permissions"
else
    echo "⚠️  WARNING: AndroidManifest.xml needs manual update!"
    echo ""
    echo "Add these to android/app/src/main/AndroidManifest.xml:"
    echo '<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />'
    echo '<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />'
    echo '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />'
    echo ""
fi

# 9. Clean build
echo "Step 4: Clean build..."
cd android
./gradlew clean
cd ..

echo ""
echo "=== Fix Complete! ==="
echo ""
echo "Next steps:"
echo "1. If AndroidManifest warning above, add the permissions manually"
echo "2. Run: npx cap run android"
echo ""
```

Make executable and run:
```bash
chmod +x fix-plugin.sh
./fix-plugin.sh
```

---

## Summary

**The issue**: Capacitor didn't copy plugin native code to `android/capacitor-cordova-android-plugins/`

**Most likely cause**: Plugin wasn't built (missing `dist/` folder)

**Solution**:
1. Build plugin: `cd test-plugin && npm run build`
2. Reinstall: `npm install file:./test-plugin`
3. Force sync: `npx cap sync android --force`
4. If still fails: Manually copy files
5. Always: Add permissions to AndroidManifest.xml

**After this, the Android 15/16 fix should work!** 🚀
