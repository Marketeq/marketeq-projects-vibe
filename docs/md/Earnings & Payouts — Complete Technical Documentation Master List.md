Going through every transcript and every document in this thread before
I publish anything.Good. I have everything I need. Here are the two
complete, accurate lists.

# **EARNINGS SERVICE --- Complete Documentation Set**

**17 documents** \| 1 complete \| 16 to write

**ES-00 --- Service Overview & Architecture** ✅ Done

**ES-01 --- Database Schema & Entities** Target PostgreSQL schema.
earnings_cache, balance_snapshots, fx_rate_cache, contract_label_cache
tables. Full TypeORM entity definitions, indexes, constraints, migration
strategy.

**ES-02 --- REST API --- Contractor-Facing Endpoints** Full OpenAPI
spec: GET balance (displayed in displayCurrency), GET earnings history
(paginated, filtered, sorted), GET earnings summary cards
(daily/weekly/monthly/all-time), GET single earnings entry detail
including gross vs net after Marketeq 20% service fee. All filter and
sort options matching the designs exactly. Request/response schemas,
HTTP status codes, auth requirements.

**ES-03 --- REST API --- Internal Service-to-Service Endpoints**
Internal endpoints consumed by other services only: GET
/internal/balance/:userId for payout-service, GET /internal/ytd/:userId
for kyc-identity-service. Service auth token requirements, rate limiting
rules. Not accessible via API Gateway.

**ES-04 --- RabbitMQ Consumer Implementation** Consumer module for all
inbound events: transaction.created, transaction.reversed,
payout.completed, payout.failed, contract.activated. Handler logic per
event, idempotency enforcement, dead-letter queue config, retry policy,
poison message handling.

**ES-05 --- RabbitMQ Publisher Implementation** Publisher for outbound
events: earnings.balance.updated, earnings.threshold.reached (\$600 USD
YTD). Full payload schemas, when each fires, which services consume
them.

**ES-06 --- Currency Conversion & Display Implementation** Self-hosted
fawazahmed0/exchange-api integration. Redis FX rate cache (1-hour TTL).
localCurrency (geo-detected on every login, immutable per session) vs
displayCurrency (user-set in Settings, defaults to localCurrency).
Geolocation currency refresh logic on login. Conversion calculation
rules. Rounding to nearest whole unit --- never show decimals to users.
Fallback behaviour when FX API is unavailable.

**ES-07 --- Redis Caching Strategy** Balance cache key schema
(balance:{userId}), TTL settings, invalidation trigger per event type,
cold-start behaviour (fall through to DB sum), Redis unavailability
fallback. FX rate cache keys and refresh strategy.

**ES-08 --- Service Fee Display Logic** How the Marketeq 20% service fee
appears in the earnings context. Gross earnings (what client paid) vs
net earnings (what contractor receives after fee). How the fee appears
as a line item in earnings history. Fee label and display format.
Clarification of scope: fee calculation lives in user-service --- this
doc covers display only.

**ES-09 --- Earnings Export (CSV & PDF)** Synchronous export under 5,000
rows: immediate file download. Async export over 5,000 rows: queued job,
file stored in Cloudflare R2, download link delivered via
notification-service, 24-hour link expiry. Export column definitions,
date formatting rules, currency display in exports.

**ES-10 --- Error States & HTTP Error Catalog** Every possible error
from earnings-service. Per error: HTTP status code, internal error code
string, user-facing message, recovery action. Covers: auth failures,
contractor not found, balance not yet calculated, FX API unavailable,
export too large, invalid date range, currency code not supported, zero
results for filter combination.

**ES-11 --- Edge Cases & Data Limitations** \$0 balance display,
first-time contractor with no earnings yet, FX rate cache miss on cold
start, very large earnings history (50,000+ records), displayCurrency
changed mid-session, concurrent balance reads during a payout in
progress, YTD threshold breach timing, contractor logs in from a new
country (localCurrency refresh vs stored displayCurrency), geolocation
unavailable fallback.

**ES-12 --- UX States Not Present in Designs** Every UI state required
but not in the design files. Empty states: zero balance, no earnings
history, no activity in selected date range, filter returns no results.
Loading states per component. Error states per component. First-time
contractor with no earnings (onboarding prompt). Help & Support tab
content and behaviour. Log Time quick action behaviour, destination, and
any validation. All toast and alert variants for earnings-specific
events.

**ES-13 --- Frontend & Backend Validation Split** Which validations are
frontend only, backend only, and both. Covers all inputs on earnings
screens: date range picker (start cannot exceed end, no future dates),
export requests (row count check before submitting), filter
combinations, currency selector. Documents the agreed rule that backend
always re-validates regardless of frontend enforcement.

**ES-14 --- Frontend Integration Guide** Endpoint-by-component mapping
for every earnings screen: Overview tab, Earnings tab, filter and sort
controls, export flow, Help & Support tab, Log Time action. Ably
real-time channel setup for live balance updates vs polling strategy per
component. Loading states, empty states, error states. Currency display
rounding rules. How displayCurrency preference is passed and applied.

**ES-15 --- User Stories & Acceptance Criteria** Every earnings screen
and feature as user stories with numbered testable acceptance criteria.
Overview tab cards, Earnings tab list, filters, sorting, export, service
fee display, currency display, empty states, error states. Edge cases
written in Given/When/Then format. Admin read-access stories for support
use cases.

**ES-16 --- Observability & Monitoring** Prometheus metrics: balance
cache hit/miss rate, FX rate refresh latency, RabbitMQ event processing
time per event type, export queue depth, API response time per endpoint.
Structured logging schema. Alerting thresholds: cache miss spike, FX API
down, consumer lag. Health check endpoint spec.

**ES-17 --- QA & Testing Guide** Unit test coverage requirements per
module. Integration test scenarios (event fires → balance updates
correctly). E2E test flows. Test data seeding strategy. How to simulate
RabbitMQ events in test environment. Currency conversion test cases.
Export test cases. Edge case test matrix mapped to ES-11. Performance
targets: balance API under 100ms P95, earnings list pagination under
200ms P95.

# **PAYOUT SERVICE --- Complete Documentation Set**

**32 documents** \| 0 complete \| 32 to write

**PS-00 --- Service Overview & Architecture** Purpose: move
contractor\'s available balance to their chosen destination. Nothing
else. Service boundaries, full dependency map, folder structure,
environment variables, RabbitMQ event contracts. All supported payout
method types listed. TEQ Coin documented as feature-flagged off for MVP.
Key design decisions and rationale.

**PS-01 --- Database Schema & Entities** Target PostgreSQL schema:
payout_requests, deposit_methods, payout_schedules,
deposit_method_verification, payout_audit_log tables. Full TypeORM
entities. Enums: method types, payout status, schedule frequency,
verification status. Indexes, constraints, migration strategy.

**PS-02 --- Withdrawal Flow --- API & Logic** Full 6-step flow: amount
entry → speed selection (instant \$1.75 fee vs standard free) → method
selection → review → magic link email verification → execution. \$50
minimum for manual withdrawals (separate rule from scheduled deposit
minimum). State machine for withdrawal request lifecycle. What happens
when instant fee reduces balance to \$0. Idempotency key requirements.

**PS-03 --- Deposit Schedule --- API & Logic** GET and PUT
/v1/payouts/schedule. Frequency options (daily, weekly, bi-weekly,
monthly, custom). Minimum payout threshold (\$50 minimum, applies to
scheduled deposits only --- not manual withdrawals). Reserve balance:
off by default, contractor opt-in, max \$250 cap, \$0 means off. Split
payout: max two accounts, default 50/50, auto-balance when either
percentage is edited. Schedule execution engine overview.

**PS-04 --- Deposit Method Management --- API** Full CRUD for all
deposit methods. Supported types: bank via Stripe Financial Connections,
bank via manual entry, PayPal, Wise, Payoneer, Marketeq Debit Card,
crypto wallet. Endpoint specs, auth requirements. Status enum:
unverified, verified, reauth_required, verification_expired. Max
connected accounts limit. Default method rules. Remove default account
flow: split resets, payouts pause, persistent alert fires, notification
sent.

**PS-05 --- Stripe Financial Connections Integration** Complete setup:
hosted flow for US bank account linking. Instant verification via OAuth
(contractor does not need their own Stripe account --- they just
authenticate their bank). Fallback to Stripe-native microdeposit flow
for unsupported banks. Webhook handling for verification events. No
Plaid anywhere. Session expiry at 30-minute idle.

**PS-06 --- Manual Bank Entry --- 7 Regions (Design Screens)** Form
logic and field-level validation for the 7 regions shown in the design
files: US (routing number + account number), Europe (IBAN), India
(IFSC + account number), Australia (BSB + account number), UK (sort
code + account number), Japan (branch code + account number), Asia
generic (SWIFT/BIC + account number). References PS-07 for full global
coverage beyond these 7.

**PS-07 --- Global Bank Schema Reference --- All Countries** Complete
field requirements for manual bank account entry for every country with
a unique banking system. Every country, not just the 7 in the designs.
Field names, formats, validation rules, character limits, example
values, required vs optional per country. Countries where international
wire is the only option. Used by PS-06 and the frontend form rendering
logic to determine which fields to show per selected country.

**PS-08 --- Micro-Deposit Verification Flow** Two small deposits sent
(\$0.01--\$0.99), 2 business day wait, contractor enters both amounts to
verify ownership. 3-attempt limit before lock. 24-hour lock on failure.
10-day expiry window before re-add required. Re-add flow on expiry.
Stripe API calls, webhook handling, DB state per step.

**PS-09 --- Third-Party OAuth Methods (PayPal, Wise, Payoneer)** OAuth
2.0 connection flow for each provider: redirect → login → callback →
token storage. Token refresh logic. REAUTH_REQUIRED state on token
expiry. Notification trigger on expiry. Note: Wise is a contractor
payout choice only --- not used as Marketeq internal infrastructure.

**PS-10 --- Crypto Wallet Connection --- All 9 Providers** 9 providers:
Ramp, Transak, Crypto.com, Coinbase, Metamask, Ledger, Trezor, Kraken,
Binance. 3 connection methods per provider where supported: manual
wallet address entry, WalletConnect QR code (5-minute TTL), paste
connection link. Address format validation per network. Conversion
display value via fawazahmed0 API.

**PS-11 --- Crypto Wallet --- Per-Provider Technical Integration Spec**
Per provider across all 9: specific SDK or API used, authentication flow
details, supported token list, connection status detection method
(webhook vs polling), session management and expiry, re-connection flow,
known limitations and edge cases per provider.

**PS-12 --- Crypto Payout Settlement --- Technical Spec** How money
moves from Marketeq Stripe corporate balance to a contractor crypto
wallet. Fiat-to-crypto conversion via Ramp/Transak as on-ramp bridges.
Gas fee handling and who pays. Settlement timing per provider. Failed
transaction handling and retry logic. Minimum payout amounts per token.
Tokens supported for actual payout vs display only. Regulatory
classification of crypto payouts by jurisdiction.

**PS-13 --- Marketeq Debit Card --- Setup & Integration** Debit card
appears in deposit method designs but has no setup flow in the provided
design files. This doc covers: card network, how it is issued,
contractor activation flow, how payouts to the card work, spending
limits, geographic availability. Flagged: design team must produce setup
screens before this can be fully built.

**PS-14 --- Magic Link Email Verification** Single-use token generation.
15-minute TTL. Delivery via SendGrid through notification-service. Used
and expired state handling. Token stored hashed --- never in plain text.
One-use enforcement. Retry flow: expiry returns contractor to step 1 of
withdrawal. Security considerations.

**PS-15 --- KYC-Identity Gating** How payout-service calls
kyc-identity-service to gate withdrawals. Tier 1: government ID. Tier 2:
tax identity (SSN/ITIN for US, W-8BEN for international). Tier 3: bank
account ownership. Screen content per tier when contractor hits Withdraw
Funds before completing that tier. First-payout 5-business-day hold
logic. \$10,000 single-transaction enhanced due diligence trigger.

**PS-16 --- Paused Payouts & Alert System** All conditions that pause
payouts: no default method set, default method deactivated, default
method REAUTH_REQUIRED, OFAC flag, account suspended. Persistent alert
banner in the promotional banner location --- not a toast. Not
dismissible by the contractor. Exact copy and CTA per pause condition:
\"Your payouts are paused. You don\'t have a default payout method set.
\[Set default payment method\]\". Alert takes priority over promotional
banners. Clears automatically when condition resolves. Notification also
sent (not just banner).

**PS-17 --- Deposit Schedule Execution Engine** Cron job spec: frequency
options mapped to cron expressions, execution time windows, skip logic
when balance is below minimum threshold (skip silently first time,
notify after 3 consecutive misses), split payout execution order when
two methods are active, partial failure handling when one method in a
split fails, atomic execution requirements.

**PS-18 --- Auto-Balance Logic for Split Payouts** Exact rules for how
the system auto-balances percentages across two accounts. What happens
when the user edits one field. Rounding rules and tolerance (±0.01%).
Default is 50/50. What triggers a rebalance. Behaviour when one account
in a split is removed (single account now receives 100%, payouts pause
if removed account was the only verified one). Toggle turns split on/off
and resets to 50/50 on re-enable.

**PS-19 --- Frontend & Backend Validation Split** Documents explicitly
which validations are frontend only, backend only, or enforced on both.
Covers every input across all payout flows. Frontend only: past dates
disabled in schedule calendar, percentage fields auto-balance, amount
field currency formatting, Withdraw Full Amount pre-fill, reserve \$250
cap at input level. Backend only: idempotency checks, rate limiting (5
withdrawals/hour), balance sufficiency re-check at execution, KYC tier
check at execution. Both: minimum \$50 withdrawal amount, bank field
format validation, wallet address format validation.

**PS-20 --- Fund Custody, Money Holding & Business Rules** Where
contractor earnings are held (Marketeq corporate Stripe account balance
--- not a contractor-specific account). Legal classification of held
funds --- what they are and are not. Contractor\'s legal claim to the
balance. Maximum holding periods by US state and jurisdiction. What
happens to held funds if a contract is disputed or cancelled. Interest
on held funds: none, but must be disclosed to contractors. Unclaimed
balance policy after prolonged inactivity. Insolvency scenario. Reserve
balance business rules. Everything that must appear in contractor Terms
of Service regarding held funds.

**PS-21 --- Compliance & Regulatory Reference (Engineering)** Written
for engineers. How each regulation is enforced in code and process:
NACHA ACH rules for bank transfers, Stripe payout compliance
requirements, FinCEN BSA \$10,000 single-transaction threshold
implementation, IRS 1099 \$600 YTD threshold hold logic, OFAC screening
on every payout attempt, jurisdiction-specific payout timing laws,
W-9/W-8BEN collection requirements, crypto payout regulatory
classification by jurisdiction.

**PS-22 --- Compliance & Regulatory Reference (Legal & Financial
Experts)** Written for compliance officers and legal counsel --- not
engineers. Different document from PS-21 with different depth and
language. All regulatory obligations by jurisdiction. AML/KYC
requirements in full. Fund holding legal obligations. Wage payment laws
by US state. International contractor payment laws. Tax reporting
obligations. Required disclosures in contractor agreements. Audit trail
requirements. What Marketeq is legally responsible for vs what
third-party processors are responsible for.

**PS-23 --- RabbitMQ Events (Published & Consumed)** Events published:
payout.initiated, payout.completed, payout.failed,
payout.scheduled.skipped. Events consumed: earnings.balance.updated
(balance check before withdrawal execution). Full payload schemas,
exchange names, routing keys, idempotency requirements, dead-letter
queue config.

**PS-24 --- Error States & HTTP Error Catalog** Every possible error.
Per error: HTTP code, internal error code string, user-facing message,
recovery CTA. Full list: INSUFFICIENT_FUNDS,
INSUFFICIENT_FUNDS_AFTER_FEE, BELOW_MINIMUM_WITHDRAWAL (\$50 floor),
BELOW_SCHEDULE_MINIMUM, RESERVE_TOO_LOW, METHOD_UNVERIFIED,
METHOD_NOT_FOUND, METHOD_REAUTH_REQUIRED, KYC_TIER_1_REQUIRED,
KYC_TIER_2_REQUIRED, KYC_TIER_3_REQUIRED, MAGIC_LINK_EXPIRED,
MAGIC_LINK_USED, MAGIC_LINK_NOT_FOUND, NETWORK_FAILURE,
ACCOUNT_SUSPENDED, SPLIT_INVALID, CRYPTO_ADDRESS_INVALID,
CRYPTO_NETWORK_UNSUPPORTED, PROVIDER_UNAVAILABLE,
DEBIT_CARD_NOT_ACTIVATED, RATE_LIMIT_EXCEEDED, PAYOUT_HOLD_ACTIVE
(first-payout hold).

**PS-25 --- Edge Cases & Data Limitations** Race condition on
simultaneous withdrawal attempts from two sessions. Instant fee reducing
balance to exactly \$0. Reserve amount blocking a withdrawal the
contractor wants to override. Split percentage rounding tolerance
(±0.01%). Removing the only connected account. Removing the default
account when split is active (split resets, payouts pause, alert fires).
Maximum connected accounts limit reached. OAuth token expires
mid-connection flow. WalletConnect QR code expires during scan. Stripe
Financial Connections session expires during bank link (30-minute idle).
TEQ Coin feature flag is off for MVP --- how the UI handles this
gracefully. Contractor logs in from a new country and localCurrency
changes but displayCurrency was manually set.

**PS-26 --- UX States Not Present in Designs** Every UI state required
but not shown in design files. Empty states: no deposit methods added
yet, no payout history, no upcoming scheduled payout, \$0 available
balance, no transactions in selected date range. Loading states per step
in the 6-step withdrawal modal. Error display per component. First-time
user state with no methods and no history. Paused payouts banner exact
content per pause condition. KYC gating screen content and CTA per tier
(Tier 1, 2, and 3 separately). Debit card setup flow (missing from
designs --- new design screens required before build).

**PS-27 --- Frontend Integration Guide** Endpoint-by-component mapping
for every payout screen: Overview Direct Deposit panel, Payouts tab,
Withdraw Funds 6-step modal (all steps), Deposit Schedule settings, Add
Deposit Method flows for all types (Stripe Financial Connections, manual
bank by region, PayPal, Wise, Payoneer, debit card, each crypto
provider), Deposit Method Management list. Real-time balance update via
Ably on payout completion. Auto-balance display during split percentage
editing. Loading, empty, and error states per component.

**PS-28 --- User Stories & Acceptance Criteria --- All Payout Screens &
Features** Every payout screen and feature as user stories with numbered
testable acceptance criteria. Covers all flows: 6-step withdrawal,
deposit schedule setup and editing, adding all method types, method
management, removing methods, split payout auto-balance, paused payouts
banner, payout history, upcoming payout display, lifetime stats.

**PS-29 --- User Stories & Acceptance Criteria --- Edge Cases
(Given/When/Then)** All payout-specific edge cases from PS-25 rewritten
as formal acceptance criteria in Given/When/Then format. Every P1 and P2
edge case. Used directly by QA to write test cases.

**PS-30 --- Observability & Monitoring** Prometheus metrics: withdrawal
success/failure rate, schedule execution lag per frequency type, method
type distribution, Stripe Financial Connections API latency, crypto
settlement timing per provider, magic link delivery success rate,
RabbitMQ event processing time. Structured logging schema. PagerDuty
alert triggers: negative balance, OFAC match, payout queue depth spike,
magic link delivery failure. Health check endpoint spec.

**PS-31 --- QA & Testing Guide** Unit tests per module. Integration
tests covering the full 6-step withdrawal flow in test environment.
Stripe test mode bank account numbers and scenarios. Magic link bypass
token for dev and test environments. Schedule execution simulation. KYC
tier mock per tier level. Crypto wallet mock for all 9 providers.
Auto-balance logic test matrix. All 24 error states covered with test
cases. Performance targets: withdrawal API under 150ms P95, balance read
under 100ms P95.

**PS-32 --- Security & Permissions** Contractor-only access enforcement
--- no client or other contractor can access another contractor\'s
payout data. Magic link token security: hashed storage, single-use
enforcement, 15-minute TTL, IP binding optional. Internal service token
for balance reads from earnings-service. Full audit log requirements for
all payout events. OFAC screening integration points. Rate limiting on
withdrawal attempts (max 5 per hour per contractor). PCI-DSS scope
boundary: Stripe handles all card data --- document exactly where
Marketeq\'s responsibility ends. Debit card security considerations.

**Earnings Service: 17 documents** (1 done, 16 to write) **Payout
Service: 32 documents** (0 done, 32 to write) **Total: 49 documents**

Tab 1

# **Earnings & Payouts --- Complete Technical Documentation Master List**

**97 deliverables total** \| 64 new \| 22 updates to existing \| 7
already done \| 4 already done and need minor updates

## **PHASE 0 --- Start Here (Write First)**

**CC-10 --- Epic Overview Doc** 🆕 Single document any engineer, PM, or
stakeholder reads before touching anything else. What the feature is,
why it exists, the three new services in plain English, how they relate
to each other and to existing services, the full money flow in plain
language, scope boundaries, glossary, link index to all child documents.

## **PHASE 1 --- Compliance & Legal Foundation (Write Before Any Schema or Code)**

**CC-08 --- Compliance & Regulatory Reference (Engineering Version)** 🆕
Written for engineers. How each regulation is implemented in code:
FinCEN BSA \$10K threshold logic, IRS 1099 \$600 threshold hold, OFAC
screening integration, NACHA ACH rules, Stripe Financial Connections
compliance scope, W-9/W-8BEN collection, jurisdiction-specific payout
timing rules.

**CC-08B --- Compliance & Regulatory Reference (Legal & Financial Expert
Version)** 🆕 Written for compliance officers and legal counsel. Not the
same as CC-08. Covers: all applicable regulatory obligations by
jurisdiction, AML/KYC requirements, fund holding legal obligations, wage
payment laws by US state, international contractor payment laws, tax
reporting obligations, what disclosures must appear in contractor Terms
of Service, audit trail requirements.

**CC-09 --- Fund Custody, Money Holding & Business Rules** 🆕 Where
contractor earnings are held before payout (Marketeq corporate Stripe
account balance). Legal classification of held funds. Contractor\'s
legal claim to the balance. Maximum holding periods. What happens to
held funds if a contract is disputed or cancelled. Interest on held
funds (none --- but must be disclosed). Unclaimed balance policy after
prolonged inactivity. Insolvency scenario. Jurisdiction-specific wage
holding laws. Reserve balance business rules (contractor-set, not
platform-imposed by default). All policies that must be published in
contractor Terms of Service.

## **PHASE 2 --- Schemas**

**ES-01 --- earnings-service Database Schema & Entities** 🆕 Target
PostgreSQL schema: earnings_cache table, balance_snapshots table,
fx_rate_cache table, contract_label_cache table. Full TypeORM entity
definitions, indexes, constraints, migration strategy.

**PS-01 --- payout-service Database Schema & Entities** 🆕 Target
schema: payout_requests, deposit_methods, payout_schedules,
deposit_method_verification, payout_audit_log tables. TypeORM entities,
enums (method types, payout status, schedule frequency), indexes,
constraints.

**KI-01 --- kyc-identity-service Database Schema & Entities** 🆕 Target
schema: identity_verifications, kyc_tier_status, tax_identity,
ofac_screening_log, document_uploads tables. Enums: verification_status,
kyc_tier, tax_form_type (W-9, W-8BEN).

**TT-U01 --- time-tracking-service: Billing Module Schema** 🆕 New
billing/ module. billing_periods entity: id, contractId, userId,
projectId, startTime, endTime, durationMinutes, screenshotIds\[\],
manualTimeIds\[\], status, idempotencyKey, billedAt.

**TT-U03 --- time-tracking-service: manual_time Schema Additions** 🆕
Add: contractId (required), idempotencyKey, durationMinutes (computed),
version. Migration spec.

**TT-U04 --- time-tracking-service: screenshots Schema Additions** 🆕
Add: contractId (nullable), isBillable (boolean, default true), billedAt
(timestamptz, nullable), idempotencyKey. Migration spec.

**US-U01 --- user-service: New Currency & KYC Fields** 🆕 Add to users
table: localCurrency (ISO 4217, auto-detected at signup, immutable),
displayCurrency (ISO 4217, defaults to localCurrency, user-editable),
kycTier (integer 0--3, written by kyc-identity-service). Migration spec.

**CS-U01 --- contracts-service: rateCurrency Field Addition** 🆕 Add
rateCurrency (varchar, ISO 4217) to contracts table and ContractInput
DTO. Captured from talent\'s displayCurrency at contract creation.
Immutable after activation. Update existing entity doc, migration spec,
API docs.

**CC-11 --- Global Bank Schema Reference --- Manual Entry (All
Countries)** 🆕 Complete field requirements for manual bank account
entry for every country with unique banking fields. Not just the 7 in
the designs --- every country. Field names, formats, validation rules,
character limits, example values, required vs optional per country.
Flags countries where international wire is the only option. Used by
PS-06 and frontend form rendering to determine which fields to show per
country selection.

**CC-05 --- Data Dictionary --- Earnings & Payouts** 🆕 Every field name
used across all services in this feature: data type, constraints, which
service owns it, which services read it, display format rules (e.g.
always round to nearest whole unit for display --- never show decimals
to users), example values. Single source of truth. Prevents field naming
drift.

## **PHASE 3 --- Core Logic & RabbitMQ**

**ES-04 --- earnings-service: RabbitMQ Consumer Implementation** 🆕
Consumer module for all inbound events: transaction.created,
transaction.reversed, payout.completed, payout.failed,
contract.activated. Handler logic, idempotency enforcement, dead-letter
queue config, retry policy.

**ES-05 --- earnings-service: RabbitMQ Publisher Implementation** 🆕
Publisher for outbound events: earnings.balance.updated,
earnings.threshold.reached. Payload schemas, when each fires, consumer
expectations.

**ES-06 --- earnings-service: Currency Conversion Implementation** 🆕
Self-hosted fawazahmed0/exchange-api integration. Redis FX rate cache
layer (1-hour TTL). displayCurrency vs localCurrency logic. Conversion
calculation. Fallback when FX API is unavailable. Rounding rules
(nearest whole unit, no decimals to users).

**ES-07 --- earnings-service: Redis Caching Strategy** 🆕 Balance cache
key schema (balance:{userId}), TTL settings, invalidation triggers per
event type, cold-start behaviour, Redis unavailability fallback.

**PS-02 --- payout-service: Withdrawal Flow --- API & Logic** 🆕 Full
6-step flow: amount entry → speed selection (instant \$1.75 vs standard
free) → method selection → review → magic link verification → execution.
State machine for withdrawal lifecycle. Idempotency requirements.

**PS-03 --- payout-service: Deposit Schedule --- API & Logic** 🆕
Frequency options (daily, weekly, bi-weekly, monthly, custom). Minimum
payout threshold (\$50--\$1000+). Reserve balance config (off by
default, max \$250). Split payout with percentage allocation. Schedule
execution engine.

**PS-12 --- payout-service: Paused Payouts & Alert System** 🆕
Conditions that pause payouts. Persistent banner alert logic. Alert
content and CTA per condition. Resume logic per condition.

**PS-16 --- payout-service: Deposit Schedule Execution Engine** 🆕 Cron
job spec: schedule frequency to cron expression mapping, execution
windows, skip logic (balance \< minimum), split execution order, partial
failure handling, atomic execution requirements.

**KI-02 --- kyc-identity-service: KYC Tier System --- Logic & Rules** 🆕
Tier 0--3 defined. Requirements per tier. What each tier gates. Upgrade
flow. How facial recognition from time-tracking maps to Tier 1.
First-payout 5-business-day hold logic. \$10K single-transaction
enhanced due diligence trigger.

**TT-U02 --- time-tracking-service: RabbitMQ Publisher Module** 🆕 New
time-events.publisher.ts. All 6 events: timetracking.hours.logged
(canonical payload --- full spec), timetracking.hours.adjusted,
timetracking.hours.voided, timetracking.manual.submitted,
timetracking.manual.approved, timetracking.manual.rejected. Exchange
config, routing keys, retry policy.

**TT-U05 --- time-tracking-service: Deletion Billing Impact Logic** 🆕
Update DELETE /api/screenshots/:id to check deletedNonBillable setting.
If true and screenshot already billed, publish
timetracking.hours.voided. Full decision tree.

**TT-U06 --- time-tracking-service: Blur Billing Impact Logic** 🆕 Same
pattern as TT-U05 but for blur action vs blurredBillable setting.

**TT-U07 --- time-tracking-service: Desktop Agent contractId Update** 🆕
Add contractId to screenshot upload payload and DTO.

**TT-U08 --- time-tracking-service: Rate Lookup Integration** 🆕 How
time-tracking-service fetches locked hourlyRate and rateCurrency from
contracts-service at billing period approval. Caching strategy. Fallback
if contracts-service unavailable.

**TT-U09 --- time-tracking-service: FX Rate Snapshot at Billing Time**
🆕 How time-tracking-service calls the self-hosted fawazahmed0 FX API at
the moment of publishing timetracking.hours.logged to snapshot the rate.
Snapshot lives in the event payload and in the ledger entry --- not in
time-tracking-service\'s own DB.

**TS-U01 --- transaction-service: New Consumer ---
timetracking.hours.logged** 🆕 Handler, idempotency check, CREDIT ledger
entry creation, transaction.created publisher, dead-letter routing for
malformed payloads.

**TS-U02 --- transaction-service: New Consumer ---
timetracking.hours.voided** 🆕 Voiding events → DEBIT reversal entry
against original CREDIT. Idempotency. Publish transaction.reversed.

**TS-U03 --- transaction-service: New Consumer ---
timetracking.hours.adjusted** 🆕 Adjusted billing periods → adjustment
CREDIT/DEBIT pair. Idempotency key uses {entryId}:{version}.

**TS-U04 --- transaction-service: New Publisher --- transaction.created
/ transaction.reversed** 🆕 Publish transaction.created after every new
CREDIT. Publish transaction.reversed after every compensating entry.
Payload schemas.

**TS-U05 --- transaction-service: Aggregation Endpoints for
earnings-service** 🆕 New internal read-only endpoints: GET
/v1/internal/ledger/:userId (paginated, filterable), GET
/v1/internal/balance/:userId (raw SUM for cache cold-start). Internal
service token auth only.

**US-U02 --- user-service: Currency Settings Endpoint** 🆕 PATCH
/v1/users/me/currency. Validation, response schema, earnings-service
cache invalidation trigger.

**US-U03 --- user-service: Role Switching Logic** 🆕 Document existing
behaviour. One table, one email, role field. JWT re-issued on switch.
Earnings balance persists across role switches, not visible when logged
in as client. First-time switch triggers onboarding.

**CC-04 --- RabbitMQ Exchange & Routing Key Master Registry** 🆕 Single
source of truth for all RabbitMQ exchanges, routing keys, publishers,
and consumers across all earnings/payouts services. Queue names,
dead-letter exchange config, message TTL, consumer group names, retry
policy per queue.

**CC-06 --- Self-Hosted FX API Setup Guide** 🆕 Complete setup for
self-hosted fawazahmed0/exchange-api: deployment config, Redis caching
integration, failover behaviour, monitoring, how to update when
currencies are added.

## **PHASE 4 --- Third-Party Integrations**

**PS-04 --- payout-service: Deposit Method Management --- API** 🆕 Full
CRUD for deposit methods. Method types: bank (Stripe Financial
Connections or manual), PayPal, Wise, Payoneer, crypto wallet. Endpoint
specs, status enum (unverified, verified, reauth_required,
verification_expired).

**PS-05 --- payout-service: Stripe Financial Connections Integration**
🆕 Complete setup: hosted flow for US bank linking, instant verification
via OAuth login, fallback to Stripe-native microdeposit for unsupported
banks. Webhook handling. No Plaid anywhere. Bank ownership verification
for US accounts.

**PS-06 --- payout-service: Manual Bank Entry --- International (7
Regions from Designs)** 🆕 Validation and form logic for the 7 regions
shown in designs: US, Europe, India, Australia, UK, Japan, Asia generic.
Field-level validation rules per region. References CC-11 for full
global coverage.

**PS-07 --- payout-service: Micro-Deposit Verification Flow** 🆕 Two
micro-deposit amounts, 2 business day wait, 3-attempt limit, 24-hour
lock on failure, 10-day expiry, re-add flow on expiry. Stripe API calls,
webhook handling, DB state updates.

**PS-08 --- payout-service: Third-Party OAuth Methods (PayPal, Wise,
Payoneer)** 🆕 OAuth 2.0 flow for each provider: redirect → login →
callback → token storage. Token refresh, REAUTH_REQUIRED state,
notification trigger on expiry.

**PS-09 --- payout-service: Crypto Wallet Connection** 🆕 9 supported
providers: Ramp, Transak, Crypto.com, Coinbase, Metamask, Ledger,
Trezor, Kraken, Binance. 3 connection methods: manual address,
WalletConnect QR (5-min TTL), paste link. Address format validation per
network.

**PS-10 --- payout-service: Magic Link Email Verification** 🆕
Single-use token, 15-minute TTL, SendGrid via notification-service,
used/expired state handling, token stored hashed, retry flow.

**PS-11 --- payout-service: KYC-Identity Gating** 🆕 How payout-service
calls kyc-identity-service. Payout eligibility screen content per tier.
First-payout hold logic. \$10K enhanced due diligence trigger.

**PS-13 --- payout-service: RabbitMQ Events** 🆕 Published:
payout.initiated, payout.completed, payout.failed,
payout.scheduled.skipped. Consumed: earnings.balance.updated (balance
check before withdrawal). Full payload schemas.

**KI-04 --- kyc-identity-service: Tax Identity Collection** 🆕 US W-9
(SSN/ITIN), \$600 YTD threshold trigger, international W-8BEN. Secure
storage in Cloudflare R2, encrypted field storage for SSN/ITIN. 1099
generation trigger (MVP flag only). IRS threshold hold logic.

**KI-05 --- kyc-identity-service: OFAC Screening Integration** 🆕
Automated screening at account creation and every payout attempt.
Positive match handling (generic \'under review\' --- not OFAC-specific
to contractor). False positive clearing by ops. Vendor API integration
spec.

**KI-06 --- kyc-identity-service: Document Storage (Cloudflare R2)** 🆕
Upload spec: file type restrictions, size limits, R2 bucket structure,
pre-signed upload URLs, retention policy. Admin-only access via signed
URLs with audit log. Never expose raw document URLs to contractor.

**CC-12 --- Crypto Wallet & Platform Integration --- Per-Provider
Specs** 🆕 Per provider (all 9): connection method(s) supported,
provider-specific API or SDK, authentication flow, address format
validation per network, supported tokens, connection status polling or
webhook, re-connection flow on expired session.

**CC-13 --- Crypto Payout Settlement --- Technical Spec** 🆕 How money
moves from Marketeq Stripe corporate balance to contractor crypto
wallet. Fiat-to-crypto conversion flow. Which providers handle
conversion (Ramp/Transak as on-ramp bridges). Gas fee handling and who
pays. Settlement timing per provider. Failed transaction handling.
Minimum payout amounts per token. Which tokens are supported for payout
vs display only. Regulatory classification of crypto payouts by
jurisdiction.

**NS-U01 --- notification-service: New Events --- Earnings & Payouts**
🆕 Register all new events: payout.completed, payout.failed,
payout.scheduled.skipped (3 consecutive misses only), payouts.paused,
magic_link.verification, kyc.tier.required, kyc.document.expiring,
earnings.threshold.reached, export.ready.

**NS-U02 --- notification-service: Email Templates** 🆕 Template specs:
magic link email, payout confirmation, payout failed, export ready, KYC
document expiring. Subject lines, body structure, CTA buttons, timing
rules.

**NS-U03 --- notification-service: In-App Notification Specs** 🆕 Toast
specs: position, auto-dismiss timing (5 sec success, persistent errors),
all variants. Persistent banner: location, content per pause condition,
dismiss behaviour. Real-time delivery via Ably per user.

## **PHASE 5 --- API Specs, Error States & Edge Cases**

**ES-02 --- earnings-service: REST API --- Contractor-Facing** 🆕 Full
OpenAPI spec: GET balance, GET earnings history (paginated, filtered,
sorted), GET earnings summary cards (daily/weekly/monthly/all-time), GET
single earnings entry detail. Request/response schemas, HTTP status
codes, auth requirements.

**ES-03 --- earnings-service: REST API --- Internal
(Service-to-Service)** 🆕 Internal endpoints: GET
/internal/balance/:userId (for payout-service), GET
/internal/ytd/:userId (for kyc-identity-service). Service auth header,
rate limiting.

**ES-09 --- earnings-service: Error States & HTTP Error Catalog** 🆕
Every error: auth failures, contractor not found, balance not yet
calculated, FX API unavailable, export too large, invalid date range,
currency not supported. Per error: HTTP code, error code string,
user-facing message, recovery action.

**ES-10 --- earnings-service: Edge Cases & Data Limitations** 🆕 \$0
balance display, first-time contractor with no earnings, FX cache miss,
very large history (50,000+ records), mid-request displayCurrency
change, concurrent balance reads during payout, YTD threshold breach
timing.

**PS-14 --- payout-service: Error States & HTTP Error Catalog** 🆕 Every
error: INSUFFICIENT_FUNDS, INSUFFICIENT_FUNDS_AFTER_FEE, BELOW_MINIMUM,
RESERVE_TOO_LOW, METHOD_UNVERIFIED, METHOD_NOT_FOUND, KYC_INCOMPLETE
(per tier), MAGIC_LINK_EXPIRED, MAGIC_LINK_USED, NETWORK_FAILURE,
ACCOUNT_SUSPENDED, SPLIT_NOT_100, INVALID_AMOUNT. Per error: HTTP code,
error string, user-facing message, recovery CTA.

**PS-15 --- payout-service: Edge Cases & Data Limitations** 🆕 Race
condition on simultaneous withdrawals, fee leaving \$0 balance, reserve
blocking withdrawal with override option, split percentage decimal
rounding tolerance (±0.01%), removing only account, removing default
account (split reset + pause), max connected accounts, OAuth token
mid-flow expiry, WalletConnect QR expiry, Stripe Financial Connections
session expiry, TEQ Coin feature flag (off for MVP).

**KI-07 --- kyc-identity-service: REST API Endpoints** 🆕 GET
/v1/kyc/status/:userId, POST /v1/kyc/document, POST
/v1/kyc/tax-identity, GET /v1/kyc/eligibility (consumed by
payout-service), admin endpoints for flag review and clearing.

**KI-08 --- kyc-identity-service: Error States & Edge Cases** 🆕 Vendor
downtime, document expiry, false positive OFAC, non-US W-8BEN flow,
\$10K enhanced due diligence, simultaneous verification from two
devices.

**CC-01 --- Master Error State Catalog --- All Services** 🆕 Complete
cross-service catalog: service owner, HTTP code, internal error code
string, user-facing message, user-facing recovery action, backend
recovery action. Written after all individual API spec docs are
complete.

**CC-02 --- Master Edge Cases & Data Limitations** 🔄 Update existing
Already exists (96 cases). Update needed: remove Plaid references, add
Stripe Financial Connections session expiry case, add rateCurrency gap
resolution.

## **PHASE 6 --- User Stories & Acceptance Criteria**

**CC-14 --- User Stories --- Admin Flows** 🆕 Stories for all
admin-facing flows: reviewing flagged payouts, clearing OFAC flags,
approving manual time (billing impact), managing contractor KYC tier,
viewing contractor earnings for support, overriding paused payouts,
accessing export logs. \'As an admin, I want\...\' format with numbered
testable acceptance criteria.

**CC-15 --- User Stories --- Edge Cases (Given/When/Then Format)** 🆕
All 96 edge cases rewritten as formal user stories with acceptance
criteria in Given/When/Then format. Covers every P1 and P2 edge case.
These are the stories QA uses to write test cases.

**CC-16 --- User Stories --- Notification Flows** 🆕 All notification
touchpoints as user stories with acceptance criteria covering delivery
timing, content accuracy, fallback behaviour, dismiss/action flows.

## **PHASE 7 --- Frontend, QA & Monitoring**

**ES-08 --- earnings-service: Earnings Export (CSV & PDF)** 🆕
Synchronous export under 5,000 rows: immediate download. Async export
over 5,000 rows: queued job, Cloudflare R2 storage, download link via
notification-service, 24-hour link expiry.

**ES-11 --- earnings-service: Frontend Integration Guide** 🆕
Endpoint-by-UI-component mapping for Earnings tab. Polling vs Ably
real-time strategy for live balance. Loading states, empty states per
component, error state display per component.

**ES-12 --- earnings-service: Observability & Monitoring** 🆕 Prometheus
metrics (balance cache hit/miss rate, FX refresh latency, event
processing time), structured logging schema, alerting thresholds, health
check endpoint spec.

**ES-13 --- earnings-service: QA & Testing Guide** 🆕 Unit test coverage
requirements, integration test scenarios (event → balance update), E2E
test flows, test data seeding, RabbitMQ event simulation in test
environment, edge case test matrix.

**PS-17 --- payout-service: Frontend Integration Guide** 🆕
Endpoint-by-UI-component mapping for all payout screens: Overview Direct
Deposit panel, Payouts tab, Withdraw Funds 6-step modal, Deposit
Schedule, Add Deposit Method (all types), method management. Loading
states, empty states, error display per component. Real-time feedback
via Ably on payout completion.

**PS-18 --- payout-service: Observability & Monitoring** 🆕 Prometheus
metrics (withdrawal success/failure rate, schedule execution lag, method
type distribution, Stripe API latency), PagerDuty alert triggers
(negative balance, OFAC match, payout queue depth), health check
endpoint spec.

**PS-19 --- payout-service: QA & Testing Guide** 🆕 Unit tests per
module, integration tests (full withdrawal flow in test env), Stripe
test mode bank numbers, test magic link bypass for dev, schedule
execution simulation, KYC tier mock, crypto wallet mock. Test matrix
covering all error states and edge cases.

**KI-09 --- kyc-identity-service: QA & Testing Guide** 🆕 KYC tier
simulation, vendor sandbox credentials, OFAC test cases, tax identity
validation tests, document upload tests (valid/invalid types, oversized
files).

**CC-03 --- Complete UX States Not Present in Designs** 🆕 Every UI
state required but not shown in design files: all empty states (zero
balance, no history, no upcoming payout, no connected accounts, no
activity in date range), all loading states per component, all error
states per component, paused payouts alert banner, payout eligibility
gate screens (all 3 KYC tiers), first-time user states.

**CC-07 --- Money Flow Diagram --- End to End** 🆕 Visual and written
description of every path money takes: client pays → billing-service →
time-tracking-service → transaction-service → earnings-service →
payout-service → contractor\'s bank. All failure paths and compensating
actions included.

**CC-18 --- Frontend Integration Master Guide** 🆕 Aggregated guide
across all earnings and payouts screens. API call sequence diagrams,
state management recommendations, Ably real-time channel setup, error
handling patterns, loading skeleton specs, currency display rounding
rules.

**CC-19 --- QA Master Test Plan** 🆕 End-to-end test plan for the full
feature. Test environment setup, test data seeding, critical path test
cases, regression suite, performance targets (balance API \<100ms P95,
earnings list \<200ms P95), crypto payout sandbox, KYC simulation,
Stripe test mode configuration.

## **PHASE 8 --- Security, Deployment & User Docs**

**ES-14 --- earnings-service: Security & Permissions** 🆕 Contractor
data isolation rules, JWT claim validation per endpoint, internal
service token rotation, rate limiting, audit log requirements for admin
access.

**KI-03 --- kyc-identity-service: Payout Eligibility Gate --- UX Spec**
🆕 Exact screens shown to contractors who attempt to withdraw before
completing each KYC tier. Screen content, CTAs, progress indicators,
what is already verified vs pending. Separate UX requirements doc ---
not in the main design files.

**PS-20 --- payout-service: Security & Permissions** 🆕 Contractor-only
access enforcement, magic link token security (hashed, single-use, TTL),
internal service token, audit log for all payout events, OFAC screening
integration, rate limiting on withdrawal attempts (max 5/hour), PCI-DSS
scope boundary (Stripe handles card data --- document where Marketeq\'s
scope ends).

**CC-17 --- Deployment & Infrastructure Guide** 🆕 Deploy all new
services alongside existing. Environment variable management per
environment (dev/staging/prod), RabbitMQ queue and exchange setup, Redis
config, Cloudflare R2 bucket setup, self-hosted FX API deployment,
service discovery, health check integration.

**CC-20 --- User-Facing Help Documentation** 🆕 Plain-language
contractor guide: how earnings are calculated, why a payout might be
delayed, what identity verification is needed and why, how to add a bank
account (all methods), how to set up a deposit schedule, what the
reserve balance is, how split payouts work, how to read earnings
history, what happens if a payout fails, how to contact support. No
technical jargon.

## **Already Done ✅**

  **Doc**               **Title**                                              **Notes**
  --------------------- ------------------------------------------------------ -------------------------------
  ES-00                 earnings-service --- Service Overview & Architecture   Complete
  TS-00 through TS-06   transaction-service full doc series                    Complete
  TT-01 through TT-20   time-tracking-service full doc series                  Updates only needed
  CS-01 through CS-09   contracts-service full doc series                      One field addition needed
  ---                   earnings-payouts-user-stories.docx                     54 stories, 34 gaps flagged
  CC-02                 earnings-payouts-edge-cases.docx                       96 cases, minor update needed
  ---                   time-tracking-alignment.docx                           Full gap analysis complete

## **Count Summary**

  ----------------------------------------------------------------
  **Area**                **New**   **Updates**   **Total**
  ----------------------- --------- ------------- ----------------
  earnings-service        14        0             14

  payout-service          21        0             21

  kyc-identity-service    9         0             9

  time-tracking-service   0         9             9

  transaction-service     0         5             5

  user-service            0         3             3

  contracts-service       0         1             1

  notification-service    0         3             3

  Cross-cutting           20        1             21

  **Total**               **64**    **22**        **86
                                                  deliverables**
  ----------------------------------------------------------------
