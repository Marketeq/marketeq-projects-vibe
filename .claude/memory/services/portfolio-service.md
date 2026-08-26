# portfolio-service Memory

## Status
Implemented (media handling + legacy portfolio items + case-study builder, now fully wired to the frontend)

## Docs Location
No dedicated docs folder — case-study builder was built directly against the frontend UI (Figma), not a written spec.

## What This Service Does
- Legacy `/portfolio` — draft/publish/archive/list/public/preview image-card portfolio items (`PortfolioItem` entity). Separate feature from case studies, unrelated data model.
- `/case-studies` — full case-study builder backend: create/list/get/update(draft)/reorder-blocks/publish/set-visibility/delete, plus a public unauthenticated `GET /case-studies/public/:slug`.
- `/media` — R2 presigned-upload flow (`POST /media/upload` returns `{uploadUrl, publicUrl, key, contentType}`; browser PUTs the file directly to `uploadUrl`; `DELETE /media/remove?key=`).

## Entities / Database Tables
- `case_studies` — id, ownerUserId, title, slug (unique), status (`draft|published|hidden|archived`), schemaJson (jsonb `{blocks:[{type,data}]}`), htmlPreview, htmlPublished, description, coverImage, skills (jsonb array). `hidden` and the `description`/`coverImage`/`skills` columns were added 2026-08-25 (migration `1787664271792-AddCaseStudyDetailsColumns`) when the frontend was wired to the real API — the Publish dialog collects coverImage/skills and the editor collects a description, neither of which had a column before.
- `case_study_blocks` — id, caseStudyId (FK cascade), blockType, position, contentJson. Kept in sync with `schemaJson.blocks` on every draft save (`syncBlocksFromSchema`); not directly read by any endpoint today (blocks come back via `schemaJson`), but kept for future per-block queries.
- `portfolio_items` — legacy, unrelated to case studies.

## API Endpoints
See controllers: `case-study.controller.ts` (`/case-studies*`), `media/media.controller.ts` (`/media*`), `portfolio.controller.ts` (`/portfolio*`, legacy).
`PATCH /case-studies/:id/visibility` (`{status: 'published'|'hidden'}`) added 2026-08-25 — only valid from `published`/`hidden`, mirrors the "can't publish an archived study" `ConflictException` pattern for invalid transitions.

## RabbitMQ Events
- Emits (via `CaseStudyEventPublisher`, exchange `marketeq.case_studies`): created, draft-saved, published, deleted. Degrades to no-op when `RABBITMQ_URI`/`RABBITMQ_URL` unset (`@Optional()` injection) — safe for local dev without a broker.
- Listens to: none.

## Key Decisions
- **`CASE_STUDY_BLOCK_TYPES` must be kept in sync with `frontend/lib/case-study-mapper.ts`'s `CaseStudyBlockType` union** — they drifted badly before 2026-08-25 (backend had 13 types, frontend editor supported 16; `testimonial` existed on both sides with *incompatible* shapes — backend expected flat `{quote,author,rating}`, frontend sends `{items:[{quoteHtml,authorHtml,roleHtml}]}`). Fixed by adding `process`/`personas`/`video`/`customer-journey`/`results-metrics`/`prototype`/`custom-columns` to the entity enum + `case-study-schema.validator.ts` + `case-study-html-renderer.ts`, and rewriting the `testimonial` case (and fixing `gallery`'s renderer, which assumed `data.images` was `string[]` when it's actually `{url,imageZoom?,imageRotation?}[]`). **Any time a new section type is added to the editor's `sections/` folder, it must also be added in these 3 backend places or saving 400s.**
- **All browser traffic to this service MUST go through api-gateway, never directly to port 3015.** The frontend's axios instance strips any `Authorization` header and relies solely on the `access_token` httpOnly cookie; api-gateway's `proxy.service.ts` is what turns that cookie into a `Bearer` header for downstream services (`JwtStrategy` here only reads `Bearer`, never a cookie). A direct-to-3015 call can never authenticate. `case-studies`/`media` were added to api-gateway's `SERVICE_PREFIX_MAP` (`proxy.controller.ts`) on 2026-08-25.
- **api-gateway has its own separate public-route allowlist** (`jwt.middleware.ts`) independent of each service's own guards — adding a `@Public`-equivalent route on a controller is not enough; the matching pattern must also be added to `PUBLIC_PATTERNS`/`PUBLIC_EXACT_ROUTES` in the gateway or it 401s before the request ever arrives. `/^\/case-studies\/public\/[^/]+$/` was added for the public case-study viewer.
- `media.service.ts`'s `generateUpload` now also returns `contentType` (the exact string it signed the R2 PutObjectCommand with) so the frontend doesn't have to guess a Content-Type for the PUT and risk an R2 signature mismatch.

## Gotchas / Notes
- Running TypeORM CLI migrations against this service's `data-source.ts` fails under a bare `npx typeorm migration:run` on this machine (Node 24) — `Cannot find module './entities/...'`. Works with an explicit ts-node register hook: `node -r ts-node/register ./node_modules/typeorm/cli.js migration:run -d apps/portfolio-service/src/data-source.ts` (run from `backend/`).
- `compileToHtml`/`htmlPublished` is currently write-only — nothing in the frontend reads it. The public viewer (`CaseStudyViewer`) re-renders `schemaJson.blocks` client-side via `SectionRenderer` instead. Kept correct/non-throwing for whenever it's used (e.g. SEO/email preview), but not worth chasing pixel-perfect fidelity (image zoom/rotation transforms) there today.
- Frontend's case-study feature (`frontend/lib/hooks/use-case-study-store.ts`) used to be 100% localStorage-backed as a deliberate stopgap, with comments explaining the gateway route didn't exist yet. That file is deleted as of 2026-08-25 — everything now goes through `frontend/service/http/case-study.ts` (`CaseStudyAPI`) → api-gateway → this service.

## Agent Log
- 2026-08-25: Audited full parity between the case-study frontend (already built, but localStorage-only) and this backend. Found and fixed: missing gateway routes, missing gateway public-route allowlist entry, 7 missing block types + testimonial/gallery shape bugs, missing `description`/`coverImage`/`skills` columns, missing hide/unpublish endpoint. Rewired the entire frontend (editor, grid, create modal, public resolver, upload helper) off localStorage onto the real API. Verified end-to-end via curl (auth via `/auth/dev-login`) and in-browser (create → add a previously-unsupported block type → autosave → reload-survives → list renders → publish/hide/unhide/public-view/delete all tested via curl). `npx tsc --noEmit` (frontend) and `npx nest build portfolio-service`/`api-gateway` (backend) all clean.
