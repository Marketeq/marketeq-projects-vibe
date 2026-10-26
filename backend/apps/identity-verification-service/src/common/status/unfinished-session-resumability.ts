// An unfinished hosted session may be resumed only while the home-country
// confirmation it was started under is still current. Past the 15-minute window
// the user must restart from location detection; a later confirmation (a new
// timestamp on the profile) also supersedes the session, so the next start creates
// a new one.
//
// One pure rule shared by GET /me (next action) and POST /kyc-sessions (start /
// resume), so the two cannot drift. windowMs is passed in because the window
// constant lives in free-kyc.service, which imports this file.
//
// Correlation is exact, not time-based: the session stores the confirmation time it
// was started under (hosted_kyc_sessions.confirmed_at) and must equal the profile's
// current one. A legacy row (null) is judged by the age alone.

export interface UnfinishedSessionResumabilityInput {
  /** The profile's current verified_home_country_confirmed_at. */
  confirmedAt: unknown;
  /** The session's confirmed_at: the confirmation it was started under (null on legacy rows). */
  sessionConfirmedAt: unknown;
  nowMs: number;
  windowMs: number;
}

export function isUnfinishedSessionResumable(input: UnfinishedSessionResumabilityInput): boolean {
  const { confirmedAt, sessionConfirmedAt, nowMs, windowMs } = input;
  if (!(confirmedAt instanceof Date) || !Number.isFinite(confirmedAt.getTime())) return false;
  if (nowMs - confirmedAt.getTime() > windowMs) return false;
  if (sessionConfirmedAt === null || sessionConfirmedAt === undefined) return true; // legacy row
  // A recorded value that is unreadable or differs from the current confirmation is
  // not the confirmation this session was started under: fail closed.
  return sessionConfirmedAt instanceof Date && sessionConfirmedAt.getTime() === confirmedAt.getTime();
}
