-- Payoneer removed entirely as a supported payout method — no longer in
-- use. Zero live PAYONEER deposit methods exist as of this migration
-- (verified against the shared DB before writing this), so the column and
-- enum value are dropped cleanly rather than left as a deprecated stub,
-- following the same pattern as 007_remove_paypal.sql.
--
-- Run with:
--   docker exec -i marketeq-db psql -U postgres -d payout_db < migrations/013_remove_payoneer.sql

ALTER TABLE deposit_methods DROP COLUMN IF EXISTS payoneer_payee_id;

-- Postgres cannot drop a single value from an existing enum type, so the
-- type is recreated without PAYONEER and the column is re-pointed at it.
ALTER TYPE method_type RENAME TO method_type_old;

CREATE TYPE method_type AS ENUM (
  'BANK_STRIPE',
  'BANK_MANUAL',
  'WISE',
  'CRYPTO',
  'MARKETEQ_DEBIT_CARD',
  'TEQ_COIN'
);

-- Deliberately not coerced/defaulted: if any row still holds 'PAYONEER' this
-- cast fails loudly (invalid input value for enum method_type), forcing a
-- real data decision instead of silently reassigning a contractor's payout
-- method.
ALTER TABLE deposit_methods
  ALTER COLUMN method_type TYPE method_type USING method_type::text::method_type;

DROP TYPE method_type_old;
