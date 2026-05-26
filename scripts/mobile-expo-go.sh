#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

if command -v ipconfig >/dev/null 2>&1; then
  HOST_IP="$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || true)"
else
  HOST_IP="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
fi

if [ -z "${HOST_IP:-}" ]; then
  HOST_IP="localhost"
fi

export EXPO_PUBLIC_API_BASE_URL="${EXPO_PUBLIC_API_BASE_URL:-http://$HOST_IP:3001/api}"

echo "Leadsy Mobile Expo Go"
echo "API URL: $EXPO_PUBLIC_API_BASE_URL"
echo "Scan the Expo QR from a phone on the same Wi-Fi network."

cd "$ROOT_DIR/mobile"
exec npx expo start --lan --clear
