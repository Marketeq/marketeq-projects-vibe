// src/lib/api.ts
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || ""

interface FetchOpts extends Omit<RequestInit, "body"> {
  body?: any
}

export async function apiFetch<T = any>(
  path: string,
  { body, headers, ...opts }: FetchOpts = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...(opts as any),
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
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
