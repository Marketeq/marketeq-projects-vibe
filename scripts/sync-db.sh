#!/usr/bin/env bash
# Sync database between Marketeq environments
# Usage: ./scripts/sync-db.sh <source> <target>
# Examples:
#   ./scripts/sync-db.sh dev staging    # copy dev → staging
#   ./scripts/sync-db.sh staging live   # copy staging → production
#   ./scripts/sync-db.sh live dev       # refresh dev from production

set -euo pipefail

VPS_HOST="72.61.77.231"

# Environment → port and password mapping
get_port() {
  case "$1" in
    dev)     echo 5433 ;;
    staging) echo 5434 ;;
    live)    echo 5432 ;;
    *)       echo "Unknown environment: $1" >&2; exit 1 ;;
  esac
}

get_password() {
  case "$1" in
    dev)     echo "VVLjT29C33ZrP4vzhzmBEGEit3529MAa" ;;
    staging) echo "7N7LuWWQSreTOad5wTEpZWKLvftr6OMJ" ;;
    live)    echo "KrRZvLQbtItvyKMw9m3TJ2pLAjuJuAf3cKHQykgaEMw" ;;
    *)       echo "Unknown environment: $1" >&2; exit 1 ;;
  esac
}

# Find pg_dump and psql
PGBIN=""
if command -v pg_dump &>/dev/null; then
  PGBIN=""
elif [ -f /opt/homebrew/opt/postgresql@17/bin/pg_dump ]; then
  PGBIN="/opt/homebrew/opt/postgresql@17/bin/"
elif [ -f /usr/local/opt/postgresql@17/bin/pg_dump ]; then
  PGBIN="/usr/local/opt/postgresql@17/bin/"
else
  echo "Error: pg_dump not found. Install PostgreSQL 17: brew install postgresql@17" >&2
  exit 1
fi

SOURCE="${1:-}"
TARGET="${2:-}"

if [ -z "$SOURCE" ] || [ -z "$TARGET" ]; then
  echo "Usage: $0 <source> <target>"
  echo "Environments: dev, staging, live"
  exit 1
fi

if [ "$SOURCE" = "$TARGET" ]; then
  echo "Error: source and target must be different"
  exit 1
fi

SOURCE_PORT=$(get_port "$SOURCE")
TARGET_PORT=$(get_port "$TARGET")
SOURCE_PASS=$(get_password "$SOURCE")
TARGET_PASS=$(get_password "$TARGET")

# Safety check for production target
if [ "$TARGET" = "live" ]; then
  echo ""
  echo "⚠️  WARNING: You are about to OVERWRITE the PRODUCTION database!"
  echo "  Source: $SOURCE (port $SOURCE_PORT)"
  echo "  Target: $TARGET (port $TARGET_PORT)"
  echo ""
  read -p "Type 'yes-overwrite-production' to confirm: " CONFIRM
  if [ "$CONFIRM" != "yes-overwrite-production" ]; then
    echo "Aborted."
    exit 1
  fi
fi

echo ""
echo "Syncing database: $SOURCE → $TARGET"
echo "  Source: $VPS_HOST:$SOURCE_PORT"
echo "  Target: $VPS_HOST:$TARGET_PORT"
echo ""

# Schemas to sync (add more as services are built)
SCHEMAS="user_service companies institutions"

# Step 1: Drop target schemas
echo "→ Dropping target schemas..."
for SCHEMA in $SCHEMAS; do
  PGPASSWORD="$TARGET_PASS" "${PGBIN}psql" -h "$VPS_HOST" -p "$TARGET_PORT" -U postgres -d postgres \
    -c "DROP SCHEMA IF EXISTS $SCHEMA CASCADE;" 2>/dev/null || true
done

# Step 2: Ensure uuid wrapper exists on target
echo "→ Ensuring uuid compatibility..."
PGPASSWORD="$TARGET_PASS" "${PGBIN}psql" -h "$VPS_HOST" -p "$TARGET_PORT" -U postgres -d postgres -c "
CREATE OR REPLACE FUNCTION public.uuid_generate_v4() RETURNS uuid AS \$\$
  SELECT extensions.uuid_generate_v4();
\$\$ LANGUAGE SQL;
" 2>/dev/null || true

# Step 3: Dump source and pipe into target
echo "→ Copying data..."
for SCHEMA in $SCHEMAS; do
  PGPASSWORD="$SOURCE_PASS" "${PGBIN}pg_dump" -h "$VPS_HOST" -p "$SOURCE_PORT" -U postgres -d postgres \
    --no-owner --no-acl --schema="$SCHEMA" 2>/dev/null \
    | sed '/transaction_timeout/d; /\\restrict/d; /\\unrestrict/d' \
    | PGPASSWORD="$TARGET_PASS" "${PGBIN}psql" -h "$VPS_HOST" -p "$TARGET_PORT" -U postgres -d postgres \
    2>/dev/null
  echo "  ✓ $SCHEMA"
done

# Step 4: Verify
echo ""
echo "→ Verifying..."
USER_COUNT=$(PGPASSWORD="$TARGET_PASS" "${PGBIN}psql" -h "$VPS_HOST" -p "$TARGET_PORT" -U postgres -d postgres \
  -t -c "SELECT count(*) FROM user_service.users;" 2>/dev/null | tr -d ' ')
echo "  Users in $TARGET: $USER_COUNT"

echo ""
echo "✓ Database sync complete: $SOURCE → $TARGET"
