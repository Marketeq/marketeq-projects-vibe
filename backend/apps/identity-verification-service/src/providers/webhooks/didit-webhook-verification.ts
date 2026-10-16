// CORRECTED Didit webhook signature/timestamp verification and payload
// parsing, verified directly against docs.didit.me/integration/webhooks
// (fetched this engagement — quoted in comments below where it matters).
//
// NOT WIRED IN. This module is not referenced by
// identity-verification-webhooks.controller.ts or
// identity-verification.service.ts's handleDiditWebhook — those are
// untouched, still running the original placeholder header/field names.
// Wiring this in, and deciding what a verified event should actually do
// to VerificationAttempt / IdentityVerificationProfile, is a separate,
// not-yet-agreed orchestration task — seeing this module's header again:
// do not use it to invent that behavior. See derive-overall-outcome.ts
// for the one piece of combination logic this pass does implement and
// test, deliberately kept as a pure function with no side effects.
//
// What was actually wrong with the existing (still-live) implementation,
// confirmed against the docs:
//   - Checked a header named `x-didit-signature`, which does not exist.
//     The real headers are `X-Signature`, `X-Signature-V2` (recommended),
//     `X-Signature-Simple` (deprecated), and `X-Timestamp`.
//   - Had no timestamp/replay check at all.
//   - The payload DTO's field names (vendorSessionId, eventType,
//     occurredAt, raw) do not match the real envelope (event_id,
//     session_id, webhook_type, timestamp, created_at, application_id,
//     environment, status, workflow_id, vendor_data, metadata, decision).
//
// What this module implements: the `X-Signature` variant only — HMAC-
// SHA256 over the exact raw request body bytes, which is what the
// existing (wrong-header-name) code's algorithm already assumed correctly.
// `X-Signature-V2` (sorted, Unicode-preserved canonical JSON) is Didit's
// *recommended* variant, but its exact canonicalization procedure is not
// precisely enough specified in what's been fetched to implement with
// confidence — implementing it wrong would look correct in tests while
// silently failing against real deliveries. Flagged as a follow-up, not
// guessed at here.

import { createHmac, timingSafeEqual } from 'crypto';
import {
  ExpiredOrInvalidDiditWebhookTimestampError,
  InvalidDiditWebhookSignatureError,
  MalformedDiditWebhookEventError,
} from './didit-webhook-verification.errors';
import { DiditWebhookEvent } from './didit-webhook-event.interface';

// Documented tolerance, quoted: "Reject if abs(now - X-Timestamp) > 300."
const TIMESTAMP_TOLERANCE_SECONDS = 300;

/**
 * Verifies the `X-Signature` header: HMAC-SHA256 over the raw request
 * body bytes, using the destination's `secret_shared_key`. Throws rather
 * than returning false, matching this project's existing convention for
 * "can't trust this, fail closed."
 */
export function verifyDiditWebhookRawSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string,
): void {
  if (!signatureHeader) {
    throw new InvalidDiditWebhookSignatureError('missing_header');
  }
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(signatureHeader, 'utf8');
  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    throw new InvalidDiditWebhookSignatureError('mismatch');
  }
}

/**
 * Verifies the `X-Timestamp` header against the documented 5-minute
 * tolerance. `nowSeconds` is injectable so tests don't depend on wall-clock
 * time.
 */
export function verifyDiditWebhookTimestamp(
  timestampHeader: string | undefined,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): void {
  if (!timestampHeader) {
    throw new ExpiredOrInvalidDiditWebhookTimestampError('missing_header');
  }
  const headerSeconds = Number(timestampHeader);
  if (!Number.isFinite(headerSeconds)) {
    throw new ExpiredOrInvalidDiditWebhookTimestampError('not_a_number');
  }
  const skew = Math.abs(nowSeconds - headerSeconds);
  if (skew > TIMESTAMP_TOLERANCE_SECONDS) {
    throw new ExpiredOrInvalidDiditWebhookTimestampError('outside_tolerance', skew);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Parses and validates the real Didit webhook envelope shape. Does not
 * check signature/timestamp — call verifyDiditWebhookRawSignature and
 * verifyDiditWebhookTimestamp separately first; this only concerns itself
 * with "is the body shaped like a real event."
 */
export function parseDiditWebhookEvent(rawBody: Buffer): DiditWebhookEvent {
  let body: unknown;
  try {
    body = JSON.parse(rawBody.toString('utf8'));
  } catch {
    throw new MalformedDiditWebhookEventError('not_valid_json');
  }
  if (!isRecord(body)) {
    throw new MalformedDiditWebhookEventError('body_not_an_object');
  }
  const required = ['event_id', 'session_id', 'webhook_type', 'timestamp', 'status'] as const;
  for (const field of required) {
    if (!(field in body)) {
      throw new MalformedDiditWebhookEventError(`missing_field_${field}`);
    }
  }
  if (typeof body.event_id !== 'string' || typeof body.session_id !== 'string') {
    throw new MalformedDiditWebhookEventError('event_id_or_session_id_not_string');
  }
  if (typeof body.status !== 'string') {
    throw new MalformedDiditWebhookEventError('status_not_string');
  }

  return {
    event_id: body.event_id,
    session_id: body.session_id,
    webhook_type: typeof body.webhook_type === 'string' ? body.webhook_type : 'unknown',
    timestamp: typeof body.timestamp === 'number' ? body.timestamp : Number(body.timestamp) || 0,
    created_at: typeof body.created_at === 'string' ? body.created_at : '',
    application_id: typeof body.application_id === 'string' ? body.application_id : '',
    environment: body.environment === 'live' ? 'live' : 'sandbox',
    status: body.status,
    workflow_id: typeof body.workflow_id === 'string' ? body.workflow_id : null,
    vendor_data: typeof body.vendor_data === 'string' ? body.vendor_data : null,
    metadata: isRecord(body.metadata) ? body.metadata : null,
    decision: isRecord(body.decision) ? body.decision : null,
  };
}
