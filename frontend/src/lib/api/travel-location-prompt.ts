// frontend/src/lib/api/travel-location-prompt.ts
//
// When the "still traveling?" prompt (the ChangeLocation dialog) is offered to an
// account whose Travel Mode is in force. The backend says whether the account was
// detected in a country other than its verified home country
// (travelModeLocationMismatch, see location-mismatch.ts); this file adds only the
// per-LOGIN rule, keyed by the opaque `loginSessionKey` GET /me returns, exactly like the
// Travel Mode expiry popup (the `session_id` cookie is HttpOnly and is never read): a
// new login has a new key, a refresh keeps it, another account never shares it. So the
// prompt appears once per login, never on every page load.
//
//   offered  the backend signal is true AND it was not already offered in this login.
//   marking  localStorage["travelLocationPromptShown:<key>"] is set only when a path
//            has COMPLETED, which today is only "I'm still traveling" on an active
//            Travel Mode (it changes nothing, so it completes at the click). Opening
//            the prompt, or starting "Change my home country", marks nothing: that
//            claim is made by the explicit country confirmation and the backend then
//            keeps the prompt quiet. The marker of every other login is removed, so
//            at most ONE marker ever exists.
//   no key   the prompt is offered and nothing is persisted (it may reappear after a
//            refresh); a marker never leaks across logins.
import type { IdentityVerificationSummaryView } from "./identity-verification-state"
import { shouldShowTravelerLocationPrompt } from "./location-mismatch"
import type { DismissalStorage } from "./travel-expiry-popup"

export const TRAVEL_LOCATION_PROMPT_SHOWN_PREFIX = "travelLocationPromptShown:"

export function travelLocationPromptKey(loginSessionKey: string): string {
  return `${TRAVEL_LOCATION_PROMPT_SHOWN_PREFIX}${loginSessionKey}`
}

function wasShown(
  storage: DismissalStorage | undefined,
  loginSessionKey: string
): boolean {
  try {
    return storage?.getItem(travelLocationPromptKey(loginSessionKey)) === "1"
  } catch {
    return false // storage unavailable: offer it rather than hide it silently
  }
}

export interface TravelerPromptInput {
  summary: IdentityVerificationSummaryView | null
  storage?: DismissalStorage
}

export function shouldOfferTravelerPrompt(input: TravelerPromptInput): boolean {
  if (!shouldShowTravelerLocationPrompt(input.summary)) return false
  const loginSessionKey = input.summary?.loginSessionKey
  if (!loginSessionKey) return true // no key: offer it, nothing can be remembered
  return !wasShown(input.storage, loginSessionKey)
}

/**
 * Remembers that the prompt was answered in this login. Keeps exactly one marker:
 * every marker for another login is removed first. A no-op without a key.
 */
export function markTravelerPromptShown(
  loginSessionKey: string | null,
  storage: DismissalStorage | undefined
): void {
  if (!loginSessionKey || !storage) return
  try {
    const current = travelLocationPromptKey(loginSessionKey)
    const stale: string[] = []
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i)
      if (
        key &&
        key.startsWith(TRAVEL_LOCATION_PROMPT_SHOWN_PREFIX) &&
        key !== current
      ) {
        stale.push(key)
      }
    }
    for (const key of stale) storage.removeItem(key)
    storage.setItem(current, "1")
  } catch {
    // storage unavailable: it simply reappears after a refresh
  }
}
