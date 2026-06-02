#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# deploy.sh — Deploy Marketeq to Vercel
#
# Toggles the repo to public, triggers a Vercel production
# deploy from the correct branch, then sets it back to private.
#
# Usage:
#   ./scripts/devops/deploy.sh dev        # deploy dev-main branch
#   ./scripts/devops/deploy.sh staging    # deploy staging branch
#   ./scripts/devops/deploy.sh live       # deploy live/mvp branch
#   ./scripts/devops/deploy.sh all        # deploy all three
# ─────────────────────────────────────────────────────────────

REPO="Marketeq/marketeq-projects-vibe"

get_branch() {
  case "$1" in
    dev)     echo "dev-main" ;;
    staging) echo "staging" ;;
    live)    echo "live-mvp" ;;
    *)       echo "" ;;
  esac
}

get_project() {
  case "$1" in
    dev)     echo "marketeq-projects-dev" ;;
    staging) echo "marketeq-projects-staging" ;;
    live)    echo "marketeq-projects-live-mvp" ;;
    *)       echo "" ;;
  esac
}

# ── Helpers ──────────────────────────────────────────────────

make_public() {
  echo "Setting repo to public..."
  gh api "repos/$REPO" -X PATCH -f visibility=public --silent
}

make_private() {
  echo "Setting repo back to private..."
  gh api "repos/$REPO" -X PATCH -f visibility=private --silent
}

# Always restore private visibility, even on failure
trap make_private EXIT

deploy_env() {
  local env="$1"
  local branch
  branch="$(get_branch "$env")"
  local project
  project="$(get_project "$env")"

  if [ -z "$branch" ] || [ -z "$project" ]; then
    echo "ERROR: Unknown environment '$env'. Use: dev, staging, live, or all"
    exit 1
  fi

  echo ""
  echo "=== Deploying $env ($branch -> $project) ==="

  # Get the repo root (script may be called from anywhere)
  local repo_root
  repo_root="$(cd "$(dirname "$0")/../.." && pwd)"

  cd "$repo_root"

  # Link to the correct Vercel project
  rm -rf .vercel
  npx vercel link --yes --project "$project" 2>&1 | tail -1

  # Deploy production from the correct branch
  echo "Deploying..."
  npx vercel deploy --prod --yes 2>&1 | tail -5

  echo "Done: $env deployed"
}

# ── Main ─────────────────────────────────────────────────────

if [ $# -eq 0 ]; then
  echo "Usage: ./scripts/devops/deploy.sh [dev|staging|live|all]"
  exit 1
fi

TARGET="$1"

# Check prerequisites
if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: GitHub CLI (gh) is required. Install: brew install gh"
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "ERROR: npx is required. Install Node.js 20+"
  exit 1
fi

echo "Starting deploy for: $TARGET"
make_public

if [ "$TARGET" = "all" ]; then
  deploy_env "dev"
  deploy_env "staging"
  deploy_env "live"
else
  deploy_env "$TARGET"
fi

echo ""
echo "All deployments complete."
# trap will restore private visibility
