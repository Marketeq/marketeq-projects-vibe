// CSRF token held in memory only (never localStorage/sessionStorage).
// Set on login/refresh, fetched once on load, cleared on logout.
let _token: string | null = null

// Resolves once the first CSRF token arrives (login response or GET /auth/csrf).
// Write-request callers can await this to avoid racing ahead of the token.
let _readyResolve: (() => void) | null = null
let _ready: Promise<void> = new Promise((r) => { _readyResolve = r })

export const getCsrfToken = (): string | null => _token
export const setCsrfToken = (token: string | null): void => {
  _token = token
  if (token && _readyResolve) {
    _readyResolve()
    _readyResolve = null
  }
  if (!token) {
    // Reset the gate on logout so the next session waits again
    _ready = new Promise((r) => { _readyResolve = r })
  }
}

/** Resolves once a CSRF token is available (or immediately if already set). */
export const waitForCsrfToken = (): Promise<void> => _token ? Promise.resolve() : _ready

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

/** Return X-CSRF-Token header object for write methods, empty object otherwise. */
export const csrfHeader = (
  method?: string
): Record<string, string> => {
  if (!_token || !method || !WRITE_METHODS.has(method.toUpperCase())) return {}
  return { "X-CSRF-Token": _token }
}
