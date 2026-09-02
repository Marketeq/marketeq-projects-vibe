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

# Prefer Homebrew's supported Node line for this project when present.
if [ -d "/opt/homebrew/opt/node@24/bin" ]; then
  export PATH="/opt/homebrew/opt/node@24/bin:$PATH"
fi

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

# ── Port lookup (mirrors ecosystem.config.js) ────────────────────
# Returns the port for a given service name; empty string if unknown.
svc_port() {
  case "$1" in
    api-gateway)         echo 4000 ;;
    auth-service)        echo 3001 ;;
    user-service)        echo 3002 ;;
    listings-service)    echo 3004 ;;
    messaging-service)   echo 3005 ;;
    notification-service) echo 3006 ;;
    checkout-service)    echo 3009 ;;
    contracts-service)   echo 3010 ;;
    favorites-service)   echo 3012 ;;
    invitations-service) echo 3013 ;;
    autocomplete-service) echo 3016 ;;
    time-tracking-service) echo 3017 ;;
    category-service)    echo 3023 ;;
    scheduling-service)  echo 3024 ;;
    portfolio-service)   echo 3025 ;;
    *)                   echo "" ;;
  esac
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
      local port
      port="$(svc_port "$svc")"
      if [ -n "$port" ]; then
        cmds+=("PORT=$port npx nest start $svc --watch")
      else
        cmds+=("npx nest start $svc --watch")
      fi
      names+=("$svc")
    fi
  done

  local name_str=$(IFS=,; echo "${names[*]}")

  echo -e "${GREEN}Starting: ${name_str}${NC}"
  npx concurrently --names "$name_str" --prefix-colors "auto" --kill-others-on-fail "${cmds[@]}"
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
  local backend_cmds=()
  local names="frontend"
  for svc in "${CORE_SERVICES[@]}"; do
    if [ -d "$BACKEND_DIR/apps/$svc" ]; then
      local port
      port="$(svc_port "$svc")"
      if [ -n "$port" ]; then
        backend_cmds+=("cd $BACKEND_DIR && PORT=$port npx nest start $svc --watch")
      else
        backend_cmds+=("cd $BACKEND_DIR && npx nest start $svc --watch")
      fi
      names="$names,$svc"
    fi
  done

  npx concurrently --names "$names" --prefix-colors "auto" --kill-others-on-fail \
    "cd $FRONTEND_DIR && npm run dev" \
    "${backend_cmds[@]}"
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
