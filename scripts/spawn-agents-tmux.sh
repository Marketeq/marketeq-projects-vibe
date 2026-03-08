#!/usr/bin/env bash

# spawn-agents-tmux.sh
# Opens a tmux session with one window per agent.
# Each agent reads the markdown docs and builds the FULL service implementation.
# Session survives terminal close — reattach with: tmux attach -t marketeq

set -e

REPO_DIR="/Users/christorres/vibecoding/marketeq-projects-vibe"
AGENTS_DIR="/Users/christorres/vibecoding/agents"
DOCS_DIR="$REPO_DIR/docs/md"
SESSION="marketeq"

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

if [ $# -gt 0 ]; then
  SERVICES=("$@")
fi

if ! command -v tmux &>/dev/null; then
  echo "tmux not found. Install: brew install tmux"
  exit 1
fi

mkdir -p "$AGENTS_DIR"

# Kill existing session
tmux kill-session -t "$SESSION" 2>/dev/null || true

echo "======================================"
echo "  Marketeq Agent Spawner (tmux)"
echo "======================================"
echo "Spawning ${#SERVICES[@]} agent(s) in tmux session: $SESSION"
echo ""

# Map service name to docs folder
get_docs_folder() {
  case "$1" in
    autocomplete-service)       echo "Autocomplete" ;;
    suggestions-service)        echo "Suggestions Service" ;;
    favorites-service)          echo "Favorites Service" ;;
    portfolio-service)          echo "Portfolio Service" ;;
    invitations-service)        echo "Invite Service" ;;
    content-moderation-service) echo "Content Moderation Service" ;;
    search-service)             echo "Search Service" ;;
    algolia-service)            echo "Search Service" ;;
    transaction-service)        echo "Transaction Service" ;;
    api-gateway)                echo "Microservices Architecture" ;;
    billing-service)            echo "Billing Service" ;;
    contracts-service)          echo "Contracts Service" ;;
    earnings-service)           echo "Earnings Service" ;;
    payout-service)             echo "Payout Service" ;;
    time-tracking-service)      echo "Time Tracking Service" ;;
    admin-service)              echo "User Service" ;;
    affiliate-referral-service) echo "User Service" ;;
    *)                          echo "$1" ;;
  esac
}

# Create tmux session
tmux new-session -d -s "$SESSION" -n "${SERVICES[0]}"

for i in "${!SERVICES[@]}"; do
  SERVICE="${SERVICES[$i]}"
  WORKTREE_DIR="$AGENTS_DIR/$SERVICE"
  BRANCH="agent/$SERVICE"
  DOCS_FOLDER="$(get_docs_folder "$SERVICE")"
  SERVICE_DOCS="$DOCS_DIR/$DOCS_FOLDER"

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

  PROMPT="You are a senior NestJS backend engineer. Your ONLY job is to fully implement the $SERVICE microservice for the Marketeq platform.

## CRITICAL RULES
- Build the COMPLETE, PRODUCTION-READY implementation — not scaffolding, not stubs, not TODOs
- Every method must have real logic, real database queries, real error handling
- Follow the architecture exactly as described in the docs
- Use TypeORM for database, class-validator for DTOs, NestJS guards for auth
- Every endpoint must be fully wired: DTO → Controller → Service → Repository → Response

## STEP 1: Read the memory files
Read these files FIRST before doing anything else:
- $REPO_DIR/.claude/memory/architecture.md
- $REPO_DIR/.claude/memory/global.md
- $REPO_DIR/.claude/memory/services/$SERVICE.md (if exists)

## STEP 2: Read ALL documentation for this service
Read every markdown file in: $SERVICE_DOCS/
These docs define exactly what to build. Read them all before writing any code.

## STEP 3: Understand the existing scaffolding
Read all existing files in: $WORKTREE_DIR/backend/apps/$SERVICE/src/
Understand what folders and files already exist so you build on top, not from scratch.

## STEP 4: Build the FULL implementation
For each feature described in the docs, implement:

1. ENTITIES — TypeORM entity classes with all columns, relations, indexes
2. DTOs — Input/output DTOs with class-validator decorators for every endpoint
3. SERVICE — Full business logic: create, read, update, delete, search, and all domain-specific operations
4. CONTROLLER — HTTP endpoints with proper decorators (@Get, @Post, @Put, @Delete, @Patch), guards, pipes
5. MODULE — Wire everything together with TypeOrmModule.forFeature, providers, imports, exports
6. INTERFACES/TYPES — Any shared types needed

Do NOT leave any method body empty. Do NOT write 'TODO'. Do NOT stub anything.
Every method must work end-to-end.

## STEP 5: Wire up integrations
Based on what the docs say, also implement:
- RabbitMQ event emitting/listening if the service publishes or consumes events
- External API integrations (Stripe, Algolia, Ably, SendGrid) if required by this service
- Proper error handling with NestJS exceptions (NotFoundException, BadRequestException, etc.)

## STEP 6: Update memory
After completing implementation:
- Write a summary to: $REPO_DIR/.claude/memory/services/$SERVICE.md
  Include: entities built, endpoints implemented, events emitted/consumed, any gotchas
- Update $REPO_DIR/.claude/memory/progress.md — move $SERVICE from 'In Progress' to 'Completed'

## STEP 7: Commit
Commit all your changes with:
  git add -A
  git commit -m 'feat($SERVICE): implement full service from docs'

Work directory: $WORKTREE_DIR
Service source: $WORKTREE_DIR/backend/apps/$SERVICE/src/

BEGIN NOW. Read the docs, then build the full implementation."

  # Create tmux window
  if [ $i -eq 0 ]; then
    tmux rename-window -t "$SESSION:0" "$SERVICE"
  else
    tmux new-window -t "$SESSION" -n "$SERVICE"
  fi

  # Write a launcher script per agent to avoid quoting issues
  LAUNCHER="/tmp/agent-launch-$SERVICE.sh"
  cat > "$LAUNCHER" <<LAUNCHEREOF
#!/bin/bash
cd "$WORKTREE_DIR"
unset CLAUDECODE
claude --dangerously-skip-permissions -p "$PROMPT"
LAUNCHEREOF
  chmod +x "$LAUNCHER"
  tmux send-keys -t "$SESSION:$SERVICE" "bash $LAUNCHER" Enter

  sleep 0.5
done

echo ""
echo "======================================"
echo "All ${#SERVICES[@]} agents launched in tmux session: $SESSION"
echo ""
echo "  tmux attach -t $SESSION       (attach)"
echo "  Ctrl+B then 0-9               (switch windows)"
echo "  Ctrl+B then w                 (window list)"
echo "  Ctrl+B then d                 (detach — agents keep running)"
echo "  tmux kill-session -t $SESSION (stop all)"
echo "======================================"

tmux attach -t "$SESSION"
