#!/bin/bash
# Start all legal-service dev dependencies with one command.
# Run from: cd backend && ./start-legal-dev.sh
# Then refresh http://localhost:3000/job-details/legal-service-nda

cd "$(dirname "$0")"

# Requires DATABASE_URL, CLOUDFLARE_R2_ACCESS_KEY_ID, CLOUDFLARE_R2_SECRET_ACCESS_KEY
# to be set in your shell env (see backend/.env.local.example) -- not hardcoded here.
for var in DATABASE_URL CLOUDFLARE_R2_ACCESS_KEY_ID CLOUDFLARE_R2_SECRET_ACCESS_KEY; do
  if [ -z "${!var}" ]; then
    echo "ERROR: $var is not set. Export it before running this script." >&2
    exit 1
  fi
done

# Kill existing instances
lsof -ti:3015 | xargs kill -9 2>/dev/null
lsof -ti:3002 | xargs kill -9 2>/dev/null
sleep 1

# Start mock user-service (returns Priya Bharathi for dev user ID)
echo "Starting mock user-service on port 3002..."
node mock-user-service.js &
sleep 1

# Start legal service
echo "Starting legal-service on port 3015..."
USER_SERVICE_URL=http://localhost:3002 \
DATABASE_URL="$DATABASE_URL" \
NODE_ENV=production PORT=3015 JWT_SECRET=local_dev_secret \
INTERNAL_API_SECRET=test-internal-secret ADMIN_API_TOKEN=test-admin-token \
RABBITMQ_URL=amqp://guest:guest@localhost:5672 \
CLOUDFLARE_R2_BUCKET=marketeq-legal \
CLOUDFLARE_R2_ENDPOINT=https://94ccb1ac46d66f225f369bd07f044f56.r2.cloudflarestorage.com \
CLOUDFLARE_R2_ACCESS_KEY_ID="$CLOUDFLARE_R2_ACCESS_KEY_ID" \
CLOUDFLARE_R2_SECRET_ACCESS_KEY="$CLOUDFLARE_R2_SECRET_ACCESS_KEY" \
R2_PRESIGN_TTL_SECONDS=3600 NAME_MATCH_EXACT_THRESHOLD=1.0 \
NAME_MATCH_VARIATION_THRESHOLD=0.85 NDA_TEMPLATE_VERSION=1.0 \
FE_ORIGIN=http://localhost:3000 \
node dist/apps/legal-service/main.js &

sleep 5

# Verify both are running
echo ""
if curl -s http://localhost:3015/health | grep -q "ok"; then
  echo "✅ legal-service running on http://localhost:3015"
else
  echo "❌ legal-service failed to start"
fi

if curl -s http://localhost:3002/internal/users/11111111-1111-4111-a111-111111111111 | grep -q "Priya"; then
  echo "✅ mock user-service running on http://localhost:3002 → returns Priya Bharathi"
else
  echo "❌ mock user-service failed to start"
fi

echo ""
echo "Ready! Refresh: http://localhost:3000/job-details/legal-service-nda"
echo "Sign with full name: Priya Bharathi (auth auto-resolves via /user/me mock)"
