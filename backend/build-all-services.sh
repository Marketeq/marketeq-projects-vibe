#!/bin/sh
# build-all-services.sh — Auto-discovers and builds all NestJS services.
#
# Finds every apps/*/src/main.ts, extracts the service name, and runs
# `npx nest build <name>` one at a time with a capped Node heap to stay
# within Render Starter plan memory limits (512 MB).

set -e

# Cap TypeScript compiler heap to 384 MB so the Docker builder never OOMs.
export NODE_OPTIONS="--max-old-space-size=384"

echo "[build] Discovering services in apps/..."

for main in apps/*/src/main.ts; do
  svc=$(echo "$main" | cut -d'/' -f2)
  echo "[build] Building: $svc"
  npx nest build "$svc"
done

echo "[build] All services built successfully."
