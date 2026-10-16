/**
 * Where a platform security role comes from when an access token is minted.
 *
 * ── Why this is an environment variable and not a database column ──
 * `users.platform_role` exists (user-service migration 1799500000000) and is
 * the eventual home for this. It cannot be the source yet, for two reasons:
 *
 *  1. Two user tables. auth-service mints tokens from its own `users` table
 *     (public schema); the column was added to `user_service.users`. Reading
 *     it from here means either duplicating the column or calling
 *     user-service on every login. Neither is worth doing before anyone
 *     actually holds a role.
 *  2. Nothing can grant the first role. There is no admin UI and no admin
 *     account, so a column-backed source would start empty with no way to
 *     fill it except hand-written SQL.
 *
 * An environment variable solves both and has a security property the column
 * does not: it is not reachable from any HTTP route, so no request — however
 * crafted — can promote an account. Changing who holds a role requires a
 * deploy, which is the right friction at this stage.
 *
 * ── Migrating to the column later ──
 * Replace resolvePlatformRole() with a lookup, keep the signature. The call
 * site in auth.service.ts (issueTokens) does not change. Do that once
 * USER_ACCESS_MODE=enforce and there is a deliberate path for writing the
 * column; until then the env list is the safer source.
 *
 * ── Format ──
 *   PLATFORM_ROLE_ASSIGNMENTS="<userId>:admin,<userId>:finance"
 * Whitespace around entries is ignored. Unknown roles and malformed entries
 * are dropped with a warning rather than failing the boot, so a typo cannot
 * take logins down — it just means that person gets no role.
 */
import { Logger } from '@nestjs/common';

/**
 * The valid role ids come from the catalogue, so adding a role there makes it
 * assignable here with no edit to this file. Previously this was a hardcoded
 * list that had to be kept in step by hand — exactly the drift the catalogue
 * exists to remove.
 */
export { PLATFORM_ROLES } from '../guards/platform-roles.catalog';
import { PLATFORM_ROLES as KNOWN_ROLES } from '../guards/platform-roles.catalog';

const logger = new Logger('PlatformRole');

interface ParsedAssignments {
  /** The raw env string this was parsed from, so re-parsing is skipped. */
  raw: string;
  byUserId: Map<string, string>;
}

let cache: ParsedAssignments | null = null;

export function parseRoleAssignments(raw: string | undefined): Map<string, string> {
  const byUserId = new Map<string, string>();
  if (!raw || !raw.trim()) return byUserId;

  for (const entry of raw.split(',')) {
    const trimmed = entry.trim();
    if (!trimmed) continue;

    const separator = trimmed.lastIndexOf(':');
    if (separator <= 0 || separator === trimmed.length - 1) {
      logger.warn(`ignoring malformed PLATFORM_ROLE_ASSIGNMENTS entry (expected "<userId>:<role>")`);
      continue;
    }

    const userId = trimmed.slice(0, separator).trim();
    const role = trimmed.slice(separator + 1).trim().toLowerCase();

    if (!KNOWN_ROLES.includes(role)) {
      logger.warn(`ignoring PLATFORM_ROLE_ASSIGNMENTS entry with unknown role "${role}"`);
      continue;
    }
    if (byUserId.has(userId)) {
      logger.warn(`PLATFORM_ROLE_ASSIGNMENTS lists a user twice; the last entry wins`);
    }
    byUserId.set(userId, role);
  }

  return byUserId;
}

/**
 * The security role to put on this user's access token, or undefined for the
 * ordinary case. Ordinary tokens are byte-for-byte what they were before the
 * claim existed — the key is omitted, not set to null.
 */
export function resolvePlatformRole(userId: string | undefined): string | undefined {
  if (!userId) return undefined;

  const raw = process.env.PLATFORM_ROLE_ASSIGNMENTS ?? '';
  if (!cache || cache.raw !== raw) {
    const byUserId = parseRoleAssignments(raw);
    cache = { raw, byUserId };
    if (byUserId.size > 0) {
      logger.log(`platform role assignments loaded for ${byUserId.size} account(s)`);
    }
  }

  return cache.byUserId.get(userId);
}

/** Test seam — drops the parse cache so a changed env var is picked up. */
export function resetPlatformRoleCache(): void {
  cache = null;
}
