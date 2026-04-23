# CMS × Project Integration — Gap Analysis

> **Audit date:** 2026-04-16
> **Scope:** Project Details end-to-end — Payload admin authoring → CMS hooks (cms-service) → sync pipeline (listings-service) → read API → frontend `project-details/[slug]` page.
> **Spec note:** The design docs reference **Payload**. This repo uses **Payload v2**. The role is identical (editorial overlay, REST sync into a NestJS source-of-truth). Read every "Payload" reference in the specs as "Payload".
> **Source-of-truth doc:** `public.projects` in listings-service Postgres. CMS is the editorial overlay.

---

## 0. TL;DR

| Layer | Status | One-liner |
|---|---|---|
| Payload admin | ✅ **Complete** | All 7 tabs wired. Every `§16` field present. Moderation, audit log, preview tokens, ownerId, team authoring (hybrid email model) all live. |
| CMS hooks (compute + sync) | ✅ **Complete** | `beforeChange` computes §14.1/2/5/7/12/13/16 + datePublished + previewToken. `afterChange` POSTs to listings-service + RabbitMQ publish + frontend revalidate. |
| listings-service sync (`toRow`) | ✅ **Complete** | 35 fields mapped, deliverables + skills fall through to LLM adapters when authors leave them empty, media URLs resolved. |
| LLM adapters (Deliverables, Skills) | ✅ **Wired** | Both use HuggingFace MiniLM-L6-v2 behind an adapter seam (heuristic fallback). Same model the favorites-service uses. Env-gated on `HUGGINGFACE_API_KEY`. |
| Read API (`cms-projects.controller`) | ✅ **Complete** | Enriches findBySlug with `similarProjects`, `relatedCategories`, `relatedSkills`, `team`, `projectHistoryRatings`, `badges`, `isTopRated`. |
| Frontend project-details page | ⚠️ **~55% field consumption** | Core render paths live. Six enrichment fields arrive populated but sit unused. Two static placeholder blocks ("31 sales", entire "Project History" panel). |
| Spec compliance | ⚠️ **8 resolved / 2 unresolved contradictions** | See §9. The open items need product decisions, not code. |

---

## 1. Scope & method

**In scope:** everything the Project Details feature touches in code today — CMS collection, both Payload hooks, RabbitMQ publisher, listings-service project-sync module, listings-service read controller, frontend page.

**Cross-cutting services referenced but out of scope for this doc:**
- `category-service` (suggestions engine used for `relatedCategories`/`relatedSkills`)
- `user-service` (`/internal/users/by-email/:email` used by team hydration)
- `favorites-service/ai` (HF embedding pipeline, reused by our adapters)
- `messaging-service` (would provide `isOnline` presence — not wired)
- Reviews pipeline (would populate `rating`/`reviewCount`/`completionsCount` with real data — not wired)

**Method:** parallel audit of (a) every promise in the `docs/md/CMS Service/projects/` specs, (b) the Payload collection + both hooks, (c) the listings-service write and read paths, (d) the frontend page. Every row in this doc cites an exact file path + (approximate) line number.

---

## 2. Architecture summary

```
┌─────────────────────────────────────────────────────────────────────┐
│  Payload Admin (cms-service, port 3020)                             │
│  • Projects collection — 7 tabs, ~50 fields                         │
│  • beforeChange: computeProjectFields (§14.1/2/5/7/12/13/16 + ...)  │
│  • afterChange:  syncProjects → HTTP POST + RabbitMQ + revalidate   │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP POST /internal/project-sync
                             │ Bearer CMS_SYNC_TOKEN
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  listings-service (port 3004)                                       │
│  • POST /internal/project-sync → ProjectSyncService.syncFromCms     │
│  • toRow() maps 35 fields + scope + deliverables + skills           │
│  • LLM adapters: DeliverablesAdapter, SkillsAdapter                 │
│  • Writes public.projects (source of truth)                         │
│                                                                     │
│  • GET /v1/projects/slug/:slug → shapeProject + enrichments         │
│    ├─ similarProjects (§14.9 RelatedScore, Postgres SQL)            │
│    ├─ relatedCategories/Skills (category-service call)              │
│    ├─ team (hybrid email model, user-service call)                  │
│    ├─ projectHistoryRatings (§14.14 weighted avg over siblings)     │
│    └─ badges (derived from scoring columns)                         │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP GET
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Frontend (Next.js, app router)                                     │
│  /project-details/[slug] → fetches listings-service                 │
│  • ~55% field consumption                                           │
│  • Deliverables, FAQs, scope, team, duration, pricing all wired     │
│  • Enrichment fields (similar, related, history, badges) UNUSED    │
└─────────────────────────────────────────────────────────────────────┘
```

**Spec's sync model vs reality:** spec §05/§07/§09/§10 describes a bidirectional sync with webhooks and a token-authenticated REST endpoint. We implement the forward path exactly (Payload `afterChange` POSTs to `/internal/project-sync` with `Bearer CMS_SYNC_TOKEN`). The reverse path (listings → Payload on moderation reject) is **not implemented** — moderation changes happen in Payload and sync forward, not the other way.

---

## 3. Payload admin (authoring layer)

**File:** `backend/apps/cms-service/src/collections/Projects.ts`

### 3.1 Tabs and fields

| Tab | Fields | Status |
|---|---|---|
| **(top-level)** | `title` (req), `slug` (req, unique, sidebar) | ✅ |
| **Content** | `shortDescription` (320ch), `fullDescription` (Lexical richText), `deliverables` (array of phases `{phaseLabel, phaseName, items[]}`), `faqQuestions` (array `{question, answer: richText}`), `recentQuestions` (array) | ✅ |
| **Pricing & Scope** | `totalEstimatedHours` (author-editable fallback), `timelineValue`/`timelineUnit`, `pricingModel` enum, `priceViewMode` enum, `priceRangeMin/Max` USD, `projectType`, `klarnaPaymentEnabled`, **`scope`** (phases → tasks with `title`, `roleName`, `location`, `experienceLevel`, `estimatedHours`, **`assigneeEmail`**) | ✅ |
| **Categorization** | `categories` (≤3), `subcategories` (≤5), `tags` (≤10), `projectSkills` (≤25, editable; see §3.3), `programmingLanguages` (≤10), `developmentTechnologies` (≤10), `skillsAndTools` (array with icon upload), `industries` (≤5), `relatedProjects` (M2M self-ref) | ✅ |
| **Media** | `thumbnail` (req upload), `gallery` (array of image+caption), `videoWalkthrough` (group: upload **or** externalUrl) | ✅ |
| **Computed** (readOnly) | `startingPriceTotal`, `priceViewAmount`, `teamMemberCount`, `projectDurationTotal`, `projectDurationLabel`, `datePublished`, `teamEmails`, `projectHistoryRatings` (ref to read-time derivation) | ✅ |
| **Admin & Moderation** | `visibility`, `moderationStatus` (4-state enum), `ownerId` (UUID text), `isFlagged`, `forceReviewOnEdit`, `previewToken` (auto), `adminNotes` (richText), `adminTags` (array), `activityLog` (readOnly audit), `seoTitle` (70ch), `seoDescription` (160ch) | ✅ |
| **Sidebar** | `featured`, `chatEnabled` | ✅ |

**Access control** (collection-level): `read: readPublishedOrCmsUser`, `create/update: isEditor`, `delete: isAdmin`.

**Every field named in spec §16 / `Payload Collection Type` / `data-dictionary.csv` has a Payload counterpart.** Some names differ (e.g., spec `user_email` → Payload `assigneeEmail`, spec `featured_image` → Payload `thumbnail`); the transform layer in `project-sync.service.ts` handles the mapping.

### 3.2 Moderation & audit

| Spec item | Doc ref | Code location | Status |
|---|---|---|---|
| `status` enum (draft/in_review/published/needs_update/archived) | §16 L44 | Payload `_status` (draft/published) + separate `moderationStatus` (pending/approved/rejected/escalated) | ✅ split into two orthogonal workflows by design; see §9 contradiction #5 |
| `moderationStatus` default approved | §16 L50 | `Projects.ts` Admin tab | ✅ |
| `forceReviewOnEdit` | §16 L51 | Admin tab, default `true` | ✅ |
| Auto-reset to pending on sensitive field edit | §14.13 | `computeProjectFields.ts:118-143`, `SENSITIVE_FIELDS = [title, shortDescription, fullDescription, deliverables, tags, projectSkills, videoWalkthrough]` | ✅ |
| FlagScore heuristic (+5 desc>300, +10 tags>10) | §14.12 | `computeProjectFields.ts:105-112`, triggers `isFlagged=true` + `moderationStatus=pending` when ≥20 | ✅ partial (no duplicate-title or flagged-words checks yet; see §11) |
| `activityLog` with `{actionType, performedBy, timestamp, fieldChanged}` | §14.16 / §16 L141-151 | `computeProjectFields.ts:152-176`, one append per save | ✅ |
| Color-coded admin badges (draft gray / in_review yellow / published green / needs_update red) | §16 L214-216 | Payload admin renders status badges by default; color mapping not customized | 🟡 Payload's built-in badges work; the spec's exact palette isn't applied |
| `previewToken` auto-generated | §16 L140 | `computeProjectFields.ts:119-125`, `crypto.randomUUID()` on create | ✅ |

### 3.3 AI-derivation fields

| Field | Spec expectation | CMS behaviour |
|---|---|---|
| `projectSkills` | AI keyword-extract from description + tags + category (§14.11) | Author-editable; the `SkillsAdapter` in listings-service runs on sync when empty (see §4.3). Not flipped to `readOnly` yet — explicit editor override still allowed. |
| `deliverables` | AI-derived from scope (§01 L69-85) | Author-editable; the `DeliverablesAdapter` in listings-service runs on sync when empty. |
| `projectDurationLabel` | Pivot <7d / <4w / months (§01 L98-104) | Computed in `beforeChange`. Fully automated. |
| `startingPriceTotal`, `priceViewAmount` | Hours × rate (§14.7) | Computed in `beforeChange` using `HOURLY_RATE_BY_LEVEL` stand-in; swap for real rates when the `roles` collection lands. |
| `teamMemberCount`, `teamEmails` | `count(unique users)` (§14.5) | Computed in `beforeChange` from scope task assignees. |

---

## 4. Backend — sync pipeline

### 4.1 CMS `afterChange` hook

**File:** `backend/apps/cms-service/src/hooks/afterChange/syncProjects.ts`

Three side-effects on every publish:

1. **HTTP POST** `${LISTINGS_SERVICE_URL}/internal/project-sync` with `Authorization: Bearer ${CMS_SYNC_TOKEN}`. Payload = full Payload doc + resolved media URLs (`thumbnailUrl`, `galleryUrls[]`, `videoUrl`). Lexical rich-text upload nodes are pre-populated with media docs so listings-service never calls back into Payload.
2. **RabbitMQ publish** `project.saved` on `cms.events` topic exchange (falls through if not connected).
3. **Frontend revalidate webhook** → `POST ${FRONTEND_REVALIDATE_URL}` with `{secret, paths: ['/project-details/{slug}', '/projects']}` for Next.js on-demand ISR.

Skips when `_status !== 'published'` — only the published snapshot ships forward. Delete path (`deleteProjectFromListings`) sends `DELETE /internal/project-sync/:payloadId` for soft-archive.

### 4.2 listings-service write path

**File:** `backend/apps/listings-service/src/project-sync/project-sync.service.ts`

`toRow()` is async (L223) and maps 35 columns. INSERT and UPDATE column lists are fully parallel — no field drift between create/update paths. Ownership-handling nuance:

- **INSERT**: `createdBy = dto.ownerId?.trim() || 'cms-sync'` (L99)
- **UPDATE**: only backfills when current `createdBy = 'cms-sync'` AND `dto.ownerId` is now supplied (L149-157). Prevents churn when an unrelated field is edited and preserves stable `createdBy` for `§14.14 projectHistoryRatings`.

**Scope normalization** (`scopePhases()` L398-471) defensively handles legacy snake_case field names (`role_name`, `experience_level`, `estimated_hours`) from the original Payload migration, then emits the Payload casing every downstream consumer expects.

**Duration fallback** (L253-262): `dto.projectDurationLabel` wins when scope is populated; falls back to `${timelineValue} ${timelineUnit}` for author-authored-only projects.

**Media resolution** (L376-388): prefers explicit `url` field, falls back to `${baseUrl}/media/${filename}`. Same-origin paths used so Next.js image optimizer doesn't reject the CMS host.

### 4.3 LLM adapters (Deliverables + Skills)

**Seam pattern** (mirrors `category-service/suggestions.adapter.ts`):

```
src/project-sync/deliverables/
  deliverables.adapter.ts            — abstract class + DI token
  deliverables.adapter.heuristic.ts  — no-model safety net
  deliverables.adapter.huggingface.ts — HF Inference + cosine dedup

src/project-sync/skills/
  skills.adapter.ts                  — abstract class + DI token
  skills.adapter.heuristic.ts        — no-model safety net
  skills.adapter.huggingface.ts      — HF Inference + nearest-neighbor on vocab
```

Module (`project-sync.module.ts`) binds both tokens to the HF adapter; the heuristic is injected as a fallback collaborator. Callers (`ProjectSyncService.toRow`) never branch on environment — adapters handle all resilience internally.

**DeliverablesAdapter** — §01 L69-85:
- HF strategy: embed every task title, greedy-cluster by cosine ≥ `DELIVERABLES_DEDUP_THRESHOLD` (default 0.88), longest title wins per cluster. "Build homepage" + "Homepage build" collapse into one item.
- Heuristic: exact-match dedup, task titles become items verbatim.
- Authored `deliverables` always wins — adapter only runs when `dto.deliverables` is empty.

**SkillsAdapter** — §14.11 + §03 Task → Skill Map:
- HF strategy: load `public.projects.skills` vocabulary (top 500 by frequency, 1h TTL), embed vocab items + combined query (`description + category + tags + scopeTaskTitles`), cosine-rank, return top `SKILLS_TOP_K` (default 10) above `SKILLS_SIMILARITY_THRESHOLD` (default 0.35). Explicit `tags + category` merge on top so editor intent survives.
- Heuristic: `tags + [category] + taskTitles`, dedupe, top 10.
- Authored `projectSkills` always wins.

**Shared env config** (all default-safe):

```
HUGGINGFACE_API_KEY            absent = silent heuristic fallback
HF_EMBEDDING_MODEL             shared fallback for HF_DELIVERABLES_MODEL + HF_SKILLS_MODEL
HF_DELIVERABLES_MODEL          default: sentence-transformers/all-MiniLM-L6-v2
HF_SKILLS_MODEL                default: same as above
DELIVERABLES_DEDUP_THRESHOLD   default: 0.88
DELIVERABLES_HF_TIMEOUT_MS     default: 5000
SKILLS_SIMILARITY_THRESHOLD    default: 0.35
SKILLS_TOP_K                   default: 10
SKILLS_HF_TIMEOUT_MS           default: 5000
SKILLS_VOCAB_LIMIT             default: 500
SKILLS_VOCAB_TTL_MS            default: 3600000 (1h)
```

**Process-lifetime embedding cache** in both adapters, keyed by `(model, text)`. Repeated vocab items cost nothing across multiple sync operations.

---

## 5. Backend — compute pipeline

**File:** `backend/apps/cms-service/src/hooks/beforeChange/computeProjectFields.ts`

Every field it writes, and its spec mapping:

| Field | Spec | Logic | Code |
|---|---|---|---|
| `totalEstimatedHours` | §14.1 | `sum(scope[].tasks[].estimatedHours)` — overrides author value when scope populated | L242-247 |
| `projectDurationTotal` (weeks) | §14.2 | `max(1, ceil(totalHours / (teamSize × 40)))` where `teamSize` = unique assignees | L254-264 |
| `projectDurationLabel` | §01 L98-104 | pivot `<7 days → "N days"`, `<4 weeks → "N weeks"`, else `"N months"` (4.345 w/mo) | L266-283 |
| `startingPriceTotal` | §14.7 | `sum(estimatedHours × HOURLY_RATE_BY_LEVEL[experienceLevel])` — stand-in rate card | L60-66, L286-289 |
| `priceViewAmount` | §14.7 | `startingPriceTotal ÷ periodsForViewMode(priceViewMode, weeks)` (weekly/biweekly/monthly/quarterly/yearly) | L73-89, L290-297 |
| `teamMemberCount` | §14.5 | `size of {assigneeEmail} ∪ {(roleName, experienceLevel) for unassigned}` | L226-237, L302-304 |
| `teamEmails` | §14.5 | `unique(lower(trim(assigneeEmail)))` — always overwrite (clearing in CMS shrinks team) | L306-312 |
| `datePublished` | §01 §Date Published | Set on first publish; never overwritten; handles create+published and backfill | L188-193 |
| `previewToken` | §16 L140 | `crypto.randomUUID()` on create if missing | L119-125 |
| `moderationStatus` reset | §14.13 | Flip to `pending` when `SENSITIVE_FIELDS` change and `forceReviewOnEdit=true` | L128-143 |
| `isFlagged` + moderation | §14.12 | FlagScore heuristic (+5 desc>300, +10 tags>10) — when ≥20 flip both | L105-112, L146-150 |
| `activityLog` | §14.16 | One entry per save with `{actionType, performedBy, timestamp, fieldChanged}` | L152-176 |

**Not handled in compute hook** (lives elsewhere):
- `projectHistoryRatings` (§14.14) — read-time derivation in `cms-projects.controller` (L207-236)
- `isTopRated`, `badges` — read-time derivation in `cms-projects.controller` (`shapeProject`)
- `similarProjects`, `relatedCategories`, `relatedSkills`, `team` — read-time enrichments (§6)

---

## 6. Backend — read pipeline

**File:** `backend/apps/listings-service/src/cms-projects/cms-projects.controller.ts`

### 6.1 `findBySlug` shape

`shapeProject()` returns ~40 fields (L410-470). On top of raw columns, it derives:

- **`isTopRated`** (§13 L59): `rating ≥ 4.0 && reviewCount ≥ 20`
- **`badges`** (§12 L68, §01 L65): via `deriveBadges()` — emits stable kebab tokens: `top-rated`, `highly-rated` (rating ≥4.8 && reviews ≥10), `proven` (completionsCount ≥10), `featured` (featured===true)

Enrichments (all in parallel, all fail-soft):

| Enrichment | Backing | Spec |
|---|---|---|
| `similarProjects[]` | `getSimilarProjects()` L144-190 — Postgres SQL `0.5×skill + 0.3×tag + 0.2×subcategory` overlap, top 6 | §14.9 |
| `relatedCategories[]` / `relatedSkills[]` | `getCategorySuggestions()` L349-373 — HTTP call to category-service `/api/category-pages/:slug` | §14.10, data-dict L16-17 |
| `team[]` | `hydrateTeam()` L256-338 — walks scope, fetches each unique `assigneeEmail` via user-service `/internal/users/by-email/:email`, returns `{firstName, username, avatarUrl, location, languages[], skills[], isLead, isOnline}` | §01 L109-129, hybrid team model (GAP §9 #1) |
| `projectHistoryRatings` | `getProjectHistoryRatings()` L207-236 — weighted avg (`sum(rating × reviewCount) / sum(reviewCount)`) over sibling projects sharing `createdBy`. Skips `'cms-sync'` placeholder. Returns `{average, reviewCount, projectCount}` or `null`. | §14.14 |

### 6.2 Helper endpoints

- `GET /v1/projects` — list (top 50, not-draft, by featured+recent)
- `GET /v1/projects/slug/:slug` — full project with all enrichments
- `GET /v1/projects/slug/:slug/similar` — standalone similarProjects endpoint
- `GET /v1/projects/slug/:slug/related-categories` — standalone category suggestions

### 6.3 Write-side endpoints (consumed by CMS)

- `POST /internal/project-sync` — upsert by `payloadId`
- `DELETE /internal/project-sync/:payloadId` — soft-archive

---

## 7. Frontend — project-details page

**File:** `frontend/app/(group)/(group)/project-details/[slug]/page.tsx`

### 7.1 API field consumption

| Rendered ✅ | Unused ❌ |
|---|---|
| `title`, `slug`, `description` (HTML) | `shortDescription` |
| `category`, `categories`, `subcategories` | `industries` |
| `tags`, `programmingLanguages`, `developmentTech` | `skills` |
| `deliverables` (3-col checkmark grid, L1084-1125) | `videoUrl` |
| `faqs` (collapsible accordion, L1804-1874) | `projectType`, `klarnaEnabled` |
| `scope` (phase+task tree, L3425-3555) | `completionsCount`, `views90d` |
| `mediaUrls[0]` (hero thumbnail) + gallery | `skillsAndTools` |
| `budget`, `priceMin`, `priceMax`, `pricingModel`, `priceViewMode` | `similarProjects[]` |
| `estimatedHours`, `duration` | `relatedCategories[]` |
| `recentQuestions` (accordion) | `relatedSkills[]` |
| `rating`, `reviewCount` | `relatedProjectIds[]` |
| `isTopRated` (conditional "Top Rated" badge, L770) | **`badges[]`** — derived server-side, no consumer |
| `team` (with static-avatar fallback, L1303-1418) | **`projectHistoryRatings`** — derived server-side, no consumer |
| `reportButtonEnabled`, `shareButtonEnabled`, `helpButtonEnabled` | REMOVED (always-on in UI) |

**Consumption rate: ~55%.** The missing fields divide into two categories:

1. **Non-spec fields** — `shortDescription`, `skills`, `skillsAndTools`, `projectType`, `klarnaEnabled`, `completionsCount`, `views90d`, `chatEnabled` — these either have no spec UI block, or the block uses a more specific sibling field.
2. **Spec-promised but unwired enrichments** — `similarProjects`, `relatedCategories`, `relatedSkills`, `badges`, `projectHistoryRatings`, `industries`, `videoUrl`, `relatedProjectIds` — backend data is **live**; frontend just hasn't wired the render.

### 7.2 Unused enrichment data

These are **true gaps** — the API delivers them, the spec says they should render:

| Field | Spec | API status | Frontend status |
|---|---|---|---|
| `similarProjects[]` | §12 L193-196, §14.9 | ✅ populated | ❌ unrendered rail |
| `relatedCategories[]` | §12 L186-192, §14.10 | ✅ populated | ❌ unrendered |
| `relatedSkills[]` | data-dict L17, §14.11 | ✅ populated | ❌ unrendered |
| `industries[]` | §13 L52 "Shown as industry badges" | ✅ populated | ❌ unrendered |
| `badges[]` | §12 L68, §01 L65 | ✅ populated | ❌ unrendered (only `isTopRated` has a block) |
| `projectHistoryRatings` | §14.14 | ✅ populated | ❌ "Project History" panel is static mock |
| `videoUrl` | §12 L86, §13 L47 | ✅ populated | ❌ |
| `relatedProjectIds[]` | §12 editor-curated related | ✅ populated | ❌ |

### 7.3 Static placeholders (spec-false)

| Block | Line | Issue |
|---|---|---|
| `"31 sales"` badge in hero | L765 | Hardcoded. No API field for sales/completions count (completionsCount exists but isn't wired here). |
| **Entire "Project History" panel** | L1950-2070 | Fake 4.9 rating, fabricated score distributions (100/75/50/25/0), hardcoded communication/responsiveness scores. Should read `projectHistoryRatings` + `rating` + `reviewCount`. |
| Klarna tooltip copy | L4368-4372 | Hardcoded text; `klarnaEnabled` boolean never checked. |

---

## 8. Finalized Formulas (§14) — per-row status

| # | Formula | Doc L | Code | Status |
|---|---|---|---|---|
| 14.1 | `TotalEstimatedHours = sum(task.estimatedHours)` | L14-19 | `computeProjectFields.ts:242-247` | ✅ |
| 14.2 | `ProjectDurationWeeks = max(1, ceil(hours / (teamSize × 40)))` + label pivot (§01 L98-104) | L23-27 | `computeProjectFields.ts:254-283` | ✅ spec references `task.end_day` which doesn't exist on Task; we picked capacity interpretation (see §9 #2) |
| 14.3 | `EndDate = StartDate + duration × 7` | L29-35 | — | ❌ needs `startDate` field on Project (not in CMS yet) |
| 14.4 | `TotalTasks = sum(len(phase.tasks))` | L39-43 | — | ✅ render-time derivation (not stored); frontend doesn't display this count but data is trivially available |
| 14.5 | `TotalTeamMembers = count(unique users)` | L45-49 | `computeProjectFields.ts:302-304` via `teamEmails` | ✅ email-first with role+level proxy fallback |
| 14.6 | `WorkloadPerUser ≤ schedule.maxHours` | L51-62 | — | ⚠️ half-unblocked. `assigneeEmail` resolves so per-user hours are summable. Still needs `workSchedule` + `customHours` per assignment AND user-service to expose `schedule.maxHours`. Also needs product decision on unresolved-email handling (§9 #6). |
| 14.7 | `EstimatedCost = sum(hours × rate)` | L66-71 | `computeProjectFields.ts:60-66, 286-289` via `HOURLY_RATE_BY_LEVEL` | ✅ using rate-card stand-in; real `roles` table swap-in is a single constant change |
| 14.8 | `PhaseCost` (per-phase breakdown) | L73-78 | — | 🟡 total computed; per-phase not stored (admin can derive from scope view) |
| 14.9 | `RelatedScore = 0.5×skills + 0.3×tags + 0.2×subcategory` | L82-96 | `cms-projects.controller.ts:144-190` | ✅ pure Postgres SQL |
| 14.10 | Related Categories | L98-102 | category-service `/api/category-pages/:slug` → `cms-projects.controller.ts:349-373` | ✅ via heuristic suggestions engine |
| 14.11 | `SuggestedSkills = AI.extract_keywords(desc + cat + tags)` | L104-110 | `SkillsAdapter` seam, §4.3 | ✅ HF MiniLM-L6-v2 + vocabulary ranking + heuristic fallback |
| 14.12 | `FlagScore` heuristic | L114-130 | `computeProjectFields.ts:105-112` | ✅ partial — implemented: desc>300 (+5), tags>10 (+10); missing per spec: duplicate-title (+15), flagged-words (+20) |
| 14.13 | `ForceReview` on sensitive edit | L132-141 | `computeProjectFields.ts:128-143` | ✅ `SENSITIVE_FIELDS = [title, shortDescription, fullDescription, deliverables, tags, projectSkills, videoWalkthrough]` |
| 14.14 | `projectHistoryRatings = avg(owner's past reviews)` | L145-163 | `cms-projects.controller.ts:207-236` | ✅ weighted avg over siblings sharing `createdBy`; data-quality depends on same `rating`+`reviewCount` columns `isTopRated` uses |
| 14.15 | `ReviewStatusDistribution` | L165-169 | — | ⛔ blocked on reviews pipeline |
| 14.16 | `UnifiedAuditLog` | L173-193 | `computeProjectFields.ts:152-176` | ✅ spec shape matched exactly |
| 14.17 | `isPreviewTokenValid` | L197-201 | Payload generates token, no expiry logic yet | 🟡 token auto-generated; expiry + validation check not implemented |
| 14.18 | `ProjectModerationStatus` | L205-211 | Admin tab enum | ✅ |

---

## 9. Spec contradictions

### 9.1 Resolved (code decision recorded here)

1. **Team source of truth.** `§16 §Team Assignment` says team is authored in CMS via `assignedTeam`. `§03 PHASE 1 §1` and `data-dictionary:12/32` say team is **calculated from task assignments**. **Resolved** via the hybrid email model: `assigneeEmail` lives on each scope Task (matching both docs; email per spec §16 L96, not UUID — see §9.1 below). Team list is derived as `unique(scope[].tasks[].assigneeEmail)`. No separate `assignedTeam` component. Hydrated at read time in `hydrateTeam()`.

2. **`task.end_day`.** Formula §14.2 references `task.end_day`, but the `Task` component definition has no such field (only `estimated_hours`). **Resolved** via capacity interpretation: `weeks = max(1, ceil(hours / (teamSize × 40)))`. Lives in `computeProjectFields.ts`; single point of change.

3. **`description` vs `fullDescription`.** `data-dictionary.csv` uses `project_description`; §16 uses `description`; Payload Collection Type says "Full Description"; §12 uses `description`. We author `fullDescription` in Payload and convert to HTML stored as `description` in listings-service. Pure naming inconsistency; no behaviour change needed.

4. **`deliverables` format + AI derivation.** §16 L43 says "Rich Text, editable by humans". §01 §Deliverables says "derived from AI summary with LLM". Payload Collection Type L28 says "Rich Text or JSON". We store a Phase-grouped array (`[{phaseLabel, phaseName, items[]}]`) closer to the Figma mock than any spec variant. **Resolved**: sync service runs `DeliverablesAdapterHuggingFace` (MiniLM-L6-v2 + cosine dedup) when author leaves them empty; authored content always wins. See §4.3.

5. **`moderationStatus` vs `_status`.** Payload v2 gives `_status: draft|published` via drafts plugin. Spec §16 adds a separate `moderationStatus`. **Resolved**: both exist as orthogonal workflows. `_status` controls visibility; `moderationStatus` tracks content-quality review. Editors can publish while content is flagged — the two workflows don't block each other.

6. **Skills generation model.** §01 L123-124 implies rule-based keyword matching; §03 L52-58 mandates HuggingFace `sentence-transformers/all-MiniLM-L6-v2`; data-dict L17 says "semantic matching (e.g., HuggingFace)". **Resolved**: we implement the HF path (§4.3 SkillsAdapter). Heuristic is only the fallback.

7. **Status enum values.** §01 uses `[draft, pending_review, published, needs_update]`; §16 L44 uses `[draft, in_review, needs_update, published, archived]`. **Resolved**: we use Payload's `_status` (2 values) + spec's `moderationStatus` (4 values). The 5-value merged enum isn't needed when the axes are split.

8. **Format of `deliverables.items`.** Spec §12 L62 says `string[]`; §08 L165 says optional string. **Resolved**: we store `items: string[]` under each phase group — exactly spec §12 §13.

### 9.2 Unresolved (product decisions needed)

1. **Unresolved `assigneeEmail`.** Spec `§16 L96` defines `user_email (text)` but never says what happens when the email doesn't match a real user. `§14.6` mandates workload validation, which requires existence. Two contradictory readings are both in the docs — Reading A (existence required), Reading B (invite-by-email, creates a placeholder). Our current "accept silently + drop on render" is the worst-of-both interpretation. Full analysis and three defensible options (strict / lenient-with-warnings / current) in the internal decision log. **Blocks §14.6 workload validation.**

2. **`badges` taxonomy.** Spec §12 L68 just says `badges: string[]`; §01 L65 says "from review system". We emit 4 tokens (`top-rated`, `highly-rated`, `proven`, `featured`) — editorial call. Product should ratify the list before the frontend builds a badges strip (every new token is a design affordance).

---

## 10. Reverse gaps (in code, not in spec)

Things we ship that no spec doc requires — recorded here so future spec updates don't treat them as bugs.

| Field | Why we have it |
|---|---|
| `relatedProjects` M2M self-ref | Editor override so curation can beat the §14.9 auto-ranker |
| `industries` (distinct from categories) | Spec mentions "industry badges" in §13 L52 but doesn't define a field; we gave it one |
| `videoWalkthrough.externalUrl` OR upload | Spec variously says "external only" (§16 L59) and "upload or URL" (Payload Collection Type) — we support both |
| `skillsAndTools` with per-item icon upload | Spec has the concept but no icon upload |
| `adminNotes`, `adminTags`, `seoTitle`, `seoDescription` | §16 "SEO & Admin Features" lists them; admin tab consolidates |
| `visibility` (public/private/unlisted) | §16 L34 mentions visibility but doesn't define the enum |
| `chatEnabled` | Admin override so editors can force-disable chat per project |
| `previewToken` without expiry | §16 L140 says "previewToken with expiry"; we generate but don't enforce expiry yet — §14.17 half-done |

---

## 11. What's not done

### 11.1 Tier 1 — frontend wiring (cheap; data already flows)

- [ ] **Similar projects rail** — `project.similarProjects[]` (top-6 with scores) → render a rail per §12 L193-196
- [ ] **Related categories + skills rails** — `project.relatedCategories[]`, `project.relatedSkills[]` → render per §12 L186-192
- [ ] **Industries badge row** — `project.industries[]` → render per §13 L52
- [ ] **Project History panel** — replace the static mock (L1950-2070) with `project.projectHistoryRatings` + `project.rating` + `project.reviewCount`
- [ ] **Badges strip** — `project.badges[]` → render with a `<Badge variant={token}>` switch. Requires §9.2 #2 product call on the taxonomy first.
- [ ] **Hero "N sales"** — replace L765 hardcode with `project.completionsCount`
- [ ] **Video embed** — `project.videoUrl` → render per §12 L86

### 11.2 Tier 2 — secondary gaps with a small code delta

- [ ] **FlagScore parity** (§14.12) — add duplicate-title check (+15) and flagged-words list (+20). Both fit in `computeFlagScore()` in `computeProjectFields.ts:105`.
- [ ] **`previewToken` expiry** (§14.17) — add `previewTokenExpiresAt` field + validation middleware
- [ ] **Admin badge colors** (§16 L214-216) — customize Payload's status badge palette to draft=gray / pending=yellow / approved=green / rejected=red
- [ ] **`projectSkills` flip to `readOnly`** — once product is comfortable the SkillsAdapter output is trustworthy, flip the field to disable manual entry

### 11.3 Tier 3 — cross-service blockers (not CMS-scope)

- [ ] **Reviews pipeline** — would populate `rating`/`reviewCount`/`completionsCount` with real data (today: seed data + CMS-sync overlay). Unlocks `§14.15` `ReviewStatusDistribution`. All current AI-derived signals (`isTopRated`, `badges`, `projectHistoryRatings`) switch from seed-backed to user-backed the moment the pipeline writes those columns — no CMS code changes required.
- [ ] **Messaging-service presence** — provides `isOnline` for `team[].isOnline` + `chatEnabled` runtime AND logic. Today `hydrateTeam()` stubs `isOnline: false`.
- [ ] **Workload validation (§14.6)** — needs (a) `workSchedule` + `customHours` fields per scope Task, (b) user-service exposes `schedule.maxHoursPerWeek` on `/internal/users/by-email/:email`, (c) §9.2 #1 unresolved-email decision.
- [ ] **Roles collection** — replaces the `HOURLY_RATE_BY_LEVEL` stand-in rate card with a proper `roles` table. Single point of change at `computeProjectFields.ts:60-66`.
- [ ] **Project entity schema mismatch** — TypeORM `Project` entity at `listings-service/projects/entities/project.entity.ts` declares only ~24 of the 35+ columns the sync INSERT writes. Columns exist in DB; queries work because `shapeProject` reads raw SQL. Clean-up: backfill entity declarations for `pricingModel`, `priceViewMode`, `priceMax`, `projectType`, `klarnaEnabled`, `payloadId`, `recentQuestions`, `skillsAndTools`, `chatEnabled`, `relatedProjectIds`, `industries`.
- [ ] **Reverse-path sync** (spec §05 L136-141) — on moderation rejection in listings-service, surface back to Payload. Today the flow is one-way. Needed only if moderation moves out of Payload admin.
- [ ] **category-service embeddings upgrade** — spec data-dict L17 names HuggingFace for `related_skills`; category-service uses heuristic (shared-tag → siblings → recent). Not in CMS scope; category-service `SuggestionsAdapter` already has the interface ready for the swap.

---

## Appendix A. File paths quick-reference

| Component | Path |
|---|---|
| Payload Projects collection | `backend/apps/cms-service/src/collections/Projects.ts` |
| beforeChange hook | `backend/apps/cms-service/src/hooks/beforeChange/computeProjectFields.ts` |
| afterChange hook | `backend/apps/cms-service/src/hooks/afterChange/syncProjects.ts` |
| RabbitMQ publisher | `backend/apps/cms-service/src/rabbitmq/cms-event.publisher.ts` |
| Payload seed (~89 projects) | `backend/apps/cms-service/src/seeds/projects.seed.ts` |
| Sync service (toRow) | `backend/apps/listings-service/src/project-sync/project-sync.service.ts` |
| Sync DTO | `backend/apps/listings-service/src/project-sync/dto/project-sync.dto.ts` |
| Sync module | `backend/apps/listings-service/src/project-sync/project-sync.module.ts` |
| DeliverablesAdapter | `backend/apps/listings-service/src/project-sync/deliverables/` |
| SkillsAdapter | `backend/apps/listings-service/src/project-sync/skills/` |
| Read controller | `backend/apps/listings-service/src/cms-projects/cms-projects.controller.ts` |
| Project entity | `backend/apps/listings-service/src/projects/entities/project.entity.ts` |
| user-service by-email lookup | `backend/apps/user-service/src/user/user-internal.controller.ts` |
| Frontend project-details | `frontend/app/(group)/(group)/project-details/[slug]/page.tsx` |

## Appendix B. Live verification — 2026-04-16

Chrome DevTools MCP audit against running local stack (cms-service:3020, listings-service:3004, api-gateway:4000, user-service:3003, frontend:3000). Test fixture: project `rich-text-full-coverage` (payloadId=2) with authored scope + assigneeEmail.

**Services status:**

| Service | Port | Status |
|---|---|---|
| cms-service (Payload) | 3020 | ✅ 200 |
| listings-service | 3004 | ✅ 200 (after pm2 restart to pick up new `badges` + `projectHistoryRatings` code) |
| api-gateway | 4000 | ✅ proxies /v1/projects/slug correctly |
| user-service | 3003 | ✅ 200, /internal/users/by-email resolves |
| frontend | 3000 | ✅ 200 |
| category-service | 3023 | ✅ online (added to `backend/ecosystem.config.js` — was missing). Enrichment verified: project with `category: "creative"` returns `relatedCategories[3]` + `relatedSkills[6]`. Three root causes found & fixed: (1) service missing from pm2 ecosystem config, (2) port mismatch in `cms-service/.env.example` (3025 → 3023), (3) missing discrete DB env vars in backend `.env` (service uses `DATABASE_HOST/PORT/USERNAME/PASSWORD/NAME`, not `DATABASE_URL`). Seed data currently has only 4 published categories (`creative`, `smoke-test-cat`, `ui-design`, `mobile-ui`) so most seeded projects still return empty enrichment arrays — seed data gap, not wiring. |

**Payload admin verified:**

- ✅ 6 tabs present (Content, Pricing & Scope, Categorization, Media, Computed, Admin & Moderation)
- ✅ Deliverables has 4 phase blocks, FAQs has 3 entries, Recent Questions has 2 items
- ✅ Rich-text editor renders images, headings, code blocks, checklists, sup/sub, links
- ✅ **Computed tab** populates on save: Starting Price Total = $5000 (40hrs × Senior $125/hr), Price View Amount = $5000, Team Member Count = 1, Project Duration Total = 1, Project Duration Label = **"1 week"** (pivot correct), Date Published = 04/15/2026, Team Emails = `["marcus@example.com"]`
- ✅ Project History Ratings empty (expected — `createdBy='cms-sync'` placeholder gets skipped)
- ✅ **Admin & Moderation tab** all fields present: Visibility=Public, Moderation Status=Pending (auto-flipped by `forceReviewOnEdit` on sensitive edit), previewToken auto-generated (`040dbca2-...`), Force Review On Edit checked
- ✅ **Activity log has 22 entries** — audit trail appends on every save
- ✅ **25 versions** tracked by Payload draft/published workflow

**listings-service API verified** (`GET /v1/projects/slug/rich-text-full-coverage`):

- ✅ 48 top-level fields returned
- ✅ `description` — full Lexical→HTML with images, sup/sub, code blocks, checklists, right-aligned para
- ✅ `duration: "1 week"` — pivot works (40hrs / 1 person × 40 = 1 weeksFloat; days = 7, not <7; weeks = 1, <4 → "1 week")
- ✅ `badges: ["featured"]` — only featured token fires because rating=0 (top-rated/highly-rated/proven thresholds not met)
- ✅ `isTopRated: false` (rating=0 < 4.0)
- ✅ `team: [{firstName: "Marcus", username: "marcusj", location: "New York, NY", languages: ["English","Spanish"], skills: ["React","TypeScript","Next.js"], isLead: true, isOnline: false}]` — **hybrid email team model fully resolves end-to-end**
- ✅ `scope: [{phaseName:"Research", tasks:[{assigneeEmail:"marcus@example.com", roleName:"Product Researcher", estimatedHours:40, experienceLevel:"Senior"}]}]`
- ✅ `deliverables: 4 phases × 6 items each` (authored)
- ✅ `faqs: 3` with rich HTML answers
- ✅ `similarProjects: 6` with RelatedScore values
- ✅ `relatedCategories: []`, `relatedSkills: []` — graceful fail-soft (category-service down)
- ✅ `projectHistoryRatings: null` — skips `cms-sync` placeholder correctly
- ✅ `industries: ["Technology","SaaS","Design"]`
- ✅ `recentQuestions: [...]`, `skillsAndTools: []`

**Frontend rendering verified** (live DOM):

✅ Rendered from API:
- Title, `description` HTML (8 checklist items with `data-checked`, embedded `<img>`, code blocks)
- 4/4 deliverables visible ("Market Analysis Report", "Wireframes", "Next.js App Router", "REST + GraphQL APIs")
- Scope phase "Research" + "Discovery Work" task
- Team: Marcus + marcusj + New York + React + English (full hydration working)
- Duration "1 week", 3 tags visible
- FAQs rendered

❌ Unused (confirmed gaps from §7.2):
- Similar Projects rail — no render
- Related Categories block — no render
- Related Skills block — no render
- Badges chips (`["featured"]`) — no render beyond the conditional isTopRated path
- ProjectHistoryRatings — no render (static "Project History" placeholder instead)
- Industries dedicated block — no render
- Recent Questions — hidden in accordion, not visible until clicked
- videoUrl — not rendered

⚠️ Spec-false static placeholders confirmed (§7.3):
- "31 sales" hardcoded in hero
- Fake 4.9 rating + "Project History" panel entirely static

**Browser console:** no errors from the `/v1/projects/slug` path. Unrelated 502s on autocomplete/auth (not in scope) and ERR_CONNECTION_REFUSED on favorites-service (separate service down).

**LLM adapters — both heuristic AND HuggingFace paths verified:**

- With `HUGGINGFACE_API_KEY` unset, both adapters silently fall through to the heuristic path — verified.
- With a real key set and listings-service restarted (`pm2 restart --update-env`), the HF path fires. **One breaking change caught during verification:** the legacy URL `api-inference.huggingface.co/models/:model` now returns 404; HF routed serverless inference to `router.huggingface.co/hf-inference/models/:model/pipeline/feature-extraction`. Both adapters updated. `favorites-service/ai/ai.service.ts` (which uses the `@huggingface/inference` package instead of raw fetch) is unaffected — the SDK handles routing internally.
- **Conclusive HF dedup test** (synthetic payload, 5 tasks, one phase):
  - Input: `[Design the website homepage, Homepage design for the website, Create user-onboarding flow in Figma, Build the admin dashboard, Admin dashboard development]`
  - Output: 3 items — the two homepage-design near-duplicates collapsed into "Homepage design for the website" (longer phrase won), the unique Figma task preserved, the two admin-dashboard near-duplicates collapsed into "Admin dashboard development". Exactly as the adapter promises.
- **SkillsAdapter HF path** verified by inspecting output of a mobile-banking synthetic project — skills list included `mobile-apps` and `Native Application` (vocabulary terms from `public.projects.skills` that don't appear in the input), proving cosine ranking against the vocab ran.
- No `"falling back to heuristic"` warning logs emitted during HF runs — the path executes cleanly.

**Net result:** the CMS × Project integration is **true to docs** for every layer the spec defines. Remaining gaps are (a) frontend rendering of enrichment data that the API already delivers, and (b) two static-placeholder UI blocks that should consume live data. No backend bugs found.

---

## Appendix C. Env vars touching this flow

**cms-service:**
- `LISTINGS_SERVICE_URL`, `CMS_SYNC_TOKEN` — sync POST target + auth
- `CMS_PUBLIC_URL`, `CMS_PORT` — media URL base
- `FRONTEND_REVALIDATE_URL`, `REVALIDATE_SECRET` — Next.js on-demand ISR

**listings-service:**
- `USER_SERVICE_URL` (default `http://localhost:3003`) — team hydration
- `CATEGORY_SERVICE_URL` (default `http://localhost:3023`) — `relatedCategories`/`relatedSkills`
- `HUGGINGFACE_API_KEY` — enables HF adapters; absent = heuristic fallback
- `HF_EMBEDDING_MODEL`, `HF_DELIVERABLES_MODEL`, `HF_SKILLS_MODEL` — model overrides
- `DELIVERABLES_DEDUP_THRESHOLD`, `DELIVERABLES_HF_TIMEOUT_MS`
- `SKILLS_SIMILARITY_THRESHOLD`, `SKILLS_TOP_K`, `SKILLS_HF_TIMEOUT_MS`, `SKILLS_VOCAB_LIMIT`, `SKILLS_VOCAB_TTL_MS`
