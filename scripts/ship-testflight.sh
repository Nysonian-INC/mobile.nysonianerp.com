#!/usr/bin/env bash
# Ship Nysonian ERP to TestFlight (iOS) and/or Play internal testing (Android).
# Run on a Mac with Apple Developer access.
#
# Usage:
#   ./scripts/ship-testflight.sh ios
#   ./scripts/ship-testflight.sh android
#   ./scripts/ship-testflight.sh both
set -euo pipefail

PLATFORM="${1:-ios}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v eas >/dev/null 2>&1; then
  echo "Installing eas-cli..."
  npm install -g eas-cli
fi

if ! eas whoami >/dev/null 2>&1; then
  echo "Log in to Expo:"
  eas login
fi

# Ensure ascAppId is set in eas.json before submit (App Store Connect → App → App Information → Apple ID)
if grep -q 'REPLACE_WITH_APP_STORE_CONNECT_APP_ID' eas.json; then
  echo ""
  echo "⚠️  Set your App Store Connect App ID in eas.json:"
  echo "   submit.testflight.ios.ascAppId  (numeric Apple ID of the app)"
  echo "   Find it: App Store Connect → My Apps → Nysonian ERP → App Information → Apple ID"
  echo ""
  read -r -p "Paste App Store Connect App ID (or Enter to skip auto-submit and submit later): " ASC_ID
  if [[ -n "${ASC_ID:-}" ]]; then
    # portable-ish replace
    tmp="$(mktemp)"
    sed "s/REPLACE_WITH_APP_STORE_CONNECT_APP_ID/${ASC_ID}/g" eas.json > "$tmp" && mv "$tmp" eas.json
    echo "Updated eas.json ascAppId=$ASC_ID"
  fi
fi

ship_ios() {
  echo "▶ Building iOS (TestFlight / store distribution) + auto-submit..."
  eas build --platform ios --profile testflight --auto-submit --non-interactive || \
    eas build --platform ios --profile testflight --auto-submit
  echo ""
  echo "✅ After processing in App Store Connect (~5–30 min):"
  echo "   1. Open TestFlight → Internal Testing"
  echo "   2. Add this build to your Internal group (App Store Connect users)"
  echo "   3. Internal testers get it automatically — no Beta App Review"
  echo "   4. For external / 'all TestFlight users': create External group + public link (needs Beta review)"
}

ship_android() {
  echo "▶ Building Android App Bundle + submit to Play internal track..."
  eas build --platform android --profile production --auto-submit --submit-profile testflight --non-interactive || \
    eas build --platform android --profile production --auto-submit --submit-profile testflight
  echo ""
  echo "✅ In Play Console → Testing → Internal testing → add testers / promote release"
}

case "$PLATFORM" in
  ios) ship_ios ;;
  android) ship_android ;;
  both) ship_ios; ship_android ;;
  *)
    echo "Usage: $0 [ios|android|both]"
    exit 1
    ;;
esac
