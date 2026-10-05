// src/lib/api.ts
import { getPublicBackendUrl } from "@/lib/runtime-urls"
import { csrfHeader, getCsrfToken, waitForCsrfToken } from "./csrf"

export const API_BASE = getPublicBackendUrl()

interface FetchOpts extends Omit<RequestInit, "body"> {
  body?: any
}

/**
 * Error carrying the HTTP status, so callers can tell a transport/auth failure
 * apart from a genuine application failure. Callers that report errors to users
 * must not describe an ApiError as a domain failure — see the conversation-key
 * handling in the inbox, where a 401 used to surface as "could not decrypt".
 */
export class ApiError extends Error {
  readonly status: number
  readonly body: string

  constructor(status: number, body: string) {
    super(`API error ${status}: ${body}`)
    this.name = "ApiError"
    this.status = status
    this.body = body
  }
}

/** Refreshing on these would recurse or retry a deliberate credential rejection. */
function isAuthEndpoint(path: string): boolean {
  return (
    path.includes("/auth/refresh") ||
    path.includes("/auth/login") ||
    path.includes("/auth/logout")
  )
}

export async function apiFetch<T = any>(
  path: string,
  { body, headers, ...opts }: FetchOpts = {}
): Promise<T> {
  const cleanBase = API_BASE.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  let finalUrl = `${cleanBase}${cleanPath}`;
  if (cleanBase.endsWith("/api") && cleanPath.startsWith("/api/")) {
    finalUrl = `${cleanBase}${cleanPath.slice(4)}`;
  }

  const requestHeaders = new Headers(headers)
  requestHeaders.set("Content-Type", "application/json")
  requestHeaders.delete("Authorization")
  requestHeaders.delete("authorization")
  // Wait for CSRF token on write methods (covers page-reload race)
  const method = ((opts as any).method ?? "GET").toUpperCase()
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && !getCsrfToken()) {
    await Promise.race([waitForCsrfToken(), new Promise((r) => setTimeout(r, 3000))])
  }
  const csrf = csrfHeader(method)
  for (const [k, v] of Object.entries(csrf)) requestHeaders.set(k, v)

  const send = () =>
    fetch(finalUrl, {
      ...(opts as any),
      credentials: opts.credentials ?? "include",
      headers: requestHeaders,
      body: body != null ? JSON.stringify(body) : undefined,
    })

  let res = await send()

  // This layer carries no Authorization header (it is stripped above) and so
  // relies entirely on the access_token cookie. When that cookie expires these
  // requests 401 while the axios layer transparently refreshes, which made
  // expired sessions look like feature-specific failures. Refresh once and
  // retry, mirroring the axios interceptor and sharing its in-flight request.
  // Also retry on 403 CSRF_TOKEN_INVALID (stale token after session refresh).
  const isCsrf403 =
    res.status === 403 &&
    (await res.clone().text().catch(() => "")).includes("CSRF_TOKEN_INVALID")
  if ((res.status === 401 || isCsrf403) && !isAuthEndpoint(cleanPath)) {
    try {
      // Imported lazily so this module keeps its light import graph and does
      // not pull axios (and its module-level defaults) into every consumer.
      const { refreshSession } = await import("@/service")
      await refreshSession()
      // Re-attach the new CSRF token after refresh
      const { getCsrfToken } = await import("./csrf")
      const fresh = getCsrfToken()
      if (fresh) requestHeaders.set("X-CSRF-Token", fresh)
      else requestHeaders.delete("X-CSRF-Token")
      res = await send()
    } catch {
      /* refresh failed — fall through and report the original error */
    }
  }

  if (!res.ok) throw new ApiError(res.status, await res.text())
  // Handle empty responses (e.g. 204 No Content from DELETE)
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T
  }
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}
