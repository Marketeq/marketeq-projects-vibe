#!/bin/sh
# build-all-services.sh — Auto-discovers and builds all NestJS services.
#
# Finds every apps/*/src/main.ts, extracts the service name, and runs
# `npx nest build <name>`. Builds in batches of 4 to limit memory pressure.
#
# This replaces hardcoded service lists in Dockerfile.all so new services
# are automatically included in the Docker image without manual edits.

set -e

BATCH_SIZE=4
count=0
batch=""

echo "[build] Discovering services in apps/..."

for main in apps/*/src/main.ts; do
  # Extract service name: apps/<name>/src/main.ts -> <name>
  svc=$(echo "$main" | cut -d'/' -f2)

  # Skip api-gateway — it's always built but we include it in discovery
  # so the CI check doesn't flag it as missing
  echo "[build] Found: $svc"

  if [ -n "$batch" ]; then
    batch="$batch && npx nest build $svc"
  else
    batch="npx nest build $svc"
  fi
  count=$((count + 1))

  if [ "$count" -ge "$BATCH_SIZE" ]; then
    echo "[build] Building batch: $batch"
    eval "$batch"
    batch=""
    count=0
  fi
done

# Build remaining partial batch
if [ -n "$batch" ]; then
  echo "[build] Building batch: $batch"
  eval "$batch"
fi

echo "[build] All services built successfully."
