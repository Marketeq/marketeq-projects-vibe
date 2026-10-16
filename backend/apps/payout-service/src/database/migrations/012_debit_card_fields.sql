-- PS-13: Marketeq Debit Card — missing columns + admin-adjustable spending limits
-- card_last4/card_network were already documented as placeholders in
-- 001_initial_schema.sql. The five columns below exist in shared dev/staging
-- (created out-of-band, same pattern as 011's magic_link_verifications) with
-- no migration documenting them — verified column-for-column against the
-- live table before writing this.
-- Apply manually via:
--   psql "$DATABASE_URL" -f apps/payout-service/src/database/migrations/012_debit_card_fields.sql

ALTER TABLE deposit_methods
  ADD COLUMN IF NOT EXISTS card_balance_cap     NUMERIC NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS stripe_cardholder_id  VARCHAR,
  ADD COLUMN IF NOT EXISTS stripe_card_id        VARCHAR,
  ADD COLUMN IF NOT EXISTS card_type             VARCHAR(16),
  ADD COLUMN IF NOT EXISTS card_status           VARCHAR(16) NOT NULL DEFAULT 'inactive';

-- PS-13 §5: weekly/monthly/single-transaction spending limits are
-- "Adjustable by Marketeq admin: Yes" but were only ever set on the Stripe
-- Issuing card at creation time (card-issuance.service.ts's hardcoded
-- DEFAULT_*_LIMIT constants) with nothing to persist an admin override
-- against, and no endpoint to make one. NULL means "use the hardcoded
-- default" — only set once an admin actually overrides a card.
ALTER TABLE deposit_methods
  ADD COLUMN IF NOT EXISTS card_daily_limit_cents   INTEGER,
  ADD COLUMN IF NOT EXISTS card_weekly_limit_cents  INTEGER,
  ADD COLUMN IF NOT EXISTS card_monthly_limit_cents INTEGER,
  ADD COLUMN IF NOT EXISTS card_single_limit_cents  INTEGER;
