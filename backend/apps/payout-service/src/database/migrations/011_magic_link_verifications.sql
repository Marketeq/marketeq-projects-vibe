-- PS-14 §9: magic_link_verifications table
-- Backs MagicLinkVerification entity (src/entities/magic-link-verification.entity.ts).
-- Stores SHA-256 hash of the magic-link token ONLY — raw token is never persisted.
-- This table already exists in shared dev/staging (created out-of-band); this
-- migration documents it so `synchronize: false` environments (CLAUDE.md — every
-- entity requires a migration) can reproduce it from scratch.
-- Apply manually via:
--   psql "$DATABASE_URL" -f apps/payout-service/src/database/migrations/011_magic_link_verifications.sql

CREATE TABLE IF NOT EXISTS magic_link_verifications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_request_id  VARCHAR NOT NULL,
  contractor_id      VARCHAR NOT NULL,
  token_hash         VARCHAR(64) NOT NULL,
  expires_at         TIMESTAMPTZ NOT NULL,
  used               BOOLEAN NOT NULL DEFAULT false,
  used_at            TIMESTAMPTZ,
  superseded         BOOLEAN NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_magic_link_verifications_token_hash
  ON magic_link_verifications (token_hash);

CREATE INDEX IF NOT EXISTS idx_magic_link_verifications_payout_request
  ON magic_link_verifications (payout_request_id);

CREATE INDEX IF NOT EXISTS idx_magic_link_verifications_contractor
  ON magic_link_verifications (contractor_id);
