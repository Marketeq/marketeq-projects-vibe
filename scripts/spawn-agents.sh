#!/usr/bin/env bash

# spawn-agents.sh
# Spawns multiple Claude backend-builder agents in parallel, one per microservice.
# Each agent gets its own git worktree and branch to avoid file conflicts.
# Concurrency is capped to avoid burning tokens before any code is written.

set -e

REPO_DIR="/Users/christorres/vibecoding/marketeq-projects-vibe"
AGENTS_DIR="/Users/christorres/vibecoding/agents"
LOG_DIR="/Users/christorres/vibecoding/logs"
MEM="$REPO_DIR/.claude/memory"

MAX_CONCURRENT=1

# Services that are unblocked and ready to implement
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
if [ $# -gt 0 ]; then
  SERVICES=("$@")
fi

# Map each service to its specific docs folder
get_docs_folder() {
  case "$1" in
    autocomplete-service)        echo "Autocomplete" ;;
    suggestions-service)         echo "Suggestions Service" ;;
    favorites-service)           echo "Favorites Service" ;;
    portfolio-service)           echo "Portfolio Service" ;;
    invitations-service)         echo "Invite Service" ;;
    content-moderation-service)  echo "Content Moderation Service" ;;
    search-service)              echo "Search Service" ;;
    algolia-service)             echo "Search Service" ;;
    transaction-service)         echo "Checkout Service" ;;
    api-gateway)                 echo "Microservices Architecture" ;;
    *)                           echo "" ;;
  esac
}

mkdir -p "$AGENTS_DIR"
mkdir -p "$LOG_DIR"

echo "======================================"
echo "  Marketeq Backend Agent Spawner"
echo "======================================"
echo "Spawning ${#SERVICES[@]} agent(s) (max $MAX_CONCURRENT at a time)..."
echo ""

PIDS=()
ACTIVE=()

wait_for_slot() {
  while true; do
    ACTIVE=()
    for PID in "${PIDS[@]}"; do
      if kill -0 "$PID" 2>/dev/null; then
        ACTIVE+=("$PID")
      fi
    done
    if [ "${#ACTIVE[@]}" -lt "$MAX_CONCURRENT" ]; then
      break
    fi
    echo "   [concurrency limit: ${#ACTIVE[@]}/${MAX_CONCURRENT} running, waiting...]"
    sleep 10
  done
}

for SERVICE in "${SERVICES[@]}"; do
  WORKTREE_DIR="$AGENTS_DIR/$SERVICE"
  BRANCH="agent/$SERVICE"
  LOG_FILE="$LOG_DIR/$SERVICE.log"
  DOCS_FOLDER="$(get_docs_folder "$SERVICE")"
  DOCS_PATH="$REPO_DIR/docs/md/$DOCS_FOLDER"
  BACKEND_PATH="$WORKTREE_DIR/backend/apps/$SERVICE/src"
  FRONTEND_GLOB="$WORKTREE_DIR/frontend/src/**/*${SERVICE//-service/}*"

  echo "-> Spawning agent for: $SERVICE"

  # Create worktree if it doesn't exist
  if [ ! -d "$WORKTREE_DIR" ]; then
    cd "$REPO_DIR"
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

  PROMPT="Implement the $SERVICE NestJS microservice.

Docs: $DOCS_PATH/
Code: $BACKEND_PATH/
Memory: $MEM/services/$SERVICE.md

Standards: TypeScript strict, class-validator DTOs, NestJS guards, TypeORM (own schema only), RabbitMQ for inter-service, throw NestJS exceptions, no stubs.

1. Read docs and memory file (if exists)
2. Write all files (module, controller, service, DTOs, entities)
3. Update $MEM/services/$SERVICE.md with endpoints, entities, decisions
4. Update $MEM/progress.md - mark $SERVICE as Completed
5. git add -A && git commit -m 'feat($SERVICE): implement service' && git push origin $BRANCH

Work only in: $WORKTREE_DIR. Do not touch other services or shared memory files."

  # Wait for a concurrency slot
  wait_for_slot

  # Launch agent
  cd "$WORKTREE_DIR"
  claude --dangerously-skip-permissions -p "$PROMPT" > "$LOG_FILE" 2>&1 &
  PIDS+=($!)
  echo "   Agent PID: $! | Log: $LOG_FILE"
  echo ""

  sleep 1
done

echo "======================================"
echo "All ${#SERVICES[@]} agents queued (max $MAX_CONCURRENT concurrent)."
echo ""
echo "Monitor a log:  tail -f $LOG_DIR/<service>.log"
echo "Watch all:      tail -f $LOG_DIR/*.log"
echo "Stop all:       kill \$(cat $LOG_DIR/.agent-pids)"
echo "======================================"

echo "${PIDS[*]}" > "$LOG_DIR/.agent-pids"
echo "PIDs saved to $LOG_DIR/.agent-pids"
