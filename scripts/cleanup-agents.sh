#!/bin/bash

# cleanup-agents.sh
# Removes agent worktrees and branches after they've been merged.

REPO_DIR="/Users/christorres/vibecoding/marketeq-projects-vibe"
AGENTS_DIR="/Users/christorres/vibecoding/agents"

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
echo "  Marketeq Agent Cleanup"
echo "======================================"

cd "$REPO_DIR"

for SERVICE in "${SERVICES[@]}"; do
  BRANCH="agent/$SERVICE"
  WORKTREE_DIR="$AGENTS_DIR/$SERVICE"

  echo "-> Cleaning up $SERVICE..."

  # Remove worktree
  if [ -d "$WORKTREE_DIR" ]; then
    git worktree remove "$WORKTREE_DIR" --force 2>/dev/null && \
      echo "   Worktree removed." || echo "   Could not remove worktree."
  fi

  # Delete branch
  if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    git branch -d "$BRANCH" 2>/dev/null || git branch -D "$BRANCH" && \
      echo "   Branch deleted."
  fi
done

echo ""
echo "Cleanup complete."
echo "======================================"
