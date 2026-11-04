// frontend/src/lib/api/verification-return-origin-browser.ts
//
// The browser-facing default for verification-return-origin.ts: the page the talent is on and
// the account this tab is signed in as, written just before the browser leaves for Didit. It
// never throws (a failure here must not stop the trip) and never runs outside a browser.
import {
  getReturnOriginAccount,
  markReturnOrigin,
} from "./verification-return-origin"

export function markCurrentPageAsReturnOrigin(hostedUrl: string): void {
  if (typeof window === "undefined") return
  try {
    markReturnOrigin({
      storage: window.localStorage,
      userId: getReturnOriginAccount(),
      path: `${window.location.pathname}${window.location.search}`,
      hostedUrl,
    })
  } catch {
    // storage unavailable: the return stays on the dashboard
  }
}

/**
 * The query string Didit returned on the callback, exactly as received. It is only ever
 * forwarded to the origin page; nothing is decided from it (the backend's status alone is).
 */
export function readReturnCallbackSearch(): string {
  if (typeof window === "undefined") return ""
  try {
    return window.location.search
  } catch {
    return ""
  }
}
