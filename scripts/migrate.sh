#!/usr/bin/env bash
#
# Run TypeORM migrations for a specific service or all services.
#
# Usage:
#   ./scripts/migrate.sh <service> [run|generate|revert|show]
#   ./scripts/migrate.sh all [run|revert|show]
#
# Examples:
#   ./scripts/migrate.sh user-service run
#   ./scripts/migrate.sh user-service generate AddEmailIndex
#   ./scripts/migrate.sh user-service revert
#   ./scripts/migrate.sh user-service show
#   ./scripts/migrate.sh all run
#   ./scripts/migrate.sh all show

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/../backend" && pwd)"

# Map of service name -> data-source file (relative to backend/)
declare -A DATASOURCE_MAP=(
  ["auth-service"]="apps/auth-service/src/data-source.ts"
  ["user-service"]="apps/user-service/typeorm.config.ts"
  ["time-tracking-service"]="apps/time-tracking-service/typeorm.config.ts"
  ["portfolio-service"]="apps/portfolio-service/ormconfig.ts"
  ["contracts-service"]="apps/contracts-service/src/data-source.ts"
  ["notification-service"]="apps/notification-service/src/data-source.ts"
  ["messaging-service"]="apps/messaging-service/src/data-source.ts"
  ["checkout-service"]="apps/checkout-service/src/data-source.ts"
  ["listings-service"]="apps/listings-service/src/data-source.ts"
  ["favorites-service"]="apps/favorites-service/src/data-source.ts"
  ["suggestions-service"]="apps/suggestions-service/src/data-source.ts"
  ["autocomplete-service"]="apps/autocomplete-service/src/data-source.ts"
  ["transaction-service"]="apps/transaction-service/src/data-source.ts"
  ["content-moderation-service"]="apps/content-moderation-service/src/data-source.ts"
  ["invitations-service"]="apps/invitations-service/src/data-source.ts"
  ["billing-service"]="apps/billing-service/src/data-source.ts"
)

usage() {
  echo "Usage: $0 <service|all> <run|generate|revert|show> [migration-name]"
  echo ""
  echo "Commands:"
  echo "  run       Run all pending migrations"
  echo "  generate  Generate a new migration (requires migration-name argument)"
  echo "  revert    Revert the last executed migration"
  echo "  show      Show all migrations and their status"
  echo ""
  echo "Available services:"
  for svc in "${!DATASOURCE_MAP[@]}"; do
    echo "  $svc"
  done | sort
  echo "  all  (run/revert/show only)"
  exit 1
}

run_migration_cmd() {
  local service="$1"
  local command="$2"
  local extra="${3:-}"

  local datasource="${DATASOURCE_MAP[$service]:-}"
  if [[ -z "$datasource" ]]; then
    echo "ERROR: Unknown service '$service'. No data-source configured."
    echo "Add it to DATASOURCE_MAP in this script."
    return 1
  fi

  local ds_path="$BACKEND_DIR/$datasource"
  if [[ ! -f "$ds_path" ]]; then
    echo "ERROR: Data source file not found: $ds_path"
    return 1
  fi

  echo "=== [$service] migration:$command ==="

  cd "$BACKEND_DIR"

  case "$command" in
    run)
      npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:run -d "$datasource"
      ;;
    generate)
      if [[ -z "$extra" ]]; then
        echo "ERROR: 'generate' requires a migration name."
        echo "Usage: $0 $service generate <MigrationName>"
        return 1
      fi
      local migrations_dir
      migrations_dir="$(dirname "$datasource")/migrations"
      npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:generate "$migrations_dir/$extra" -d "$datasource"
      ;;
    revert)
      npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:revert -d "$datasource"
      ;;
    show)
      npx ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js migration:show -d "$datasource"
      ;;
    *)
      echo "ERROR: Unknown command '$command'"
      usage
      ;;
  esac
}

# --- Main ---

if [[ $# -lt 2 ]]; then
  usage
fi

SERVICE="$1"
COMMAND="$2"
EXTRA="${3:-}"

if [[ "$SERVICE" == "all" ]]; then
  if [[ "$COMMAND" == "generate" ]]; then
    echo "ERROR: 'generate' is not supported with 'all'. Run it per-service."
    exit 1
  fi

  FAILED=0
  for svc in $(echo "${!DATASOURCE_MAP[@]}" | tr ' ' '\n' | sort); do
    if ! run_migration_cmd "$svc" "$COMMAND" "$EXTRA"; then
      echo "WARN: migration:$COMMAND failed for $svc"
      FAILED=$((FAILED + 1))
    fi
    echo ""
  done

  if [[ $FAILED -gt 0 ]]; then
    echo "Completed with $FAILED failure(s)."
    exit 1
  fi
  echo "All migrations completed successfully."
else
  run_migration_cmd "$SERVICE" "$COMMAND" "$EXTRA"
fi
