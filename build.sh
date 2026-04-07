#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_DIR="$PROJECT_ROOT/android"
APP_GRADLE="$ANDROID_DIR/app/build.gradle"

export JAVA_HOME="${JAVA_HOME:-/c/Users/shawn/jdks/microsoft-jdk-17}"
export ANDROID_HOME="${ANDROID_HOME:-/c/Users/shawn/AppData/Local/Android/Sdk}"
export NODE_ENV="${NODE_ENV:-production}"
export PATH="$JAVA_HOME/bin:/c/nvm4w/nodejs:$PATH"

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

./gradlew --no-daemon --max-workers 1 \
  app:assembleRelease \
  -x lint \
  -x test \
  --configure-on-demand \
  -PreactNativeArchitectures=arm64-v8a

echo
echo "Release APKs:"
find "$ANDROID_DIR/app/build/outputs/apk/release" -maxdepth 1 -type f -name "*.apk" -print
