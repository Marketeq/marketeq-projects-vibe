-- ============================================================
-- PAYOUT-SERVICE — INITIAL DATABASE MIGRATION
-- Document: PS-01 — Database Schema & Entities v1.0
-- Database: payout_db
--
-- Run with:
--   docker exec -i marketeq-db psql -U postgres -d payout_db < migrations/001_initial_schema.sql
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- PS-01 §1: ENUMS (6 total)
-- ────────────────────────────────────────────────────────────

-- §1.1 method_type
CREATE TYPE method_type AS ENUM (
  'BANK_STRIPE',         -- US bank via Stripe Financial Connections
  'BANK_MANUAL',         -- Global bank via manual IBAN/routing entry
  'PAYPAL',              -- PayPal Payouts API
  'WISE',                -- Wise Transfers API
  'PAYONEER',            -- Payoneer API
  'CRYPTO',              -- Crypto wallet (9 providers — see crypto_provider enum)
  'MARKETEQ_DEBIT_CARD', -- Feature-flagged OFF for MVP
  'TEQ_COIN'             -- Feature-flagged OFF for MVP
);

-- §1.2 payout_status
CREATE TYPE payout_status AS ENUM (
  'pending_verification', -- Magic link sent, awaiting contractor confirmation
  'queued',               -- Verified, waiting for provider API call
  'processing',           -- Provider API call in flight
  'completed',            -- Provider confirmed successful transfer
  'failed',               -- Provider rejected or all retries exhausted
  'cancelled'             -- Contractor cancelled before processing
);

-- §1.3 schedule_frequency
CREATE TYPE schedule_frequency AS ENUM (
  'daily',
  'weekly',
  'bi_weekly',
  'monthly',
  'custom'     -- Contractor-defined interval in days
);

-- §1.4 verification_status
CREATE TYPE verification_status AS ENUM (
  'pending',    -- Verification initiated, not yet complete
  'verified',   -- Method is verified and available for payouts
  'failed',     -- Verification failed (wrong micro-deposit amounts etc.)
  'expired',    -- Micro-deposit window expired (10 days)
  'locked'      -- Too many failed attempts (3-attempt limit, 24h lock)
);

-- §1.5 payout_trigger
CREATE TYPE payout_trigger AS ENUM (
  'manual',     -- Contractor initiated withdrawal from UI
  'scheduled'   -- Triggered by payout schedule engine
);

-- §1.6 crypto_provider
CREATE TYPE crypto_provider AS ENUM (
  'COINBASE', 'BINANCE', 'KRAKEN', 'BITFINEX',
  'OKX', 'BYBIT', 'GEMINI', 'KUCOIN', 'GATE_IO'
);


-- ────────────────────────────────────────────────────────────
-- PS-01 §2.2: deposit_methods
-- (Created first because payout_requests and magic_link_tokens reference it)
-- ────────────────────────────────────────────────────────────

CREATE TABLE deposit_methods (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id         UUID        NOT NULL,
  method_type           method_type NOT NULL,
  is_default            BOOLEAN     NOT NULL DEFAULT false,
  is_active             BOOLEAN     NOT NULL DEFAULT true,

  -- Display
  nickname              VARCHAR(64),
  display_label         TEXT,         -- e.g. 'Chase ••••4242', 'PayPal (jane@example.com)'

  -- Bank fields (BANK_STRIPE and BANK_MANUAL)
  bank_account_name     TEXT,
  bank_account_last4    VARCHAR(4),
  bank_routing_number   VARCHAR(9),   -- US routing number (BANK_STRIPE only — stored encrypted)
  bank_iban_last4       VARCHAR(4),
  bank_country          VARCHAR(2),   -- ISO 3166-1 alpha-2
  bank_currency         VARCHAR(3),   -- ISO 4217 — payout currency for this bank
  stripe_account_id     TEXT,         -- Stripe Financial Connections account ID (BANK_STRIPE)
  stripe_bank_account_id TEXT,        -- Stripe bank account object ID

  -- PayPal fields
  paypal_email          TEXT,
  paypal_account_id     TEXT,         -- PayPal account ID from OAuth

  -- Wise fields
  wise_account_id       TEXT,
  wise_profile_id       TEXT,
  wise_recipient_id     TEXT,

  -- Payoneer fields
  payoneer_payee_id     TEXT,

  -- Crypto fields
  crypto_provider       crypto_provider,
  crypto_network        TEXT,         -- e.g. 'ethereum', 'bitcoin', 'solana'
  crypto_currency       VARCHAR(10),  -- e.g. 'ETH', 'BTC', 'USDC'
  crypto_address        TEXT,         -- wallet address — stored encrypted

  -- Debit card fields (placeholder)
  card_last4            VARCHAR(4),
  card_network          TEXT,

  -- Metadata
  verification_status   verification_status NOT NULL DEFAULT 'pending',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated_at        TIMESTAMPTZ,

  -- PS-01 §5: Only one active default method per contractor at any time
  CONSTRAINT deposit_methods_one_default
    EXCLUDE USING btree (contractor_id WITH =) WHERE (is_default = true AND is_active = true)
);

-- PS-01 §4: Indexes
CREATE INDEX dm_contractor_id_idx  ON deposit_methods (contractor_id) WHERE is_active = true;
CREATE INDEX dm_method_type_idx    ON deposit_methods (contractor_id, method_type);
CREATE INDEX dm_stripe_account_idx ON deposit_methods (stripe_account_id) WHERE stripe_account_id IS NOT NULL;

-- Auto-update updated_at on every UPDATE
CREATE OR REPLACE FUNCTION deposit_methods_set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER deposit_methods_updated_at
  BEFORE UPDATE ON deposit_methods
  FOR EACH ROW EXECUTE FUNCTION deposit_methods_set_updated_at();


-- ────────────────────────────────────────────────────────────
-- PS-01 §2.5: magic_link_tokens
-- (Created before payout_requests which references it)
-- ────────────────────────────────────────────────────────────

CREATE TABLE magic_link_tokens (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id     UUID        NOT NULL,
  token_hash        TEXT        NOT NULL UNIQUE, -- SHA-256 of the raw token
  payout_amount_usd NUMERIC(18,8) NOT NULL,
  deposit_method_id UUID        NOT NULL REFERENCES deposit_methods(id),
  is_used           BOOLEAN     NOT NULL DEFAULT false,
  expires_at        TIMESTAMPTZ NOT NULL,
  used_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PS-01 §4: Indexes
CREATE INDEX mlt_token_hash_idx      ON magic_link_tokens (token_hash) WHERE is_used = false;
CREATE INDEX mlt_contractor_idx      ON magic_link_tokens (contractor_id, expires_at DESC);
CREATE INDEX mlt_expires_cleanup_idx ON magic_link_tokens (expires_at) WHERE is_used = false;


-- ────────────────────────────────────────────────────────────
-- PS-01 §2.1: payout_requests
-- ────────────────────────────────────────────────────────────

CREATE TABLE payout_requests (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id       UUID          NOT NULL,
  deposit_method_id   UUID          NOT NULL REFERENCES deposit_methods(id),
  idempotency_key     UUID          NOT NULL,
  trigger             payout_trigger NOT NULL DEFAULT 'manual',
  status              payout_status  NOT NULL DEFAULT 'pending_verification',

  -- Amounts (all in USD unless currency field says otherwise)
  amount_usd          NUMERIC(18,8) NOT NULL,           -- gross amount requested
  fee_usd             NUMERIC(18,8) NOT NULL DEFAULT 0, -- instant withdrawal fee if applicable
  net_amount_usd      NUMERIC(18,8) NOT NULL,           -- amount_usd - fee_usd
  currency            VARCHAR(3)    NOT NULL DEFAULT 'USD',

  -- Provider response
  provider_reference  TEXT,         -- provider transaction ID / batch ID
  provider_status     TEXT,         -- raw status string from provider
  provider_response   JSONB,        -- full provider response for debugging
  failure_reason      TEXT,         -- human-readable failure reason
  retry_count         SMALLINT      NOT NULL DEFAULT 0,

  -- Magic link
  magic_link_token_id UUID          REFERENCES magic_link_tokens(id),
  verified_at         TIMESTAMPTZ,

  -- Timing
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  queued_at           TIMESTAMPTZ,
  processing_at       TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  failed_at           TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  scheduled_for       TIMESTAMPTZ,  -- for scheduled payouts: intended execution time

  -- Split payout reference
  split_group_id      UUID,         -- shared UUID for all legs of a split payout
  split_sequence      SMALLINT,     -- 1 = primary, 2 = secondary

  -- PS-01 §5: Constraints
  CONSTRAINT payout_requests_idempotency_unique UNIQUE (idempotency_key),
  CONSTRAINT payout_requests_net_positive       CHECK (net_amount_usd > 0),
  CONSTRAINT payout_requests_fee_non_negative   CHECK (fee_usd >= 0),
  CONSTRAINT payout_requests_split_sequence     CHECK (split_sequence IN (1, 2))
);

-- PS-01 §4: Indexes
CREATE INDEX pr_contractor_id_idx  ON payout_requests (contractor_id, created_at DESC);
CREATE INDEX pr_status_idx         ON payout_requests (status) WHERE status IN ('pending_verification','queued','processing');
CREATE INDEX pr_scheduled_for_idx  ON payout_requests (scheduled_for) WHERE status = 'queued';
CREATE INDEX pr_split_group_id_idx ON payout_requests (split_group_id) WHERE split_group_id IS NOT NULL;
CREATE INDEX pr_deposit_method_idx ON payout_requests (deposit_method_id);


-- ────────────────────────────────────────────────────────────
-- PS-01 §2.3: payout_schedules
-- ────────────────────────────────────────────────────────────

CREATE TABLE payout_schedules (
  id                    UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id         UUID              NOT NULL UNIQUE, -- one schedule per contractor
  is_active             BOOLEAN           NOT NULL DEFAULT true,
  frequency             schedule_frequency NOT NULL DEFAULT 'weekly',

  -- Weekly: day of week (0=Sunday … 6=Saturday)
  day_of_week           SMALLINT          CHECK (day_of_week BETWEEN 0 AND 6),
  -- Monthly / bi-weekly: day of month (1–28)
  day_of_month          SMALLINT          CHECK (day_of_month BETWEEN 1 AND 28),
  -- Custom: interval in days (1–365)
  custom_interval_days  SMALLINT          CHECK (custom_interval_days BETWEEN 1 AND 365),

  -- Threshold: only pay out when balance >= this amount (scheduled only)
  threshold_usd         NUMERIC(18,8)     NOT NULL DEFAULT 50,

  -- Reserve: keep this much in balance, do not pay out below this floor
  reserve_usd           NUMERIC(18,8)     NOT NULL DEFAULT 0
                        CHECK (reserve_usd BETWEEN 0 AND 250),

  -- Split: primary + optional secondary deposit method
  primary_method_id     UUID              REFERENCES deposit_methods(id),
  secondary_method_id   UUID              REFERENCES deposit_methods(id),
  -- Percentage split (must sum to 100 when both methods present)
  primary_pct           NUMERIC(5,2)      CHECK (primary_pct BETWEEN 0 AND 100),
  secondary_pct         NUMERIC(5,2)      CHECK (secondary_pct BETWEEN 0 AND 100),

  next_run_at           TIMESTAMPTZ,
  last_run_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

  -- PS-01 §5: Constraints
  CONSTRAINT schedule_split_pct_sum
    CHECK (primary_pct IS NULL OR secondary_pct IS NULL OR
           (primary_pct + secondary_pct = 100)),
  CONSTRAINT schedule_threshold_minimum
    CHECK (threshold_usd >= 50)
);

-- PS-01 §4: Indexes
CREATE INDEX ps_next_run_idx   ON payout_schedules (next_run_at) WHERE is_active = true;
CREATE INDEX ps_contractor_idx ON payout_schedules (contractor_id);


-- ────────────────────────────────────────────────────────────
-- PS-01 §2.4: deposit_method_verification
-- ────────────────────────────────────────────────────────────

CREATE TABLE deposit_method_verification (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_method_id       UUID        NOT NULL REFERENCES deposit_methods(id) ON DELETE CASCADE,
  contractor_id           UUID        NOT NULL,
  verification_type       TEXT        NOT NULL, -- 'micro_deposit' | 'stripe_fc' | 'oauth' | 'crypto_confirm'

  -- Micro-deposit fields
  amount_1_cents          SMALLINT,   -- stored as cents (1–99)
  amount_2_cents          SMALLINT,   -- stored as cents (1–99)
  attempt_count           SMALLINT    NOT NULL DEFAULT 0,
  max_attempts            SMALLINT    NOT NULL DEFAULT 3,
  locked_until            TIMESTAMPTZ,
  expires_at              TIMESTAMPTZ,  -- 10 days from initiation

  -- OAuth / Stripe FC fields
  oauth_state             TEXT,       -- PKCE state param — cleared after use
  oauth_code              TEXT,       -- cleared after exchange

  -- Crypto confirmation
  confirmation_code       TEXT,       -- 6-digit code sent to contractor email
  confirmation_expires_at TIMESTAMPTZ,

  status                  verification_status NOT NULL DEFAULT 'pending',
  verified_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PS-01 §4: Indexes
CREATE INDEX dmv_deposit_method_idx ON deposit_method_verification (deposit_method_id);
CREATE INDEX dmv_contractor_idx     ON deposit_method_verification (contractor_id);
CREATE INDEX dmv_expires_idx        ON deposit_method_verification (expires_at)
  WHERE status = 'pending';


-- ────────────────────────────────────────────────────────────
-- PS-01 §2.6: payout_audit_log
-- ────────────────────────────────────────────────────────────

CREATE TABLE payout_audit_log (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  contractor_id       UUID        NOT NULL,
  payout_request_id   UUID        REFERENCES payout_requests(id),
  actor_type          TEXT        NOT NULL, -- 'contractor' | 'service' | 'admin'
  actor_id            TEXT        NOT NULL,
  action              TEXT        NOT NULL, -- see PS-01 §2.6.1 for valid action values
  previous_status     payout_status,
  new_status          payout_status,
  metadata            JSONB,
  request_id          UUID
);

-- PS-01 §4: Indexes
CREATE INDEX pal_contractor_idx     ON payout_audit_log (contractor_id, created_at DESC);
CREATE INDEX pal_payout_request_idx ON payout_audit_log (payout_request_id);
CREATE INDEX pal_created_at_idx     ON payout_audit_log (created_at DESC);