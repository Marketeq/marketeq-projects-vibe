import { deriveTravelModeState, hasAnsweredFirstCheckIn, TravelModeFields } from './travel-mode-state';

// Approved rule: while Travel Mode is active, the reminder shows exactly 5 minutes after
// authentication, once per genuinely new login session. The login time is the access
// token's `auth_time` claim (epoch seconds, fixed for the life of a session, preserved
// across refresh) and the session is its `sid`. Both are optional: a token without a
// usable pair simply has no login reminder, so day 3 / day 7 are never affected.
// The login reminder is the FIRST check-in of a Travel Mode cycle: once a duration answer
// has been saved in the cycle, a later login does not start it again.
export const LOGIN_REMINDER_DELAY_MS = 5 * 60 * 1000;

// A login stamped by another instance may be a little ahead of this clock. Anything
// further ahead than this is not a real authentication time and is ignored.
export const AUTH_TIME_FUTURE_SKEW_MS = 60 * 1000;

const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export interface LoginSession {
  /** The login session id (`sid`), the idempotency key for this session's reminder. */
  sid: string;
  /** The authentication time, in epoch milliseconds (`auth_time` is whole seconds). */
  authTimeMs: number;
}

/**
 * The verified access token's login identity, or null when either part is missing or
 * unusable. Never throws and never guesses: an `auth_time` that is not a positive whole
 * number of seconds (a string, a fraction, milliseconds by mistake) or is more than a
 * minute in the future, or a `sid` that is not a plain identifier, yields null.
 */
export function readLoginSession(user: unknown, nowMs: number): LoginSession | null {
  if (!user || typeof user !== 'object' || Array.isArray(user)) return null;
  const { sid, auth_time: authTime } = user as { sid?: unknown; auth_time?: unknown };
  if (typeof sid !== 'string' || !SESSION_ID_PATTERN.test(sid)) return null;
  if (typeof authTime !== 'number' || !Number.isSafeInteger(authTime) || authTime <= 0) return null;
  const authTimeMs = authTime * 1000;
  if (!Number.isFinite(nowMs) || authTimeMs > nowMs + AUTH_TIME_FUTURE_SKEW_MS) return null;
  return { sid, authTimeMs };
}

/**
 * When this login's reminder is due (authentication + 5 minutes), or null when there is
 * none. Pure, with the caller's clock. A login reminder exists only when ALL hold:
 *  - Travel Mode is effectively active right now (so nothing after expiry);
 *  - it was already active at authentication: activated at or before the login's second
 *    (`auth_time` has whole-second resolution) and not yet ended at that moment;
 *  - the reminder itself falls strictly before the end of the period (the same rule that
 *    gives the 6-day option no day-7 reminder);
 *  - the cycle's first check-in has not been answered yet (a skipped or closed one is not
 *    an answer, so it does not count).
 * Whether it has been claimed already is a separate, per-session question (see the claim
 * table), not decided here.
 */
export function deriveLoginReminderAt(
  fields: TravelModeFields,
  authTimeMs: number,
  nowMs: number,
): Date | null {
  if (!Number.isFinite(authTimeMs) || authTimeMs <= 0) return null;
  if (hasAnsweredFirstCheckIn(fields)) return null;
  const { state, endsAt } = deriveTravelModeState(fields, nowMs);
  if (state !== 'active' || !endsAt) return null;
  const activatedAt = fields.travelModeActivatedAt;
  if (!(activatedAt instanceof Date) || !Number.isFinite(activatedAt.getTime())) return null;

  const activatedSecondMs = Math.floor(activatedAt.getTime() / 1000) * 1000;
  if (activatedSecondMs > authTimeMs) return null; // Travel Mode started after this login
  if (authTimeMs >= endsAt.getTime()) return null; // already over at login

  const dueMs = authTimeMs + LOGIN_REMINDER_DELAY_MS;
  return dueMs < endsAt.getTime() ? new Date(dueMs) : null;
}
