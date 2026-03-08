# Marketeq Projects Vibe – Shared Agent Memory Index

## Memory System — Three Tiers
1. **Global** — project-wide conventions, env vars, standards (not service/agent specific)
2. **Per-agent** — each role's active task, context, handoff notes
3. **Per-service** — implementation details, entities, endpoints, decisions per service

Keep THIS file as an index only (under 150 lines). Write details to the topic files.

## What to Read When Starting a Session
- Your agent role file: agents/<your-role>.md
- Relevant service file: services/<service-name>.md
- progress.md — to understand dependencies and what's done
- global.md — project conventions (read once, reference as needed)

## File Map
### Global / Cross-Cutting
- [global.md](.claude/memory/global.md) — conventions, env vars, standards, lessons learned
- [architecture.md](.claude/memory/architecture.md) — full stack and monorepo details
- [progress.md](.claude/memory/progress.md) — implementation status and dependencies

### Agent Roles
- [agents/backend-builder.md](.claude/memory/agents/backend-builder.md)
- [agents/frontend-builder.md](.claude/memory/agents/frontend-builder.md)
- [agents/tester.md](.claude/memory/agents/tester.md)
- [agents/devops.md](.claude/memory/agents/devops.md)
- [agents/_TEMPLATE.md](.claude/memory/agents/_TEMPLATE.md) — copy this for new roles

### Services
- [services/auth-service.md](.claude/memory/services/auth-service.md)
- [services/user-service.md](.claude/memory/services/user-service.md)
- [services/listings-service.md](.claude/memory/services/listings-service.md)
- [services/checkout-service.md](.claude/memory/services/checkout-service.md)
- [services/messaging-service.md](.claude/memory/services/messaging-service.md)
- [services/notification-service.md](.claude/memory/services/notification-service.md)
- [services/autocomplete-service.md](.claude/memory/services/autocomplete-service.md)
- [services/content-moderation-service.md](.claude/memory/services/content-moderation-service.md)
- [services/_TEMPLATE.md](.claude/memory/services/_TEMPLATE.md) — copy this for new services

### Frontend
- [frontend.md](.claude/memory/frontend.md)

## Quick Reference
- Repo: https://github.com/Marketeq/marketeq-projects-vibe.git
- Working dir: /Users/christorres/vibecoding/marketeq-projects-vibe
- Backend: /backend/apps/ | Frontend: /frontend/ | Docs: /docs/Technical Documentation/
- Local Claude memory: /Users/christorres/.claude/projects/-Users-christorres-vibecoding/memory/

## Service Status Summary (see progress.md for full detail)
**Implemented:** auth, user, listings, checkout, messaging, notification
**Scaffolded (needs implementation):** api-gateway, admin, affiliate-referral, algolia,
autocomplete, billing, content-moderation, contracts, earnings, favorites, invitations,
payout, portfolio, search, suggestions, time-tracking, transaction
