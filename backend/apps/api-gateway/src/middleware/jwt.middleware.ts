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
  // Reached by someone locked out of their account, who therefore has no token
  // to present — the same reasoning as /auth/forgot-password above. The
  // catalogue is the same six prompts for everyone and names no account; the
  // two verify routes are rate limited per account and per IP in auth-service
  // and answer every failure identically, so neither reveals whether an email
  // is registered.
  '/auth/security-questions/catalog',
  '/auth/recovery/security-questions/verify',
  '/auth/recovery/authenticator/verify',
  // Confirming a recovery email is done from a mail client, often on a
  // different device from the one that asked. Holding the single-use token is
  // the proof; requiring a session here would make the link unusable.
  '/auth/recovery-email/verify',
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
  // Contact Support in the account recovery flow. Whoever needs it is locked
  // out by definition and has no token to present, so the same reasoning as
  // /auth/forgot-password applies. Both endpoints are per-IP rate limited in
  // notification-service's SupportService, since a public endpoint that sends
  // mail is a relay otherwise.
  '/support/messages',
  '/support/call-requests',
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
  // Wise redirects the browser here straight from the
  // provider's own login page — there's no Marketeq session cookie to send,
  // same reasoning as the webhooks entry above. payout-service's own
  // @Public() on this route is powerless against this upstream gateway check.
  /^\/v1\/oauth\/wise\/callback$/,
  // Renders the invite banner / accept-invite flow before the visitor is
  // signed in. The route is already @Public() in invitations-service, but
  // that decorator is powerless against this upstream gateway check, same as
  // the webhooks/oauth-callback entries above.
  /^\/v1\/invitations\/preview$/,
  /^\/invitations\/preview$/,
  // Confirming a notification email change. The token in the link is the
  // proof, and the link is opened from an inbox — often on a device with no
  // Marketeq session — so requiring one would make it unclickable. Already
  // @Public() in notification-service, which is powerless against this
  // upstream check, same as the entries above. Both prefixes because the
  // frontend base URL carries an /api segment.
  /^(?:\/api)?\/v1\/notifications\/preferences\/email\/verify$/,
]

// Method-scoped public routes. Didit calls this directly — no Marketeq
// session exists to send. Authenticity is verified downstream by
// identity-verification-service (X-Signature-V2 HMAC, timestamp window,
// replay/idempotency), not by gateway JWT auth. Matched on method AND exact
// path so GET/PUT/PATCH/DELETE, trailing slashes, extra segments and sibling
// routes under /v1/identity-verification all stay JWT-protected.
const PUBLIC_METHOD_ROUTES: ReadonlyArray<{ method: string; path: string }> = [
  { method: 'POST', path: '/v1/identity-verification/webhooks/didit-kyc' },
]

function isPublic(path: string, method: string): boolean {
  if (PUBLIC_EXACT_ROUTES.has(path)) return true
  if (PUBLIC_METHOD_ROUTES.some((r) => r.method === method && r.path === path)) return true
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
    const pub = isPublic(reqPath, req.method)

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
      const payload = this.jwt.verify<{
        sub: string
        email: string
        /** Profile label (talent/client/admin). Not a privilege. */
        role?: string
        /** Security role, minted from PLATFORM_ROLE_ASSIGNMENTS. Privilege. */
        platformRole?: string
        /** Session id. CsrfTokenMiddleware matches it against the session row. */
        sid?: string
      }>(token)
      ;(req as any).user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        platformRole: payload.platformRole,
        sid: payload.sid,
      }
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
