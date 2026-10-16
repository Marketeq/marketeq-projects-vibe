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

## Platform role model (2026-10-05)
- Roles are DATA, not code: `backend/apps/*/src/guards/platform-roles.catalog.ts` (duplicated verbatim in auth, user, payout, checkout, time-tracking, content-moderation — change one, change all). Adding/renaming a role or changing its powers is an edit to that one table; no guard or controller changes.
- Two layers: a **capability** (`domain:action`, e.g. `finance:approve`) is a thing you can do; a **role** is a bundle of capabilities. Guards ask for capabilities, roles hold them.
- Roles: `admin` (CONFIRMED, wildcard `*` = everything, this is the owner), `developer`, `qa`, `product-manager`, `finance`, `support` — **all except admin are PROVISIONAL**; specs are loose and expected to change.
- Design rules, do not quietly undo: rank does NOT imply inheritance (explicit `capabilities` / `inherits` only); provisional roles start UNDER-powered; money is split `finance:read`/`finance:approve`/`finance:move` so approving ≠ originating; no technical role holds `users:write`, `finance:move` or `platform:role:grant`.
- `RolesGuard('admin')` (role name) and `RolesGuard('finance:approve')` (capability) BOTH work — the colon distinguishes them. Existing call sites were left unchanged; prefer capabilities for anything new.
- Fails closed three ways: no role, unknown role, unknown capability (the last logs an error naming the typo).
- `qa:fixture:write` is NOT environment-scoped by the catalogue — whichever route honours it must refuse production itself.
- Still inert: `PLATFORM_ROLE_ASSIGNMENTS` empty, nobody holds a role. See `docs/md/CyberSecurity/Infrastructure Roles — Catalogue and Extension Guide.md`.

## SCA in CI (2026-10-05, phase 1 only)
- `.github/workflows/sca.yml` — Trivy, **report-only, cannot fail a build** (every step `continue-on-error`, final job always exits 0). Not committed; has never run, so there is NO baseline yet.
- Scans the THREE real install roots only — `backend/`, `frontend/`, `backend/apps/cms-service/`. The 30 other `package.json` files under `backend/apps/` have no lockfiles and are never separately installed; pointing a scanner at the repo root walks all 33 and buries the output. Each manifest pair is copied into an empty dir before scanning (version-proof, and avoids `apps/`).
- Also scans `node:20-alpine` by name rather than building `Dockerfile.all` (~13 min).
- TWO passes per lockfile: default (runtime) and `--include-dev-deps`. ~40% backend / ~58% frontend of resolved packages are dev-only, so one combined number would be misleading. Runtime is the row that can ever gate.
- Triggers: PR, push to dev-main/staging/live/live-mvp, **weekly Mon 06:17 UTC**, manual. The schedule is the important one — a PR scan can never catch a CVE published against unchanged code.
- Both `live` and `live-mvp` are listed because the repo's workflows disagree about the production branch name.
- Phase 3 (the gate) must fail on **NEW** findings vs the base branch, runtime deps only — never on the pre-existing backlog, or it goes red on every PR and gets disabled.
- Both package.json files already carry `overrides` pinning 9 transitive packages (multer, tar, glob, handlebars, lodash, …) — undocumented manual remediation; documenting them is phase 2.
- Dependabot PRs deliberately NOT enabled: the repo's branch-freshness gate (cannot merge if 1 commit behind) would make bot PRs perpetually stale.
- Could not produce a baseline from this environment — the network allowlist blocks registry.npmjs.org, GitHub release downloads and api.osv.dev.
- SCA phase 2 (2026-10-06): `.trivyignore.yaml` (empty — nothing triaged yet) + `.github/scripts/check-sca-ignores.py`, wired as the `ignore-hygiene` job. **That job IS allowed to fail a build** — unlike the scan — because it validates our own record of accepted risk, not third-party code. Rules: reason ≥30 chars, rejects empty verdicts ("not exploitable", "false positive", …), mandatory `expired_at`, max 90-day window, expired entry fails. Cannot fail today (file empty). Tested against 5 inputs.
- **The nine existing `overrides` analysed from the lockfiles.** THREE force major-version jumps on dependents that declared incompatible ranges, and nothing catches it (`npm ci` succeeds, types see nothing, it breaks at runtime): `glob ^10.5.0` (5 of 7 dependents asked `^7.1.x`; glob@9 removed the callback API), `minimatch ^9.0.7` (5 of 7 asked `^3.x`), `picomatch ^4.0.4` (4 of 5 asked `^2.x`). `tar ^7.5.13` is a single one-major jump. `handlebars ^4.7.9` looks like a NO-OP — its only dependent already wanted `^4.7.9`. `flatted`/`handlebars` are dev-only. Which CVE each answers is unknown until the first scan; a pin answering nothing should be deleted.
- **SCA baseline captured 2026-10-06** (local `npm audit --package-lock-only`, not the CI workflow — that still has never run). backend 109 all / **54 runtime** (3 crit); frontend 54 all / **19 runtime** (1 crit). Total 163, **73 runtime**, 90 dev-only (55%). `backend/apps/cms-service` NOT audited.
- Critical runtime: `next` (26 advisories inc. 3 unauthenticated RCEs + middleware/proxy bypasses — the bypasses undercut auth done in middleware), `protobufjs` (12), `tar` (6), `proxy-addr` (1 — note: the rate limiter built this sprint parses X-Forwarded-For through it). Biggest single win: `axios`, **34 advisories**, both roots, non-breaking.
- **THREE of the nine overrides pin to versions that are THEMSELVES vulnerable**: `tar ^7.5.13` vs advisory `<=7.5.20` (CRITICAL), `multer ^2.1.1` vs `<=2.2.0`, `fast-xml-parser ^5.5.7` vs `<5.7.0`. The other six are clean. The carets already allow the fixed versions — the lockfile is just stale, so `npm update tar multer fast-xml-parser` fixes all three with no package.json edit.
- **npm misreports multer's fix** as needing `--force` + a breaking `@nestjs/platform-express@12`. It does not — multer's version is controlled by the override, so raising the pin fixes it without touching the framework.
- **NEVER run `npm audit fix --force` here**: it would install @nestjs/core@12, @nestjs/platform-express@12, @nestjs/swagger@12, pm2@7 across 35 services, in a repo that already needs `--legacy-peer-deps`. Plain `npm audit fix` is safe.
- Only **1 of 163** findings has no published fix (`uuid <11.1.1`, moderate) — the sole legitimate ignore-file candidate. Not added; accepting a risk needs a named owner.

## Repo / git state (checked 2026-10-06)
- Branch `security/gateway-rate-limiting`; default branch is `dev-main`.
- **ONE commit exists:** `1b132e47 "wip: gateway rate limiting and CSRF hardening"` — rate limiting, CSRF middleware, Helmet, env examples, some memory/docs. Earlier notes saying "nothing is committed" were WRONG for those two workstreams.
- **The branch has NO upstream — nothing has ever been pushed.** Everything lives on one laptop.
- Uncommitted since that commit: 34 new source files + 18 genuinely-modified ones (RBAC/role catalogue, audit logging, 2FA gate, wallet/wire/users ownership guards, 2 migrations, admin-service reduction, SCA workflow + ignore file + script, 9 CyberSecurity docs).
- **CRLF trap:** no `.gitattributes`, tracked files are CRLF on disk, index holds LF, and the Linux VM's git has `core.autocrlf` unset — so git reports HUNDREDS of files as modified when nothing changed. `git diff --ignore-all-space --stat` shows the real ones; `--name-only` does NOT filter them. **Never `git add -A` / `git add <dir>` from the VM** — it would commit a repo-wide line-ending rewrite and destroy blame. Commit by explicit path only.
- `backend/apps/api-gateway/body.json` (curl test payload from rate-limit testing) was committed in `1b132e47` and probably should not be in the repo.
- No workflow fires on a push to an arbitrary branch; Vercel deploys only from dev-main/staging/live-mvp. So pushing this branch is inert — it only backs the work up.
- **SCA phase 3 (2026-10-07): the gate.** `.github/workflows/sca.yml` job `gate` + `.github/scripts/sca-gate.py`. Fails a PR on NEW high/critical findings in RUNTIME deps, **compared against `github.event.pull_request.base.sha`, never against zero** — so the 73-finding backlog cannot fail anyone. A PR touching no lockfile cannot fail it (byte-compare short-circuits both scans); catching new CVEs on unchanged code is the weekly scan's job.
- Escape hatch: the **`sca-override` PR label** skips the gate (visible + recorded). Rollback: `SCA_GATE_MODE=monitor`. Defaults to `enforce` — deliberately NOT monitor-first, because the base-branch comparison means there is no existing traffic it could break, so there is nothing to observe.
- A lockfile with no version at base (new install root) is reported but NOT gated.
- **TODO for the user: create the `sca-override` label** — the gate's `if:` references it; absent label just means the escape hatch doesn't exist.
- Gate logic tested against 6 fixtures (unchanged-with-backlog → pass; new critical → fail; new moderate → pass; removed critical → pass; no base scan → pass+warn; monitor mode → pass+warn).
- **SCA phase 4 (2026-10-07): sustain.** `weekly-report` job (schedule/manual only, `needs: dependencies`) + `.github/scripts/sca-weekly-report.py`. Maintains ONE tracking issue titled "Dependency vulnerabilities — weekly report" (label `security:dependencies`), rewrites its body each run, and **comments ONLY when the finding set changes** — a weekly notification saying the same thing gets muted, and then so does the week it matters. Needs `issues: write` (added to the workflow permissions).
- Previous state is stored in the issue body as `<!-- sca-state {...} -->`; the issue is the state store so there is one place to look and no cross-run artifact archaeology. Marker deleted by hand → next run treats everything as new (one noisy comment, then fine).
- Also warns 14 days before a `.trivyignore.yaml` acceptance expires — otherwise the hygiene check ambushes whichever unrelated PR is open when the date passes.
- Tested offline: rendering, state round-trip, no-change→silent, new-finding→comment, resolved→comment, expiry thresholds (expired/8d flagged, 74d excluded), missing scan file survivable. **GitHub API calls NOT exercised.**
- SCA series complete (1 baseline, 2 triage, 3 gate, 4 sustain). Remaining is not tooling: commit+push so any of it runs; apply the phase 2 fixes (3 stale pins, then axios); create the `sca-override` label; name who reads the weekly report.
