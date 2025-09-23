# TPX Barbershop Android APK Build Guide

## Overview
This guide explains how to build and install the TPX Barbershop Android APK using Ionic Capacitor.

## Prerequisites

### System Requirements
- Node.js (v16 or higher)
- npm or yarn
- Android SDK installed
- Java JDK 11 or higher

### Android Development Setup
1. Install Android Studio
2. Set up Android SDK and Android Virtual Device (AVD)
3. Configure ANDROID_HOME environment variable
4. Add Android SDK tools to PATH

### Required Packages
All necessary Capacitor packages are already installed:
```bash
@capacitor/core
@capacitor/cli  
@capacitor/android
```

## Build Commands

### Quick Build (Recommended)
```bash
npm run android:build
```
This single command will:
1. Build the React app
2. Sync with Capacitor
3. Build the Android APK
4. Show installation instructions

### Manual Build Steps
```bash
# 1. Build the React app
npm run build

# 2. Sync files with Android project
npm run android:sync

# 3. Open Android Studio (optional)
npm run android:open

# 4. Build APK manually
cd android
./gradlew assembleDebug
cd ..
```

## APK Location
After successful build, the APK will be located at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

## Installation

### Method 1: Using ADB (Developer Mode)
1. Enable Developer Options on your Android device
2. Enable USB Debugging
3. Connect device to computer via USB
4. Install APK:
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Method 2: Direct File Transfer
1. Transfer the APK file to your device
2. Locate the file in your device's file manager
3. Tap to install (may require enabling "Install from unknown sources")

### Method 3: Android Studio
1. Open Android Studio
2. Open the project: `File > Open > android/`
3. Connect your device or start an emulator
4. Click the "Run" button (green play icon)

## App Information

- **App Name**: TPX Barbershop
- **Package ID**: com.tpx.barbershop
- **Version**: 1.0
- **Version Code**: 1
- **Minimum SDK**: 23 (Android 6.0)
- **Build Type**: Debug

## Troubleshooting

### Build Issues
```bash
# Clean build
cd android
./gradlew clean
./gradlew assembleDebug
cd ..

# Clear Capacitor cache
npx cap sync android --force
```

### ADB Connection Issues
```bash
# Restart ADB server
adb kill-server
adb start-server

# Check connected devices
adb devices

# Authorize device if unauthorized
adb devices
```

### Common Errors
1. **"Command not found: adb"**
   - Install Android Platform Tools
   - Add to PATH: `export PATH=$PATH:$ANDROID_HOME/platform-tools`

2. **"Gradle sync failed"**
   - Check internet connection
   - Update Android SDK in Android Studio
   - Run `./gradlew --refresh-dependencies`

3. **"Installation failed"**
   - Enable "Unknown sources" in device settings
   - Uninstall previous version if exists
   - Check device storage space

## Development Tips

### Hot Reload Development
For development with hot reload, use:
```bash
npm run dev
```
Then sync changes to Android:
```bash
npm run android:sync
```

### Testing on Emulator
1. Start Android Virtual Device (AVD)
2. Run the app:
```bash
cd android
./gradlew installDebug
```

### Production Build
For release build (requires signing key):
```bash
cd android
./gradlew assembleRelease
```

## File Structure
```
tpx-booking-app/
├── android/                 # Android native project
│   └── app/
│       └── build/outputs/apk/debug/app-debug.apk
├── scripts/
│   └── build-android.sh    # Build script
├── src/                    # React source code
├── dist/                   # Built web assets
└── capacitor.config.json   # Capacitor configuration
```

## Support
For issues related to:
- **Capacitor**: https://capacitorjs.com/docs
- **Android Development**: https://developer.android.com
- **React**: https://reactjs.org