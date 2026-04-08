# CS-01 — Docker & Runtime Setup

**Service:** cms-service | **Powered by:** Payload CMS | **Port:** 3020

> **Purpose:** Everything needed to run cms-service locally and in production. Covers `package.json`, Dockerfile, Docker Compose wiring, all 11 environment variables, health check, hot-reload dev setup, and first-run smoke tests.
> **Prerequisites:** CS-00 Service Overview.

---

## 1. Purpose

After completing this guide, cms-service will be running locally with hot-reload, connected to Supabase PostgreSQL (`cms` schema), Cloudflare R2, and RabbitMQ, and will pass the health check smoke test.

---

## 2. package.json

**File location:** `apps/cms-service/package.json`

```json
{
  "name": "cms-service",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev":     "payload dev",
    "build":   "payload build",
    "start":   "node dist/server.js",
    "migrate": "payload migrate"
  },
  "dependencies": {
    "payload":                     "^2.0.0",
    "@payloadcms/db-postgres":     "^2.0.0",
    "@payloadcms/storage-r2":      "^2.0.0",
    "@payloadcms/plugin-seo":      "^2.0.0",
    "@payloadcms/richtext-lexical": "^2.0.0",
    "amqplib":                     "^0.10.4",
    "@nestjs/microservices":       "^10.0.0",
    "express":                     "^4.18.2",
    "dotenv":                      "^16.0.0"
  },
  "devDependencies": {
    "typescript":      "^5.0.0",
    "@types/node":     "^20.0.0",
    "@types/amqplib":  "^0.10.1"
  },
  "engines": { "node": ">=20.0.0" }
}
```

---

## 3. Dockerfile

**File location:** `apps/cms-service/Dockerfile`

Uses `node:20-alpine` to match the monorepo runtime standard. Multi-stage build keeps the production image clean.

```dockerfile
# ── Stage 1: build ──────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: production ─────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist        ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3020

# Healthcheck — Docker will mark the container unhealthy if this fails
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:3020/health || exit 1

CMD ["node", "dist/server.js"]
```

---

## 4. Docker Compose — docker-compose.override.yml

**File location:** repo root `docker-compose.override.yml`. Add the `cms-service` block inside the `services:` key.

```yaml
services:
  cms-service:
    build:
      context: ./apps/cms-service
      dockerfile: Dockerfile
    container_name: cms-service
    restart: always
    ports:
      - "3020:3020"
    environment:
      - CMS_PORT=3020
      - CMS_SERVER_URL=http://cms-service:3020
      - DATABASE_URL=${DATABASE_URL}
      - PAYLOAD_SECRET=${PAYLOAD_SECRET}
      - CMS_API_KEY=${CMS_API_KEY}
      - CATEGORY_SERVICE_URL=http://category-service:3025
      - RABBITMQ_URL=${RABBITMQ_URL}
      - CMS_SYNC_SECRET=${CMS_SYNC_SECRET}
      - R2_BUCKET=${CMS_R2_BUCKET}
      - R2_ACCESS_KEY_ID=${R2_ACCESS_KEY_ID}
      - R2_SECRET_ACCESS_KEY=${R2_SECRET_ACCESS_KEY}
      - R2_ENDPOINT=${R2_ENDPOINT}
    depends_on:
      - postgres
      - rabbitmq
    networks:
      - marketeq-network
```

---

## 5. Environment Variables — Full Reference

All 11 variables are required at startup. A missing variable causes a fatal startup error. Set these in your `.env` file (local) and in the Supabase dashboard (production).

| Variable | Example / Format | Description |
|---|---|---|
| `CMS_PORT` | `3020` | Port cms-service listens on. Must match Dockerfile `EXPOSE`. |
| `CMS_SERVER_URL` | `http://cms-service:3020` | Full URL of the cms-service container. Used by Payload internals. |
| `DATABASE_URL` | `postgres://user:pass@host/db` | Shared Supabase PostgreSQL connection string. Same across all services. |
| `PAYLOAD_SECRET` | `32+ char random string` | JWT signing secret for Payload admin panel sessions. Rotate on breach. |
| `CMS_API_KEY` | `cms-internal-key` | Read-only API key used by other microservices for internal CMS index requests. |
| `CATEGORY_SERVICE_URL` | `http://category-service:3025` | URL of category-service. Used by CategorySyncModule for cold-start push. |
| `RABBITMQ_URL` | `amqp://user:pass@rabbitmq:5672` | RabbitMQ connection string. Used by CmsEventPublisher. |
| `CMS_SYNC_SECRET` | `random secret` | Bearer token used to authenticate cms-service → category-service REST calls. |
| `R2_BUCKET` | `marketeq-cms` | Cloudflare R2 bucket name for all CMS media uploads. |
| `R2_ACCESS_KEY_ID` | `(secret)` | R2 access key ID. Found in Cloudflare R2 dashboard. |
| `R2_SECRET_ACCESS_KEY` | `(secret)` | R2 secret access key. |
| `R2_ENDPOINT` | `https://<id>.r2.cloudflarestorage.com` | R2 account endpoint. Unique per Cloudflare account. |

---

## 6. Health Endpoint

cms-service exposes a health endpoint at `GET /health`. This is configured in `server.ts` and must respond within 10 seconds of container start.

```typescript
// apps/cms-service/src/server.ts
import express from 'express';
import payload from 'payload';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Health endpoint — must be registered BEFORE payload.init()
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'cms-service' });
});

const start = async () => {
  await payload.init({
    secret: process.env.PAYLOAD_SECRET!,
    express: app,
    onInit: () => {
      payload.logger.info(`cms-service ready on port ${process.env.CMS_PORT}`);
    },
  });

  app.listen(Number(process.env.CMS_PORT) || 3020);
};

start();
```

---

## 7. Local Development — Hot Reload

Run cms-service locally with hot-reload using the `payload dev` command. All environment variables must be set in `apps/cms-service/.env` before running.

```bash
# Step 1: Navigate to the service
cd apps/cms-service

# Step 2: Install dependencies
npm install

# Step 3: Copy and fill the env file
cp .env.example .env
# Edit .env with your Supabase, R2, RabbitMQ, and Payload credentials

# Step 4: Run database migrations (first run only)
npm run migrate

# Step 5: Start with hot-reload
npm run dev

# cms-service will be available at http://localhost:3020
# Admin panel at http://localhost:3020/admin
```

---

## 8. First-Run Instructions

Complete these steps in order on the very first deployment to a new environment.

1. Run Payload migrations to create the `cms` schema on Supabase:
```bash
cd apps/cms-service && npm run migrate
```

2. Set the initial admin credentials before first boot. Add to your `.env`:
```bash
CMS_ADMIN_EMAIL=admin@marketeq.com
CMS_ADMIN_PASSWORD=ChangeMe123!
```

3. Start cms-service. Payload auto-seeds the first admin user from the above env vars on first boot.

4. Log in to the admin panel at `/admin` and immediately change the password.

5. Remove `CMS_ADMIN_EMAIL` and `CMS_ADMIN_PASSWORD` from your environment after first login.

6. Seed initial categories from the Payload admin panel (Categories → Create) or via the REST API. category-service will pull the full list on its next startup.

---

## 9. Smoke Tests



### Test 1 — Health Check
```bash
curl http://localhost:3020/health
# Expected: { "status": "ok", "service": "cms-service" }
```

### Test 2 — Admin Panel Reachable
```bash
curl -I http://localhost:3020/admin
# Expected: HTTP 200
```

### Test 3 — Categories API (requires CMS_API_KEY)
```bash
curl -H 'Authorization: API-Key cms-internal-key' \
     http://localhost:3020/api/categories?depth=1&limit=5
# Expected: { "docs": [...], "totalDocs": N, "hasNextPage": false }
```

### Test 4 — Database Connection
```bash
# If the DB connection fails, cms-service logs:
# ERROR: Could not connect to database. Ensure DATABASE_URL is correct.
# Check DATABASE_URL in .env and that the cms schema exists (run npm run migrate)
```

### Test 5 — RabbitMQ Connection
```bash
# On successful RabbitMQ connection, cms-service logs:
# INFO: RabbitMQ connected. CmsEventPublisher ready.
# On failure: INFO: RabbitMQ unavailable. Events will be retried on reconnect.
```

---

## 10. Supabase Deployment Notes

- Container port must match `CMS_PORT`. Mismatch causes connection refused — treat as a configuration bug.
- Health check path: `/health`. Success codes: 200–299. Timeout: 10s.
- Set all 11 environment variables in the Supabase dashboard under the cms-service service settings.
- cms-service must have network access to the shared PostgreSQL instance, RabbitMQ, and Cloudflare R2.
- Do not expose port 3020 publicly. cms-service is an internal service — traffic comes from other containers only.
- Reference earlier docs: CS-00 for architecture context, CS-02 for folder structure and bootstrapping.
