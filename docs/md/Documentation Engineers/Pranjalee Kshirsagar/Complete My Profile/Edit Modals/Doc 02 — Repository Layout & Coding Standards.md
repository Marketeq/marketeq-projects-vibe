# **Repository Layout & Coding Standards**

**Project:** Complete My Profile --- **Edit Modals** (Backend)\
**Service:** apps/user-service/src\
**Audience:** Backend engineers, QA reviewers, tech leads\
**Status:** Ready for implementation

## **1) Purpose**

Define **where code lives**, how it's **organized**, and the
**standards** (naming, DTO validation, error shapes, logging, tests) to
keep the user-service consistent as we add **About**, **Skills**,
**Experience**, **Education**, **Rates**, **Portfolio**, and the
**Progress** engine.

## **2) Repository Layout**

  -----------------------------------------------------------------------
  apps/user-service/src\
  ├─ app.module.ts\
  ├─ main.ts\
  ├─ config/ \# env schema, config factories\
  │ ├─ config.module.ts\
  │ └─ env.schema.ts\
  ├─ common/ \# cross-cutting infra\
  │ ├─ guards/ \# authz guards (owner, admin)\
  │ ├─ interceptors/ \# logging, timeout, metrics\
  │ ├─ filters/ \# HttpExceptionFilter\
  │ ├─ pipes/ \# validation pipe, parse pipes\
  │ ├─ decorators/ \# \@CurrentUser(), \@Idempotency()\
  │ └─ utils/ \# normalization, sanitizer wrapper\
  ├─ database/\
  │ ├─ entities/ \# TypeORM/Prisma models\
  │ ├─ migrations/ \# SQL migrations\
  │ └─ datasource.ts \# ORM bootstrap (if TypeORM)\
  ├─ modules/\
  │ ├─ about/\
  │ │ ├─ dto/\
  │ │ ├─ about.controller.ts\
  │ │ ├─ about.service.ts\
  │ │ └─ about.module.ts\
  │ ├─ skills/\
  │ ├─ experience/\
  │ ├─ education/\
  │ ├─ rates/\
  │ ├─ portfolio/\
  │ └─ progress/\
  ├─ audit/ \# write-audit service + repo\
  ├─ health/ \# /health, /ready\
  └─ index.ts \# (optional) re-exports for tests
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Rules**

- One **module per profile section**; each module owns its **DTOs**,
  **controller**, **service**, and **repository** (or uses the shared
  ORM repo).

- Shared logic (sanitization, normalization, error codes) lives in
  **common/**.

- Only **progress/** reads other modules' state (via services/repos) to
  compute the profile completion.

## **3) Naming Conventions**

- **Files:** kebab-case → about.controller.ts, user-skill.entity.ts.

- **Classes:** PascalCase → AboutController, CreateSkillDto.

- **Providers/Tokens:** SNAKE_CASE or class refs.

- **Routes:** kebab-case → /v1/users/:userId/profile/job-titles.

- **DB tables:** snake_case → user_skill, rate_title.

- **Columns:** snake_case → start_date, url_normalized.

## **4) DTO & Validation Standards**

- Use **class-validator** + **class-transformer**; fail fast with a
  **global ValidationPipe**.

- HTML inputs (About/Experience/Education) must be **sanitized HTML**
  server-side.

- Normalize user-entered text (trim, collapse spaces, lowercase for
  uniqueness) **before** validation where appropriate.

  -----------------------------------------------------------------------
  // modules/skills/dto/create-skill.dto.ts\
  import { IsString, MaxLength } from \'class-validator\';\
  \
  export class CreateSkillDto {\
  \@IsString()\
  \@MaxLength(80)\
  value!: string; // normalization to lowercase/trim occurs in service\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Limits (enforced in DTO + DB)**

- Skills: **≤ 100** per user (case-insensitive unique).

- Job titles: **≤ 3** per user (case-insensitive unique).

- Rates: NUMERIC(12,2) with min/max from Doc 10.

## **5) Controllers, Services, Repos (Pattern)**

  -----------------------------------------------------------------------
  // modules/about/about.controller.ts\
  \@Post()\
  \@UseGuards(OwnerGuard)\
  \@UseInterceptors(IdempotencyInterceptor)\
  async upsert(\
  \@Param(\'userId\') userId: string,\
  \@Body() dto: UpsertAboutDto,\
  \@CurrentUser() actor: UserCtx,\
  ) {\
  const data = await this.aboutService.upsert(userId, dto, actor);\
  const progress = await this.progressService.compute(userId);\
  return { data, progress };\
  }\
  \
  // modules/about/about.service.ts\
  async upsert(userId: string, dto: UpsertAboutDto, actor: UserCtx) {\
  const contentHtml = this.htmlSanitizer.sanitize(dto.contentHtml);\
  this.audit.log(actor, \'about.upsert\', { userId }, { contentHtml });\
  \
  return this.aboutRepo.upsert(userId, { contentHtml });\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **6) Error Envelope & Codes**

**Shape (always):**

  -----------------------------------------------------------------------
  {\
  \"code\": \"VALIDATION_ERROR\",\
  \"message\": \"One or more fields are invalid.\",\
  \"details\": { \"field\": \"skills\", \"reason\": \"MAX_REACHED\" }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Common Codes**

- VALIDATION_ERROR

- NOT_FOUND

- CONFLICT_DUPLICATE (e.g., duplicate skill/title)

- FORBIDDEN_NOT_OWNER

- IDEMPOTENCY_REPLAY

- UNKNOWN

Document module-specific details in Doc 05 and reference them from each
04x doc.

## **7) Pagination, Sorting, Searching**

- **Lists** must accept: page, pageSize, sort, order, q (optional).

- Defaults: page=1, pageSize=20, order=desc. Max pageSize=100.

- Response wrapper:

  -----------------------------------------------------------------------
  {\
  \"data\": \[ /\* items \*/ \],\
  \"meta\": { \"page\": 1, \"pageSize\": 20, \"total\": 73 }\
  }
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **8) Idempotency & Concurrency**

- Mutations accept **Idempotency-Key** (UUID).

- Server stores first successful result for TTL (e.g., 24h) and
  **replays** on repeat keys.

- Interceptor should short-circuit duplicates **before** calling the
  service.

- Repositories must be safe under concurrent requests (unique
  constraints for de-dupe, transactional updates where necessary).

## **9) Logging, Metrics, Tracing**

- **Structured logs** (JSON): service, route, status, durationMs,
  userId, traceId.

- **PII redaction** for logs; do not log raw HTML bodies.

- **Metrics** (Prometheus): request counts, latency histograms,
  validation errors, **progress_recompute_duration_seconds**.

- **Tracing** (OTLP optional): wrap controller → service → repo with
  spans; propagate X-Request-Id.

## **10) HTML Sanitization & Normalization**

- Centralize sanitizer in common/utils/html-sanitizer.ts.

- Allowed tags/attributes minimal; strip scripts, event handlers, unsafe
  URLs.

- All **rich text fields** (About, Experience/Education descriptions)
  must pass through sanitizer **before persist**.

- Add unit tests with known XSS payloads.

## **11) Uniqueness & Normalization Helpers**

- Provide helpers in common/utils/normalize.ts to:

  - normalizeTextForUnique(value: string): string (trim, collapse
    spaces, lowercase)

  - normalizeUrl(value: string): string (ensure scheme, strip tracking
    params, lowercase host)

- Use **functional indexes** in DB to enforce (user_id,
  normalized_value) uniqueness.

## **12) Security & Guards**

- **OwnerGuard**: only the profile owner can mutate; **AdminGuard**
  optional override.

- **AuthN** via JWT (issuer/audience checked); extract sub as userId.

- Reject writes if userId in path ≠ token subject (unless admin).

## **13) Testing Standards**

- **Unit tests**: DTO validation, sanitizer behavior, service logic.

- **Integration tests**: controller + DB (with migrations).

- **Contract/E2E**: happy paths + negative cases per endpoint; ensure
  **writes return {progress}**; verify idempotency.

- **Test data**: factories in test/factories/ (avoid fixtures that rot).

- Aim for **80%+** coverage on changed lines; critical flows (progress)
  higher.

## **14) Linting, Formatting, Commits, PRs**

- **ESLint + Prettier**; no any without justification.

- **Commit style**: Conventional Commits (e.g., feat(profile): add
  skills de-dupe index).

- **PR checklist**:

  - DTO validation + limits implemented

  - Error codes documented

  - { data, progress } on all writes

  - Tests added/updated (unit+integration)

  - Migrations included & reversible

  - Logs/metrics added where relevant

  - Docs (04x/04G/03/10) updated

## **15) Example Route Contracts (Summary)**

  -----------------------------------------------------------------------
  POST /v1/users/:userId/profile/skills\
  DELETE /v1/users/:userId/profile/skills/:skillId\
  POST /v1/users/:userId/profile/experience\
  PATCH /v1/users/:userId/profile/experience/:id\
  DELETE /v1/users/:userId/profile/experience/:id\
  GET /v1/users/:userId/profile/progress
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

- **All writes** return { data, progress }.

- Errors follow the envelope in §6.

## **16) Performance Targets (coding-level)**

- DTO validation + sanitization should keep **p95 writes \< 600ms**.

- **Progress recompute** should be **O(1)** queries per section
  (aggregate via indexed reads).

- Avoid N+1 loops; prefer single EXISTS/COUNT checks to determine step
  completion.
