// frontend/src/lib/api/travel-activation-login.ts
//
// Which Travel Mode activations happened DURING the current login (PMCM-651). The persistent
// "Travel Mode is on" card announces an activation; the live "You are in Travel Mode / Update"
// card describes an account that is still traveling on a LATER login. So the live card stays
// hidden for an activation made in this login, and shows for one that was already in force
// when the login began, and on every login after the activation's own.
//
// Same identity mechanism as live-alert-dismissal.ts: the opaque `loginSessionKey` from GET /me
// is stable across refreshes and new for every login. One marker,
// `travelActivatedInLogin:<loginSessionKey>`, holds a JSON array of the activation occurrences
// (the period's end time from /me, different for every activation) made in that login; every
// marker of another login is removed whenever one is written. No clock, timer or age is
// compared. Without a key (an older token) or without storage nothing is remembered.
import type { DismissalStorage } from "./travel-expiry-popup"

export const TRAVEL_ACTIVATED_IN_LOGIN_PREFIX = "travelActivatedInLogin:"

export const travelActivatedInLoginStorageKey = (
  loginSessionKey: string
): string => `${TRAVEL_ACTIVATED_IN_LOGIN_PREFIX}${loginSessionKey}`

/** The activation occurrences made in this login. Unreadable or missing storage means none. */
export function readTravelActivationsInLogin(
  loginSessionKey: string | null | undefined,
  storage: DismissalStorage | undefined
): Set<string> {
  if (!loginSessionKey || !storage) return new Set()
  try {
    const raw = storage.getItem(
      travelActivatedInLoginStorageKey(loginSessionKey)
    )
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((k): k is string => typeof k === "string")
        : []
    )
  } catch {
    return new Set() // the Update card then shows rather than a card being lost
  }
}

/** Remembers an activation made in this login and drops the markers of every other login. */
export function rememberTravelActivationInLogin(
  loginSessionKey: string | null | undefined,
  occurrence: string,
  storage: DismissalStorage | undefined
): void {
  if (!loginSessionKey || !storage) return
  try {
    const current = travelActivatedInLoginStorageKey(loginSessionKey)
    const stale: string[] = []
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i)
      if (
        key &&
        key.startsWith(TRAVEL_ACTIVATED_IN_LOGIN_PREFIX) &&
        key !== current
      ) {
        stale.push(key)
      }
    }
    for (const key of stale) storage.removeItem(key)
    const occurrences = readTravelActivationsInLogin(loginSessionKey, storage)
    occurrences.add(occurrence)
    storage.setItem(current, JSON.stringify([...occurrences]))
  } catch {
    // storage unavailable: the page's in-memory copy still holds for this visit
  }
}
