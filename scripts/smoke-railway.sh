#!/usr/bin/env bash
# Smoke-test a deployed Railway env end-to-end.
# Usage: scripts/smoke-railway.sh <web-url> <api-url>
set -uo pipefail

WEB="${1:-}"
API="${2:-}"
if [[ -z "$WEB" || -z "$API" ]]; then
  echo "Usage: $0 <web-url> <api-url>" >&2
  echo "Example: $0 https://web-staging-d640.up.railway.app https://api-staging-5143.up.railway.app" >&2
  exit 1
fi

pass=0; fail=0; warn=0
check() {
  local label="$1" expected="$2" actual="$3" body="${4:-}"
  if [[ "$actual" == "$expected" ]]; then
    printf "  \033[32m✓\033[0m %-44s  %s\n" "$label" "$actual"
    pass=$((pass+1))
  elif [[ "$expected" == "401" && "$actual" =~ ^(401|403)$ ]]; then
    printf "  \033[32m✓\033[0m %-44s  %s (auth-gated, OK)\n" "$label" "$actual"
    pass=$((pass+1))
  else
    printf "  \033[31m✗\033[0m %-44s  got %s expected %s\n" "$label" "$actual" "$expected"
    [[ -n "$body" ]] && echo "      body: ${body:0:200}"
    fail=$((fail+1))
  fi
}

probe() {
  local label="$1" url="$2" expected="$3"
  local code body
  body="$(curl -s -m 15 -o /tmp/smoke-body -w '%{http_code}' "$url" 2>/dev/null || echo "000")"
  code="$body"
  check "$label" "$expected" "$code" "$(cat /tmp/smoke-body 2>/dev/null)"
}

probe_json_array() {
  local label="$1" url="$2"
  local code body
  body="$(curl -s -m 15 "$url" 2>/dev/null)"
  code="$(echo "$body" | head -c 1)"
  if [[ "$code" == "[" ]]; then
    local n
    n="$(echo "$body" | python3 -c 'import json,sys;print(len(json.load(sys.stdin)))' 2>/dev/null || echo "?")"
    printf "  \033[32m✓\033[0m %-44s  array len=%s\n" "$label" "$n"
    pass=$((pass+1))
    if [[ "$n" == "0" ]]; then
      printf "      \033[33m⚠ empty array \u2014 may indicate empty DB or filtered query\033[0m\n"
      warn=$((warn+1))
    fi
  else
    printf "  \033[31m✗\033[0m %-44s  not an array (got: %.40s)\n" "$label" "${body:0:80}"
    fail=$((fail+1))
  fi
}

echo "▶ API: $API"
probe "GET  /health"                   "$API/health"                       200
probe_json_array "GET  /v1/products"   "$API/v1/products"
probe "GET  /v1/products/:slug"        "$API/v1/products/premium-gym-gloves" 200
probe "GET  /v1/homepage"              "$API/v1/homepage"                  200
probe "GET  /orders (auth)"            "$API/orders"                       401
probe "GET  /customers (auth)"         "$API/customers"                    401
probe "GET  /analytics/dashboard (auth)" "$API/analytics/dashboard"        401
probe "GET  /health/services (auth)"   "$API/health/services"              401

# Inspect Schema check explicitly
echo ""
echo "▶ Schema canary (via /health/services):"
SVCS="$(curl -s -m 15 "$API/health/services" 2>/dev/null)"
SCHEMA="$(echo "$SVCS" | python3 -c "import json,sys;[print(s['status']+'  '+s['message']) for s in json.load(sys.stdin)['services'] if s['name']=='Schema']" 2>/dev/null)"
if [[ -z "$SCHEMA" ]]; then
  echo "  ⚠ no Schema service in report (deploy may not include new check yet)"
  warn=$((warn+1))
else
  if [[ "$SCHEMA" == healthy* ]]; then
    printf "  \033[32m✓ Schema: %s\033[0m\n" "$SCHEMA"
    pass=$((pass+1))
  else
    printf "  \033[31m✗ Schema: %s\033[0m\n" "$SCHEMA"
    fail=$((fail+1))
  fi
fi

echo ""
echo "▶ WEB: $WEB"
probe "GET  /  (storefront home)"      "$WEB/"                              200
probe "GET  /products"                 "$WEB/products"                      200
probe "GET  /deals"                    "$WEB/deals"                         200
probe "GET  /new"                      "$WEB/new"                           200
probe "GET  /delivery"                 "$WEB/delivery"                      200
probe "GET  /sign-in"                  "$WEB/sign-in"                       200
probe "GET  /dashboard (redir to auth)" "$WEB/dashboard"                     307

# Storefront content check
BODY="$(curl -s -m 15 "$WEB/" 2>/dev/null)"
if grep -q "Premium\|Wireless\|GHS" <<<"$BODY"; then
  printf "  \033[32m✓\033[0m %-44s  product names rendered\n" "Storefront SSR contains products"
  pass=$((pass+1))
else
  printf "  \033[31m✗\033[0m %-44s  no product text in HTML\n" "Storefront SSR contains products"
  fail=$((fail+1))
fi

echo ""
printf "Summary: \033[32m%d pass\033[0m / \033[33m%d warn\033[0m / \033[31m%d fail\033[0m\n" "$pass" "$warn" "$fail"
exit $(( fail > 0 ? 1 : 0 ))
