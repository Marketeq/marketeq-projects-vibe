# Marketeq Projects — Claude Project Instructions

This file is automatically loaded by every Claude Code session and agent working in this repo.
Read this before doing anything else.

## What This Project Is
Marketeq is a freelance marketplace platform (similar to Upwork/Fiverr) built with:
- **Backend**: NestJS monorepo with microservices at `/backend/apps/`
- **Frontend**: Next.js App Router at `/frontend/`
- **Docs**: All technical specs at `/docs/md/` (markdown) and `/docs/Technical Documentation/` (original .docx)

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
```
backend/apps/
├── auth-service/         ✅ Implemented
├── user-service/         ✅ Implemented
├── listings-service/     ✅ Implemented
├── checkout-service/     ✅ Implemented
├── messaging-service/    ✅ Implemented
├── notification-service/ ✅ Implemented
├── api-gateway/          🔨 In progress
├── autocomplete-service/ 🔨 In progress
├── suggestions-service/  🔨 In progress
├── favorites-service/    🔨 In progress
├── portfolio-service/    🔨 In progress
├── invitations-service/  🔨 In progress
├── content-moderation-service/ 🔨 In progress
├── search-service/       🔨 In progress
├── algolia-service/      🔨 In progress
├── transaction-service/  🔨 In progress
├── billing-service/      📋 Not started
├── contracts-service/    ✅ Implemented
├── earnings-service/     📋 Not started
├── payout-service/       📋 Not started
├── time-tracking-service/ 📋 Not started
├── admin-service/        📋 Not started
└── affiliate-referral-service/ 📋 Not started
```

## Tech Stack
- **Database**: PostgreSQL via TypeORM (each service owns its own schema)
- **Messaging**: RabbitMQ (inter-service), Ably (real-time client)
- **Email**: SendGrid
- **Payments**: Stripe
- **Search**: Algolia
- **Auth**: JWT + Passport (Google, LinkedIn OAuth)
- **Deployment**: Render (backend), Vercel (frontend)

## Code Standards (non-negotiable)
- TypeScript strict mode everywhere
- All DTOs must use `class-validator` decorators
- All controllers must use proper NestJS guards for auth
- No empty method bodies, no TODOs, no stubs
- Each service owns its own DB schema — never query another service's tables
- Inter-service communication via RabbitMQ only (no direct HTTP between services)
- Error handling: always throw NestJS exceptions (`NotFoundException`, `BadRequestException`, etc.)
- Never commit `.env` files

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
- Worktrees live at: `/Users/christorres/vibecoding/agents/<service-name>`
- After finishing: commit in worktree, then run `merge-agents.sh`
- Branch naming: `agent/<service-name>`
- Commit format: `feat(<service>): implement full service from docs`

## Repo
https://github.com/Marketeq/marketeq-projects-vibe.git
