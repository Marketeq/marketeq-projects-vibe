# CMS × Projects Integration Audit (Docs vs Payload)

**Audit focus:** Editorial fields described in CMS Service docs (historically written for **Strapi**) versus what is implemented in **Payload CMS** (`backend/apps/cms-service/src/collections/Projects.ts`).

**Related:** [`GAP-ANALYSIS.md`](./GAP-ANALYSIS.md) — deeper end-to-end pipeline audit (hooks, listings-service sync, read API, frontend).

---

## How to read the specs

- Documentation often says **Strapi**; this repo uses **Payload v2** in **cms-service**. The editorial role is the same: admins author here; the marketplace reads **listings-service**, not Payload directly.
- Public source of truth: **`public.projects`** (Postgres) in listings-service.

---

## A. Strapi Collection Type — “editable in admin” vs Payload

Reference: `projects/details/Strapi Collection Type_ Project Listings (Based on Final Project Details Design).md`

| Doc (editable) | Payload field | Match |
|----------------|---------------|--------|
| Title | `title` | Yes |
| Slug (UID from title) | `slug` (slugify hook) | Yes |
| Category (single enum) | `categories[]` (max 3, text) | Different: multi-value strings, not single enum |
| Short description | `shortDescription` (required, max 320) | Different: §16 elsewhere suggests 300 chars |
| Full description | `fullDescription` (Lexical richText) | Yes (`project_description` / `description` in other docs) |
| Deliverables (rich text or JSON) | `deliverables` — phases × items | Different shape: structured phases, not one rich-text block |
| Timeline (number + enum) | `timelineValue` + `timelineUnit` | Yes |
| Total estimated hours | `totalEstimatedHours` | Yes |
| Skills & tools (repeatable title + icon) | `skillsAndTools` (`title` + `icon` upload) | Yes |
| Pricing model | `pricingModel` | Broader: Payload adds quarterly/yearly vs doc’s three values |
| Price range min–max | `priceRangeMin`, `priceRangeMax` | Yes |
| Project type | `projectType` | Yes |
| Use case tags (M2M Tags collection) | `tags[]` (text) | Different: free-text tags, not a relation |
| Thumbnail | `thumbnail` → `media` | Yes |
| Gallery | `gallery[]` | Yes |
| Video walkthrough | `videoWalkthrough` (upload **or** `externalUrl`) | Broader than §16 “URL only” (see section B) |
| Status | Payload drafts → `_status`; plus `visibility`, `moderationStatus` | Split workflow vs single Strapi status enum |
| Featured | `featured` | Yes |
| Created by (admin relation) | `ownerId` (UUID text, user-service) | Different: not Strapi admin user relation |
| Preview URL (computed) | `previewToken` (read-only); full preview URL not assembled in admin | Partial |
| Meta title / description | `seoTitle`, `seoDescription` | Yes |
| OG image (optional SEO) | Not a dedicated field on `Projects` | Gap vs Strapi Collection doc |

---

## B. §16 — Project publishing fields vs Payload

Reference: `projects/details/16 - Strapi Integration – Step-by-Step Developer Documentation (for Project Publishing Fields).md`

| Doc field | Payload | Notes |
|-----------|---------|--------|
| `short_description` | `shortDescription` | Limit mismatch vs §16 (300 vs 320) |
| `description` | `fullDescription` | Same role |
| `deliverables` | `deliverables` | Doc: rich text; listings-service derives structured phase groups when empty; cms-service backfills into Payload as Lexical rich-text for admin editing |
| `status` | `_status` + `moderationStatus` | Two axes vs one combined enum |
| `visibility` | `visibility` | Yes |
| `owner_id` | `ownerId` | Yes |
| `admin_notes` | `adminNotes` | Yes |
| `admin_tags` | `adminTags` | Yes |
| `is_flagged` | `isFlagged` | Yes |
| `moderation_status` | `moderationStatus` | Yes |
| `force_review_on_edit` | `forceReviewOnEdit` | Yes |
| `featured_image` | `thumbnail` | Renamed |
| `additional_images` | `gallery` | Yes |
| `video_url` (embed only, no upload) | `videoWalkthrough.upload` **or** `externalUrl` | Implementation allows upload |
| `scope` (Phase / Task) | `scope` | Core task fields align; **`assigneeEmail` on task** replaces separate `assigned_team` (see GAP hybrid team model) |
| Team: `assigned_team`, `user_email`, `work_schedule`, `custom_hours` | **`assigneeEmail` on each task only** | **Gap:** no work schedule / custom hours / separate team component |
| FAQs | `faqQuestions` | Yes (`question` + `answer` richText) |
| `seo_title` / `seo_description` | `seoTitle` / `seoDescription` | Yes |
| `related_projects` | `relatedProjects` (M2M self-reference) | Yes |
| `preview_token` | `previewToken` | Yes; expiry not enforced (see GAP §14.17) |
| `activity_log` | `activityLog` | Partial: no `old_value` / `new_value` on entries |

Additional fields from the broader project design (creation flow, data dictionary) are covered in Payload as: `pricingModel`, `priceViewMode`, price range, `projectType`, `klarnaPaymentEnabled`, `categories`, `subcategories`, `tags`, `projectSkills`, `programmingLanguages`, `developmentTechnologies`, `industries`, `faqQuestions`, `recentQuestions`, and sidebar toggles (`chatEnabled`, `reportButtonEnabled`, `shareButtonEnabled`, `helpButtonEnabled`). Computed mirrors live under the **Computed** tab (`startingPriceTotal`, `priceViewAmount`, `teamMemberCount`, `projectDurationTotal`, `projectDurationLabel`, `projectHistoryRatings`, `teamEmails`, `datePublished`).

---

## C. `data-dictionary.csv` — editability vs CMS

Reference: `projects/details/data-dictionary.csv`

| Concept | Doc constraint | In Payload CMS? |
|---------|----------------|-----------------|
| `starting_price_total`, `price_view_amount`, `team_member_count`, `project_duration_total`, `project_duration_label` | Auto-calculated | Read-only (**Computed** tab) |
| `price_view_mode` | Editable | `priceViewMode` (editable) |
| `project_description` | Editorial | `fullDescription` |
| `programming_languages`, `development_technologies`, `project_categories`, `project_tags`, `project_subcategories` | Editorial limits | Arrays: `programmingLanguages`, `developmentTechnologies`, `categories`, `tags`, `subcategories` |
| `project_skills` | Often described as AI-derived | `projectSkills` — **still editable** (manual override; may go read-only later per GAP) |
| `chat_enabled` | Runtime / presence | `chatEnabled` — editorial override until messaging presence is wired |
| `recent_questions`, `faq_questions` | Moderated | `recentQuestions`, `faqQuestions` |
| `related_categories`, `related_skills`, `recommended_projects`, `similar_projects`, `recently_viewed_projects` | System or user-specific | Not CMS — enrichments or other services |
| `project_date_published` | Auto | `datePublished` (read-only) |
| `project_history_ratings` | Calculated | Read-only in CMS; API may derive further |
| `created_by_name`, `created_by_email` | Profile | `ownerId` only (no parallel name/email fields on collection) |
| `current_team_avatars` | From assignments | Derived from `scope[].tasks[].assigneeEmail` |
| UI-only (`start_project_button`, `save_to_list`, `*_button_state`, etc.) | Frontend / user state | **Not modeled** in Payload (by design in collection comments) |

Note: CSV lists `project_subcategories` twice; Payload has a single `subcategories` field.

---

## D. Summary

| Area | Status |
|------|--------|
| Core editorial, pricing, scope, categorization, media, moderation, SEO (except dedicated OG image) | Implemented with naming/shape differences above |
| §16 team / workload (`assigned_team`, `work_schedule`, `custom_hours`) | **Not implemented** — only `assigneeEmail` on tasks |
| §16 video as URL-only | **Payload allows video upload** |
| Strapi Collection optional **OG image** | **No dedicated field** on `Projects` |
| Activity log **old/new values** | **Not modeled** |
| Tags as relation to global Tags collection | **Plain text arrays** |
| Reverse sync (listings → Payload on moderation reject) | **Not implemented** (forward sync only; see GAP) |

---

## Code references

| Artifact | Path |
|----------|------|
| Payload `Projects` collection | `backend/apps/cms-service/src/collections/Projects.ts` |
| `beforeChange` compute hook | `backend/apps/cms-service/src/hooks/beforeChange/computeProjectFields.ts` |
| `afterChange` sync hook | `backend/apps/cms-service/src/hooks/afterChange/syncProjects.ts` |
| listings-service sync | `backend/apps/listings-service/src/project-sync/project-sync.service.ts` |

---

*This document summarizes doc-vs-implementation field mapping. For CI-level verification, hooks, DTOs, and frontend consumption rates, use [`GAP-ANALYSIS.md`](./GAP-ANALYSIS.md).*
