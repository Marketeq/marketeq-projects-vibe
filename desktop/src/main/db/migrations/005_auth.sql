-- 005_auth.sql
-- Phase 5: Auth + Session Management
--
-- Local client-side rate limiting / lockout ledger. Tracks per-email failed
-- sign-in attempts so the desktop app can enforce its own soft-lockout in
-- addition to the server's hard-lockout (doc 13 §15 — 5 req / 300 s on
-- /auth/login → HTTP 429 / 423).
--
-- We deliberately do NOT persist tokens in this table: refresh tokens live in
-- the OS keychain (doc 15 §1). Access tokens are memory-only.

CREATE TABLE IF NOT EXISTS auth_attempts (
  email TEXT PRIMARY KEY,
  failure_count INTEGER NOT NULL DEFAULT 0,
  first_failure_at INTEGER,
  last_failure_at INTEGER,
  locked_until INTEGER
);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_locked_until
  ON auth_attempts(locked_until);
