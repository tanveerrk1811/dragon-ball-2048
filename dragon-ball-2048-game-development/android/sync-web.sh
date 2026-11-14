#!/usr/bin/env bash
# Builds the website and copies it into the Android project's assets (assets/www).
# Run from anywhere:  ./android/sync-web.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
npm run build
DEST="$ROOT/android/app/src/main/assets/www"
rm -rf "$DEST"
mkdir -p "$DEST"
cp -R dist/. "$DEST/"
# The owner dashboard and server-only files must never ship inside the APK.
rm -rf "$DEST/admin" "$DEST/robots.txt" "$DEST/ads.txt"
echo "Web game synced to android/app/src/main/assets/www"
