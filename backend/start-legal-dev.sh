#!/bin/bash
# Start all legal-service dev dependencies with one command.
# Run from: cd backend && ./start-legal-dev.sh
# Then refresh http://localhost:3000/job-details/legal-service-nda

cd "$(dirname "$0")"

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
DATABASE_URL="postgres://postgres:VVLjT29C33ZrP4vzhzmBEGEit3529MAa@72.61.77.231:5433/postgres" \
NODE_ENV=production PORT=3015 JWT_SECRET=local_dev_secret \
INTERNAL_API_SECRET=test-internal-secret ADMIN_API_TOKEN=test-admin-token \
RABBITMQ_URL=amqp://guest:guest@localhost:5672 \
CLOUDFLARE_R2_BUCKET=marketeq-legal \
CLOUDFLARE_R2_ENDPOINT=https://94ccb1ac46d66f225f369bd07f044f56.r2.cloudflarestorage.com \
CLOUDFLARE_R2_ACCESS_KEY_ID=f6d8470fcae48a2fe2820668c0e48514 \
CLOUDFLARE_R2_SECRET_ACCESS_KEY=2d24cd3d3a08c379d318bfe4146ba830259a7d536566a81d77ce56d42f641483 \
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
