#!/bin/bash
# Start legal-service at port 3032 alongside the full PM2 stack.
#
# Prerequisites (run these first):
#   1. cd backend && npm run dev      ← starts api-gateway (4000) + auth + user-service etc.
#   2. cd frontend && npm run dev     ← Next.js on port 3000
#
# Then run this script:
#   cd backend && ./start-legal-fullstack.sh
#
# Frontend must point to api-gateway:
#   NEXT_PUBLIC_API_URL=http://localhost:4000 in frontend/.env.local
#
# Log in at http://localhost:3000 to get a real JWT, then test:
#   http://localhost:3000/job-details/legal-service-nda

cd "$(dirname "$0")"

# Load JWT_SECRET and other vars from backend .env so it matches auth-service
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Kill any existing legal-service on port 3032
lsof -ti:3032 | xargs kill -9 2>/dev/null
sleep 1

echo "Starting legal-service on port 3032 (full-stack mode)..."
USER_SERVICE_URL=http://localhost:3002 \
DATABASE_URL="postgres://postgres:VVLjT29C33ZrP4vzhzmBEGEit3529MAa@72.61.77.231:5433/postgres" \
NODE_ENV=production PORT=3032 \
INTERNAL_API_SECRET=test-internal-secret ADMIN_API_TOKEN=test-admin-token \
RABBITMQ_URL=amqp://guest:guest@localhost:5672 \
CLOUDFLARE_R2_BUCKET=marketeq-legal \
CLOUDFLARE_R2_ENDPOINT=https://94ccb1ac46d66f225f369bd07f044f56.r2.cloudflarestorage.com \
CLOUDFLARE_R2_ACCESS_KEY_ID=f6d8470fcae48a2fe2820668c0e48514 \
CLOUDFLARE_R2_SECRET_ACCESS_KEY=2d24cd3d3a08c379d318bfe4146ba830259a7d536566a81d77ce56d42f641483 \
R2_PRESIGN_TTL_SECONDS=3600 NAME_MATCH_EXACT_THRESHOLD=0.85 \
NAME_MATCH_VARIATION_THRESHOLD=0.80 NDA_TEMPLATE_VERSION=1.0 \
FE_ORIGIN=http://localhost:3000 \
node dist/apps/legal-service/main.js &

sleep 5

echo ""
if curl -s http://localhost:3032/health | grep -q "ok"; then
  echo "✅ legal-service running on http://localhost:3032"
else
  echo "❌ legal-service failed to start — check dist/ is built: npx nest build legal-service"
fi

if curl -s http://localhost:4000/health | grep -q "ok"; then
  echo "✅ api-gateway running on http://localhost:4000"
else
  echo "⚠️  api-gateway not detected on port 4000 — run: cd backend && npm run dev"
fi

if curl -s http://localhost:3002/health 2>/dev/null | grep -q "ok"; then
  echo "✅ user-service running on http://localhost:3002"
else
  echo "⚠️  user-service not detected — run: cd backend && npm run dev"
fi

echo ""
echo "Ready! Log in at http://localhost:3000 then test:"
echo "  http://localhost:3000/job-details/legal-service-nda"
