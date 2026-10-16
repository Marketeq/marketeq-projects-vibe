/**
 * Shared core for every role check on the platform.
 *
 * ── Why this file is duplicated ──
 * There is no working cross-service import mechanism in this monorepo: the
 * `@shared/*` alias is unused scaffolding, and the two services that import
 * `@libs/auth` build to a malformed output path. So this file is copied
 * verbatim into each service that checks roles, the same way
 * csrf-origin.middleware.ts is. Change one, change all of them. The copies
 * are: payout-service, checkout-service, time-tracking-service,
 * content-moderation-service.
 *
 * ── What it does ──
 * Resolves the caller's security role from the request user and decides
 * whether it satisfies the roles a route requires. Every service previously
 * had its own slightly different version of this logic; they disagreed about
 * where the role lives (`role` vs `roles[]`) and what to do when it is absent.
 *
 * ── Only `platformRole` counts ──
 * The role comes from the `platformRole` claim on the access token, minted by
 * auth-service from PLATFORM_ROLE_ASSIGNMENTS. Nothing else is consulted.
 *
 * The earlier version of this file also fell back to `role` and `roles[]`.
 * That fallback is now deliberately gone, because `role` is a *profile label*
 * (talent/client/admin) exposed by UpdateUserDto — a field an ordinary user
 * can write about themselves. Honouring it would have turned a profile edit
 * into real privilege. Dropping it changed nothing in practice: no token has
 * ever carried `role`, so the fallback never resolved to anything.
 *
 * A caller with no `platformRole` claim has no role, and every role-protected
 * route refuses them. That is the correct default: fail closed.
 */
import { Logger } from '@nestjs/common';
import { auditFromRequest } from './security-audit';
import { ALL_CAPABILITIES, capabilitiesOf, isKnownCapability } from './platform-roles.catalog';

export interface RoleBearingUser {
  /**
   * The `platformRole` claim. The ONLY role source — see the note above on
   * why `role` and `roles[]` are not accepted here.
   */
  platformRole?: string | null;
}

const logger = new Logger('RoleCheck');
const lastLoggedAt = new Map<string, number>();

const normalise = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : undefined;

/** The caller's security role, or undefined when they have none. */
export function resolveCallerRole(user: RoleBearingUser | undefined): string | undefined {
  if (!user) return undefined;
  return normalise(user.platformRole);
}

/**
 * Does the caller's role satisfy what this route requires?
 *
 * A requirement is EITHER a role name (`admin`) or a capability
 * (`finance:approve`) — the colon tells them apart. Both forms are accepted
 * so capabilities could be introduced without touching the dozens of existing
 * `RolesGuard('admin')` call sites, which keep working exactly as before.
 *
 * Prefer capabilities in anything new. `RolesGuard('admin')` has to be
 * revisited every time the role list changes; `RolesGuard('finance:approve')`
 * never does — whoever should be able to approve is decided in the catalogue.
 *
 * An empty requirement list means "any signed-in caller".
 */
export function isRoleAllowed(callerRole: string | undefined, allowedRoles: string[]): boolean {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  if (!callerRole) return false;
  return allowedRoles.some((requirement) => satisfies(callerRole, requirement));
}

/** A requirement naming a capability rather than a role. */
export function isCapabilityRequirement(requirement: string): boolean {
  return typeof requirement === 'string' && requirement.includes(':');
}

/**
 * Does this role hold this capability?
 *
 * Fails closed in three ways, each of which has been a real incident
 * somewhere: no role, an unrecognised role, and an unrecognised capability.
 * The last one catches typos — `finance:aprove` must not quietly become a
 * route nobody can reach OR one everybody can, so it is denied and logged.
 */
export function hasCapability(callerRole: string | undefined, capability: string): boolean {
  if (!callerRole) return false;

  if (!isKnownCapability(capability)) {
    logUnknownCapability(capability);
    return false;
  }

  const held = capabilitiesOf(callerRole);
  if (held.includes(ALL_CAPABILITIES)) return true;
  return held.includes(capability);
}

function satisfies(callerRole: string, requirement: string): boolean {
  const wanted = typeof requirement === 'string' ? requirement.trim() : '';
  if (!wanted) return false;
  return isCapabilityRequirement(wanted)
    ? hasCapability(callerRole, wanted.toLowerCase())
    : normalise(wanted) === callerRole;
}

const loggedUnknownCapabilities = new Set<string>();

/** Once per capability per process — a typo is a permanent condition, not an event. */
function logUnknownCapability(capability: string): void {
  if (loggedUnknownCapabilities.has(capability)) return;
  loggedUnknownCapabilities.add(capability);
  logger.error(
    `route requires unknown capability "${capability}" — denying everyone. ` +
      'Add it to CAPABILITIES in platform-roles.catalog.ts, or fix the spelling.',
  );
}

/**
 * One line per endpoint/role pair per minute. A denial with a role attached
 * means a real role-holder was turned away from something — worth looking at.
 * A denial with no role is the ordinary case: someone without a platform role
 * reached an admin endpoint.
 */
export function logRoleDenial(
  endpoint: string,
  allowedRoles: string[],
  callerRole: string | undefined,
): void {
  const key = `${endpoint}|${callerRole ?? 'none'}`;
  const now = Date.now();
  const last = lastLoggedAt.get(key) ?? 0;
  if (now - last < 60_000) return;
  lastLoggedAt.set(key, now);
  logger.warn(
    `denied endpoint=${endpoint} required=[${allowedRoles.join(',')}] callerRole=${callerRole ?? 'none'}` +
      (callerRole ? '' : ' (caller holds no platformRole claim)'),
  );
}

/** `METHOD /path`, for the log line. */
export function describeRequest(req: {
  method?: string;
  originalUrl?: string;
  url?: string;
}): string {
  const path = (req.originalUrl || req.url || '').split('?')[0];
  return `${req.method ?? '?'} ${path}`;
}

/**
 * Records a role-gated decision in the security audit log — both directions.
 *
 * The ALLOW side is the point of this: a denial is already visible as a 403,
 * but an admin quietly doing admin things leaves no trace otherwise, and
 * "what did the privileged account do" is the question an incident review
 * actually asks.
 *
 * Allowed requests from a caller with no role are not recorded. Those are
 * routes with an empty requirement list — ordinary traffic, not privileged
 * action — and logging them would bury the signal.
 */
export function auditRoleDecision(
  req: any,
  allowedRoles: string[],
  callerRole: string | undefined,
  outcome: 'allowed' | 'denied',
): void {
  if (outcome === 'allowed' && !callerRole) return;
  auditFromRequest(req, {
    outcome,
    reason: outcome === 'denied' ? `requires=[${allowedRoles.join(',')}]` : undefined,
  });
}
