-- src/main/db/migrations/002_timer_metadata.sql
-- Phase 2: adds forensic audit log for every timer state transition.
-- Authoritative source: doc 20 §7 (Idle, Break & Timer State Machine Spec).

CREATE TABLE IF NOT EXISTS timer_event_log (
  id TEXT PRIMARY KEY,
  at INTEGER NOT NULL,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  event TEXT NOT NULL,
  payload_json TEXT,
  session_id TEXT,
  reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_timer_event_log_at ON timer_event_log(at DESC);
CREATE INDEX IF NOT EXISTS idx_timer_event_log_session ON timer_event_log(session_id);
