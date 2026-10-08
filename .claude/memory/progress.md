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
- offer-service – complete offer lifecycle, counter-offers, milestones, templates, notifications, work schedules, 164 files

## In Progress
- homepage (api-gateway module + frontend SSR) — ~85% complete, backend done, frontend wired, tests pending
- identity-verification-service + location-service (branch `identity-verification/integration`) — core service, VPN/proxy detection (proxycheck.io), and location detection are real and tested, all committed (4 commits), branch synced 0-behind dev-main. Blocked end-to-end by api-gateway's frozen `proxy.service.ts` missing route entries (CTO-only fix, not yet applied). Didit real document/face-match/liveness scanner integration has a fully corrected implementation plan but zero code written. Document-selection screen (country → accepted document types) plumbing is real and tested (backend endpoint + submit-time validation, 103/103 tests) but deliberately not backed by a real Didit data source yet — verified none is publicly supported, user chose to hold that decision — uncommitted. See `.claude/memory/services/identity-verification-service.md` for full detail.
- verification gates (branch `feature/verification-gates-enforcement`, stacked on PR #746) — G7 invitation acceptance enforced and live-tested (2026-10-08): invitations-service asks identity-verification-service over RabbitMQ (`{gateOpen, missingRequirements}` only); closed gate = 403 `VERIFICATION_REQUIRED`, unavailable/malformed/unconfigured = fail-closed 503 `IDENTITY_VERIFICATION_UNAVAILABLE`; blocked acceptance has zero side effects. Existing frontend shows a generic error. Team gating is outside the original IDV epic but authorized for this initiative. G3 blocked (no job-application action), G5 blocked (roster endpoint ownership), G9 planned as a later PR, G1/G2/G4/G8 not started. See `services/identity-verification-service.md`.

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
