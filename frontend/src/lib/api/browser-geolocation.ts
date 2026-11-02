// frontend/src/lib/api/browser-geolocation.ts
//
// Thin wrapper over navigator.geolocation.getCurrentPosition for the location
// dialog. It is called ONLY from an explicit user action (Verify My Account /
// Retry) — never on page load — because the call itself triggers the browser's
// permission prompt. It does not weaken the browser's secure-context rules:
// localhost and HTTPS work, anything else is simply reported "unavailable".
//
// The position is returned to the caller for one immediate server round trip
// and is never stored, cached or logged here.
//
// WHY the timeout is not handed to the browser (BTB-387):
// Chrome counts the time the native permission prompt is open against
// getCurrentPosition's `timeout` (measured in real Chrome: with the prompt
// unanswered the permission state stays "prompt" and the error callback fires
// with code 3 exactly when the timeout elapses). A user who simply had not
// answered yet was therefore reported as a failure, the approximate-location
// consent opened under Chrome's prompt, and a later "Allow" went nowhere.
//
// So the request is made with the largest native timeout, which never fires
// while the prompt waits, and OUR OWN timer measures only the time after the
// permission is granted (the only time a missing position is a real failure):
//
//   permission "prompt"  -> wait. No timer runs. The prompt's own outcome decides:
//                           Allow  -> the pending request succeeds (or our timer starts
//                                     on the change to "granted");
//                           Block / X / dismiss -> the request errors with code 1.
//   permission "granted" -> our timer runs; no position in time => "timeout".
//   permission "denied"  -> "denied".
//   no Permissions API   -> cannot observe the prompt, so the timer starts at once
//                           (the old behaviour, and the only safe bound there).
//
// The first outcome wins; every later callback, event or timer is ignored. An
// AbortSignal cancels the wait ("cancelled") and removes every listener and timer.

export type BrowserPositionResult =
  | { status: "ok"; latitude: number; longitude: number }
  | { status: "unsupported" }
  | { status: "denied" }
  | { status: "unavailable" }
  | { status: "timeout" }
  | { status: "cancelled" }

export interface GeolocationLike {
  getCurrentPosition: (
    success: (position: {
      coords: { latitude: number; longitude: number }
    }) => void,
    error: (error: { code: number }) => void,
    options?: {
      enableHighAccuracy?: boolean
      timeout?: number
      maximumAge?: number
    }
  ) => void
}

export interface PermissionStatusLike {
  readonly state: string
  addEventListener: (type: "change", listener: () => void) => void
  removeEventListener: (type: "change", listener: () => void) => void
}

export interface PermissionsLike {
  query: (descriptor: { name: "geolocation" }) => Promise<PermissionStatusLike>
}

export interface TimersLike {
  set: (callback: () => void, ms: number) => unknown
  clear: (handle: unknown) => void
}

export interface GetBrowserPositionOptions {
  /** Defaults to navigator.permissions. Pass null to simulate a browser without it. */
  permissions?: PermissionsLike | null
  signal?: AbortSignal
  timers?: TimersLike
  /** How long after the permission is granted a missing position counts as a failure. */
  timeoutMs?: number
}

// GeolocationPositionError codes.
const PERMISSION_DENIED = 1
const TIMEOUT = 3

// Time allowed for a position once the permission is granted.
const TIMEOUT_MS = 10_000
// Largest value the API accepts (unsigned long): never fires while a prompt waits.
const NATIVE_NO_TIMEOUT_MS = 0xffffffff
// A browser that reports a native timeout while the prompt is still unanswered is asked again.
const REENQUEUE_MS = 1_000

const defaultTimers: TimersLike = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
}

function browserPermissions(): PermissionsLike | undefined {
  if (typeof navigator === "undefined") return undefined
  const permissions = (navigator as { permissions?: PermissionsLike })
    .permissions
  return permissions && typeof permissions.query === "function"
    ? permissions
    : undefined
}

export function getBrowserPosition(
  geolocation: GeolocationLike | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator.geolocation,
  options: GetBrowserPositionOptions = {}
): Promise<BrowserPositionResult> {
  if (!geolocation || typeof geolocation.getCurrentPosition !== "function") {
    return Promise.resolve({ status: "unsupported" })
  }
  const permissions =
    options.permissions === null
      ? undefined
      : (options.permissions ?? browserPermissions())
  const timers = options.timers ?? defaultTimers
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS
  const { signal } = options

  return new Promise((resolve) => {
    let settled = false
    let timer: unknown
    let retry: unknown
    let status: PermissionStatusLike | undefined
    let onChange: (() => void) | undefined

    const onAbort = () => finish({ status: "cancelled" })
    function finish(result: BrowserPositionResult) {
      if (settled) return
      settled = true
      if (timer !== undefined) timers.clear(timer)
      if (retry !== undefined) timers.clear(retry)
      if (status && onChange) status.removeEventListener("change", onChange)
      signal?.removeEventListener("abort", onAbort)
      resolve(result)
    }

    if (signal?.aborted) {
      finish({ status: "cancelled" })
      return
    }
    signal?.addEventListener("abort", onAbort, { once: true })

    const startTimer = () => {
      if (settled || timer !== undefined) return
      timer = timers.set(() => finish({ status: "timeout" }), timeoutMs)
    }

    const onSuccess = ({
      coords,
    }: {
      coords: { latitude: number; longitude: number }
    }) => {
      if (settled) return
      const { latitude, longitude } = coords
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        Math.abs(latitude) > 90 ||
        Math.abs(longitude) > 180
      ) {
        finish({ status: "unavailable" })
        return
      }
      finish({ status: "ok", latitude, longitude })
    }

    const onError = (error: { code: number }) => {
      if (settled) return
      if (error?.code === PERMISSION_DENIED) {
        finish({ status: "denied" })
      } else if (error?.code === TIMEOUT) {
        onNativeTimeout()
      } else {
        finish({ status: "unavailable" })
      }
    }

    // A native timeout is only a failure once the permission is granted.
    const onNativeTimeout = () => {
      if (!status) {
        finish({ status: "timeout" })
        return
      }
      if (status.state === "prompt") {
        // Still unanswered: not a denial. Ask again shortly; the answer decides.
        retry = timers.set(() => {
          retry = undefined
          request()
        }, REENQUEUE_MS)
      } else if (status.state === "denied") {
        finish({ status: "denied" })
      } else {
        finish({ status: "timeout" })
      }
    }

    function request() {
      if (settled) return
      try {
        geolocation!.getCurrentPosition(onSuccess, onError, {
          enableHighAccuracy: false,
          timeout: NATIVE_NO_TIMEOUT_MS,
          maximumAge: 0,
        })
      } catch {
        finish({ status: "unavailable" })
      }
    }

    request()
    if (settled) return

    if (!permissions) {
      startTimer()
      return
    }
    void permissions
      .query({ name: "geolocation" })
      .then((current) => {
        if (settled) return
        status = current
        const sync = () => {
          if (settled) return
          if (current.state === "granted") startTimer()
          else if (current.state === "denied") finish({ status: "denied" })
        }
        onChange = sync
        current.addEventListener("change", sync)
        sync()
      })
      .catch(() => startTimer())
  })
}

/**
 * Calls `listener` once when the browser's geolocation permission CHANGES to
 * "granted" (e.g. the user allows it in Chrome's prompt or site settings). A
 * permission that is already granted never triggers it, and repeated change
 * events trigger it once. Returns a function that stops watching. Without the
 * Permissions API it watches nothing.
 */
export function onGeolocationGranted(
  listener: () => void,
  permissions: PermissionsLike | null | undefined = browserPermissions()
): () => void {
  if (!permissions) return () => {}
  let disposed = false
  let fired = false
  let status: PermissionStatusLike | undefined
  let previous: string | undefined
  const onChange = () => {
    if (disposed || !status) return
    const state = status.state
    const becameGranted = state === "granted" && previous !== "granted"
    previous = state
    if (becameGranted && !fired) {
      fired = true
      listener()
    }
  }
  void permissions
    .query({ name: "geolocation" })
    .then((current) => {
      if (disposed) return
      status = current
      previous = current.state
      current.addEventListener("change", onChange)
    })
    .catch(() => {})
  return () => {
    disposed = true
    if (status) status.removeEventListener("change", onChange)
  }
}
