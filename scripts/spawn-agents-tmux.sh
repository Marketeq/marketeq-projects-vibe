#!/bin/bash

# spawn-agents-tmux.sh
# Opens a tmux session with one window per agent.
# Each agent runs with --dangerously-skip-permissions.
# Session survives terminal close — reattach with: tmux attach -t marketeq

set -e

REPO_DIR="/Users/christorres/vibecoding/marketeq-projects-vibe"
AGENTS_DIR="/Users/christorres/vibecoding/agents"
LOG_DIR="/Users/christorres/vibecoding/logs"
SESSION="marketeq"

# Services to spawn — edit to control which agents run
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

# Override with args if provided
# e.g. ./spawn-agents-tmux.sh autocomplete-service favorites-service
if [ $# -gt 0 ]; then
  SERVICES=("$@")
fi

# Check tmux is installed
if ! command -v tmux &>/dev/null; then
  echo "tmux not found. Install it with: brew install tmux"
  exit 1
fi

mkdir -p "$AGENTS_DIR"
mkdir -p "$LOG_DIR"

# Kill existing session if it exists
tmux kill-session -t "$SESSION" 2>/dev/null || true

echo "======================================"
echo "  Marketeq Agent Spawner (tmux)"
echo "======================================"
echo "Spawning ${#SERVICES[@]} agent(s) in tmux session: $SESSION"
echo ""

# Create the tmux session with the first service
FIRST_SERVICE="${SERVICES[0]}"
tmux new-session -d -s "$SESSION" -n "$FIRST_SERVICE"

for i in "${!SERVICES[@]}"; do
  SERVICE="${SERVICES[$i]}"
  WORKTREE_DIR="$AGENTS_DIR/$SERVICE"
  BRANCH="agent/$SERVICE"

  echo "-> Setting up: $SERVICE"

  # Create worktree if needed
  if [ ! -d "$WORKTREE_DIR" ]; then
    cd "$REPO_DIR"
    if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
      git worktree add "$WORKTREE_DIR" "$BRANCH" 2>/dev/null
    else
      git worktree add "$WORKTREE_DIR" -b "$BRANCH" 2>/dev/null
    fi
  fi

  # Build agent prompt
  PROMPT="You are a backend-builder agent assigned to implement the $SERVICE microservice.

Step 1: Read $REPO_DIR/.claude/memory/agents/backend-builder.md
Step 2: Read $REPO_DIR/.claude/memory/progress.md
Step 3: Claim $SERVICE in progress.md under 'In Progress'
Step 4: Read $REPO_DIR/.claude/memory/services/$SERVICE.md (if it exists)
Step 5: Read $REPO_DIR/.claude/memory/architecture.md
Step 6: Read $REPO_DIR/.claude/memory/global.md
Step 7: Find and read all relevant .docx docs in $REPO_DIR/docs/Technical\ Documentation/
Step 8: Implement $SERVICE fully in $WORKTREE_DIR/backend/apps/$SERVICE/src/
Step 9: Update $REPO_DIR/.claude/memory/services/$SERVICE.md with what you built
Step 10: Update $REPO_DIR/.claude/memory/progress.md — move $SERVICE to Completed
Step 11: Commit your changes with message: feat($SERVICE): implement service from docs

Work only in: $WORKTREE_DIR
Do not touch other services, MEMORY.md, global.md, or architecture.md."

  # Create a new window for each service (first one already exists)
  if [ $i -eq 0 ]; then
    tmux rename-window -t "$SESSION:0" "$SERVICE"
  else
    tmux new-window -t "$SESSION" -n "$SERVICE"
  fi

  # Send the claude command to the window
  tmux send-keys -t "$SESSION:$SERVICE" "cd \"$WORKTREE_DIR\" && claude --dangerously-skip-permissions -p \"$PROMPT\"" Enter

  sleep 0.5
done

echo ""
echo "======================================"
echo "All agents launched in tmux session: $SESSION"
echo ""
echo "Attach to session (see all agents):"
echo "  tmux attach -t $SESSION"
echo ""
echo "Switch between agent windows inside tmux:"
echo "  Ctrl+B then number (0-9)"
echo "  Ctrl+B then n (next window)"
echo "  Ctrl+B then p (previous window)"
echo "  Ctrl+B then w (window list)"
echo ""
echo "Detach from session (agents keep running):"
echo "  Ctrl+B then d"
echo ""
echo "Kill entire session:"
echo "  tmux kill-session -t $SESSION"
echo ""
echo "Reattach after closing terminal:"
echo "  tmux attach -t $SESSION"
echo "======================================"

# Auto-attach to the session
tmux attach -t "$SESSION"
