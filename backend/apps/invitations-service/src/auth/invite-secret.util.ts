import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';

/**
 * Accept-token strategy for DB-backed invitations (as opposed to the
 * HMAC-signed shareable link in token.util.ts, which carries no DB row).
 *
 * The token handed to the invitee is `<invitationId>.<secret>`. Only a
 * bcrypt hash of `secret` is ever stored, and bcrypt is salted, so the hash
 * cannot be looked up directly; the id half is what lets `accept()` find
 * the row before comparing.
 */

export interface ParsedAcceptToken {
  invitationId: string;
  secret: string;
}

export function generateInviteSecret(): string {
  return randomBytes(32).toString('base64url');
}

export async function hashInviteSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, 10);
}

export async function verifyInviteSecret(
  secret: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(secret, hash);
}

export function buildAcceptToken(invitationId: string, secret: string): string {
  return `${invitationId}.${secret}`;
}

/**
 * Splits `<invitationId>.<secret>`. Returns null for legacy plaintext
 * tokens (no `.`) so callers can fall back to the old `token` column
 * lookup. This is what keeps pre-migration pending invitations working.
 */
export function parseAcceptToken(token: string): ParsedAcceptToken | null {
  const dotIndex = token.indexOf('.');
  if (dotIndex <= 0 || dotIndex === token.length - 1) return null;
  const invitationId = token.slice(0, dotIndex);
  const secret = token.slice(dotIndex + 1);
  // UUIDs never contain '.', so anything before the first dot that isn't a
  // uuid-shaped string is not one of our tokens.
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(invitationId)) return null;
  return { invitationId, secret };
}
