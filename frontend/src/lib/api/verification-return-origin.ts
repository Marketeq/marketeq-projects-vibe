// frontend/src/lib/api/verification-return-origin.ts
//
// Where the talent was when verification started, so that after the external Didit website the
// browser goes back to that exact page and the result dialog and alert appear there.
//
// Didit's callback is built by the backend as `<frontend origin>/talent-dashboard` (the request's
// own origin, accepted only from the server's FRONTEND_URL list). That is unchanged: nothing is
// sent to the backend and no return URL is ever supplied to Didit. Instead this browser keeps a
// small record of where it left from, and the dashboard callback hands the talent straight back.
//
//   stored       only an internal relative route (path + query), never a URL. It is sanitized on
//                the way in and again on the way out: absolute and protocol-relative URLs,
//                backslashes, control characters, the sign-in / sign-up / onboarding family, the
//                dashboard itself and framework paths are all refused. A refused origin stores
//                nothing, and the return then stays on the dashboard (the previous behaviour).
//   per account  the key carries the user id, so another account on the same browser can never
//                read or consume it.
//   per session  an entry is keyed by the Didit hosted-session link it was started for. A second
//                start for the same link (the 15-minute resume reuses the session) replaces that
//                entry; a different link is a separate entry, and a return consumes only the one
//                it belongs to (matched on the callback's own parameters when they name it, the
//                most recent start otherwise).
//   expiry       an entry older than two hours is ignored and removed.
//   consumed     removing the entry is the same synchronous step that returns it, so a refresh,
//                Back, another tab or StrictMode can never replay the hand-off.
//   callback     every query parameter Didit returned is carried onto the origin route; nothing
//                is dropped or renamed.
import { isIdentityHostActive } from "./identity-host-routes"

export const RETURN_ORIGIN_KEY_PREFIX =
  "marketeq:identity-verification:return-origin:"
export const RETURN_ORIGIN_TTL_MS = 2 * 60 * 60 * 1000
export const RETURN_ORIGIN_MAX_ENTRIES = 5
export const DASHBOARD_PATH = "/talent-dashboard"
const MAX_PATH_LENGTH = 2048
const INTERNAL_BASE = "http://internal.invalid"

export interface ReturnOriginStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

interface Entry {
  /** the origin route: path and query, no hash */
  p: string
  /** the Didit hosted-session link's last path segment: which session this start belongs to */
  k: string
  /** when it was stored */
  at: number
}

export const returnOriginKey = (userId: string): string =>
  `${RETURN_ORIGIN_KEY_PREFIX}${userId}`

// The account this tab is signed in as. The host keeps it current; the Didit start paths (which
// cannot see the auth context) read it. It is only a label for the storage key, never a trust.
let currentAccount: string | null = null
export const setReturnOriginAccount = (userId: string | null): void => {
  currentAccount = userId
}
export const getReturnOriginAccount = (): string | null => currentAccount

/**
 * The internal route to come back to, or null. Only a same-site relative path survives; the
 * dashboard (the default), the public / sign-in family and framework paths do not.
 */
export function sanitizeReturnPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  if (raw.length === 0 || raw.length > MAX_PATH_LENGTH) return null
  if (!raw.startsWith("/") || raw.startsWith("//")) return null
  if (raw.includes("\\") || /[\u0000-\u001f\u007f\s]/.test(raw)) return null
  let url: URL
  try {
    url = new URL(raw, INTERNAL_BASE)
  } catch {
    return null
  }
  if (url.origin !== INTERNAL_BASE) return null
  const pathname = url.pathname
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return null
  if (pathname === DASHBOARD_PATH || pathname === `${DASHBOARD_PATH}/`) return null
  if (pathname === "/api" || pathname.startsWith("/api/")) return null
  if (pathname === "/_next" || pathname.startsWith("/_next/")) return null
  // The pages the host is inert on (and so can never show a result) are never a destination.
  if (!isIdentityHostActive({ pathname, userId: "x" })) return null
  return `${pathname}${url.search}`
}

function hostedSessionKey(hostedUrl: unknown): string {
  if (typeof hostedUrl !== "string") return ""
  try {
    const segments = new URL(hostedUrl).pathname.split("/").filter(Boolean)
    return segments[segments.length - 1] ?? ""
  } catch {
    return ""
  }
}

function readEntries(
  storage: ReturnOriginStorage | undefined,
  userId: string,
  now: number
): Entry[] {
  try {
    const raw = storage?.getItem(returnOriginKey(userId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (e): e is Entry =>
        !!e &&
        typeof e === "object" &&
        typeof (e as Entry).p === "string" &&
        typeof (e as Entry).k === "string" &&
        Number.isFinite((e as Entry).at) &&
        (e as Entry).at <= now &&
        now - (e as Entry).at <= RETURN_ORIGIN_TTL_MS &&
        sanitizeReturnPath((e as Entry).p) !== null
    )
  } catch {
    return []
  }
}

function writeEntries(
  storage: ReturnOriginStorage | undefined,
  userId: string,
  entries: Entry[]
): void {
  try {
    if (entries.length === 0) storage?.removeItem(returnOriginKey(userId))
    else storage?.setItem(returnOriginKey(userId), JSON.stringify(entries))
  } catch {
    // storage unavailable: the return simply stays on the dashboard
  }
}

/**
 * Remembers where this account started verification, for the Didit link it is about to open.
 * A missing account, a refused route or unavailable storage store nothing (the dashboard default).
 */
export function markReturnOrigin(input: {
  storage: ReturnOriginStorage | undefined
  userId: string | null | undefined
  /** the page the talent is on: its path and query */
  path: unknown
  hostedUrl: unknown
  now?: number
}): boolean {
  const { storage, userId } = input
  const now = input.now ?? Date.now()
  if (!userId) return false
  const path = sanitizeReturnPath(input.path)
  if (!path) return false
  const key = hostedSessionKey(input.hostedUrl)
  const others = readEntries(storage, userId, now).filter((e) => e.k !== key)
  const next = [...others, { p: path, k: key, at: now }].slice(
    -RETURN_ORIGIN_MAX_ENTRIES
  )
  writeEntries(storage, userId, next)
  return true
}

/** Whether this account has a live origin (without consuming it). */
export function hasReturnOrigin(
  storage: ReturnOriginStorage | undefined,
  userId: string | null | undefined,
  now: number = Date.now()
): boolean {
  return !!userId && readEntries(storage, userId, now).length > 0
}

/** Forgets every origin this account stored. */
export function clearReturnOrigins(
  storage: ReturnOriginStorage | undefined,
  userId: string | null | undefined
): void {
  if (!userId) return
  try {
    storage?.removeItem(returnOriginKey(userId))
  } catch {
    // nothing to do
  }
}

/**
 * The origin route this return belongs to, consumed in the same step. The callback's own query
 * parameters pick the entry they name (a value equal to the session key); otherwise the most
 * recent start. Null when there is none.
 */
export function consumeReturnOrigin(input: {
  storage: ReturnOriginStorage | undefined
  userId: string | null | undefined
  callbackSearch?: string
  now?: number
}): string | null {
  const { storage, userId } = input
  const now = input.now ?? Date.now()
  if (!userId) return null
  const entries = readEntries(storage, userId, now)
  if (entries.length === 0) {
    clearReturnOrigins(storage, userId) // drop an expired or malformed record
    return null
  }
  let values: string[] = []
  try {
    values = [...new URLSearchParams(input.callbackSearch ?? "").values()]
  } catch {
    values = []
  }
  const named = entries.find((e) => e.k !== "" && values.includes(e.k))
  const chosen = named ?? entries[entries.length - 1]
  writeEntries(
    storage,
    userId,
    entries.filter((e) => e !== chosen)
  )
  return chosen.p
}

/** The origin route with every Didit callback parameter carried over (callback wins on a clash). */
export function buildHandoffTarget(
  originPath: string,
  callbackSearch: string | undefined
): string | null {
  const safe = sanitizeReturnPath(originPath)
  if (!safe) return null
  const url = new URL(safe, INTERNAL_BASE)
  let incoming: URLSearchParams
  try {
    incoming = new URLSearchParams(callbackSearch ?? "")
  } catch {
    incoming = new URLSearchParams()
  }
  const merged = new URLSearchParams(url.search)
  const seen = new Set<string>()
  for (const [name, value] of incoming) {
    if (!seen.has(name)) {
      merged.delete(name)
      seen.add(name)
    }
    merged.append(name, value)
  }
  const query = merged.toString()
  return `${url.pathname}${query ? `?${query}` : ""}`
}

/**
 * Whether this page load is a return to hand off: a fresh navigation (not a reload, Back or a
 * restored page) onto the dashboard callback, by an account that left for Didit.
 */
export function shouldHandOffReturn(input: {
  pathname: string | null | undefined
  navigationType: string | null | undefined
  awaitingResult: boolean
}): boolean {
  return (
    input.pathname === DASHBOARD_PATH &&
    input.navigationType === "navigate" &&
    input.awaitingResult
  )
}
