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

Use Google's Desktop Head Unit (DHU) to run the phone's real Android Auto experience in a window on this computer. A physical Android phone is still required, but the car is not.

The DHU package is installed from Android Studio > SDK Manager > SDK Tools > **Android Auto Desktop Head Unit Emulator**. On Windows it is installed at:

```text
%LOCALAPPDATA%\Android\Sdk\extras\google\auto\desktop-head-unit.exe
```

### One-time phone setup

1. Update Android Auto from the Play Store and make sure the phone is signed in.
2. Open Android Auto settings on the phone.
3. Scroll to **Version** and tap it repeatedly until developer mode is enabled.
4. Open the three-dot menu > **Developer settings**.
5. Enable **Unknown sources** if a locally installed debug build of ManaTunes does not appear.
6. Return to the three-dot menu and choose **Start head unit server**.
7. Under **Previously connected cars**, make sure **Add new cars to Android Auto** is enabled.

### Build, install, and launch

Connect the unlocked phone over USB, accept its USB debugging prompt, then run:

```powershell
npm run auto:doctor
npx expo run:android
npm run auto:start
```

If Windows PowerShell reports that `npm.ps1` cannot run because script execution is disabled, use `npm.cmd` in these commands (for example, `npm.cmd run auto:start`). No global execution-policy change is required.

`auto:start` establishes the required ADB tunnel on port 5277 and opens DHU. Check the phone for first-run terms and permission prompts. ManaTunes should then appear in Android Auto's app launcher under media apps.

If Metro is not already running after installation, start it separately:

```powershell
npm start
```

### Voice-command test

1. Open ManaTunes in DHU and start or select it as the active media app.
2. Activate Gemini by saying **Hey Google**, clicking DHU's microphone, or using the DHU control that represents the steering-wheel voice button.
3. Say **Play [exact song title]**.
4. Then try **Play [artist] on ManaTunes**.

The first command tests routing to the currently selected media app. The second tests whether Gemini can select ManaTunes by name.

For diagnostics, use separate terminals:

```powershell
npm run auto:sessions  # snapshot active MediaSessions and playback actions
npm run auto:logs      # stream focused Android Auto/ManaTunes logs
```

If `auto:doctor` reports no phone, run the SDK's `adb devices` command, unlock the phone, and accept the authorization dialog. If DHU cannot connect, confirm **Start head unit server** is still active and rerun `npm run auto:start`.

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
