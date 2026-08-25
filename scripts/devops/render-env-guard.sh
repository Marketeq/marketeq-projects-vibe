#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# render-env-guard.sh — Pre-deploy env var safety check + auto-repair
#
# MUST run before every Render deploy. Blocks deploys if env vars
# are missing. Auto-repairs drift when called with --repair.
#
# Usage:
#   ./scripts/devops/render-env-guard.sh              # check only (exits 1 if drift)
#   ./scripts/devops/render-env-guard.sh --repair      # check + auto-repair
#   ./scripts/devops/render-env-guard.sh --cron        # scheduled: check + repair + deploy if needed
#
# Required env vars:
#   RENDER_TOKEN — Render API key
#   RENDER_ENV_* — backup values for all secrets (see marketeq-devops.config.json)
#
# Jenkins integration:
#   1. Pre-deploy stage: run without --repair, block deploy on exit 1
#   2. Scheduled pipeline (every 30 min): run with --cron
#   3. Post-deploy stage: run without --repair to verify
# ─────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

RENDER_TOKEN="${RENDER_TOKEN:-$(cat ~/.config/render/api-key 2>/dev/null || echo "")}"
export RENDER_TOKEN

if [ -z "$RENDER_TOKEN" ]; then
  echo "FATAL: RENDER_TOKEN not set and ~/.config/render/api-key not found"
  exit 1
fi

MODE="check"
if [[ "${1:-}" == "--repair" || "${1:-}" == "--cron" ]]; then
  MODE="$1"
fi

SERVICE_ID="srv-d76r48nafjfc73e1djf0"
API_BASE="https://api.render.com/v1"

# ── Step 1: Count check (fast fail for bulk deletion) ────────

echo "Checking Render env var count..."
VAR_COUNT=$(curl -sf \
  -H "Authorization: Bearer $RENDER_TOKEN" \
  "$API_BASE/services/$SERVICE_ID/env-vars?limit=100" \
  | python3 -c "import json,sys; print(len(json.load(sys.stdin)))")

MINIMUM=41
echo "  Found: $VAR_COUNT vars (minimum: $MINIMUM)"

if [ "$VAR_COUNT" -lt "$MINIMUM" ]; then
  echo ""
  echo "CRITICAL: Only $VAR_COUNT env vars found, expected at least $MINIMUM"
  echo "  $((MINIMUM - VAR_COUNT)) vars have been deleted!"
  echo ""

  if [[ "$MODE" == "--repair" || "$MODE" == "--cron" ]]; then
    echo "Auto-repairing via sync-staging-runtime-envs.mjs --apply --component render ..."
    cd "$REPO_ROOT"
    node scripts/devops/sync-staging-runtime-envs.mjs --apply --component render --json
    RESULT=$?

    # Verify repair worked
    NEW_COUNT=$(curl -sf \
      -H "Authorization: Bearer $RENDER_TOKEN" \
      "$API_BASE/services/$SERVICE_ID/env-vars?limit=100" \
      | python3 -c "import json,sys; print(len(json.load(sys.stdin)))")

    echo ""
    echo "Post-repair count: $NEW_COUNT vars"

    if [ "$NEW_COUNT" -lt "$MINIMUM" ]; then
      echo "FATAL: Repair failed. Still only $NEW_COUNT vars."
      exit 1
    fi

    echo "Repair successful."
    exit 0
  else
    echo "Run with --repair to auto-fix, or restore manually."
    exit 1
  fi
fi

# ── Step 2: Full drift check ─────────────────────────────────

echo "Running full drift check (Render only)..."
cd "$REPO_ROOT"
export RENDER_TOKEN
DRIFT_OUTPUT=$(node scripts/devops/check-runtime-env-drift.mjs 2>&1) || true
# Check only the Render portion — Vercel drift is a separate concern
DRIFT_OK=$(echo "$DRIFT_OUTPUT" | python3 -c "
import json,sys
d=json.load(sys.stdin)
r = d.get('renderSharedBackend', {})
if not r.get('available', False):
    print('false')
elif r.get('report', {}).get('ok', False):
    print('true')
else:
    print('false')
" 2>/dev/null || echo "false")

if [ "$DRIFT_OK" == "true" ]; then
  echo "  All env vars OK. No drift detected."
  exit 0
fi

echo ""
echo "DRIFT DETECTED:"
echo "$DRIFT_OUTPUT" | python3 -c "
import json, sys
d = json.load(sys.stdin)
for f in d.get('failures', []):
    print(f'  - {f}')
" 2>/dev/null || echo "$DRIFT_OUTPUT"

if [[ "$MODE" == "--repair" || "$MODE" == "--cron" ]]; then
  echo ""
  echo "Auto-repairing..."
  node scripts/devops/sync-staging-runtime-envs.mjs --apply --component render --json
  echo "Repair complete."
  exit 0
fi

echo ""
echo "Run with --repair to auto-fix."
exit 1
