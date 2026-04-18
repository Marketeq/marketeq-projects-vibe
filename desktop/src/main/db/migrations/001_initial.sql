-- src/main/db/migrations/001_initial.sql
-- Initial schema for Marketeq Time Tracker local DB.
-- Authoritative source: doc 11 §6.4 (Local Data Model & SQLite Schema).
-- Field names and enums match doc 00b (Data Dictionary).

CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  timezone TEXT NOT NULL,
  currency TEXT NOT NULL,
  pending_erasure INTEGER NOT NULL DEFAULT 0 CHECK (pending_erasure IN (0,1)),
  mirrored_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS device_self (
  id TEXT PRIMARY KEY,
  installation_uuid TEXT NOT NULL,
  os_name TEXT NOT NULL CHECK (os_name IN ('mac','win')),
  os_version TEXT NOT NULL,
  app_version TEXT NOT NULL,
  arch TEXT NOT NULL CHECK (arch IN ('arm64','x64')),
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS contract (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active','paused','ended')),
  currency TEXT NOT NULL,
  rate_minor INTEGER NOT NULL,
  daily_cap_seconds INTEGER,
  weekly_cap_seconds INTEGER,
  paid_break_allowance_seconds INTEGER NOT NULL DEFAULT 0,
  screenshot_interval_seconds INTEGER NOT NULL,
  mirrored_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_contract_status ON contract(status);

CREATE TABLE IF NOT EXISTS task (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES contract(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0,1)),
  mirrored_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_task_contract_id ON task(contract_id);

CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user(id),
  contract_id TEXT NOT NULL REFERENCES contract(id),
  task_id TEXT NOT NULL REFERENCES task(id),
  device_id TEXT NOT NULL REFERENCES device_self(id),
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  end_reason TEXT CHECK (end_reason IN ('user_stop','offline_stop','idle_discard','forced_signout','take_over','disputed','crash_recover')),
  billable_seconds INTEGER NOT NULL DEFAULT 0,
  paid_break_seconds INTEGER NOT NULL DEFAULT 0,
  unpaid_break_seconds INTEGER NOT NULL DEFAULT 0,
  idle_seconds INTEGER NOT NULL DEFAULT 0,
  disputed INTEGER NOT NULL DEFAULT 0 CHECK (disputed IN (0,1)),
  synced_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_active ON session(ended_at) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_session_user_started ON session(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_contract ON session(contract_id, started_at DESC);

CREATE TABLE IF NOT EXISTS time_entry (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  synced_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_time_entry_session ON time_entry(session_id, started_at);

CREATE TABLE IF NOT EXISTS break_event (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('paid','unpaid')),
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  synced_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_break_session ON break_event(session_id, started_at);

CREATE TABLE IF NOT EXISTS idle_event (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  started_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL,
  seconds INTEGER NOT NULL,
  resolution TEXT CHECK (resolution IN ('keep','discard','convert_to_break')),
  synced_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_idle_session ON idle_event(session_id, started_at);

CREATE TABLE IF NOT EXISTS screenshot (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  taken_at INTEGER NOT NULL,
  local_path TEXT,
  r2_key TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending','uploaded','confirmed','discarded','failed')),
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  bytes INTEGER NOT NULL,
  sensitive INTEGER NOT NULL DEFAULT 0 CHECK (sensitive IN (0,1)),
  synced_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_screenshot_session ON screenshot(session_id, taken_at);
CREATE INDEX IF NOT EXISTS idx_screenshot_status ON screenshot(status);

CREATE TABLE IF NOT EXISTS activity_minute (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  minute_start_at INTEGER NOT NULL,
  active INTEGER NOT NULL CHECK (active IN (0,1)),
  synced_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_session_min ON activity_minute(session_id, minute_start_at);

CREATE TABLE IF NOT EXISTS dispute (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES session(id),
  reason TEXT NOT NULL CHECK (reason IN ('inaccurate_time','wrong_task','tech_issue','other')),
  note TEXT,
  created_at INTEGER NOT NULL,
  synced_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_dispute_session ON dispute(session_id);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('POST','PUT','PATCH','DELETE')),
  path TEXT NOT NULL,
  body_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','inflight','completed','dead_letter')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_attempt_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_sync_status_next ON sync_queue(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_sync_created ON sync_queue(created_at);

CREATE TABLE IF NOT EXISTS preference (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS service_health (
  service TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('up','degraded','down','unknown')),
  checked_at INTEGER NOT NULL,
  latency_ms INTEGER
);

CREATE TABLE IF NOT EXISTS install_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Auth session (local refresh/access token metadata — tokens live in OS keychain)
CREATE TABLE IF NOT EXISTS auth_session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  access_token_expires_at INTEGER NOT NULL,
  refresh_token_ref TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
