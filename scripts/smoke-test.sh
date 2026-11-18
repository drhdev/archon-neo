#!/bin/sh
# Starts the built image and verifies health, content, SEO injection and security headers.
# Usage: sh scripts/smoke-test.sh [image]   (default: archon-neo:latest)
set -eu

IMAGE="${1:-archon-neo:latest}"
NAME="archon-neo-smoke-$$"
PORT="${SMOKE_PORT:-18080}"
URL="http://127.0.0.1:$PORT"

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM

docker run -d --name "$NAME" -p "$PORT:8080" -e SITE_URL=https://archon.example.com \
  --cap-drop ALL --security-opt no-new-privileges:true "$IMAGE" >/dev/null

i=0
until curl -fsS "$URL/healthz" >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -gt 30 ]; then echo "✗ container did not become healthy"; docker logs "$NAME"; exit 1; fi
  sleep 1
done

check() { if eval "$2"; then echo "✓ $1"; else echo "✗ $1"; docker logs "$NAME"; exit 1; fi; }

body="$(curl -fsS "$URL/")"
headers="$(curl -fsSI "$URL/")"
check "index.html served"            'printf "%s" "$body" | grep -q "ARCHON"'
check "canonical URL injected"       'printf "%s" "$body" | grep -q "https://archon.example.com/\""'
check "no placeholder left"          '! printf "%s" "$body" | grep -q "__SITE_URL__"'
check "CSP header"                   'printf "%s" "$headers" | grep -qi "content-security-policy"'
check "nosniff header"               'printf "%s" "$headers" | grep -qi "x-content-type-options: nosniff"'
check "no nginx version leaked"      '! printf "%s" "$headers" | grep -qi "server: nginx/"'
check "game module served as JS"     'curl -fsSI "$URL/js/game.js" | grep -Eqi "content-type: (application|text)/javascript"'
check "manifest content type"        'curl -fsSI "$URL/manifest.webmanifest" | grep -qi "application/manifest+json"'
check "sitemap has public URL"       'curl -fsS "$URL/sitemap.xml" | grep -q "https://archon.example.com/"'
check "custom 404 page"              '[ "$(curl -s -o /dev/null -w "%{http_code}" "$URL/does-not-exist")" = "404" ] && curl -s "$URL/does-not-exist" | grep -q "outside the board"'
check "dotfiles are blocked"         '[ "$(curl -s -o /dev/null -w "%{http_code}" "$URL/.env")" != "200" ]'
check "runs as non-root"             '[ "$(docker exec "$NAME" id -u)" != "0" ]'
echo "All smoke tests passed."
