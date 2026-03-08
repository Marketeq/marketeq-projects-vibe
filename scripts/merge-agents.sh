#!/bin/bash

# merge-agents.sh
# Merges completed agent worktrees back into main.
# Run this after agents finish their work.

REPO_DIR="/Users/christorres/vibecoding/marketeq-projects-vibe"
AGENTS_DIR="/Users/christorres/vibecoding/agents"

# Services to merge — defaults to all agent branches
SERVICES=(
  "autocomplete-service"
  "suggestions-service"
  "favorites-service"
  "portfolio-service"
  "invitations-service"
  "content-moderation-service"
  "search-service"
  "algolia-service"
  "transaction-service"
  "api-gateway"
)

if [ $# -gt 0 ]; then
  SERVICES=("$@")
fi

echo "======================================"
echo "  Marketeq Agent Branch Merger"
echo "======================================"

cd "$REPO_DIR"

for SERVICE in "${SERVICES[@]}"; do
  BRANCH="agent/$SERVICE"
  WORKTREE_DIR="$AGENTS_DIR/$SERVICE"

  echo ""
  echo "-> Merging $BRANCH into main..."

  # Check if branch exists
  if ! git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    echo "   Branch $BRANCH not found — skipping."
    continue
  fi

  # Commit any uncommitted changes in the worktree first
  if [ -d "$WORKTREE_DIR" ]; then
    cd "$WORKTREE_DIR"
    if ! git diff --quiet || ! git diff --staged --quiet; then
      echo "   Committing uncommitted changes in worktree..."
      git add -A
      git commit -m "feat($SERVICE): finalize implementation" || true
    fi
    cd "$REPO_DIR"
  fi

  # Merge into main
  git merge "$BRANCH" --no-ff -m "merge: $SERVICE implementation from agent branch" && \
    echo "   Merged successfully." || \
    echo "   CONFLICT — resolve manually then re-run."
done

echo ""
echo "======================================"
echo "Merge complete. Review changes with: git log --oneline -20"
echo ""
echo "To clean up worktrees after merging:"
echo "  ./scripts/cleanup-agents.sh"
echo "======================================"
