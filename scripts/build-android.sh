#!/bin/bash

echo "Building TPX Barbershop Android APK..."

# Build the React app
echo "Building React app..."
npm run build

if [ $? -ne 0 ]; then
    echo "React build failed!"
    exit 1
fi

# Sync with Capacitor
echo "Syncing with Capacitor..."
npx cap sync android

if [ $? -ne 0 ]; then
    echo "Capacitor sync failed!"
    exit 1
fi

# Build APK
echo "Building Android APK..."
cd android
./gradlew assembleDebug

if [ $? -ne 0 ]; then
    echo "APK build failed!"
    exit 1
fi

cd ..

# Show APK location
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    echo "✅ Build successful!"
    echo "📱 APK Location: $APK_PATH"
    echo "📏 APK Size: $(du -h $APK_PATH | cut -f1)"
    echo ""
    echo "To install on device:"
    echo "  adb install $APK_PATH"
    echo ""
    echo "To install on connected device (if available):"
    adb devices | grep -v "List of devices" | while read -r line; do
        if [ -n "$line" ]; then
            device_id=$(echo $line | awk '{print $1}')
            echo "  Installing on device: $device_id"
            adb -s $device_id install $APK_PATH
        fi
    done
else
    echo "❌ APK not found at expected location!"
    exit 1
fi
