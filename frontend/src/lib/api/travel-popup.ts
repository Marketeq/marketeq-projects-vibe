// frontend/src/lib/api/travel-popup.ts
//
// Two small rules for the Travel Mode popup that need to be testable without a DOM.
// No UI lives here.
//
//  1. It stays open until the USER closes it. A toast closes itself after its duration
//     and reports that through the same onOpenChange(false) a user close does, so the
//     page cannot tell them apart by the callback alone. The close guard below accepts
//     a close only when a user gesture (the X, Escape or a swipe) marked it just before;
//     a timer-driven close is ignored and the popup stays. The duration is set to the
//     largest value browsers accept so the timer practically never fires either; it is
//     NOT Infinity, and never a value a browser would clamp to "immediately".
//  2. Which kind of Update the popup's Update action is: a reminder while Travel Mode is
//     still in force ("active"), or an ended Travel Mode ("expired"). Only the active
//     one skips the duration screen.
import { MAX_TIMER_MS } from "./travel-reminder"

/** setTimeout's largest safe delay (about 24.8 days): finite, and never clamped to 0. */
export const TRAVEL_POPUP_DURATION_MS = MAX_TIMER_MS

// How long after a user gesture a close still counts as that gesture's.
export const USER_CLOSE_WINDOW_MS = 1_000

export function createTravelPopupCloseGuard(now: () => number = () => Date.now()) {
  let markedAt: number | null = null
  return {
    /** Called by the X, Escape and swipe handlers just before the toast reports a close. */
    markUserClose(): void {
      markedAt = now()
    },
    /**
     * For the toast's onOpenChange: true only for a close that a user gesture just
     * marked. Opening, and any unmarked close (the toast's own timer), return false.
     */
    shouldClose(open: boolean): boolean {
      if (open) return false
      const marked = markedAt
      markedAt = null
      return marked !== null && now() - marked <= USER_CLOSE_WINDOW_MS
    },
  }
}

export type TravelPopupKind = "reminder" | "expiry"

/**
 * The Update action is an "active" update only for a reminder popup whose Travel Mode has
 * NOT ended since. A fresh /me read is used when there is one (the popup can stay open
 * for a long time); without it the popup's own kind decides. An expiry popup, or a
 * popup of unknown kind, is never an active update.
 */
export function isActiveTravelUpdate(
  popup: TravelPopupKind | null,
  freshSummary: { travelModeExpired: boolean | null } | null
): boolean {
  if (popup !== "reminder") return false
  return freshSummary?.travelModeExpired !== true
}
