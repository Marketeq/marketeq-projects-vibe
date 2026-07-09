// src/lib/api.ts
import { getPublicBackendUrl } from "@/lib/runtime-urls"

export const API_BASE = getPublicBackendUrl()

interface FetchOpts extends Omit<RequestInit, "body"> {
  body?: any
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

  const res = await fetch(finalUrl, {
    ...(opts as any),
    credentials: opts.credentials ?? "include",
    headers: requestHeaders,
    body: body != null ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  // Handle empty responses (e.g. 204 No Content from DELETE)
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T
  }
  const text = await res.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}
