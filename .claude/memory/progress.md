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
- portfolio-service – media handling, Editor.js blocks, auth/access control, 20 .ts files
- content-moderation-service – text/media filters, profanity detection, approval flow, 48 .ts files
- search-service – Algolia indexing, filter config, autocomplete, 8 .ts files
- suggestions-service – dynamic job title suggestions, RabbitMQ, 9 .ts files
- earnings-service – balance tracking, RabbitMQ consumers (6 events), currency conversion (4-tier fallback), CSV/PDF export, Redis caching, service-to-service auth, 5 migrations
- payout-service – withdrawals, deposit methods (Stripe/PayPal/Wise/Payoneer/Crypto), schedule engine, magic link, KYC gating, pause system, 22 modules, 97 .ts files
- offer-service – complete offer lifecycle, counter-offers, milestones, templates, notifications, work schedules, 164 files

## In Progress
- homepage (api-gateway module + frontend SSR) — ~85% complete, backend done, frontend wired, tests pending

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
- time-tracking-service → contracts-service

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
