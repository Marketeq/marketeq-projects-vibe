// CSRF token held in memory only (never localStorage/sessionStorage).
// Set on login/refresh, fetched once on load, cleared on logout.
let _token: string | null = null

export const getCsrfToken = (): string | null => _token
export const setCsrfToken = (token: string | null): void => { _token = token }

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"])

/** Return X-CSRF-Token header object for write methods, empty object otherwise. */
export const csrfHeader = (
  method?: string
): Record<string, string> => {
  if (!_token || !method || !WRITE_METHODS.has(method.toUpperCase())) return {}
  return { "X-CSRF-Token": _token }
}
