import Cookies from "js-cookie"
import { getPublicApiUrl } from "@/lib/runtime-urls"

const GATEWAY_URL = getPublicApiUrl() || "http://localhost:4000"
const DEV_EMAIL = "harry.torres8@gmail.com"

/**
 * Ensures a valid access_token cookie exists for the dev user.
 * In dev, auto-logs in via dev-login endpoint if no token is present.
 * Returns true if a token is available.
 */
export async function ensureDevAuth(): Promise<boolean> {
  if (typeof window === "undefined") return false
  if (process.env.NODE_ENV === "production") return !!Cookies.get("access_token")

  // If there's already a token, verify it decodes to the right user
  const existing = Cookies.get("access_token")
  if (existing) {
    try {
      // Decode JWT payload (no verification, just read)
      const payload = JSON.parse(atob(existing.split(".")[1]))
      if (payload.email === DEV_EMAIL) return true
      // Wrong user — clear and re-login
      Cookies.remove("access_token", { path: "/" })
    } catch {
      // Corrupt token — clear and re-login
      Cookies.remove("access_token", { path: "/" })
    }
  }

  try {
    const res = await fetch(`${GATEWAY_URL}/auth/dev-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: DEV_EMAIL }),
    })
    if (!res.ok) return false
    const data = await res.json()
    if (data.access_token) {
      Cookies.set("access_token", data.access_token, { path: "/" })
      if (data.refresh_token) {
        Cookies.set("refresh_token", data.refresh_token, { path: "/" })
      }
      return true
    }
    return false
  } catch (err) {
    console.error("[dev-login] auto-login failed:", err)
    return false
  }
}
