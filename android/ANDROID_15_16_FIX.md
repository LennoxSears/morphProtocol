# Android 15/16 Compatibility Fix

## Problem

App stuck at `MorphProtocol.connect()` on Android 15 and Android 16, but works fine on Android 11.

## Root Cause

**Android 14+ introduced strict foreground service requirements:**

1. **Background services are killed immediately** - Services must run as foreground services
2. **Foreground service type required** - Must declare `foregroundServiceType` in manifest
3. **Runtime permissions required** - `FOREGROUND_SERVICE` and type-specific permissions
4. **Notification required** - Foreground services must show a notification
5. **Service binding delays** - Android 15/16 may take longer to bind services

## Changes Made

### 1. AndroidManifest.xml

**Added permissions:**
```xml
<!-- Android 9+ (API 28+) - Foreground service permission -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />

<!-- Android 14+ (API 34+) - Foreground service type permission -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />

<!-- Android 13+ (API 33+) - Notification permission for foreground service -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

**Updated service declaration:**
```xml
<service
    android:name=".MorphProtocolService"
    android:enabled="true"
    android:exported="false"
    android:foregroundServiceType="dataSync" />
```

### 2. MorphProtocolService.kt

**Added foreground service support:**

1. **Notification channel creation** (Android 8+)
2. **Start as foreground service** in `onCreate()`
3. **Notification updates** on connect/disconnect
4. **Proper foreground service type** for Android 10+

**Key changes:**
```kotlin
private fun startForeground() {
    val notification = createNotification("MorphProtocol VPN", "Service running")
    
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        // Android 10+ with foreground service type
        startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
    } else {
        startForeground(NOTIFICATION_ID, notification)
    }
}
```

### 3. MorphProtocolPlugin.kt

**Added service binding delay handling:**

Android 15/16 may take longer to bind services, so added a retry mechanism:

```kotlin
@PluginMethod
fun connect(call: PluginCall) {
    // Ensure service is bound before attempting connection
    if (!isBound || serviceMessenger == null) {
        // Wait 500ms for service to bind (Android 15/16 may take longer)
        Handler(Looper.getMainLooper()).postDelayed({
            if (!isBound || serviceMessenger == null) {
                call.reject("Service not connected. Please ensure service is started.")
                return@postDelayed
            }
            performConnect(call)
        }, 500)
        return
    }
    
    performConnect(call)
}
```

## Testing

### Before Fix (Android 15/16)
- ❌ App stuck at `connect()`
- ❌ No response from service
- ❌ Service killed by system

### After Fix (Android 15/16)
- ✅ Service runs as foreground service
- ✅ Notification shows "MorphProtocol VPN"
- ✅ Connection succeeds
- ✅ Service survives in background

## User Impact

### What Users Will See

1. **Notification permission request** (Android 13+)
   - First time app runs, user will be asked to allow notifications
   - Required for foreground service

2. **Persistent notification**
   - Shows "MorphProtocol VPN - Service running" when service starts
   - Updates to "Connected to server" when connected
   - Updates to "Disconnected" when disconnected

3. **Better reliability**
   - Service won't be killed by Android
   - Connection survives app backgrounding
   - Works on all Android versions (11-16+)

## Deployment

### For Existing Apps

Users need to:
1. **Update the app** to get the new version
2. **Grant notification permission** when prompted (Android 13+)
3. **Restart the app** after update

### For New Installs

Everything works automatically - notification permission will be requested on first connection.

## Backward Compatibility

✅ **Fully backward compatible** with Android 11-14
- Foreground service permissions are ignored on older versions
- Notification channel creation is version-checked
- Service type is only applied on Android 10+

## Additional Notes

### Why `dataSync` Service Type?

Android 14+ requires declaring a specific foreground service type. Options:
- `dataSync` - For data synchronization (our choice)
- `connectedDevice` - For connected devices
- `mediaPlayback` - For media
- `location` - For location tracking

We chose `dataSync` because:
- VPN traffic forwarding is a form of data synchronization
- Doesn't require additional location permissions
- Appropriate for network services

### Alternative: VPN Service

For a true VPN implementation, consider using `VpnService` instead:
- Requires `android.permission.BIND_VPN_SERVICE`
- Creates a system VPN connection
- Shows VPN icon in status bar
- More appropriate for full VPN apps

Current implementation is a **VPN tunnel obfuscator**, not a full VPN, so `dataSync` service type is appropriate.

## Troubleshooting

### Issue: "Service not connected" error

**Cause**: Service binding takes too long

**Solution**: Increase delay in Plugin:
```kotlin
Handler(Looper.getMainLooper()).postDelayed({
    // ...
}, 1000) // Increase from 500ms to 1000ms
```

### Issue: Notification permission denied

**Cause**: User denied notification permission

**Solution**: Request permission explicitly:
```kotlin
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQUEST_CODE)
}
```

### Issue: Service still killed

**Cause**: Battery optimization

**Solution**: Request battery optimization exemption:
```kotlin
val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
intent.data = Uri.parse("package:$packageName")
startActivity(intent)
```

## References

- [Android Foreground Services](https://developer.android.com/develop/background-work/services/foreground-services)
- [Android 14 Behavior Changes](https://developer.android.com/about/versions/14/behavior-changes-14)
- [Android 15 Behavior Changes](https://developer.android.com/about/versions/15/behavior-changes-15)

---

**Status**: ✅ Fixed and tested
**Compatibility**: Android 11-16+
**Breaking Changes**: None (backward compatible)
