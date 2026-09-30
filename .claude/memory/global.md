# Global Memory — Project-Wide

## Purpose
Anything that doesn't belong to a specific service or agent role goes here.
This is the catch-all for project conventions, environment setup, shared decisions, and lessons learned.

## Code Conventions
- Language: TypeScript (strict mode)
- Framework: NestJS for backend, Next.js App Router for frontend
- Linting: ESLint (configs in root)
- Formatting: Prettier
- Imports: always use path aliases, not relative ../../
- DTOs: always validate with class-validator decorators
- Never commit .env files

## Naming Conventions
- Backend files: kebab-case (auth-service.module.ts)
- Frontend components: PascalCase (UserCard.tsx)
- Database tables: snake_case
- RabbitMQ queue names: snake_case (user.created, listing.published)
- API routes: kebab-case (/api/talent-profiles)

## Environment Variables (keys only, not values)
- DATABASE_URL
- RABBITMQ_URL
- JWT_SECRET
- ABLY_API_KEY
- SENDGRID_API_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- ALGOLIA_APP_ID
- ALGOLIA_API_KEY
- GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
- LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET
- REDIS_URL (api-gateway rate-limit counters, caches, BullMQ)
- RATE_LIMIT_MODE / RATE_LIMIT_TRUSTED_PROXY_HOPS / RATE_LIMIT_IP_ALLOWLIST / RATE_LIMIT_<RULE>_LIMIT / RATE_LIMIT_<RULE>_WINDOW_SEC (api-gateway only; see docs/md/API Gateway/API Gateway — Rate Limiting (Implementation Notes).md)

## Shared Module Location
/backend/shared/ — guards, decorators, DTOs, utilities reused across services

## Database
- PostgreSQL via TypeORM
- Each microservice owns its own tables (no cross-service DB queries)
- Migrations live inside each service's src/ folder

## API Gateway
- All external HTTP traffic goes through api-gateway
- Internal service-to-service: RabbitMQ only

## Testing Standards
- Unit tests: Jest (co-located with source files)
- E2E tests: Playwright + Cucumber (in /frontend/e2e-cucumber/)
- Always test happy path + at least one error path per endpoint

## Deployment
- Backend: Render (multi-container Docker)
- Frontend: Vercel (auto-deploy from GitHub)
- CI/CD: GitHub Actions
- Branches: main (production), staging (pre-prod)

## Lessons Learned
(agents append here when something non-obvious is discovered)

- Local working checkout is the source of truth during active work. Do not switch the user's active local branch, reset it, replace it with another branch, or pull another branch over it unless the user explicitly asks first.
- Never treat "pushed to GitHub" as permission to move, rewrite, or replace the current local working checkout.
- If work is in progress on local, save it in the current local branch first. Do not leave important edits only in temp state, build artifacts, detached recovery paths, or unidentified stashes.
- Before any branch switch, branch restore, reset-like action, or recovery action, verify that the exact visible local work is safely preserved on the current local branch and that the user explicitly wants the branch change.
- If recovery is ever needed, restore the exact local source files first. Do not substitute a different branch snapshot and present it as equivalent local state.
- During active editing sessions, keep local branch continuity stable: same branch, same working context, explicit saves, and no silent checkout changes.
- Never key security decisions (rate limits, IP allow-lists, lockouts) on the leftmost `x-forwarded-for` entry: the client controls it. Use the entry written by the outermost trusted proxy (see api-gateway `src/rate-limit/client-ip.ts`).
