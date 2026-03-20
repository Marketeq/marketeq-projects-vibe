#!/bin/bash
# Start the full Marketeq stack locally
# Usage: ./start-local.sh [--backend-only] [--frontend-only]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# ── Ensure local infrastructure ──────────────────────────────────
ensure_infra() {
  echo -e "${YELLOW}Checking local infrastructure...${NC}"

  # PostgreSQL
  if ! brew services list | grep -q "postgresql.*started"; then
    echo -e "${YELLOW}Starting PostgreSQL...${NC}"
    brew services start postgresql@17
    sleep 2
  fi
  echo -e "${GREEN}✓ PostgreSQL running${NC}"

  # RabbitMQ
  if ! brew services list | grep -q "rabbitmq.*started"; then
    echo -e "${YELLOW}Starting RabbitMQ...${NC}"
    brew services start rabbitmq
    sleep 2
  fi
  echo -e "${GREEN}✓ RabbitMQ running${NC}"

  # Ensure database exists
  export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
  if ! psql -U "$(whoami)" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='marketeq'" | grep -q 1; then
    echo -e "${YELLOW}Creating marketeq database...${NC}"
    psql -U "$(whoami)" -d postgres -c "CREATE ROLE marketeq WITH LOGIN PASSWORD 'marketeq' CREATEDB;" 2>/dev/null || true
    psql -U "$(whoami)" -d postgres -c "CREATE DATABASE marketeq OWNER marketeq;" 2>/dev/null || true
    psql -U "$(whoami)" -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE marketeq TO marketeq;"
  fi
  echo -e "${GREEN}✓ Database 'marketeq' ready${NC}"
}

# ── Install dependencies if needed ───────────────────────────────
ensure_deps() {
  if [ ! -d "$BACKEND_DIR/node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    cd "$BACKEND_DIR" && npm install
  fi
  if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd "$FRONTEND_DIR" && npm install
  fi
}

# ── Core services (required for the app to work) ─────────────────
CORE_SERVICES=(
  api-gateway
  auth-service
  user-service
  listings-service
)

# ── Optional services (start if you need them) ───────────────────
OPTIONAL_SERVICES=(
  favorites-service
  invitations-service
  notification-service
  messaging-service
  contracts-service
  portfolio-service
  checkout-service
)

start_backend() {
  echo -e "${YELLOW}Starting backend services...${NC}"
  cd "$BACKEND_DIR"

  # Determine which services to start
  local services=("${CORE_SERVICES[@]}")
  if [ "$1" = "--all" ]; then
    services=("${CORE_SERVICES[@]}" "${OPTIONAL_SERVICES[@]}")
  fi

  # Build the concurrently command
  local cmds=()
  local names=()
  for svc in "${services[@]}"; do
    if [ -d "apps/$svc" ]; then
      cmds+=("npx nest start $svc --watch")
      names+=("$svc")
    fi
  done

  local name_str=$(IFS=,; echo "${names[*]}")
  local cmd_str=""
  for cmd in "${cmds[@]}"; do
    if [ -n "$cmd_str" ]; then
      cmd_str="$cmd_str \"$cmd\""
    else
      cmd_str="\"$cmd\""
    fi
  done

  echo -e "${GREEN}Starting: ${name_str}${NC}"
  npx concurrently --names "$name_str" --prefix-colors "auto" --kill-others-on-fail $cmd_str
}

start_frontend() {
  echo -e "${YELLOW}Starting frontend...${NC}"
  cd "$FRONTEND_DIR"
  npm run dev
}

start_all() {
  echo -e "${YELLOW}Starting full stack...${NC}"
  cd "$ROOT_DIR"

  # Build concurrently commands for core backend + frontend
  local backend_cmds=""
  local names="frontend"
  for svc in "${CORE_SERVICES[@]}"; do
    if [ -d "$BACKEND_DIR/apps/$svc" ]; then
      backend_cmds="$backend_cmds \"cd $BACKEND_DIR && npx nest start $svc --watch\""
      names="$names,$svc"
    fi
  done

  npx concurrently --names "$names" --prefix-colors "auto" --kill-others-on-fail \
    "cd $FRONTEND_DIR && npm run dev" \
    $backend_cmds
}

# ── Main ─────────────────────────────────────────────────────────
ensure_infra
ensure_deps

case "${1:-}" in
  --backend-only|--backend)
    start_backend "${2:-}"
    ;;
  --frontend-only|--frontend)
    start_frontend
    ;;
  --all-services)
    start_backend --all
    ;;
  *)
    start_all
    ;;
esac
