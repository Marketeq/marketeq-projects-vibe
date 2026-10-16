---
name: listings-service
description: Listings service — projects, services, teams, jobs modules all registered with scoring fields
type: project
---

# Listings Service Status

## Location
`backend/apps/listings-service/`

## Implemented Modules
- **projects** — full CRUD, publish flow, media upload, CMS sync. Scoring fields added (rating, reviewCount, completionsCount, views90d, adminBoost, featured)
- **services** — `ServicesModule` registered, full CRUD at `/v1/services`, scoring fields added
- **teams** — `TeamsModule` registered, full CRUD at `/v1/teams`, scoring fields + team-specific (logo, specializations, completedProjects)
- **job-listings** — most complete module with phases, tasks, budget, AI, invites, RabbitMQ events
- **publish** — project publishing pipeline with relational persistence, media entities
- **cms-projects** — raw SQL read adapter at `/v1/projects` for homepage (reads from `projects` table with scoring fields)

## Database Tables
| Table | Status | Notes |
|-------|--------|-------|
| `projects` | Exists | 12 seed rows with Unsplash images + scoring data |
| `services` | Exists | 6 seed rows with Unsplash images + scoring data (auto-created by TypeORM synchronize) |
| `teams` | Exists | 6 seed rows with Unsplash images + scoring data (auto-created by TypeORM synchronize) |
| `project` | Exists | TypeORM entity table (separate from `projects`), has `cmsId` field |
| `job_listings` | Exists | Complex schema with phases, tasks, team members |

## Scoring Fields (added 2026-04-09)
All three listing entities (Project, Service, Team) now have:
- `rating` (numeric 3,1, default 0)
- `reviewCount` (int, default 0)
- `completionsCount` (int, default 0)
- `views90d` (int, default 0)
- `adminBoost` (numeric, default 0)
- `featured` (boolean, default false)

Team entity also has: `logo`, `specializations[]`, `completedProjects`

## Key Files
- `src/app.module.ts` — registers all modules (ProjectSyncModule, PublishModule, JobListingModule, TeamsModule, ServicesModule)
- `src/cms-projects/cms-projects.controller.ts` — raw SQL adapter for `/v1/projects` with scoring fields
- `src/teams/` — team.entity.ts, team.controller.ts, team.service.ts, team.module.ts
- `src/services/` — service.entity.ts, service.controller.ts, service.service.ts, service.module.ts
- `src/project-sync/` — CMS-to-listings sync (renamed from strapi to cms)

- CMS sync and `/v1/projects` no longer use `skillsAndTools`; author skills are `projectSkills` → `skills` (plus `programmingLanguages` / `developmentTech` in DB as before).

## Notes
- `strapiId` renamed to `cmsId` across all entities (2026-04-08)
- `STRAPI_SYNC_TOKEN` env var renamed to `CMS_SYNC_TOKEN`
- `synchronize: true` in app.module.ts — auto-creates/updates tables (dev only, set to false before prod)
- Two `project` table representations: `project` (TypeORM entity) and `projects` (used by cms-projects controller). The cms-projects controller reads from `projects`.
- 2026-10-04 (AUDIT ONLY — no code changed): `v1/jobs` (`job.controller.ts`) has **no guard on the controller and listings-service registers no `APP_GUARD`**. The gateway requires a token for `/v1/jobs` (not in its public list), so not anonymous — but any signed-in account can `PUT /v1/jobs/:id`, `PUT /v1/jobs/:id/publish` and `DELETE /v1/jobs/:id` on anyone's job. `POST /v1/jobs` sets authorship from `req.user?.id || dto.createdBy`; nothing populates `req.user` here and the gateway sets `userId` not `id`, so the body-supplied `createdBy` always wins. Sits beside the well-guarded `v1/job-listings` controller (28 guards / 30 routes) — `v1/jobs` may be superseded, but it is still routed and reachable. See `docs/md/CyberSecurity/Company & Team RBAC — Audit.md` §4.
