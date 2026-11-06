> STOP. Read [CONFIDENTIALITY.md](CONFIDENTIALITY.md) before doing any work in this repo.

# CLAUDE.md

## 🛑 PIXEL PERFECT — MANDATORY DEFINITION (read before every Figma task)

**Pixel perfect means zero visual or structural deviation from the Figma design.**

### What it requires — no exceptions:
1. **Every spacing value is exact.** `padding: 11px` in Figma → `pb-[11px]`, not `pb-2` (8px). `gap: 12px` → `gap-3`, not `gap-2`.
2. **Every color is exact.** Figma hex `#306CFE` → must render as `#306CFE`. Design system token `primary-500` is only acceptable if its value IS `#306CFE`. Verify it.
3. **Every font size, weight, line-height is exact.** `14px / 600 / 20px` → `text-[14px] font-semibold leading-5`.
4. **Every border radius, shadow, size is exact.** `border-radius: 5px` → `rounded-[5px]`, not `rounded`. `size: 40px` → `size-[40px]` or `size-10` (they are equal — verify).
5. **Design system components override with className.** When a design system component has hardcoded defaults that conflict with Figma (e.g. `pb-2` instead of `pb-[11px]`), override them via `className` using `twMerge`. If a variant conflicts, use `variant="unstyled"` and apply all classes manually.
6. **Never eyeball or approximate.** Open Figma Dev Mode, read the exact CSS property values, paste them. Do not substitute "close enough" values.
7. **Verify in browser.** After implementing, take a screenshot and compare side-by-side with the Figma. If anything is off by even 1px, fix it before declaring done.

### What pixel perfect is NOT:
- Adding the right components with wrong spacing/sizing
- "Close enough" padding (8px when Figma says 11px)
- Using a rounded value when Figma says a specific decimal
- Saying it's done without visually verifying in the browser

**Violation = redo from scratch against the Figma. No partial credit.**

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🛑 Code Review SOP + DevOps SOP (MANDATORY reading before any PR work)

**Every Claude Code session in this repo must read and follow both `docs/CODE_REVIEW_SOP.md` and `docs/DEVOPS_SOP.md` before opening, reviewing, or merging any pull request.**

`docs/CODE_REVIEW_SOP.md` defines the code-review rules:

- The non-negotiable rules (no overriding existing code, no touching profile loading or login-frozen files without the four-point confirmation, incremental changes only, env-driven login config, bidirectional login invariant)
- The seven-point review checklist
- The only approved merge procedure (`gh pr merge <N> --squash --delete-branch` then verify)
- The block-comment template for failing PRs
- The exact Claude CLI prompt to use for reviews (§15)

`docs/DEVOPS_SOP.md` defines the deployment topology and promotion flow:

- Branch model (`dev-main` → `staging` → `live-mvp`) and which envs each branch deploys to
- Vercel topology (three projects, one per branch) and Render topology (single service)
- The six frozen env templates (`.env.{local,staging,production}.example` × frontend/backend) and the four-point confirmations per environment
- The env-driven login rule (no hardcoded URLs, cookie flags, or CORS origins) enforced by the SOP check
- The QA promotion flow scripts and role separation between code review and devops

**All CI/CD runs on Jenkins (72.61.77.231:8080).** GitHub Actions are disabled (free plan minutes exhausted). GitHub webhook delivers events to the Jenkins `github-webhook-dispatcher` pipeline.

**PR gate checks (posted as GitHub commit statuses):**
1. `Jenkins / SOP Check` — mechanical SOP checker (secrets, junk files, off-limits login/profile files, env template branch mismatch, hardcoded login values, entity without migration, oversized PRs, `@ts-ignore` without justification). Blocks the PR on any violation.
2. `Jenkins / Deep Regression Check` — Claude Sonnet 4.6 deep regression detector. Reads full before/after files, traces import chains, checks API contracts, verifies data flows against REGRESSION_MANIFEST.json. BLOCKs PRs with critical regressions.
3. `Jenkins / Branch Freshness` — blocks stale PRs. Detects when a branch is behind the base and has conflicting files (same file changed in both). Prevents regressions from merging outdated branches that silently overwrite newer code.
4. `Jenkins / Secret Scan` — gitleaks secret scanning on every PR.
5. `Jenkins / Login Gate` — blocks PRs touching login/auth files unless repo owner approves.
6. `Jenkins / Code Review` — AI code review on every PR to protected branches.
7. `.github/CODEOWNERS` — directory-scoped ownership, auto-requests the right reviewers on every PR.

**Post-merge enforcement (triggered on push to protected branches):**
7. `post-merge-audit` — opens an urgent issue (assigned to @CTorres9800) for merges that bypassed SOP checks, and publicly flags the bypass. **Report only: it never modifies code.** No workflow, script, button, or agent may remove a developer's merged code. A failing check is fixed forward. See `CODE_REVIEW_SOP.md` §1.1 and §1.9.
8. `login-violation-alert` — opens issues when login files are merged without owner approval.

**Post-deploy automation:**
- Deployment orchestration (Render, Vercel, n8n)
- Post-deploy smoke tests
- Staging sync (`sync-dev-main-to-staging`)
- Stale branch cleanup (weekly)

If you are reviewing a PR via Claude CLI, use the prompt in §10 of the SOP verbatim.

## What This Project Is
Marketeq is a freelance marketplace / talent network platform (similar to Upwork/Fiverr), built with:
- **Backend**: NestJS monorepo with microservices at `/backend/apps/`
- **Frontend**: Next.js App Router at `/frontend/`
- **Docs**: All technical specs at `/docs/md/` (markdown) and `/docs/Technical Documentation/` (original .docx)

Clients post projects/listings, talent applies or gets invited, work happens
through contracts with time tracking and a checklist/task board, payment moves
through Stripe (plus Wise/Payoneer/crypto payout rails), messaging is
end-to-end encrypted and realtime via Ably, and category/editorial content is
served from an internal Payload CMS service. Every domain (auth, listings,
messaging, contracts, payouts, etc.) is its own NestJS microservice with its
own Postgres schema, talking to each other over RabbitMQ and reachable from
the outside only through the API Gateway.

## How To Start The App Locally

Prerequisites running first: PostgreSQL, RabbitMQ (`5672`), and Redis
(`6379`) — several services (OAuth state, Bull queues, rate limiting) need
Redis even though it isn't mentioned elsewhere in this file.

```bash
# 1. RabbitMQ + Redis (Docker, or use local installs)
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
docker run -d --name redis -p 6379:6379 redis:7

# 2. Env files
cp backend/.env.local.example backend/.env
cp frontend/.env.local.example frontend/.env.local   # fill in blanks: OAuth keys, cloud picker keys

# 3. Install deps
cd backend && npm install --legacy-peer-deps
cd ../frontend && npm install --legacy-peer-deps

# 4. Build backend services (PM2 runs the compiled dist/, not ts-node — see below)
cd ../backend
for svc in apps/*/src/main.ts; do npx nest build "$(echo $svc | cut -d'/' -f2)"; done

# 5. Start backend (all services via PM2)
npm run dev

# 6. Start frontend, separate terminal
cd ../frontend && npm run dev
```

App: **http://localhost:3000**. API Gateway (single external entry point for
the frontend): **http://localhost:4000**.

After starting, PM2 reporting "online" does **not** mean a service is
healthy — always verify:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health  # api-gateway
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health  # auth-service
curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/health  # user-service
```
All must return 200. A `000` almost always means RabbitMQ (or Redis) wasn't
up before `npm run dev` ran — check `npm run dev:logs`.

## How To Start Every Backend Service

`npm run dev` (PM2, from `backend/`) starts every service below at once per
`backend/ecosystem.config.js`. To run one service on its own in watch mode
instead (from `backend/`, standard NestJS services):
```bash
npx nest start <service-name> --watch
```
`cms-service` and `scheduling-service` are not Nest CLI apps — start them
with `npm run start:dev` from inside their own `apps/<service>` directory.

| Service | Port | Notes |
|---|---|---|
| api-gateway | 4000 | single HTTP entry point |
| auth-service | 3001 | |
| user-service | 3002 | needs more heap (`--max-old-space-size=1024`) |
| listings-service | 3004 | |
| search-service | 3007 | |
| offer-service | 3011 | nested build output |
| contracts-service | 3010 | |
| checkout-service | 3009 | |
| messaging-service | 3005 | nested build output; end-to-end encrypted, needs `E2EE_SERVER_SECRET` or it refuses to start |
| notification-service | 3006 | nested build output; sends via Brevo (SendGrid path exists but is commented out) |
| favorites-service | 3012 | nested build output |
| invitations-service | 3013 | nested build output |
| content-moderation-service | 3014 | also depends on a separate Python FastAPI service (`clip_moderation_api.py`) on port 8000 for image/video moderation |
| portfolio-service | 3015 | |
| autocomplete-service | 3016 | |
| time-tracking-service | 3017 | |
| transaction-service | 3018 | |
| identity-verification-service | 3019 | |
| cms-service (Payload CMS) | 3020 | admin UI at `/admin`; category-service authenticates to it via an API key, not JWT |
| suggestions-service | 3021 | |
| payout-service | 3022 | Wise/Payoneer OAuth, Stripe Financial Connections, crypto on/off-ramp |
| category-service | 3023 | talks to cms-service |
| scheduling-service | 3024 | `npm run start:dev`, not Nest CLI |
| earnings-service | 3026 | |
| billing-service | 3027 | |
| resume-parsing-service | 3028 | |
| pricing-service | 3029 | |
| location-service | 3036 | |
| browsing-history-service | 3034 | nested build output |

## How To Run The Tests

**Backend** (from `backend/`) — no root `npm test` script exists; run Jest
directly, scoped to one service's test path:
```bash
npx jest --testPathPattern=apps/<service-name>
# e.g. npx jest --testPathPattern=apps/auth-service
```
48 `*.spec.ts` files exist across `backend/apps/*` today.

**Frontend** — there is no unit/e2e test runner configured (no `test` script
in `frontend/package.json`). Correctness is enforced instead by:
```bash
npm run types:check   # tsc
npm run lint           # next lint
npm run tooling         # format:check + lint + types:check together
npm run storybook        # visual verification against Storybook, port 6006
```

## Where Things Live

```
backend/
  apps/<service-name>/src/   # one NestJS microservice per domain, own DB schema
  apps/<service-name>/src/migrations/   # TypeORM migrations (synchronize: false everywhere)
  apps/cms-service/          # Payload CMS (category/editorial content), npm run start:dev
  ecosystem.config.js         # PM2 process list — the source of truth for services/ports
  shared/                      # code shared across services

frontend/
  app/                # Next.js App Router pages
  components/ui/, components/*.tsx, stories/  # Storybook design system — read-only, see COMPONENTS.md
  service/            # Axios API clients, one file per domain
  service/index.ts    # the Axios instance: reads NEXT_PUBLIC_API_URL, attaches Bearer token, auto-refreshes on 401
  lib/runtime-urls.ts # single source of truth for URL resolution — never read process.env directly elsewhere
  contexts/auth.tsx   # AuthProvider — calls UserAPI.me(), exposes user state + logout

docs/
  md/<Service Name>/         # per-service technical docs (markdown, converted from .docx)
  CODE_REVIEW_SOP.md, DEVOPS_SOP.md, STAGING_PROMOTION_SOP.md, JENKINS_GUIDE.md, ...

.claude/memory/    # shared agent memory — read before starting any work (see below)
scripts/            # agent worktree spawn/merge/cleanup, docs conversion
```

## Environment Variables

Six frozen env templates are the source of truth — three per app, one per
environment (`docs/DEVOPS_SOP.md` §5): `backend/.env.{local,staging,production}.example`
and `frontend/.env.{local,staging,production}.example`. They're checked into
the repo; copy the `.local.example` ones for local dev (already filled with
localhost values) and fill in the real secrets.

**Backend** (`backend/.env.local.example`), by area:
- Core: `NODE_ENV`, `APP_ENV`, `PORT`
- CORS/cookies: `CORS_ORIGIN`, `CORS_CREDENTIALS`, `COOKIE_DOMAIN`, `COOKIE_SAMESITE`, `COOKIE_SECURE`
- JWT: `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_ACCESS_TOKEN_TTL`, `JWT_REFRESH_TOKEN_TTL`, `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY` (set via shell/gitignored file, never committed)
- Database/queue: `DATABASE_URL`, `DATABASE_SSL`, `RABBITMQ_URL`
- Inter-service: `EARNINGS_SERVICE_URL`, `FRONTEND_URL` (also builds the password-reset link)
- Email: `BREVO_API_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME`, `BREVO_*_TEMPLATE_ID`, `SENDGRID_API_KEY` (fallback path)
- Storage: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_CDN_BASE`
- Payments/payouts: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_FC_RETURN_URL`, `STRIPE_PLATFORM_ACCOUNT_ID`, `STRIPE_API_VERSION`, `BANK_ENCRYPTION_KEY`, `OAUTH_TOKEN_ENCRYPTION_KEY`, `CRYPTO_ADDRESS_ENCRYPTION_KEY`, `WISE_CLIENT_ID`/`WISE_CLIENT_SECRET`/`WISE_REDIRECT_URI`/`WISE_API_BASE_URL`, `PAYONEER_CLIENT_ID`/`PAYONEER_CLIENT_SECRET`/`PAYONEER_REDIRECT_URI`/`PAYONEER_API_BASE_URL`, `OAUTH_STATE_TTL_SECONDS`, crypto on/off-ramp keys (`RAMP_*`, `TRANSAK_API_KEY`, `CRYPTO_COM_API_KEY`, `COINBASE_COMMERCE_API_KEY`)
- Messaging: `E2EE_SERVER_SECRET` (messaging-service refuses to boot without it) — generate with `openssl rand -hex 32`
- CMS auth: `CMS_API_KEY` (category-service → cms-service, Payload API-Key auth, not JWT)

**Frontend** (`frontend/.env.local.example`) — per this repo's own permission
settings I'm configured to stay out of `frontend/`, so I didn't read this
file directly. Per `docs/DEVOPS_SOP.md` §5, each of the three frontend
templates independently owns: `NEXT_PUBLIC_BACKEND_URL`/`BACKEND_URL`,
`NEXT_PUBLIC_COOKIE_SAMESITE`, `NEXT_PUBLIC_COOKIE_SECURE`,
`NEXT_PUBLIC_COOKIE_DOMAIN`, `NEXT_PUBLIC_AUTH_MODE`, and `NODE_ENV`; the
architecture section below also names `NEXT_PUBLIC_API_URL` as what
`service/index.ts` reads. Open `frontend/.env.local.example` yourself for the
full/current list.

## How The Frontend Talks To The Backend

- The frontend never calls individual microservices directly — everything
  goes through the **API Gateway** on port 4000, which proxies to the right
  service (`proxy.controller.ts` / `proxy.service.ts`).
- `frontend/service/index.ts` is the single Axios instance: reads
  `NEXT_PUBLIC_API_URL`, attaches the Bearer token from the `access_token`
  cookie on every request, and on a `401` calls `POST /auth/refresh` and
  retries once — on failure it clears cookies and the user is logged out.
- `frontend/lib/runtime-urls.ts` (`getPublicApiUrl`/`getPublicAuthUrl`/`getPublicBackendUrl`)
  is the only place URLs get resolved; nothing else should read
  `process.env` for a backend URL directly.
- Auth cookies: `access_token`, `refresh_token`, `session_id`. CORS on the
  gateway is driven entirely by the `FRONTEND_URL` env var plus a Vercel
  preview pattern — hardcoding origins is a DevOps SOP violation.
- Realtime (messaging, live updates) goes over **Ably**, not the REST API.

## Commands

### Backend (run from `backend/`)
```bash
# IMPORTANT: RabbitMQ must be running BEFORE starting services.
# Without it, services show "online" in PM2 but fail on every request.
lsof -i :5672 || rabbitmq-server -detached  # ensure RabbitMQ is up first

# Start all services via PM2 (local dev)
npm run dev

# Stop / check status / tail logs
npm run dev:stop
npm run dev:status
npm run dev:logs

# MANDATORY: After starting services, health-check the actual endpoints.
# PM2 "online" does NOT mean the service is healthy. Always verify:
curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health  # api-gateway
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/health  # auth-service
curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/health  # user-service
# All must return 200. If any returns 000, check RabbitMQ and PM2 error logs.

# Build all services (run from backend/ root — npm run build:all is broken on this monorepo)
for svc in apps/*/src/main.ts; do npx nest build "$(echo $svc | cut -d'/' -f2)"; done
# On Windows PowerShell:
# Get-ChildItem apps -Directory | ForEach-Object { npx nest build $_.Name }

# Lint — NOTE: npm run lint is broken (no .eslintrc at backend root + Windows glob issue)
# Add a backend/.eslintrc.js before relying on this command

# Run a single service in watch mode (from backend/)
npx nest start <service-name> --watch
# e.g. npx nest start auth-service --watch

# Run tests for a single service (from backend/)
npx jest --testPathPattern=apps/<service-name>
# e.g. npx jest --testPathPattern=apps/auth-service
```

#### TypeORM migrations (per service)
Each service has its own `data-source.ts`. Run from `backend/`:
```bash
# Generate a new migration
npx typeorm migration:generate apps/<service>/src/migrations/<MigrationName> \
  -d apps/<service>/src/data-source.ts

# Run pending migrations
npx typeorm migration:run -d apps/<service>/src/data-source.ts

# Revert last migration
npx typeorm migration:revert -d apps/<service>/src/data-source.ts
```

### Frontend (run from `frontend/`)
```bash
npm run dev          # Next.js dev server with Turbopack (http://localhost:3000)
npm run build        # Production build (runs validate-env.js first)
npm run lint         # ESLint via next lint
npm run lint:fix     # ESLint auto-fix
npm run types:check  # TypeScript type check only
npm run tooling      # format:check + lint + types:check in parallel
npm run storybook    # Storybook dev server (http://localhost:6006)
```

### Environment setup
```bash
# Backend
cp backend/.env.local.example backend/.env
# then fill in DATABASE_URL, RABBITMQ_URL, etc.

# Frontend
cp frontend/.env.local.example frontend/.env.local
# then fill in any blank vars (OAuth keys, cloud picker keys)
```

## Memory System — Read This First
All shared agent memory lives at `.claude/memory/`. Always check it before starting work.

| File | Purpose |
|------|---------|
| `.claude/memory/MEMORY.md` | Index — start here |
| `.claude/memory/global.md` | Code conventions, env vars, standards |
| `.claude/memory/architecture.md` | Full stack and monorepo structure |
| `.claude/memory/progress.md` | What's built, what's in progress, dependencies (history up to 2026-10-26) |
| `.claude/memory/progress/` | One file per PR/ticket since 2026-10-26 — see its `README.md` |
| `.claude/memory/frontend.md` | Frontend status |
| `.claude/memory/agents/<role>.md` | Your agent role instructions |
| `.claude/memory/services/<service>.md` | Per-service implementation notes |

**Before starting any work:**
1. Read `.claude/memory/progress.md` to see what's done and what's next
2. Read the newest files in `.claude/memory/progress/`, and grep it for your service name
3. Read the relevant `.claude/memory/services/<service>.md`
4. Read `.claude/memory/agents/<your-role>.md` if you have a role

**After finishing work:**
- Add ONE new file for your PR: `.claude/memory/progress/YYYY-MM-DD-<ticket>-<slug>.md` (format in `.claude/memory/progress/README.md`). Put your ticket notes, findings and service gotchas there.
- **Do not append to the end of `progress.md` or to a service file's Gotchas / Agent Log.** Every PR appending at the same spot is what made every PR conflict with every other one.
- Edit `.claude/memory/services/<service>.md` only to correct a durable fact in place (an entity, endpoint, event or status line), not to add a ticket log.

## Architecture at a Glance

### Backend service ports (from `backend/ecosystem.config.js`)
| Service | Port |
|---------|------|
| api-gateway | 4000 |
| auth-service | 3001 |
| user-service | 3002 |
| listings-service | 3004 |
| messaging-service | 3005 |
| notification-service | 3006 |
| checkout-service | 3009 |
| contracts-service | 3010 |
| favorites-service | 3012 |
| invitations-service | 3013 |
| autocomplete-service | 3016 |
| time-tracking-service | 3017 |
| category-service | 3023 |
| scheduling-service | 3024 |

The `.env.local.example` files default the frontend to port 3002 (user-service). In a full local stack all services run behind api-gateway on port 4000.

### Microservice structure
```
apps/<service-name>/
├── src/
│   ├── main.ts                       # boots HTTP + RabbitMQ listeners
│   ├── <service>.module.ts
│   ├── <service>.controller.ts       # HTTP + @MessagePattern handlers
│   ├── <service>.service.ts
│   ├── migrations/                   # TypeORM migrations for this service's schema
│   └── data-source.ts                # DataSource used by TypeORM CLI
└── package.json
```

### API Gateway
`api-gateway` is the single HTTP entry point for external traffic:
- Routes HTTP requests to microservices via `proxy.controller.ts` / `proxy.service.ts`
- Also directly owns: homepage cache, blog sync, media upload, and user-avatar upload controllers
- Connects three RabbitMQ consumers on boot (`api-gateway.homepage`, `api-gateway.projects`, `api-gateway.blogs`) to sync CMS events
- CORS is driven entirely by `FRONTEND_URL` env var + Vercel preview pattern; hardcoding origins is an SOP violation

### Frontend API layer
```
frontend/
├── service/
│   ├── index.ts         # Axios instance — reads NEXT_PUBLIC_API_URL, attaches
│   │                    # Bearer token from access_token cookie, auto-refreshes on 401
│   └── http/            # One file per domain (auth, user, project, contracts, …)
├── lib/
│   └── runtime-urls.ts  # getPublicApiUrl/getPublicAuthUrl/getPublicBackendUrl — all
│                        # URL resolution goes through here, handles retired hostnames
├── contexts/
│   └── auth.tsx         # AuthProvider: calls UserAPI.me(), exposes user state + logout
└── src/
    └── api/             # Messaging-specific API helpers (apiFetch, public-key lookups)
```

- Path alias: `@/` maps to `frontend/` root (configured in `tsconfig.json`).
- All URL reads must go through `lib/runtime-urls.ts`, never from `process.env` directly.
- `service/index.ts` handles token refresh: 401 → POST `/auth/refresh` → retry once; on failure clears cookies.

### RabbitMQ event naming
Queue names and event patterns: `snake_case` (e.g., `user.created`, `listing.published`).
CMS events use a fan-out exchange (`cms.events`); each consumer binds its own durable queue with a DLX.

## Tech Stack
- **Database**: PostgreSQL via TypeORM (each service owns its own schema, `synchronize: false` everywhere — use migrations)
- **Messaging**: RabbitMQ (inter-service), Ably (real-time client)
- **Email**: SendGrid / Brevo
- **Payments**: Stripe
- **Search**: Algolia
- **Storage**: Cloudflare R2
- **Auth**: JWT + Passport (Google, LinkedIn OAuth); cookies `access_token` / `refresh_token` / `session_id`
- **Deployment**: Render (backend), Vercel (frontend)

## Frontend Design System (ABSOLUTE LAW — ZERO EXCEPTIONS)

**`frontend/COMPONENTS.md` is the ONLY source of allowed UI components. Every component in it comes from Storybook. Storybook is the single source of truth for all UI.**

### What you MUST do:
- **READ `frontend/COMPONENTS.md` before writing ANY frontend UI** — every time, no shortcuts
- **ONLY use components listed in `frontend/COMPONENTS.md`** — base UI, shared modules, and page layouts
- **Import components exactly as they are** — from `@/components/ui`, `@/components/*.tsx`, or `@/stories/*.stories.tsx`
- **Match Storybook page layouts exactly** when building pages — Storybook stories are the layout source of truth
- **Run `npm run storybook`** to see how components look and behave before using them

### What you MUST NEVER do:
- **NEVER create custom UI components** — no new component files, no inline UI component functions, no wrappers, no abstractions
- **NEVER modify Storybook components** — `frontend/components/ui/`, `frontend/components/*.tsx`, and `frontend/stories/` are READ-ONLY. You import as-is, never edit
- **NEVER touch the sidebar** — `frontend/components/account-sidebars.tsx` is FROZEN (locked 2026-09-18). Covers the collapse/expand toggle, the close animation (text fade, icon stability), the `useSidebarCollapsed` hook (localStorage persistence, SSR hydration guard, cross-tab sync), the CSS variable (`--sidebar-content-pl`) that drives content flex width, the `SidebarLink` component, section label behavior (Work label absolute-positioned, Account label height-animated), toggle positioning, all spacing and padding values, and the `CollapseToggle` with its tooltip. No refactors, no cleanup, no restyling, no spacing tweaks. Every value was set deliberately. The ONLY permitted change is adding/removing nav items in `buildTalentSections` or `buildClientSections`. Anything else requires explicit @CTorres9800 approval.
- **NEVER touch the view applicants screen** — `frontend/app/(group)/job-screening/page.tsx` is FROZEN (locked 2026-08-26). Covers the applicant list and cards, filters and sorting, status handling, empty states, and every string. No refactors, no cleanup, no restyling. The ONLY permitted change is backend wiring that alters no class name, element, timing, or string. Anything else requires explicit @CTorres9800 approval.
- **NEVER touch billing** — the entire `frontend/app/(group)/billing/` tree is FROZEN (locked 2026-08-26). This covers `page.tsx`, `transactions/`, `invoices/`, `my-plans/`, and `payment-methods/`. Money-facing screens: layout, table columns and ordering, status badges, currency and date formatting, empty states, filters, pagination, and every string. No refactors, no cleanup, no restyling, no "improving" the copy. The ONLY permitted change is backend wiring that alters no class name, element, timing, or string. Anything else requires explicit @CTorres9800 approval.
- **NEVER touch the onboarding flow** — the entire `frontend/app/(group)/onboarding/` tree is FROZEN (locked 2026-08-26), enforced directory-wide: new files added under that path are frozen too, so a new file is not a way around it. This covers `page.tsx` (role picker), `talent/page.tsx`, and `client/page.tsx`, and everything in them: the five talent steps and their order, the step registry and numbering, the resume upload step and its reading modal (skeletons, shimmer, extraction feed, summary rows, Done button, error states and their copy), the autofill mapping from parse result into `stepData`, the avatar empty state (initials for a known name, icon otherwise), and every validation guard and error message. No refactors, no cleanup, no restyling, no re-timing of animations, no "improving" the copy. Every value was set deliberately. The ONLY permitted change is backend wiring that alters no class name, element, timing, or string. Anything else requires explicit @CTorres9800 approval.
- **NEVER touch the active project task screen** — `frontend/app/(group)/active-project/[id]/page.tsx` is FROZEN (locked 2026-08-22). This covers the task tables, pinned section bars and column headers, the bulk-select bar, the create/edit task dialog, the checklist, the attachments views, and the components defined in that file (`AssigneePicker`, `TaskStatusMenu`, `TaskDueDatePicker`, `SortableTaskRow`, `StickySectionBar`). No refactors, no cleanup, no restyling, no spacing tweaks. Every value in it was set deliberately, **including every transition and animation** (section collapse, folder row slide, row reveal, drag states, toast/tooltip timing) — do not retime or remove them. The ONLY permitted change is backend wiring: replacing seeded data with API calls and hooking up no-op handlers, without altering any class name, element, or transition. Anything else requires explicit @CTorres9800 approval
- **ScopeBuilder is co-owned, not locked** — `frontend/components/scope-builder/index.tsx` is shared by the active-project task screen, project-details, job-details, my-listings and edit-listing, so changing it changes all of them. Two engineers own it and may change its markup, behaviour and styling freely without approval: **@shreyanshsahu1008** (checkout engineer) and **@VAndrejeus** (Vitaly). Every other engineer treats it as FROZEN and needs explicit @CTorres9800 approval before editing it (locked 2026-11-05). Enforced by `sop-check` §3c.
- **NEVER touch the Taxes screens** — `frontend/components/settings-tax-info.tsx` and `backend/apps/user-service/src/tax-info/` are FROZEN (locked 2026-08-29), the backend enforced directory-wide. These produce real IRS documents from real taxpayer data. Covers the W-9/W-8BEN certification text and its US/non-US switching, every validation rule and message, the read-only today-only signing date, the completeness rules gating submission, TIN encryption and last-4 masking, the verified IRS PDF field maps, and the guards that refuse to emit an incomplete form or a Copy A. The field maps were derived by rendering the official forms; a plausible-looking edit writes a value into the wrong box on a government form and nothing fails. The ONLY permitted change is backend wiring that alters no class name, element, timing, string, or PDF field mapping. Anything else requires explicit @CTorres9800 approval.
- **NEVER modify the page or component you were sent to look at** — when you are told to check another page, screen, or component (to copy it, to match a width, spacing, colour, animation, or behaviour, or just to see how it works), that source is READ-ONLY for that task. Read it, take what you need, apply it where the work belongs, and leave the source byte-for-byte unchanged. This holds whether you were told to "copy", "check", "look at", "match", or "see how X does it", and it holds even when the source looks wrong, inconsistent, or improvable — a drive-by "fix" there is an unrequested change to a working screen. If the source genuinely needs a change, say so and let @CTorres9800 decide; do not make it. Applies to every engineer and every agent working in this repo.
- **NEVER fork or hand-roll a master listing card** — the master cards are
  `frontend/components/listing-card.tsx` (`ListingCard`, covering project,
  service, team and talent in grid view) and
  `frontend/components/team-card-landscape.tsx` (`TeamCardLandscape`, the team
  row in list view). They are locked. Do not copy one into a page, do not build
  a page-local variant, and do not restyle them to suit one screen. Both are
  drawn from Figma Dev Mode and carry exact values that look arbitrary but are
  not (15.24px, 23.714px, 3.032px, the 0.571px/1.142px shadow, the avatar seat
  coordinates) — do not round them to the nearest Tailwind step. If a screen
  needs a variant that does not exist, stop and ask; adding one is a design
  system decision. Data changes go through props, never by editing the card.
- **NEVER use raw HTML elements** (`<input>`, `<textarea>`, `<select>`, `<button>`, `<label>`, `<dialog>`) when a design system component exists
- **NEVER use arbitrary Tailwind values** (e.g., `text-[13.5px]`) when a standard Tailwind class exists
- **NEVER build UI that is not composed from components in `frontend/COMPONENTS.md`**

### If a component you need does not exist in COMPONENTS.md:
1. Stop. Do not build it.
2. Ask the user what component to use.
3. The user will either point you to an existing component you missed, or approve a new addition to Storybook (which is their decision, not yours).

### Violation = Automatic Rejection
Any code that creates custom UI components, modifies Storybook source, or uses elements not in COMPONENTS.md is automatically rejected.

## Code Standards (non-negotiable)
- TypeScript strict mode everywhere
- All DTOs must use `class-validator` decorators
- All controllers must use proper NestJS guards for auth
- No empty method bodies, no TODOs, no stubs
- Each service owns its own DB schema — never query another service's tables
- Inter-service communication via RabbitMQ only (no direct HTTP between services)
- Error handling: always throw NestJS exceptions (`NotFoundException`, `BadRequestException`, etc.)
- Every new TypeORM entity requires a migration — `synchronize: true` is never acceptable

## Docs Location
All technical documentation (converted to markdown for readability):
- `/docs/md/<Service Name>/` — one folder per service
- Read ALL files in the service's docs folder before implementing

## Agent Scripts
```bash
scripts/spawn-agents-tmux.sh [service...]  # spawn agents in tmux
scripts/merge-agents.sh [service...]       # merge worktrees into main
scripts/cleanup-agents.sh [service...]     # remove worktrees after merge
scripts/convert-docs.sh                    # convert .docx → .md
```

## Git Workflow

### 🛑 NEVER push without updating the branch first

**This is absolute. It applies to every push, every time — including doc-only
changes, one-line fixes, and the second and third push within a single session.**

**A branch that is even one commit behind is stale. There is no acceptable
number of commits to be behind other than zero.**

Before every `git push`:

```bash
git fetch origin <branch>
git rev-list --left-right --count origin/<branch>...HEAD   # left number MUST be 0
```

If the left number is not `0`, the branch is behind. Merge `origin/<branch>` in
and resolve the conflicts **before** pushing. Never force-push past it.

Why it matters: a push from a stale branch is how merged work silently
disappears. "I fetched at the start of the session" is not updating — the branch
can move between your first push and your next one, and a push that succeeds
only because nobody else happened to push in that window is luck, not process.

When resolving the resulting conflicts, follow the rule in `docs/CODE_REVIEW_SOP.md`:
take the authoritative side wholesale rather than hand-blending two versions,
then verify with `git diff <pre-merge-sha> -- <file>`.

### Agent worktrees
- Each agent works in its own worktree + branch: `agent/<service-name>`
- After finishing: commit in worktree, then run `merge-agents.sh`
- Branch naming: `agent/<service-name>`
- Commit format: `feat(<service>): implement full service from docs`

## Repo
https://github.com/Marketeq/marketeq-projects-vibe.git
