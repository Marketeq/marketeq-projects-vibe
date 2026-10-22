// frontend/src/lib/api/travel-expiry-popup.ts
//
// When to show the Travel Mode expiry popup and how closing it is remembered. The
// backend says whether Travel Mode expired (travelModeExpired); this file adds only the
// per-LOGIN dismissal, keyed by the opaque `loginSessionKey` that GET /me returns (the
// `session_id` cookie is HttpOnly and is never read here; a new login has a new key, a
// refresh keeps it, and another account never shares it). No time, duration or expiry rule lives
// here, and verification status plays no part: Travel Mode never changes identity or
// location status, fullyVerified, isVerified, inGrace or gate access, so verified and
// unverified accounts see the popup alike.
//
//   shown   travelModeExpired === true AND not dismissed for this session id. It stops
//           when the backend clears the state (home-country confirmation) or a new
//           Travel Mode period starts (travelModeExpired is then false); an unknown
//           value shows nothing.
//   closing the X stores localStorage["travelExpiryDismissed:<key>"] and removes the
//           marker of every other login, so at most ONE marker ever exists.
//   no key  the popup is shown and nothing is persisted (it may reappear after a
//           refresh); dismissal never leaks across logins.

export const TRAVEL_EXPIRY_DISMISSED_PREFIX = "travelExpiryDismissed:"

// The part of Storage this file uses (so tests can pass a fake).
export interface DismissalStorage {
  readonly length: number
  key: (index: number) => string | null
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export function travelExpiryDismissalKey(loginSessionKey: string): string {
  return `${TRAVEL_EXPIRY_DISMISSED_PREFIX}${loginSessionKey}`
}

function wasDismissed(storage: DismissalStorage | undefined, loginSessionKey: string): boolean {
  try {
    return storage?.getItem(travelExpiryDismissalKey(loginSessionKey)) === "1"
  } catch {
    return false // storage unavailable: show it rather than hide it silently
  }
}

export interface ExpiryPopupInput {
  expired: boolean | null
  loginSessionKey: string | null
  storage?: DismissalStorage
}

export function shouldShowTravelExpiryPopup(input: ExpiryPopupInput): boolean {
  if (input.expired !== true) return false
  if (!input.loginSessionKey) return true // no key: show, and nothing can be remembered
  return !wasDismissed(input.storage, input.loginSessionKey)
}

/**
 * Remembers that the user closed the popup in this login. Keeps exactly one marker:
 * every marker for another login is removed first. A no-op without a key.
 */
export function dismissTravelExpiryPopup(
  loginSessionKey: string | null,
  storage: DismissalStorage | undefined
): void {
  if (!loginSessionKey || !storage) return
  try {
    const current = travelExpiryDismissalKey(loginSessionKey)
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
