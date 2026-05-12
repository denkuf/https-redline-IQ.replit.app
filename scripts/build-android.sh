#!/usr/bin/env bash
# =============================================================================
# RedlineIQ — Android Release Build Script
# Generates a signed .aab (Android App Bundle) ready for Google Play Store.
#
# Prerequisites (must be installed locally):
#   - Node.js 18+
#   - Java 17+ (android studio installs this)
#   - Android Studio with Android SDK (API 33+)
#   - ANDROID_HOME env var set (usually ~/Library/Android/sdk on Mac)
#
# Usage:
#   chmod +x scripts/build-android.sh
#   ./scripts/build-android.sh
# =============================================================================

set -e

echo "=== RedlineIQ Android Build ==="
echo ""

# --- 1. Check required tools ---
command -v node >/dev/null 2>&1 || { echo "ERROR: Node.js not found."; exit 1; }
command -v npx  >/dev/null 2>&1 || { echo "ERROR: npx not found."; exit 1; }

if [ -z "$ANDROID_HOME" ]; then
  echo "WARNING: ANDROID_HOME is not set."
  echo "  Set it to your Android SDK path, e.g.:"
  echo "    export ANDROID_HOME=~/Library/Android/sdk"
  echo ""
fi

# --- 2. Install dependencies ---
echo "[1/6] Installing Node dependencies..."
npm install

# --- 3. Build frontend ---
echo "[2/6] Building frontend (Vite)..."
npm run build
echo "      Built to dist/public"

# --- 4. Capacitor sync ---
echo "[3/6] Syncing Capacitor..."
npx cap sync android

# --- 4b. Add android platform if not present ---
if [ ! -d "android" ]; then
  echo "[3b]  Android platform not found — adding it now..."
  npx cap add android
fi

# --- 5. Generate release AAB ---
echo "[4/6] Building release AAB..."
echo ""
echo "  If this is your first build, you need a keystore."
echo "  Generate one with:"
echo "    keytool -genkey -v -keystore redlineiq.keystore \\"
echo "      -alias redlineiq -keyalg RSA -keysize 2048 -validity 10000"
echo ""

cd android

if [ -f "../redlineiq.keystore" ]; then
  echo "  Found redlineiq.keystore — building signed release..."
  ./gradlew bundleRelease \
    -Pandroid.injected.signing.store.file=../redlineiq.keystore \
    -Pandroid.injected.signing.store.password="${KEYSTORE_PASSWORD:-changeme}" \
    -Pandroid.injected.signing.key.alias="${KEY_ALIAS:-redlineiq}" \
    -Pandroid.injected.signing.key.password="${KEY_PASSWORD:-changeme}"
else
  echo "  No keystore found — building unsigned release..."
  echo "  (Upload to Play Console and let Google sign it, or sign manually)"
  ./gradlew bundleRelease
fi

cd ..

# --- 6. Locate output ---
echo ""
echo "[5/6] Locating .aab..."
AAB=$(find android/app/build/outputs/bundle -name "*.aab" 2>/dev/null | head -1)

if [ -n "$AAB" ]; then
  echo "      SUCCESS: $AAB"
  echo ""
  echo "=== BUILD COMPLETE ==="
  echo ""
  echo "Next steps:"
  echo "  1. Go to https://play.google.com/console"
  echo "  2. Create a new app (or open existing)"
  echo "  3. Release > Production > Create new release"
  echo "  4. Upload: $AAB"
  echo ""
else
  echo "  Could not locate .aab — check android/app/build/outputs/bundle/"
fi
