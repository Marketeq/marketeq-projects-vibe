// apps/offer-service/src/common/utils/derive-idempotency-key.ts
// Pure decision logic behind IdempotencyInterceptor's fallback key —
// dependency-free (no Request, no Redis) so it's unit-testable the same
// way as offer-list-query.builder.ts: plain inputs, plain outputs, no
// mocking.
import { createHash } from 'crypto';

export interface DeriveIdempotencyKeyInput {
  userId: string;
  method: string;
  routePath: string;
  /** Route :id param when present (e.g. accept/decline/withdraw). Falls
   *  back to routePath for routes with no offer in scope (e.g. createOffer). */
  offerId?: string;
  body: unknown;
}

/**
 * Deterministic key for requests that arrive with no X-Idempotency-Key
 * header — same request (same user, same route, same offer, same body)
 * always derives the same key; any genuine difference in any of those
 * four inputs derives a different one.
 */
export function deriveIdempotencyKey(input: DeriveIdempotencyKeyInput): string {
  const { userId, method, routePath, offerId, body } = input;
  const action = `${method} ${routePath}`;
  const bodyDigest = hashCanonicalBody(body);
  const material = [userId, offerId ?? routePath, action, bodyDigest].join('|');
  return createHash('sha256').update(material).digest('hex');
}

function hashCanonicalBody(body: unknown): string {
  return createHash('sha256').update(canonicalize(body)).digest('hex');
}

// Object key order in a parsed JSON body isn't semantically meaningful,
// but JSON.stringify is order-sensitive — sort keys recursively so two
// requests with identical content in a different key order still hash
// the same.
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(',')}]`;
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${canonicalize((value as Record<string, unknown>)[key])}`)
    .join(',')}}`;
}
