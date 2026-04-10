-- 006_onboarding.sql
-- Phase 6 — Persists onboarding flow completion and notification preferences.
-- Per-user row. `steps_completed` is a JSON blob of step keys to timestamps.
--
-- Schema intentionally simple: the desktop app is single-user at a time,
-- but we key by user_id so switching accounts on the same machine works.

CREATE TABLE IF NOT EXISTS onboarding_state (
  user_id TEXT PRIMARY KEY,
  version INTEGER NOT NULL DEFAULT 1,
  completed_at INTEGER,
  steps_completed TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_prefs (
  user_id TEXT PRIMARY KEY,
  work_reminders INTEGER NOT NULL DEFAULT 1,
  break_reminders INTEGER NOT NULL DEFAULT 1,
  idle_alerts INTEGER NOT NULL DEFAULT 1,
  sync_errors INTEGER NOT NULL DEFAULT 1,
  permission_changes INTEGER NOT NULL DEFAULT 1,
  auth_alerts INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);
