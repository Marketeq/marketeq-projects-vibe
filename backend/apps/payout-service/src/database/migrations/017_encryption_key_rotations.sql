-- AC-1.3.3: record which encryption key is in force for each ring, and since
-- when.
--
-- Ciphertext written from now on carries the id of the key that encrypted it
-- (crypto/field-encryption.ts), so several keys can be live at once and a
-- rotation no longer destroys existing data. This table is the other half:
-- when each key took over and what it replaced.
--
-- Rows are inserted automatically at startup by KeyRotationRecorderService
-- the first time a service boots with a new current key. Append only — nothing
-- updates or deletes a row, so the history stays trustworthy.
--
-- Additive and safe to run against a live database: new table only, no change
-- to any existing table, no backfill, no lock on anything in use.
--
-- Run with:
--   docker exec -i marketeq-db psql -U postgres -d payout_db < migrations/014_encryption_key_rotations.sql

CREATE TABLE IF NOT EXISTS encryption_key_rotations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- BANK, OAUTH_TOKEN, CRYPTO_ADDRESS
  ring              VARCHAR(64) NOT NULL,

  -- The key id as it appears inside stored ciphertext: v2:<key_id>:iv:tag:ct
  key_id            VARCHAR(16) NOT NULL,

  -- Null only for the first key recorded for a ring.
  previous_key_id   VARCHAR(16),

  -- Every key still decryptable at the moment of the change, comma separated.
  -- Shows whether old data was still readable when the key moved.
  known_key_ids     TEXT NOT NULL,

  detected_by       VARCHAR(32) NOT NULL DEFAULT 'startup-detected',
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A key becomes current once per ring. The recorder relies on this to stay
-- idempotent: every service instance boots and tries to insert, and all but
-- the first are rejected harmlessly.
CREATE UNIQUE INDEX IF NOT EXISTS ekr_ring_key_uq
  ON encryption_key_rotations (ring, key_id);

-- "What was in force for this ring, most recent first."
CREATE INDEX IF NOT EXISTS ekr_ring_recorded_idx
  ON encryption_key_rotations (ring, recorded_at DESC);
