// frontend/src/lib/api/travel-expiry-popup.ts
//
// When to show the Travel Mode expiry popup and how closing it is remembered. The
// backend says whether Travel Mode expired (travelModeExpired) and whether the account
// is fully verified (fullyVerified); this file adds only the per-LOGIN dismissal, keyed
// by the existing readable `session_id` cookie (a new login has a new session id; a
// refresh keeps it). No time, duration or expiry rule lives here.
//
//   shown   travelModeExpired === true AND fullyVerified === false AND not dismissed
//           for this session id. A fully verified account never sees it (that case is
//           undecided, so it is deliberately not handled); an unknown value shows nothing.
//   closing the X stores localStorage["travelExpiryDismissed:<sid>"] and removes the
//           marker of every other session, so at most ONE marker ever exists.
//   no session id  the popup is shown and nothing is persisted (it may reappear after a
//           refresh); dismissal never leaks across logins.

export const TRAVEL_EXPIRY_DISMISSED_PREFIX = "travelExpiryDismissed:"
export const SESSION_COOKIE_NAME = "session_id"

// The part of Storage this file uses (so tests can pass a fake).
export interface DismissalStorage {
  readonly length: number
  key: (index: number) => string | null
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export function travelExpiryDismissalKey(sessionId: string): string {
  return `${TRAVEL_EXPIRY_DISMISSED_PREFIX}${sessionId}`
}

/** One cookie's value from a document.cookie string, or null when absent or empty. */
export function readCookieValue(cookieString: string, name: string): string | null {
  for (const part of cookieString.split(";")) {
    const at = part.indexOf("=")
    if (at === -1) continue
    if (part.slice(0, at).trim() !== name) continue
    const raw = part.slice(at + 1).trim()
    if (!raw) return null
    try {
      return decodeURIComponent(raw)
    } catch {
      return raw
    }
  }
  return null
}

/** The current login's session id, read from the browser's own cookie; null if absent. */
export function readSessionId(
  cookieString: string | undefined = typeof document === "undefined" ? undefined : document.cookie
): string | null {
  return cookieString ? readCookieValue(cookieString, SESSION_COOKIE_NAME) : null
}

function wasDismissed(storage: DismissalStorage | undefined, sessionId: string): boolean {
  try {
    return storage?.getItem(travelExpiryDismissalKey(sessionId)) === "1"
  } catch {
    return false // storage unavailable: show it rather than hide it silently
  }
}

export interface ExpiryPopupInput {
  expired: boolean | null
  fullyVerified: boolean | null
  sessionId: string | null
  storage?: DismissalStorage
}

export function shouldShowTravelExpiryPopup(input: ExpiryPopupInput): boolean {
  if (input.expired !== true) return false
  if (input.fullyVerified !== false) return false // verified (undecided) or unknown: nothing
  if (!input.sessionId) return true // no id: show, and nothing can be remembered
  return !wasDismissed(input.storage, input.sessionId)
}

/**
 * Remembers that the user closed the popup in this login. Keeps exactly one marker:
 * every marker for another session id is removed first. A no-op without a session id.
 */
export function dismissTravelExpiryPopup(
  sessionId: string | null,
  storage: DismissalStorage | undefined
): void {
  if (!sessionId || !storage) return
  try {
    const current = travelExpiryDismissalKey(sessionId)
    const stale: string[] = []
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i)
      if (key && key.startsWith(TRAVEL_EXPIRY_DISMISSED_PREFIX) && key !== current) {
        stale.push(key)
      }
    }
    for (const key of stale) storage.removeItem(key)
    storage.setItem(current, "1")
  } catch {
    // storage unavailable: it simply reappears after a refresh
  }
}
