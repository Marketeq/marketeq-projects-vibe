# Offer Service

Microservice for the Marketeq offer negotiation system. Handles the full lifecycle of offers between clients and talent — creation, counter-offers, acceptance, decline, withdrawal, expiry, and resend — with real-time updates via Ably and event-driven messaging via RabbitMQ.

## Architecture

- **Framework:** NestJS (monorepo at `apps/offer-service`)
- **Database:** PostgreSQL 16 — `offer_db`, schema `offer_service`
- **Cache / Idempotency:** Redis 7
- **Messaging:** RabbitMQ 3 — topic exchange `marketeq.offers`, 3 consumer queues + 3 DLQs
- **Real-time:** Ably REST — per-offer channels, subscribe-only frontend tokens
- **Auth:** RS256 JWT via shared `@libs/auth`

## Port

`3023` (HTTP)

## Database Tables

| Table | Description |
|-------|-------------|
| `offers` | Primary offer records — 6 statuses (PENDING, ACCEPTED, DECLINED, WITHDRAWN, EXPIRED, COUNTERED) |
| `counter_offers` | Counter offer records — 6 statuses (PENDING, ACCEPTED, DECLINED, WITHDRAWN, EXPIRED, SUPERSEDED) |
| `offer_history` | Immutable audit log of all state changes |
| `outbox` | Transactional outbox for reliable event publishing |

## API Routes (17 endpoints + 2 health)

### Offers (`/v1/offers`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/v1/offers` | JWT | CLIENT | Create offer (validates listing via listings-service) |
| GET | `/v1/offers/:id` | JWT | Party | Get offer details |
| PATCH | `/v1/offers/:id` | JWT | CLIENT | Edit pending offer |
| POST | `/v1/offers/:id/accept` | JWT | TALENT | Accept offer (CAS: PENDING→ACCEPTED) |
| POST | `/v1/offers/:id/decline` | JWT | TALENT | Decline offer with reason |
| POST | `/v1/offers/:id/withdraw` | JWT | CLIENT | Withdraw offer (from PENDING or COUNTERED) |
| POST | `/v1/offers/:id/resend` | JWT | CLIENT | Resend terminal offer as new |
| GET | `/v1/offers/:id/history` | JWT | Party | Get negotiation history |
| GET | `/v1/offers/:id/ably-token` | JWT | Party | Get scoped Ably token for real-time |

### Counter Offers (`/v1/offers/:offerId/counter-offers`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `.../counter-offers` | JWT | Party | Submit counter offer |
| GET | `.../counter-offers/:id` | JWT | Party | Get counter offer |
| PATCH | `.../counter-offers/:id` | JWT | Submitter | Edit pending CO |
| POST | `.../counter-offers/:id/accept` | JWT | Non-submitter | Accept CO (both CO + offer → ACCEPTED) |
| POST | `.../counter-offers/:id/decline` | JWT | Non-submitter | Decline CO (offer restored to PENDING) |
| POST | `.../counter-offers/:id/withdraw` | JWT | Submitter | Withdraw CO (offer restored to PENDING) |

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/v1/health` | None | Liveness probe |
| GET | `/v1/ready` | None | Readiness probe (DB, Redis, RabbitMQ, Ably) |

## Key Features

### State Machine (OS-25)
All state transitions use atomic **Compare-And-Swap** (CAS): `UPDATE ... WHERE status = $expected RETURNING *`. Zero rows = 409 Conflict. No TOCTOU races.

### Active Offer Enforcement (OS-28)
One active offer (PENDING or COUNTERED) per client-talent pair. Enforced at application level before INSERT. Returns 409 with `activeOfferId` of the blocking offer.

### Transactional Outbox (OS-21)
All events written atomically inside the DB transaction. Background `OutboxProcessor` polls every 10s, publishes to RabbitMQ with confirm, and retries with exponential backoff (2^n minutes, max 10 retries).

### Real-time via Ably (OS-23)
Server publishes `offer.updated` events after every state change. Frontend gets scoped subscribe-only tokens via `GET /v1/offers/:id/ably-token`. Channel pattern: `offer:{offerId}`.

### TTL & Expiry (OS-26)
14-day TTL on offers and COs. `ExpiryProcessor` runs every 60s with `SELECT FOR UPDATE SKIP LOCKED`. `WarningProcessor` sends 48h warnings every 5 min. Warning resets on TTL reset (edit, CO, resend).

### Rate Warning (OS-27)
Advisory flag on CO creation. Talent CO: warns if rate >25% above offer. Client CO: warns if rate >20% below offer. Never blocks — just flags.

### Listings Integration (OS-29)
Offer creation validates the `jobListingId` against the real listings-service (`GET /v1/job-listings/:id`). Checks: exists, status is `published`, belongs to the client. Forwards the client's JWT for auth.

## RabbitMQ Events (14 event types)

`offer.created`, `offer.accepted`, `offer.declined`, `offer.withdrawn`, `offer.expired`, `offer.expiring_soon`, `offer.edited`, `offer.countered`, `offer.counter_accepted`, `offer.counter_declined`, `offer.counter_withdrawn`, `offer.counter_edited`, `offer.counter_expired`, `offer.resent`

All published to topic exchange `marketeq.offers`. Consumed by 3 queues: `contracts` (accepted events), `notifications` (all events via `offer.#`), `messaging` (subset).

## Environment Variables

Key variables (see `src/config/validation.schema.ts` for full list with defaults):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `AUTH_JWT_PUBLIC_KEY` | Yes | — | RS256 public key for JWT validation |
| `REDIS_HOST` | No | `localhost` | Redis hostname |
| `RABBITMQ_URL` | No | `amqp://guest:guest@localhost:5672` | RabbitMQ connection |
| `ABLY_API_KEY` | No | `''` | Ably API key (stub mode when empty) |
| `LISTINGS_SERVICE_URL` | No | `http://localhost:3004` | Listings service URL |
| `LISTINGS_VALIDATION_ENABLED` | No | `true` | Set `false` to skip listing validation |

## Running Locally

```bash
# From monorepo root
npm run build offer-service
docker compose up -d offer-service

# Verify
curl http://localhost:3023/v1/health
curl http://localhost:3023/v1/ready
```

## Tests

```bash
cd apps/offer-service

# Unit tests (71 tests)
npx jest --testPathPatterns="spec" --verbose

# Smoke tests
cd /path/to/monorepo
bash infrastructure/scripts/smoke-tests.sh http://localhost:3023
```

## Migrations

```bash
# Run migrations
npx ts-node -r tsconfig-paths/register src/config/typeorm.config.ts migration:run

# Or via CLI entry point
node dist/apps/offer-service/src/cli.js migration:run
```

## File Count

- **89 source files** (`src/`)
- **18 test files** (`test/`)
- **2 migrations**
- **19 routes**

## Spec Documents Implemented

OS-08 through OS-39 (32 documents total — 28 with backend code, 4 reference-only).