# How to Update the Android Plugin in Your App

## The Problem

When you update the plugin's Android native code (`.kt` files), **Capacitor doesn't automatically copy the changes** to your app. You need to force update the native code.

## Why `npx cap sync` Doesn't Work

`npx cap sync` only:
- ✅ Copies web assets
- ✅ Updates Capacitor configuration
- ✅ Installs new plugins
- ❌ **Does NOT update existing plugin native code**

## The Correct Update Process

### Method 1: Force Update (Recommended)

```bash
# 1. Go to your app folder
cd /path/to/your/app

# 2. Remove the old plugin from Android
rm -rf android/app/src/main/java/com/morphprotocol

# 3. Remove Capacitor's cached plugin
rm -rf android/capacitor-cordova-android-plugins/src/main/java/com/morphprotocol

# 4. Force sync
npx cap sync android --force

# 5. Manually copy the updated plugin files
cp -r /path/to/morphProtocol/android/plugin/android/src/main/java/com/morphprotocol android/app/src/main/java/

# 6. Copy the updated AndroidManifest.xml
cp /path/to/morphProtocol/android/plugin/android/src/main/AndroidManifest.xml android/app/src/main/

# 7. Build and run
npx cap run android
```

### Method 2: Clean Build (Most Reliable)

```bash
# 1. Go to your app folder
cd /path/to/your/app

# 2. Remove the entire Android folder
rm -rf android/

# 3. Re-add Android platform
npx cap add android

# 4. Manually copy the plugin
mkdir -p android/app/src/main/java/com/morphprotocol
cp -r /path/to/morphProtocol/android/plugin/android/src/main/java/com/morphprotocol/* android/app/src/main/java/com/morphprotocol/

# 5. Copy AndroidManifest.xml
cp /path/to/morphProtocol/android/plugin/android/src/main/AndroidManifest.xml android/app/src/main/

# 6. Sync
npx cap sync android

# 7. Build and run
npx cap run android
```

### Method 3: Direct Copy (Fastest for Testing)

```bash
# 1. Copy the updated Kotlin files directly
cp -r /path/to/morphProtocol/android/plugin/android/src/main/java/com/morphprotocol/capacitor/* \
      /path/to/your/app/android/app/src/main/java/com/morphprotocol/capacitor/

# 2. Copy the updated AndroidManifest.xml
cp /path/to/morphProtocol/android/plugin/android/src/main/AndroidManifest.xml \
   /path/to/your/app/android/app/src/main/

# 3. Rebuild in Android Studio or
cd /path/to/your/app/android
./gradlew clean build

# 4. Run
npx cap run android
```

## Verify the Update

### Check if new code is included:

```bash
# 1. Check if AndroidManifest has new permissions
grep "FOREGROUND_SERVICE" /path/to/your/app/android/app/src/main/AndroidManifest.xml

# Should show:
# <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
# <uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
# <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

# 2. Check if Service has foreground code
grep "startForeground" /path/to/your/app/android/app/src/main/java/com/morphprotocol/capacitor/MorphProtocolService.kt

# Should show:
# private fun startForeground() {
# startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)

# 3. Check if Plugin has delay code
grep "postDelayed" /path/to/your/app/android/app/src/main/java/com/morphprotocol/capacitor/MorphProtocolPlugin.kt

# Should show:
# Handler(Looper.getMainLooper()).postDelayed({
```

## Common Issues

### Issue 1: "Service not connected" error

**Cause**: Old plugin code still in app

**Solution**: Use Method 2 (Clean Build) to completely remove old code

### Issue 2: Still stuck at connect()

**Cause**: AndroidManifest.xml not updated

**Solution**: 
```bash
# Verify AndroidManifest in your app has the new permissions
cat /path/to/your/app/android/app/src/main/AndroidManifest.xml | grep -A5 "FOREGROUND_SERVICE"
```

If not found, manually copy:
```bash
cp /path/to/morphProtocol/android/plugin/android/src/main/AndroidManifest.xml \
   /path/to/your/app/android/app/src/main/
```

### Issue 3: Build errors after update

**Cause**: Gradle cache or conflicting files

**Solution**:
```bash
cd /path/to/your/app/android
./gradlew clean
./gradlew build
```

### Issue 4: Permission denied errors

**Cause**: Missing permissions in app's AndroidManifest.xml

**Solution**: Merge the plugin's AndroidManifest.xml with your app's:

```xml
<!-- In your app's android/app/src/main/AndroidManifest.xml -->
<manifest>
    <!-- Add these permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    
    <application>
        <!-- Your app content -->
    </application>
</manifest>
```

## Why This Happens

Capacitor plugins have two parts:

1. **TypeScript/JavaScript** (in `src/` and `dist/`)
   - ✅ Automatically synced by `npx cap sync`
   
2. **Native code** (in `android/` and `ios/`)
   - ❌ **NOT automatically synced** for existing plugins
   - Must be manually copied or plugin reinstalled

## Best Practice for Development

When developing a local plugin:

1. **Make changes** in plugin folder
2. **Copy to app** using Method 3 (Direct Copy)
3. **Test** in app
4. **Repeat** until working
5. **Final clean build** using Method 2 before release

## Alternative: Use Symlinks (Advanced)

For faster development, symlink the plugin:

```bash
# In your app folder
cd android/app/src/main/java/com/morphprotocol

# Remove existing
rm -rf capacitor

# Create symlink
ln -s /path/to/morphProtocol/android/plugin/android/src/main/java/com/morphprotocol/capacitor capacitor

# Now changes in plugin are immediately reflected in app
```

**Warning**: Don't forget to remove symlink before production build!

## Quick Reference

| What Changed | What to Copy | Command |
|--------------|--------------|---------|
| `.kt` files | Java source | `cp -r plugin/android/src/main/java/com/morphprotocol/* app/android/app/src/main/java/com/morphprotocol/` |
| `AndroidManifest.xml` | Manifest | `cp plugin/android/src/main/AndroidManifest.xml app/android/app/src/main/` |
| Both | Everything | Use Method 2 (Clean Build) |

## Summary

**The key issue**: `npx cap sync` does NOT update native code for existing plugins.

**The solution**: Manually copy the updated native files to your app's android folder.

**The verification**: Check that new code (permissions, startForeground, postDelayed) exists in your app's android folder.

---

**After following these steps, your app should have the Android 15/16 fixes and work correctly!**
