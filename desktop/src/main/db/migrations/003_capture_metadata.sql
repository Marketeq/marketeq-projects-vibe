-- src/main/db/migrations/003_capture_metadata.sql
-- Phase 3: capture pipeline metadata.
--   * Extends `screenshot` with blur_path, display_id, sha256_checksum columns
--     needed by the ScreenshotService (doc 17 + doc 23 privacy blur).
--   * Adds a `permission_grant` table tracking the last-known status of each
--     OS permission the Marketeq Time Tracker requires (doc 18 §2.1).
--
-- Idempotency note: SQLite has no `ALTER TABLE ADD COLUMN IF NOT EXISTS`, so
-- guards are implemented as a no-op PRAGMA check via a helper `schema_probe`.
-- The migrate runner only executes this file once (schema_migrations table),
-- so these ALTERs are safe to write unguarded.

ALTER TABLE screenshot ADD COLUMN blur_path TEXT;
ALTER TABLE screenshot ADD COLUMN display_id TEXT;
ALTER TABLE screenshot ADD COLUMN sha256 TEXT;

CREATE TABLE IF NOT EXISTS permission_grant (
  key TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('granted','denied','not_determined','restricted','not_applicable')),
  platform TEXT NOT NULL CHECK (platform IN ('mac','win','linux','other')),
  last_checked_at INTEGER NOT NULL,
  last_requested_at INTEGER,
  last_changed_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_permission_grant_checked ON permission_grant(last_checked_at);
