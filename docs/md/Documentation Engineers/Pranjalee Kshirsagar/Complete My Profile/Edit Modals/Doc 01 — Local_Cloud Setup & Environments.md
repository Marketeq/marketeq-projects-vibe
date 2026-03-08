# **Local/Cloud Setup & Environments**

**Project:** Complete My Profile --- **Edit Modals** (Backend)\
**Service:** apps/user-service/src (extend existing user-service; no new
microservice)\
**Audience:** Backend engineers, QA, DevOps\
**Status:** Ready for implementation

## **1) Purpose**

Give every engineer a **repeatable** path to run, test, and deploy the
user-service with the new **Edit Modals** modules and the **Progress**
engine. This doc defines prerequisites, environment variables, local
Docker services, commands, and cloud deployment notes.

## **2) Prerequisites (Developer Workstation)**

- **OS:** macOS / Linux / WSL2 (Windows)

- **Node.js:** LTS (≥ 18.x)

- **Package manager:** pnpm (preferred) or yarn

- **Nest CLI:** npm i -g \@nestjs/cli

- **Docker & Docker Compose:** latest stable

- **Git:** latest stable

- **Optional tools:** Postman/Insomnia, Make, jq, pgAdmin/psql

> Tip: verify with\
> node -v, pnpm -v, docker version, docker compose version

## **3) Repository Layout (relevant parts)**

  -----------------------------------------------------------------------
  repo-root/\
  ├─ apps/\
  │ └─ user-service/\
  │ └─ src/\
  │ ├─ common/\
  │ ├─ config/\
  │ ├─ database/\
  │ ├─ modules/\
  │ │ ├─ about/\
  │ │ ├─ skills/\
  │ │ ├─ experience/\
  │ │ ├─ education/\
  │ │ ├─ rates/\
  │ │ ├─ portfolio/\
  │ │ └─ progress/\
  │ ├─ audit/\
  │ ├─ health/\
  │ └─ main.ts\
  ├─ docker/\
  │ ├─ docker-compose.local.yml\
  │ └─ init.sql\
  └─ package.json / pnpm-workspace.yaml / nx.json
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **4) Environment Configuration**

### **4.1 Files**

Create environment files at repo root (or where your config loader
expects them):

- .env.local --- local development

- .env.test --- local CI / integration tests

- .env.staging --- staging (cloud)

- .env.prod --- production (cloud)

> Never commit real secrets. Use your secret manager in the cloud.

### **4.2 Variables (baseline)**

  ------------------------------------------------------------------------------------------
  \# Service\
  NODE_ENV=local\
  PORT=3001\
  SERVICE_NAME=user-service\
  LOG_LEVEL=info\
  \
  \# Auth\
  JWT_ISSUER=https://auth.example.com\
  JWT_AUDIENCE=user-service\
  JWT_JWKS_URI=https://auth.example.com/.well-known/jwks.json\
  \
  \# Database (Postgres)\
  DATABASE_URL=postgres://user:password@localhost:5432/user_service_local?sslmode=disable\
  \
  \# Idempotency (choose one; Postgres table is default)\
  IDEMPOTENCY_BACKEND=postgres\
  IDEMPOTENCY_TTL_SECONDS=86400\
  \
  \# Feature flags\
  PROFILE_EDIT_MODALS=1\
  PROGRESS_ENGINE_ENABLED=1\
  \
  \# Events (optional this sprint \-- disable if not used)\
  EVENTS_ENABLED=0\
  RABBITMQ_URL=amqp://guest:guest@localhost:5672\
  RABBITMQ_EXCHANGE=profile.events\
  \
  \# Observability\
  ENABLE_METRICS=1\
  METRICS_PORT=9090\
  ENABLE_TRACING=0\
  TRACING_EXPORTER=none\
  \
  \# Security & privacy\
  PII_REDACTION_ENABLED=1
  ------------------------------------------------------------------------------------------

  ------------------------------------------------------------------------------------------

**Notes**

- If your repo standard uses **TypeORM**, the DATABASE_URL must be in a
  compatible format. If **Prisma** is used, match Prisma's expected
  format and ensure the schema file points to the right env var.

- If your platform handles JWT via a gateway, set the **gateway's**
  JWKS/issuer values.

### **4.3 Config Schema (validation at boot)**

Implement a runtime env-schema (e.g., with \@nestjs/config + zod or
class-validator) to **fail fast** on missing/invalid env.\
Key checks: DATABASE_URL, JWT\_\*, integer bounds (ports/TTLs), booleans
for feature flags.

## **5) Local Services (Docker)**

### **5.1 Compose file (example)**

docker/docker-compose.local.yml

  -----------------------------------------------------------------------
  version: \"3.9\"\
  services:\
  postgres:\
  image: postgres:15\
  container_name: user_service_pg\
  environment:\
  POSTGRES_USER: user\
  POSTGRES_PASSWORD: password\
  POSTGRES_DB: user_service_local\
  ports:\
  - \"5432:5432\"\
  volumes:\
  - pgdata_user_service:/var/lib/postgresql/data\
  - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro\
  \
  \# Optional message broker (disabled if EVENTS_ENABLED=0)\
  rabbitmq:\
  image: rabbitmq:3-management\
  container_name: user_service_rmq\
  ports: \[\"5672:5672\", \"15672:15672\"\]\
  \
  volumes:\
  pgdata_user_service:
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Start/stop:

  -----------------------------------------------------------------------
  docker compose -f docker/docker-compose.local.yml up -d\
  docker compose -f docker/docker-compose.local.yml down
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

> If ports are taken, change the host-side ports in the compose file.

## **6) Install, Build, Run**

### **6.1 Install dependencies**

  -----------------------------------------------------------------------
  pnpm install
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **6.2 Database migrations**

> Use your repo-standard tool. Commands below assume **TypeORM**
> scripts. If you use **Prisma**, replace with prisma generate / prisma
> migrate dev.

  -----------------------------------------------------------------------
  \# Generate migration after model changes\
  pnpm typeorm:migration:generate \-- -d
  apps/user-service/src/database/datasource.ts
  apps/user-service/src/database/migrations/\<name\>\
  \
  \# Run migrations\
  pnpm typeorm:migration:run \-- -d
  apps/user-service/src/database/datasource.ts\
  \
  \# Revert last migration\
  pnpm typeorm:migration:revert \-- -d
  apps/user-service/src/database/datasource.ts
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **6.3 Seed (optional)**

Provide a minimal seed to create a few users and empty profile sections
for manual testing:

  -----------------------------------------------------------------------
  pnpm seed:user-service
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **6.4 Start the service (dev)**

  -----------------------------------------------------------------------
  \# Option A: Nest dev\
  pnpm dev:user-service\
  \# Option B: Nx/Turborepo (if configured)\
  pnpm nx serve user-service
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

Service should log:

- Listening on 0.0.0.0:\${PORT}

- DB connection ok

- /health and /ready registered

## **7) Health, Readiness, Smoke**

### **7.1 Endpoints**

- GET /health → { status: \"ok\", uptimeSec, nowIso }

- GET /ready → { status: \"ready\", db: \"ok\", deps: {\...} }

### **7.2 Smoke checklist**

1.  GET /health returns ok

2.  Run migrations → success

3.  GET /v1/users/:id/profile/progress (for a seeded user) returns a
    valid object

4.  Create a **Skills** item → 200 and response includes { progress }

5.  Delete last **Education** → progress decreases

## **8) Running Tests**

### **8.1 Unit & integration**

  -----------------------------------------------------------------------
  pnpm test:user-service\
  pnpm test:user-service:watch\
  pnpm test:user-service:cov
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **8.2 Contract/E2E (supertest or e2e package)**

  -----------------------------------------------------------------------
  pnpm e2e:user-service
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **8.3 Postman/Insomnia**

Import **Doc 09** collection. Set environment variables:

- BASE_URL=http://localhost:3001

- AUTH_TOKEN=\... (dev JWT from your auth emulator or fixture)

- USER_ID=\<seeded-user-id\>

## **9) Local Developer Flows**

### **9.1 Typical workflow**

1.  docker compose up -d (DB/broker)

2.  pnpm install

3.  pnpm typeorm:migration:run

4.  pnpm dev:user-service

5.  Hit /health & /ready

6.  Use Postman to exercise
    **About/Skills/Experience/Education/Rates/Portfolio** and observe {
    progress } in responses

### **9.2 Database reset**

  -----------------------------------------------------------------------
  docker compose -f docker/docker-compose.local.yml down -v\
  docker compose -f docker/docker-compose.local.yml up -d\
  pnpm typeorm:migration:run\
  pnpm seed:user-service
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **10) Idempotency & Retries (Local)**

- Mutating endpoints accept Idempotency-Key (uuid).

- Default backend = **Postgres** table with TTL
  (IDEMPOTENCY_TTL_SECONDS).

- For retries in Postman: send the same Idempotency-Key and confirm the
  server returns the first result.

## **11) Observability (Local)**

### **11.1 Metrics**

- If ENABLE_METRICS=1, expose Prometheus at :9090/metrics (or per your
  exporter config).

- Minimum counters:

  - http_requests_total{route,status}

  - http_request_duration_seconds{route,quantile}

  - validation_errors_total{module,field}

  - progress_recompute_duration_seconds

### **11.2 Logs & Traces**

- Logs: JSON with service, traceId, spanId, userId (when known).

- Tracing (optional local): set ENABLE_TRACING=1 and exporter (e.g.,
  OTLP) to your local collector.

## **12) Cloud Environments**

### **12.1 Configuration matrix**

- **Staging** → .env.staging

- **Production** → .env.prod

- Use your platform's secret manager for all **secret** values:

  - DATABASE_URL, JWT config, broker URLs, etc.

### **12.2 Deployment (example with Render/Containers)**

- Build command (monorepo-appropriate):\
  pnpm install && pnpm build:user-service

- Start command:\
  node dist/apps/user-service/main.js

- Health check path: /health

- Readiness probe path: /ready

### **12.3 DB migrations on deploy**

- Prefer **CI/CD step** to run migrations before flipping traffic:

  - Staging: pnpm typeorm:migration:run

  - Prod: same, with approvals

- Rollback plan in **Doc 14 --- Release Plan\**

## **13) Security & Privacy (Environment-Level)**

- Ensure **prod/staging** logs redact PII and access tokens.

- Rotate credentials regularly; principle of least privilege (DB user).

- Restrict /metrics and any admin endpoints behind network or auth where
  applicable.

- Enforce HTTPS in cloud (TLS termination at LB/gateway).

## **14) Common Pitfalls & Fixes**

- **DB connection refused:** check docker compose ps, verify port 5432,
  network conflicts, credentials.

- **Migrations missing:** ensure correct datasource path; clear compiled
  artifacts and rebuild.

- **Auth failures:** verify JWT_JWKS_URI and local token issuer; for
  local, use a dev JWKS or bypass only in dedicated mocks.

- **Progress not changing:** confirm required fields per step (see **Doc
  10**), and that write code triggers the progress recompute path.

## **15) Quick Commands (suggested package.json scripts)**

  -----------------------------------------------------------------------
  {\
  \"scripts\": {\
  \"dev:user-service\": \"nest start user-service \--watch\",\
  \"build:user-service\": \"nest build user-service\",\
  \"start:user-service\": \"node dist/apps/user-service/main.js\",\
  \
  \"typeorm:migration:generate\": \"ts-node -r tsconfig-paths/register
  node_modules/typeorm/cli.js migration:generate\",\
  \"typeorm:migration:run\": \"ts-node -r tsconfig-paths/register
  node_modules/typeorm/cli.js migration:run\",\
  \"typeorm:migration:revert\": \"ts-node -r tsconfig-paths/register
  node_modules/typeorm/cli.js migration:revert\",\
  \
  \"seed:user-service\": \"ts-node -r tsconfig-paths/register
  apps/user-service/src/database/seed.ts\",\
  \
  \"test:user-service\": \"jest apps/user-service\",\
  \"e2e:user-service\": \"jest apps/user-service-e2e\",\
  \"lint\": \"eslint .\",\
  \"format\": \"prettier \--write .\"\
  }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

> Adjust to your repo's actual tooling (Nx/Turborepo, Prisma vs TypeORM,
> etc.).

## **16) Verification Checklist (before coding the modules)**

- .env.local created and loaded at runtime

- Docker Postgres up; migrations run successfully

- Service starts and passes /health & /ready

- Postman can call a sample endpoint and receive { progress } in write
  responses

- Metrics endpoint returns counters (if enabled)

- Idempotency working (replay request with same key → same result, no
  duplicates)
