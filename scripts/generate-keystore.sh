#!/usr/bin/env bash
# =============================================================================
# RedlineIQ — Keystore Generator
# Run this ONCE to create your release signing keystore.
# Store the output files securely — losing the keystore means you can never
# update the app on Google Play.
# =============================================================================

set -e

KEYSTORE_FILE="redlineiq.keystore"
KEY_ALIAS="redlineiq"

echo "=== RedlineIQ Release Keystore Generator ==="
echo ""
echo "This creates the signing key for your Android app."
echo "Keep redlineiq.keystore and the passwords in a secure location."
echo ""

# Prompt for passwords
read -s -p "Enter keystore password (min 6 chars): " STORE_PASS; echo
read -s -p "Confirm keystore password: " STORE_PASS2; echo
if [ "$STORE_PASS" != "$STORE_PASS2" ]; then
  echo "ERROR: Passwords do not match."
  exit 1
fi

read -s -p "Enter key password (can be same as keystore password): " KEY_PASS; echo

# Prompt for identity
read -p "Your full name or organization: " NAME
read -p "City: " CITY
read -p "Country code (e.g. US, GB, IN): " COUNTRY

echo ""
echo "Generating keystore..."

keytool -genkey -v \
  -keystore "$KEYSTORE_FILE" \
  -storetype PKCS12 \
  -alias "$KEY_ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "$STORE_PASS" \
  -keypass "$KEY_PASS" \
  -dname "CN=$NAME, OU=RedlineIQ, O=RedlineIQ, L=$CITY, C=$COUNTRY"

echo ""
echo "=== Keystore created: $KEYSTORE_FILE ==="
echo ""

# Create keystore.properties for local Gradle builds
cat > android/keystore.properties << EOF
storeFile=../../$KEYSTORE_FILE
storePassword=$STORE_PASS
keyAlias=$KEY_ALIAS
keyPassword=$KEY_PASS
EOF
echo "Created android/keystore.properties for local builds."
echo ""

# Encode for GitHub Actions secret
BASE64=$(base64 -i "$KEYSTORE_FILE" | tr -d '\n')
echo "=== GitHub Actions Secrets ==="
echo "Add these four secrets to your GitHub repo:"
echo "  Settings → Secrets and variables → Actions → New repository secret"
echo ""
echo "Secret name:  KEYSTORE_BASE64"
echo "Secret value: (saved to keystore.base64.txt)"
echo "$BASE64" > keystore.base64.txt
echo ""
echo "Secret name:  KEYSTORE_PASSWORD"
echo "Secret value: $STORE_PASS"
echo ""
echo "Secret name:  KEY_ALIAS"
echo "Secret value: $KEY_ALIAS"
echo ""
echo "Secret name:  KEY_PASSWORD"
echo "Secret value: $KEY_PASS"
echo ""
echo "=== IMPORTANT ==="
echo "1. Add $KEYSTORE_FILE and android/keystore.properties to .gitignore"
echo "2. Back up $KEYSTORE_FILE somewhere safe (password manager, etc.)"
echo "3. You CANNOT update your Play Store app without this keystore"
