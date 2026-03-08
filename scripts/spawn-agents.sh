#!/bin/bash

# spawn-agents.sh
# Spawns multiple Claude backend-builder agents in parallel, one per microservice.
# Each agent gets its own git worktree and branch to avoid file conflicts.
# Memory is shared via .claude/memory/ in the repo.

set -e

REPO_DIR="/Users/christorres/vibecoding/marketeq-projects-vibe"
AGENTS_DIR="/Users/christorres/vibecoding/agents"
LOG_DIR="/Users/christorres/vibecoding/logs"

# Services that are unblocked and ready to implement
# Edit this list to control which agents spawn
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

# Optional: pass service names as args to override the list above
# e.g. ./spawn-agents.sh autocomplete-service favorites-service
if [ $# -gt 0 ]; then
  SERVICES=("$@")
fi

mkdir -p "$AGENTS_DIR"
mkdir -p "$LOG_DIR"

echo "======================================"
echo "  Marketeq Backend Agent Spawner"
echo "======================================"
echo "Spawning ${#SERVICES[@]} agent(s)..."
echo ""

PIDS=()

for SERVICE in "${SERVICES[@]}"; do
  WORKTREE_DIR="$AGENTS_DIR/$SERVICE"
  BRANCH="agent/$SERVICE"
  LOG_FILE="$LOG_DIR/$SERVICE.log"

  echo "-> Spawning agent for: $SERVICE"

  # Create worktree if it doesn't exist
  if [ ! -d "$WORKTREE_DIR" ]; then
    cd "$REPO_DIR"
    # Create branch from main if it doesn't exist
    git fetch origin main --quiet 2>/dev/null || true
    if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
      git worktree add "$WORKTREE_DIR" "$BRANCH" 2>/dev/null
    else
      git worktree add "$WORKTREE_DIR" -b "$BRANCH" 2>/dev/null
    fi
    echo "   Worktree created at $WORKTREE_DIR"
  else
    echo "   Worktree already exists at $WORKTREE_DIR"
  fi

  # Build the agent prompt
  PROMPT="You are a backend-builder agent assigned to implement the $SERVICE microservice.

Step 1: Read /Users/christorres/vibecoding/marketeq-projects-vibe/.claude/memory/agents/backend-builder.md
Step 2: Read /Users/christorres/vibecoding/marketeq-projects-vibe/.claude/memory/progress.md
Step 3: Claim $SERVICE in progress.md by adding it to the 'In Progress' section
Step 4: Read /Users/christorres/vibecoding/marketeq-projects-vibe/.claude/memory/services/$SERVICE.md (if it exists)
Step 5: Read /Users/christorres/vibecoding/marketeq-projects-vibe/.claude/memory/architecture.md
Step 6: Read /Users/christorres/vibecoding/marketeq-projects-vibe/.claude/memory/global.md
Step 7: Find and read all relevant .docx documentation in /Users/christorres/vibecoding/marketeq-projects-vibe/docs/Technical\ Documentation/
Step 8: Implement the $SERVICE fully in $WORKTREE_DIR/backend/apps/$SERVICE/src/
Step 9: Update /Users/christorres/vibecoding/marketeq-projects-vibe/.claude/memory/services/$SERVICE.md with what you built
Step 10: Update progress.md — move $SERVICE from 'In Progress' to 'Completed'

Work only in your assigned worktree: $WORKTREE_DIR
Do not modify other services. Do not modify MEMORY.md or global.md.
When done, commit your changes in your worktree with message: 'feat($SERVICE): implement service from docs'"

  # Launch agent in background
  cd "$WORKTREE_DIR"
  claude --dangerously-skip-permissions -p "$PROMPT" > "$LOG_FILE" 2>&1 &
  PIDS+=($!)
  echo "   Agent PID: $! | Log: $LOG_FILE"
  echo ""

  # Small delay to avoid simultaneous git operations
  sleep 1
done

echo "======================================"
echo "All ${#SERVICES[@]} agents spawned."
echo ""
echo "Monitor logs:"
echo "  tail -f $LOG_DIR/<service-name>.log"
echo ""
echo "Watch all logs at once:"
echo "  tail -f $LOG_DIR/*.log"
echo ""
echo "Check agent PIDs: ${PIDS[*]}"
echo ""
echo "To stop all agents:"
echo "  kill ${PIDS[*]}"
echo "======================================"

# Save PIDs to file so you can kill them later
echo "${PIDS[*]}" > "$LOG_DIR/.agent-pids"
echo "PIDs saved to $LOG_DIR/.agent-pids"
