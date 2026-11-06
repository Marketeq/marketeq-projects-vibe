// frontend/src/lib/api/device-location-request.ts
//
// The device (GPS) location for a screen that shows the user's location (BTB-387). Every
// identity-verification entry point that opens such a screen asks here first:
//
//   * the browser produces the location        -> resolves with it;
//   * it cannot (blocked, dismissed, unsupported, unavailable, timed out, unresolvable)
//                                              -> the "Turn on location to continue" dialog
//                                                 opens and this waits for a successful
//                                                 Try Again;
//   * anything else (Cancel, Escape, the caller's signal, a route/account/role change, an
//     unmount, a newer attempt, a request already running)
//                                              -> resolves null.
//
// null means "no location": the caller stays on the screen it was on and opens nothing. There
// is no IP fallback anywhere in this path, and nothing is written (no verification session,
// home-country confirmation or Travel Mode change) before a location exists.
import type { DetectedLocation } from "./detected-location"
import type { LocationRecovery } from "./location-recovery"

export interface DeviceLocationRequestOptions {
  /** The caller's own cancellation (its unmount, account switch or newer press). */
  signal?: AbortSignal
  /** False once the caller no longer wants the answer. */
  isCurrent?: () => boolean
}

export type DeviceLocationRequester = (
  options?: DeviceLocationRequestOptions
) => Promise<DetectedLocation | null>

export function createDeviceLocationRequester(config: {
  /** Asks the browser for the device location once (never the IP lookup). */
  detect: (options: DeviceLocationRequestOptions) => Promise<DetectedLocation>
  recovery: Pick<LocationRecovery, "open" | "abort" | "state">
  /** Changes whenever the host's pending attempts are invalidated (route, account, role, unmount). */
  attempt: () => number
}): DeviceLocationRequester {
  let running = false
  return async (options = {}) => {
    // One request at a time, and never beside an open dialog: a duplicate press is ignored.
    if (running || config.recovery.state.open) return null
    running = true
    const attempt = config.attempt()
    const live = () =>
      attempt === config.attempt() &&
      !options.signal?.aborted &&
      (options.isCurrent?.() ?? true)
    const onAbort = () => config.recovery.abort()
    options.signal?.addEventListener("abort", onAbort, { once: true })
    try {
      const location = await config.detect({
        signal: options.signal,
        isCurrent: options.isCurrent,
      })
      if (location.cancelled || !live()) return null
      if (!location.locationFailure) return location
      const reason = location.locationFailure
      const resolved = await new Promise<DetectedLocation | null>((resolve) => {
        config.recovery.open(reason, {
          onSuccess: (found) => resolve(found),
          onDismiss: () => resolve(null),
        })
      })
      return resolved && live() ? resolved : null
    } finally {
      options.signal?.removeEventListener("abort", onAbort)
      running = false
    }
  }
}
