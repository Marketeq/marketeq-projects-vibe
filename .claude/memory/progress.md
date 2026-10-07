# Progress Tracker

## Multi-Agent Coordination Rules
- Before starting a service: check "In Progress" — if it's already claimed, pick another
- When claiming: add `- <service-name> [CLAIMED by <agent-worktree/branch>]` to In Progress immediately
- When done: move to Completed with a one-line summary
- Services with unmet dependencies (see below) must wait — do not start them early

## Completed Services
- auth-service – JWT auth, OAuth (Google, LinkedIn), session management
- user-service – talent profile, certifications, education, experience, industries, languages, skills
- listings-service – projects, services, jobs, teams, media
- checkout-service – Stripe checkout, wallet, webhooks
- messaging-service – Ably real-time, message threads, history, E2E encryption (AES-256-GCM + RSA-4096-OAEP key wrapping)
- notification-service – Ably push, SendGrid email, event handlers, preferences
- contracts-service – contract groups, lifecycle (pending→active→ended/canceled/disputed), audit logging, CRON auto-cancel, RabbitMQ events
- time-tracking-service – complete service, code review fixes, QA tested all endpoints
- transaction-service – ledger entries, Stripe webhooks, RabbitMQ events, 3 migrations, 62 .ts files
- billing-service – Stripe checkout, QuickBooks, wire transfers, RabbitMQ, 15 .ts files
- pricing-service – rate cards, fee calculation, FX rates, 30 .ts files
- portfolio-service – media handling, legacy portfolio items, case-study builder (create/edit/publish/hide/delete, R2 media upload, RabbitMQ events) — frontend fully wired to the real API as of 2026-08-25 (was localStorage-only before); see services/portfolio-service.md
- content-moderation-service – text/media filters, profanity detection, approval flow, 48 .ts files
- search-service – Algolia indexing, filter config, autocomplete, 8 .ts files
- suggestions-service – dynamic job title suggestions, RabbitMQ, 9 .ts files
- earnings-service – balance tracking, RabbitMQ consumers (6 events), currency conversion (4-tier fallback), CSV/PDF export, Redis caching, service-to-service auth, 5 migrations
- payout-service – withdrawals, deposit methods (Stripe/PayPal/Wise/Payoneer/Crypto), schedule engine, magic link, KYC gating, pause system, 22 modules, 97 .ts files
  - PMCM-806 (2026-10-14): withdrawal notifications. payout-service `notifications/withdrawal-notifier.service.ts` emits `notification.payout.withdrawal` (N-01 submitted from the queue processor, N-02/N-03 from PayoutPublisher) → notification-service `sendWithdrawalNotification` (in-app via dispatch, category `payouts`→General; branded email always sent, `templates/withdrawal.template.ts`). Failure reasons map to 5 approved lines in `withdrawal-failure-reason.ts`; links fall back to `/earnings?tab=payouts|overview` until a transaction-detail page exists.
- offer-service – complete offer lifecycle, counter-offers, milestones, templates, notifications, work schedules, 164 files

## In Progress
- homepage (api-gateway module + frontend SSR) — ~85% complete, backend done, frontend wired, tests pending
- identity-verification-service + location-service (branch `identity-verification/integration`) — core service, VPN/proxy detection (proxycheck.io), and location detection are real and tested, all committed (4 commits), branch synced 0-behind dev-main. Blocked end-to-end by api-gateway's frozen `proxy.service.ts` missing route entries (CTO-only fix, not yet applied). Didit real document/face-match/liveness scanner integration has a fully corrected implementation plan but zero code written. Document-selection screen (country → accepted document types) plumbing is real and tested (backend endpoint + submit-time validation, 103/103 tests) but deliberately not backed by a real Didit data source yet — verified none is publicly supported, user chose to hold that decision — uncommitted. See `.claude/memory/services/identity-verification-service.md` for full detail.

## Available Now (no blocking dependencies)
These can be built immediately in parallel:
- autocomplete-service (standalone)
- suggestions-service (depends on user-service ✅)
- favorites-service (depends on listings-service ✅)
- portfolio-service (depends on user-service ✅)
- invitations-service (depends on notification-service ✅)
- content-moderation-service (depends on listings-service ✅)
- search-service (depends on listings-service ✅ + user-service ✅)
- algolia-service (depends on listings-service ✅ + user-service ✅)
- transaction-service (depends on checkout-service ✅)
- api-gateway (routes to all services — can start now, expand as services are added)

## Blocked (waiting on other services)
- contracts-service → ✅ DONE
- earnings-service → needs contracts-service ✅ + transaction-service
- payout-service → needs earnings-service + billing-service
- billing-service → needs checkout-service ✅ (unblocked now)
- time-tracking-service → ✅ DONE
- admin-service → needs most services complete
- affiliate-referral-service → standalone, low priority

## Known Dependencies Map
- favorites-service → listings-service
- contracts-service → listings-service + user-service
- earnings-service → contracts-service + transaction-service
- payout-service → earnings-service + billing-service
- transaction-service → checkout-service
- search-service / algolia-service → listings-service + user-service
- content-moderation-service → listings-service
- invitations-service → notification-service
- suggestions-service → user-service
- autocomplete-service → standalone
- portfolio-service → user-service
- time-tracking-service → contracts-service (RabbitMQ `contracts.parties.rpc` for contract client/talent lookups, 2026-10-03)

## Frontend Progress
- Homepage: SSR page fetches from api-gateway `/homepage`, renders dynamic sections (projects, services, teams, talent), hero, banner, categories, SEO metadata. Uses `ListingCard`/`ListingCardCompact` components. Types aligned with backend.
- Inbox/messaging UI: fully wired to backend APIs, E2E encryption integrated (client-side AES encrypt/decrypt, key exchange, cookie-based auth)
- UI component library: complete (/components/ui/)
- Types: defined for user, talent, client, project, conversation, message, auth, homepage
- E2E tests: Playwright + Cucumber setup, auth tests written

## Setup Notes (for new devs)
- `E2EE_SERVER_SECRET` must be added to backend/.env for messaging-service
- `user_keys` and `user_devices` tables must exist in user_service schema (run migration manually or execute SQL)
- Gateway needs `messaging`, `user-keys`, `devices` route mappings (in proxy.controller.ts)
- **listings-service local DB migration chain is currently broken** — `1797000000000-AddTeamProfileFields` fails on a missing `public.teams` table, which blocks everything after it including `1798000000000-AddPendingInviteEmails`. Net effect: `listings.project` is missing the `pendingInviteEmails` column locally, so `getMyProjects`/`/publish/projects/mine` and project draft create/fetch all 500 locally. See `services/listings-service.md` for detail. Found/documented 2026-10-06 during PMCM-254; not fixed.

## Recent Feature Work
- **PMCM-254 "Basic Info Section" (2026-10-06)**: audited + implemented against the inline editor's Project Info modal (`my-listings/[slug]/page.tsx`), the edit-listing wizard's equivalent step, and listings-service. Key fixes: backend slug-regeneration-on-every-title-edit bug (now first-save-only, both the publish module and the legacy projects module — confirmed correct in a follow-up pass: untitled drafts get `slug: null`, not a placeholder, so the first non-empty title save is the only trigger), DTO limits for title (120) and category count (max 3 — safe, both editors cap category count on hydration), modal helper text/placeholders/compact Project Type dropdown (`w-32`, not an arbitrary `w-[130px]`)/label styling to match Figma, Save-button dirty-tracking (Project Type and Categories previously weren't re-hydrated on modal open, so Cancel didn't actually discard those two fields), suggested-category hide-when-3-categories-set + first-empty-row targeting, sub-category input disabled until a category is chosen, exact-string publish errors ("Title is required.", "At least one category is required." — additive, at the header-level per-field errors only, not the broader 3-category "full polish" bar), hyphenated sub-category limit message on both editors (UI-side only, see below), and the wizard's sidebar navigation lock (steps were visually marked invalid but still clickable — `stepsState.disabled` existed in the hooks model but the Sidebar component never read it). A `@ArrayMaxSize(5)` on `ProjectCategorySelectionDto.subCategories` was added then deliberately removed in a follow-up pass once traced: neither editor caps subcategories-per-category on hydration, so it would 400 every wizard autosave (and any inline-editor Categories-tab save) for an existing listing already over 5 in a row — see `services/listings-service.md` for the full trace. Left alone/flagged for product input: Short Description max-length change to 300 (blocked — current `SHORT_DESCRIPTION_MIN_LENGTH` is 350, so lowering the max below the min would make the field impossible to save; Figma shows no minimum at all for this field), wizard's category count being "exactly 3 required" instead of "up to 3, at least 1" and project type not being required at all in the wizard's zod schema (didn't change — too large/risky a change to step-validity gating for this pass), legacy `projects.service.ts`/`projects.controller.ts` has no DTO validation at all (not touched — separate module, likely not what either editor actually calls).
