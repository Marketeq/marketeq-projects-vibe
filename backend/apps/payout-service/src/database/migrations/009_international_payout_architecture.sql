-- PS-34: International Payout Architecture — Direct Local Bank & Wise Platform
-- Adds Wise Platform recipient/transfer tracking and the
-- PENDING_ADDITIONAL_KYC verification status used by the Stripe cross-border
-- KYC escalation flow (§4.3). Apply manually via:
--   psql "$DATABASE_URL" -f apps/payout-service/src/database/migrations/009_international_payout_architecture.sql

ALTER TABLE deposit_methods
  ADD COLUMN IF NOT EXISTS wise_platform_recipient_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS wise_platform_transfer_id VARCHAR(64);

COMMENT ON COLUMN deposit_methods.wise_platform_recipient_id IS
  'Wise Platform recipient ID (id from POST /v1/accounts). Null for non-Wise-Platform methods.';
COMMENT ON COLUMN deposit_methods.wise_platform_transfer_id IS
  'Most recent Wise Platform transfer ID initiated for this method — diagnostic only, the authoritative per-payout value lives on payout_requests.wise_platform_transfer_id.';

ALTER TABLE payout_requests
  ADD COLUMN IF NOT EXISTS wise_platform_transfer_id VARCHAR(64);

COMMENT ON COLUMN payout_requests.wise_platform_transfer_id IS
  'Wise Platform transfer ID for payouts routed through WisePlatformService (India, Japan, GCC, and other non-Stripe-cross-border countries). Null for all other execution paths.';

-- PENDING_ADDITIONAL_KYC: Stripe's risk engine can escalate a connected
-- account past DOB collection to government ID + selfie (proof_of_liveness).
-- The account.updated webhook handler moves a method here instead of
-- VERIFIED when that happens — see providers/stripe.provider.ts
-- handleAccountUpdated().
-- 001_initial_schema.sql names the shared enum type `verification_status`
-- (used by both deposit_methods.verification_status and
-- deposit_method_verifications.status) — not a table-prefixed name.
ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'pending_additional_kyc';
