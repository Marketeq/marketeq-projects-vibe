-- PS-35: Didit Biometric Verification Gate — Deposit Schedule & Payout Method
-- Adds the two new verification_status values this document introduces.
-- Apply manually via:
--   psql "$DATABASE_URL" -f apps/payout-service/src/database/migrations/010_biometric_verification_gate.sql

-- 001_initial_schema.sql names the shared enum type `verification_status`
-- (used by both deposit_methods.verification_status and
-- deposit_method_verifications.status).
ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'pending_biometric';
ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'verification_failed';
