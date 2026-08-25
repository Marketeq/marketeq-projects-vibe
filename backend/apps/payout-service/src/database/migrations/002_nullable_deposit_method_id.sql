-- PS-05: Stripe Financial Connections creates a verification row before the
-- deposit_method row exists (session is created before OAuth completes).
-- Make deposit_method_id nullable to support this flow.
ALTER TABLE deposit_method_verification
  ALTER COLUMN deposit_method_id DROP NOT NULL;
