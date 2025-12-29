#!/bin/bash

# Script to verify Android permissions for MorphProtocol plugin
# This checks if your Capacitor app has the required permissions

set -e

echo "=========================================="
echo "MorphProtocol Permission Verification"
echo "=========================================="
echo ""

# Required permissions for Android 15/16
REQUIRED_PERMISSIONS=(
    "android.permission.FOREGROUND_SERVICE"
    "android.permission.FOREGROUND_SERVICE_DATA_SYNC"
    "android.permission.POST_NOTIFICATIONS"
)

# Find the app's AndroidManifest.xml
# Common locations for Capacitor apps
MANIFEST_PATHS=(
    "../../app/src/main/AndroidManifest.xml"
    "../../../app/src/main/AndroidManifest.xml"
    "../../android/app/src/main/AndroidManifest.xml"
    "../../../android/app/src/main/AndroidManifest.xml"
)

MANIFEST_FILE=""
for path in "${MANIFEST_PATHS[@]}"; do
    if [ -f "$path" ]; then
        MANIFEST_FILE="$path"
        break
    fi
done

# If not found in common locations, search
if [ -z "$MANIFEST_FILE" ]; then
    echo "Searching for AndroidManifest.xml..."
    FOUND=$(find ../.. -path "*/android/app/src/main/AndroidManifest.xml" 2>/dev/null | head -1)
    if [ -n "$FOUND" ]; then
        MANIFEST_FILE="$FOUND"
    fi
fi

if [ -z "$MANIFEST_FILE" ]; then
    echo "❌ ERROR: Could not find your app's AndroidManifest.xml"
    echo ""
    echo "Please provide the path to your Capacitor app's AndroidManifest.xml:"
    echo "Example: /path/to/your/app/android/app/src/main/AndroidManifest.xml"
    echo ""
    echo "Then run:"
    echo "  ./verify-permissions.sh /path/to/AndroidManifest.xml"
    exit 1
fi

# Allow override via command line argument
if [ -n "$1" ]; then
    MANIFEST_FILE="$1"
fi

if [ ! -f "$MANIFEST_FILE" ]; then
    echo "❌ ERROR: AndroidManifest.xml not found at: $MANIFEST_FILE"
    exit 1
fi

echo "✓ Found AndroidManifest.xml at:"
echo "  $MANIFEST_FILE"
echo ""

# Check each required permission
echo "Checking required permissions:"
echo ""

ALL_FOUND=true
for permission in "${REQUIRED_PERMISSIONS[@]}"; do
    if grep -q "android:name=\"$permission\"" "$MANIFEST_FILE"; then
        echo "  ✅ $permission"
    else
        echo "  ❌ $permission (MISSING)"
        ALL_FOUND=false
    fi
done

echo ""

# Check for foreground service declaration
echo "Checking service configuration:"
echo ""

if grep -q "MorphProtocolService" "$MANIFEST_FILE"; then
    echo "  ✅ MorphProtocolService declared"
    
    if grep -q "foregroundServiceType=\"dataSync\"" "$MANIFEST_FILE"; then
        echo "  ✅ foregroundServiceType=\"dataSync\" configured"
    else
        echo "  ⚠️  foregroundServiceType=\"dataSync\" not found"
        echo "     (May be inherited from plugin manifest)"
    fi
else
    echo "  ⚠️  MorphProtocolService not explicitly declared"
    echo "     (Should be auto-merged from plugin manifest)"
fi

echo ""
echo "=========================================="

if [ "$ALL_FOUND" = true ]; then
    echo "✅ All required permissions are present!"
    echo ""
    echo "Your app should work on Android 15/16."
else
    echo "❌ Some permissions are missing!"
    echo ""
    echo "To fix, add these to your AndroidManifest.xml:"
    echo ""
    echo "<manifest xmlns:android=\"http://schemas.android.com/apk/res/android\">"
    echo "    <!-- Add these permissions -->"
    
    for permission in "${REQUIRED_PERMISSIONS[@]}"; do
        if ! grep -q "android:name=\"$permission\"" "$MANIFEST_FILE"; then
            echo "    <uses-permission android:name=\"$permission\" />"
        fi
    done
    
    echo "</manifest>"
    echo ""
    echo "Location: $MANIFEST_FILE"
fi

echo "=========================================="
echo ""

# Show the actual permissions section from the manifest
echo "Current permissions in your manifest:"
echo ""
grep -A 1 "uses-permission" "$MANIFEST_FILE" | sed 's/^/  /' || echo "  (No permissions found)"
echo ""

exit 0
