-- PS-05/PS-20 revision: bank payouts move from "Financial Connections
-- verification only, no actual money movement" to "Financial Connections
-- verification + Stripe Connect custom account for actual payout execution".
-- Contractors are payout recipients, not merchants — a Connect custom
-- account with the `transfers` capability, no Stripe-hosted dashboard.
--
-- stripe_bank_account_id (001_initial_schema.sql) was declared but never
-- written by any code path — it now holds the `ba_...` external_account id
-- once the Financial-Connections-verified bank is attached to the
-- contractor's Connect account (see stripeExternalAccountId on the entity).
ALTER TABLE deposit_methods
  ADD COLUMN stripe_connect_account_id TEXT NULL,
  ADD COLUMN connect_payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN connect_requirements_due JSONB NULL;

CREATE INDEX dm_stripe_connect_account_idx ON deposit_methods (stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;

COMMENT ON COLUMN deposit_methods.stripe_bank_account_id IS 'Stripe external_account (ba_...) id attached to stripe_connect_account_id — the Connect payout destination';
