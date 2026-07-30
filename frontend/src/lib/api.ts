// src/lib/api.ts
import { getPublicBackendUrl } from "@/lib/runtime-urls"

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
  if (res.status === 401 && !isAuthEndpoint(cleanPath)) {
    try {
      // Imported lazily so this module keeps its light import graph and does
      // not pull axios (and its module-level defaults) into every consumer.
      const { refreshSession } = await import("@/service")
      await refreshSession()
      res = await send()
    } catch {
      /* refresh failed — fall through and report the original 401 */
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
