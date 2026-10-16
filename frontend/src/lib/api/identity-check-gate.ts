// frontend/src/lib/api/identity-check-gate.ts
//
// Ordering rule for the talent dashboard's first-login dialogs: the existing
// "Secure your account" password dialog always comes first, and the Identity
// Verification check (which opens the "Your profile is not public" gate) must not
// start until that is out of the way. Pure decision logic only — no UI, no network,
// no storage.
//
// Whether a password exists is read ONLY from the authenticated user the backend
// returned (users.hasPassword, via GET /me). It is never inferred from a modal being
// open or closed, from localStorage, or from a "first login" flag.

export interface PasswordSetupUser {
  provider?: string | null
  hasPassword?: boolean | null
}

/**
 * True when an email-registered account has not created a password yet. Social
 * (Google/LinkedIn) accounts never need one. This is the same rule the dashboard's
 * Secure-account dialog has always used.
 */
export function isPasswordSetupRequired(
  user: PasswordSetupUser | null | undefined
): boolean {
  return user?.provider === "EMAIL" && !user?.hasPassword
}

export interface IdentityCheckStartInput {
  user: PasswordSetupUser | null | undefined
  isTalent: boolean
  /** The Secure-account dialog is currently mounted (it stays open on its success step until Close). */
  securityDialogOpen: boolean
  /** The once-only guard: the real check has already been started. */
  alreadyStarted: boolean
}

/**
 * Whether the real Identity Verification check should start now. It waits while a
 * password is still required (so a failed save or a Cancel never opens verification)
 * AND while the password dialog is still on screen (so the success step is preserved
 * and verification only follows the existing Close click).
 */
export function shouldStartIdentityCheck(
  input: IdentityCheckStartInput
): boolean {
  if (!input.user || !input.isTalent) return false
  if (input.alreadyStarted) return false
  if (isPasswordSetupRequired(input.user)) return false
  if (input.securityDialogOpen) return false
  return true
}
