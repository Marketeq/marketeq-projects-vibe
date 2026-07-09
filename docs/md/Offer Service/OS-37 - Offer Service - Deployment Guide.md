**OS-37**

**Offer Service --- Deployment Guide**

**Monorepo:** marketeq-projects-nestjs **Environments:** dev → staging →
prod **Container:** Docker → K8s

This document is the step-by-step deployment guide for offer-service. It
covers building the service in the monorepo, local development setup,
the Dockerfile, the K8s deployment manifest, environment promotion from
dev to staging to production, how to run database migrations safely
before each deployment, and the smoke test checklist to run after every
deployment. Every command is copy-paste ready.

**Deployment Steps at a Glance**

  ------------- ------------- ----------------------------------------------------
  **Phase**     **Stage**     **What happens**

  **Build**     CI pipeline   TypeScript compiled, tests run, Docker image built
                              and pushed to registry

  **Migrate**   Pre-deploy    TypeORM migrations run against the target
                job           environment DB before new pods start

  **Deploy**    K8s rollout   New pods start. Old pods continue serving until new
                              pods are healthy (/ready = 200).

  **Verify**    Post-deploy   Smoke tests run against the new deployment. On
                              failure: automatic rollback.

  **Promote**   Manual        Staging deploy verified → human approval →
                approval      production deploy triggered.
  ------------- ------------- ----------------------------------------------------

+-----------------------------------------------------------------------+
| **Step 1 Local Development Setup**                                    |
|                                                                       |
| Run offer-service locally against a local Docker PostgreSQL and       |
| RabbitMQ                                                              |
+-----------------------------------------------------------------------+

This step gets offer-service running on your laptop for the first time.
You need Node.js 20+, Docker, and the monorepo checked out.

+---------------------------------------------------------------------------+
| \# ============================================================           |
|                                                                           |
| \# 1. Clone the monorepo (if not already done)                            |
|                                                                           |
| \# ============================================================           |
|                                                                           |
| git clone git@github.com:marketeq/marketeq-projects-nestjs.git            |
|                                                                           |
| cd marketeq-projects-nestjs                                               |
|                                                                           |
| \# ============================================================           |
|                                                                           |
| \# 2. Install all monorepo dependencies                                   |
|                                                                           |
| \# ============================================================           |
|                                                                           |
| npm install                                                               |
|                                                                           |
| \# This installs dependencies for ALL apps in the monorepo.               |
|                                                                           |
| \# Takes 2-3 minutes on first run.                                        |
|                                                                           |
| \# ============================================================           |
|                                                                           |
| \# 3. Start local infrastructure with Docker Compose                      |
|                                                                           |
| \# ============================================================           |
|                                                                           |
| docker compose -f docker-compose.dev.yml up -d                            |
|                                                                           |
| \# This starts:                                                           |
|                                                                           |
| \# PostgreSQL: localhost:5432                                             |
|                                                                           |
| \# RabbitMQ: localhost:5672 (management UI: localhost:15672)              |
|                                                                           |
| \# Redis: localhost:6379                                                  |
|                                                                           |
| \# Verify all containers are healthy:                                     |
|                                                                           |
| docker compose -f docker-compose.dev.yml ps                               |
|                                                                           |
| \# Expected: all services show \"healthy\" or \"Up\"                      |
|                                                                           |
| \# ============================================================           |
|                                                                           |
| \# 4. Configure the offer-service environment                             |
|                                                                           |
| \# ============================================================           |
|                                                                           |
| cp apps/offer-service/.env.example apps/offer-service/.env                |
|                                                                           |
| \# Edit .env with your local values:                                      |
|                                                                           |
| nano apps/offer-service/.env                                              |
|                                                                           |
| \# Minimum required values for local dev:                                 |
|                                                                           |
| DATABASE_URL=postgresql://postgres:postgres@localhost:5432/marketeq_dev   |
|                                                                           |
| DB_SCHEMA=offer_service                                                   |
|                                                                           |
| RABBITMQ_URL=amqp://guest:guest@localhost:5672                            |
|                                                                           |
| REDIS_URL=redis://localhost:6379                                          |
|                                                                           |
| JWT_PUBLIC_KEY=\<paste-the-dev-public-key-from-1password\>                |
|                                                                           |
| JWT_EXPECTED_ISSUER=marketeq-auth                                         |
|                                                                           |
| ABLY_API_KEY=\<paste-from-ably-dashboard-dev-app\>                        |
|                                                                           |
| INTERNAL_SERVICE_SECRET=dev-secret-minimum-32-chars-xxxx                  |
|                                                                           |
| LISTINGS_SERVICE_URL=http://localhost:3001                                |
|                                                                           |
| PRICING_SERVICE_URL=http://localhost:3002                                 |
|                                                                           |
| LEGAL_SERVICE_URL=http://localhost:3003                                   |
|                                                                           |
| PORT=3005                                                                 |
|                                                                           |
| NODE_ENV=development                                                      |
|                                                                           |
| \# ============================================================           |
|                                                                           |
| \# 5. Run TypeORM migrations against the local DB                         |
|                                                                           |
| \# ============================================================           |
|                                                                           |
| npm run migration:run \--workspace=apps/offer-service                     |
|                                                                           |
| \# Expected: \"Migration CreateOfferServiceSchema1706742000000 has been   |
| executed successfully.\"                                                  |
|                                                                           |
| \# \"Migration SeedOfferServiceData1706742001000 has been executed        |
| successfully.\"                                                           |
|                                                                           |
| \# ============================================================           |
|                                                                           |
| \# 6. Start offer-service in development mode (hot reload)                |
|                                                                           |
| \# ============================================================           |
|                                                                           |
| npm run start:dev \--workspace=apps/offer-service                         |
|                                                                           |
| \# Expected output (last 3 lines):                                        |
|                                                                           |
| \#                                                                        |
| {\"timestamp\":\"\...\",\"level\":\"info\",\"service\":\"offer-service\", |
|                                                                           |
| \# \"message\":\"offer-service listening on port                          |
| 3005\",\"port\":3005,\"nodeEnv\":\"development\"}                         |
|                                                                           |
| \# ============================================================           |
|                                                                           |
| \# 7. Verify it is running                                                |
|                                                                           |
| \# ============================================================           |
|                                                                           |
| curl -s http://localhost:3005/v1/health \| jq .                           |
|                                                                           |
| \# Expected: { \"status\": \"ok\", \"timestamp\": \"\...\" }              |
|                                                                           |
| curl -s http://localhost:3005/v1/ready \| jq .                            |
|                                                                           |
| \# Expected: { \"status\": \"ok\", \"checks\": { \"db\": \"connected\",   |
| \... } }                                                                  |
+---------------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 2 Dockerfile**                                                 |
|                                                                       |
| Multi-stage build for the offer-service image                         |
+-----------------------------------------------------------------------+

The Dockerfile uses a three-stage build: install deps, compile
TypeScript, then copy only the compiled output into a slim production
image. This keeps the final image small and free of dev dependencies.

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/Dockerfile**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| \# ============================================================       |
|                                                                       |
| \# Stage 1: deps                                                      |
|                                                                       |
| \# Install ALL dependencies (including dev) for compilation.          |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| FROM node:20-alpine AS deps                                           |
|                                                                       |
| WORKDIR /app                                                          |
|                                                                       |
| \# Copy monorepo package files first (layer cache optimisation)       |
|                                                                       |
| COPY package.json package-lock.json ./                                |
|                                                                       |
| COPY apps/offer-service/package.json ./apps/offer-service/            |
|                                                                       |
| \# Install all workspace dependencies                                 |
|                                                                       |
| RUN npm ci \--workspace=apps/offer-service                            |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# Stage 2: builder                                                   |
|                                                                       |
| \# Compile TypeScript to JavaScript.                                  |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| FROM deps AS builder                                                  |
|                                                                       |
| WORKDIR /app                                                          |
|                                                                       |
| \# Copy source files                                                  |
|                                                                       |
| COPY tsconfig.json ./                                                 |
|                                                                       |
| COPY apps/offer-service/ ./apps/offer-service/                        |
|                                                                       |
| \# Compile TypeScript                                                 |
|                                                                       |
| RUN npm run build \--workspace=apps/offer-service                     |
|                                                                       |
| \# Output: apps/offer-service/dist/                                   |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# Stage 3: production image                                          |
|                                                                       |
| \# Slim image with only compiled JS and production deps.              |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| FROM node:20-alpine AS production                                     |
|                                                                       |
| WORKDIR /app                                                          |
|                                                                       |
| \# Security: run as non-root user                                     |
|                                                                       |
| RUN addgroup -S offer && adduser -S offer -G offer                    |
|                                                                       |
| \# Copy package files and install PRODUCTION deps only                |
|                                                                       |
| COPY \--from=deps /app/package.json /app/package-lock.json ./         |
|                                                                       |
| COPY \--from=deps /app/apps/offer-service/package.json                |
| ./apps/offer-service/                                                 |
|                                                                       |
| RUN npm ci \--workspace=apps/offer-service \--omit=dev                |
|                                                                       |
| \# Copy compiled output from builder stage                            |
|                                                                       |
| COPY \--from=builder /app/apps/offer-service/dist                     |
| ./apps/offer-service/dist                                             |
|                                                                       |
| \# Copy migration files (needed by migration:run script)              |
|                                                                       |
| COPY \--from=builder /app/apps/offer-service/migrations               |
| ./apps/offer-service/migrations                                       |
|                                                                       |
| \# Switch to non-root user                                            |
|                                                                       |
| USER offer                                                            |
|                                                                       |
| \# Health check (K8s liveness probe also does this via HTTP)          |
|                                                                       |
| HEALTHCHECK \--interval=30s \--timeout=5s \--start-period=15s         |
| \--retries=3 \\                                                       |
|                                                                       |
| CMD wget -qO- http://localhost:3005/v1/health \|\| exit 1             |
|                                                                       |
| EXPOSE 3005                                                           |
|                                                                       |
| CMD \[\"node\", \"apps/offer-service/dist/main.js\"\]                 |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# Build and push manually (CI does this automatically):              |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# docker build \\                                                    |
|                                                                       |
| \# -f apps/offer-service/Dockerfile \\                                |
|                                                                       |
| \# -t registry.marketeq.com/offer-service:\$(git rev-parse \--short   |
| HEAD) \\                                                              |
|                                                                       |
| \# .                                                                  |
|                                                                       |
| \#                                                                    |
|                                                                       |
| \# docker push registry.marketeq.com/offer-service:\$(git rev-parse   |
| \--short HEAD)                                                        |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 3 K8s Deployment Manifest --- deployment.yaml**                |
|                                                                       |
| Kubernetes Deployment for offer-service                               |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: infrastructure/k8s/offer-service/deployment.yaml**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| apiVersion: apps/v1                                                   |
|                                                                       |
| kind: Deployment                                                      |
|                                                                       |
| metadata:                                                             |
|                                                                       |
| name: offer-service                                                   |
|                                                                       |
| namespace: marketeq                                                   |
|                                                                       |
| labels:                                                               |
|                                                                       |
| app: offer-service                                                    |
|                                                                       |
| version: \"{{ IMAGE_TAG }}\" \# Replaced by CI/CD                     |
|                                                                       |
| spec:                                                                 |
|                                                                       |
| replicas: 3 \# Always run 3 replicas in staging/prod for HA           |
|                                                                       |
| selector:                                                             |
|                                                                       |
| matchLabels:                                                          |
|                                                                       |
| app: offer-service                                                    |
|                                                                       |
| strategy:                                                             |
|                                                                       |
| type: RollingUpdate                                                   |
|                                                                       |
| rollingUpdate:                                                        |
|                                                                       |
| maxUnavailable: 0 \# Never take a pod down before a new one is ready  |
|                                                                       |
| maxSurge: 1 \# Start 1 new pod at a time                              |
|                                                                       |
| template:                                                             |
|                                                                       |
| metadata:                                                             |
|                                                                       |
| labels:                                                               |
|                                                                       |
| app: offer-service                                                    |
|                                                                       |
| version: \"{{ IMAGE_TAG }}\"                                          |
|                                                                       |
| spec:                                                                 |
|                                                                       |
| serviceAccountName: offer-service-sa                                  |
|                                                                       |
| containers:                                                           |
|                                                                       |
| \- name: offer-service                                                |
|                                                                       |
| image: registry.marketeq.com/offer-service:{{ IMAGE_TAG }}            |
|                                                                       |
| ports:                                                                |
|                                                                       |
| \- containerPort: 3005                                                |
|                                                                       |
| name: http                                                            |
|                                                                       |
| envFrom:                                                              |
|                                                                       |
| \- secretRef:                                                         |
|                                                                       |
| name: offer-service-secrets \# K8s Secret with all env vars           |
|                                                                       |
| env:                                                                  |
|                                                                       |
| \- name: PORT                                                         |
|                                                                       |
| value: \"3005\"                                                       |
|                                                                       |
| \- name: NODE_ENV                                                     |
|                                                                       |
| value: \"production\"                                                 |
|                                                                       |
| \- name: APP_VERSION                                                  |
|                                                                       |
| value: \"{{ IMAGE_TAG }}\"                                            |
|                                                                       |
| resources:                                                            |
|                                                                       |
| requests:                                                             |
|                                                                       |
| memory: \"256Mi\"                                                     |
|                                                                       |
| cpu: \"250m\"                                                         |
|                                                                       |
| limits:                                                               |
|                                                                       |
| memory: \"512Mi\"                                                     |
|                                                                       |
| cpu: \"500m\"                                                         |
|                                                                       |
| \# Liveness probe: restart pod if process is stuck                    |
|                                                                       |
| livenessProbe:                                                        |
|                                                                       |
| httpGet:                                                              |
|                                                                       |
| path: /v1/health                                                      |
|                                                                       |
| port: 3005                                                            |
|                                                                       |
| initialDelaySeconds: 10                                               |
|                                                                       |
| periodSeconds: 30                                                     |
|                                                                       |
| failureThreshold: 3                                                   |
|                                                                       |
| \# Readiness probe: only route traffic when dependencies are healthy  |
|                                                                       |
| readinessProbe:                                                       |
|                                                                       |
| httpGet:                                                              |
|                                                                       |
| path: /v1/ready                                                       |
|                                                                       |
| port: 3005                                                            |
|                                                                       |
| initialDelaySeconds: 15                                               |
|                                                                       |
| periodSeconds: 10                                                     |
|                                                                       |
| failureThreshold: 2                                                   |
|                                                                       |
| \# Graceful shutdown: give in-flight requests 30s to complete         |
|                                                                       |
| lifecycle:                                                            |
|                                                                       |
| preStop:                                                              |
|                                                                       |
| exec:                                                                 |
|                                                                       |
| command: \[\'/bin/sh\', \'-c\', \'sleep 5\'\]                         |
|                                                                       |
| terminationGracePeriodSeconds: 35                                     |
|                                                                       |
| \-\--                                                                 |
|                                                                       |
| apiVersion: v1                                                        |
|                                                                       |
| kind: Service                                                         |
|                                                                       |
| metadata:                                                             |
|                                                                       |
| name: offer-service                                                   |
|                                                                       |
| namespace: marketeq                                                   |
|                                                                       |
| spec:                                                                 |
|                                                                       |
| selector:                                                             |
|                                                                       |
| app: offer-service                                                    |
|                                                                       |
| ports:                                                                |
|                                                                       |
| \- port: 3005                                                         |
|                                                                       |
| targetPort: 3005                                                      |
|                                                                       |
| name: http                                                            |
|                                                                       |
| type: ClusterIP \# Internal only; exposed via Ingress                 |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: infrastructure/k8s/offer-service/migration-job.yaml**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| \# Migration Job: runs BEFORE the Deployment rollout.                 |
|                                                                       |
| \# The CI/CD pipeline runs this Job and waits for it to complete      |
|                                                                       |
| \# before applying the Deployment update.                             |
|                                                                       |
| apiVersion: batch/v1                                                  |
|                                                                       |
| kind: Job                                                             |
|                                                                       |
| metadata:                                                             |
|                                                                       |
| name: offer-service-migrate-{{ IMAGE_TAG }}                           |
|                                                                       |
| namespace: marketeq                                                   |
|                                                                       |
| spec:                                                                 |
|                                                                       |
| \# Fail fast: if migration fails, stop and alert.                     |
|                                                                       |
| backoffLimit: 0                                                       |
|                                                                       |
| template:                                                             |
|                                                                       |
| spec:                                                                 |
|                                                                       |
| restartPolicy: Never                                                  |
|                                                                       |
| containers:                                                           |
|                                                                       |
| \- name: migrator                                                     |
|                                                                       |
| image: registry.marketeq.com/offer-service:{{ IMAGE_TAG }}            |
|                                                                       |
| \# Override the default CMD to run migrations instead of the server   |
|                                                                       |
| command:                                                              |
|                                                                       |
| \- \"node\"                                                           |
|                                                                       |
| \- \"apps/offer-service/dist/cli.js\"                                 |
|                                                                       |
| \- \"migration:run\"                                                  |
|                                                                       |
| envFrom:                                                              |
|                                                                       |
| \- secretRef:                                                         |
|                                                                       |
| name: offer-service-secrets                                           |
|                                                                       |
| env:                                                                  |
|                                                                       |
| \- name: NODE_ENV                                                     |
|                                                                       |
| value: \"production\"                                                 |
|                                                                       |
| resources:                                                            |
|                                                                       |
| requests:                                                             |
|                                                                       |
| memory: \"128Mi\"                                                     |
|                                                                       |
| cpu: \"100m\"                                                         |
|                                                                       |
| \# Service account with DB access                                     |
|                                                                       |
| serviceAccountName: offer-service-sa                                  |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 4 Environment Promotion --- dev → staging → prod**             |
|                                                                       |
| How a code change flows through environments                          |
+-----------------------------------------------------------------------+

Every code change follows this promotion path. No code goes directly to
production. Staging is a full replica of production with anonymised
data.

**Phase 1: Developer pushes a branch and opens a PR**

+-----------------------------------------------------------------------+
| \# On your local machine:                                             |
|                                                                       |
| git checkout -b feat/os-offer-service                                 |
|                                                                       |
| \# Make code changes to apps/offer-service/\...                       |
|                                                                       |
| \# Run tests locally before pushing:                                  |
|                                                                       |
| npm run test \--workspace=apps/offer-service                          |
|                                                                       |
| npm run test:int \--workspace=apps/offer-service                      |
|                                                                       |
| \# Lint and type check:                                               |
|                                                                       |
| npm run lint \--workspace=apps/offer-service                          |
|                                                                       |
| npm run typecheck \--workspace=apps/offer-service                     |
|                                                                       |
| \# Push and open PR:                                                  |
|                                                                       |
| git push origin feat/os-offer-service                                 |
|                                                                       |
| \# Create PR in GitHub. CI pipeline runs automatically.               |
|                                                                       |
| \# CI pipeline on PR (runs in \~5 minutes):                           |
|                                                                       |
| \# 1. npm ci (install deps)                                           |
|                                                                       |
| \# 2. npm run lint                                                    |
|                                                                       |
| \# 3. npm run typecheck                                               |
|                                                                       |
| \# 4. npm run test (unit tests)                                       |
|                                                                       |
| \# 5. npm run test:int (integration tests against a test DB in CI)    |
|                                                                       |
| \# 6. docker build (verify image builds)                              |
|                                                                       |
| \# All steps must pass before the PR can be merged.                   |
+-----------------------------------------------------------------------+

**Phase 2: PR merged to main → automatic staging deploy**

+-----------------------------------------------------------------------+
| \# CI/CD pipeline triggered automatically on merge to main.           |
|                                                                       |
| \# The following steps run in order:                                  |
|                                                                       |
| \# Step 1: Build and push the Docker image                            |
|                                                                       |
| \# IMAGE_TAG = git short SHA (e.g. \"a1b2c3d\")                       |
|                                                                       |
| docker build \\                                                       |
|                                                                       |
| -f apps/offer-service/Dockerfile \\                                   |
|                                                                       |
| -t registry.marketeq.com/offer-service:\$IMAGE_TAG \\                 |
|                                                                       |
| -t registry.marketeq.com/offer-service:staging-latest \\              |
|                                                                       |
| .                                                                     |
|                                                                       |
| docker push registry.marketeq.com/offer-service:\$IMAGE_TAG           |
|                                                                       |
| docker push registry.marketeq.com/offer-service:staging-latest        |
|                                                                       |
| \# Step 2: Run migrations against STAGING database                    |
|                                                                       |
| \# (uses migration-job.yaml with staging secrets)                     |
|                                                                       |
| kubectl apply -f infrastructure/k8s/offer-service/migration-job.yaml  |
| \\                                                                    |
|                                                                       |
| \--namespace=marketeq-staging                                         |
|                                                                       |
| kubectl wait \--for=condition=complete \\                             |
|                                                                       |
| job/offer-service-migrate-\$IMAGE_TAG \\                              |
|                                                                       |
| \--namespace=marketeq-staging \\                                      |
|                                                                       |
| \--timeout=300s                                                       |
|                                                                       |
| \# If migration job fails: pipeline stops. NO deployment happens.     |
|                                                                       |
| \# Engineers are alerted. Fix the migration before proceeding.        |
|                                                                       |
| \# Step 3: Deploy to staging                                          |
|                                                                       |
| kubectl set image deployment/offer-service \\                         |
|                                                                       |
| offer-service=registry.marketeq.com/offer-service:\$IMAGE_TAG \\      |
|                                                                       |
| \--namespace=marketeq-staging                                         |
|                                                                       |
| \# Wait for rollout to complete                                       |
|                                                                       |
| kubectl rollout status deployment/offer-service \\                    |
|                                                                       |
| \--namespace=marketeq-staging \\                                      |
|                                                                       |
| \--timeout=300s                                                       |
|                                                                       |
| \# Step 4: Run smoke tests against staging                            |
|                                                                       |
| \# (see Step 6 for the full smoke test checklist)                     |
|                                                                       |
| bash infrastructure/scripts/smoke-tests.sh                            |
| https://staging-api.marketeq.com                                      |
|                                                                       |
| \# If smoke tests fail: automatic rollback triggered.                 |
|                                                                       |
| \# kubectl rollout undo deployment/offer-service                      |
| \--namespace=marketeq-staging                                         |
|                                                                       |
| \# Step 5: Notify Slack on success:                                   |
|                                                                       |
| \# \"offer-service v\$IMAGE_TAG deployed to staging. Smoke tests      |
| passed.\"                                                             |
+-----------------------------------------------------------------------+

**Phase 3: Manual approval → production deploy**

+-----------------------------------------------------------------------+
| \# Production deploy requires a human approval in GitHub Actions (or  |
| CI/CD tool).                                                          |
|                                                                       |
| \# The approver confirms:                                             |
|                                                                       |
| \# - Staging smoke tests passed                                       |
|                                                                       |
| \# - No open P1 or P2 incidents in the monitoring dashboard           |
|                                                                       |
| \# - Deployment is happening during the approved deploy window        |
|                                                                       |
| \# (default: Monday-Thursday, 10:00-15:00 UTC)                        |
|                                                                       |
| \# Production deploy steps (same as staging, different namespace):    |
|                                                                       |
| \# Step 1: Run migrations against PRODUCTION database                 |
|                                                                       |
| kubectl apply -f infrastructure/k8s/offer-service/migration-job.yaml  |
| \\                                                                    |
|                                                                       |
| \--namespace=marketeq-prod                                            |
|                                                                       |
| kubectl wait \--for=condition=complete \\                             |
|                                                                       |
| job/offer-service-migrate-\$IMAGE_TAG \\                              |
|                                                                       |
| \--namespace=marketeq-prod \\                                         |
|                                                                       |
| \--timeout=300s                                                       |
|                                                                       |
| \# Step 2: Deploy to production (rolling update)                      |
|                                                                       |
| kubectl set image deployment/offer-service \\                         |
|                                                                       |
| offer-service=registry.marketeq.com/offer-service:\$IMAGE_TAG \\      |
|                                                                       |
| \--namespace=marketeq-prod                                            |
|                                                                       |
| kubectl rollout status deployment/offer-service \\                    |
|                                                                       |
| \--namespace=marketeq-prod \\                                         |
|                                                                       |
| \--timeout=300s                                                       |
|                                                                       |
| \# Step 3: Smoke tests against production                             |
|                                                                       |
| bash infrastructure/scripts/smoke-tests.sh https://api.marketeq.com   |
|                                                                       |
| \# Step 4: Tag the production release                                 |
|                                                                       |
| git tag \"release-\$IMAGE_TAG\"                                       |
|                                                                       |
| git push origin \"release-\$IMAGE_TAG\"                               |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 5 Database Migrations --- Safe Migration Practice**            |
|                                                                       |
| Rules for writing and running TypeORM migrations                      |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| CRITICAL: Migrations run BEFORE new pods start.                       |
|                                                                       |
| This means the CURRENT running version of the service (old code) will |
| read the                                                              |
|                                                                       |
| MIGRATED database schema for a brief window during rolling            |
| deployment.                                                           |
|                                                                       |
| ALL migrations must be BACKWARD COMPATIBLE with the previous deployed |
| version:                                                              |
|                                                                       |
| \- ADD a column: always add it as nullable or with a default value.   |
|                                                                       |
| The old code will try to INSERT without the new column; null/default  |
| handles this.                                                         |
|                                                                       |
| \- RENAME a column: NEVER rename in a single migration.               |
|                                                                       |
| Step 1 (deploy 1): add new column, dual-write. Step 2 (deploy 2):     |
| drop old column.                                                      |
|                                                                       |
| \- DROP a column: NEVER drop a column that the current code reads.    |
|                                                                       |
| Remove code references first (deploy 1), then drop the column (deploy |
| 2).                                                                   |
|                                                                       |
| \- ADD a NOT NULL column without default: FORBIDDEN.                  |
|                                                                       |
| Old code will fail to INSERT. Always add with a default or make       |
| nullable first.                                                       |
+-----------------------------------------------------------------------+

**Generating a new migration**

+-----------------------------------------------------------------------+
| \# After changing a TypeORM entity, generate the migration:           |
|                                                                       |
| cd apps/offer-service                                                 |
|                                                                       |
| \# Generate migration from entity diff:                               |
|                                                                       |
| npx typeorm-ts-node-esm migration:generate \\                         |
|                                                                       |
| src/migrations/AddOfferDeclinedChipColumn \\                          |
|                                                                       |
| -d src/data-source.ts                                                 |
|                                                                       |
| \# The generated file name includes a timestamp:                      |
|                                                                       |
| \# src/migrations/1706742001000-AddOfferDeclinedChipColumn.ts         |
|                                                                       |
| \# Review the generated migration carefully:                          |
|                                                                       |
| cat src/migrations/1706742001000-AddOfferDeclinedChipColumn.ts        |
|                                                                       |
| \# Verify it does NOT:                                                |
|                                                                       |
| \# - Drop an existing column                                          |
|                                                                       |
| \# - Add a NOT NULL column without a default                          |
|                                                                       |
| \# - Rename an existing column                                        |
|                                                                       |
| \# - Make an existing nullable column NOT NULL                        |
|                                                                       |
| \# Run the migration locally to verify it works:                      |
|                                                                       |
| npm run migration:run \--workspace=apps/offer-service                 |
|                                                                       |
| \# Verify the migration can be reverted (idempotency check):          |
|                                                                       |
| npm run migration:revert \--workspace=apps/offer-service              |
|                                                                       |
| npm run migration:run \--workspace=apps/offer-service                 |
|                                                                       |
| \# Both should complete without errors.                               |
|                                                                       |
| \# Add the migration file to the PR.                                  |
|                                                                       |
| \# NEVER commit a migration without also committing the entity        |
| change.                                                               |
+-----------------------------------------------------------------------+

**Migration package.json scripts**

+-----------------------------------------------------------------------+
| // In apps/offer-service/package.json scripts:                        |
|                                                                       |
| // Add these if not already present:                                  |
|                                                                       |
| \"migration:run\": \"ts-node -r tsconfig-paths/register src/cli.ts    |
| migration:run\",                                                      |
|                                                                       |
| \"migration:revert\": \"ts-node -r tsconfig-paths/register src/cli.ts |
| migration:revert\",                                                   |
|                                                                       |
| \"migration:generate\": \"ts-node -r tsconfig-paths/register          |
| src/cli.ts migration:generate\",                                      |
|                                                                       |
| \"migration:show\": \"ts-node -r tsconfig-paths/register src/cli.ts   |
| migration:show\",                                                     |
|                                                                       |
| // The cli.ts entry point for migration commands:                     |
+-----------------------------------------------------------------------+

  -----------------------------------------------------------------------
  **FILE: apps/offer-service/src/cli.ts**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| /\*\*                                                                 |
|                                                                       |
| \* CLI entry point for TypeORM migrations.                            |
|                                                                       |
| \* Used by the K8s migration job and local npm run migration:\*       |
| scripts.                                                              |
|                                                                       |
| \*                                                                    |
|                                                                       |
| \* Usage: node dist/cli.js migration:run                              |
|                                                                       |
| \*/                                                                   |
|                                                                       |
| import { DataSource } from \'typeorm\';                               |
|                                                                       |
| import { dataSourceOptions } from \'./config/data-source.config\';    |
|                                                                       |
| async function main() {                                               |
|                                                                       |
| const command = process.argv\[2\];                                    |
|                                                                       |
| const ds = new DataSource(dataSourceOptions);                         |
|                                                                       |
| await ds.initialize();                                                |
|                                                                       |
| switch (command) {                                                    |
|                                                                       |
| case \'migration:run\':                                               |
|                                                                       |
| await ds.runMigrations({ transaction: \'each\' });                    |
|                                                                       |
| console.log(\'Migrations complete.\');                                |
|                                                                       |
| break;                                                                |
|                                                                       |
| case \'migration:revert\':                                            |
|                                                                       |
| await ds.undoLastMigration();                                         |
|                                                                       |
| console.log(\'Last migration reverted.\');                            |
|                                                                       |
| break;                                                                |
|                                                                       |
| case \'migration:show\':                                              |
|                                                                       |
| const migrations = await ds.showMigrations();                         |
|                                                                       |
| console.log(migrations);                                              |
|                                                                       |
| break;                                                                |
|                                                                       |
| default:                                                              |
|                                                                       |
| console.error(\`Unknown command: \${command}\`);                      |
|                                                                       |
| process.exit(1);                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| await ds.destroy();                                                   |
|                                                                       |
| process.exit(0);                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| main().catch(err =\> {                                                |
|                                                                       |
| console.error(\'Migration failed:\', err);                            |
|                                                                       |
| process.exit(1);                                                      |
|                                                                       |
| });                                                                   |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 6 Smoke Test Checklist --- smoke-tests.sh**                    |
|                                                                       |
| Run after every deployment to every environment                       |
+-----------------------------------------------------------------------+

The smoke test script runs a series of HTTP checks against the deployed
service. It exits with code 0 on success (all checks pass) and code 1 on
failure (any check fails). The CI/CD pipeline calls this script and
triggers a rollback if it exits with 1.

  -----------------------------------------------------------------------
  **FILE: infrastructure/scripts/smoke-tests.sh**

  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| #!/bin/bash                                                           |
|                                                                       |
| \# Smoke tests for offer-service.                                     |
|                                                                       |
| \# Run after every deployment to verify the service is functional.    |
|                                                                       |
| \#                                                                    |
|                                                                       |
| \# Usage: bash smoke-tests.sh https://staging-api.marketeq.com        |
|                                                                       |
| \# bash smoke-tests.sh https://api.marketeq.com                       |
|                                                                       |
| set -euo pipefail                                                     |
|                                                                       |
| BASE_URL=\"\${1:?Usage: smoke-tests.sh \<base-url\>}\"                |
|                                                                       |
| PASS=0                                                                |
|                                                                       |
| FAIL=0                                                                |
|                                                                       |
| check() {                                                             |
|                                                                       |
| local name=\"\$1\"                                                    |
|                                                                       |
| local expected=\"\$2\"                                                |
|                                                                       |
| local actual=\"\$3\"                                                  |
|                                                                       |
| if echo \"\$actual\" \| grep -q \"\$expected\"; then                  |
|                                                                       |
| echo \"\[PASS\] \$name\"                                              |
|                                                                       |
| PASS=\$((PASS+1))                                                     |
|                                                                       |
| else                                                                  |
|                                                                       |
| echo \"\[FAIL\] \$name\"                                              |
|                                                                       |
| echo \" Expected to find: \$expected\"                                |
|                                                                       |
| echo \" Got: \$actual\"                                               |
|                                                                       |
| FAIL=\$((FAIL+1))                                                     |
|                                                                       |
| fi                                                                    |
|                                                                       |
| }                                                                     |
|                                                                       |
| echo \"=== Offer Service Smoke Tests ===\"                            |
|                                                                       |
| echo \"Target: \$BASE_URL\"                                           |
|                                                                       |
| echo \"\"                                                             |
|                                                                       |
| \# \-\-\-- Test 1: Liveness probe \-\-\--                             |
|                                                                       |
| res=\$(curl -sf \"\$BASE_URL/v1/health\" \|\| echo \"CURL_FAILED\")   |
|                                                                       |
| check \"GET /v1/health returns 200 with ok status\"                   |
| \'\"status\":\"ok\"\' \"\$res\"                                       |
|                                                                       |
| \# \-\-\-- Test 2: Readiness probe \-\-\--                            |
|                                                                       |
| res=\$(curl -sf \"\$BASE_URL/v1/ready\" \|\| echo \"CURL_FAILED\")    |
|                                                                       |
| check \"GET /v1/ready returns 200\" \'\"status\"\' \"\$res\"          |
|                                                                       |
| check \"GET /v1/ready db=connected\" \'\"db\":\"connected\"\'         |
| \"\$res\"                                                             |
|                                                                       |
| check \"GET /v1/ready rabbitmq=connected\"                            |
| \'\"rabbitmq\":\"connected\"\' \"\$res\"                              |
|                                                                       |
| check \"GET /v1/ready redis=connected\" \'\"redis\":\"connected\"\'   |
| \"\$res\"                                                             |
|                                                                       |
| \# \-\-\-- Test 3: Auth guard is active (401 without token) \-\-\--   |
|                                                                       |
| status=\$(curl -s -o /dev/null -w \"%{http_code}\"                    |
| \"\$BASE_URL/v1/offers/any-uuid\")                                    |
|                                                                       |
| check \"GET /v1/offers/:id without token returns 401\" \"401\"        |
| \"\$status\"                                                          |
|                                                                       |
| \# \-\-\-- Test 4: JWT validation rejects expired/invalid token       |
| \-\-\--                                                               |
|                                                                       |
| status=\$(curl -s -o /dev/null -w \"%{http_code}\" \\                 |
|                                                                       |
| -H \"Authorization: Bearer invalid.jwt.token\" \\                     |
|                                                                       |
| \"\$BASE_URL/v1/offers/any-uuid\")                                    |
|                                                                       |
| check \"Invalid JWT returns 401\" \"401\" \"\$status\"                |
|                                                                       |
| \# \-\-\-- Test 5: 404 for nonexistent offer \-\-\--                  |
|                                                                       |
| \# Use a smoke-test JWT from the environment (pre-issued for a test   |
| user)                                                                 |
|                                                                       |
| SMOKE_JWT=\"\${SMOKE_TEST_JWT:-}\"                                    |
|                                                                       |
| if \[ -n \"\$SMOKE_JWT\" \]; then                                     |
|                                                                       |
| status=\$(curl -s -o /dev/null -w \"%{http_code}\" \\                 |
|                                                                       |
| -H \"Authorization: Bearer \$SMOKE_JWT\" \\                           |
|                                                                       |
| \"\$BASE_URL/v1/offers/00000000-0000-0000-0000-000000000000\")        |
|                                                                       |
| check \"GET nonexistent offer returns 404\" \"404\" \"\$status\"      |
|                                                                       |
| else                                                                  |
|                                                                       |
| echo \"\[SKIP\] Test 5: SMOKE_TEST_JWT not set\"                      |
|                                                                       |
| fi                                                                    |
|                                                                       |
| \# \-\-\-- Test 6: RabbitMQ outbox is not backed up \-\-\--           |
|                                                                       |
| \# This test uses a direct DB query (requires DB access from the CI   |
| runner).                                                              |
|                                                                       |
| \# Skip if DB_URL is not set.                                         |
|                                                                       |
| if \[ -n \"\${SMOKE_DB_URL:-}\" \]; then                              |
|                                                                       |
| count=\$(psql \"\$SMOKE_DB_URL\" -tAc \\                              |
|                                                                       |
| \"SELECT COUNT(\*) FROM offer_service.outbox WHERE                    |
| status=\'FAILED\'\")                                                  |
|                                                                       |
| check \"Outbox FAILED count is 0\" \"\^0\$\" \"\$count\"              |
|                                                                       |
| backlog=\$(psql \"\$SMOKE_DB_URL\" -tAc \\                            |
|                                                                       |
| \"SELECT COUNT(\*) FROM offer_service.outbox WHERE                    |
| status=\'PENDING\'\")                                                 |
|                                                                       |
| check \"Outbox PENDING count \< 100\"                                 |
| \"\^\[0-9\]\[0-9\]\$\|\^\[0-9\]\$\" \"\$backlog\"                     |
|                                                                       |
| else                                                                  |
|                                                                       |
| echo \"\[SKIP\] Test 6: SMOKE_DB_URL not set\"                        |
|                                                                       |
| fi                                                                    |
|                                                                       |
| \# \-\-\-- Results \-\-\--                                            |
|                                                                       |
| echo \"\"                                                             |
|                                                                       |
| echo \"=== Results ===\"                                              |
|                                                                       |
| echo \"PASSED: \$PASS\"                                               |
|                                                                       |
| echo \"FAILED: \$FAIL\"                                               |
|                                                                       |
| if \[ \"\$FAIL\" -gt 0 \]; then                                       |
|                                                                       |
| echo \"SMOKE TESTS FAILED. Triggering rollback.\"                     |
|                                                                       |
| exit 1                                                                |
|                                                                       |
| fi                                                                    |
|                                                                       |
| echo \"All smoke tests passed.\"                                      |
|                                                                       |
| exit 0                                                                |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Step 7 Post-Deployment Verification Checklist**                     |
|                                                                       |
| Manual checks to run within 10 minutes of every production deployment |
+-----------------------------------------------------------------------+

The smoke test script covers automated checks. This checklist covers the
human verification steps that require checking dashboards and logs.

  ---------------- ------------------------------------------------------------ ---------------------
  **Check**        **How to verify**                                            **Pass criteria**

  Process is       **kubectl get pods -l app=offer-service                      All 3 pods show
  running          \--namespace=marketeq-prod**                                 \"Running\", restarts
                                                                                = 0

  /ready returns   **curl https://api.marketeq.com/v1/ready \| jq .status**     Returns \"ok\"
  ok                                                                            

  No 5xx errors in **kubectl logs -l app=offer-service \--since=5m \| jq        Zero error-level log
  logs             \"select(.level==\"error\")\"**                              lines

  Outbox FAILED =  **SQL: SELECT COUNT(\*) FROM offer_service.outbox WHERE      Returns 0
  0                status=\'FAILED\'**                                          

  Image tag is     **kubectl get deployment offer-service -o                    Shows the expected
  correct          jsonpath=\'{.spec.template.spec.containers\[0\].image}\'**   \$IMAGE_TAG

  Migrations       **SQL: SELECT migration_name FROM offer_service.migrations   Latest migration name
  applied          ORDER BY executed_at DESC LIMIT 5**                          matches the new
                                                                                deployment

  Request latency  **Check DataDog or CloudWatch for offer-service p95 latency  p95 \< 200ms for GET,
  normal           graph**                                                      \< 400ms for POST

  No expiry        **SQL: SELECT COUNT(\*) FROM offer_service.offers WHERE      Returns 0
  backlog          status=\'PENDING\' AND expires_at \<= NOW() - INTERVAL \'2   
                   minutes\'**                                                  
  ---------------- ------------------------------------------------------------ ---------------------

+-----------------------------------------------------------------------+
| **Step 8 Rollback Procedure**                                         |
|                                                                       |
| How to roll back offer-service in under 5 minutes                     |
+-----------------------------------------------------------------------+

Rolling back offer-service is a Kubernetes one-liner that reverts to the
previous deployment. The previous image tag is still in the registry. No
migration is needed for rollback because all migrations are
backward-compatible with the previous version.

+-----------------------------------------------------------------------+
| Rollback does NOT revert database migrations.                         |
|                                                                       |
| Because all migrations must be backward-compatible (Step 5), the old  |
| code                                                                  |
|                                                                       |
| runs fine against the new schema. Do not attempt to revert migrations |
| in production                                                         |
|                                                                       |
| unless explicitly required and pre-tested in staging.                 |
|                                                                       |
| If a migration has a bug that breaks the old code: fix the migration, |
| deploy the fix.                                                       |
|                                                                       |
| Do not try to undo the migration in production --- this risks data    |
| loss.                                                                 |
+-----------------------------------------------------------------------+

**Rollback to the previous deployment**

+-----------------------------------------------------------------------+
| \# ============================================================       |
|                                                                       |
| \# Automatic rollback (triggered by CI/CD if smoke tests fail):       |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# Staging:                                                           |
|                                                                       |
| kubectl rollout undo deployment/offer-service                         |
| \--namespace=marketeq-staging                                         |
|                                                                       |
| \# Production:                                                        |
|                                                                       |
| kubectl rollout undo deployment/offer-service                         |
| \--namespace=marketeq-prod                                            |
|                                                                       |
| \# Verify rollback completed:                                         |
|                                                                       |
| kubectl rollout status deployment/offer-service                       |
| \--namespace=marketeq-prod                                            |
|                                                                       |
| \# Expected: \"successfully rolled out\"                              |
|                                                                       |
| \# Verify the old image is running:                                   |
|                                                                       |
| kubectl get deployment offer-service \\                               |
|                                                                       |
| -o jsonpath=\'{.spec.template.spec.containers\[0\].image}\' \\        |
|                                                                       |
| \--namespace=marketeq-prod                                            |
|                                                                       |
| \# Should show the PREVIOUS image tag, not the failed one.            |
|                                                                       |
| \# Run smoke tests to confirm the rollback is healthy:                |
|                                                                       |
| bash infrastructure/scripts/smoke-tests.sh https://api.marketeq.com   |
|                                                                       |
| \# Expected: all tests pass.                                          |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# Rollback to a specific version:                                    |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# If you need to roll back more than one version:                    |
|                                                                       |
| kubectl rollout undo deployment/offer-service \\                      |
|                                                                       |
| \--to-revision=\<revision-number\> \\                                 |
|                                                                       |
| \--namespace=marketeq-prod                                            |
|                                                                       |
| \# List available revisions:                                          |
|                                                                       |
| kubectl rollout history deployment/offer-service                      |
| \--namespace=marketeq-prod                                            |
|                                                                       |
| \# Or: explicitly set a specific image tag from the registry:         |
|                                                                       |
| kubectl set image deployment/offer-service \\                         |
|                                                                       |
| offer-service=registry.marketeq.com/offer-service:\<KNOWN_GOOD_TAG\>  |
| \\                                                                    |
|                                                                       |
| \--namespace=marketeq-prod                                            |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# After rollback: post-incident steps                                |
|                                                                       |
| \# ============================================================       |
|                                                                       |
| \# 1. Confirm the service is healthy (smoke tests pass).              |
|                                                                       |
| \# 2. Identify the root cause of the failed deployment.               |
|                                                                       |
| \# 3. Fix the issue in a new branch.                                  |
|                                                                       |
| \# 4. Run full test suite including integration tests.                |
|                                                                       |
| \# 5. Deploy the fix through the normal promotion path.               |
|                                                                       |
| \# 6. Document the incident in the on-call log.                       |
+-----------------------------------------------------------------------+

**Environment variables --- Kubernetes Secrets**

+-----------------------------------------------------------------------+
| \# Create the K8s secret for staging (first time only):               |
|                                                                       |
| kubectl create secret generic offer-service-secrets \\                |
|                                                                       |
| \--namespace=marketeq-staging \\                                      |
|                                                                       |
| \--from-literal=DATABASE_URL=\'postgresql://\...\' \\                 |
|                                                                       |
| \--from-literal=RABBITMQ_URL=\'amqp://\...\' \\                       |
|                                                                       |
| \--from-literal=REDIS_URL=\'redis://\...\' \\                         |
|                                                                       |
| \--from-literal=JWT_PUBLIC_KEY=\'\$(cat jwt-public.pem)\' \\          |
|                                                                       |
| \--from-literal=JWT_EXPECTED_ISSUER=\'marketeq-auth\' \\              |
|                                                                       |
| \--from-literal=ABLY_API_KEY=\'\...\' \\                              |
|                                                                       |
| \--from-literal=INTERNAL_SERVICE_SECRET=\'\...\' \\                   |
|                                                                       |
| \--from-literal=LISTINGS_SERVICE_URL=\'http://listings-service:3001\' |
| \\                                                                    |
|                                                                       |
| \--from-literal=PRICING_SERVICE_URL=\'http://pricing-service:3002\'   |
| \\                                                                    |
|                                                                       |
| \--from-literal=LEGAL_SERVICE_URL=\'http://legal-service:3003\' \\    |
|                                                                       |
| \--from-literal=LISTINGS_TIMEOUT_MS=\'3000\' \\                       |
|                                                                       |
| \--from-literal=PRICING_TIMEOUT_MS=\'1500\' \\                        |
|                                                                       |
| \--from-literal=LEGAL_TIMEOUT_MS=\'2000\'                             |
|                                                                       |
| \# Update a single secret value:                                      |
|                                                                       |
| kubectl patch secret offer-service-secrets \\                         |
|                                                                       |
| \--namespace=marketeq-prod \\                                         |
|                                                                       |
| -p \'{\"stringData\":{\"ABLY_API_KEY\":\"new-value\"}}\'              |
|                                                                       |
| \# After updating secrets: restart pods to pick up the new values.    |
|                                                                       |
| kubectl rollout restart deployment/offer-service                      |
| \--namespace=marketeq-prod                                            |
|                                                                       |
| \# NEVER commit secret values to the repository.                      |
|                                                                       |
| \# Use 1Password or AWS Secrets Manager as the source of truth for    |
| secrets.                                                              |
|                                                                       |
| \# The CI/CD pipeline pulls secrets from the secrets manager at       |
| deploy time.                                                          |
+-----------------------------------------------------------------------+
