# **Release Plan: Migrations, Backfill & Rollback**

**Project:** Complete My Profile --- **Edit Modals** (Backend)\
**Service:** apps/user-service (NestJS + TypeORM)\
**DB:** PostgreSQL (DDL below).\
**Goal:** Ship new profile-edit backend (About, Skills, Experience,
Education, Rates, Portfolio) + Progress, with audit logging.
Zero-downtime, additive schema, no external integrations.

## **0) TL;DR (what ships safely)**

1.  **Additive migrations only** (create tables, indexes, constraints).

2.  **Backfill/normalize** any pre-existing rows (if any) before
    enforcing uniques/checks.

3.  **Cutover** app version (controllers/services) after schema is live.

4.  **Validate** constraints post-backfill; run smoke tests.

5.  **Rollback** is code first → DB second; DDL DOWN scripts provided.

## **1) Deployment Sequence (checklist)**

**T-0: Preflight**

- ✅ Database credentials + migration user ready (no superuser needed).

- ✅ TypeORM migrations compiled and **idempotent**.

- ✅ App image built and staged (but **not** serving yet).

- ✅ Observability up (Doc 12): /health/\*, /metrics.

**Phase A --- Schema (safe, additive)**

1.  Run **DDL A**: create new tables, columns, and NON-blocking indexes.

2.  Run **Backfill A**: compute normalized columns (\*\_norm,
    url_normalized).

3.  Run **Constraint A**: add unique/check constraints (NOT VALID where
    possible).

4.  Run **Validate A**: VALIDATE CONSTRAINT after data is clean.

**Phase B --- App Cutover\**
5. Deploy apps/user-service new version (controllers/services enabled).\
6. Run **smoke tests** (Doc 09 cURLs).\
7. Monitor latency/error metrics; check audit inserts.

**Phase C --- Post-Cutover Hygiene\**
8. Enable read-only dashboards for QA (Progress endpoint).\
9. Schedule retention job (if enabled) for audit.\
10. Sign-off.

**Rollback strategy** at the end of this doc.

## **2) TypeORM Migrations (file names)**

Create one migration per domain to keep changes small:

  -----------------------------------------------------------------------
  apps/user-service/src/database/migrations/\
  1710000000001-create-about-me.ts\
  1710000000002-create-user-skill.ts\
  1710000000003-create-experience.ts\
  1710000000004-create-education.ts\
  1710000000005-create-rate-title.ts\
  1710000000006-create-portfolio-item.ts\
  1710000000007-create-audit-log.ts\
  1710000000008-backfill-and-constraints.ts
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

> If your standards require pure SQL, mirror the statements below inside
> TypeORM queryRunner.query(\<sql\>).

## **3) DDL A --- Create Tables (additive)**

  -----------------------------------------------------------------------
  \-- language: sql\
  BEGIN;\
  \
  \-- 3.1 About Me (1 row per user)\
  CREATE TABLE IF NOT EXISTS about_me (\
  user_id UUID PRIMARY KEY,\
  content_html VARCHAR(2600) NOT NULL,\
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()\
  );\
  \
  \-- 3.2 Skills\
  CREATE TABLE IF NOT EXISTS user_skill (\
  id UUID PRIMARY KEY,\
  user_id UUID NOT NULL,\
  value_raw VARCHAR(100) NOT NULL,\
  value_norm VARCHAR(100) NOT NULL,\
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),\
  deleted_at TIMESTAMPTZ NULL\
  );\
  CREATE INDEX IF NOT EXISTS ix_user_skill_user_created ON
  user_skill(user_id, created_at DESC);\
  \-- Unique will be added after backfill\
  \
  \-- 3.3 Experience\
  CREATE TABLE IF NOT EXISTS experience (\
  id UUID PRIMARY KEY,\
  user_id UUID NOT NULL,\
  employer VARCHAR(200) NOT NULL,\
  title VARCHAR(200) NOT NULL,\
  start_date DATE NOT NULL,\
  end_date DATE NULL,\
  description_html VARCHAR(5000) NULL,\
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),\
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),\
  deleted_at TIMESTAMPTZ NULL\
  );\
  CREATE INDEX IF NOT EXISTS ix_experience_user_dates ON
  experience(user_id, start_date DESC, created_at DESC);\
  \
  \-- 3.4 Education\
  CREATE TABLE IF NOT EXISTS education (\
  id UUID PRIMARY KEY,\
  user_id UUID NOT NULL,\
  institution VARCHAR(200) NOT NULL,\
  degree VARCHAR(200) NOT NULL,\
  start_date DATE NOT NULL,\
  end_date DATE NULL,\
  description_html VARCHAR(5000) NULL,\
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),\
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),\
  deleted_at TIMESTAMPTZ NULL\
  );\
  CREATE INDEX IF NOT EXISTS ix_education_user_dates ON
  education(user_id, start_date DESC, created_at DESC);\
  \
  \-- 3.5 Rate Title\
  CREATE TABLE IF NOT EXISTS rate_title (\
  id UUID PRIMARY KEY,\
  user_id UUID NOT NULL,\
  title_raw VARCHAR(160) NOT NULL,\
  title_norm VARCHAR(160) NOT NULL,\
  currency CHAR(3) NOT NULL,\
  amount NUMERIC(12,2) NOT NULL CHECK (amount \> 0),\
  is_primary BOOLEAN NOT NULL DEFAULT false,\
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),\
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),\
  deleted_at TIMESTAMPTZ NULL\
  );\
  CREATE INDEX IF NOT EXISTS ix_rate_title_user_primary ON
  rate_title(user_id, is_primary DESC, created_at DESC);\
  \
  \-- 3.6 Portfolio Item\
  CREATE TABLE IF NOT EXISTS portfolio_item (\
  id UUID PRIMARY KEY,\
  user_id UUID NOT NULL,\
  title VARCHAR(200) NOT NULL,\
  description VARCHAR(2000) NULL,\
  url_raw TEXT NOT NULL,\
  url_normalized TEXT NOT NULL,\
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),\
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),\
  deleted_at TIMESTAMPTZ NULL\
  );\
  CREATE INDEX IF NOT EXISTS ix_portfolio_user_created ON
  portfolio_item(user_id, created_at DESC);\
  \
  \-- 3.7 Audit Log (security events)\
  CREATE TABLE IF NOT EXISTS audit_log (\
  audit_id UUID PRIMARY KEY,\
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),\
  actor_user_id UUID NOT NULL,\
  target_user_id UUID NOT NULL,\
  action VARCHAR(64) NOT NULL,\
  resource_id UUID NULL,\
  ip INET NULL,\
  ua_hash VARCHAR(64) NULL,\
  delta_summary VARCHAR(512) NULL\
  );\
  CREATE INDEX IF NOT EXISTS ix_audit_target_time ON
  audit_log(target_user_id, occurred_at DESC);\
  \
  COMMIT;
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **4) Backfill A --- Normalize & Clean (safe to re-run)**

> Run **before** enabling unique/check constraints.

  -----------------------------------------------------------------------
  \-- language: sql\
  \-- Skills: derive value_norm (lower + collapse spaces)\
  UPDATE user_skill\
  SET value_norm = regexp_replace(lower(value_raw), \'\\s+\', \' \',
  \'g\')\
  WHERE value_norm IS NULL;\
  \
  \-- Deduplicate skills per (user_id, value_norm) keeping latest active
  (no hard delete here)\
  WITH ranked AS (\
  SELECT id, user_id, value_norm,\
  ROW_NUMBER() OVER (PARTITION BY user_id, value_norm ORDER BY
  (deleted_at IS NULL) DESC, created_at DESC) AS rn\
  FROM user_skill\
  )\
  UPDATE user_skill u\
  SET deleted_at = COALESCE(u.deleted_at, now())\
  FROM ranked r\
  WHERE u.id = r.id AND r.rn \> 1 AND u.deleted_at IS NULL;\
  \
  \-- Rates: derive title_norm\
  UPDATE rate_title\
  SET title_norm = regexp_replace(lower(title_raw), \'\\s+\', \' \',
  \'g\')\
  WHERE title_norm IS NULL;\
  \
  \-- Rates: enforce single primary per user (keep newest primary; unset
  others)\
  WITH prim AS (\
  SELECT id, user_id,\
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY (is_primary) DESC,
  created_at DESC) AS rn\
  FROM rate_title\
  WHERE deleted_at IS NULL\
  )\
  UPDATE rate_title r\
  SET is_primary = CASE WHEN p.rn = 1 THEN true ELSE false END\
  FROM prim p\
  WHERE r.id = p.id;\
  \
  \-- Portfolio: normalize URLs (host lower, drop default port, remove
  fragment & common tracking)\
  \-- (Assumes a DB function url_normalize(text) exists; if not,
  normalization happens in service layer.\
  \-- For backfill, a minimal normalization: lower host & strip
  fragment)\
  \-- Example minimal:\
  UPDATE portfolio_item\
  SET url_normalized = regexp_replace(url_raw, \'#.\*\$\', \'\') \-- drop
  fragment\
  WHERE url_normalized = url_raw OR url_normalized IS NULL;
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

> If you **don't** have a DB URL normalizer, rely on service-side
> normalization for all new writes; keep backfill minimal and
> non-destructive as above.

## **5) Constraint A --- Enforce Uniques/Checks**

> Add constraints **after** backfill to avoid blocking errors. Where
> supported, add as NOT VALID, then validate.

  -----------------------------------------------------------------------
  \-- language: sql\
  BEGIN;\
  \
  \-- Skills: unique active rows\
  ALTER TABLE user_skill\
  ADD CONSTRAINT ux_user_skill_user_norm\
  UNIQUE (user_id, value_norm, deleted_at)\
  NOT DEFERRABLE;\
  \
  \-- (Optional pattern: partial unique on \"active\" only; Postgres
  can\'t partial + named easily inside ALTER TABLE UNIQUE.\
  \-- Alternative: unique on (user_id, value_norm) and rely on app to
  skip deleted; or add a partial unique index)\
  CREATE UNIQUE INDEX IF NOT EXISTS uix_user_skill_active\
  ON user_skill(user_id, value_norm)\
  WHERE deleted_at IS NULL;\
  \
  \-- Rates: unique title_norm per active row\
  CREATE UNIQUE INDEX IF NOT EXISTS uix_rate_title_active\
  ON rate_title(user_id, title_norm)\
  WHERE deleted_at IS NULL;\
  \
  \-- Rates: single primary among active rows\
  CREATE UNIQUE INDEX IF NOT EXISTS uix_rate_primary_one\
  ON rate_title(user_id)\
  WHERE is_primary IS TRUE AND deleted_at IS NULL;\
  \
  \-- Experience/Education: date order checks\
  ALTER TABLE experience\
  ADD CONSTRAINT chk_experience_dates CHECK (end_date IS NULL OR end_date
  \>= start_date) NOT VALID;\
  ALTER TABLE education\
  ADD CONSTRAINT chk_education_dates CHECK (end_date IS NULL OR end_date
  \>= start_date) NOT VALID;\
  \
  \-- Portfolio: unique normalized URL per active row\
  CREATE UNIQUE INDEX IF NOT EXISTS uix_portfolio_url_active\
  ON portfolio_item(user_id, (url_normalized))\
  WHERE deleted_at IS NULL;\
  \
  COMMIT;\
  \
  \-- Validate deferred checks (no table lock on creation path)\
  ALTER TABLE experience VALIDATE CONSTRAINT chk_experience_dates;\
  ALTER TABLE education VALIDATE CONSTRAINT chk_education_dates;
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **6) Smoke Tests (post-cutover)**

**Health**

  -----------------------------------------------------------------------
  curl -sS http://\$BASE/health/ready
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Happy paths (sample)**

  ---------------------------------------------------------------------------
  \# About upsert\
  curl -X POST \"\$BASE/v1/users/\$UID/profile/about\" -H \"Authorization:
  Bearer \$JWT\" -H \"Content-Type: application/json\" \\\
  -d \'{ \"contentHtml\":\"\<p\>Hi!\</p\>\"}\'\
  \
  \# Add skill\
  curl -X POST \"\$BASE/v1/users/\$UID/profile/skills\" -H \"Authorization:
  Bearer \$JWT\" -H \"Content-Type: application/json\" \\\
  -d \'{ \"value\":\"React\"}\'\
  \
  \# Create rate + set primary\
  curl -X POST \"\$BASE/v1/users/\$UID/profile/rates\" -H \"Authorization:
  Bearer \$JWT\" -H \"Content-Type: application/json\" \\\
  -d \'{ \"title\":\"Senior Full-Stack
  Developer\",\"currency\":\"USD\",\"amount\":\"125.00\",\"isPrimary\":true
  }\'\
  \
  \# Progress\
  curl -sS -H \"Authorization: Bearer \$JWT\"
  \"\$BASE/v1/users/\$UID/profile/progress\"
  ---------------------------------------------------------------------------

  ---------------------------------------------------------------------------

**Conflict & validation**

  -----------------------------------------------------------------------
  \# Duplicate skill\
  curl -X POST \"\$BASE/v1/users/\$UID/profile/skills\" -H
  \"Authorization: Bearer \$JWT\" -H \"Content-Type: application/json\"
  \\\
  -d \'{ \"value\":\"react\"}\' \| jq \'.code\'\
  \# -\> \"CONFLICT_DUPLICATE\"
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **7) Rollback Plan**

**Principle:** **Code rollback first**, DB rollback only if absolutely
necessary. All schema changes are **additive**, so old code should
continue to run.

- **If app misbehaves**:

  1.  Roll back the service to the previous container image.

  2.  Keep the new tables/constraints --- they are additive and inert
      for older code.

- **If a migration breaks critical paths** (rare, e.g., unexpected lock
  or constraint validation failure):

  1.  **Stop** the new app rollout (keep old version running).

  2.  Revert the specific DDL in reverse order (drop unique
      indexes/constraints first, then tables **only if empty**).

**DDL DOWN snippets (use carefully)**

  -----------------------------------------------------------------------
  \-- language: sql\
  BEGIN;\
  \
  \-- Drop validations & uniques in reverse\
  DROP INDEX IF EXISTS uix_portfolio_url_active;\
  ALTER TABLE education DROP CONSTRAINT IF EXISTS chk_education_dates;\
  ALTER TABLE experience DROP CONSTRAINT IF EXISTS chk_experience_dates;\
  \
  DROP INDEX IF EXISTS uix_rate_primary_one;\
  DROP INDEX IF EXISTS uix_rate_title_active;\
  \
  DROP INDEX IF EXISTS uix_user_skill_active;\
  ALTER TABLE user_skill DROP CONSTRAINT IF EXISTS
  ux_user_skill_user_norm;\
  \
  \-- Tables (drop only if you must and if no data you need to preserve)\
  \-- DROP TABLE IF EXISTS audit_log;\
  \-- DROP TABLE IF EXISTS portfolio_item;\
  \-- DROP TABLE IF EXISTS rate_title;\
  \-- DROP TABLE IF EXISTS education;\
  \-- DROP TABLE IF EXISTS experience;\
  \-- DROP TABLE IF EXISTS user_skill;\
  \-- DROP TABLE IF EXISTS about_me;\
  \
  COMMIT;
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

> **Recommendation:** Do **not** drop tables in production rollback;
> keep them and fix forward unless they cause harm.

## **8) Data Backfill & Cleanup Playbook (if legacy data exists)**

**Skills over cap ( \>100 )**

- Keep the **newest 100 active**; soft-delete older extras.

  -----------------------------------------------------------------------
  \-- language: sql\
  WITH ranked AS (\
  SELECT id, user_id,\
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) AS
  rn\
  FROM user_skill WHERE deleted_at IS NULL\
  )\
  UPDATE user_skill u\
  SET deleted_at = now()\
  FROM ranked r\
  WHERE u.id = r.id AND r.rn \> 100 AND u.deleted_at IS NULL;
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

**Multiple primaries**

- The backfill already unsets extras; re-run if needed.

**Portfolio URL normalization**

- If service-side normalization is authoritative, execute a one-off
  script that reads url_raw, runs the normalizer, and writes
  url_normalized; recheck duplicates:

  -----------------------------------------------------------------------
  \-- language: sql\
  \-- After normalizing, remove duplicates keeping newest\
  WITH ranked AS (\
  SELECT id, user_id, url_normalized,\
  ROW_NUMBER() OVER (PARTITION BY user_id, url_normalized ORDER BY
  created_at DESC) AS rn\
  FROM portfolio_item\
  WHERE deleted_at IS NULL\
  )\
  UPDATE portfolio_item p\
  SET deleted_at = now()\
  FROM ranked r\
  WHERE p.id = r.id AND r.rn \> 1 AND p.deleted_at IS NULL;
  -----------------------------------------------------------------------

  -----------------------------------------------------------------------

## **9) Operational Guardrails**

- **Lock minimization:\**

  - Prefer CREATE INDEX CONCURRENTLY in large tables (run outside
    transaction).

  - Add CHECK \... NOT VALID then VALIDATE CONSTRAINT to avoid full
    table scan locks.

- **Traffic strategy:\**

  - Rolling deploy with **readiness** gating (Doc 12).

  - Keep a small **canary** pod first; watch 5xx and p95.

- **Observability:\**

  - Confirm /metrics shows request counters; alert on 5xx \>1% for 10m.

  - Verify audit rows written on a few mutations.

## **10) Acceptance Criteria (Go/No-Go)**

- ✅ All migrations applied without blocking sessions.

- ✅ Backfill completed; constraint validation passes.

- ✅ Smoke tests green for each module endpoint.

- ✅ Progress endpoint reflects changes immediately.

- ✅ Error envelopes match Doc 05.

- ✅ Audit rows present; no sensitive bodies stored.

- ✅ p95 \< 300ms; 5xx \< 1% during canary.

## **11) Notes & Non-Goals**

- No destructive schema changes in this release.

- No external events/search; no file storage.

- Future toggles (e.g., adding Portfolio to progress) will be handled
  via a minor schema-less change.
