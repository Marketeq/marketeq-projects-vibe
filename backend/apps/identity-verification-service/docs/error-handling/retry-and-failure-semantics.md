# Retry & Failure Semantics — identity-verification-service

No confirmed source defines a retry policy, backoff strategy, dead-letter mechanism, or delivery-guarantee SLA anywhere in this service. This document does not introduce one. What follows is an exact restatement of what the already-confirmed code in Docs 05 already does on failure, plus one newly-surfaced gap.

## 1. Didit vendor calls — no automatic retry

DiditDocumentVerificationProvider.startVerificationSession makes exactly one attempt per call. A network failure, a non-2xx response, or a malformed response body all immediately throw VendorUnavailableException (502) — there is no retry loop, no backoff, and no circuit breaker anywhere in this path.

**Important:** a VENDOR_UNAVAILABLE failure does NOT consume one of the caller's three verification attempts. startVerificationSession only creates a pending_verification_sessions row AFTER the vendor call succeeds — if the vendor call throws, nothing is persisted and the 3-attempt ceiling count is unaffected. A caller who receives VENDOR_UNAVAILABLE may retry the same request immediately without being penalized.

## 2. RabbitMQ event publishing — logged and swallowed, never retried

RabbitMqNotificationEventPublisher.publish wraps its publish call in a try/catch. On any failure — an unreachable broker, a channel error, anything — it logs the failure with logger.error and returns normally. The request that triggered the event still succeeds even if the notification event is lost. There is no outbox table, no retry queue, and no redelivery of a failed publish.

## 3. The duplicate-detection transaction — full rollback, no partial writes, no retry

submitDocument's transaction runs the advisory lock, the cross-profile lookup, and the document insert inside one TypeORM QueryRunner transaction. Any error anywhere inside that block rolls the entire transaction back — there is no partial commit, and no automatic retry of the transaction.

## 4. Webhook redelivery — idempotent no-op, not a retry mechanism

handleDiditWebhook is not itself a retry mechanism, but it safely tolerates Didit redelivering the same webhook: the unique index on vendor_session_id makes a settled-attempt lookup a single indexed query. If a verification_attempts row already exists for that vendor_session_id, the handler returns immediately with no further writes — a silent, idempotent 200 response.

## 5. New finding: the reminder job's daily sweep has no per-profile error isolation

TravelModeReminderJob.runDailySweep loops over every due profile and calls evaluateAndSendIfDue for each, with no try/catch around the individual iteration. If evaluateAndSendIfDue throws for one profile (for example, a transient database error), the exception propagates out of the for loop and aborts the sweep for every profile still queued behind it in that run.

Because the job re-runs the next day at 09:00, a profile skipped this way is delayed by up to 24 hours, not permanently missed — but this is still a real, present-day gap in already-confirmed code.
