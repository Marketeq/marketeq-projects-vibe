/** Parse the payload of a JWT (without verifying!) */
export function parseJwt<T = any>(token: string): T {
  const parts = token.split(".")
  if (parts.length !== 3) throw new Error("Invalid JWT")
  const base64Url = parts[1]
  // Base64‑URL → Base64
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
  // atob → percent‑decoded UTF8 string
  const json = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  )
  return JSON.parse(json) as T
}
