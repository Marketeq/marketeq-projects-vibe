# payout-service Doc-vs-Code Audit Findings

Audit of `docs/Payout/Payout Service — Final/` (PS-00 through PS-41) against the
actual `backend/apps/payout-service` implementation. Covers PS-09 through PS-41
(PS-31 QA/Testing Guide not included — it's a test-strategy doc, not an
implementation spec). PS-00 through PS-08 were not separately re-audited in this
pass; PS-08 is void per the INDEX doc.

Status key: **FIXED** = corrected in code this pass. **OPEN** = confirmed gap,
not yet fixed — reason given per item. **CORRECT** sections are omitted here;
see this doc for gaps only.

All fixes below are committed locally on `fix/payout-service-missing-rabbitmq-events`
but **not yet opened as a PR**.

---

## PS-09 v2.0 — Third-Party OAuth Methods (Wise & Payoneer)

| # | Finding | Status |
|---|---|---|
| 1 | `OAUTH_TOKEN_ENCRYPTION_KEY` silently fell back to `crypto.randomBytes(32)` on every restart if missing/malformed, invisibly invalidating every stored Wise/Payoneer token. Doc explicitly warns against this failure mode. | **FIXED** — `oauth.service.ts` now throws on boot instead. |
| 2 | OAuth callback redirected to `/earnings?tab=payouts`, doc specified `/settings/payouts` (a route that doesn't exist in the real frontend, per code comment citing AC-07.03/07.04). | **FIXED** — updated the PS-09 docx itself to match the correct, already-live redirect. |

Also found and fixed the same encryption-key bug in two more places (not PS-09
specifically, but the identical pattern):
- `BANK_ENCRYPTION_KEY` (`methods/bank-encryption.service.ts`)
- `CRYPTO_ADDRESS_ENCRYPTION_KEY` (`crypto/crypto-connection.service.ts`)

---

## PS-10 / PS-11 — Crypto Wallet Connection (All 9 Providers / Per-Provider Spec)

Connection/session side only (execution/settlement side is PS-12, see below).

| # | Finding | Status |
|---|---|---|
| 1 | **WalletConnect v2 is entirely mocked.** `crypto-connection.service.ts` builds a fake WC URI from `crypto.randomUUID()` — no `@walletconnect/sign-client` or relay integration exists anywhere. A session can never reach `connected`; it can only expire or be manually rejected. Breaks the QR/paste-URI flow for 6 of 9 providers (Transak, Crypto.com, Coinbase, MetaMask, Ledger, Binance). | **OPEN** — real SDK integration, not a quick fix. |
| 2 | `WALLETCONNECT_PROJECT_ID` (doc: "required for WalletConnect v2 sessions") is never read anywhere in code. | **OPEN** — consequence of #1. |
| 3 | No relay/webhook endpoint exists to deliver a wallet's WalletConnect approval back to payout-service — `handleWalletConnectApproval()` is dead code, never called from any controller/consumer. | **OPEN** — consequence of #1. |
| 4 | Coinbase's Solana WalletConnect chainId is dropped (`provider-registry.ts` marks it manual-only; doc lists a WC chainId for it). | **OPEN** — minor, tied to #1. |
| 5 | Crypto.com has an undocumented Solana entry in `provider-registry.ts` — doc's initial-release scope for Crypto.com is ETH/USDC/BNB only. | **OPEN** — minor scope drift. |
| 6 | fawazahmed0 conversion-rate URL is missing the `/latest/` path segment the doc's own code sample specifies. | **OPEN** — minor, cosmetic (still functions, just not the documented path). |
| 7 | `ERR_CRYPTO_ADDRESS_NETWORK_MISMATCH`, `ERR_WALLETCONNECT_REJECTED`, `ERR_LEDGER_LIVE_VERSION` are documented error codes never thrown anywhere — consequence of #1 (no real handshake to fail). | **OPEN** — consequence of #1. |

Confirmed correct: per-network address regex validation (incl. EIP-55 checksum,
Tron `T`-prefix, Bech32), 5-method limit, AES-256-GCM address encryption,
immediate `VERIFIED` status (no fake micro-deposits), Transak's real fee-inclusive
quote API.

---

## PS-12 — Crypto Payout Settlement (Technical Spec)

Only 1 of 9 providers executes a real, automated payout.

| # | Finding | Status |
|---|---|---|
| 1 | **Ramp**: no real server-to-server "send crypto to address" API exists (confirmed against Ramp's actual public docs — only quotes/widget). | **FIXED (honesty, not automation)** — code builds a real, valid widget URL and reports `awaiting_manual_completion` instead of fabricating a fake `providerTxId`. A human must still complete the widget checkout; this cannot be automated with Ramp's current product. |
| 2 | **Transak**: has a real disbursement mechanism (Off-Ramp Stream / Create Order API), but `TRANSAK_API_SECRET` (required for request signing per PS-11 §3.2) isn't in `.env` — only `TRANSAK_API_KEY` is. Code returns a fake `transak_xxxxxxxx` ID with zero API call. | **OPEN** — needs the missing secret before it can be built for real. |
| 3 | **Crypto.com**: doc says "Crypto.com Pay Checkout API for payout execution" — this is the wrong product. Crypto.com Pay Checkout is a *merchant receives crypto from a customer* API; there is no send-to-arbitrary-address endpoint. Cannot be built as documented regardless of credentials. `CRYPTO_COM_API_KEY` in `.env` is also a placeholder, not real. | **OPEN** — architecturally wrong API named in the doc; needs a product decision, not code. |
| 4 | **Coinbase**: same problem — "Coinbase Commerce API for payout execution" is also a merchant-receives-money product, receive-only. A real send-capable Coinbase product exists (Coinbase Business / Payment Link APIs, `docs.cdp.coinbase.com`) but is a different API surface entirely from what's referenced/configured. `COINBASE_COMMERCE_API_KEY` is also a placeholder. | **OPEN** — same as #3. |
| 5 | **MetaMask, Ledger, Trezor, Kraken, Binance** (direct EVM transfer): no treasury wallet exists at all — no Web3 client, no private key/signer, nothing. This is infrastructure that has to be built from scratch, including a custody/key-management strategy. | **OPEN** — needs a security/compliance decision (HSM, KMS, multisig, etc.) before any code, per explicit prior direction not to build this speculatively. |

`bridge-selector.service.ts` (which bridge to route to per wallet/network/token)
and `crypto-payout-executor.service.ts` (pre-flight checks, gas estimation,
OFAC/Chainalysis screening) are both correctly, fully implemented and match the
doc closely — the gap is entirely in the underlying provider API calls listed
above, not the orchestration around them.

---

## PS-13 — Marketeq Debit Card (Setup & Integration)

Doc itself is marked "Version 0.9 — DESIGN INCOMPLETE / BLOCKED" but the backend
was built anyway and is substantial (issuance, activation, freeze/unfreeze,
lost/stolen replacement, cancel, push-to-card payout execution all exist and are
wired into the queue processor).

| # | Finding | Status |
|---|---|---|
| 1 | Activation only checks last4 — doc requires last4 + CVV2 validated against Stripe's card object (`stripe.issuing.cards.retrieve(id, { expand: ['number'] })`). | **OPEN** — deliberately not built. Retrieving raw PAN/CVV via `expand:['number']` requires special PCI-scoped Stripe account permissions; implementing this without confirming the account has that capability risks building something that can't work, or building it insecurely. Needs a decision from whoever owns the Stripe account's PCI posture. |
| 2 | Geo-block (US-only in v1) is a dormant no-op — `kycResult.contractorCountry` is never populated by kyc-identity-service, so the check never fires. | **OPEN** — same missing-field pattern as the crypto OFAC country check; blocked on an upstream service field. |
| 3 | Card funding (`card-payout-executor.service.ts`) calls `stripe.testHelpers.issuing.cards.fundCard(...)` inside the branch labeled "production" — this is a Stripe test-mode-only API, doesn't exist against a live key. | **OPEN** — doc itself flags the real funding mechanism as unresolved/TBD; not a code bug so much as an unfinished product decision. |
| 4 | No `issuing_transaction.created` webhook handler exists — doc specifies settlement confirmation via this webhook; code instead resolves synchronously inline in the executor. | **OPEN** — functionally works today (synchronous), but diverges from the documented async/webhook design. |
| 5 | Weekly/monthly/per-transaction/ATM spending limits are set at Stripe on card creation but not persisted locally, and there are no admin-override endpoints for them. | **OPEN** — admin UI feature, out of backend-only scope. |
| 6 | `FEATURE_DEBIT_CARD_ENABLED` env var gates both card issuance and deposit-method creation but wasn't documented in any `.env.*.example`. | **FIXED** — added to `.env.local.example`. |

---

## PS-14 — Magic Link Email Verification

| # | Finding | Status |
|---|---|---|
| 1 | `magic_link_verifications` table (backs every read/write in `magic-link.service.ts`) has no migration file anywhere in the repo — only the older, now-orphaned `magic_link_tokens` table (PS-01 schema) has one. Table already exists in the shared dev/staging DB (created out-of-band at some point), so nothing is actively broken today, but a fresh environment running migrations from scratch cannot reproduce it. | **FIXED** — added `011_magic_link_verifications.sql`, matching the live schema exactly (verified column-by-column against the actual DB). |
| 2 | `MagicLinkToken` entity/repo (the real PS-01 `magic_link_tokens` table) is still wired into `magic-link.module.ts`/injected into the service constructor but never read or written anywhere. | **OPEN** — dead code, low priority cleanup. |
| 3 | An undocumented 30-second resend cooldown (`ERR_MAGIC_LINK_RESEND_COOLDOWN`, 429) exists in code with no mention in PS-14 (doc only specifies the 3-resend cap). Not necessarily wrong behavior, just an API contract the doc doesn't tell frontend/QA to expect. | **OPEN** — doc should be updated to mention it; not a code issue. |

---

## PS-15 — KYC-Identity Gating

Structurally scaffolded but materially incomplete.

| # | Finding | Status |
|---|---|---|
| 1 | KYC client contract mismatch: doc specifies `GET /internal/kyc/gate-status/:contractorId` with a nested `tier1/tier2/tier3` response; code calls `GET /v1/internal/kyc/status/:userId` returning a flat shape with no per-tier breakdown. | **OPEN** — real contract divergence between payout-service and kyc-identity-service; needs alignment on both sides. |
| 2 | **Tier 1 (government ID) and Tier 2 (tax identity/SSN/ITIN/W-8BEN) hard blocks are unimplemented no-ops** — code comments admit "In dev mode... we treat as verified" / "In dev mode, skip." Only Tier 3 (bank-ownership) and the first-payout hold are real checks. | **OPEN** — substantial compliance gap; needs kyc-identity-service to actually expose tier1/tier2 status first. |
| 3 | Doc's tiered error codes (`ERR_KYC_TIER1_REQUIRED`/`TIER2_REQUIRED`/`TIER3_REQUIRED`) don't exist; code uses a different, non-tiered taxonomy (`ERR_KYC_NOT_STARTED`/`IN_REVIEW`/`REJECTED`) that can't distinguish which tier blocked a contractor. | **OPEN** — tied to #1/#2. |
| 4 | "Magic link re-verification required after EDD approval" (doc §6.2/§6.3) is not implemented — `releaseEDD()` moves straight to `QUEUED`/`enqueueForProcessing()` with no fresh magic-link step. | **OPEN** — real compliance-relevant gap. |
| 5 | Admin waiver endpoint (`POST /internal/admin/contractors/:id/waive-first-hold`) — `KycGateService.waiveFirstPayoutHold()` exists but has zero call sites, no controller route. | **OPEN** — dead code, needs an admin route built. |
| 6 | `recheckKycAtExecution()`/`recheckBalanceAtExecution()` (PS-19 execution-time re-checks) existed fully built with zero callers anywhere in the codebase. | **FIXED** — wired into `PayoutQueueProcessor` right before dispatching to an executor. |

---

## PS-16 — Paused Payouts & Alert System

Condition logic and banner copy match the doc closely; the gap was enforcement.

| # | Finding | Status |
|---|---|---|
| 1 | `assertNotPaused()` was only called from the scheduled-payout cron — manual withdrawal initiation (`PayoutService.initiate()`) never called it at all, silently skipping the `NO_DEFAULT_METHOD`/`DEFAULT_METHOD_DEACTIVATED` conditions (the two with no separate inline check). Doc's own pseudocode places this call "at the top of `PayoutInitiator.initiate()`." | **FIXED** — now called at the top of `initiate()`. |
| 2 | `providerLabel()` maps only WISE/PAYONEER; doc also lists a PayPal label — but `MethodType` has no PAYPAL value at all in this codebase (correctly removed per PS-32), so this is likely just stale doc text, not a real gap. | **OPEN (likely doc-stale, not code)** — flagged for doc cleanup, not code. |

All 5 pause conditions, priority order, banner copy, the `GET /v1/payouts/pause-status`
endpoint, and scheduled-payout gating (both KYC and pause, for primary and split/secondary
methods) are confirmed correct.

---

## PS-17 v2.0 — Deposit Schedule Execution Engine

**No gaps found.** The "critical rewrite" the doc describes (ACH arrival-day
back-calculation vs. non-ACH initiation-day semantics, daily-frequency block for
non-ACH methods) is fully and correctly implemented, in some respects exceeding
the doc's own reference pseudocode (e.g. a fully-enumerated exact holiday-date
list instead of the doc's approximate MM-DD reference). Two trivial, non-blocking
notes:
- `dayOfWeek` out-of-range validation returns a generic NestJS 400 instead of the
  doc's `ERR_SCHEDULE_INVALID_DAY_OF_WEEK`/422 shape.
- International `BANK_MANUAL` is deliberately treated as non-ACH (a documented,
  reasoned extension beyond PS-17 v2.0's literal text, citing PS-34/PS-41).

---

## PS-33 — Stripe Integration Spec (Exact Products, Endpoints & Implementation)

| # | Finding | Status |
|---|---|---|
| 1 | **Connect account type mismatch**: doc specifies `type: 'express'` (Stripe-hosted onboarding dashboard); code creates `type: 'custom'` with none of the doc's required fields (`individual`, `business_profile`, `tos_acceptance` — the last one is documented as mandatory before payouts and is never set anywhere). Custom vs Express is a different product surface with different onboarding/compliance ownership. | **OPEN, explicit decision made to build on Custom as-is** — the PS-34 international-bank fix (below) was deliberately built on top of the existing Custom account type rather than blocking on this larger architecture question. |
| 2 | The doc's mandatory `PaymentIntent` step (§3.1, `POST /v1/payment_intents` with `application_fee_amount`/`transfer_group`, meant to live at `src/payments/stripe-payment.service.ts`) doesn't exist anywhere in payout-service. The Transfer call also omits `source_transaction`/`transfer_group`. | **OPEN** — plausibly belongs to checkout-service (client payment collection), but needs a person to confirm; not assumed away. |
| 3 | Webhook signature-verification failure returned HTTP 200 (`{ received: false }`), contradicting the doc's own stated "Stripe will NOT retry on 4xx" contract — a rotated `STRIPE_WEBHOOK_SECRET` would silently drop real events forever instead of Stripe retrying/surfacing the failure in its Dashboard. | **FIXED** — now throws `BadRequestException` (400). |
| 4 | Issuing card funding uses `stripe.testHelpers.issuing.cards.fundCard(...)` — a test-mode-only Stripe API — inside the code branch labeled "production." | **OPEN** — same item as PS-13 finding #3 above; real funding mechanism was never resolved. |

Confirmed correct: full webhook event set, idempotency key patterns
(`transfer-{id}`, `payout-{id}`, `extaccount-{id}`), pinned API version via
`STRIPE_API_VERSION`, `Stripe-Account` header correctly set on `payouts.create`.

---

## PS-34 — International Payout Architecture (Direct Local Bank & Wise)

| # | Finding | Status |
|---|---|---|
| 1 | **UK/SEPA/AU/CA bank verification was still running the deprecated fake micro-deposit flow** (PS-08 — explicitly voided by PS-34, "do not implement any part of it") because the Stripe non-US `external_account` field mapping (sort code/IBAN/BSB/institution+transit) was never specified in either PS-33 or PS-34. | **FIXED** — got the exact mapping directly from Stripe's own API reference (not guessed): GB sort code and AU BSB go in `routing_number`; SEPA countries pass the IBAN as `account_number` with `routing_number` omitted; Canada's `routing_number` is `"0" + institution(3) + transit(5)` (confirmed via the standard CPA EFT routing-number format). Wired end-to-end — see below. |
| 2 | `StripeKycService.submitDob()` existed, fully correct, zero callers. | **FIXED** — now called from `methods.service.ts`'s international-bank branch. |
| 3 | `handleAccountUpdated()`'s transfers-active / escalation-to-ID logic existed, fully correct, but was unreachable because nothing ever put a method into the PENDING-with-DOB-submitted state it expects. | **FIXED** — now reachable, since methods actually reach that state via the new flow. |
| 4 | No DOB-collection API/DTO/entity field existed anywhere in payout-service, despite the doc requiring it on the bank-entry form. | **FIXED** — added `dateOfBirth`/`legalFirstName`/`legalLastName` to `AddMethodDto` (not persisted to our own DB beyond the request — DOB is submitted straight to Stripe, consistent with not custodying extra PII). |
| 5 | `getOrCreateConnectAccount()` was hardcoded to `country: 'US'` — since Stripe Custom accounts are single-country, this silently made a real international flow impossible even with correct external_account fields (a UK contractor would get a US-country Connect account, or Custom-account creation would be built on the wrong country). | **FIXED** — now accepts a `country` param, defaults to `'US'` (no behavior change for existing US callers), and the existing-account reuse query now matches on the requested country instead of assuming US-or-NULL. |

Confirmed correct (unaffected by the above): country-routing table (Stripe
cross-border vs. Wise Platform, matches doc exactly), Wise Platform integration
for India/Japan/GCC (works correctly, marks methods VERIFIED synchronously),
fee schedule ($0.99 flat / 0.25% cross-border / US-free tiers).

---

## PS-35 — Didit Biometric Verification Gate

Both checkpoints are built, the identity-service client contract matches the
doc, and the RabbitMQ consumer flow is correct — but the gate does not actually
block anything today.

| # | Finding | Status |
|---|---|---|
| 1 | **The gate is disabled by default and undocumented** — both checkpoints (`schedule.service.ts`, `methods.service.ts`) gate on `FEATURE_BIOMETRIC_GATE_ENABLED`, which appears nowhere in any `.env.*.example` template. Doc presents the gate as unconditionally active. As shipped, nothing is blocked in any environment unless someone manually sets an undocumented var. | **OPEN** — flag should be documented at minimum; whether to default it on is a product decision (identity-service's side isn't built yet either, see #4). |
| 2 | Method-creation gate only covers `BANK_MANUAL`/`BANK_STRIPE` — CRYPTO and WISE/PAYONEER methods return earlier in `methods.service.ts`, before the biometric check block is ever reached. Code comment self-acknowledges this as a real gap against PS-35's stated scope ("any new payout method added"). | **OPEN** — needs the gate check moved earlier, or duplicated, for those two paths. |
| 3 | Trigger endpoint mismatch: doc specifies `POST /v1/payouts/schedule`; actual route is `PUT /v1/payouts/schedule` (`updateSchedule`, a create-or-update handler, not a dedicated `createSchedule`). Functionally equivalent, diverges from doc's literal HTTP method/handler name. | **OPEN** — cosmetic/doc-drift, not a functional gap. |
| 4 | `identity-verification-service` (the separate microservice this gate calls out to) has no biometric capability built yet — confirmed via code comments in `identity.client.ts`. Every call would 503 today. | **OPEN** — cross-service work, not something payout-service can finish alone. |
| 5 | `ERR_BIOMETRIC_VERIFICATION_REQUIRED` (doc: 202) isn't used anywhere; the REQUIRED-path responses return a body but no dedicated code, and not with HTTP 202. | **OPEN** — minor, the FAILED-path code (`ERR_BIOMETRIC_VERIFICATION_FAILED`) and pre-flight code (`ERR_METHOD_PENDING_BIOMETRIC`) are both correctly used. |

---

## PS-36 — Wise Platform API Integration Spec (India, Japan, GCC)

| # | Finding | Status |
|---|---|---|
| 1 | **Account-requirements step was skipped entirely** — doc: "Always call this before creating a recipient to confirm field names. Do not hardcode field names." `getAccountRequirements()` existed with zero callers; recipient creation used a hardcoded map (`WISE_RECIPIENT_TYPE`) covering only India/Japan/UAE, with every other GCC/SWIFT country blindly guessing `'iban'`. | **FIXED** — `methods.service.ts` now calls `getAccountRequirements()` and picks the recipient type from Wise's live catalog (falling back to the hardcoded map only if the live call itself fails, so a Wise outage degrades gracefully instead of blocking verification). |
| 2 | Japan's required `accountType` (FUTSU/TOUZA) field is missing from the recipient payload entirely — no DTO field, never set. | **OPEN** — would have been caught by #1's requirements call if the recipient-building code consumed the requirements response's field list dynamically rather than just its `type`; the current fix picks the right `type` but doesn't yet dynamically drive the `fields` object from the requirements response. |
| 3 | No pre-flight balance check before a Wise Platform payout — doc requires checking Marketeq's own Wise float (`GET /v4/profiles/{id}/balances`) and failing with a distinct `ERR_WISE_PLATFORM_INSUFFICIENT_BALANCE` before attempting to fund. `getWisePlatformBalanceUsd()` existed with zero callers; an insufficient float previously only surfaced as a generic `ERR_WISE_PLATFORM_FUND_FAILED` 502 from the fund step itself. | **FIXED** — `bank-payout-executor.service.ts` now checks the float before funding and fails with the documented error code if insufficient. |
| 4 | Recipient field mapping was a fixed key set rather than shaped by the account-requirements response. | **OPEN, partially addressed** — the `type` is now requirements-driven (#1); the `fields` dict itself is still a fixed key set (same underlying issue as #2). |

Confirmed correct: `getQuote()`, `createRecipient()`/`createTransfer()`/`fundTransfer()`/`executeTransfer()`
endpoint paths and idempotency handling, webhook state machine (`processing`/`funds_converted`/
`outgoing_payment_sent`/`funds_refunded`/`cancelled`), correct routing of `BANK_MANUAL` +
non-US + non-Stripe-cross-border countries to Wise Platform.

---

## PS-40 v2.0 — RabbitMQ Events (Published & Consumed)

Audited and fixed in an earlier pass (before this document existed). Summary for
completeness:

**FIXED** — 9 events were either using the wrong delivery mechanism (`emit()`
into a dead-end queue instead of the real exchange `publishToExchange()`) or
were pure log-only stubs never actually publishing: `payout.paused`,
`payout.resumed`, `payout.cancelled`, `payout.edd.triggered`,
`payout.schedule.completed`, `payout.scheduled.skipped`,
`payout.schedule.partial_failure`, `payout.secondary.failed`,
`payout.method.deactivated`, `payout.trust_safety.escalation`, plus the new
PS-40 events (`payout.method.stripe_kyc.verified`,
`payout.method.additional_kyc_required`, `payout.wise_platform.transfer_sent`,
`payout.wise_platform.transfer_failed`).

Also fixed in this pass: a duplicate ACH-deactivation code block in
`stripe.provider.ts::handlePayoutFailed()` (identical logic ran twice
unconditionally, double-writing audit logs on every qualifying failure) and a
centralized OFAC blocklist (`common/ofac-countries.ts`) with execution-time
re-screening added to `bank-payout-executor.service.ts`.

---

## Not separately audited

- **PS-18, PS-19, PS-23, PS-24, PS-25, PS-26, PS-27, PS-28, PS-29, PS-30**: no
  changes per the INDEX doc, or additive-only notes pointing at v2.0 addenda
  already covered above (PS-32/33/34/35/36/40). Not independently re-verified
  line-by-line.
- **PS-31** (QA & Testing Guide): test-strategy doc, not an implementation
  spec — not audited this pass.
- **PS-32, PS-37, PS-38, PS-39**: architecture/business/legal reference docs
  (banking-layer rationale, fund-custody rules, compliance/licensing analysis).
  Their concrete engineering claims (Mercury-out/Stripe-in, PayPal removal, the
  no-intermediate-account invariant) were already confirmed correct as a
  byproduct of the PS-09/PS-32/PS-33/PS-34 audits above; not independently
  re-audited as standalone documents.
- **PS-41**: v2.0 user-stories/acceptance-criteria updates — a QA/frontend
  artifact more than a backend implementation spec; not audited this pass.

---

## Priority read, if picking this up

1. **PS-15 gaps #2/#4** (Tier 1/2 KYC no-ops, missing EDD re-verification) —
   real compliance exposure, currently silent.
2. **PS-33 gap #1 / PS-34's dependency on it** (Custom vs Express Connect
   accounts) — now load-bearing for the international bank flow that was just
   built; worth resolving properly rather than leaving Custom as permanent.
3. **PS-13 gap #1 / #3** (card activation CVV, test-mode funding API in the
   "production" path) — both are real-money-adjacent and need an actual
   product/compliance decision, not more code.
4. **PS-12** (crypto payout execution) — biggest single gap by volume (8 of 9
   providers can't actually send crypto automatically), but explicitly
   documented rather than built per prior direction — needs product decisions
   on which providers to keep, plus a treasury-wallet custody strategy.
5. **PS-10/PS-11 WalletConnect** — real SDK integration, affects 6 of 9 crypto
   wallet providers' QR/paste-URI connection flow.
