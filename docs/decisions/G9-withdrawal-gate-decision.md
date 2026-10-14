# G9 withdrawal gate - manual withdrawals, queued payouts and scheduled automatic payouts

Status: **IMPLEMENTED per Christopher's final G9 decisions.** Money leaves the platform only for an account whose
verification gate is open (`gate_open = is_verified OR in_grace`, 30-day grace, answered by identity-verification-service).
The gate is re-evaluated at **every** step that can move money, not only when the withdrawal is requested.

## The rule
* **Subject:** always the contractor stored on the withdrawal / payout / schedule record - never a value from the request.
* **Gate closed:** the step stops; no provider call; nothing is debited, consumed or lost; any reservation already held is
  released; an auditable blocked/failed state is kept; the existing verification-required error is returned where there is a
  caller. There is no withdrawal-specific screen.
* **Gate unevaluable** (no broker, RPC error, 3 s timeout, malformed or self-contradicting reply, no consumer): **fails
  closed** (`IDENTITY_VERIFICATION_UNAVAILABLE`, 503). No money moves and no balance is mutated as if paid. The step is
  retried by the existing queue/tick (idempotency keys unchanged); only when the queue's last attempt is also unanswered is
  the payout failed and the reservation released.
* **Grace period** is gate-open: grace-period contractors withdraw and their schedules continue.

## Every money-moving path (audit)
| Path | Where | Gate re-check |
|---|---|---|
| Withdrawal creation `POST /payouts/initiate` | `PayoutController` | `PayoutWithdrawalGateGuard` (403 / 503) - first line, unchanged |
| Email confirmation `GET /payouts/verify-email` | `MagicLinkService.verifyEmailToken` | **before** the link is consumed and **before** `holdBalance`; closed -> 403, link stays valid, balance untouched, audited (`payout.verification_blocked`) |
| Legacy confirmation `GET /payouts/verify` | `PayoutService.verifyMagicLink` | before `holdBalance` and before the token is consumed |
| Queue production | `PayoutService.enqueueForProcessing` | not an irreversible step - nothing leaves; callers are the two confirmations above and the scheduler (gated) |
| Queue consumption | `PayoutQueueProcessor` | on dequeue, before balance/KYC re-checks and any executor |
| Bank (Stripe ACH) provider execution | `BankPayoutExecutorService` | at start; again right before `transfers.create`; again right before `payouts.create` (a transfer already made is reversed) |
| Wise Platform provider execution | `executeWisePlatformPayout` | right before the quote/`executeTransfer` (create + fund) |
| Debit-card funding | `CardPayoutExecutorService` | at start and right before `fundCard` |
| Crypto provider execution | `CryptoPayoutExecutorService` | at start and on **every** attempt inside the retry wrapper (incl. delayed retries), right before `initiateWithdrawal` |
| Retry handlers | Bull (`attempts: 3`), `CryptoRetryService`, secondary-split retry | each re-run re-enters the executor checks above; secondary retry is gated in `executeSinglePayout` |
| Scheduled / automatic payouts | `ScheduleExecutionCron.executeSinglePayout` (single, split primary, split secondary, secondary retry) | before the balance hold - see below |
| Admin / internal routes | `release-edd`, `awaiting-edd`, reads | `release-edd` only issues a confirmation link - it moves no money; the link goes through the gated confirmation. No route executes a payout directly |
| Webhooks | Stripe `payout.paid/failed`, Wise Platform, ramp | settle state of money that **already left** (COMPLETED/FAILED, release on failure); none starts a transfer or retries one, so there is nothing to gate - gating here could only strand funds |

### Blocked state on the payout
* Not yet sent (QUEUED): `FAILED`, `failure_reason = VERIFICATION_REQUIRED_AT_EXECUTION` (or
  `IDENTITY_VERIFICATION_UNAVAILABLE_AT_EXECUTION`), audit `payout.verification_blocked`, and `payout.failed` is published -
  earnings-service restores `available_balance` (existing release path). The conditional status change makes a redelivery or
  duplicate call release exactly once.
* Re-run of a payout that is `PROCESSING` or has a provider reference (a provider call may already have happened): the gate
  stops the run **without** failing or releasing - releasing could hand back funds while money is in flight. Audited as
  `payout.verification_blocked_on_retry`; reconciliation stays with the existing provider-state webhooks.
* No `payout.completed` (success) event is ever published for a blocked payout.

## Scheduled automatic payouts
* **Check:** immediately before each scheduled payout can move money (before the balance hold) - single, split primary,
  split secondary and secondary retry.
* **Closed:** the payout does not run; the schedule is **paused, never cancelled or deleted**. Only `paused_at` and
  `pause_reason = 'verification_required'` are written; frequency, method, split, threshold, reserve and cadence are untouched.
  The balance is never held.
* **One notification:** the pause is a conditional update (`WHERE paused_at IS NULL`); only the run that actually changed the
  row publishes it (`payout.paused`, `reason: verification_required`, message *"Your scheduled payout did not run because account
  verification is required."*). Later ticks never select a paused schedule, and a forced repeat or a concurrent run publishes
  nothing.
* **Unanswered:** nothing runs, nothing is paused, `next_execution_at` is not advanced - the next 30-minute tick retries.
* **Reopening:** payout-service consumes `identity.gate_changed` on its own durable queue `payout_service_gate_queue`
  (identity-verification-service now emits the same event to a third queue). On `gateOpen: true` it first confirms the decision
  with the owning service (a stale "open" cannot resume a re-closed account), then resumes **only** schedules with
  `pause_reason = 'verification_required'`. Schedules paused for any other reason, with a null reason, or inactive are not
  touched. A due date still in the future is kept; one that passed while paused is moved to the **next configured occurrence**
  (same calculator as every other advance), so resuming never causes an immediate catch-up payout.
* **Duplicates/redelivery:** resume is idempotent; a closing event needs no action (the scheduler pauses at the moment of the
  run). Manual ack after the work, requeue on failure, malformed messages dropped and acked - the repo's durable-consumer pattern.
* **Migration:** `database/migrations/014_payout_schedule_pause_reason.sql` adds nullable `pause_reason` and a partial index.
  Existing rows stay `NULL` and are never auto-resumed. No schema synchronization.

## Frontend
Callers audited: `components/withdraw-funds-dialog.tsx` and `app/transfer-funds/page.tsx` (`POST /payouts/initiate`) and
`app/verify-withdrawal/page.tsx` (`GET /payouts/verify-email`). A 403 `VERIFICATION_REQUIRED` or 503
`IDENTITY_VERIFICATION_UNAVAILABLE` opens the **existing** `AccountVerificationGate` ("Verify My Account") popup, handled before
the generic decline/invalid states, via one shared mapper (`src/lib/api/withdrawal-verification.ts`). No new modal, page or
required copy. The frontend never decides whether the gate is open.

## Future UX suggestion (NOT a requirement, not implemented)
> *Optional copy for the popup when it opens from a withdrawal: "Your balance is unaffected."* - marked as a possible future
> UX addition only; the shipped popup keeps its existing wording.

## Operational notes
* Delivery of the `payout.paused` notification relies on the existing event pattern: no service currently consumes `payout.*`
  events (pre-existing gap noted in `PayoutPublisher`). The event is published exactly once per pause; wiring a consumer is
  independent of this change.
* Identity-verification-service must be deployed with the new third gate-change target before the resume path works; until then
  paused schedules stay paused (safe) and the queue simply fills.
