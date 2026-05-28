#!/usr/bin/env bash
# ============================================================================
# Desktop Time Tracker — Pre-publish preflight checks
# ============================================================================
# Run this BEFORE publishing a desktop release to Marketeq/desktop-time-tracker.
# It validates that the desktop app builds cleanly and all required assets exist.
#
# Usage:
#   ./scripts/devops/desktop-preflight.sh
#
# What it checks:
#   1. resources/icon.png exists (generates placeholder if missing)
#   2. TypeScript compiles without errors (main + preload + renderer typecheck)
#   3. Full build succeeds (main + preload + renderer)
#   4. Required dist files exist
#   5. No stale imports or missing modules
# ============================================================================

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || { echo "❌ Not in a git repo"; exit 1; })
DESKTOP_DIR="$REPO_ROOT/desktop"

if [ ! -d "$DESKTOP_DIR" ]; then
  echo "❌ Desktop directory not found at $DESKTOP_DIR"
  exit 1
fi

cd "$DESKTOP_DIR"

echo "═══════════════════════════════════════════════"
echo "  Desktop Time Tracker — Preflight Checks"
echo "═══════════════════════════════════════════════"
echo ""

FAILURES=0

# ── 1. Icon asset ──────────────────────────────────────────────────────────
echo "▶ [1/5] Checking tray icon..."
if [ ! -f "resources/icon.png" ]; then
  echo "  ⚠ resources/icon.png missing — generating placeholder..."
  node scripts/make-placeholder-icon.js
  if [ -f "resources/icon.png" ]; then
    echo "  ✅ Placeholder icon generated"
  else
    echo "  ❌ Failed to generate icon"
    FAILURES=$((FAILURES + 1))
  fi
else
  echo "  ✅ Icon exists"
fi

# ── 2. Dependencies ────────────────────────────────────────────────────────
echo ""
echo "▶ [2/5] Checking dependencies..."
if [ ! -d "node_modules" ]; then
  echo "  ⚠ node_modules missing — running npm install..."
  npm install --legacy-peer-deps 2>&1 | tail -3
fi
echo "  ✅ Dependencies installed"

# ── 3. TypeScript typecheck ────────────────────────────────────────────────
echo ""
echo "▶ [3/5] Running TypeScript typecheck..."
if npm run typecheck 2>&1; then
  echo "  ✅ Typecheck passed"
else
  echo "  ❌ Typecheck failed"
  FAILURES=$((FAILURES + 1))
fi

# ── 4. Full build ──────────────────────────────────────────────────────────
echo ""
echo "▶ [4/5] Running full build..."
if npm run build 2>&1; then
  echo "  ✅ Build succeeded"
else
  echo "  ❌ Build failed"
  FAILURES=$((FAILURES + 1))
fi

# ── 5. Verify dist outputs ────────────────────────────────────────────────
echo ""
echo "▶ [5/5] Verifying dist outputs..."
REQUIRED_FILES=(
  "dist/main/main/index.js"
  "dist/preload/preload/preload.js"
)
for f in "${REQUIRED_FILES[@]}"; do
  if [ -f "$f" ]; then
    echo "  ✅ $f"
  else
    echo "  ❌ Missing: $f"
    FAILURES=$((FAILURES + 1))
  fi
done

# ── Summary ────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
if [ "$FAILURES" -eq 0 ]; then
  echo "  ✅ All preflight checks passed"
  echo "  Ready to publish: npm run dist"
  echo "═══════════════════════════════════════════════"
  exit 0
else
  echo "  ❌ $FAILURES check(s) failed — DO NOT publish"
  echo "═══════════════════════════════════════════════"
  exit 1
fi
