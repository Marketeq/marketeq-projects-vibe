# **0) Executive overview (1--2 pages)**

- Problem statement & scope (Edit Modals only; backend-focused).

- What's in / out; assumptions; dependencies.

- Final product decisions (the "locked decisions" list).

# **1) Environment & full setup**

- Local dev setup (Node/NestJS, PNPM/Yarn, Postgres, Redis, RabbitMQ if
  used).

- Monorepo pathing & naming (apps/**user-service**, shared libs).

- .env sample with all vars (ports, DB URL, file storage, rate limit,
  CORS).

- Bootstrapping scripts (migrations, seeders, health check).

- Running locally, dev, staging, prod (commands & profiles).

- Secrets management (how to load env securely).

# **2) Architecture & module design**

- High-level diagram (user-service, DB, storage, progress engine).

- Module boundaries: Titles, Languages, Certifications, Progress,
  Uploads.

- Request flow (controller → service → repo → progress → response).

- Error contract (shape, codes) & mapping strategy.

# **3) Data dictionary (master CSV + narrative)**

- One table of **all fields** across Job Titles, Languages,
  Certifications.

- Columns: section \| field_name \| type \| required \| rules \|
  create_or_update \| db_table \| existing_in_db \| api_endpoint \|
  notes.

- Call out new vs existing fields.

# **4) Database schemas & migrations**

- ERD snippet (user ↔ job_titles, languages, certifications).

- Table definitions (columns, types, defaults, indexes, uniques).

- **Soft delete** columns (deleted_at) for all three entities.

- **Languages.position** (nullable) for future custom ordering.

- Migrations (ordered, idempotent) + rollback steps.

- Data retention & backup notes.

# **5) Validation & business rules**

- Global rules (server-side only; inline error mapping).

- Section rules:

  - **Job Titles**: max 3, exactly one default, rate \> 0, USD, 2
    decimals, no duplicates.

  - **Languages**: max 10, case-insensitive de-dupe, free text, optional
    variant/proficiency, custom order (via position later).

  - **Certifications**: name required, issue_date ≤ +90 days, expiry ≥
    issue (when enabled), doesn't-expire disables expiry & stores null,
    single attachment, URL auto-prefix https + validate, duplicate rule
    (normalized name + issue_date + credential_id), skills ≤10 &
    deduped.

- Error copy (final strings).

# **6) API design (OpenAPI + prose)**

- Base path & versioning (e.g., /v1).

- Auth & ownership (owner/admin).

- Rate limiting (10 writes/min/user) & error contract.

- Endpoints (method, path, auth, query, body, responses, errors):

  - **Job Titles**: list, create, update (incl. set default), delete
    (soft), restore.

  - **Languages**: list (ordered), create, update (incl. future
    position), delete (soft), restore.

  - **Certifications**: list (q, sort issue_date), create, update,
    delete (soft), restore, uploads: issue pre-signed URL,
    finalize/patch.

  - **Progress**: returned on every write; optional read endpoint if
    needed.

- Sorting & pagination contract (default sorts; limit ∈ {5,10,25,50},
  default 10).

- Request/response examples (copy/paste).

# **7) Uploads & file storage**

- Storage backend (e.g., S3/R2/MinIO) & buckets/paths.

- Pre-signed URL issuance endpoint (TTL, content types).

- Client upload sequence & finalize behavior.

- Security (allowed types, max size), anti-abuse notes.

- Cleanup/retention strategy.

# **8) Progress engine contract**

- Equal weights; definition of "complete" per section.

- Response shape { percent, sections\[\] }.

- When computed (after writes), failure handling (non-blocking).

# **9) Soft delete & undo**

- Domain rules (always soft delete; never hard delete from API).

- deleted_at semantics; visibility in lists.

- **Undo/restore** endpoints & expected client UX.

- Admin purge (future; out of scope but noted).

# **10) Search, sort, pagination details**

- Certifications: q (ILIKE name), default sort issue_date desc.

- Job Titles: default first, then created_at.

- Languages: position asc (if present), else created_at; future reorder.

- Page size options & server validation.

# **11) Security, permissions, and authZ**

- Ownership checks & admin override.

- Input sanitation (URL normalization, trimming, lowercasing).

- Rate-limit policy & headers (if exposed).

- PII review (attachments may contain PII).

# **12) Monitoring, logging, and observability**

- Healthcheck (/health) and readiness.

- Structured logs (request id, user id, endpoint, duration, result).

- Key metrics: request rate, error rate, p95 latency, throttles, upload
  failures.

- Alerts: elevated 4xx/5xx, migration failures.

- Dashboard checklist (metrics to chart).

# **13) Testing strategy**

- Unit tests: validators, services (duplicate, date rules, URL
  normalization).

- Integration tests: endpoints (CRUD, soft delete/restore, rate limit).

- Upload flow tests (issue URL → upload → finalize).

- Progress recalculation tests.

- Contract tests (response schema, error codes).

- Test data & fixtures.

# **14) Performance & scalability**

- Expected volumes (items per user; pagination).

- Index strategy (uniques, user_id, issue_date).

- Rate limit tuning notes.

- Upload throughput considerations.

# **15) Frontend integration guide**

- How each modal calls the API (sequence diagrams).

- Form → DTO mapping (date-only handling, doesn't-expire toggle logic).

- Error mapping table (field → error code → UI copy).

- Success handling (modal stays open, "Saved" state).

- Undo delete UX contract (restore endpoint call).

- Search bar wiring (Certifications).

- Progress animation trigger.

# **16) Release plan & migration checklist**

- Pre-deploy: run migrations in staging, backfill/compat notes.

- Feature flag (if any) & rollout steps.

- Smoke test script (Postman collection).

- Rollback plan.

# **17) Runbook (operations)**

- Common failures & remedies (DB down, storage misconfig, rate-limit
  false positives).

- How to rotate creds, change bucket, update limits.

- On-call checklist.

# **18) Compliance & data handling**

- Attachment content guidelines (no secrets/IDs), scanning policy (if
  any).

- Retention policy (how long to keep attachments).

- Privacy notes (public certifications by product decision).

# **19) Admin UI (future note)**

- Requirements for purge, reassign default title, reorder languages
  (if/when added).

# **20) Artifacts & templates**

- OpenAPI (YAML/JSON).

- Postman/Bruno collection.

- SQL migrations (timestamped files).

- Example env file.

- ERD diagram (png/svg).

- Sample CSV (Data Dictionary).

- Checklists (QA, release, smoke tests).
