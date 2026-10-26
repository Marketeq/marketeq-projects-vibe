// An unfinished hosted session may be resumed only while the home-country
// confirmation it was started under is still current. Past the window the user
// must restart from location detection; a fresh confirmation made after the
// session was created also supersedes it (the next start creates a new session).
//
// One pure rule shared by GET /me (next action) and POST /kyc-sessions (start /
// resume), so the two cannot drift. windowMs is passed in because the window
// constant lives in free-kyc.service, which imports this file.

// A session row is written moments after the confirmation it belongs to (one
// Didit call later). A confirmation newer than the session by more than this is
// a separate, later confirmation.
export const SESSION_CONFIRMATION_SKEW_MS = 2 * 60 * 1000;

export interface UnfinishedSessionResumabilityInput {
  confirmedAt: unknown;
  sessionCreatedAt: unknown;
  nowMs: number;
  windowMs: number;
}

export function isUnfinishedSessionResumable(input: UnfinishedSessionResumabilityInput): boolean {
  const { confirmedAt, sessionCreatedAt, nowMs, windowMs } = input;
  if (!(confirmedAt instanceof Date) || !Number.isFinite(confirmedAt.getTime())) return false;
  if (nowMs - confirmedAt.getTime() > windowMs) return false;
  if (sessionCreatedAt instanceof Date && Number.isFinite(sessionCreatedAt.getTime())) {
    if (confirmedAt.getTime() - sessionCreatedAt.getTime() > SESSION_CONFIRMATION_SKEW_MS) return false;
  }
  return true;
}
