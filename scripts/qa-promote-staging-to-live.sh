#!/usr/bin/env bash
# ============================================================================
# QA Promotion Script — staging → main-live
# ============================================================================
# Promotes a QA-signed-off staging build to production (main-live).
# Per Code Review SOP §1.12 and §16, QA runs this script AFTER testing
# on the staging environment is complete.
#
# This script:
#   1. Verifies you are on a clean working tree
#   2. Fetches origin
#   3. Requires you to confirm the staging SHA you are promoting
#   4. Checks out main-live, merges staging with main-live winning on
#      production env templates
#   5. Runs gitleaks locally
#   6. Pushes main-live
#   7. Creates a GitHub Release tagged with the date
#
# Usage:
#   ./scripts/qa-promote-staging-to-live.sh [--dry-run]
# ============================================================================

set -euo pipefail

DRY_RUN=${1:-}
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || { echo "❌ Not in a git repo"; exit 1; })
cd "$REPO_ROOT"

say() { printf "\033[1;36m▸ %s\033[0m\n" "$*"; }
ok()  { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
warn(){ printf "\033[1;33m⚠ %s\033[0m\n" "$*"; }
err() { printf "\033[1;31m✗ %s\033[0m\n" "$*" >&2; }

# --- Preconditions -----------------------------------------------------------

say "Preflight checks"
if [ -n "$(git status --porcelain)" ]; then
  err "Working tree is dirty. Commit or stash your changes first."
  exit 1
fi
command -v gh >/dev/null || { err "gh CLI required"; exit 1; }
gh auth status >/dev/null 2>&1 || { err "Run: gh auth login"; exit 1; }
ok "Clean and authenticated"

git fetch origin --prune
git rev-parse --verify origin/staging   >/dev/null || { err "origin/staging missing"; exit 1; }
git rev-parse --verify origin/main-live >/dev/null || { err "origin/main-live missing"; exit 1; }

STAGING_SHA=$(git rev-parse origin/staging)
LIVE_SHA=$(git rev-parse origin/main-live)
say "origin/staging    @ ${STAGING_SHA:0:7}"
say "origin/main-live  @ ${LIVE_SHA:0:7}"

AHEAD=$(git rev-list --count origin/main-live..origin/staging)
if [ "$AHEAD" -eq 0 ]; then
  ok "main-live already up to date with staging. Nothing to promote."
  exit 0
fi
say "staging has $AHEAD commit(s) ahead of main-live"

# --- Explicit human confirmation ---------------------------------------------

echo ""
say "You are about to PROMOTE staging → main-live"
say "This deploys to the PRODUCTION Render environment AND Vercel Production."
echo ""
git log --oneline origin/main-live..origin/staging | head -n 30
echo ""
read -r -p "Type 'PROMOTE TO PRODUCTION' to confirm: " CONFIRM
if [ "$CONFIRM" != "PROMOTE TO PRODUCTION" ]; then
  err "Aborted."
  exit 1
fi

# --- Checkout main-live and merge --------------------------------------------

say "Checking out main-live"
if git show-ref --verify --quiet refs/heads/main-live; then
  git checkout main-live
  git reset --hard origin/main-live
else
  git checkout -b main-live origin/main-live
fi

MERGE_MSG="chore(release): promote staging @ ${STAGING_SHA:0:7} to main-live $(date +%Y-%m-%d)"

if [ "$DRY_RUN" = "--dry-run" ]; then
  warn "DRY RUN — previewing merge"
  git merge --no-commit --no-ff origin/staging || true
  git status --short
  git merge --abort 2>/dev/null || true
  exit 0
fi

if ! git merge --no-commit --no-ff origin/staging -m "$MERGE_MSG"; then
  warn "Merge had conflicts — resolving with main-live wins on production env files"
fi

# main-live wins on production env/config files
PROTECTED_FILES=(
  "frontend/.env.production.example"
  "backend/.env.production.example"
  "frontend/vercel.json"
  "render.yaml"
)
for pf in "${PROTECTED_FILES[@]}"; do
  if [ -f "$pf" ] || git ls-tree -r HEAD --name-only | grep -qxF "$pf"; then
    git checkout --ours -- "$pf" 2>/dev/null || true
    git add "$pf" 2>/dev/null || true
  fi
done

if git diff --name-only --diff-filter=U | grep -q .; then
  err "Unresolved conflicts outside the protected file list:"
  git diff --name-only --diff-filter=U
  err "Resolve manually, commit, and push."
  exit 1
fi

git commit --no-edit -m "$MERGE_MSG" || true
ok "Merged staging into main-live"

# --- Gitleaks ----------------------------------------------------------------

if command -v gitleaks >/dev/null; then
  say "Running gitleaks"
  if ! gitleaks detect --source "$REPO_ROOT" --config "$REPO_ROOT/.gitleaks.toml" --no-banner; then
    err "gitleaks detected committed secrets — aborting promotion"
    git reset --hard origin/main-live
    exit 1
  fi
  ok "gitleaks clean"
fi

# --- Push + tag --------------------------------------------------------------

say "Pushing main-live"
git push origin main-live
ok "Pushed"

TAG="release-$(date +%Y-%m-%d-%H%M)"
git tag -a "$TAG" -m "Release $TAG"
git push origin "$TAG"
ok "Tagged $TAG"

say "Creating GitHub release"
gh release create "$TAG" \
  --title "Release $TAG" \
  --notes "$(cat <<EOF
## Release $TAG

Promoted \`staging\` @ \`${STAGING_SHA:0:7}\` to \`main-live\`.

### Commits
\`\`\`
$(git log --oneline origin/main-live~1..origin/main-live | head -n 50)
\`\`\`

🤖 Created by \`qa-promote-staging-to-live.sh\`
EOF
)" 2>/dev/null || warn "Could not create release — do it manually"

ok "Production promotion complete."
