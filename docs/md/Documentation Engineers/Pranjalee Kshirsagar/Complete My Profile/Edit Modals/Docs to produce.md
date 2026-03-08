# **Docs to produce**

**Foundation & Setup**

1.  **Doc 00 --- Architecture & Scope Overview\**

2.  **Doc 01 --- Local/Cloud Setup & Environments\**

3.  **Doc 02 --- Repository Layout & Coding Standards\**

4.  **Doc 03 --- Database Schema & Migrations\**

**APIs & Domain (per modal + shared)\**
5. **Doc 04 --- About Me: API & Validation\**
6. **Doc 05 --- Skills: API, Limits & De-dupe\**
7. **Doc 06 --- Work Experience: API, HTML Sanitization & Date Rules\**
8. **Doc 07 --- Education: API & Date Rules\**
9. **Doc 08 --- Job Title & Rate: API, Currency Model\**
10. **Doc 09 --- Portfolio: API & URL Normalization\**
11. **Doc 10 --- Progress Engine: Weights, Completion Criteria &
Contract\**
12. **Doc 11 --- Shared Concerns: AuthZ, Idempotency, Errors,
Pagination\**
13. **Doc 12 --- Events & Integrations (RabbitMQ/Algolia---if
applicable)\**
14. **Doc 13 --- File Handling Policy (placeholder; profile image out of
scope)**

**Frontend Integration (backend-only contract)\**
15. **Doc 14 --- Client Integration Guide: Requests, Responses &
Flows\**
16. **Doc 15 --- Postman/Insomnia Collection & Example Payloads**

**Quality, Security & Operations\**
17. **Doc 16 --- Validation & Business Rules Matrix\**
18. **Doc 17 --- Security: AuthN/Z, PII, Audit Logging & Data
Retention\**
19. **Doc 18 --- Observability: Health, Metrics, Logs & Traces\**
20. **Doc 19 --- SLOs, Alerts & Runbook\**
21. **Doc 20 --- Release Plan: Migrations, Backfill & Rollback\**
22. **Doc 21 --- QA Plan: Test Cases, Boundary Values & E2E Journeys\**
23. **Doc 22 --- Compliance & Accessibility (Backend Implications)\**
24. **Doc 23 --- Changelog & Versioning Policy**

## **Doc 00 --- Architecture & Scope Overview**

**Purpose:** Define what we're building (backend only), why, and where
it lives.\
**Key points:**

- Scope: Edit modals for **About Me, Skills, Work Experience, Education,
  Job Title & Rate, Portfolio**, plus a centralized **Progress** engine.

- Out of scope (this sprint): Profile page UI,
  Availability/Languages/Industry/Teams/Certifications, profile-image
  pipeline.

- "Each step weighted equally; a step completes when all required fields
  are filled (optional fields excluded; explicit supervisor exception:
  skills in work experience can be non-required)."

- Ownership, stakeholders, success metrics.

## **Doc 01 --- Local/Cloud Setup & Environments**

**Purpose:** Get devs productive fast; ensure consistent environments.\
**Include:**

- **Path:** apps/user-service/src

- Required tools: Node, pnpm/yarn, Nest CLI, Docker, Postgres.

- .env keys with safe placeholders: DATABASE_URL, JWT config, RabbitMQ
  (if used), feature flags (e.g., PROFILE_EDIT_MODALS=1).

- Make targets / npm scripts for: build, test, lint, format, migrate
  up/down, seed, run.

- Cloud deployment notes (Render/...): env var mapping, secrets,
  health/ready checks.

## **Doc 02 --- Repository Layout & Coding Standards**

**Purpose:** Ensure consistent structure and patterns.\
**Include:**

- Module map under apps/user-service/src/modules:

  - about/, skills/, experience/, education/, rates/, portfolio/,
    progress/, plus common/, audit/, events/.

- DTOs (class-validator), controllers, services, repositories.

- Error envelope shape, error codes registry, pagination contract.

- Commit, PR, and review checklist.

- Example code snippets for guards/interceptors/pipes (no business logic
  here).

## **Doc 03 --- Database Schema & Migrations**

**Purpose:** Define entities, indexes, constraints; provide migration
scripts.\
**Include (tables & highlights):**

- user_profile --- profile-level flags, denormalized progress snapshot.

- about_me --- user_id (PK/FK), content_html (sanitized), length cap.

- skill_catalog (optional) & user_skill --- case-insensitive unique on
  (user_id, normalized_value), cap **100**.

- experience --- employer, title, start_date, end_date (nullable if
  current), description_html, optional experience-skill relation.

- education --- institution, degree, start_date, end_date (nullable if
  current).

- rate_title --- up to **3** rows per user; currency + amount
  NUMERIC(12,2); unique (user_id, normalized_title).

- portfolio_item --- title, description, url_normalized, optional
  image_url (future).

- audit_log --- actor, action, entity ref, diff JSON, timestamps;
  retention policy.

- Indexes for de-dupe, recent ordering, and list views.

- Migration plan: forward, rollback steps, seed (optional).

## **Doc 04A --- About Me: API & Validation**

**Purpose:** CRUD contract for About Me modal.\
**Include:**

- Endpoints: GET /v1/users/:id/profile/about, PATCH (upsert).

- Accept **rich text**, store **sanitized HTML**; max length per user
  story.

- Responses include {progress}.

- Errors: too long, invalid HTML after sanitization.

## **Doc 04B --- Skills: API, Limits & De-dupe**

**Purpose:** Chips + custom entries rules.\
**Include:**

- Endpoints: GET /skills, POST add, DELETE remove, optional PUT
  /reorder.

- Caps: **100 skills** per user; custom skill max length;
  case-insensitive de-dupe.

- Optional GET /skills/suggest?q= if catalog/typeahead later.

- Returns {progress} on write.

## **Doc 04C --- Work Experience: API, HTML Sanitization & Date Rules**

**Purpose:** Create/edit experience entries.\
**Include:**

- Endpoints: list, detail, create, update, soft-delete, restore.

- Required: employer, title, start_date; end_date ≥ start_date or null
  if current.

- description_html (sanitized).

- Experience-skills list **not required** (supervisor exception).

- Returns {progress} on write.

## **Doc 04D --- Education: API & Date Rules**

**Purpose:** Create/edit education entries.\
**Include:**

- Similar to experience; institution, degree, start_date required;
  end_date rules mirror experience.

- Ordering rules; {progress} on write.

## **Doc 04E --- Job Title & Rate: API, Currency Model**

**Purpose:** Up to 3 titles with hourly rates.\
**Include:**

- Endpoints: list/create/update/delete.

- Currency model (single site currency or per-user---choose and fix),
  NUMERIC(12,2) precision, min/max.

- No platform-fee math in this sprint.

- Unique title per user (case-insensitive).

- {progress} on write.

## **Doc 04F --- Portfolio: API & URL Normalization**

**Purpose:** Links (and optional image later).\
**Include:**

- Endpoints: list/create/update/delete.

- URL normalization/validation; allowed schemes; length caps.

- Image upload **not** in this sprint unless explicitly enabled later.

- {progress} on write.

## **Doc 04G --- Progress Engine: Weights, Completion Criteria & Contract**

**Purpose:** Single source of truth for completion.\
**Include:**

- **Equal weights** across the in-scope steps (About, Skills,
  Experience, Education, Rates, Portfolio).

- Per-step **required fields** list; "complete when all required fields
  present and valid."

- GET endpoint: /v1/users/:id/profile/progress returning { percent,
  steps: \[{key,status,missing}\] }.

- Write-through: all writes recalc & return progress.

- Example calculations for typical states (0%, 50%, 100%).

## **Doc 05 --- Shared Concerns: AuthZ, Idempotency, Errors, Pagination**

**Purpose:** Consistency across all modules.\
**Include:**

- Owner-only writes; admin override guard.

- Idempotency-Key header for POST/PATCH/DELETE/RESTORE; server dedupe
  window.

- Error envelope: {code, message, details}; registry of codes per
  module.

- Pagination/sorting/search conventions for list endpoints.

## **Doc 06 --- Events & Integrations (optional this sprint)**

**Purpose:** Define outbound/inbound events if used now.\
**Include:**

- Emit user.profile.section.updated and user.profile.completion.changed
  (idempotent).

- Exchange/queue naming, payload schema, DLQ policy.

- Search indexing (Algolia/ES) **explicitly out of scope** unless
  required.

## **Doc 07 --- File Handling Policy (placeholder; profile image out of scope)**

**Purpose:** Document stance so future readers aren't confused.\
**Include:**

- State that **profile image pipeline is out of scope** for this sprint;
  certs/portfolio uploads not enabled here.

- Default storage/AV policy statement for future sprints (TBD).

## **Doc 08 --- Client Integration Guide: Requests, Responses & Flows**

**Purpose:** Backend-only guide for frontend consumers (no FE code).\
**Include:**

- For each modal: request/response examples, validation errors,
  idempotent retry flow, optimistic UI notes.

- Progress consumption: **FE never computes locally**; relies on
  {progress} from write responses and /progress read.

- Status/edge cases: "Skip" does not write, therefore no progress
  change.

## **Doc 09 --- Postman/Insomnia Collection & Example Payloads**

**Purpose:** Shareable tests and examples.\
**Include:**

- Environment variables; folders per module; sample payloads for
  valid/invalid cases; chained tests for progress assertions.

## **Doc 10 --- Validation & Business Rules Matrix**

**Purpose:** One page to rule them all.\
**Include:**

- All caps/limits (e.g., **Skills ≤ 100**, Titles ≤ 3), string lengths,
  allowed MIME/URL schemes, date rules, uniqueness rules.

- Mark **required vs optional** per field (per step) to drive progress
  logic.

- Boundary values table for QA.

## **Doc 11 --- Security: AuthN/Z, PII, Audit Logging & Data Retention**

**Purpose:** Guardrails.\
**Include:**

- JWT issuer, scopes, owner/admin rules.

- PII list, log redaction rules.

- **Audit log** model and retention (e.g., 180--365 days).

- Data export/delete considerations (if any).

## **Doc 12 --- Observability: Health, Metrics, Logs & Traces**

**Purpose:** See issues fast.\
**Include:**

- /health, /ready.

- Metrics: request count/status, p95 latency per endpoint, **progress
  compute latency**, validation error counters.

- Trace spans per request; correlation ids; sampling.

## **Doc 13 --- SLOs, Alerts & Runbook**

**Purpose:** Operate reliably.\
**Include:**

- SLOs (e.g., p95 \< 300ms for reads, \< 600ms for writes; 99.9%
  uptime), error budget.

- Alerts: threshold, channels, on-call.

- Runbook: common failures, DLQ redrive (if events used), hotfix flow.

## **Doc 14 --- Release Plan: Migrations, Backfill & Rollback**

**Purpose:** Safe rollout.\
**Include:**

- Migration order; feature flag enabling; backfill for pre-existing
  users' progress (initial compute job).

- Rollback steps and data safety notes.

## **Doc 15 --- QA Plan: Test Cases, Boundary Values & E2E Journeys**

**Purpose:** What QA executes.\
**Include:**

- Unit/contract tests list per endpoint.

- E2E flows: "create first skill" → progress updates; "delete last
  education" → progress decreases; idempotent retry.

- Negative tests: invalid dates, duplicate skills, over-cap attempts.

## **Doc 16 --- Compliance & Accessibility (Backend Implications)**

**Purpose:** Non-functional guardrails.\
**Include:**

- HTML sanitization policy for rich text; XSS prevention.

- Accessibility note: server-side messages & codes designed for
  accessible FE messaging.

## **Doc 17 --- Changelog & Versioning Policy**

**Purpose:** Track changes cleanly.\
**Include:**

- Semantic versioning for the API.

- Entries per release: schema changes, new endpoints, deprecations.
