// frontend/src/lib/api/travel-location-prompt.ts
//
// When the "still traveling?" prompt (the ChangeLocation dialog) is offered to an
// account whose Travel Mode is in force. The backend says whether the account was
// detected in a country other than its verified home country
// (travelModeLocationMismatch, see location-mismatch.ts); this file adds only the
// per-LOGIN rule, keyed by the existing readable `session_id` cookie exactly like the
// Travel Mode expiry popup: a new login has a new session id, a refresh keeps it. So
// the prompt appears once per login, never on every page load.
//
//   offered  the backend signal is true AND it was not already offered in this login.
//   marking  localStorage["travelLocationPromptShown:<sid>"] is set only when a path
//            has COMPLETED, which today is only "I'm still traveling" on an active
//            Travel Mode (it changes nothing, so it completes at the click). Opening
//            the prompt, or starting "Change my home country", marks nothing: that
//            claim is made by the explicit country confirmation and the backend then
//            keeps the prompt quiet. The marker of every other session is removed, so
//            at most ONE marker ever exists.
//   no session id  the prompt is offered and nothing is persisted (it may reappear after
//            a refresh); a marker never leaks across logins.
import type { IdentityVerificationSummaryView } from "./identity-verification-state"
import { shouldShowTravelerLocationPrompt } from "./location-mismatch"
import { type DismissalStorage, readSessionId } from "./travel-expiry-popup"

export const TRAVEL_LOCATION_PROMPT_SHOWN_PREFIX = "travelLocationPromptShown:"

export function travelLocationPromptKey(sessionId: string): string {
  return `${TRAVEL_LOCATION_PROMPT_SHOWN_PREFIX}${sessionId}`
}

function wasShown(
  storage: DismissalStorage | undefined,
  sessionId: string
): boolean {
  try {
    return storage?.getItem(travelLocationPromptKey(sessionId)) === "1"
  } catch {
    return false // storage unavailable: offer it rather than hide it silently
  }
}

export interface TravelerPromptInput {
  summary: IdentityVerificationSummaryView | null
  sessionId: string | null
  storage?: DismissalStorage
}

export function shouldOfferTravelerPrompt(input: TravelerPromptInput): boolean {
  if (!shouldShowTravelerLocationPrompt(input.summary)) return false
  if (!input.sessionId) return true // no id: offer it, nothing can be remembered
  return !wasShown(input.storage, input.sessionId)
}

/**
 * Remembers that the prompt was answered in this login. Keeps exactly one marker:
 * every marker for another session id is removed first. A no-op without a session id.
 */
export function markTravelerPromptShown(
  sessionId: string | null,
  storage: DismissalStorage | undefined
): void {
  if (!sessionId || !storage) return
  try {
    const current = travelLocationPromptKey(sessionId)
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

export { readSessionId }
