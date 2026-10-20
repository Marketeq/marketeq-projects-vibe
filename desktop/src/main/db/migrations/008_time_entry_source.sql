-- 008_time_entry_source.sql — crash recovery (doc 01 §18, DTT-US-132)
-- Where a time entry came from: 'live' (tracked normally), 'manual', or
-- 'recovered' (the slice before an unclean shutdown that the user chose to
-- Recover). Mirrors the data dictionary's time_entry.source (doc 00b) and is
-- sent to the backend so the client can audit recovered time.
ALTER TABLE time_entry ADD COLUMN source TEXT NOT NULL DEFAULT 'live'
  CHECK (source IN ('live','manual','recovered'));
