// frontend/src/lib/api/home-country-change-result.ts
//
// Which success notification a browser shows after it comes back from Didit.
//
// A browser that went to Didit to change the home country remembers that for the trip
// (a one-shot localStorage flag, set only when the home-country-change session is
// started). When the account is then seen complete in THIS browser, the existing
// "You're all set!" modal is shown as always and the existing success alert carries the
// location-specific copy instead of the generic one. Everything else stays generic:
//
//   ordinary verification     the flag is cleared when an ordinary session is started, so
//                             an ordinary approval can never show the home-country alert.
//   once only                 reading the flag removes it, so a duplicate webhook, a
//                             reconcile, a poll or a page refresh can never show it twice.
//   approval after in review  the pending modal clears the flag. The approval then reaches
//                             the user through the backend notification path, and no modal
//                             or alert is opened by this browser.
//   expiry                    a flag older than a day (or from the future) is ignored.
//
// Nothing here decides whether the home country changed: that is the backend's, and this
// flag only says what this browser was doing when it left for Didit.
export const HOME_COUNTRY_CHANGE_KEY =
  "marketeq:identity-verification:home-country-change"
export const HOME_COUNTRY_CHANGE_TTL_MS = 24 * 60 * 60 * 1000

export type SuccessAlertKind = "verified" | "home-country-updated"

// Figma node 13101-47577: the success alert with a map pin, same box as the generic one.
export const HOME_COUNTRY_UPDATED_ALERT = {
  title: "Your home country was updated.",
  description:
    "You can continue using the platform while away from your home country.",
} as const

export interface FlagStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

/** Records (isChange) or removes (!isChange) the flag for the trip to Didit that is starting. */
export function markHomeCountryChange(
  storage: FlagStorage | undefined,
  isChange: boolean,
  now: number = Date.now()
): void {
  try {
    if (isChange) storage?.setItem(HOME_COUNTRY_CHANGE_KEY, String(now))
    else storage?.removeItem(HOME_COUNTRY_CHANGE_KEY)
  } catch {
    // storage unavailable: the generic success alert is shown instead
  }
}

/** Forgets the flag without reading it. */
export function clearHomeCountryChange(storage: FlagStorage | undefined): void {
  try {
    storage?.removeItem(HOME_COUNTRY_CHANGE_KEY)
  } catch {
    // nothing to do
  }
}

/**
 * True ONCE for a valid, recent flag, and always removes it. A missing, unparsable,
 * future or expired flag is false (and removed), so the generic alert is the fallback.
 */
export function consumeHomeCountryChange(
  storage: FlagStorage | undefined,
  now: number = Date.now()
): boolean {
  try {
    const raw = storage?.getItem(HOME_COUNTRY_CHANGE_KEY)
    storage?.removeItem(HOME_COUNTRY_CHANGE_KEY)
    if (!raw) return false
    const startedAt = Number(raw)
    if (!Number.isFinite(startedAt) || startedAt > now) return false
    return now - startedAt <= HOME_COUNTRY_CHANGE_TTL_MS
  } catch {
    return false
  }
}

export function successAlertKindFor(
  homeCountryChanged: boolean
): SuccessAlertKind {
  return homeCountryChanged ? "home-country-updated" : "verified"
}
