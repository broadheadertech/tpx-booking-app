# Android APK Build Guide

a quick reference for generating a debug apk with capacitor + next.js.

## prerequisites
- node.js and npm already installed.
- android studio (or standalone android sdk) with the command-line tools.
- java 17 (bundled with recent android studio installs).

## one-time project setup
1. install dependencies (inside the project root):
   ```bash
   npm install
   ```
2. make sure capacitors android platform exists (already added in the repo):
   ```bash
   npx cap sync android
   ```
3. (optional) open the native project in android studio:
   ```bash
   npx cap open android
   ```

## building the web assets (dev-server redirect)
the project currently serves the android app from the running web dev server (`http://10.0.2.2:3000`). make sure you have the next.js server running before launching the apk:
```bash
npm run dev -- --hostname 0.0.0.0 --port 3000
```

## generating the debug apk
run the gradle wrapper from the android directory:
```bash
cd android
./gradlew assembleDebug
```

the apk will output to:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

## reinstalling after code changes
1. rebuild the web app if you change the frontend:
   ```bash
   npm run dev -- --hostname 0.0.0.0 --port 3000
   ```
2. sync the new web assets:
   ```bash
   npx cap sync android
   ```
3. rebuild the apk:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```

## installing on an emulator/device
use adb from the android sdk platform-tools:
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## running the apk on an emulator
1. launch an emulator from android studio (tools ▸ device manager) or start one from the command line, e.g.:
   ```bash
   emulator -avd Pixel_7_API_35
   ```
2. confirm the emulator is connected:
   ```bash
   adb devices
   ```
3. install the apk (re-use the command above) and then start the app:
   ```bash
   adb shell monkey -p com.celestial.app 1
   ```
4. keep the dev server running at `http://10.0.2.2:3000` (`npm run dev -- --hostname 0.0.0.0 --port 3000`) so the app can load content.
5. prefer a single command? you can build, install, and launch directly with:
   ```bash
   npx cap run android
   ```
   (this opens android studio if needed and pushes the app to the active device.)

## production build (optional)
when you are ready for a release variant, supply release signing config in `android/app/build.gradle` and run:
```bash
cd android
./gradlew assembleRelease
```
this will produce an unsigned release apk/aab under `android/app/build/outputs`.
