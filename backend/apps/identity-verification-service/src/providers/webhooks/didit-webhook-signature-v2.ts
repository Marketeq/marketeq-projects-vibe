import { createHmac, timingSafeEqual } from 'crypto';
import {
  InvalidDiditWebhookSignatureError,
} from './didit-webhook-verification.errors';

// X-Signature-V2 verification, implemented exactly as Didit's current
// official documentation (docs.didit.me/integration/webhooks) specifies and
// samples it: parse the JSON body, shortenFloats, sortKeys (recursively),
// JSON.stringify, HMAC-SHA256 with the destination's shared secret (hex),
// constant-time compare. The timestamp window is checked separately by
// verifyDiditWebhookTimestamp (documented 300-second tolerance).
//
// This is the ONLY signature this module accepts — there is deliberately no
// fallback to X-Signature or X-Signature-Simple.

function shortenFloats(data: unknown): unknown {
  if (Array.isArray(data)) return data.map(shortenFloats);
  if (data !== null && typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data as Record<string, unknown>).map(([key, value]) => [key, shortenFloats(value)]),
    );
  }
  if (typeof data === 'number' && !Number.isInteger(data) && data % 1 === 0) {
    return Math.trunc(data);
  }
  return data;
}

function sortKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortKeys);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys((obj as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return obj;
}

export function computeDiditSignatureV2(body: unknown, secret: string): string {
  const canonical = JSON.stringify(sortKeys(shortenFloats(body)));
  return createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
}

/** Throws InvalidDiditWebhookSignatureError (fixed reason, no content) unless the V2 signature is valid. */
export function verifyDiditWebhookSignatureV2(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string,
): void {
  if (!signatureHeader) throw new InvalidDiditWebhookSignatureError('missing_header');
  let body: unknown;
  try {
    body = JSON.parse(rawBody.toString('utf8'));
  } catch {
    throw new InvalidDiditWebhookSignatureError('body_not_json');
  }
  const expected = Buffer.from(computeDiditSignatureV2(body, secret), 'utf8');
  const provided = Buffer.from(signatureHeader, 'utf8');
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    throw new InvalidDiditWebhookSignatureError('mismatch');
  }
}
