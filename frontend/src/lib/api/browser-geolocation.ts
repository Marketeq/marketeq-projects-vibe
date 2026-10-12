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

export type BrowserPositionResult =
  | { status: "ok"; latitude: number; longitude: number }
  | { status: "unsupported" }
  | { status: "denied" }
  | { status: "unavailable" }
  | { status: "timeout" }

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

// GeolocationPositionError codes.
const PERMISSION_DENIED = 1
const TIMEOUT = 3

const TIMEOUT_MS = 10_000

export function getBrowserPosition(
  geolocation: GeolocationLike | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator.geolocation
): Promise<BrowserPositionResult> {
  if (!geolocation || typeof geolocation.getCurrentPosition !== "function") {
    return Promise.resolve({ status: "unsupported" })
  }
  return new Promise((resolve) => {
    try {
      geolocation.getCurrentPosition(
        ({ coords }) => {
          const { latitude, longitude } = coords
          if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            Math.abs(latitude) > 90 ||
            Math.abs(longitude) > 180
          ) {
            resolve({ status: "unavailable" })
            return
          }
          resolve({ status: "ok", latitude, longitude })
        },
        (error) =>
          resolve({
            status:
              error?.code === PERMISSION_DENIED
                ? "denied"
                : error?.code === TIMEOUT
                  ? "timeout"
                  : "unavailable",
          }),
        // Coarse accuracy is all a city-level display needs, and it avoids a
        // slow GPS fix; a fresh position each time, never a cached one.
        { enableHighAccuracy: false, timeout: TIMEOUT_MS, maximumAge: 0 }
      )
    } catch {
      resolve({ status: "unavailable" })
    }
  })
}
