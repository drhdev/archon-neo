#!/bin/sh
# Injects the public site URL into the SEO files (canonical, Open Graph, sitemap, robots).
# Source (first match wins): SITE_URL, Coolify's SERVICE_URL_ARCHON, Coolify's SERVICE_FQDN_ARCHON.
# Without a URL the absolute-URL tags are removed instead of publishing placeholders.
# Never blocks start-up: on any problem it logs a warning and nginx starts anyway.
set -u

ROOT=/usr/share/nginx/html
edit() { sed -i "$1" "$2" 2>/dev/null || echo "40-site-url: warning – could not update $2" >&2; }
url="${SITE_URL:-${SERVICE_URL_ARCHON:-${SERVICE_FQDN_ARCHON:-}}}"
url="$(printf '%s' "$url" | cut -d',' -f1 | tr -d '[:space:]')"   # Coolify may pass a comma-separated list
url="${url%/}"

case "$url" in
  "" ) ;;
  http://*|https://*) ;;
  *) url="https://$url" ;;
esac

# Only allow plain URL characters (protects the sed expressions below).
case "$url" in
  *[!A-Za-z0-9.:/_-]*) echo "40-site-url: ignoring invalid SITE_URL '$url'" >&2; url="" ;;
esac

if [ -n "$url" ]; then
  for f in index.html 404.html robots.txt sitemap.xml; do
    [ -f "$ROOT/$f" ] && edit "s|__SITE_URL__|$url|g" "$ROOT/$f"
  done
  echo "40-site-url: public URL is $url"
else
  for f in index.html 404.html robots.txt; do
    [ -f "$ROOT/$f" ] && edit '/__SITE_URL__/d' "$ROOT/$f"
  done
  [ -f "$ROOT/sitemap.xml" ] && edit 's|__SITE_URL__||g' "$ROOT/sitemap.xml"
  echo "40-site-url: SITE_URL not set – canonical and Open Graph URLs omitted" >&2
fi
exit 0
