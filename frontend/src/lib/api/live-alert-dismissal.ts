// frontend/src/lib/api/live-alert-dismissal.ts
//
// Per-LOGIN dismissal of the live status alerts (PMCM-651): today only the "You are in
// Travel Mode" card. It is derived from the current identity state, never stored in
// notification-service, so nothing is sent to the backend: the dismissal lives in this
// browser, keyed by the opaque `loginSessionKey` that
// GET /me returns (the same design as travel-expiry-popup.ts). A refresh keeps the key, a
// new login gets a new one (so the card returns), and another account never shares it.
//
// One marker, `liveStatusAlertsDismissed:<loginSessionKey>`, holds a JSON array of the live
// keys dismissed in that login; every marker for another login is removed whenever one is
// written, so at most one exists. Without a key (an older token) nothing is stored, and a
// dismissal lasts until the page is reloaded.
import type { DismissalStorage } from "./travel-expiry-popup"

export const LIVE_ALERT_DISMISSED_PREFIX = "liveStatusAlertsDismissed:"

export const liveAlertDismissalStorageKey = (loginSessionKey: string): string =>
  `${LIVE_ALERT_DISMISSED_PREFIX}${loginSessionKey}`

/** The live keys dismissed in this login. Unreadable or missing storage means none. */
export function readLiveDismissals(
  loginSessionKey: string | null | undefined,
  storage: DismissalStorage | undefined
): Set<string> {
  if (!loginSessionKey || !storage) return new Set()
  try {
    const raw = storage.getItem(liveAlertDismissalStorageKey(loginSessionKey))
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((k): k is string => typeof k === "string")
        : []
    )
  } catch {
    return new Set() // show it rather than hide it silently
  }
}

/** Remembers `liveKey` for this login and drops the markers of every other login. */
export function rememberLiveDismissal(
  loginSessionKey: string | null | undefined,
  liveKey: string,
  storage: DismissalStorage | undefined
): void {
  if (!loginSessionKey || !storage) return
  try {
    const current = liveAlertDismissalStorageKey(loginSessionKey)
    const stale: string[] = []
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i)
      if (
        key &&
        key.startsWith(LIVE_ALERT_DISMISSED_PREFIX) &&
        key !== current
      ) {
        stale.push(key)
      }
    }
    for (const key of stale) storage.removeItem(key)
    const keys = readLiveDismissals(loginSessionKey, storage)
    keys.add(liveKey)
    storage.setItem(current, JSON.stringify([...keys]))
  } catch {
    // storage unavailable: it simply returns after a refresh
  }
}
