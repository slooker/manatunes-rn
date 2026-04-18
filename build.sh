#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_DIR="$PROJECT_ROOT/android"
APP_GRADLE="$ANDROID_DIR/app/build.gradle"
BUILD_TARGET="apk"
INSTALL=false
INSTALL_ONLY=false

for arg in "$@"; do
  case "$arg" in
    --bundle)       BUILD_TARGET="bundle" ;;
    --install)      INSTALL=true ;;
    --install-only) INSTALL_ONLY=true ;;
    *) echo "Usage: ./build.sh [--bundle] [--install] [--install-only]" >&2; exit 1 ;;
  esac
done

if [[ "$INSTALL" == true && "$BUILD_TARGET" == "bundle" ]]; then
  echo "--install is not supported with --bundle (bundles cannot be sideloaded via adb)" >&2
  exit 1
fi
if [[ "$INSTALL_ONLY" == true && ( "$BUILD_TARGET" == "bundle" || "$INSTALL" == true ) ]]; then
  echo "--install-only cannot be combined with --bundle or --install" >&2
  exit 1
fi

export JAVA_HOME="${JAVA_HOME:-/c/Users/shawn/jdks/microsoft-jdk-17}"
export ANDROID_HOME="${ANDROID_HOME:-/c/Users/shawn/AppData/Local/Android/Sdk}"
export NODE_ENV="${NODE_ENV:-production}"
export PATH="$JAVA_HOME/bin:/c/nvm4w/nodejs:$PATH"

# Install an APK to every connected device.
adb_install() {
  local apk="$1"
  local adb="${ANDROID_HOME}/platform-tools/adb"
  local devices=()
  while IFS= read -r line; do
    devices+=("$line")
  done < <("$adb" devices | awk 'NR>1 && $2=="device" {print $1}')

  if [[ ${#devices[@]} -eq 0 ]]; then
    echo "No devices found via adb — skipping install" >&2
    return
  fi

  for device in "${devices[@]}"; do
    echo "Installing on $device..."
    "$adb" -s "$device" install -r "$apk"
  done
}

# --install-only: find the most recent APK and install without building.
if [[ "$INSTALL_ONLY" == true ]]; then
  RELEASE_DIR="$ANDROID_DIR/app/build/outputs/apk/release"
  DEBUG_DIR="$ANDROID_DIR/app/build/outputs/apk/debug"

  RELEASE_APK="$(ls -t "$RELEASE_DIR"/*.apk 2>/dev/null | head -n 1 || true)"
  DEBUG_APK="$(ls -t "$DEBUG_DIR"/*.apk 2>/dev/null | head -n 1 || true)"

  APK=""
  if [[ -n "$RELEASE_APK" && -n "$DEBUG_APK" ]]; then
    echo "Found APKs in both release and debug:"
    printf "  [1] release  %s  %s\n" "$(date -r "$RELEASE_APK" '+%Y-%m-%d %H:%M:%S')" "$RELEASE_APK"
    printf "  [2] debug    %s  %s\n" "$(date -r "$DEBUG_APK"   '+%Y-%m-%d %H:%M:%S')" "$DEBUG_APK"
    read -r -p "Which would you like to install? [1/2]: " CHOICE
    case "$CHOICE" in
      1) APK="$RELEASE_APK" ;;
      2) APK="$DEBUG_APK" ;;
      *) echo "Invalid choice — expected 1 or 2" >&2; exit 1 ;;
    esac
  elif [[ -n "$RELEASE_APK" ]]; then
    APK="$RELEASE_APK"
    echo "Found release APK: $APK"
  elif [[ -n "$DEBUG_APK" ]]; then
    APK="$DEBUG_APK"
    echo "Found debug APK: $APK"
  else
    echo "No APK found in $RELEASE_DIR or $DEBUG_DIR" >&2
    exit 1
  fi

  adb_install "$APK"
  exit 0
fi

CURRENT_VERSION_CODE="$(grep -E '^[[:space:]]*versionCode[[:space:]]+[0-9]+' "$APP_GRADLE" | head -n 1 | awk '{print $2}')"
if [[ -z "$CURRENT_VERSION_CODE" ]]; then
  echo "Could not find versionCode in $APP_GRADLE" >&2
  exit 1
fi

NEXT_VERSION_CODE="$((CURRENT_VERSION_CODE + 1))"
NEXT_VERSION_NAME="2.0.$NEXT_VERSION_CODE"

python - "$APP_GRADLE" "$NEXT_VERSION_CODE" "$NEXT_VERSION_NAME" <<'PY'
import pathlib
import re
import sys

path = pathlib.Path(sys.argv[1])
version_code = sys.argv[2]
version_name = sys.argv[3]
text = path.read_text()
text = re.sub(r'versionCode\s+\d+', f'versionCode {version_code}', text, count=1)
text = re.sub(r'versionName\s+"[^"]+"', f'versionName "{version_name}"', text, count=1)
path.write_text(text)
PY

echo "Building versionCode $NEXT_VERSION_CODE / versionName $NEXT_VERSION_NAME"

cd "$ANDROID_DIR"

GRADLE_TASK="app:assembleRelease"
OUTPUT_LABEL="Release APKs"
OUTPUT_DIR="$ANDROID_DIR/app/build/outputs/apk/release"
OUTPUT_PATTERN="*.apk"

if [[ "$BUILD_TARGET" == "bundle" ]]; then
  GRADLE_TASK="app:bundleRelease"
  OUTPUT_LABEL="Release App Bundles"
  OUTPUT_DIR="$ANDROID_DIR/app/build/outputs/bundle/release"
  OUTPUT_PATTERN="*.aab"
fi

./gradlew --no-daemon --max-workers 1 \
  "$GRADLE_TASK" \
  -x lint \
  -x test \
  --configure-on-demand \
  -PreactNativeArchitectures=arm64-v8a

echo
echo "$OUTPUT_LABEL:"
find "$OUTPUT_DIR" -maxdepth 1 -type f -name "$OUTPUT_PATTERN" -print

if [[ "$INSTALL" == true ]]; then
  APK="$(find "$OUTPUT_DIR" -maxdepth 1 -type f -name "*.apk" | head -n 1)"
  adb_install "$APK"
fi

if command -v explorer.exe >/dev/null 2>&1; then
  explorer.exe "$(cygpath -w "$OUTPUT_DIR")" >/dev/null 2>&1 || true
fi
