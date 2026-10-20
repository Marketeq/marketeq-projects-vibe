import { createHash } from 'crypto';

// An opaque, per-login key for the browser's "already shown / already dismissed in this
// login" markers. The `session_id` cookie is HttpOnly (correctly), so the browser cannot
// read it; the backend derives a key from the verified access token's `sid` instead and
// returns only that.
//
// The key is a one-way SHA-256 digest with a domain prefix and the account id mixed in:
//  - it is the same for the whole life of a login (refresh keeps the `sid`), so a marker
//    written after a refresh still matches;
//  - a genuinely new login has a new `sid`, so it gets a different key;
//  - another account never shares a key, even for an identical `sid`;
//  - the `sid` itself (a random UUID) cannot be recovered from it, and no token claim,
//    `auth_time` included, is part of the result.
// A token without a usable `sid` (an older token) simply has no key.
const KEY_DOMAIN = 'marketeq:identity-verification:login-session-key:v1';
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export function deriveLoginSessionKey(userId: string, sid: string): string {
  return createHash('sha256').update(`${KEY_DOMAIN}:${userId}:${sid}`, 'utf8').digest('hex');
}

/**
 * The verified token's login key, or null when the account id is missing or the token
 * carries no valid `sid`. Never throws.
 */
export function readLoginSessionKey(user: unknown, userId: unknown): string | null {
  if (typeof userId !== 'string' || userId.length === 0) return null;
  if (!user || typeof user !== 'object' || Array.isArray(user)) return null;
  const { sid } = user as { sid?: unknown };
  if (typeof sid !== 'string' || !SESSION_ID_PATTERN.test(sid)) return null;
  return deriveLoginSessionKey(userId, sid);
}
