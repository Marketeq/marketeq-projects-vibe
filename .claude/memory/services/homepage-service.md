---
name: homepage-service
description: Homepage module in api-gateway — ~85% complete, backend fully working, frontend SSR wired, tests pending
type: project
---

# Homepage Service Status

## Location
`backend/apps/api-gateway/src/homepage/`

## Fully Implemented (as of 2026-04-09)

### Backend
- `GET /homepage` endpoint — public, no auth, returns full `HomepagePayload`
- Preview mode (`?preview=1` + `x-preview-token` header)
- A/B testing via `mktq_hp_variant` cookie
- CMS integration (Payload CMS) with graceful static fallback
- Redis caching with event-driven invalidation (RabbitMQ)
- 9 default sections in config (Our Favorites, Newest, Most Popular, Top Teams, + 5 themed carousels)
- All 4 entity types: projects, services, teams, talent
- Evaluator scoring: top_rated, trending, most_popular, newest — uses real scoring data
- Scoring fields (rating, reviewCount, completionsCount, views90d, adminBoost, featured) on all entities
- Pinned items, deduplication, category filtering, random sort, carousel guard
- Parallel fetching with timeouts, graceful error handling

### Frontend
- SSR page (`page.tsx`) fetches `/homepage` server-side with `next: { revalidate: 60 }`
- Cookie forwarding for A/B testing (`mktq_hp_variant`)
- `generateMetadata()` sets SEO from `payload.seo`
- Dynamic hero from `payload.hero`
- Dismissible banner from `payload.banner`
- Dynamic sections — renders carousel or grid per `block.type`
- All 4 card renderers: project, service, team, talent → existing `ListingCard`/`ListingCardCompact` components
- More Categories from `payload.moreCategoriesList[]`
- Error fallback on API failure
- Types aligned: `frontend/types/homepage.ts` matches backend (includes TeamCard, ScoringFields)

## Strapi → CMS Rename (2026-04-08)
- `strapi-projects/` → `cms-projects/` in listings-service
- `strapiId` → `cmsId`, `STRAPI_SYNC_TOKEN` → `CMS_SYNC_TOKEN`, `syncFromStrapi()` → `syncFromCms()`

## Remaining Gaps

### Frontend (Minor)
- Preview mode UI — no admin gate for triggering `?preview=1`
- Talent Network CTA — returned by API but rendered by layout footer, not homepage
- Footer nav from API — layout handles footer rendering
- Uses ISR (`revalidate: 60`) instead of stale-while-revalidate

### Testing & QA (Not Started)
- No unit tests, integration tests, or e2e tests
- No Postman collection
- No CI/CD pipeline for homepage

### Operational
- No performance metrics (cache hit/miss, evaluator latency)
- Basic NestJS Logger only, no Prometheus/Datadog

## Services Required Locally
| Service | Port | Purpose |
|---------|------|---------|
| api-gateway | 4000 | Homepage endpoint, proxy |
| listings-service | 3004 | `/v1/projects`, `/v1/services`, `/v1/teams` |
| user-service | 3003 | `/talent/users` |
| PostgreSQL | 5432 | Database (Docker: `marketeq-db`) |
| Frontend | 3000 | Next.js dev server |

Optional: Redis (caching), RabbitMQ (cache invalidation), CMS service (dynamic config)

## Test Data
- 12 projects, 6 services, 6 teams in DB with scoring data and Unsplash images
- Images: `https://images.unsplash.com/photo-*` (configured in `next.config` image domains)
