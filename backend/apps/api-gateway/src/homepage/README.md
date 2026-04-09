# Homepage Module — Implementation Status

## Overview

The homepage module assembles a fully dynamic, CMS-driven landing page payload via `GET /homepage`. It fetches configuration from Payload CMS, listings from listings-service, and caches assembled responses in Redis with event-driven invalidation via RabbitMQ.

## Architecture

```
Browser → API Gateway (/homepage) → HomepageService
                                      ├── CMS Service (Homepages collection, HomepageBanner global)
                                      ├── Listings Service (/v1/projects, /v1/services)
                                      └── Redis (cache layer)

CMS Admin saves homepage → afterChange hook → RabbitMQ (homepage.saved)
                                                  ↓
                              HomepageConsumer → invalidateCache() → Redis DEL hp:home:*
```

## Files

| File | Purpose |
|------|---------|
| `homepage.controller.ts` | `GET /homepage` — parses preview, variant cookie |
| `homepage.service.ts` | Assembly, CMS fetch, caching, banner, A/B resolution |
| `homepage.evaluator.ts` | Scoring blends: top_rated, trending, most_popular, newest |
| `homepage.consumer.ts` | RabbitMQ consumer for cache invalidation |
| `homepage.types.ts` | Shared types: cards, sections, blocks, payload |
| `homepage.config.ts` | Static defaults (fallback when CMS unavailable) |
| `homepage.module.ts` | NestJS module registration |

## What's Implemented

### API Endpoint
- [x] `GET /homepage` — public, no auth required
- [x] `?preview=1` + `x-preview-token` header — bypasses cache, fetches draft, returns 403 on invalid token
- [x] `mktq_hp_variant` cookie — A/B test variant resolution from CMS

### Response Structure
- [x] `title`, `slug`, `status` — document metadata
- [x] `hero` — headline, subheadline, backgroundImage, ctaLabel, ctaUrl
- [x] `banner` — from CMS HomepageBanner global (null when disabled/expired)
- [x] `sections[]` — ordered array of content sections with blocks
- [x] `popularTabs[]` — category tabs (name, slug, iconUrl)
- [x] `moreCategoriesList[]` — category tile grid
- [x] `talentNetworkCta` — headline, description, ctaLabel, ctaUrl
- [x] `footerNav[]` — navigation columns with links
- [x] `seo` — metaTitle, metaDescription, canonical, ogImage, noindex
- [x] `generatedAt` — ISO 8601 timestamp

### Sections & Blocks
- [x] 8 default sections (Our Favorites, Newest, Most Popular, + 5 themed carousels)
- [x] Block types: `grid` and `carousel`
- [x] Block entities: `projects` and `services`
- [x] Pagination metadata per block (page, pageSize, totalPages, hasMore)
- [x] Carousel guard — downgrade to grid when items < gridSize × 3
- [x] Description truncation — capped at 120 chars with ellipsis

### Evaluator Scoring (homepage.evaluator.ts)
- [x] `newest` — pure chronological (createdAt DESC)
- [x] `top_rated` — rating 40%, completions 15%, revenue 15%, CTR 10%, boost 10%, health 10%
- [x] `trending` — CTR 40%, impressions 30%, recency 30%
- [x] `most_popular` — completions 40%, views_90d 35%, recency 15%, boost 10%
- [x] Pool-relative normalization (scores relative to current pool max)
- [x] Graceful fallback when scoring fields unavailable (uses recency + proxy signals)
- [x] 3× pool oversampling for ranking fidelity

### Pinned Items (Hybrid Mode)
- [x] CMS: `manualEnabled` checkbox + `pinnedItems` relationship per section
- [x] Pinned items placed first, evaluator fills remaining slots
- [x] Pinned IDs excluded from evaluator pool (no duplicates)

### CMS Integration
- [x] Fetch homepage config from Payload CMS Homepages collection
- [x] A/B variant: query testing status + matching testGroup, fall back to default
- [x] Preview: fetch draft content, validate PREVIEW_SECRET
- [x] Banner: fetch from HomepageBanner global, skip if disabled/expired
- [x] Graceful fallback: all CMS fields optional, static defaults used on error
- [x] SEO noindex forced for preview/draft content

### Caching
- [x] Redis cache (ioredis) with configurable TTL (HOMEPAGE_CACHE_TTL, default 300s)
- [x] Cache key: `hp:home:{variant|default}`
- [x] Cache-aside pattern (check → miss → assemble → write)
- [x] Preview mode bypasses cache entirely
- [x] Variant-specific cache keys (different content per A/B group)

### Cache Invalidation
- [x] RabbitMQ consumer on `api-gateway.homepage` queue
- [x] Listens for `homepage.saved` and `homepage.deleted` events
- [x] SCAN + DEL on `hp:home:*` pattern (clears all variants)
- [x] Graceful: continues serving if Redis/RabbitMQ unavailable

### Deduplication
- [x] Global deduplication across all sections and entity types (single usedIds set)
- [x] Pinned items excluded from evaluator pool

### Sorting & Filtering
- [x] `sort: newest` — createdAt DESC
- [x] `sort: random` — shuffled
- [x] `kind` — dispatches to evaluator scoring
- [x] `categoryFilter` — filters items by category slug

### CMS Collection (Homepages)
- [x] Full schema: hero, sections (with blocks, kind, manualEnabled, pinnedItems), popularTabs, moreCategoriesList, talentNetworkCta, footerNav, seo
- [x] Status: draft / active / testing / archived
- [x] isDefault flag (single default homepage)
- [x] testGroup for A/B variant matching
- [x] afterChange/afterDelete hooks publish RabbitMQ events

### Frontend
- [x] `service/http/homepage.ts` — API client (`HomepageAPI.getHomepage()`)
- [x] `types/homepage.ts` — full TypeScript types matching backend response

## What's NOT Implemented (Deferred)

### Needs Upstream Services
| Feature | Blocked By |
|---------|-----------|
| Team cards (entity: teams) | No team listing endpoint in listings-service |
| Talent cards (entity: talent) | No talent listing endpoint exposed via api-gateway |
| Rating, reviewCount, views90d, completionsCount on cards | Fields not yet in listings-service Project/Service entities |

### Frontend Integration
| Feature | Notes |
|---------|-------|
| Frontend page doesn't call HomepageAPI | `page.tsx` uses hardcoded seed data with `useFeaturedProjects` hook. When ready, replace with `HomepageAPI.getHomepage()` call |
| SSR with cookie forwarding | Frontend needs to forward `mktq_hp_variant` cookie during SSR |
| Banner rendering | Frontend component needed to render promotional banner |

### Operational
| Feature | Notes |
|---------|-------|
| Unit/integration tests | Deferred pending service stability |
| Metrics & structured logging | Prometheus/Datadog not wired; basic logging in place |
| Health endpoint for homepage module | API-wide `/health` exists |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LISTINGS_SERVICE_URL` | No | `http://localhost:3004` | Listings service base URL |
| `CMS_SERVICE_URL` | No | null (uses static defaults) | Payload CMS base URL |
| `REDIS_URL` | No | null (caching disabled) | Redis connection string |
| `PREVIEW_SECRET` | No | null (preview disabled) | Secret for preview token validation |
| `HOMEPAGE_CACHE_TTL` | No | `300` | Cache TTL in seconds |
