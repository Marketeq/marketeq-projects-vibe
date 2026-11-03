// frontend/src/lib/api/location-recovery.ts
//
// The state machine behind the "Turn on location to continue" dialog. It is shown when
// the DEVICE location could not be obtained (denied, dismissed, blocked, unavailable);
// there is no network (IP) fallback. While it is open, verification stays blocked: the
// location-confirmation flow opens only when a retry produces a GPS result.
//
//   open()       shows the dialog for a failure reason, with what to do next.
//   tryAgain()   asks the browser for the device location again. One request at a time:
//                a second press while one is in flight is ignored. A GPS result closes
//                the dialog and hands the location to onSuccess; another failure keeps
//                the dialog open with the new reason. The busy state (the button's
//                spinner) lasts at least `minBusyMs`: a browser that refuses at once
//                (a blocked permission answers in milliseconds) would otherwise flash
//                it for a frame, and the press would look like it did nothing.
//   showHowTo()  switches to the instructions view (the same dialog, not a second one).
//   back()       returns from the instructions to the main view.
//   cancel()     the user gave up (Cancel, Escape, outside click): closes the dialog.
//   abort()      the attempt no longer exists (route, logout, account or role change,
//                unmount): closes the dialog the same way.
//
// Every request carries an AbortSignal and an isCurrent() check; cancel/abort invalidate
// them, so a late answer can never reopen the dialog, open the flow or re-enable
// anything.

import type {
  DetectedLocation,
  LocationFailureReason,
} from "./detected-location"

export type RecoveryView = "main" | "howto"

export interface LocationRecoveryState {
  open: boolean
  reason: LocationFailureReason
  view: RecoveryView
  /** A retry is in flight. */
  busy: boolean
}

export interface RecoveryHooks {
  /** A retry produced the device location. The dialog is already closed. */
  onSuccess: (location: DetectedLocation) => void
  /** The dialog was closed without a location. */
  onDismiss: (kind: "cancel" | "abort") => void
}

export interface RecoveryDetectContext {
  signal: AbortSignal
  isCurrent: () => boolean
}

export interface LocationRecovery {
  readonly state: LocationRecoveryState
  open: (reason: LocationFailureReason, hooks: RecoveryHooks) => void
  tryAgain: () => Promise<void>
  showHowTo: () => void
  back: () => void
  cancel: () => void
  abort: () => void
}

const CLOSED: LocationRecoveryState = {
  open: false,
  reason: "blocked",
  view: "main",
  busy: false,
}

export function createLocationRecovery(config: {
  /** Requests the device location once (the same call Verify My Account makes). */
  detect: (context: RecoveryDetectContext) => Promise<DetectedLocation>
  onChange?: (state: LocationRecoveryState) => void
  /** The least time a retry stays busy, so its spinner is actually seen. Default 0. */
  minBusyMs?: number
  /** Test seam: waits this many milliseconds. Defaults to a timer. */
  wait?: (ms: number) => Promise<void>
  /** Test seam: the clock, in milliseconds. Defaults to Date.now. */
  now?: () => number
}): LocationRecovery {
  const minBusyMs = config.minBusyMs ?? 0
  const wait =
    config.wait ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  const now = config.now ?? (() => Date.now())
  let state: LocationRecoveryState = CLOSED
  let hooks: RecoveryHooks | null = null
  let generation = 0
  let controller: AbortController | null = null

  const set = (next: LocationRecoveryState) => {
    state = next
    config.onChange?.(state)
  }

  const close = (kind: "cancel" | "abort") => {
    if (!state.open) return
    generation += 1
    controller?.abort()
    controller = null
    const current = hooks
    hooks = null
    set(CLOSED)
    current?.onDismiss(kind)
  }

  return {
    get state() {
      return state
    },
    open(reason, nextHooks) {
      // A second opening replaces the first: the first one is dismissed.
      if (state.open) close("abort")
      hooks = nextHooks
      set({ open: true, reason, view: "main", busy: false })
    },
    async tryAgain() {
      if (!state.open || state.busy) return
      const mine = ++generation
      const own = new AbortController()
      controller = own
      set({ ...state, busy: true })
      const startedAt = now()
      let result: DetectedLocation
      try {
        result = await config.detect({
          signal: own.signal,
          isCurrent: () => mine === generation,
        })
      } catch {
        // A thrown detection is a failure to read the device location.
        result = {
          city: "",
          region: "",
          countryCode: "",
          countryName: "",
          latitude: null,
          longitude: null,
          detected: false,
          serviceUnavailable: false,
          locationFailure: "resolve_failed",
        }
      }
      // Keep the spinner up for at least minBusyMs; the answer is applied after that, and
      // only if this attempt is still the live one (Cancel, abort or a new dialog during
      // the wait drops it).
      const remaining = minBusyMs - (now() - startedAt)
      if (remaining > 0 && !result.cancelled) await wait(remaining)
      if (mine !== generation || !state.open) return // closed or replaced meanwhile
      controller = null
      if (result.cancelled) {
        set({ ...state, busy: false })
        return
      }
      if (result.locationFailure) {
        set({ ...state, busy: false, reason: result.locationFailure })
        return
      }
      const current = hooks
      hooks = null
      generation += 1
      set(CLOSED)
      current?.onSuccess(result)
    },
    showHowTo() {
      if (state.open && state.view === "main") set({ ...state, view: "howto" })
    },
    back() {
      if (state.open && state.view === "howto") set({ ...state, view: "main" })
    },
    cancel() {
      close("cancel")
    },
    abort() {
      close("abort")
    },
  }
}
