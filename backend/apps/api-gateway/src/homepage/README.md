# Homepage Module — Implementation Status

## Overview

The homepage module assembles a fully dynamic, CMS-driven landing page payload via `GET /homepage`. It fetches configuration from Payload CMS, listings from listings-service, talent profiles from user-service, and caches assembled responses in Redis with event-driven invalidation via RabbitMQ.

## Architecture

```
Browser → API Gateway (/homepage) → HomepageService
                                      ├── CMS Service (Homepages collection, HomepageBanner global)
                                      ├── Listings Service (/v1/projects, /v1/services)
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
| `homepage.types.ts` | Shared types: ProjectCard, ServiceCard, TalentCard, sections, blocks, payload |
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
- [x] **ProjectCard** — id, title, slug, description, thumbnail, budget, duration, categories, skills, tags
- [x] **ServiceCard** — id, title, slug, description, thumbnail, priceMin/Max, deliveryTime, categories, skills, tags
- [x] **TalentCard** — id, username, firstName, lastName, avatarUrl, title, location, rateMin/Max, skills
- [x] Description truncation — capped at 120 chars with ellipsis

### Sections & Blocks
- [x] 8 default sections (Our Favorites, Newest, Most Popular, + 5 themed carousels)
- [x] Block types: `grid` and `carousel`
- [x] Block entities: `projects`, `services`, and `talent`
- [x] Pagination metadata per block (page, pageSize, totalPages, hasMore)
- [x] Carousel guard — downgrade to grid when items < gridSize × 3

### Evaluator Scoring (`homepage.evaluator.ts`)
- [x] `newest` — pure chronological (createdAt DESC)
- [x] `top_rated` — rating 40%, completions 15%, revenue 15%, CTR 10%, boost 10%, health 10%
- [x] `trending` — CTR 40%, impressions 30%, recency 30%
- [x] `most_popular` — completions 40%, views_90d 35%, recency 15%, boost 10%
- [x] Pool-relative normalization (scores relative to current pool max)
- [x] Graceful fallback when scoring fields unavailable (uses recency + proxy signals from budget, skills, thumbnail)
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

### Frontend
- [x] `service/http/homepage.ts` — API client (`HomepageAPI.getHomepage()`)
- [x] `types/homepage.ts` — full TypeScript types matching backend (ProjectCard, ServiceCard, TalentCard, HomepagePayload)

## What's NOT Implemented (Deferred)

### Needs Upstream Services
| Feature | Blocked By |
|---------|-----------|
| Team cards (entity: teams) | No team listing endpoint in listings-service or user-service |
| Rating, reviewCount, views90d, completionsCount on project/service cards | Fields not yet in listings-service Project/Service entities — evaluator uses proxy signals until then |

### Frontend Integration
| Feature | Notes |
|---------|-------|
| Frontend page doesn't call HomepageAPI | `page.tsx` uses hardcoded seed data with `useFeaturedProjects` hook. Replace with `HomepageAPI.getHomepage()` when ready |
| SSR with cookie forwarding | Frontend needs to forward `mktq_hp_variant` cookie during server-side rendering |
| Banner rendering | Frontend component needed to render the promotional banner from API response |
| TalentCard component | Frontend card component for displaying talent profiles in sections |

### Operational
| Feature | Notes |
|---------|-------|
| Unit/integration tests | Deferred pending service stability |
| Metrics & structured logging | Prometheus/Datadog not wired; basic NestJS Logger in place |
| Health endpoint for homepage module | API-wide `/health` exists at gateway level |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LISTINGS_SERVICE_URL` | No | `http://localhost:3004` | Listings service base URL |
| `USER_SERVICE_URL` | No | `http://localhost:3002` | User service base URL (talent profiles) |
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
   ├── Listings: GET /v1/projects
   ├── Listings: GET /v1/services
   └── User: GET /talent/users

4. For each section:
   ├── Extract pinned items (if manualEnabled)
   ├── Filter pool (category, dedup)
   ├── Score + rank via evaluator (kind)
   ├── Merge: pinned first + evaluated remaining
   ├── Apply carousel guard
   └── Build block with pagination

5. Return assembled HomepagePayload
```
