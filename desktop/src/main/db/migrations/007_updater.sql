-- 007_updater.sql — Phase 7: auto-update preferences
CREATE TABLE IF NOT EXISTS updater_prefs (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  channel       TEXT    NOT NULL DEFAULT 'stable'  CHECK (channel IN ('stable','beta','alpha')),
  auto_download INTEGER NOT NULL DEFAULT 1,
  last_check_at INTEGER,
  last_version  TEXT,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

INSERT OR IGNORE INTO updater_prefs (id) VALUES (1);
