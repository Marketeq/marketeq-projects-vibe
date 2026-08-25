const RETIRED_BACKEND_HOSTS: Record<string, string> = {
  "marketeq-vibe-backend-staging.onrender.com": "marketeq-backend.onrender.com",
  "marketeq-vibe-backend.onrender.com": "marketeq-backend.onrender.com",
}

const firstNonEmpty = (...values: Array<string | undefined | null>): string =>
  values
    .find((value) => typeof value === "string" && value.trim().length > 0)
    ?.trim() ?? ""

const stripApiSuffix = (value: string): string =>
  value.replace(/\/api\/?$/i, "")

export const normalizePublicUrl = (rawValue?: string | null): string => {
  const value = rawValue?.trim() ?? ""
  if (!value) {
    return ""
  }

  try {
    const url = new URL(value)
    const replacementHost = RETIRED_BACKEND_HOSTS[url.hostname]

    if (!replacementHost) {
      return value
    }

    url.hostname = replacementHost
    return url.toString().replace(/\/$/, "")
  } catch {
    return value.replace(
      /marketeq-vibe-backend-staging\.onrender\.com|marketeq-vibe-backend\.onrender\.com/g,
      "marketeq-backend.onrender.com"
    )
  }
}

export const getPublicApiUrl = (): string =>
  normalizePublicUrl(
    firstNonEmpty(
      process.env.NEXT_PUBLIC_API_URL,
      process.env.NEXT_PUBLIC_AUTH_URL,
      process.env.NEXT_PUBLIC_BACKEND_URL
    )
  )

export const getPublicAuthUrl = (): string =>
  normalizePublicUrl(
    firstNonEmpty(
      process.env.NEXT_PUBLIC_AUTH_URL,
      process.env.NEXT_PUBLIC_API_URL,
      process.env.NEXT_PUBLIC_BACKEND_URL
    )
  )

export const getPublicUserUrl = (): string =>
  normalizePublicUrl(
    firstNonEmpty(
      process.env.NEXT_PUBLIC_USER_URL,
      process.env.NEXT_PUBLIC_API_URL,
      process.env.NEXT_PUBLIC_AUTH_URL,
      process.env.NEXT_PUBLIC_BACKEND_URL
    )
  )

export const getPublicBackendUrl = (): string =>
  normalizePublicUrl(
    firstNonEmpty(
      process.env.NEXT_PUBLIC_BACKEND_URL,
      process.env.NEXT_PUBLIC_API_BASE_URL,
      process.env.NEXT_PUBLIC_API_URL,
      process.env.NEXT_PUBLIC_AUTH_URL
    )
  )

export const getPublicHomepageUrl = (): string => {
  const homepageBase = firstNonEmpty(
    process.env.NEXT_PUBLIC_BACKEND_URL,
    process.env.NEXT_PUBLIC_API_BASE_URL,
    process.env.NEXT_PUBLIC_API_URL,
    process.env.NEXT_PUBLIC_AUTH_URL
  )

  return normalizePublicUrl(stripApiSuffix(homepageBase))
}

export const getServerBackendUrl = (): string => {
  const publicUrl = getPublicHomepageUrl()
  if (/^https?:\/\//i.test(publicUrl)) return publicUrl

  const proxyTarget = (process.env.API_PROXY_TARGET ?? "").trim()
  if (/^https?:\/\//i.test(proxyTarget)) {
    return proxyTarget
      .replace(/\/+$/, "")
      .replace(/\/api$/i, "")
      .replace(/\/+$/, "")
  }

  return ""
}

export const getPublicListingsUrl = (): string =>
  normalizePublicUrl(
    firstNonEmpty(
      process.env.NEXT_PUBLIC_LISTINGS_URL,
      process.env.NEXT_PUBLIC_API_URL,
      process.env.NEXT_PUBLIC_AUTH_URL,
      process.env.NEXT_PUBLIC_BACKEND_URL
    )
  )

// portfolio-service's case-studies/media controllers are mounted at root
// (/case-studies, /media) and aren't yet reachable through api-gateway's
// proxy (which only forwards a legacy /portfolio/* prefix to this service).
// Until that gateway route exists, talk to portfolio-service directly.
export const getPublicPortfolioUrl = (): string =>
  normalizePublicUrl(
    firstNonEmpty(process.env.NEXT_PUBLIC_PORTFOLIO_URL)
  ) || "http://localhost:3015"

export const getPublicLegalUrl = (): string =>
  normalizePublicUrl(
    firstNonEmpty(
      process.env.NEXT_PUBLIC_LEGAL_URL,
      process.env.NEXT_PUBLIC_API_URL,
      process.env.NEXT_PUBLIC_AUTH_URL,
      process.env.NEXT_PUBLIC_BACKEND_URL,
    ),
  )
