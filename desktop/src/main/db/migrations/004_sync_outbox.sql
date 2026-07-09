-- src/main/db/migrations/004_sync_outbox.sql
-- Phase 4: Sync Queue + Offline Protocol (doc 16).
--
-- The core `sync_queue` table was created in 001_initial.sql with the
-- columns doc 16 §4 requires (id, created_at, method, path, body_json,
-- status, attempts, last_error, next_attempt_at). Phase 4 layers an
-- outbox service on top of that table and needs two additional bits of
-- metadata for diagnostics + the DiagnosticsScreen (doc 16 §7):
--
--   * `last_attempt_at` — wall-clock time of the most recent dispatch
--     attempt, regardless of outcome. Used by `sync:get-status` to
--     compute "lastSyncAt" and surfaced to the user in the diagnostics
--     UI.
--   * `completed_at` — wall-clock time a row moved to `completed`, used
--     by the 24-hour retention sweep (doc 16 §8).
--
-- Both columns are nullable and purely additive: no existing code depends
-- on them and all inserts continue to work unchanged.

ALTER TABLE sync_queue ADD COLUMN last_attempt_at INTEGER;
ALTER TABLE sync_queue ADD COLUMN completed_at INTEGER;

-- Helpful composite index for the retention sweep.
CREATE INDEX IF NOT EXISTS idx_sync_queue_completed_at
  ON sync_queue(status, completed_at);
