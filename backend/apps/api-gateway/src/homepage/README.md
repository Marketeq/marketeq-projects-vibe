# Homepage Module — Implementation Status

## Overview

The homepage module assembles a fully dynamic, CMS-driven landing page payload via `GET /homepage`. It fetches configuration from Payload CMS, listings from listings-service (projects, services, teams), talent profiles from user-service, and caches assembled responses in Redis with event-driven invalidation via RabbitMQ.

## Architecture

```
Browser → API Gateway (/homepage) → HomepageService
                                      ├── CMS Service (Homepages collection, HomepageBanner global)
                                      ├── Listings Service (/v1/projects, /v1/services, /v1/teams)
                                      ├── User Service (/talent/users)
                                      └── Redis (cache layer)

CMS Admin saves homepage → afterChange hook → RabbitMQ (homepage.saved)
                                                  ↓
                              HomepageConsumer → invalidateCache() → Redis DEL hp:home:*
```

## Files

| File | Purpose |
|------|---------|
| `homepage.controller.ts` | `GET /homepage` — parses preview query, variant cookie |
| `homepage.service.ts` | Assembly orchestrator: CMS fetch, listings fetch, caching, banner, A/B resolution, pinned items |
| `homepage.evaluator.ts` | Scoring blends: top_rated, trending, most_popular, newest with pool-relative normalization |
| `homepage.consumer.ts` | RabbitMQ consumer — invalidates Redis cache on CMS publish/delete events |
| `homepage.types.ts` | Shared types: ProjectCard, ServiceCard, TeamCard, TalentCard, ScoringFields, sections, blocks, payload |
| `homepage.config.ts` | Static defaults — fallback when CMS is unavailable or not yet configured |
| `homepage.module.ts` | NestJS module registration |

## What's Implemented

### API Endpoint
- [x] `GET /homepage` — public, no auth required
- [x] `?preview=1` + `x-preview-token` header — bypasses cache, fetches draft, returns 403 on invalid token
- [x] `mktq_hp_variant` cookie — A/B test variant resolution from CMS

### Response Structure
- [x] `title`, `slug`, `status` — document metadata from CMS (or defaults)
- [x] `hero` — headline, subheadline, backgroundImage, ctaLabel, ctaUrl
- [x] `banner` — from CMS HomepageBanner global (null when disabled/expired)
- [x] `sections[]` — ordered array of content sections with blocks
- [x] `popularTabs[]` — category tabs (name, slug, iconUrl)
- [x] `moreCategoriesList[]` — category tile grid
- [x] `talentNetworkCta` — headline, description, ctaLabel, ctaUrl
- [x] `footerNav[]` — navigation columns with links
- [x] `seo` — metaTitle, metaDescription, canonical, ogImage, noindex
- [x] `generatedAt` — ISO 8601 timestamp

### Card Types
- [x] **ProjectCard** — id, title, slug, description, thumbnail, budget, duration, categories, skills, tags + scoring fields
- [x] **ServiceCard** — id, title, slug, description, thumbnail, priceMin/Max, deliveryTime, categories, skills, tags + scoring fields
- [x] **TeamCard** — id, name, slug, logo, memberCount, rating, specializations, completedProjects
- [x] **TalentCard** — id, username, firstName, lastName, avatarUrl, title, location, rateMin/Max, skills
- [x] **ScoringFields** — rating, reviewCount, completionsCount, views90d, adminBoost, featured (on ProjectCard & ServiceCard)
- [x] Description truncation — capped at 120 chars with ellipsis

### Sections & Blocks
- [x] 9 default sections (Our Favorites, Newest, Most Popular, Top Teams, + 5 themed carousels)
- [x] Block types: `grid` and `carousel`
- [x] Block entities: `projects`, `services`, `teams`, and `talent`
- [x] Pagination metadata per block (page, pageSize, totalPages, hasMore)
- [x] Carousel guard — downgrade to grid when items < gridSize × 3

### Evaluator Scoring (`homepage.evaluator.ts`)
- [x] `newest` — pure chronological (createdAt DESC)
- [x] `top_rated` — rating 40%, completions 15%, revenue 15%, CTR 10%, boost 10%, health 10%
- [x] `trending` — CTR 40%, impressions 30%, recency 30%
- [x] `most_popular` — completions 40%, views_90d 35%, recency 15%, boost 10%
- [x] Pool-relative normalization (scores relative to current pool max)
- [x] Real scoring data flows from listings-service (rating, reviewCount, completionsCount, views90d, adminBoost, featured)
- [x] Graceful fallback when scoring fields are zero (uses recency + proxy signals from budget, skills, thumbnail)
- [x] 3× pool oversampling for ranking fidelity
- [x] Kind dispatched per block via `kind` field in section config

### Pinned Items (Hybrid Mode)
- [x] CMS: `manualEnabled` checkbox + `pinnedItems` relationship per section
- [x] Pinned items placed first, evaluator fills remaining `limit - pinnedCount` slots
- [x] Pinned IDs excluded from evaluator pool (no duplicates)
- [x] Conditional UI — pinnedItems field only shown when manualEnabled is true

### CMS Integration
- [x] Fetch homepage config from Payload CMS Homepages collection
- [x] A/B variant: query `status=testing` + matching `testGroup`, fall back to default
- [x] Preview: fetch `status=draft` content, validate `PREVIEW_SECRET`
- [x] Banner: fetch from HomepageBanner global, skip if disabled/expired
- [x] Graceful fallback: all CMS fields optional, static defaults used on error
- [x] SEO `noindex` forced for preview/draft content

### Caching (Redis)
- [x] Redis cache via ioredis with configurable TTL (`HOMEPAGE_CACHE_TTL`, default 300s)
- [x] Cache key: `hp:home:{variant|default}`
- [x] Cache-aside pattern (check → miss → assemble → write)
- [x] Preview mode bypasses cache entirely
- [x] Variant-specific cache keys (different content per A/B group)
- [x] Retry strategy with backoff, error handler for resilience

### Cache Invalidation (RabbitMQ)
- [x] `HomepageConsumer` on `api-gateway.homepage` queue
- [x] Listens for `homepage.saved` and `homepage.deleted` events
- [x] SCAN + DEL on `hp:home:*` pattern (clears all variants)
- [x] Validates event.slug before processing
- [x] Graceful: continues serving if Redis/RabbitMQ unavailable

### Deduplication
- [x] Global deduplication across all sections and entity types (single usedIds set)
- [x] Pinned items excluded from evaluator pool

### Sorting & Filtering
- [x] `sort: newest` — createdAt DESC
- [x] `sort: random` — shuffled
- [x] `kind` — dispatches to evaluator scoring (top_rated, trending, most_popular, newest)
- [x] `categoryFilter` — filters items by category slug (guarded for talent cards)

### CMS Collection (Homepages)
- [x] Full schema: hero, sections (blocks with entity/displayType/kind/limit/sort/categoryFilter, manualEnabled, pinnedItems), popularTabs, moreCategoriesList, talentNetworkCta, footerNav, seo
- [x] Status: draft / active / testing / archived
- [x] `isDefault` flag (single default homepage)
- [x] `testGroup` for A/B variant matching
- [x] `afterChange` / `afterDelete` hooks publish RabbitMQ events for cache invalidation

### Upstream Services (Previously Blocked — Now Implemented)
- [x] **Team cards** — TeamsModule registered in listings-service, `GET /v1/teams` endpoint live, TeamCard type + fetchTeams() in homepage service, "Top Rated Teams" section in default config
- [x] **Scoring fields** — `rating`, `reviewCount`, `completionsCount`, `views90d`, `adminBoost`, `featured` added to Project, Service, and Team entities in listings-service. Evaluator consumes real scoring data. Fields returned via cms-projects controller and services/teams controllers.

### Frontend (API Client & Types)
- [x] `service/http/homepage.ts` — API client (`HomepageAPI.getHomepage()`)
- [x] `types/homepage.ts` — full TypeScript types matching backend (ProjectCard, ServiceCard, TeamCard, TalentCard, ScoringFields, HomepagePayload)

### Frontend (SSR Page & Components)
- [x] **SSR page rewrite** — `page.tsx` is now a server component; fetches `GET /homepage` server-side with `next: { revalidate: 60 }`
- [x] **SSR cookie forwarding** — reads `mktq_hp_variant` cookie via `cookies()` and forwards to API gateway
- [x] **SEO from API** — `generateMetadata()` sets title, description, canonical, ogImage, noindex from `payload.seo`
- [x] **Dynamic hero** — renders headline, subheadline, backgroundImage, CTA from `payload.hero`
- [x] **Banner component** — dismissible banner with info/promo/warning styles, respects `expiresAt`
- [x] **Dynamic sections** — iterates `payload.sections[]`, renders each block as carousel or grid based on `block.type`
- [x] **Project card rendering** — maps ProjectCard fields to `ListingCard` (budget, duration, rating, reviewCount)
- [x] **Service card rendering** — maps ServiceCard fields (priceMin/Max, deliveryTime) to `ListingCard`
- [x] **Team card rendering** — maps TeamCard to `ListingCard` (kind="team", name, memberCount, specializations)
- [x] **Talent card rendering** — maps TalentCard to `ListingCard` (kind="talent", username, rate, skills)
- [x] **Compact grid cards** — `ListingCardCompact` used for grid blocks (project + service)
- [x] **More Categories** — renders from `payload.moreCategoriesList[]` as clickable tiles with hover states
- [x] **Null handling** — comprehensive checks per doc 09 Section 7 (hero, banner, sections, SEO all nullable)
- [x] **Error fallback** — shows "Homepage unavailable" message on API failure

## What's NOT Implemented (Deferred)

### Frontend (Minor Gaps)
| Feature | Notes |
|---------|-------|
| Preview mode UI | Backend supports `?preview=1`, but no frontend admin gate for triggering preview |
| Talent Network CTA section | `payload.talentNetworkCta` returned by API but not rendered as a standalone section — footer in layout handles this |
| Footer nav from API | `payload.footerNav` returned but footer is rendered by the layout component, not the homepage |
| `stale-while-revalidate` | Docs recommend SWR pattern; current implementation uses `next: { revalidate: 60 }` ISR instead |

### Testing & QA
| Feature | Notes |
|---------|-------|
| Unit tests (Jest) | No `.spec.ts` files for homepage module — target 80% service logic, 100% evaluator |
| Integration tests (e2e) | No `homepage.e2e-spec.ts` |
| Postman collection | Not provided |
| Test seed script | Manual SQL seeds exist, no automated `test/seed-homepage.ts` |
| CI/CD integration | No GitHub Actions workflow for homepage tests |

### Operational
| Feature | Notes |
|---------|-------|
| Performance metrics | No latency histograms, cache hit/miss ratios, or evaluator timings |
| Structured logging | Basic NestJS Logger in place; Prometheus/Datadog not wired |
| Health endpoint for homepage module | API-wide `/health` exists at gateway level, not module-specific |

## Local Development

### Required Services

| Service | Port | Purpose |
|---------|------|---------|
| api-gateway | 4000 | Homepage endpoint, proxy |
| listings-service | 3004 | `/v1/projects`, `/v1/services`, `/v1/teams` |
| user-service | 3003 | `/talent/users` |
| PostgreSQL | 5432 | Database (Docker: `marketeq-db`) |
| Frontend | 3000 | Next.js dev server |

Optional: Redis (caching), RabbitMQ (cache invalidation), CMS service (dynamic config)

### Quick Start

```bash
# Start PostgreSQL (if not running)
docker start marketeq-db

# Start backend services
cd backend
npx pm2 start ecosystem.config.js --only api-gateway,listings-service,user-service

# Start frontend
cd frontend
npm run dev

# Test homepage endpoint
curl http://localhost:4000/homepage | python3 -m json.tool
```

### Test Data

12 seed projects, 6 services, and 6 teams are in the database with scoring data (rating, views, completions). See `.claude/memory/services/homepage-service.md` for details.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LISTINGS_SERVICE_URL` | No | `http://localhost:3004` | Listings service base URL |
| `USER_SERVICE_URL` | No | `http://localhost:3003` | User service base URL (talent profiles) |
| `CMS_SERVICE_URL` | No | null (uses static defaults) | Payload CMS base URL |
| `REDIS_URL` | No | null (caching disabled) | Redis connection string |
| `PREVIEW_SECRET` | No | null (preview disabled) | Secret for preview token validation |
| `HOMEPAGE_CACHE_TTL` | No | `300` | Cache TTL in seconds |

## Data Flow

```
1. Controller receives GET /homepage
   ├── Parses ?preview=1, x-preview-token, mktq_hp_variant cookie
   └── Calls HomepageService.getHomepage({ variant, preview, previewToken })

2. Service checks preview mode
   ├── If preview: validate token → assemble fresh (no cache)
   └── If normal: check Redis cache → on miss, assemble + cache

3. Assembly (parallel fetches):
   ├── CMS: Homepages collection (variant → default → any active)
   ├── CMS: HomepageBanner global
   ├── Listings: GET /v1/projects (with scoring fields)
   ├── Listings: GET /v1/services (with scoring fields)
   ├── Listings: GET /v1/teams (with scoring fields)
   └── User: GET /talent/users

4. For each section:
   ├── Extract pinned items (if manualEnabled)
   ├── Filter pool (entity type, category, dedup)
   ├── Score + rank via evaluator (kind) using real scoring data
   ├── Merge: pinned first + evaluated remaining
   ├── Apply carousel guard
   └── Build block with pagination

5. Return assembled HomepagePayload
```
