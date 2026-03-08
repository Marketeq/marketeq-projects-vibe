**[MARKETEQ PLATFORM --- BACKEND DOCUMENTATION]{.smallcaps}**

**payout-service**

PS-01 --- Database Schema & Entities

  -----------------------------------------------------------------------
  **Property**        **Value**
  ------------------- ---------------------------------------------------
  **Document**        PS-01 --- Database Schema & Entities

  **Version**         1.0

  **Tables**          5 --- payout_requests, deposit_methods,
                      payout_schedules, deposit_method_verification,
                      payout_audit_log

  **Enums**           6 --- method_type, payout_status,
                      schedule_frequency, verification_status,
                      payout_trigger, crypto_provider

  **Monetary          NUMERIC(18,8) for all amounts
  precision**         

  **Timestamps**      TIMESTAMPTZ for all time fields

  **Prerequisites**   PS-00
  -----------------------------------------------------------------------

+-----------------------------------------------------------------------+
| **Naming convention**                                                 |
|                                                                       |
| Tables use deposit_methods (not payout_methods) to match the design   |
| file terminology.                                                     |
|                                                                       |
| The term \"deposit method\" in the UI = the contractor\'s chosen      |
| destination account.                                                  |
|                                                                       |
| \"payout\" refers to the act of sending funds. \"deposit method\"     |
| refers to the destination.                                            |
|                                                                       |
| This distinction is enforced throughout PS-01 and all downstream PS   |
| documents.                                                            |
+=======================================================================+

# **1. Enums**

## **1.1 method_type**

+-----------------------------------------------------------------------+
| sql                                                                   |
+-----------------------------------------------------------------------+
| CREATE TYPE method_type AS ENUM (                                     |
|                                                                       |
| \'BANK_STRIPE\', \-- US bank via Stripe Financial Connections         |
|                                                                       |
| \'BANK_MANUAL\', \-- Global bank via manual IBAN/routing entry        |
|                                                                       |
| \'PAYPAL\', \-- PayPal Payouts API                                    |
|                                                                       |
| \'WISE\', \-- Wise Transfers API                                      |
|                                                                       |
| \'PAYONEER\', \-- Payoneer API                                        |
|                                                                       |
| \'CRYPTO\', \-- Crypto wallet (9 providers --- see crypto_provider    |
| enum)                                                                 |
|                                                                       |
| \'MARKETEQ_DEBIT_CARD\',\-- Feature-flagged OFF for MVP               |
|                                                                       |
| \'TEQ_COIN\' \-- Feature-flagged OFF for MVP                          |
|                                                                       |
| );                                                                    |
+=======================================================================+

## **1.2 payout_status**

+-----------------------------------------------------------------------+
| sql                                                                   |
+-----------------------------------------------------------------------+
| CREATE TYPE payout_status AS ENUM (                                   |
|                                                                       |
| \'pending_verification\', \-- Magic link sent, awaiting contractor    |
| confirmation                                                          |
|                                                                       |
| \'queued\', \-- Verified, waiting for provider API call               |
|                                                                       |
| \'processing\', \-- Provider API call in flight                       |
|                                                                       |
| \'completed\', \-- Provider confirmed successful transfer             |
|                                                                       |
| \'failed\', \-- Provider rejected or all retries exhausted            |
|                                                                       |
| \'cancelled\' \-- Contractor cancelled before processing              |
|                                                                       |
| );                                                                    |
+=======================================================================+

## **1.3 schedule_frequency**

+-----------------------------------------------------------------------+
| sql                                                                   |
+-----------------------------------------------------------------------+
| CREATE TYPE schedule_frequency AS ENUM (                              |
|                                                                       |
| \'daily\',                                                            |
|                                                                       |
| \'weekly\',                                                           |
|                                                                       |
| \'bi_weekly\',                                                        |
|                                                                       |
| \'monthly\',                                                          |
|                                                                       |
| \'custom\' \-- Contractor-defined interval in days                    |
|                                                                       |
| );                                                                    |
+=======================================================================+

## **1.4 verification_status**

+-----------------------------------------------------------------------+
| sql                                                                   |
+-----------------------------------------------------------------------+
| CREATE TYPE verification_status AS ENUM (                             |
|                                                                       |
| \'pending\', \-- Verification initiated, not yet complete             |
|                                                                       |
| \'verified\', \-- Method is verified and available for payouts        |
|                                                                       |
| \'failed\', \-- Verification failed (wrong micro-deposit amounts      |
| etc.)                                                                 |
|                                                                       |
| \'expired\', \-- Micro-deposit window expired (10 days)               |
|                                                                       |
| \'locked\' \-- Too many failed attempts (3-attempt limit, 24h lock)   |
|                                                                       |
| );                                                                    |
+=======================================================================+

## **1.5 payout_trigger**

+-----------------------------------------------------------------------+
| sql                                                                   |
+-----------------------------------------------------------------------+
| CREATE TYPE payout_trigger AS ENUM (                                  |
|                                                                       |
| \'manual\', \-- Contractor initiated withdrawal from UI               |
|                                                                       |
| \'scheduled\' \-- Triggered by payout schedule engine                 |
|                                                                       |
| );                                                                    |
+=======================================================================+

## **1.6 crypto_provider**

+-----------------------------------------------------------------------+
| sql                                                                   |
+-----------------------------------------------------------------------+
| CREATE TYPE crypto_provider AS ENUM (                                 |
|                                                                       |
| \'COINBASE\', \'BINANCE\', \'KRAKEN\', \'BITFINEX\',                  |
|                                                                       |
| \'OKX\', \'BYBIT\', \'GEMINI\', \'KUCOIN\', \'GATE_IO\'               |
|                                                                       |
| );                                                                    |
+=======================================================================+

# **2. Table Definitions**

## **2.1 payout_requests**

+-----------------------------------------------------------------------+
| sql                                                                   |
+-----------------------------------------------------------------------+
| CREATE TABLE payout_requests (                                        |
|                                                                       |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| contractor_id UUID NOT NULL,                                          |
|                                                                       |
| deposit_method_id UUID NOT NULL REFERENCES deposit_methods(id),       |
|                                                                       |
| idempotency_key UUID NOT NULL,                                        |
|                                                                       |
| trigger payout_trigger NOT NULL DEFAULT \'manual\',                   |
|                                                                       |
| status payout_status NOT NULL DEFAULT \'pending_verification\',       |
|                                                                       |
| \-- Amounts (all in USD unless currency field says otherwise)         |
|                                                                       |
| amount_usd NUMERIC(18,8) NOT NULL, \-- gross amount requested         |
|                                                                       |
| fee_usd NUMERIC(18,8) NOT NULL DEFAULT 0, \-- instant withdrawal fee  |
| if applicable                                                         |
|                                                                       |
| net_amount_usd NUMERIC(18,8) NOT NULL, \-- amount_usd - fee_usd       |
|                                                                       |
| currency VARCHAR(3) NOT NULL DEFAULT \'USD\',                         |
|                                                                       |
| \-- Provider response                                                 |
|                                                                       |
| provider_reference TEXT, \-- provider transaction ID / batch ID       |
|                                                                       |
| provider_status TEXT, \-- raw status string from provider             |
|                                                                       |
| provider_response JSONB, \-- full provider response for debugging     |
|                                                                       |
| failure_reason TEXT, \-- human-readable failure reason                |
|                                                                       |
| retry_count SMALLINT NOT NULL DEFAULT 0,                              |
|                                                                       |
| \-- Magic link                                                        |
|                                                                       |
| magic_link_token_id UUID REFERENCES magic_link_tokens(id),            |
|                                                                       |
| verified_at TIMESTAMPTZ,                                              |
|                                                                       |
| \-- Timing                                                            |
|                                                                       |
| created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                        |
|                                                                       |
| queued_at TIMESTAMPTZ,                                                |
|                                                                       |
| processing_at TIMESTAMPTZ,                                            |
|                                                                       |
| completed_at TIMESTAMPTZ,                                             |
|                                                                       |
| failed_at TIMESTAMPTZ,                                                |
|                                                                       |
| cancelled_at TIMESTAMPTZ,                                             |
|                                                                       |
| scheduled_for TIMESTAMPTZ, \-- for scheduled payouts: intended        |
| execution time                                                        |
|                                                                       |
| \-- Split payout reference                                            |
|                                                                       |
| split_group_id UUID, \-- shared UUID for all legs of a split payout   |
|                                                                       |
| split_sequence SMALLINT, \-- 1 = primary, 2 = secondary               |
|                                                                       |
| CONSTRAINT payout_requests_idempotency_unique UNIQUE                  |
| (idempotency_key),                                                    |
|                                                                       |
| CONSTRAINT payout_requests_net_positive CHECK (net_amount_usd \> 0),  |
|                                                                       |
| CONSTRAINT payout_requests_fee_non_negative CHECK (fee_usd \>= 0),    |
|                                                                       |
| CONSTRAINT payout_requests_split_sequence CHECK (split_sequence IN    |
| (1, 2))                                                               |
|                                                                       |
| );                                                                    |
|                                                                       |
| CREATE INDEX pr_contractor_id_idx ON payout_requests (contractor_id,  |
| created_at DESC);                                                     |
|                                                                       |
| CREATE INDEX pr_status_idx ON payout_requests (status) WHERE status   |
| IN (\'pending_verification\',\'queued\',\'processing\');              |
|                                                                       |
| CREATE INDEX pr_scheduled_for_idx ON payout_requests (scheduled_for)  |
| WHERE status = \'queued\';                                            |
|                                                                       |
| CREATE INDEX pr_split_group_id_idx ON payout_requests                 |
| (split_group_id) WHERE split_group_id IS NOT NULL;                    |
|                                                                       |
| CREATE INDEX pr_deposit_method_idx ON payout_requests                 |
| (deposit_method_id);                                                  |
+=======================================================================+

## **2.2 deposit_methods**

+-----------------------------------------------------------------------+
| sql                                                                   |
+-----------------------------------------------------------------------+
| CREATE TABLE deposit_methods (                                        |
|                                                                       |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| contractor_id UUID NOT NULL,                                          |
|                                                                       |
| method_type method_type NOT NULL,                                     |
|                                                                       |
| is_default BOOLEAN NOT NULL DEFAULT false,                            |
|                                                                       |
| is_active BOOLEAN NOT NULL DEFAULT true,                              |
|                                                                       |
| \-- Display                                                           |
|                                                                       |
| nickname VARCHAR(64),                                                 |
|                                                                       |
| display_label TEXT, \-- e.g. \'Chase ••••4242\', \'PayPal             |
| (jane@example.com)\'                                                  |
|                                                                       |
| \-- Bank fields (BANK_STRIPE and BANK_MANUAL)                         |
|                                                                       |
| bank_account_name TEXT,                                               |
|                                                                       |
| bank_account_last4 VARCHAR(4),                                        |
|                                                                       |
| bank_routing_number VARCHAR(9), \-- US routing number (BANK_STRIPE    |
| only --- stored encrypted)                                            |
|                                                                       |
| bank_iban_last4 VARCHAR(4),                                           |
|                                                                       |
| bank_country VARCHAR(2), \-- ISO 3166-1 alpha-2                       |
|                                                                       |
| bank_currency VARCHAR(3), \-- ISO 4217 --- payout currency for this   |
| bank                                                                  |
|                                                                       |
| stripe_account_id TEXT, \-- Stripe Financial Connections account ID   |
| (BANK_STRIPE)                                                         |
|                                                                       |
| stripe_bank_account_id TEXT, \-- Stripe bank account object ID        |
|                                                                       |
| \-- PayPal fields                                                     |
|                                                                       |
| paypal_email TEXT,                                                    |
|                                                                       |
| paypal_account_id TEXT, \-- PayPal account ID from OAuth              |
|                                                                       |
| \-- Wise fields                                                       |
|                                                                       |
| wise_account_id TEXT,                                                 |
|                                                                       |
| wise_profile_id TEXT,                                                 |
|                                                                       |
| wise_recipient_id TEXT,                                               |
|                                                                       |
| \-- Payoneer fields                                                   |
|                                                                       |
| payoneer_payee_id TEXT,                                               |
|                                                                       |
| \-- Crypto fields                                                     |
|                                                                       |
| crypto_provider crypto_provider,                                      |
|                                                                       |
| crypto_network TEXT, \-- e.g. \'ethereum\', \'bitcoin\', \'solana\'   |
|                                                                       |
| crypto_currency VARCHAR(10), \-- e.g. \'ETH\', \'BTC\', \'USDC\'      |
|                                                                       |
| crypto_address TEXT, \-- wallet address --- stored encrypted          |
|                                                                       |
| \-- Debit card fields (placeholder)                                   |
|                                                                       |
| card_last4 VARCHAR(4),                                                |
|                                                                       |
| card_network TEXT,                                                    |
|                                                                       |
| \-- Metadata                                                          |
|                                                                       |
| verification_status verification_status NOT NULL DEFAULT \'pending\', |
|                                                                       |
| created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                        |
|                                                                       |
| updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                        |
|                                                                       |
| deactivated_at TIMESTAMPTZ,                                           |
|                                                                       |
| \-- Split payout: max 2 active methods per contractor, only one       |
| default                                                               |
|                                                                       |
| CONSTRAINT deposit_methods_one_default                                |
|                                                                       |
| EXCLUDE USING btree (contractor_id WITH =) WHERE (is_default = true   |
| AND is_active = true)                                                 |
|                                                                       |
| );                                                                    |
|                                                                       |
| CREATE INDEX dm_contractor_id_idx ON deposit_methods (contractor_id)  |
| WHERE is_active = true;                                               |
|                                                                       |
| CREATE INDEX dm_method_type_idx ON deposit_methods (contractor_id,    |
| method_type);                                                         |
|                                                                       |
| CREATE INDEX dm_stripe_account_idx ON deposit_methods                 |
| (stripe_account_id) WHERE stripe_account_id IS NOT NULL;              |
|                                                                       |
| CREATE OR REPLACE FUNCTION deposit_methods_set_updated_at()           |
|                                                                       |
| RETURNS TRIGGER AS \$\$ BEGIN NEW.updated_at = NOW(); RETURN NEW;     |
| END; \$\$ LANGUAGE plpgsql;                                           |
|                                                                       |
| CREATE TRIGGER deposit_methods_updated_at                             |
|                                                                       |
| BEFORE UPDATE ON deposit_methods                                      |
|                                                                       |
| FOR EACH ROW EXECUTE FUNCTION deposit_methods_set_updated_at();       |
+=======================================================================+

## **2.3 payout_schedules**

+-----------------------------------------------------------------------+
| sql                                                                   |
+-----------------------------------------------------------------------+
| CREATE TABLE payout_schedules (                                       |
|                                                                       |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| contractor_id UUID NOT NULL UNIQUE, \-- one schedule per contractor   |
|                                                                       |
| is_active BOOLEAN NOT NULL DEFAULT true,                              |
|                                                                       |
| frequency schedule_frequency NOT NULL DEFAULT \'weekly\',             |
|                                                                       |
| \-- Weekly: day of week (0=Sunday ... 6=Saturday)                     |
|                                                                       |
| day_of_week SMALLINT CHECK (day_of_week BETWEEN 0 AND 6),             |
|                                                                       |
| \-- Monthly / bi-weekly: day of month (1--28)                         |
|                                                                       |
| day_of_month SMALLINT CHECK (day_of_month BETWEEN 1 AND 28),          |
|                                                                       |
| \-- Custom: interval in days (1--365)                                 |
|                                                                       |
| custom_interval_days SMALLINT CHECK (custom_interval_days BETWEEN 1   |
| AND 365),                                                             |
|                                                                       |
| \-- Threshold: only pay out when balance \>= this amount (scheduled   |
| only)                                                                 |
|                                                                       |
| threshold_usd NUMERIC(18,8) NOT NULL DEFAULT 50,                      |
|                                                                       |
| \-- Reserve: keep this much in balance, do not pay out below this     |
| floor                                                                 |
|                                                                       |
| reserve_usd NUMERIC(18,8) NOT NULL DEFAULT 0                          |
|                                                                       |
| CHECK (reserve_usd BETWEEN 0 AND 250),                                |
|                                                                       |
| \-- Split: primary + optional secondary deposit method                |
|                                                                       |
| primary_method_id UUID REFERENCES deposit_methods(id),                |
|                                                                       |
| secondary_method_id UUID REFERENCES deposit_methods(id),              |
|                                                                       |
| \-- Percentage split (must sum to 100 when both methods present)      |
|                                                                       |
| primary_pct NUMERIC(5,2) CHECK (primary_pct BETWEEN 0 AND 100),       |
|                                                                       |
| secondary_pct NUMERIC(5,2) CHECK (secondary_pct BETWEEN 0 AND 100),   |
|                                                                       |
| next_run_at TIMESTAMPTZ,                                              |
|                                                                       |
| last_run_at TIMESTAMPTZ,                                              |
|                                                                       |
| created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                        |
|                                                                       |
| updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                        |
|                                                                       |
| CONSTRAINT schedule_split_pct_sum                                     |
|                                                                       |
| CHECK (primary_pct IS NULL OR secondary_pct IS NULL OR                |
|                                                                       |
| (primary_pct + secondary_pct = 100)),                                 |
|                                                                       |
| CONSTRAINT schedule_threshold_minimum                                 |
|                                                                       |
| CHECK (threshold_usd \>= 50)                                          |
|                                                                       |
| );                                                                    |
|                                                                       |
| CREATE INDEX ps_next_run_idx ON payout_schedules (next_run_at) WHERE  |
| is_active = true;                                                     |
|                                                                       |
| CREATE INDEX ps_contractor_idx ON payout_schedules (contractor_id);   |
+=======================================================================+

## **2.4 deposit_method_verification**

+-----------------------------------------------------------------------+
| sql                                                                   |
+-----------------------------------------------------------------------+
| CREATE TABLE deposit_method_verification (                            |
|                                                                       |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| deposit_method_id UUID NOT NULL REFERENCES deposit_methods(id) ON     |
| DELETE CASCADE,                                                       |
|                                                                       |
| contractor_id UUID NOT NULL,                                          |
|                                                                       |
| verification_type TEXT NOT NULL, \-- \'micro_deposit\' \|             |
| \'stripe_fc\' \| \'oauth\' \| \'crypto_confirm\'                      |
|                                                                       |
| \-- Micro-deposit fields                                              |
|                                                                       |
| amount_1_cents SMALLINT, \-- stored as cents (1--99)                  |
|                                                                       |
| amount_2_cents SMALLINT, \-- stored as cents (1--99)                  |
|                                                                       |
| attempt_count SMALLINT NOT NULL DEFAULT 0,                            |
|                                                                       |
| max_attempts SMALLINT NOT NULL DEFAULT 3,                             |
|                                                                       |
| locked_until TIMESTAMPTZ,                                             |
|                                                                       |
| expires_at TIMESTAMPTZ, \-- 10 days from initiation                   |
|                                                                       |
| \-- OAuth / Stripe FC fields                                          |
|                                                                       |
| oauth_state TEXT, \-- PKCE state param --- cleared after use          |
|                                                                       |
| oauth_code TEXT, \-- cleared after exchange                           |
|                                                                       |
| \-- Crypto confirmation                                               |
|                                                                       |
| confirmation_code TEXT, \-- 6-digit code sent to contractor email     |
|                                                                       |
| confirmation_expires_at TIMESTAMPTZ,                                  |
|                                                                       |
| status verification_status NOT NULL DEFAULT \'pending\',              |
|                                                                       |
| verified_at TIMESTAMPTZ,                                              |
|                                                                       |
| created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                        |
|                                                                       |
| updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()                         |
|                                                                       |
| );                                                                    |
|                                                                       |
| CREATE INDEX dmv_deposit_method_idx ON deposit_method_verification    |
| (deposit_method_id);                                                  |
|                                                                       |
| CREATE INDEX dmv_contractor_idx ON deposit_method_verification        |
| (contractor_id);                                                      |
|                                                                       |
| CREATE INDEX dmv_expires_idx ON deposit_method_verification           |
| (expires_at)                                                          |
|                                                                       |
| WHERE status = \'pending\';                                           |
+=======================================================================+

## **2.5 magic_link_tokens**

+-----------------------------------------------------------------------+
| sql                                                                   |
+-----------------------------------------------------------------------+
| CREATE TABLE magic_link_tokens (                                      |
|                                                                       |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| contractor_id UUID NOT NULL,                                          |
|                                                                       |
| token_hash TEXT NOT NULL UNIQUE, \-- SHA-256 of the raw token         |
|                                                                       |
| payout_amount_usd NUMERIC(18,8) NOT NULL,                             |
|                                                                       |
| deposit_method_id UUID NOT NULL REFERENCES deposit_methods(id),       |
|                                                                       |
| is_used BOOLEAN NOT NULL DEFAULT false,                               |
|                                                                       |
| expires_at TIMESTAMPTZ NOT NULL,                                      |
|                                                                       |
| used_at TIMESTAMPTZ,                                                  |
|                                                                       |
| created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()                         |
|                                                                       |
| );                                                                    |
|                                                                       |
| CREATE INDEX mlt_token_hash_idx ON magic_link_tokens (token_hash)     |
| WHERE is_used = false;                                                |
|                                                                       |
| CREATE INDEX mlt_contractor_idx ON magic_link_tokens (contractor_id,  |
| expires_at DESC);                                                     |
|                                                                       |
| CREATE INDEX mlt_expires_cleanup_idx ON magic_link_tokens             |
| (expires_at) WHERE is_used = false;                                   |
+=======================================================================+

## **2.6 payout_audit_log**

+-----------------------------------------------------------------------+
| sql                                                                   |
+-----------------------------------------------------------------------+
| CREATE TABLE payout_audit_log (                                       |
|                                                                       |
| id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                        |
|                                                                       |
| created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                        |
|                                                                       |
| contractor_id UUID NOT NULL,                                          |
|                                                                       |
| payout_request_id UUID REFERENCES payout_requests(id),                |
|                                                                       |
| actor_type TEXT NOT NULL, \-- \'contractor\' \| \'service\' \|        |
| \'admin\'                                                             |
|                                                                       |
| actor_id TEXT NOT NULL,                                               |
|                                                                       |
| action TEXT NOT NULL, \-- see §2.6.1 for action values                |
|                                                                       |
| previous_status payout_status,                                        |
|                                                                       |
| new_status payout_status,                                             |
|                                                                       |
| metadata JSONB,                                                       |
|                                                                       |
| request_id UUID                                                       |
|                                                                       |
| );                                                                    |
|                                                                       |
| CREATE INDEX pal_contractor_idx ON payout_audit_log (contractor_id,   |
| created_at DESC);                                                     |
|                                                                       |
| CREATE INDEX pal_payout_request_idx ON payout_audit_log               |
| (payout_request_id);                                                  |
|                                                                       |
| CREATE INDEX pal_created_at_idx ON payout_audit_log (created_at       |
| DESC);                                                                |
+=======================================================================+

  -------------------------------------------------------------------------
  **action value**           **When logged**
  -------------------------- ----------------------------------------------
  **withdrawal.initiated**   Contractor submits withdrawal request ---
                             before magic link sent

  **magic_link.sent**        Magic link email dispatched via SendGrid

  **magic_link.verified**    Contractor clicks magic link --- token
                             validated

  **magic_link.expired**     Magic link TTL elapsed without use

  **payout.queued**          Payout moves to queued status after
                             verification

  **payout.processing**      Provider API call initiated

  **payout.completed**       Provider confirms transfer

  **payout.failed**          Provider rejects or all retries exhausted

  **payout.cancelled**       Contractor cancels before processing

  **method.added**           New deposit method added

  **method.removed**         Deposit method deactivated

  **method.set_default**     Default method changed

  **schedule.updated**       Payout schedule configuration changed

  **admin.viewed**           Admin viewed contractor payout history
                             (support access)
  -------------------------------------------------------------------------

# **3. TypeORM Entities**

## **3.1 PayoutRequest entity**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/entities/payout-request.entity.ts                              |
|                                                                       |
| import { Entity, PrimaryGeneratedColumn, Column, Index,               |
|                                                                       |
| CreateDateColumn, ManyToOne, JoinColumn } from \'typeorm\';           |
|                                                                       |
| import { DepositMethod } from \'./deposit-method.entity\';            |
|                                                                       |
| import { MagicLinkToken } from \'./magic-link-token.entity\';         |
|                                                                       |
| export enum PayoutStatus {                                            |
|                                                                       |
| PENDING_VERIFICATION = \'pending_verification\',                      |
|                                                                       |
| QUEUED = \'queued\',                                                  |
|                                                                       |
| PROCESSING = \'processing\',                                          |
|                                                                       |
| COMPLETED = \'completed\',                                            |
|                                                                       |
| FAILED = \'failed\',                                                  |
|                                                                       |
| CANCELLED = \'cancelled\',                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| export enum PayoutTrigger {                                           |
|                                                                       |
| MANUAL = \'manual\',                                                  |
|                                                                       |
| SCHEDULED = \'scheduled\',                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| \@Entity(\'payout_requests\')                                         |
|                                                                       |
| \@Index(\[\'contractorId\', \'createdAt\'\])                          |
|                                                                       |
| export class PayoutRequest {                                          |
|                                                                       |
| \@PrimaryGeneratedColumn(\'uuid\') id: string;                        |
|                                                                       |
| \@Column({ name:\'contractor_id\' }) contractorId: string;            |
|                                                                       |
| \@Column({ name:\'idempotency_key\', unique:true }) idempotencyKey:   |
| string;                                                               |
|                                                                       |
| \@Column({ type:\'enum\', enum:PayoutTrigger,                         |
| default:PayoutTrigger.MANUAL }) trigger: PayoutTrigger;               |
|                                                                       |
| \@Column({ type:\'enum\', enum:PayoutStatus,                          |
| default:PayoutStatus.PENDING_VERIFICATION }) status: PayoutStatus;    |
|                                                                       |
| \@Column({ name:\'amount_usd\', type:\'numeric\', precision:18,       |
| scale:8 }) amountUsd: string;                                         |
|                                                                       |
| \@Column({ name:\'fee_usd\', type:\'numeric\', precision:18, scale:8, |
| default:\'0\' }) feeUsd: string;                                      |
|                                                                       |
| \@Column({ name:\'net_amount_usd\', type:\'numeric\', precision:18,   |
| scale:8 }) netAmountUsd: string;                                      |
|                                                                       |
| \@Column({ length:3, default:\'USD\' }) currency: string;             |
|                                                                       |
| \@Column({ name:\'provider_reference\', nullable:true })              |
| providerReference: string \| null;                                    |
|                                                                       |
| \@Column({ name:\'provider_status\', nullable:true }) providerStatus: |
| string \| null;                                                       |
|                                                                       |
| \@Column({ name:\'provider_response\', type:\'jsonb\', nullable:true  |
| }) providerResponse: object \| null;                                  |
|                                                                       |
| \@Column({ name:\'failure_reason\', nullable:true }) failureReason:   |
| string \| null;                                                       |
|                                                                       |
| \@Column({ name:\'retry_count\', type:\'smallint\', default:0 })      |
| retryCount: number;                                                   |
|                                                                       |
| \@Column({ name:\'verified_at\', type:\'timestamptz\', nullable:true  |
| }) verifiedAt: Date \| null;                                          |
|                                                                       |
| \@Column({ name:\'queued_at\', type:\'timestamptz\', nullable:true }) |
| queuedAt: Date \| null;                                               |
|                                                                       |
| \@Column({ name:\'processing_at\', type:\'timestamptz\',              |
| nullable:true }) processingAt: Date \| null;                          |
|                                                                       |
| \@Column({ name:\'completed_at\', type:\'timestamptz\', nullable:true |
| }) completedAt: Date \| null;                                         |
|                                                                       |
| \@Column({ name:\'failed_at\', type:\'timestamptz\', nullable:true }) |
| failedAt: Date \| null;                                               |
|                                                                       |
| \@Column({ name:\'cancelled_at\', type:\'timestamptz\', nullable:true |
| }) cancelledAt: Date \| null;                                         |
|                                                                       |
| \@Column({ name:\'scheduled_for\', type:\'timestamptz\',              |
| nullable:true }) scheduledFor: Date \| null;                          |
|                                                                       |
| \@Column({ name:\'split_group_id\', nullable:true }) splitGroupId:    |
| string \| null;                                                       |
|                                                                       |
| \@Column({ name:\'split_sequence\', type:\'smallint\', nullable:true  |
| }) splitSequence: number \| null;                                     |
|                                                                       |
| \@CreateDateColumn({ name:\'created_at\', type:\'timestamptz\' })     |
| createdAt: Date;                                                      |
|                                                                       |
| \@ManyToOne(() =\> DepositMethod) \@JoinColumn({                      |
| name:\'deposit_method_id\' }) depositMethod: DepositMethod;           |
|                                                                       |
| \@ManyToOne(() =\> MagicLinkToken) \@JoinColumn({                     |
| name:\'magic_link_token_id\' }) magicLinkToken: MagicLinkToken \|     |
| null;                                                                 |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.2 DepositMethod entity**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/entities/deposit-method.entity.ts                              |
|                                                                       |
| import { Entity, PrimaryGeneratedColumn, Column, Index,               |
| CreateDateColumn, UpdateDateColumn } from \'typeorm\';                |
|                                                                       |
| export enum MethodType {                                              |
|                                                                       |
| BANK_STRIPE = \'BANK_STRIPE\',                                        |
|                                                                       |
| BANK_MANUAL = \'BANK_MANUAL\',                                        |
|                                                                       |
| PAYPAL = \'PAYPAL\',                                                  |
|                                                                       |
| WISE = \'WISE\',                                                      |
|                                                                       |
| PAYONEER = \'PAYONEER\',                                              |
|                                                                       |
| CRYPTO = \'CRYPTO\',                                                  |
|                                                                       |
| MARKETEQ_DEBIT_CARD = \'MARKETEQ_DEBIT_CARD\',                        |
|                                                                       |
| TEQ_COIN = \'TEQ_COIN\',                                              |
|                                                                       |
| }                                                                     |
|                                                                       |
| export enum VerificationStatus {                                      |
|                                                                       |
| PENDING = \'pending\',                                                |
|                                                                       |
| VERIFIED = \'verified\',                                              |
|                                                                       |
| FAILED = \'failed\',                                                  |
|                                                                       |
| EXPIRED = \'expired\',                                                |
|                                                                       |
| LOCKED = \'locked\',                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| export enum CryptoProvider {                                          |
|                                                                       |
| COINBASE = \'COINBASE\', BINANCE = \'BINANCE\', KRAKEN = \'KRAKEN\',  |
|                                                                       |
| BITFINEX = \'BITFINEX\', OKX = \'OKX\', BYBIT = \'BYBIT\',            |
|                                                                       |
| GEMINI = \'GEMINI\', KUCOIN = \'KUCOIN\', GATE_IO = \'GATE_IO\',      |
|                                                                       |
| }                                                                     |
|                                                                       |
| \@Entity(\'deposit_methods\')                                         |
|                                                                       |
| \@Index(\[\'contractorId\'\])                                         |
|                                                                       |
| export class DepositMethod {                                          |
|                                                                       |
| \@PrimaryGeneratedColumn(\'uuid\') id: string;                        |
|                                                                       |
| \@Column({ name:\'contractor_id\' }) contractorId: string;            |
|                                                                       |
| \@Column({ name:\'method_type\', type:\'enum\', enum:MethodType })    |
| methodType: MethodType;                                               |
|                                                                       |
| \@Column({ name:\'is_default\', default:false }) isDefault: boolean;  |
|                                                                       |
| \@Column({ name:\'is_active\', default:true }) isActive: boolean;     |
|                                                                       |
| \@Column({ nullable:true }) nickname: string \| null;                 |
|                                                                       |
| \@Column({ name:\'display_label\', nullable:true }) displayLabel:     |
| string \| null;                                                       |
|                                                                       |
| // Bank                                                               |
|                                                                       |
| \@Column({ name:\'bank_account_name\', nullable:true })               |
| bankAccountName: string \| null;                                      |
|                                                                       |
| \@Column({ name:\'bank_account_last4\', nullable:true })              |
| bankAccountLast4: string \| null;                                     |
|                                                                       |
| \@Column({ name:\'bank_country\', nullable:true }) bankCountry:       |
| string \| null;                                                       |
|                                                                       |
| \@Column({ name:\'bank_currency\', nullable:true }) bankCurrency:     |
| string \| null;                                                       |
|                                                                       |
| \@Column({ name:\'bank_iban_last4\', nullable:true }) bankIbanLast4:  |
| string \| null;                                                       |
|                                                                       |
| \@Column({ name:\'stripe_account_id\', nullable:true })               |
| stripeAccountId: string \| null;                                      |
|                                                                       |
| \@Column({ name:\'stripe_bank_account_id\', nullable:true })          |
| stripeBankAccountId: string \| null;                                  |
|                                                                       |
| // PayPal                                                             |
|                                                                       |
| \@Column({ name:\'paypal_email\', nullable:true }) paypalEmail:       |
| string \| null;                                                       |
|                                                                       |
| \@Column({ name:\'paypal_account_id\', nullable:true })               |
| paypalAccountId: string \| null;                                      |
|                                                                       |
| // Wise                                                               |
|                                                                       |
| \@Column({ name:\'wise_account_id\', nullable:true }) wiseAccountId:  |
| string \| null;                                                       |
|                                                                       |
| \@Column({ name:\'wise_profile_id\', nullable:true }) wiseProfileId:  |
| string \| null;                                                       |
|                                                                       |
| \@Column({ name:\'wise_recipient_id\', nullable:true })               |
| wiseRecipientId: string \| null;                                      |
|                                                                       |
| // Payoneer                                                           |
|                                                                       |
| \@Column({ name:\'payoneer_payee_id\', nullable:true })               |
| payoneerPayeeId: string \| null;                                      |
|                                                                       |
| // Crypto                                                             |
|                                                                       |
| \@Column({ name:\'crypto_provider\', type:\'enum\',                   |
| enum:CryptoProvider, nullable:true }) cryptoProvider: CryptoProvider  |
| \| null;                                                              |
|                                                                       |
| \@Column({ name:\'crypto_network\', nullable:true }) cryptoNetwork:   |
| string \| null;                                                       |
|                                                                       |
| \@Column({ name:\'crypto_currency\', nullable:true }) cryptoCurrency: |
| string \| null;                                                       |
|                                                                       |
| \@Column({ name:\'crypto_address\', nullable:true }) cryptoAddress:   |
| string \| null;                                                       |
|                                                                       |
| \@Column({ name:\'verification_status\', type:\'enum\',               |
| enum:VerificationStatus, default:VerificationStatus.PENDING })        |
| verificationStatus: VerificationStatus;                               |
|                                                                       |
| \@CreateDateColumn({ name:\'created_at\', type:\'timestamptz\' })     |
| createdAt: Date;                                                      |
|                                                                       |
| \@UpdateDateColumn({ name:\'updated_at\', type:\'timestamptz\' })     |
| updatedAt: Date;                                                      |
|                                                                       |
| \@Column({ name:\'deactivated_at\', type:\'timestamptz\',             |
| nullable:true }) deactivatedAt: Date \| null;                         |
|                                                                       |
| }                                                                     |
+=======================================================================+

## **3.3 PayoutSchedule entity**

+-----------------------------------------------------------------------+
| typescript                                                            |
+-----------------------------------------------------------------------+
| // src/entities/payout-schedule.entity.ts                             |
|                                                                       |
| import { Entity, PrimaryGeneratedColumn, Column, Index,               |
| CreateDateColumn, UpdateDateColumn } from \'typeorm\';                |
|                                                                       |
| export enum ScheduleFrequency {                                       |
|                                                                       |
| DAILY = \'daily\',                                                    |
|                                                                       |
| WEEKLY = \'weekly\',                                                  |
|                                                                       |
| BI_WEEKLY = \'bi_weekly\',                                            |
|                                                                       |
| MONTHLY = \'monthly\',                                                |
|                                                                       |
| CUSTOM = \'custom\',                                                  |
|                                                                       |
| }                                                                     |
|                                                                       |
| \@Entity(\'payout_schedules\')                                        |
|                                                                       |
| export class PayoutSchedule {                                         |
|                                                                       |
| \@PrimaryGeneratedColumn(\'uuid\') id: string;                        |
|                                                                       |
| \@Column({ name:\'contractor_id\', unique:true }) contractorId:       |
| string;                                                               |
|                                                                       |
| \@Column({ name:\'is_active\', default:true }) isActive: boolean;     |
|                                                                       |
| \@Column({ type:\'enum\', enum:ScheduleFrequency,                     |
| default:ScheduleFrequency.WEEKLY }) frequency: ScheduleFrequency;     |
|                                                                       |
| \@Column({ name:\'day_of_week\', type:\'smallint\', nullable:true })  |
| dayOfWeek: number \| null;                                            |
|                                                                       |
| \@Column({ name:\'day_of_month\', type:\'smallint\', nullable:true }) |
| dayOfMonth: number \| null;                                           |
|                                                                       |
| \@Column({ name:\'custom_interval_days\', type:\'smallint\',          |
| nullable:true }) customIntervalDays: number \| null;                  |
|                                                                       |
| \@Column({ name:\'threshold_usd\', type:\'numeric\', precision:18,    |
| scale:8, default:\'50\' }) thresholdUsd: string;                      |
|                                                                       |
| \@Column({ name:\'reserve_usd\', type:\'numeric\', precision:18,      |
| scale:8, default:\'0\' }) reserveUsd: string;                         |
|                                                                       |
| \@Column({ name:\'primary_method_id\', nullable:true })               |
| primaryMethodId: string \| null;                                      |
|                                                                       |
| \@Column({ name:\'secondary_method_id\', nullable:true })             |
| secondaryMethodId: string \| null;                                    |
|                                                                       |
| \@Column({ name:\'primary_pct\', type:\'numeric\', precision:5,       |
| scale:2, nullable:true }) primaryPct: string \| null;                 |
|                                                                       |
| \@Column({ name:\'secondary_pct\', type:\'numeric\', precision:5,     |
| scale:2, nullable:true }) secondaryPct: string \| null;               |
|                                                                       |
| \@Column({ name:\'next_run_at\', type:\'timestamptz\', nullable:true  |
| }) nextRunAt: Date \| null;                                           |
|                                                                       |
| \@Column({ name:\'last_run_at\', type:\'timestamptz\', nullable:true  |
| }) lastRunAt: Date \| null;                                           |
|                                                                       |
| \@CreateDateColumn({ name:\'created_at\', type:\'timestamptz\' })     |
| createdAt: Date;                                                      |
|                                                                       |
| \@UpdateDateColumn({ name:\'updated_at\', type:\'timestamptz\' })     |
| updatedAt: Date;                                                      |
|                                                                       |
| }                                                                     |
+=======================================================================+

# **4. Index Summary**

  -------------------------------------------------------------------------------------------------------
  **Table**                         **Index name**            **Columns**                 **Purpose**
  --------------------------------- ------------------------- --------------------------- ---------------
  **payout_requests**               pr_contractor_id_idx      (contractor_id, created_at  Contractor
                                                              DESC)                       payout history
                                                                                          pagination

  **payout_requests**               pr_status_idx             (status) WHERE              Scheduler polls
                                                              pending/queued/processing   for active
                                                                                          payouts

  **payout_requests**               pr_scheduled_for_idx      (scheduled_for) WHERE       Scheduled
                                                              status=queued               payout engine
                                                                                          lookups

  **payout_requests**               pr_split_group_id_idx     (split_group_id) WHERE NOT  Fetch both legs
                                                              NULL                        of a split
                                                                                          payout

  **payout_requests**               pr_deposit_method_idx     (deposit_method_id)         Find payouts
                                                                                          using a
                                                                                          specific method

  **payout_requests**               UNIQUE idempotency_key    (idempotency_key)           Prevent
                                                                                          duplicate
                                                                                          payout requests

  **deposit_methods**               dm_contractor_id_idx      (contractor_id) WHERE       Active methods
                                                              is_active                   per contractor

  **deposit_methods**               dm_stripe_account_idx     (stripe_account_id) WHERE   Stripe webhook
                                                              NOT NULL                    → method lookup

  **deposit_method_verification**   dmv_expires_idx           (expires_at) WHERE pending  Cron cleanup of
                                                                                          expired
                                                                                          verifications

  **magic_link_tokens**             mlt_token_hash_idx        (token_hash) WHERE NOT used Token
                                                                                          validation
                                                                                          lookups

  **magic_link_tokens**             mlt_expires_cleanup_idx   (expires_at) WHERE NOT used Cron cleanup of
                                                                                          expired tokens

  **payout_audit_log**              pal_contractor_idx        (contractor_id, created_at  Admin audit log
                                                              DESC)                       pagination

  **payout_schedules**              ps_next_run_idx           (next_run_at) WHERE         Schedule engine
                                                              is_active                   --- find due
                                                                                          schedules
  -------------------------------------------------------------------------------------------------------

# **5. Key Constraints & Business Rules**

  -------------------------------------------------------------------------
  **Constraint**           **Table**           **Rule enforced**
  ------------------------ ------------------- ----------------------------
  **UNIQUE                 payout_requests     One payout per idempotency
  (idempotency_key)**                          key --- prevents duplicate
                                               submissions on retry

  **CHECK (net_amount_usd  payout_requests     Net payout amount must be
  \> 0)**                                      positive --- catches fee \>
                                               amount edge case

  **CHECK (fee_usd \>=     payout_requests     Fee cannot be negative
  0)**                                         

  **EXCLUDE                deposit_methods     Only one active default
  (contractor_id) WHERE                        method per contractor at any
  is_default=true AND                          time
  is_active=true**                             

  **UNIQUE                 payout_schedules    One schedule configuration
  (contractor_id)**                            per contractor

  **CHECK (threshold_usd   payout_schedules    Scheduled payout threshold
  \>= 50)**                                    cannot be set below \$50
                                               minimum

  **CHECK (reserve_usd     payout_schedules    Reserve balance capped at
  BETWEEN 0 AND 250)**                         \$250 --- product constraint

  **CHECK (primary_pct +   payout_schedules    Split percentages must sum
  secondary_pct = 100)**                       to 100 when both methods are
                                               active

  **CHECK (split_sequence  payout_requests     Split payout can only have
  IN (1,2))**                                  sequence 1 (primary) or 2
                                               (secondary)

  **NOT NULL token_hash    magic_link_tokens   Raw token never stored ---
  UNIQUE**                                     only SHA-256 hash
  -------------------------------------------------------------------------

# **6. References**

  -----------------------------------------------------------------------
  **Document**           **Relevant to**
  ---------------------- ------------------------------------------------
  **PS-00 --- Service    Payout method types, deposit_methods naming
  Overview**             convention, TEQ Coin flag

  **PS-02 --- Withdrawal payout_requests insert flow, idempotency_key
  Initiation**           usage

  **PS-03 --- Magic Link magic_link_tokens table, token_hash storage, TTL
  Flow**                 

  **PS-14 --- Split      split_group_id, split_sequence, pct constraints
  Payout Logic**         on payout_schedules

  **PS-15 --- Scheduled  payout_schedules.next_run_at, threshold_usd,
  Payout Engine**        reserve_usd
  -----------------------------------------------------------------------

CONFIDENTIAL --- Marketeq Internal Engineering Documentation \|
payout-service PS-01 \| v1.0
