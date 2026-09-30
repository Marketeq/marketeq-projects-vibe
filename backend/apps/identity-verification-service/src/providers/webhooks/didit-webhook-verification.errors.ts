// Error types for the CORRECTED Didit webhook signature/timestamp
// verification. Plain Error subclasses, not NestJS HttpException: this
// module is not wired into the live webhook controller yet (see this
// directory's README-style header comment in didit-webhook-verification.ts)
// — no HTTP boundary exists for these to be translated at.

export abstract class DiditWebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

// The X-Signature header is missing, or the computed HMAC does not match
// it. Never carries the signature value, the secret, or the body content.
export class InvalidDiditWebhookSignatureError extends DiditWebhookVerificationError {
  constructor(public readonly reason: 'missing_header' | 'mismatch' | 'body_not_json') {
    super(`Didit webhook signature invalid: ${reason}`);
  }
}

// The X-Timestamp header is missing, unparseable, or outside the
// documented 5-minute (300s) tolerance window. Distinct from a bad
// signature: a stale-but-correctly-signed replay is still rejected here.
export class ExpiredOrInvalidDiditWebhookTimestampError extends DiditWebhookVerificationError {
  constructor(
    public readonly reason: 'missing_header' | 'not_a_number' | 'outside_tolerance',
    public readonly skewSeconds?: number,
  ) {
    super(`Didit webhook timestamp invalid: ${reason}`);
  }
}

// The body parsed as JSON but doesn't have the fields the real, documented
// event envelope requires. Distinct from a signature/timestamp failure —
// this is "we trust it came from Didit, but can't understand it."
export class MalformedDiditWebhookEventError extends DiditWebhookVerificationError {
  constructor(public readonly reason: string) {
    super(`Didit webhook payload malformed: ${reason}`);
  }
}
