#!/usr/bin/env bash
# ============================================================================
# QA Promotion Script — dev-main → staging
# ============================================================================
# This is the ONLY approved way for QA to pull developer work from
# dev-main into staging for testing. Per DEVOPS_SOP §7, QA never edits
# dev-main, never tests on dev-main, and never opens PRs touching dev-main
# directly. Use this script to promote green-lit dev-main work into staging.
#
# What this script does:
#   1. Verifies your local repo is clean and your git identity is set
#   2. Fetches origin
#   3. Checks out staging (creating a local tracking branch if needed)
#   4. Merges origin/dev-main into staging with an explicit strategy:
#        - staging's .env.staging.example files WIN on conflict
#        - staging's vercel.json WINS on conflict
#        - staging's render.yaml WINS on conflict
#        - everything else: dev-main wins
#   5. Runs the gitleaks secret scan locally on the merged result
#   6. Pushes staging to origin
#   7. Opens a GitHub issue tracking the QA round
#
# What this script does NOT do:
#   - Touch dev-main in any way
#   - Force-push anything
#   - Skip safety checks
#   - Promote further to live-mvp (use qa-promote-staging-to-live.sh)
#
# Usage:
#   ./scripts/qa-promote-dev-to-staging.sh [--dry-run]
#
# Requires:
#   - git, gh (authenticated), gitleaks (optional, recommended)
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
  git status --short
  exit 1
fi

if ! git config user.email >/dev/null; then
  err "git user.email is not set. Run: git config --global user.email you@marketeq.com"
  exit 1
fi

if ! command -v gh >/dev/null; then
  err "gh CLI is required. Install from https://cli.github.com/"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  err "gh is not authenticated. Run: gh auth login"
  exit 1
fi

ok "Working tree clean, git identity set, gh authenticated"

# --- Fetch all branches ------------------------------------------------------

say "Fetching origin"
git fetch origin --prune
ok "Fetched"

# --- Verify dev-main and staging exist ---------------------------------------

if ! git rev-parse --verify origin/dev-main >/dev/null 2>&1; then
  err "origin/dev-main does not exist"
  exit 1
fi
if ! git rev-parse --verify origin/staging >/dev/null 2>&1; then
  err "origin/staging does not exist"
  exit 1
fi

DEV_SHA=$(git rev-parse origin/dev-main)
STAGING_SHA=$(git rev-parse origin/staging)
say "origin/dev-main  @ ${DEV_SHA:0:7}"
say "origin/staging   @ ${STAGING_SHA:0:7}"

# --- Check if there's anything to promote ------------------------------------

AHEAD=$(git rev-list --count origin/staging..origin/dev-main)
if [ "$AHEAD" -eq 0 ]; then
  ok "staging is already up to date with dev-main. Nothing to promote."
  exit 0
fi
say "dev-main has $AHEAD commit(s) ahead of staging"

# --- Check out staging -------------------------------------------------------

say "Checking out staging"
if git show-ref --verify --quiet refs/heads/staging; then
  git checkout staging
  git reset --hard origin/staging
else
  git checkout -b staging origin/staging
fi
ok "On staging branch"

# --- Merge dev-main with environment-aware strategy --------------------------

say "Merging origin/dev-main into staging (staging wins on env/vercel/render)"

MERGE_MSG="chore(qa): promote dev-main @ ${DEV_SHA:0:7} to staging for QA round $(date +%Y-%m-%d)"

if [ "$DRY_RUN" = "--dry-run" ]; then
  warn "DRY RUN — not actually merging"
  git merge --no-commit --no-ff origin/dev-main || true
  say "Merge preview — check for conflicts:"
  git status --short
  git merge --abort 2>/dev/null || true
  exit 0
fi

# Perform the merge; don't commit yet so we can apply the "staging wins"
# rule for protected files before committing
if ! git merge --no-commit --no-ff origin/dev-main -m "$MERGE_MSG"; then
  warn "Merge had conflicts — resolving protected files with staging's version"
fi

# Protected files: staging wins even if dev-main changed them
PROTECTED_FILES=(
  "frontend/.env.staging.example"
  "backend/.env.staging.example"
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

# Check for remaining conflicts
if git diff --name-only --diff-filter=U | grep -q .; then
  err "Unresolved merge conflicts in files not in the protected list:"
  git diff --name-only --diff-filter=U
  err "Resolve manually, then run: git commit && git push origin staging"
  exit 1
fi

# Commit the merge
git commit --no-edit -m "$MERGE_MSG" || true
ok "Merged dev-main into staging"

# --- Secret scan -------------------------------------------------------------

if command -v gitleaks >/dev/null; then
  say "Running gitleaks on the merged result"
  if ! gitleaks detect --source "$REPO_ROOT" --config "$REPO_ROOT/.gitleaks.toml" --no-banner; then
    err "gitleaks detected committed secrets. DO NOT PUSH. Investigate and fix on dev-main first, then re-run this script."
    git reset --hard origin/staging
    exit 1
  fi
  ok "gitleaks clean"
else
  warn "gitleaks not installed — skipping local secret scan. Install with: brew install gitleaks"
fi

# --- Push --------------------------------------------------------------------

say "Pushing staging to origin"
git push origin staging
ok "Pushed"

# --- Open tracking issue -----------------------------------------------------

say "Opening QA round tracking issue"
ROUND_DATE=$(date +%Y-%m-%d)
ISSUE_URL=$(gh issue create \
  --title "QA Round $ROUND_DATE — dev-main → staging promotion" \
  --label "qa-round" \
  --body "$(cat <<EOF
## QA Round — $ROUND_DATE

Promoted \`dev-main\` @ \`${DEV_SHA:0:7}\` into \`staging\` for testing.

**Commits promoted:** $AHEAD

\`\`\`
$(git log --oneline origin/staging..HEAD | head -n 50)
\`\`\`

## QA Checklist

- [ ] Login (client account)
- [ ] Login (talent account)
- [ ] Onboarding steps 1-5 (talent)
- [ ] Onboarding (client)
- [ ] Profile load (talent)
- [ ] Profile load (client)
- [ ] Publish project flow
- [ ] Save & exit flow
- [ ] Account switch
- [ ] Browse / search
- [ ] Checkout / offers

## After QA sign-off

Run \`./scripts/qa-promote-staging-to-live.sh\` to promote to production.

🤖 Created automatically by \`qa-promote-dev-to-staging.sh\`
EOF
)" 2>/dev/null || echo "")

if [ -n "$ISSUE_URL" ]; then
  ok "Tracking issue: $ISSUE_URL"
else
  warn "Could not open tracking issue — do it manually with the 'qa-round' label"
fi

ok "Promotion complete. QA can now test on the staging environment."
