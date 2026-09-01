-- estimateArrival() (payout.service.ts) computed its estimate purely from
-- method_type, ignoring which speed the contractor actually paid for —
-- checkout promises "15 minutes" for instant, but Payout History showed the
-- same multi-day estimate regardless, because nothing persisted the choice
-- to check against later. 'standard' default matches every existing row's
-- real behavior (instant only ever affected the fee calculation, never
-- execution or storage).
ALTER TABLE payout_requests
  ADD COLUMN speed TEXT NOT NULL DEFAULT 'standard'
    CHECK (speed IN ('standard', 'instant'));

COMMENT ON COLUMN payout_requests.speed IS 'Speed the contractor selected at checkout (instant carries INSTANT_FEE) — read by estimateArrival() and, for BANK_STRIPE, by bank-payout-executor to request Stripe''s real Instant Payouts method.';
