-- PS-09 v2.0 §7/§9: US ABA routing number retrieved from the Wise/Payoneer
-- provider API after OAuth (fetchBankingDetails()), registered as a Stripe
-- external_account so Stripe can ACH directly to the contractor's Wise or
-- Payoneer account. Not sensitive (public info for the receiving bank), so
-- stored in plaintext — unlike oauth_access_token/oauth_refresh_token.
--
-- Run with:
--   docker exec -i marketeq-db psql -U postgres -d payout_db < migrations/008_deposit_method_routing_number.sql

ALTER TABLE deposit_methods
  ADD COLUMN IF NOT EXISTS routing_number VARCHAR(9) NULL;
