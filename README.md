# ManaTunes

ManaTunes is a React Native music player for Navidrome and other Subsonic-compatible servers. It includes background playback, offline downloads, playlists, favorites, scrobbling, and an Android Auto media browser.

See [SETUP.md](SETUP.md) for the complete development setup.

## Test Android Auto on Windows

Google's Desktop Head Unit (DHU) runs Android Auto in a window on the development computer. It replaces the car during development, but a physical Android phone is still required because the phone runs Android Auto and Google Assistant or Gemini.

### One-time computer setup

1. Install Android Studio and the Android SDK.
2. Open **Android Studio > SDK Manager > SDK Tools**.
3. Install **Android Auto Desktop Head Unit Emulator**.
4. Install the project dependencies:

   ```powershell
   npm.cmd install
   ```

On Windows, DHU is normally installed at `%LOCALAPPDATA%\Android\Sdk\extras\google\auto`.

### One-time phone setup

1. Update Android Auto from the Play Store and sign in to the phone.
2. Enable Android developer options and **USB debugging**.
3. Open Android Auto settings and tap **Version** repeatedly to enable its developer mode.
4. Open Android Auto's three-dot menu and choose **Developer settings**.
5. Enable **Unknown sources** so a locally installed ManaTunes debug build appears in Android Auto.
6. Under **Previously connected cars**, enable **Add new cars to Android Auto**.

### Build and install ManaTunes

Connect and unlock the phone, accept its USB-debugging prompt, and verify that ADB can see it:

```powershell
npm.cmd run auto:doctor
```

For a Pixel or another modern arm64 phone, build only the required architecture. This avoids failures from native dependencies that no longer build cleanly for 32-bit `armeabi-v7a`:

```powershell
cd android
$env:NODE_ENV = "development"
.\gradlew.bat app:assembleDebug -PreactNativeArchitectures=arm64-v8a
cd ..
```

Install the APK without clearing the existing ManaTunes configuration:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r `
  "android\app\build\outputs\apk\debug\app-debug.apk"
```

### Start Metro and DHU

A debug APK loads its JavaScript bundle from Metro. Start Metro in one terminal:

```powershell
npm.cmd start
```

If the phone cannot reach Metro over USB, add the reverse tunnel:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:8081 tcp:8081
```

On the phone, open Android Auto's three-dot menu and choose **Start head unit server**. Confirm its ongoing notification says the server is running, then launch DHU from another terminal:

```powershell
npm.cmd run auto:start
```

The launcher validates the phone, forwards Android Auto's port 5277, and opens DHU with Google's 720p configuration. On the first connection, keep the phone unlocked and accept any Android Auto terms or permission prompts.

If DHU remains on **Waiting for phone**, stop and restart the head-unit server on the phone, close DHU, and run `npm.cmd run auto:start` again.

### Test voice control

1. In DHU, open the app launcher and select **ManaTunes**.
2. Activate Google Assistant or Gemini with **Hey Google**, DHU's microphone, or the simulated steering-wheel voice control.
3. Test the standard transport commands: **play**, **pause**, **next**, and **previous**.
4. Test catalog routing with **Play _exact song title_**.
5. Test named-app routing with **Play _artist_ on ManaTunes**.

Android Auto connects to ManaTunes through `AndroidAutoMediaService` and its `MediaSession`. Generic transport commands work when ManaTunes is the active player. Current Gemini versions may send catalog requests only to supported Connected Apps such as Spotify or YouTube Music instead of invoking ManaTunes's `onPlayFromSearch` callback. This is a Gemini routing limitation rather than a failure of the Android Auto media service.

Useful diagnostics:

```powershell
npm.cmd run auto:sessions
npm.cmd run auto:logs
```

`auto:sessions` shows the active Android media sessions and playback actions. `auto:logs` streams focused Android Auto and ManaTunes logs.
