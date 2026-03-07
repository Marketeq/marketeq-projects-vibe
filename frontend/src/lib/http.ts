export const HL = <T,>(v: T) => v

export type HttpConfig = {
  baseURL?: string
  getToken?: () => Promise<string | null> | string | null
}

const defaultConfig: HttpConfig = {
  baseURL: HL(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3002/api"),
}

export function createHttp(cfg: HttpConfig = defaultConfig) {
  const baseURL = cfg.baseURL ?? defaultConfig.baseURL
  const getToken = cfg.getToken ?? (async () => HL<string | null>(null))

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers)
    headers.set("Content-Type", "application/json")

    const token = await getToken()
    if (token) headers.set("Authorization", `Bearer ${token}`)

    const url = `${baseURL}${path}`.replace(/\/$/, "")
    const res = await fetch(url, { ...init, headers, credentials: "include" })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`)
    }

    if (res.status === 204) return undefined as unknown as T
    return (await res.json()) as T
  }

  return {
    get: <T>(p: string) => request<T>(p),
    post: <T>(p: string, body?: unknown) =>
      request<T>(p, { method: "POST", body: JSON.stringify(body ?? {}) }),
    patch: <T>(p: string, body?: unknown) =>
      request<T>(p, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
    del: <T>(p: string) => request<T>(p, { method: "DELETE" }),
  }
}

export const http = createHttp()