#!/bin/bash

# pricing-service — live status check
# Usage: bash apps/pricing-service/check-status.sh [JWT]
#   JWT is optional — pass it to also test authenticated endpoints

REDIS_URL="redis://localhost:6379"
SERVICE_URL="http://localhost:3016"
DB_URL="${DATABASE_URL:-postgres://ksneha@localhost:5432/marketeq}"
JWT="${1:-}"

echo ""
echo "================================================="
echo "   PRICING SERVICE — STATUS CHECK"
echo "================================================="
echo ""

# ── 1. pricing-service health ─────────────────────────
printf "  pricing-service  (port 3016)  ... "
HEALTH=$(curl -s --max-time 3 "$SERVICE_URL/health" 2>/dev/null)
if echo "$HEALTH" | grep -q "ok"; then
  echo "✅  RUNNING   → $HEALTH"
else
  echo "❌  DOWN      → not reachable"
fi

# ── 2. Redis ──────────────────────────────────────────
printf "  Redis            (port 6379)  ... "
REDIS_PING=$(redis-cli -u $REDIS_URL ping 2>/dev/null)
if [ "$REDIS_PING" = "PONG" ]; then
  KEY_COUNT=$(redis-cli -u $REDIS_URL keys "ps:*" 2>/dev/null | wc -l | tr -d ' ')
  echo "✅  RUNNING   → $KEY_COUNT cached ps:* keys"
else
  echo "❌  DOWN      → redis-cli ping failed"
fi

# ── 3. PostgreSQL ─────────────────────────────────────
printf "  PostgreSQL       (port 5432)  ... "
RATE_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM ps_platform_rate_averages;" 2>/dev/null | tr -d ' \n')
FX_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM ps_currency_rates;" 2>/dev/null | tr -d ' \n')
if [ -n "$RATE_COUNT" ] && [ "$RATE_COUNT" -ge 0 ] 2>/dev/null; then
  echo "✅  RUNNING   → $RATE_COUNT rate record(s), $FX_COUNT fx record(s)"
else
  pg_isready -h localhost -p 5432 -U ksneha > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "✅  RUNNING   → accepting connections (tables may not exist yet)"
  else
    echo "❌  DOWN      → could not connect"
  fi
fi

# ── 4. GET /v1/rates (fresh) ──────────────────────────
printf "  GET /v1/rates (fresh)         ... "
if [ -z "$JWT" ]; then
  echo "⚠️   SKIPPED   → pass JWT as argument to test"
else
  RATES=$(curl -s --max-time 5 \
    "$SERVICE_URL/v1/rates?role=UX+Designer&location=United+States&experience=mid&schedule=full_time" \
    -H "Authorization: Bearer $JWT" 2>/dev/null)
  if echo "$RATES" | grep -q "hourlyRateMedianUsdCents"; then
    MEDIAN=$(echo "$RATES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('hourlyRateMedianUsdCents','?'))" 2>/dev/null || echo "?")
    STALE=$(echo "$RATES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('isStale','?'))" 2>/dev/null || echo "?")
    echo "✅  OK        → median=${MEDIAN} cents, is_stale=${STALE}"
  else
    echo "❌  FAILED    → $RATES"
  fi
fi

# ── 5. GET /v1/rates (stale) ──────────────────────────
printf "  GET /v1/rates (stale)         ... "
if [ -z "$JWT" ]; then
  echo "⚠️   SKIPPED   → pass JWT as argument to test"
else
  STALE_RESP=$(curl -s --max-time 5 \
    "$SERVICE_URL/v1/rates?role=DevOps+Engineer&location=Southeast+Asia&experience=mid&schedule=full_time" \
    -H "Authorization: Bearer $JWT" 2>/dev/null)
  if echo "$STALE_RESP" | grep -q '"isStale":true'; then
    echo "✅  OK        → is_stale=true confirmed"
  elif echo "$STALE_RESP" | grep -q "hourlyRateMedianUsdCents"; then
    echo "⚠️   WARN      → responded but is_stale not true (seed may be fresh)"
  else
    echo "❌  FAILED    → $STALE_RESP"
  fi
fi

# ── 6. POST /v1/budget/calculate ──────────────────────
printf "  POST /v1/budget/calculate     ... "
if [ -z "$JWT" ]; then
  echo "⚠️   SKIPPED   → pass JWT as argument to test"
else
  BUDGET=$(curl -s --max-time 5 -X POST \
    "$SERVICE_URL/v1/budget/calculate" \
    -H "Authorization: Bearer $JWT" \
    -H "Content-Type: application/json" \
    -d '{"roles":[{"roleTitle":"UX Designer","location":"United States","experienceLevel":"mid","schedule":"full_time","estimatedHours":160}]}' \
    2>/dev/null)
  if echo "$BUDGET" | grep -q '"totalUsdCents"'; then
    TOTAL=$(echo "$BUDGET" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('totalUsdCents','?'))" 2>/dev/null || echo "?")
    echo "✅  OK        → totalUsdCents=${TOTAL}"
  else
    echo "❌  FAILED    → $BUDGET"
  fi
fi

# ── 7. GET /v1/currency/convert ───────────────────────
printf "  GET /v1/currency/convert      ... "
if [ -z "$JWT" ]; then
  echo "⚠️   SKIPPED   → pass JWT as argument to test"
else
  FX=$(curl -s --max-time 5 \
    "$SERVICE_URL/v1/currency/convert?amount=1000&from=USD&to=EUR" \
    -H "Authorization: Bearer $JWT" 2>/dev/null)
  if echo "$FX" | grep -q '"converted"'; then
    CONVERTED=$(echo "$FX" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('converted','?'))" 2>/dev/null || echo "?")
    echo "✅  OK        → 1000 USD = ${CONVERTED} EUR"
  else
    echo "❌  FAILED    → $FX"
  fi
fi

# ── 8. Redis cache key format ──────────────────────────
printf "  Redis key format (slugify)    ... "
KEYS=$(redis-cli -u $REDIS_URL keys "ps:rate:*" 2>/dev/null)
if echo "$KEYS" | grep -qE "ps:rate:[a-z]+-"; then
  SAMPLE=$(echo "$KEYS" | head -1)
  echo "✅  OK        → dash separator confirmed: $SAMPLE"
elif [ -z "$KEYS" ]; then
  echo "⚠️   EMPTY     → no rate keys yet, hit GET /v1/rates first"
else
  echo "⚠️   CHECK     → $(echo "$KEYS" | head -1)"
fi

echo ""
echo "================================================="
echo ""
