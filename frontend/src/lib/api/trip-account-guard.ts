// frontend/src/lib/api/trip-account-guard.ts
//
// While a Didit overlay (or the trip it started) is active, the page must still belong to the
// account that launched it. The signed-in account can change underneath an open tab (another tab
// signs in as someone else, a session is replaced), and the page only learns that on its next
// authenticated read. This asks the canonical auth read (the same GET /user/me the auth provider
// uses) who is signed in NOW, and compares that account with the launching one.
//
// Event-driven only: the caller invokes it on a tab focus / visibility return, or before it accepts a
// Didit callback. There is no timer and no polling. One read runs at a time (a second call while one
// is in flight joins it), and a result is reused for a short gap so focus and visibility firing
// together, or repeated, produce a single read.
//
//   same     the same account is still signed in
//   changed  nobody is signed in, or a different account is
//   unknown  the read itself failed: nothing can be said about the account, so the caller must fail
//            safe (close the overlay, change no verification state)
export type AccountCheck = "same" | "changed" | "unknown"

export interface TripAccountGuardDeps {
  /** The signed-in account's id, or null when nobody is. Throws when the read cannot complete. */
  readCurrentAccountId: () => Promise<string | null>
  now?: () => number
  /** A result newer than this is reused instead of reading again. */
  minGapMs?: number
}

export const TRIP_ACCOUNT_RECHECK_GAP_MS = 1000

export function createTripAccountGuard(deps: TripAccountGuardDeps) {
  const now = deps.now ?? (() => Date.now())
  const gap = deps.minGapMs ?? TRIP_ACCOUNT_RECHECK_GAP_MS
  let inFlight: Promise<string | null | "error"> | null = null
  let last: { at: number; id: string | null | "error" } | null = null

  const read = (): Promise<string | null | "error"> => {
    if (inFlight) return inFlight
    const run = (async () => {
      try {
        return await deps.readCurrentAccountId()
      } catch {
        return "error" as const
      }
    })()
    inFlight = run
    void run.then((id) => {
      last = { at: now(), id }
      if (inFlight === run) inFlight = null
    })
    return run
  }

  return {
    /**
     * @param expectedId the account that launched the overlay
     * @param options.fresh read now even if a recent result exists (used before accepting a callback)
     */
    async check(expectedId: string, options: { fresh?: boolean } = {}): Promise<AccountCheck> {
      let id: string | null | "error"
      if (!options.fresh && !inFlight && last && now() - last.at < gap) id = last.id
      else id = await read()
      if (id === "error") return "unknown"
      return id !== null && id === expectedId ? "same" : "changed"
    },
  }
}

export interface TripWatcherDeps {
  guard: ReturnType<typeof createTripAccountGuard>
  /** The account that launched the overlay. */
  accountId: string
  isOverlayActive: () => boolean
  isTabVisible: () => boolean
  /** True once the watcher's owner (an effect) has been torn down: nothing more may happen. */
  isDisposed: () => boolean
  /** Close the overlay, invalidate its callbacks, drop the trip markers and retry state. */
  abort: () => void
}

/**
 * The two places the launching account is verified: when the tab is returned to while the overlay
 * is open, and before a Didit callback is accepted. Anything but "same" aborts; nothing else runs.
 */
export function createTripWatcher(deps: TripWatcherDeps) {
  return {
    onTabReturn(): Promise<void> {
      if (!deps.isTabVisible() || !deps.isOverlayActive()) return Promise.resolve()
      return deps.guard.check(deps.accountId).then((owner) => {
        if (deps.isDisposed() || owner === "same" || !deps.isOverlayActive()) return
        deps.abort()
      })
    },
    accept<E>(event: E, handle: (event: E) => void): Promise<void> {
      return deps.guard.check(deps.accountId, { fresh: true }).then((owner) => {
        if (deps.isDisposed()) return
        if (owner !== "same") {
          deps.abort()
          return
        }
        handle(event)
      })
    },
  }
}

/** The canonical read: GET /user/me, as the auth provider does. 401/403 means signed out. */
export async function readCurrentAccountIdFromAuth(): Promise<string | null> {
  const { UserAPI } = await import("@/service/http/user")
  try {
    const response = (await UserAPI.me()) as {
      status?: number
      data?: { user?: { id?: unknown }; data?: { user?: { id?: unknown } }; id?: unknown }
    }
    const body = response?.data
    const user = body?.user ?? body?.data?.user ?? body
    const id = (user as { id?: unknown } | undefined)?.id
    return typeof id === "string" && id.length > 0 ? id : null
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status
    if (status === 401 || status === 403) return null
    throw error
  }
}
