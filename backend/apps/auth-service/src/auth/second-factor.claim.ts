/**
 * Reads the `amr` ("authentication methods references") claim off a refresh
 * token payload.
 *
 * Why this exists: the platformRole claim is only minted on a session that
 * passed a second factor (see issueTokens). A refresh has no password and no
 * OTP to check — it has to learn that fact from the token it was handed. The
 * refresh token records it as `amr: ['mfa']` at the original 2FA verification
 * and nowhere else, so a single-factor session cannot acquire the marker by
 * refreshing.
 *
 * The refresh token is signed with the refresh secret and verified before
 * this runs, so the value cannot be forged by the client.
 *
 * Unknown, absent or malformed values read as "no second factor". Failing
 * closed here means at worst a role holder is asked to sign in again.
 */
export function hasSecondFactor(payload: { amr?: unknown } | undefined): boolean {
  const amr = payload?.amr;
  if (!Array.isArray(amr)) return false;
  return amr.some((entry) => typeof entry === 'string' && entry.trim().toLowerCase() === 'mfa');
}
