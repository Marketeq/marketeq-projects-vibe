// Where Didit sends the browser back to after a hosted session.
//
// FRONTEND_URL is not one URL: it is the comma-separated list of every frontend origin
// the shared backend serves (live, staging, dev, localhost — see render.yaml and the
// gateway's CORS/CSRF handling, which both split it). Using it as a single URL produced
// a malformed Didit `callback` (HTTP 400), and taking its first entry would send a
// staging user to another environment. The return origin is therefore chosen from the
// list, and only the origin the request itself came from may choose: it is accepted
// only when it exactly equals one of the configured origins, never trusted as a URL,
// and never replaced by a guess when it does not match.

export type CallbackOriginFailure = 'not_configured' | 'invalid_origin' | 'origin_required';

export type CallbackOriginResult =
  | { ok: true; origin: string }
  | { ok: false; reason: CallbackOriginFailure };

/** `scheme://host[:port]` for a plain http(s) origin, or null for anything else. */
export function normalizeOrigin(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  // A bare origin only: no credentials, path, query or fragment hiding behind the host.
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
  return url.origin;
}

/** The configured origins, normalized and de-duplicated. Entries that are not origins are dropped. */
export function parseFrontendOrigins(raw: string | undefined): string[] {
  const origins = (raw ?? '')
    .split(',')
    .map((entry) => normalizeOrigin(entry))
    .filter((origin): origin is string => origin !== null);
  return [...new Set(origins)];
}

/**
 * The origin Didit's callback must use.
 * - `requestedOrigin` given: it must equal a configured origin, else `invalid_origin`.
 * - not given: only an unambiguous configuration (exactly one origin) can answer;
 *   several origins and no request origin is `origin_required`, never "the first one".
 * - nothing configured: `not_configured`.
 */
export function resolveCallbackOrigin(
  configuredFrontendUrl: string | undefined,
  requestedOrigin: string | undefined | null,
): CallbackOriginResult {
  const allowed = parseFrontendOrigins(configuredFrontendUrl);
  if (allowed.length === 0) return { ok: false, reason: 'not_configured' };

  if (requestedOrigin !== undefined && requestedOrigin !== null) {
    const requested = normalizeOrigin(requestedOrigin);
    if (requested === null || !allowed.includes(requested)) return { ok: false, reason: 'invalid_origin' };
    return { ok: true, origin: requested };
  }

  if (allowed.length === 1) return { ok: true, origin: allowed[0] };
  return { ok: false, reason: 'origin_required' };
}
