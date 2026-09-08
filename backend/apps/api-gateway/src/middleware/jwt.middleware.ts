import { Injectable, Logger, NestMiddleware, UnauthorizedException } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { JwtService } from '@nestjs/jwt'

const PUBLIC_EXACT_ROUTES = new Set([
  '/health',
  '/ready',
  '/auth/login',
  '/auth/signup',
  '/auth/register',
  '/auth/register-email',
  '/auth/refresh',
  '/auth/check-username',
  '/auth/google',
  '/auth/linkedin',
  '/auth/magic-link',
  '/auth/verify',
  '/auth/dev-login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/2fa/verify',
  '/auth/2fa/resend',
  '/homepage',
  '/homepage/health',
  '/v1/homepage',
  '/v1/homepage/health',
  '/search',
  '/autocomplete',
  '/suggestions',
  '/categories',
  '/tags',
  '/category-pages',
  '/talent/users',
  '/v1/users/username',
  '/v1/users/health',
  '/services/health',
  '/health/migrations',
  '/services/debug',
  '/v1/projects',
  '/v1/services',
  // PS-14 §5: the withdrawal magic-link lands the contractor here straight
  // from their email — must work fully logged out, on any device (AC-18.05/
  // 18.06). Same reasoning as the webhooks/oauth-callback entries below:
  // payout-service's own @Public() on this route is powerless against this
  // upstream gateway check. The token itself (query param) is the real
  // credential; verify-email hashes and validates it server-side.
  '/v1/payouts/verify-email',
  '/v1/payouts/verify',
])

// Only explicitly allowed dynamic routes are public.
const PUBLIC_PATTERNS = [
  /^\/internal(?:\/.*)?$/,
  /^\/search(?:\/.*)?$/,
  /^\/autocomplete(?:\/.*)?$/,
  /^\/suggestions(?:\/.*)?$/,
  /^\/categories(?:\/.*)?$/,
  /^\/tags(?:\/.*)?$/,
  /^\/category-pages(?:\/.*)?$/,
  /^\/talent\/users\/[^/]+$/,
  /^\/v1\/users\/username\/[^/]+$/,
  /^\/v1\/projects(?:\/.*)?$/,
  /^\/v1\/services(?:\/.*)?$/,
  /^\/v1\/recently-viewed\/recommended$/,
  /^\/v1\/homepage(?:\/.*)?$/,
  /^\/public\/talent(?:\/.*)?$/,
  // Public case-study viewer (/case-studies/[slug]) — no Marketeq session
  // exists for an anonymous visitor sharing/opening a published case study
  // link. portfolio-service's CaseStudyController already leaves this one
  // route unguarded; without this pattern the gateway 401s before the
  // request ever gets there, the same way the talent/public entries above
  // need their own allowlist entry regardless of the downstream guard.
  /^\/case-studies\/public\/[^/]+$/,
  /^\/v1\/users\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  // Stripe/Ramp call these directly — no Marketeq session exists to send.
  // Authenticity is verified downstream via each provider's own signature
  // check (constructWebhookEvent / HMAC), not gateway-level JWT auth.
  // Without this, the gateway 401s before the request ever reaches
  // payout-service's own @Public() route — a separate, gateway-level auth
  // layer that a downstream @Public() decorator has no power over.
  // Enumerated rather than a /v1/webhooks/* wildcard so that adding a new
  // route under this namespace does not silently make it unauthenticated.
  /^\/v1\/webhooks\/(?:stripe|ramp)$/,
  // Wise/Payoneer redirect the browser here straight from the
  // provider's own login page — there's no Marketeq session cookie to send,
  // same reasoning as the webhooks entry above. payout-service's own
  // @Public() on this route is powerless against this upstream gateway check.
  /^\/v1\/oauth\/(?:wise|payoneer)\/callback$/,
  // Renders the invite banner / accept-invite flow before the visitor is
  // signed in. The route is already @Public() in invitations-service, but
  // that decorator is powerless against this upstream gateway check, same as
  // the webhooks/oauth-callback entries above.
  /^\/v1\/invitations\/preview$/,
  /^\/invitations\/preview$/,
]

function isPublic(path: string): boolean {
  if (PUBLIC_EXACT_ROUTES.has(path)) return true
  return PUBLIC_PATTERNS.some((re) => re.test(path))
}

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  private readonly logger = new Logger(JwtMiddleware.name)

  constructor(private readonly jwt: JwtService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    // Strip a leading "/api" so callers using either NEXT_PUBLIC_API_URL
    // (no /api) or NEXT_PUBLIC_API_BASE_URL (with /api) hit the same routes.
    const rawPath = req.originalUrl.split('?')[0]
    const reqPath = rawPath.replace(/^\/api(?=\/|$)/, '') || '/'
    const pub = isPublic(reqPath)

    const authHeader = req.headers.authorization
    const cookieToken = (req as any).cookies?.access_token
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken

    if (!token) {
      // Public routes can proceed without auth
      if (pub) return next()

      this.logger.warn(
        `401 missing-token method=${req.method} path=${reqPath} source=${authHeader ? 'malformed_auth_header' : cookieToken ? 'malformed_cookie_token' : 'none'}`,
      )

      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Your session has expired. Please log in again to continue.',
      })
    }

    try {
      const payload = this.jwt.verify<{ sub: string; email: string; role?: string }>(token)
      ;(req as any).user = { userId: payload.sub, email: payload.email, role: payload.role }
      next()
    } catch (err: any) {
      // Public routes can proceed even with an invalid token
      if (pub) return next()

      const reason = err?.name || 'TokenVerificationFailed'
      this.logger.warn(
        `401 invalid-token method=${req.method} path=${reqPath} reason=${reason}`,
      )

      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Your session has expired. Please log in again to continue.',
      })
    }
  }
}
