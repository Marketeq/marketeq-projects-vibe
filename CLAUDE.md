> STOP. Read [CONFIDENTIALITY.md](CONFIDENTIALITY.md) before doing any work in this repo.

# CLAUDE.md

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
7. `post-merge-audit` — auto-reverts merges that bypassed SOP checks.
8. `login-violation-alert` — opens issues when login files are merged without owner approval.

**Post-deploy automation:**
- Deployment orchestration (Render, Vercel, n8n)
- Post-deploy smoke tests
- Staging sync (`sync-dev-main-to-staging`)
- Stale branch cleanup (weekly)

If you are reviewing a PR via Claude CLI, use the prompt in §10 of the SOP verbatim.

## What This Project Is
Marketeq is a freelance marketplace platform (similar to Upwork/Fiverr) built with:
- **Backend**: NestJS monorepo with microservices at `/backend/apps/`
- **Frontend**: Next.js App Router at `/frontend/`
- **Docs**: All technical specs at `/docs/md/` (markdown) and `/docs/Technical Documentation/` (original .docx)

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
| `.claude/memory/progress.md` | What's built, what's in progress, dependencies |
| `.claude/memory/frontend.md` | Frontend status |
| `.claude/memory/agents/<role>.md` | Your agent role instructions |
| `.claude/memory/services/<service>.md` | Per-service implementation notes |

**Before starting any work:**
1. Read `.claude/memory/progress.md` to see what's done and what's next
2. Read the relevant `.claude/memory/services/<service>.md`
3. Read `.claude/memory/agents/<your-role>.md` if you have a role

**After finishing work:**
- Update `.claude/memory/services/<service>.md` with what you built
- Update `.claude/memory/progress.md` to reflect new status

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
- Each agent works in its own worktree + branch: `agent/<service-name>`
- After finishing: commit in worktree, then run `merge-agents.sh`
- Branch naming: `agent/<service-name>`
- Commit format: `feat(<service>): implement full service from docs`

## Repo
https://github.com/Marketeq/marketeq-projects-vibe.git
