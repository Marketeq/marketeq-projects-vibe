#!/usr/bin/env bash
# ============================================================================
# QA Promotion Script — staging → live
# ============================================================================
# Promotes a QA-signed-off staging build to production (live).
# Per DEVOPS_SOP §7, QA runs this script AFTER testing on the staging
# environment is complete. Pushing to live triggers BOTH a Vercel
# production deploy AND the single Render backend redeploy in lockstep
# (DEVOPS_SOP §3).
#
# This script:
#   1. Verifies you are on a clean working tree
#   2. Fetches origin
#   3. Requires you to confirm the staging SHA you are promoting
#   4. Checks out live, merges staging with live winning on
#      production env templates
#   5. Runs gitleaks locally
#   6. Pushes live
#   7. Creates a GitHub Release tagged with the date
#
# Usage:
#   ./scripts/devops/qa-promote-staging-to-live.sh [--dry-run]
# ============================================================================

set -euo pipefail

DRY_RUN=""
ASSUME_YES=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN="--dry-run" ;;
    --yes) ASSUME_YES=1 ;;
  esac
done
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
git rev-parse --verify origin/live >/dev/null || { err "origin/live missing"; exit 1; }

STAGING_SHA=$(git rev-parse origin/staging)
LIVE_SHA=$(git rev-parse origin/live)
say "origin/staging    @ ${STAGING_SHA:0:7}"
say "origin/live  @ ${LIVE_SHA:0:7}"

AHEAD=$(git rev-list --count origin/live..origin/staging)
if [ "$AHEAD" -eq 0 ]; then
  ok "live already up to date with staging. Nothing to promote."
  exit 0
fi
say "staging has $AHEAD commit(s) ahead of live"

# --- Explicit human confirmation ---------------------------------------------

echo ""
say "You are about to PROMOTE staging → live"
say "This deploys to the PRODUCTION Render environment AND Vercel Production."
echo ""
git log --oneline origin/live..origin/staging | head -n 30 || true
echo ""
# --yes skips the prompt for non-interactive runs. Without a tty, read hits
# EOF and set -e exits the script silently, which reads as a no-op.
if [ "${ASSUME_YES:-0}" = "1" ]; then
  say "Confirmation supplied via --yes"
else
  read -r -p "Type 'PROMOTE TO PRODUCTION' to confirm: " CONFIRM || CONFIRM=""
  if [ "$CONFIRM" != "PROMOTE TO PRODUCTION" ]; then
    err "Aborted."
    exit 1
  fi
fi

# --- Checkout live and merge --------------------------------------------

say "Checking out live"
if git show-ref --verify --quiet refs/heads/live; then
  git checkout live
  git reset --hard origin/live
else
  git checkout -b live origin/live
fi

MERGE_MSG="chore(release): promote staging @ ${STAGING_SHA:0:7} to live $(date +%Y-%m-%d)"

if [ "$DRY_RUN" = "--dry-run" ]; then
  warn "DRY RUN — previewing merge"
  git merge --no-commit --no-ff origin/staging || true
  git status --short
  git merge --abort 2>/dev/null || true
  exit 0
fi

if ! git merge --no-commit --no-ff origin/staging -m "$MERGE_MSG"; then
  warn "Merge had conflicts — resolving with live wins on production env files"
fi

# live wins on production env/config files
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
ok "Merged staging into live"

# --- Gitleaks ----------------------------------------------------------------

if command -v gitleaks >/dev/null; then
  # Scope to the commits this release adds — see the fuller note in
  # qa-promote-dev-to-staging.sh. An unscoped `gitleaks detect` walks the entire
  # commit history and blocks every release on pre-existing findings, no matter
  # how clean the commits being promoted are.
  say "Running gitleaks on the promoted commits (${LIVE_SHA:0:7}..HEAD)"
  if ! gitleaks detect --source "$REPO_ROOT" --config "$REPO_ROOT/.gitleaks.toml" \
      --log-opts="${LIVE_SHA}..HEAD" --no-banner; then
    err "gitleaks detected secrets in the commits being promoted — aborting promotion"
    git reset --hard origin/live
    exit 1
  fi
  ok "gitleaks clean"
fi

# --- Push + tag --------------------------------------------------------------

say "Pushing live"
git push origin live
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

Promoted \`staging\` @ \`${STAGING_SHA:0:7}\` to \`live\`.

### Commits
\`\`\`
$(git log --oneline origin/live~1..origin/live | head -n 50)
\`\`\`

🤖 Created by \`qa-promote-staging-to-live.sh\`
EOF
)" 2>/dev/null || warn "Could not create release — do it manually"

ok "Production promotion complete."
