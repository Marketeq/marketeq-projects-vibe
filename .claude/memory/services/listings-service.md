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
- 2026-10-02: Added `POST /v1/job-listings/:id/smart-assistant/edit-selection` for non-persisting selected-text Smart Assistant edits. It returns replacement text only; frontend applies insertion locally.
- Project scope saves (`PUT /publish/project/:id/scope`) go through `PhaseRepository.replaceForProject`: one transaction under a per-project advisory lock, batched queries, `createdAt` stepped 1ms per row because the draft endpoints order tasks by it. `PublishService` coalesces concurrent saves per project (latest payload wins). Before this, ~190 sequential queries per save plus the editor's 2s re-send exhausted the 128 MB heap on 2026-10-03 (PR #739).
- **Slug generation (PMCM-254, 2026-10-06)**: `updateProjectDraft` (`publish.service.ts`) and the legacy `projects.service.ts update()` both used to recompute `slug = slugify(title)` on every title edit, with no check against the project's existing slug — any title edit after first save silently changed the published URL. Fixed: both now only set `slug` when the project doesn't already have one (`!existing.slug`). `createProjectDraft`/legacy `create()` are correctly unconditional (first save). No DB path left unaudited — `project-sync.service.ts`'s two slug touches are plain pass-through of a CMS-supplied slug, not generation, and were left alone.
- **DTO validation added (PMCM-254)**: `UpsertProjectDraftDto`/`CreateProjectDto`.title now has `@MaxLength(120)` (entity column already had `length: 120`, DTO didn't enforce it); `.categories`/`.categorySelections` now have `@ArrayMaxSize(3)` — safe, both editors already cap category count to 3 on hydration regardless of what's stored. `ProjectCategorySelectionDto.subCategories` deliberately does **not** have `@ArrayMaxSize(5)` — it was added and then removed in the same ticket once traced: this DTO is nested inside the autosave/upsert payload, and neither editor caps `subCategories` on hydration (both copy an existing listing's subcategories verbatim), so a listing with >5 subcategories in any row (e.g. from the legacy `projects.service.ts` module, which has zero validation) would 400 on every wizard autosave (not validity-gated, resends full form state) and on any inline-editor Categories-tab save. The 5-item cap stays client-side-only (both editors already block a 6th addition with "You can add a maximum of five (5) sub-categories."). Do not re-add the DTO cap without first either verifying staging/live has no over-5 rows, or adding a hydration-time trim — and trimming silently drops a seller's existing data on their next save, so that needs explicit product sign-off too, not a silent slice(0,5).
- **Rich-text description sanitization added (PMCM-255, 2026-10-06)**: `fullDescription` arrives straight from the talent's own browser (Tiptap HTML, via `createProjectDraft`/`updateProjectDraft` in `publish.service.ts`) and was never sanitized server-side. Added module-level `sanitizeProjectFullDescription()` reusing the already-installed `sanitize-html` npm package (same dependency `job-listing.service.ts`'s `sanitiseRichText` already uses, just with a wider allow-list to match what the frozen `RichTextEditor` actually produces: `span[data-font-size]` for heading-size marks, `img[data-align]` for inline images, `blockquote`). Wired into both draft-creation paths. Deliberately does **not** restrict `img src` to a specific origin at this layer — the two upload paths below resolve their CDN origin inconsistently (`CLOUDFLARE_R2_PUBLIC_URL` vs `CLOUDFLARE_PUBLIC_URL`). **Follow-up correction (2026-10-07)**: the frontend sanitizer was originally meant to pick up the origin-restriction instead, but that was reverted — see the next entry. Both layers are scheme-allow-list only (`https`/`http`) now, not origin-restricted; that's an accepted gap, not an oversight.
- **Two parallel, non-presigned image upload paths exist (found during PMCM-255, not consolidated)**: `/publish/media` (gallery images → `publish.service.ts`'s `createProjectOfMedia` → `CloudflareStorageService`, 5MB cap, jpeg/png/webp only, `ImageValidator`) and `/publish/rich-text-image` (description inline images → API gateway's `publish-rich-text-image.controller.ts` → listings-service's separate `v1/media` module/`MediaService`, 10MB cap, any image mimetype, different R2 env var names). Both are backend-mediated multipart uploads — neither actually uses a pre-signed URL, despite that being assumed by PMCM-255's ticket text. Consolidating them is a real gap worth picking up but was judged out of scope for that ticket's pass.
- **`DELETE /v1/media/:key` exists but is dead code (found during PMCM-255)**: `media.controller.ts` defines it, `media.service.ts` implements the R2 `DeleteObjectCommand`, but there is no auth guard on the route and the API gateway does not proxy it (only `POST /publish/rich-text-image` is proxied) — nothing in the frontend calls it either. The frozen `RichTextEditor`'s embedded-image delete flow (confirmed via grep: `tr.delete(pos, ...)`) only removes the ProseMirror node from the editor's own document; it never calls this or any other backend delete. Same for image replace/edit-rotate — the previous storage object is never cleaned up. Before wiring this up: add an auth guard + ownership check to the controller, add a gateway proxy route, and the calling code would need to live inside the frozen `RichTextEditor` component (currently off-limits) since that's where the delete/replace actions are triggered.
- **Frontend image-src allow-list corrected (PMCM-255 follow-up 2, 2026-10-07)**: the original pass's `sanitizeProjectDescription` (`frontend/lib/sanitize-html.ts`) restricted `<img src>` to a `storageOrigin` param backed by a new `getPublicR2CdnBase()`/`NEXT_PUBLIC_R2_CDN_BASE` — but that env var isn't in any committed frontend env template, so on staging/live the origin was always empty and every description image got stripped; the `startsWith` check was also spoofable. Reverted: `getPublicR2CdnBase()` removed from `runtime-urls.ts`, `sanitizeProjectDescription` now takes no origin argument and allow-lists by `URL` parse + `https:`/`http:` scheme only (same scheme-only approach `sanitizeProjectFullDescription` already uses backend-side — see above). Neither layer does origin-restriction now; that's accepted, not a regression to re-flag.
- **Known local-dev-only gap**: migration `1798000000000-AddPendingInviteEmails` was never applied to the local dev DB (`ProjectEntity.pendingInviteEmails` column missing → any `SELECT *`-style query against `project`, e.g. `getMyProjects`/`findAll`, 500s with `column ProjectEntity.pendingInviteEmails does not exist`). Running the full migration chain locally also fails earlier, at `1797000000000-AddTeamProfileFields`, which references a `public.teams` table that doesn't exist locally. Both predate PMCM-254 and blocked live browser verification of the Basic Info work in this environment — not fixed (DB DDL was outside this ticket's scope and the session's permission rules declined a direct local fix). Whoever picks this up next should run the migration chain from `1797000000000` forward (or investigate why `public.teams` is missing) before relying on local `/my-listings` for anything that touches `getMyProjects`/create-draft.
