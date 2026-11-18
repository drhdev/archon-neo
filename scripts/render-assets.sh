#!/bin/sh
# Regenerates the PNG icons and the social preview image from tools/assets.html.
# Requires Google Chrome/Chromium and Python 3 (for a throw-away local web server).
# Usage: sh scripts/render-assets.sh
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${ASSET_PORT:-8765}"
CHROME="${CHROME:-}"
if [ -z "$CHROME" ]; then
  for c in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" google-chrome chromium chromium-browser; do
    if command -v "$c" >/dev/null 2>&1 || [ -x "$c" ]; then CHROME="$c"; break; fi
  done
fi
[ -n "$CHROME" ] || { echo "Chrome not found (set CHROME=/path/to/chrome)"; exit 1; }

python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT" >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null || true' EXIT INT TERM
sleep 1

shot() { # asset size out width height
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --default-background-color=00000000 --virtual-time-budget=3000 \
    --window-size="$4,$5" --screenshot="$ROOT/public/$3" \
    "http://127.0.0.1:$PORT/tools/assets.html?asset=$1&size=$2" >/dev/null 2>&1
  echo "rendered public/$3"
}

mkdir -p "$ROOT/public/icons"
shot og 0 og-image.png 1200 630
# Social preview as JPEG (much smaller than PNG for a photo-like image)
if command -v sips >/dev/null 2>&1; then
  sips -s format jpeg -s formatOptions 84 "$ROOT/public/og-image.png" --out "$ROOT/public/og-image.jpg" >/dev/null
elif command -v magick >/dev/null 2>&1; then
  magick "$ROOT/public/og-image.png" -quality 84 "$ROOT/public/og-image.jpg"
else
  echo "need sips (macOS) or ImageMagick to create og-image.jpg"; exit 1
fi
rm -f "$ROOT/public/og-image.png"
echo "converted public/og-image.jpg"
shot icon 512 icons/icon-512.png 512 512
shot icon 192 icons/icon-192.png 192 192
shot maskable 512 icons/icon-maskable-512.png 512 512
shot maskable 180 icons/apple-touch-icon.png 180 180
shot icon 32 icons/favicon-32.png 32 32
