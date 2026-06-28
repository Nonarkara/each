#!/usr/bin/env bash
# each.nonarkara.org — Cloudflare DNS (GitHub Pages custom domain)
# Requires CF_TOKEN with "Edit zone DNS" on nonarkara.org
#   export CF_TOKEN="..." && bash scripts/dns-setup.sh

set -euo pipefail

: "${CF_TOKEN:?CF_TOKEN env var required — Cloudflare → My Profile → API Tokens → Edit zone DNS}"

ZONE="8809ee955a8edb681c34f45ed8f5b765"
BASE="https://api.cloudflare.com/client/v4/zones/$ZONE/dns_records"

add() {
  local type=$1 name=$2 content=$3 proxied=$4
  local result
  result=$(curl -s -X POST "$BASE" \
    -H "Authorization: Bearer $CF_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"$type\",\"name\":\"$name\",\"content\":\"$content\",\"proxied\":$proxied,\"ttl\":1}")
  local ok
  ok=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['success'])" 2>/dev/null)
  if [ "$ok" = "True" ]; then
    echo "✓  $type  $name  →  $content  (proxied=$proxied)"
  else
    echo "✗  $type  $name  →  $content"
    echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); [print('  ', e['message']) for e in d.get('errors',[])]" 2>/dev/null
  fi
}

echo ""
echo "each.nonarkara.org — GitHub Pages DNS"
echo "──────────────────────────────────────────────"
add "CNAME" "each" "nonarkara.github.io" "false"
echo ""
echo "Done. GitHub Pages CNAME is already set in public/CNAME."
echo "Verify: dig each.nonarkara.org +short"
