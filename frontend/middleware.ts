import { NextRequest, NextResponse } from "next/server"

const AUTH_COOKIES = ["access_token", "accessToken"]

const PROTECTED_PREFIXES = [
  "/billing",
  "/client-dashboard",
  "/complete-profile",
  "/earnings",
  "/inbox",
  "/invoices",
  "/my-contracts",
  "/my-jobs",
  "/my-listings",
  "/notifications",
  "/payments",
  "/reports",
  "/settings",
  "/talent-dashboard",
  "/time-tracking",
]

const AUTH_PAGES = ["/sign-in", "/sign-up"]

const REQUIRED_RUNTIME_URLS = ["NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_AUTH_URL"]

function hasAuthCookie(req: NextRequest): boolean {
  return AUTH_COOKIES.some((name) => Boolean(req.cookies.get(name)?.value))
}

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

function validateRuntimeUrls(): string | null {
  const env = process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV
  const isProductionLike = env && env !== "development"
  if (!isProductionLike) return null

  for (const name of REQUIRED_RUNTIME_URLS) {
    const value = process.env[name]?.trim()
    if (!value) return `${name} is required`
    if (value.startsWith("/")) continue
    if (/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(value)) {
      return `${name} must not point to localhost`
    }
    try {
      const parsed = new URL(value)
      if (parsed.protocol !== "https:") return `${name} must use https`
    } catch {
      return `${name} must be a valid URL`
    }
  }

  return null
}

export function middleware(req: NextRequest) {
  const runtimeError = validateRuntimeUrls()
  if (runtimeError) {
    return new NextResponse(`Runtime configuration error: ${runtimeError}`, {
      status: 500,
    })
  }

  const { pathname } = req.nextUrl
  const authenticated = hasAuthCookie(req)

  if (matchesPrefix(pathname, PROTECTED_PREFIXES) && !authenticated) {
    const url = req.nextUrl.clone()
    url.pathname = "/sign-in"
    url.searchParams.set("next", `${pathname}${req.nextUrl.search}`)
    return NextResponse.redirect(url)
  }

  if (AUTH_PAGES.includes(pathname) && authenticated) {
    const url = req.nextUrl.clone()
    url.pathname = "/"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
