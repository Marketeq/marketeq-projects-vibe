-- PS-15 §6: PayoutStatus.AWAITING_EDD ('awaiting_edd') exists in
-- payout-request.entity.ts and is written by PayoutService.initiate() for
-- withdrawals that need an Enhanced Due Diligence review, but no migration
-- ever added it to the payout_status enum created in 001_initial_schema.sql.
-- Every query that names the value fails with
--   invalid input value for enum payout_status: "awaiting_edd"
-- including GET /v1/payouts/summary (its in-flight lookup filters on every
-- non-terminal status, awaiting_edd among them), so the summary 500s for
-- every contractor, not only those under EDD review.
--
-- IF NOT EXISTS keeps this safe on databases where the value was already
-- added by hand. ADD VALUE cannot run inside a transaction block on older
-- Postgres versions, so run it on its own, not wrapped in BEGIN/COMMIT.
--
-- Run with:
--   docker exec -i marketeq-db psql -U postgres -d payout_db < migrations/014_payout_status_awaiting_edd.sql

ALTER TYPE payout_status ADD VALUE IF NOT EXISTS 'awaiting_edd' AFTER 'pending_verification';
