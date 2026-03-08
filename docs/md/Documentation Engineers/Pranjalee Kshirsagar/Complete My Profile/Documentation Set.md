# **Doc 00 --- Overview & Scope**

- Problem statement and goals (Certifications + attachment uploads +
  progress bonus).

- What's in scope vs. out of scope (no search reindex this sprint,
  etc.).

- Roles/permissions (owner or admin can write; others read).

- Success metrics (CRUD works, upload works, progress updates,
  rate-limit enforced).

# **Doc 01 --- Environment & Full Setup**

- Prereqs: Node, pnpm/yarn, Docker, Postgres.

- Env vars (DB, R2/S3, RabbitMQ, throttling TTL/limit).

- Local dev startup (monorepo commands, seed data).

- Migrations (run, rollback).

- Sample .env.local with sane defaults.

- Troubleshooting matrix (common startup errors).

# **Doc 02 --- Architecture & Bootstrapping**

- Module placement and dependency diagram:

  - certifications module (controllers, services, repos, entities, dtos,
    validators, events).

  - uploads sub-module (pre-signed URL issuance).

  - profile-progress service (called after writes).

  - Guards (owner-or-admin).

- Request flow diagrams (create, update, delete, upload).

- Event flow (publish on bus).

- Rate-limit strategy (where enforced; config knobs).

# **Doc 03 --- Data Model & Schemas**

- ERD snippet for:

  - user_certifications (columns, types, defaults).

  - Unique index (user_id, normalized_name, issue_date,
    coalesce(credential_id,\'\')).

- Column rules:

  - issue_date required, date-only; expiry_date optional, ≥ issue_date.

  - doesnt_expire true → expiry_date null/ignored.

  - credential_url http/https only; allow query params.

  - skills as text\[\], **max 10**, case-insensitive dedupe.

  - attachment_url optional.

- Example TypeORM migration file outline.

# **Doc 04 --- API Design (REST, v1)**

- Base: /v1/users/:userId/certifications

- Endpoints:

  - GET ?limit&offset&q&sort=issue_date:desc

  - POST / → returns {data, progress}

  - PATCH /:certId → returns {data, progress}

  - DELETE /:certId → returns {deleted:true, progress}

  - Uploads:

    - POST /:certId/uploads/issue-url (pre-signed PUT) → {uploadUrl,
      objectUrl}

    - PATCH /:certId/attachment → {data, progress}

  - (Optional) GET /v1/users/:userId/profile/progress

- Auth: JWT; owner-or-admin guard.

- Request/response schemas with examples.

- Error catalogue & codes:

  - 400.invalid_date_range

  - 400.expiry_not_allowed_when_nonexpiring

  - 400.invalid_url_scheme

  - 400.skills_limit_exceeded

  - 400.future_issue_date_exceeds_limit

  - 409.duplicate_certification

  - 401/403/404

- Pagination contract (limit/offset defaults & max).

- Rate limits (10 writes/min/user)---headers or body signaling.

# **Doc 05 --- Business Rules & Progress Engine**

- Progress policy: Certifications are **bonus** (e.g., +10% when count
  ≥1).

- What counts as "complete" for the section (≥1 valid cert).

- When to recalc (on create/update/delete/attach).

- Returned structure {percent, sections\[\]}; example payloads.

- Edge cases (removing last cert → bonus removed).

# **Doc 06 --- Validation & Security**

- DTO-level validations (dates, url, skills length, dedupe).

- Server-side normalization (trim/lower for duplicate checks).

- Anti-abuse: throttling rules; attachment MIME allow-list; max file
  size.

- Authorization rules (owner/admin) with examples.

- Data protection notes (no PII beyond cert data; attachment link
  handling).

# **Doc 07 --- Events & Integrations**

- Event topics & contracts:

  - profile.section.updated (payload shape, examples).

  - profile.completion.changed (old%, new%, section).

- Publishing guarantees (at-least-once), retries/backoff.

- RabbitMQ exchange/queue bindings (names, routing keys).

- Consumer expectations (none this sprint---but contract documented).

# **Doc 08 --- Uploads: Storage & Lifecycle**

- Storage choice (Cloudflare R2 / S3-compatible).

- Pre-signed URL issuance flow:

  - Request body (fileName, mimeType, size) validations.

  - TTL and bucket naming.

- Client upload instructions (PUT to uploadUrl).

- Attachment finalize call (PATCH \.../attachment).

- Security:

  - Allowed MIME types (pdf, png, jpg, jpeg; confirm exact list).

  - Max object size (default; confirm).

  - Public vs signed GET policy (recommend signed or time-boxed public).

- Cleanup strategy (replacing/deleting attachments).

# **Doc 09 --- Frontend Integration Notes**

- Form field map → DTO keys.

- Date handling (date-only; no timezone).

- Behavior rules:

  - Toggle "doesn't expire" disables/clears expiry_date.

  - Skills chips with hard cap (10); show server error text on exceed.

  - URL must start with http/https; surface inline validation.

- Upload UX:

  - Call issue-url → PUT file → PATCH attachment → optimistic update.

  - Handle failures and retry hints.

- Progress refresh:

  - Use progress object returned from POST/PATCH/DELETE to update the
    bar.

# **Doc 10 --- QA Plan & Test Data**

- Seed user(s) and sample certifications (with/without expiry, with
  attachment).

- Test cases:

  - CRUD happy paths.

  - Date invalid (\< / \> 90-day future).

  - Toggle non-expiring logic.

  - URL scheme validation.

  - Skills cap & dedupe.

  - Duplicate detection.

  - Deleting last cert affects progress.

  - Rate limit exceeded behavior.

  - Upload success/failure paths.

- API contract tests (status codes, error codes).

- Pagination & sorting checks.

# **Doc 11 --- Runbook / Ops Guide**

- Deploy steps (migrations order, env flags).

- Rollback procedure.

- How to rotate R2 credentials.

- How to re-issue uploads if TTL expires.

- Known failure modes and remedies (bus down, R2 unavailable, DB unique
  violation storms).

- Feature flags/toggles (if any).

# **Doc 12 --- Observability & Monitoring (stub for future)**

- What to instrument later:

  - Counters: cert.create\|update\|delete, upload.issueUrl,
    upload.attach.

  - Validation error counters by code.

  - Latency histograms for CRUD.

  - Event publish success/fail counts.

- Alert suggestions (write error spikes, duplicate conflicts).

# **Doc 13 --- User-Facing Help (if applicable)**

- Short "How to add a certification" guide (screenshots).

- What counts as a valid URL, how to handle non-expiring certs.

- File types/size allowed; privacy note about attachments.

- Why certifications increase profile readiness.

# **Doc 14 --- Changelog & Versioning**

- API changes under /v1 with dates.

- Backwards-compat notes (none expected).

- Deprecation policy (future).

## **Final pre-work checks (so these docs stay accurate)**

- Confirm **allowed MIME types** and **max file size** for uploads.

- Confirm **bonus %** used by progress (default 10% unless told
  otherwise).
