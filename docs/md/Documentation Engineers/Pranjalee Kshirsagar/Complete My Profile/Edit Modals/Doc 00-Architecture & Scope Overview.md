# **Architecture & Scope Overview**

**Project:** Complete My Profile --- **Edit Modals** (Backend)\
**Service:** apps/user-service/src (extend existing user-service; no new
microservice)\
**Audience:** Backend engineers, QA, DevOps, Tech Leads

## **1) Objective & Outcomes**

**Goal:** Implement backend capabilities to **edit** and **complete**
the user profile via modals and to expose a **centralized profile
completion** percentage ("Ready to Get Hired?").\
**Outcomes:**

- Stable, documented **CRUD APIs** for the in-scope profile sections
  (below).

- A **single source of truth** for profile completion (equal step
  weighting).

- Predictable contracts for **validation**, **errors**, **idempotency**,
  and **auditing**.

- Production-ready **observability** and **runbook** stubs.

## **2) Scope (This Sprint)**

**In scope --- Edit Modals**

1.  **About Me** (rich text → sanitized HTML)

2.  **Skills** (chips + custom; case-insensitive de-dup; cap 100)

3.  **Work Experience** (employer, title, date rules, optional
    exp-skills, description as sanitized HTML)

4.  **Education** (institution, degree, date rules)

5.  **Job Title & Rate** (≤ 3 titles per user; currency+amount; no fee
    math)

6.  **Portfolio** (title, description, normalized URL; image optional &
    out of scope unless enabled later)

7.  **Progress Engine** (equal weights across in-scope steps;
    write-through recalculation; one GET endpoint)

**Out of scope (explicit for this sprint)**

- Talent profile page UI (already documented)

- Frontend computation of progress (FE **does not** compute locally)

- Availability, Languages, Industry Expertise, Teams, Certifications

- Profile image pipeline (crop/rotate/transforms/uploads)

- Search indexing, marketplace fee math, notifications

## **3) Core Principles & Rules**

- **Equal weights**: Each **in-scope step** contributes **equally** to
  the progress percent.

- **Completion definition**: A step is **complete** when **all required
  fields** for that step are present and valid. Fields marked "optional"
  are not required; **exception**: skills on a work-experience entry may
  be non-required even if not labeled "optional".

- **Write-through progress**: Every **successful**
  create/update/delete/restore returns the **updated** progress
  snapshot.

- **Idempotent-friendly**: Mutating requests accept Idempotency-Key
  (server dedup window).

- **Duplicates**: Disallowed where implied (e.g., skills, job titles).
  Enforced via **case-insensitive** normalization + unique indexes.

## **4) High-Level Architecture (Backend Only)**

### **4.1 Service Placement**

- Monorepo: apps/user-service/src

- Framework: NestJS + TypeScript

- Storage: Postgres (SQL migrations)

- Auth: JWT (owner-only writes; admin override)

- Transport: REST (v1)

### **4.2 Module Map**

  -----------------------------------------------------------------------
  apps/user-service/src\
  ├─ app.module.ts\
  ├─ common/ \# guards, interceptors, pipes, error handling, utils\
  ├─ config/ \# env schema/factories\
  ├─ database/ \# entities, repositories, migrations, seeders\
  ├─ modules/\
  │ ├─ about/\
  │ ├─ skills/\
  │ ├─ experience/\
  │ ├─ education/\
  │ ├─ rates/ \# job titles & rates\
  │ ├─ portfolio/\
  │ └─ progress/ \# central engine + read endpoint\
  ├─ audit/ \# write-audit logger and diffing\
  ├─ health/ \# /health, /ready\
  └─ main.ts
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

### **4.3 Data Flow (typical write)**

1.  Client opens modal → submits payload.

2.  Controller validates DTO → Service performs write
    (create/update/delete/restore).

3.  Service triggers **ProgressService** to recompute step states →
    aggregate percent (equal weights).

4.  Response returns { data, progress }.

5.  Optional: emit user.profile.section.updated /
    user.profile.completion.changed (if events enabled later).

## **5) Domain Summary (Conceptual Model)**

- **AboutMe** (1:1) --- content_html (sanitized), max length enforced.

- **Skills** (N) --- user-scoped list, normalized (e.g., lowercase,
  trimmed), **cap 100**, case-insensitive unique.

- **Experience** (N) --- employer, title, dates (start_date,
  end_date\|null if current), description_html (sanitized), optional
  skills.

- **Education** (N) --- institution, degree, dates (same date semantics
  as experience).

- **RateTitle** (≤3) --- title (unique per user, case-insensitive),
  currency, amount NUMERIC(12,2).

- **PortfolioItem** (N) --- title, description, url_normalized
  (scheme/host validation), image optional (future).

- **UserProfile** (1:1) --- may cache a **denormalized** progress
  snapshot for reads (optional optimization).

- **AuditLog** --- actor, action, entity ref, diff JSON, timestamps;
  retention policy.

> Exact columns, constraints, and indexes are specified in **Doc 03 ---
> Database Schema & Migrations**.

## **6) API Surface (Overview)**

- **Base path:** /v1/users/:userId/profile/\<section\>

- **Auth:** Bearer JWT; owner-only writes, admin override

- **Write endpoints:** POST, PATCH, DELETE (and POST /restore where
  applicable)

- **Read endpoints:** GET list/detail per section; **GET**
  /v1/users/:id/profile/progress

- **On write success:** always return { data, progress }

- **Standards:** Consistent error envelope { code, message, details },
  pagination & sorting for list endpoints, Idempotency-Key header on
  writes

> Detailed routes, request/response bodies, and examples are defined per
> section in **Doc 04A--04F**, and the progress contract in **Doc 04G**.

## **7) Validation & Business Rules (Summary)**

- **About Me**: Rich text input; store **sanitized HTML**; max length
  (per user story).

- **Skills**: Cap **100** per user; custom skill length cap;
  **case-insensitive de-dup**; normalize on write.

- **Experience**: Required employer/title/start; end_date ≥ start_date
  or null if "current"; description as sanitized HTML;
  **experience-skills optional**.

- **Education**: Institution/degree/start required; end rules mirror
  experience.

- **Rates**: ≤3 titles; (currency, amount) stored (no fee math); unique
  title per user (case-insensitive); precision NUMERIC(12,2).

- **Portfolio**: URL normalization (allowed schemes), title/description
  limits; image upload out of scope unless enabled later.

- **Duplicates**: Prevent duplicates at DTO + DB (functional indexes
  where needed).

## **8) Progress Engine (Contract Overview)**

- **Equal weighting**: All in-scope steps contribute equally (e.g., 6
  steps → \~16.67% each).

- **Step completion**: Achieved when **all required fields** for that
  step are valid; optional fields excluded.

- **Recalc policy**: Synchronous after each successful write.

- **Read endpoint**:

GET /v1/users/:id/profile/progress →

  -------------------------------------------------------------------------------------
  {\
  \"percent\": 66.67,\
  \"steps\": \[\
  {\"key\":\"about\",\"status\":\"complete\",\"missing\":\[\]},\
  {\"key\":\"skills\",\"status\":\"complete\",\"missing\":\[\]},\
  {\"key\":\"experience\",\"status\":\"incomplete\",\"missing\":\[\"start_date\"\]},\
  {\"key\":\"education\",\"status\":\"complete\",\"missing\":\[\]},\
  {\"key\":\"rates\",\"status\":\"complete\",\"missing\":\[\]},\
  {\"key\":\"portfolio\",\"status\":\"incomplete\",\"missing\":\[\"url\"\]}\
  \]\
  }
  -------------------------------------------------------------------------------------

  -------------------------------------------------------------------------------------

- 

<!-- -->

- **Write response shape**: Every successful write returns the same
  progress object alongside the data.

> Exact required-field lists per step are enumerated in **Doc 10 ---
> Validation & Business Rules Matrix** and referenced in **Doc
> 04A--04F**.

## **9) Security, Auditing, Idempotency**

- **AuthN/Z**: JWT required; owner-only writes; admin override for
  support tools.

- **Audit**: Persist actor, action, entity ref, and minimal field diffs;
  redact sensitive content where applicable; define a retention window
  (e.g., 180--365 days).

- **Idempotency**: Mutating endpoints accept Idempotency-Key; server
  deduplicates within a time window to ensure safe retries and avoid
  duplicate creates/updates.

## **10) Observability & Operations**

- **Health**: /health (liveness) and /ready (readiness) endpoints.

- **Metrics (MVP)**: request count/status, p95 latency per endpoint,
  validation error counters, **progress compute latency**.

- **Logs**: Structured, correlation IDs, PII redaction rules.

- **Tracing**: Basic spans around controller/service/db calls.

- **Runbook**: Startup checks, migrations, smoke tests, common failure
  modes (expanded in Doc 13).

## **11) Non-Functional Requirements**

- **Performance**: p95 read \< 300 ms, write \< 600 ms (target; refine
  in Doc 13).

- **Reliability**: 99.9% service availability target (user-service
  overall).

- **Security**: Input sanitizer for HTML, strict DTO validation,
  consistent error handling.

- **Data Integrity**: Functional unique indexes for normalized text
  (skills, titles).

- **Compliance**: Sanitized HTML storage; no sensitive personal data
  beyond profile basics.

## **12) Dependencies & Assumptions**

- **Postgres** available with migrations tooling (TypeORM/Prisma per
  repo standard).

- **JWT** issued by platform auth; user-service validates
  ownership/admin.

- **Events** (RabbitMQ) are **optional** this sprint; if enabled, they
  will be documented in Doc 06.

- **No FE progress calculation**; FE displays server-provided values
  only.

- **No fee/earnings math** in Rates for this sprint.

## **13) Acceptance Criteria (Definition of Done)**

- All in-scope modules ship with **documented endpoints**, **DTO
  validation**, **DB migrations**, and **progress write-through**.

- All writes return { data, progress }; /progress read returns canonical
  state.

- **Caps/limits** enforced (e.g., skills ≤ 100; titles ≤ 3).

- **Sanitized HTML** persisted for rich-text fields; invalid/unsafe HTML
  rejected.

- **Audit** entries created on writes; Idempotency-Key honored.

- Health endpoints pass; baseline metrics emitted; runbook steps
  verified.

- Postman/Insomnia collection (Doc 09) covers happy paths, boundaries,
  and negative cases.

## **14) Risks & Mitigations**

- **HTML sanitization bugs** → adopt a well-maintained sanitizer; add
  unit tests for XSS vectors.

- **Progress drift** → centralize required-fields definitions; unit
  tests for progress math; deny FE-side computation.

- **Duplicate entries** → normalize consistently and enforce DB
  functional unique indexes.

- **Idempotency gaps** → server-side store with TTL; test concurrent
  writes.

- **Scope creep** → keep non-goals explicit; move extra sections to
  future sprints.
