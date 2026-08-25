# 01 — `resume-parsing-service` Docker & Runtime Setup

> **Updated 22 July 2026.** Gap resolutions applied.
>
> - `MAX_EXTRACTED_CHARS` (150000) and `HARD_REJECT_CHARS` (500000) added, closing the truncation gap. Above the ceiling: truncate and **flag**. Above the hard limit: `422`, no model call.


**Service:** `resume-parsing-service`
**Prepared:** 22 July 2026
**Audience:** the developer setting this service up for the first time. Assumes no prior familiarity with it.
**Prerequisite:** Doc 00 — Service Overview.

---

## 1. What this document gets you

By the end you will have:

- the service running locally with hot reload on `npm run start:dev`,
- a production container image that builds and runs,
- working `/health/live` and `/health/ready` endpoints your orchestrator can use,
- every environment variable documented and validated at boot,
- a clear answer on why this service has no database connection.

**You do not need any credentials to complete this document.** The service runs end to end with a stubbed extraction pipeline. Model provider keys arrive in Doc 05.

---

## 2. The one thing to understand first

**This service is stateless.** No database, no cache, no session store, no disk writes. It receives a document in memory, returns JSON, and forgets everything.

That single property determines almost every decision below:

| Because it is stateless… | …the runtime looks like this |
|---|---|
| No database connection | No connection pool, no migrations, no Supabase client |
| Nothing to persist | No volumes, no writable filesystem in the container |
| No warm-up state | Instances are interchangeable and disposable |
| No draining concerns beyond in-flight requests | Deploys are trivially rolling |
| Nothing survives a restart by design | A crash loses at most the requests in flight |

If at any point you find yourself needing a volume, a migration or a database client, **stop**. Something has been designed into the wrong service. See §9.

---

## 3. Prerequisites

| Tool | Version | Verify | If missing |
|---|---|---|---|
| Node.js | ≥ 20.11 LTS | `node --version` | Install via `nvm install 20 && nvm use 20` |
| npm | ≥ 10 | `npm --version` | Ships with Node 20 |
| Docker | ≥ 24 | `docker --version` | Docker Desktop, or Docker Engine on Linux |
| Docker Compose | ≥ 2.20 | `docker compose version` | Bundled with Docker Desktop |

> **Node 20, not 22 or 18.** Node 20 is the current LTS line and matches the rest of the monorepo. Mixing major versions across services in one repo produces build failures that look like application bugs.

---

## 4. Environment variables

Every variable is validated at startup. **A misconfigured service refuses to start rather than accepting traffic it cannot serve** — a container that fails its health check immediately is far easier to diagnose than one that starts fine and returns errors under load.

### 4.1 `apps/resume-parsing-service/.env.example`

```bash
# ── Runtime ──────────────────────────────────────────────
NODE_ENV=development
PORT=3002
LOG_LEVEL=debug

# ── Service-to-service auth ──────────────────────────────
# Shared secret presented by user-service on every request.
# Generate with: openssl rand -hex 32
# Rotate quarterly. Never commit a real value.
SERVICE_AUTH_TOKEN=replace_me_with_a_32_byte_hex_secret

# ── Limits ───────────────────────────────────────────────
MAX_FILE_BYTES=5242880          # 5 MB
REQUEST_DEADLINE_MS=25000       # sits inside the caller's 30s budget
TEXT_EXTRACTION_TIMEOUT_MS=5000
MODEL_TIMEOUT_MS=10000
MODEL_MAX_ATTEMPTS=2            # 1 initial attempt + 1 retry

# ── Extraction gate ──────────────────────────────────────
# The caller enforces this floor. We echo it for observability.
CONFIDENCE_THRESHOLD=0.7

# ── Document length ──────────────────────────────────────
# Above MAX: truncate at a paragraph boundary keeping the head,
#   and set meta.truncated so the caller can tell the talent.
# Above HARD_REJECT: not a resume. Reject with 422 and never
#   call the model — rejecting is cheaper and more honest than
#   extracting the first 8% of a thesis.
MAX_EXTRACTED_CHARS=150000      # ~40k tokens, past a 50-page academic CV
HARD_REJECT_CHARS=500000
```

### 4.2 Reference

| Variable | Type | Default | Purpose |
|---|---|---|---|
| `NODE_ENV` | enum | — | `development` · `test` · `staging` · `production`. Controls log formatting and the production stub guard |
| `PORT` | integer | `3002` | HTTP listen port. `3002` avoids `user-service` on `3000` and the frontend on `3001` |
| `LOG_LEVEL` | enum | `info` | `fatal` … `trace`. Use `debug` locally, `info` in production |
| `SERVICE_AUTH_TOKEN` | string, ≥ 32 chars | — | Shared secret. **The only credential this service holds until Doc 05** |
| `MAX_FILE_BYTES` | integer | `5242880` | Must match the caller's limit. A mismatch means talent see one limit and hit another |
| `REQUEST_DEADLINE_MS` | integer | `25000` | Internal backstop, deliberately below the caller's 30 s |
| `TEXT_EXTRACTION_TIMEOUT_MS` | integer | `5000` | Deterministic extraction only — no network |
| `MODEL_TIMEOUT_MS` | integer | `10000` | Per model attempt |
| `MODEL_MAX_ATTEMPTS` | integer | `2` | One retry. Raising this can break the deadline arithmetic — see §4.4 |
| `CONFIDENCE_THRESHOLD` | decimal | `0.7` | Echoed to the caller. Tunable after the first 100 production uploads |
| `MAX_EXTRACTED_CHARS` | integer | `150000` | Truncation ceiling. Deliberately generous — past a 50-page academic CV. Above it, truncate and **flag**; never truncate silently |
| `HARD_REJECT_CHARS` | integer | `500000` | Above this, reject as `422` **without a model call**. A document this long is not a resume, and this also blocks a cheap cost-inflation attack |

### 4.3 Create your local file

```bash
cd apps/resume-parsing-service
cp .env.example .env

# generate a real token and paste it into .env
openssl rand -hex 32
```

Confirm `.env` is ignored before your first commit:

```bash
git check-ignore -v apps/resume-parsing-service/.env
```

If that prints nothing, **stop and add `.env` to `.gitignore`.** A committed secret has to be treated as compromised and rotated, which is a bad first day.

### 4.4 The timeout arithmetic

The worst case must fit inside the deadline:

```
TEXT_EXTRACTION_TIMEOUT_MS + (MODEL_TIMEOUT_MS × MODEL_MAX_ATTEMPTS) < REQUEST_DEADLINE_MS
5000 + (10000 × 2) = 25000  →  must be < 25000
```

Defaults sit exactly at the boundary, so **config validation requires strictly less**. Verify the guard works:

```bash
MODEL_TIMEOUT_MS=20000 npm run start:dev
```

Expect a startup failure naming the conflict. If it starts, the validation from Doc 03 §4.2 is not wired up.

> **Why this guard earns its place.** Someone will raise `MODEL_TIMEOUT_MS` to debug a slow provider and unknowingly push the worst case past the deadline. That surfaces as intermittent `504`s under load — one of the more miserable things to diagnose, because it only appears when the provider is already misbehaving.

---

## 5. Running locally

### 5.1 Install and start

```bash
# from the monorepo root
npm install

# from apps/resume-parsing-service
npm run start:dev
```

Expected output:

```
[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG [InstanceLoader] ConfigModule dependencies initialized
[Nest] LOG [RoutesResolver] ParsingController {/v1/parse}
[Nest] LOG [RoutesResolver] HealthController {/health}
[Nest] LOG [NestApplication] Nest application successfully started
```

### 5.2 `package.json` scripts

`apps/resume-parsing-service/package.json`:

```json
{
  "name": "@marketeq/resume-parsing-service",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,test}/**/*.ts\" --fix",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:cov": "vitest run --coverage",
    "docker:build": "docker build -t resume-parsing-service:local -f Dockerfile ../..",
    "docker:run": "docker run --rm -p 3002:3002 --env-file .env resume-parsing-service:local"
  }
}
```

> **`docker:build` passes `../..` as the build context.** In a monorepo the Dockerfile needs the root `package.json` and lockfile, which sit two levels above this service. Building from the service directory alone produces a confusing "lockfile not found" error.

### 5.3 Confirm it works

```bash
curl -i http://localhost:3002/health/live
# HTTP/1.1 200 OK
# {"status":"ok"}

curl -i http://localhost:3002/health/ready
# HTTP/1.1 200 OK
# {"status":"ok","info":{"memory_heap":{"status":"up"}},...}
```

Neither requires a token. That is deliberate — your orchestrator has no credentials, and these endpoints expose nothing beyond up or down.

---

## 6. Health endpoints

Two endpoints with genuinely different jobs. Wiring the same check to both is a common mistake that causes restart loops under load.

| Endpoint | Question | On failure | Auth |
|---|---|---|---|
| `/health/live` | Is the process alive? | **Restart the container** | None |
| `/health/ready` | Can this instance take work? | **Remove from the load balancer**, do not restart | None |

### 6.1 Why they must differ

Under heavy load, heap usage climbs and this instance should stop receiving new requests — but restarting it would kill the requests already in flight and make the situation worse. Readiness says "not now"; liveness says "this process is broken."

`/health/live` therefore checks nothing at all. If the HTTP server can answer, the process is alive by definition. Adding dependency checks to liveness is how a provider outage turns into a restart loop across your whole fleet.

### 6.2 Readiness checks

| Check | Threshold | Why |
|---|---|---|
| Heap usage | < 400 MB | This service buffers 5 MB documents. Sustained high heap means requests are queueing |

**No model provider check.** Tempting, but wrong: a provider blip would drain every instance simultaneously and take the service fully offline, when it should instead return `503` per request and let the caller retry. Never make a dependency's availability a condition of your own readiness unless you genuinely cannot serve anything without it.

### 6.3 Orchestrator configuration

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3002
  initialDelaySeconds: 10
  periodSeconds: 30
  timeoutSeconds: 3
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3002
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: 2
```

> **Liveness is checked less often and tolerates more failures than readiness.** Being removed from the pool is cheap and reversible; being restarted is not. The thresholds should reflect that asymmetry.

---

## 7. Docker

### 7.1 `apps/resume-parsing-service/Dockerfile`

Multi-stage. The final image contains no source, no build tools and no dev dependencies.

```dockerfile
# syntax=docker/dockerfile:1.7

# ─────────────────────────────────────────────────────────
# Stage 1 — dependencies
# Installs everything, including dev deps needed to compile.
# ─────────────────────────────────────────────────────────
FROM node:20.11-alpine AS deps

WORKDIR /repo

# Copy manifests only. Docker caches this layer, so dependencies are
# reinstalled only when a manifest changes — not on every source edit.
COPY package.json package-lock.json ./
COPY apps/resume-parsing-service/package.json ./apps/resume-parsing-service/

# `npm ci` installs exactly what the lockfile specifies. Never use
# `npm install` in a build: it can silently resolve different versions
# and produce an image that does not match what was tested.
RUN npm ci --workspace=@marketeq/resume-parsing-service --include-workspace-root


# ─────────────────────────────────────────────────────────
# Stage 2 — build
# ─────────────────────────────────────────────────────────
FROM node:20.11-alpine AS build

WORKDIR /repo

COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/resume-parsing-service/node_modules ./apps/resume-parsing-service/node_modules
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/resume-parsing-service ./apps/resume-parsing-service

WORKDIR /repo/apps/resume-parsing-service
RUN npm run build

# Strip dev dependencies from the tree we are about to copy forward.
WORKDIR /repo
RUN npm prune --omit=dev --workspace=@marketeq/resume-parsing-service --include-workspace-root


# ─────────────────────────────────────────────────────────
# Stage 3 — runtime
# ─────────────────────────────────────────────────────────
FROM node:20.11-alpine AS runtime

# dumb-init makes PID 1 forward signals correctly. Without it, Node runs as
# PID 1, ignores SIGTERM by default, and your orchestrator waits out the full
# termination grace period on every single deploy.
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production \
    PORT=3002 \
    NODE_OPTIONS="--max-old-space-size=512"

WORKDIR /app

# node:alpine ships a `node` user (uid 1000). Use it rather than creating one.
COPY --from=build --chown=node:node /repo/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/apps/resume-parsing-service/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/apps/resume-parsing-service/dist ./dist
COPY --from=build --chown=node:node /repo/apps/resume-parsing-service/package.json ./

# Never run as root. A container escape from an unprivileged process is
# meaningfully harder than one from root.
USER node

EXPOSE 3002

# Container-level health check, independent of the orchestrator's probes.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3002/health/live',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
```

### 7.2 `apps/resume-parsing-service/.dockerignore`

```
node_modules
dist
coverage
.env
.env.*
!.env.example
*.log
.git
.github
.vscode
.idea
**/*.spec.ts
**/*.e2e-spec.ts
test
README.md
Dockerfile
.dockerignore
```

> **`.env` on the first line matters.** Without it, your real secret is baked into an image layer and travels to every registry that image is pushed to. Layer contents are readable by anyone who can pull the image.

### 7.3 Build and run

```bash
# from apps/resume-parsing-service
npm run docker:build
npm run docker:run
```

Verify:

```bash
curl -i http://localhost:3002/health/live
docker ps --format 'table {{.Names}}\t{{.Status}}'   # STATUS should show (healthy)
```

The image should land around 180–220 MB. Substantially larger usually means dev dependencies survived — check that `npm prune` ran in stage 2.

### 7.4 `apps/resume-parsing-service/docker-compose.yml`

For local work and for other services to depend on.

```yaml
services:
  resume-parsing-service:
    build:
      context: ../..
      dockerfile: apps/resume-parsing-service/Dockerfile
    image: resume-parsing-service:local
    container_name: resume-parsing-service
    ports:
      - "3002:3002"
    env_file:
      - .env
    environment:
      NODE_ENV: development
      LOG_LEVEL: debug
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://127.0.0.1:3002/health/live',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
    restart: unless-stopped
    # Stateless: nothing to persist, so nothing needs to be writable.
    read_only: true
    tmpfs:
      - /tmp
    security_opt:
      - no-new-privileges:true
    deploy:
      resources:
        limits:
          memory: 768M
          cpus: "1.0"
        reservations:
          memory: 256M
```

```bash
docker compose up --build
docker compose down
```

> **`read_only: true` is a real safety property here, not decoration.** The service has no legitimate reason to write to disk. If a bug or an exploit tries to, the write fails instead of succeeding quietly. Only `/tmp` is writable, as a tmpfs that vanishes on restart.

### 7.5 Memory sizing

| Setting | Value | Reasoning |
|---|---|---|
| `--max-old-space-size` | 512 MB | Node's heap ceiling |
| Container limit | 768 MB | Heap plus buffers, plus headroom |
| Readiness threshold | 400 MB | Sheds load before the heap ceiling is reached |

The gap between 400 and 512 is deliberate: readiness fails *before* the process is in trouble, so the instance leaves the pool rather than being OOM-killed mid-request.

---

## 8. Graceful shutdown

On deploy the orchestrator sends `SIGTERM`. This service should finish its in-flight parses and then exit.

`apps/resume-parsing-service/src/main.ts` — the relevant line:

```ts
// Lets Nest run shutdown hooks on SIGTERM/SIGINT instead of dying instantly.
app.enableShutdownHooks();
```

The sequence:

1. `SIGTERM` arrives.
2. Readiness starts failing, so the load balancer stops sending new work.
3. In-flight requests continue — bounded by `REQUEST_DEADLINE_MS`, so at most 25 seconds.
4. The process exits.

**Set the termination grace period above the deadline** — 30 seconds is right for a 25-second deadline. A shorter grace period means every deploy kills real parses mid-flight and produces `parse_failed` errors that look like a service defect.

Verify locally:

```bash
docker compose up -d
docker compose stop -t 30 resume-parsing-service
docker compose logs resume-parsing-service | tail -20
```

You should see a clean shutdown, not an abrupt termination.

---

## 9. Supabase and databases

**This service does not connect to Supabase, PostgreSQL, or any database.** It has no client library, no connection string, no migrations and no ORM.

### 9.1 Why not

The platform runs on Supabase and most services connect to it, so its absence here is worth explaining rather than leaving as an apparent oversight.

This service does exactly one thing: take a document, return JSON. Everything durable in this feature — the resume record, versions, parse results, the sync audit — belongs to `user-service`, which already owns that schema and the talent relationship. Giving this service database access would mean:

- **A second writer to tables `user-service` owns**, which is how invariants get broken quietly.
- **Database credentials in a service that processes untrusted input.** This service reads arbitrary documents from the internet. It is the *last* place in the platform that should hold a database connection string.
- **A stateful service** — losing the disposability that makes it trivial to scale and deploy.

### 9.2 What "no database" actually forbids

| Not permitted | Where it belongs |
|---|---|
| Supabase client of any kind | `user-service` |
| Any connection string in configuration | `user-service` |
| Storing a document, even temporarily on disk | `user-service` |
| Caching parse results | Ruled out for MVP entirely |
| A queue, job table, or scheduler | `user-service` |

### 9.3 If you think you need one

You almost certainly do not. Work through this first:

| You want to… | Do this instead |
|---|---|
| Cache repeat parses | Nothing. Ruled out for MVP — one upload per talent makes repeats rare |
| Store the document for retry | The caller retries by re-sending. It already holds the file |
| Track request history | Structured logs, keyed by correlation ID |
| Rate limit per talent | The caller does this. We never learn which talent a document belongs to |
| Store prompt versions | Version them in source control, deployed with the code |

**If none of those fit, you have found a genuine design gap** — raise it rather than adding a database. Statelessness is the property this service is built around, and giving it up should be a deliberate architectural decision with a written rationale, not a quiet import.

---

## 10. Ports and networking

### 10.1 Port allocation

| Service | Port |
|---|---|
| `user-service` | 3000 |
| Frontend | 3001 |
| **`resume-parsing-service`** | **3002** |

### 10.2 This service must never be publicly routable

Its only legitimate caller is `user-service` on the internal network.

| Layer | Requirement |
|---|---|
| Ingress | **No public route.** Not behind auth — absent from the routing table entirely |
| Network policy | Ingress permitted only from `user-service` |
| Load balancer | Internal only |
| DNS | Internal name only |

**The shared-secret token is the second line of defence, not the first.** If this service is publicly reachable, an attacker can send arbitrary documents to a model provider on your account and bill you for it — even without a valid token, they can probe the endpoint and consume connection capacity. Network isolation is what actually protects you; the token protects against a compromised neighbour inside the perimeter.

### 10.3 Local Docker networking

When both services run in Compose, `user-service` reaches this one by service name:

```bash
RESUME_PARSING_SERVICE_URL=http://resume-parsing-service:3002
```

Not `localhost` — inside a container, `localhost` is the container itself.

---

## 11. Logging

### 11.1 Format

| Environment | Format |
|---|---|
| `development` | Pretty-printed, single line, human-readable |
| everything else | Structured JSON |

### 11.2 The rule that matters

**Document content must never appear in a log line.** No name, no company, no skill, no extracted text, no raw model output.

A resume is personal data. A log aggregator is a long-retention, widely-readable system that is not designed to hold it. This is the easiest privacy mistake to make in this service and the hardest to undo — once personal data is in a retention system, removing it is an incident, not a fix.

**Log the shape, never the content:**

```ts
// Correct — counts and outcomes
logger.info({
  correlationId,
  documentType: result.document_type,
  isResume: result.is_resume,
  confidence: result.confidence,
  fileBytes: buffer.length,
  processingMs,
  counts: { skills: result.skills.length, workExperience: result.work_experience.length },
}, 'Parse completed');

// WRONG — never do this, not even at debug level
logger.debug({ extractedName: result.name, skills: result.skills }, 'Parse completed');
```

A `LOG_LEVEL=debug` line is still a log line. Debug output reaches the same aggregator the moment someone raises the level to investigate an incident.

### 11.3 Redaction is a safety net, not the control

`app.module.ts` redacts `authorization`, request bodies and response bodies. That protects against accidental inclusion by a framework or a library. **It does not protect against a field you deliberately logged** — redaction works on known paths, and `result.name` is not one of them.

The control is the discipline in §11.2. Redaction catches what the discipline misses.

---

## 12. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Invalid configuration:` at startup | A variable is missing or malformed | The message names the variable. Compare `.env` with `.env.example` |
| `worst-case processing time … exceeds REQUEST_DEADLINE_MS` | Timeout arithmetic broken | See §4.4. Lower `MODEL_TIMEOUT_MS` or `MODEL_MAX_ATTEMPTS` |
| `ExtractionStub must not be used in production` | `NODE_ENV=production` before Doc 05 is done | Correct. Use `development` until the pipeline exists |
| `EADDRINUSE :::3002` | Port already taken | `lsof -i :3002` then kill it, or change `PORT` |
| Docker build: `npm ci` cannot find lockfile | Built from the wrong directory | Build context must be the monorepo root — see §5.2 |
| Container shows `(unhealthy)` | Health check failing | `docker logs resume-parsing-service`. Usually a config failure at boot |
| Image is 800 MB+ | Dev dependencies survived | Confirm `npm prune --omit=dev` ran in stage 2 |
| `SIGTERM` kills requests instantly | `enableShutdownHooks()` missing, or grace period too short | See §8 |
| Container cannot write a file | `read_only: true` | Correct behaviour. This service should not write to disk — see §9 |
| `401` on every request | Token mismatch between caller and service | Compare `SERVICE_AUTH_TOKEN` on both sides |

---

## 13. Definition of done

- [ ] `npm run start:dev` starts cleanly with no errors
- [ ] Removing any variable from `.env` prevents startup, with the variable named in the message
- [ ] `MODEL_TIMEOUT_MS=20000` prevents startup with the deadline-arithmetic error
- [ ] `/health/live` returns `200` without a token
- [ ] `/health/ready` returns `200` without a token
- [ ] `npm run docker:build` succeeds
- [ ] `npm run docker:run` serves both health endpoints
- [ ] `docker ps` shows `(healthy)` within 30 seconds
- [ ] Image is under 250 MB
- [ ] Container runs as `node`, not root — verify with `docker exec resume-parsing-service whoami`
- [ ] `docker compose stop -t 30` shuts down cleanly
- [ ] `.env` is git-ignored — `git check-ignore -v apps/resume-parsing-service/.env` prints a match
- [ ] No database client, connection string or migration exists anywhere in the service
- [ ] No log line contains extracted document content

---

## 14. What comes next

| Doc | Adds |
|---|---|
| **02 — Folder Structure & Bootstrapping** | The full source tree, module wiring, `main.ts`, config validation |
| **03 — DTOs & Extraction JSON Schema** | Request and response types, the runtime schema, per-field semantics |
| **04 — API Endpoints** | `POST /v1/parse`, rejection shapes, error codes, the caller contract |
| **05 — Integrations** | The model client, the prompt, retry and token limits, fallback |
| **06 — Observability** | Metrics, parse and rejection rates, latency, token spend |
| **07 — QA & Test Data** | Fixture corpus and the contract test suite |

> **The full series is complete.** Docs 02 (Folder Structure), 03 (DTOs & Schema), 04 (API Endpoints), 05 (Integrations), 06 (Observability) and 07 (QA & Test Data) all exist as separate documents, all on `npm`.
