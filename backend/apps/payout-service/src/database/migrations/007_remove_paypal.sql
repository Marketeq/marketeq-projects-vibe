-- PS-32 §3: PayPal removed entirely as a supported payout method.
-- No live PayPal deposit methods exist as of this migration (pre-launch,
-- zero live contractor payouts processed) — see PS-32 §3.3's "No migration
-- required for MVP" note. Columns and enum value are dropped cleanly rather
-- than left as a deprecated stub.
--
-- Run with:
--   docker exec -i marketeq-db psql -U postgres -d payout_db < migrations/007_remove_paypal.sql

ALTER TABLE deposit_methods DROP COLUMN IF EXISTS paypal_email;
ALTER TABLE deposit_methods DROP COLUMN IF EXISTS paypal_account_id;

-- Postgres cannot drop a single value from an existing enum type, so the
-- type is recreated without PAYPAL and the column is re-pointed at it.
ALTER TYPE method_type RENAME TO method_type_old;

CREATE TYPE method_type AS ENUM (
  'BANK_STRIPE',
  'BANK_MANUAL',
  'WISE',
  'PAYONEER',
  'CRYPTO',
  'MARKETEQ_DEBIT_CARD',
  'TEQ_COIN'
);

-- Deliberately not coerced/defaulted: if any row still holds 'PAYPAL' this
-- cast fails loudly (invalid input value for enum method_type), forcing a
-- real data decision instead of silently reassigning a contractor's payout
-- method. Per PS-32, no such rows are expected pre-launch.
ALTER TABLE deposit_methods
  ALTER COLUMN method_type TYPE method_type USING method_type::text::method_type;

DROP TYPE method_type_old;
