# ManaTunes RN — Setup Guide

## First-time Setup

### 1. Install dependencies
```bash
cd C:\Users\shawn\code\manatunes-rn
npm install
```

### 2. Copy icons from the Kotlin app

Before prebuild, copy the icon directories so the config plugin can install them:

```bash
# Create the icons staging directory
mkdir -p assets/icons

# Copy all mipmap density directories from the Kotlin project
cp -r ../manatunes/androidApp/src/main/res/mipmap-* assets/icons/
```

Also copy the main icon and adaptive icon for Expo:
```bash
# 512x512 icon for app.json
cp ../manatunes/androidApp/src/main/res/mipmap-xxxhdpi/ic_launcher.png assets/icon.png

# Foreground layer for adaptive icon
cp ../manatunes/androidApp/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png assets/adaptive-icon.png
```

Copy the changelog:
```bash
cp ../manatunes/androidApp/src/main/assets/changelog.json assets/changelog.json
```

### 3. Generate the Android project
```bash
npx expo prebuild --platform android
```

### 4. Build and install the dev client
This is a one-time build that installs the native shell on your device.
With your device connected and USB debugging enabled:
```bash
npx expo run:android
```

Or build with EAS:
```bash
npx eas build --platform android --profile development
```

### 5. Start the Metro bundler
After the dev client APK is installed on the device:
```bash
npm start
# or
npx expo start --dev-client
```

---

## Running Tests
```bash
npm test              # run all tests once
npm run test:watch    # watch mode
```

---

## Android Auto Testing

Use the Desktop Head Unit (DHU) emulator from the Android Automotive SDK:

1. Install: Android Studio → SDK Manager → SDK Tools → Android Automotive Desktop Head Unit
2. Connect phone via USB with Android Auto enabled
3. Start DHU: `$ANDROID_SDK/extras/google/auto/desktop-head-unit`
4. ManaTunes should appear in the media apps list

---

## When `expo prebuild --clean` is run

The config plugins in `plugins/` automatically:
- `withAndroidAuto.js` — writes `automotive_app_desc.xml` and injects manifest entries
- `withAndroidIcons.js` — copies mipmap PNGs from `assets/icons/` to the Android project

So after any clean prebuild, icons and Android Auto config are restored automatically.

---

## Project Structure Quick Reference

```
src/api/          — SubsonicClient, auth, TypeScript types
src/store/        — Zustand stores (server, playback, favorites, playlists, downloads)
src/services/     — PlaybackService (RNTP), AndroidAutoService, DownloadService
src/hooks/        — useHomeViewModel, useSearchViewModel, usePlayback, useRepository
src/screens/      — All 13 screens
src/components/   — MiniPlayer, CoverArt, SongRow, AlbumCard, ArtistRow, etc.
src/navigation/   — RootNavigator, BottomTabNavigator, types
src/utils/        — formatDuration, testFixtures
plugins/          — Expo config plugins for Android Auto + icons
__mocks__/        — Jest mocks for RNTP, expo-file-system, quick-crypto, secure-store
```
