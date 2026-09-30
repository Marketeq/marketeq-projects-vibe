import {
  ForbiddenException,
  Injectable,
  Logger,
  NestMiddleware,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Request, Response, NextFunction } from 'express'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

// Cookies that make a request "ambiently authenticated" — the browser attaches
// them to cross-site requests on its own, which is the whole basis of CSRF.
// Production sets these SameSite=None (the site and the API are different
// sites), so the browser gives no protection of its own here.
const AUTH_COOKIE_NAMES = ['access_token', 'accessToken', 'refresh_token', 'session_id']

// Sec-Fetch-Site values that cannot be a cross-site forgery:
//   same-origin — the page and the API share an origin
//   same-site   — a sibling host of ours
//   none        — user-initiated (address bar, bookmark), no attacker page
const SAFE_FETCH_SITES = new Set(['same-origin', 'same-site', 'none'])

const normalizeOrigin = (value: string): string => value.trim().replace(/\/$/, '')

const isLocalhostOrigin = (value: string): boolean => {
  try {
    const { hostname } = new URL(value)
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  } catch {
    return false
  }
}

const headerValue = (raw: string | string[] | undefined): string | undefined =>
  Array.isArray(raw) ? raw[0] : raw

@Injectable()
export class CsrfOriginMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfOriginMiddleware.name)
  /**
   * How the NEW checks behave (the existing "Origin present but not allowed"
   * rejection is unconditional and unchanged):
   *   monitor (default) — log what would be rejected, reject nothing
   *   enforce           — reject cookie-authenticated writes that carry no
   *                       usable proof of where they came from
   */
  private readonly strictMode: 'monitor' | 'enforce'
  private warnedLocalhost = false

  constructor(private readonly config: ConfigService) {
    const raw = (this.config.get<string>('CSRF_STRICT_MODE') || 'monitor').trim().toLowerCase()
    this.strictMode = raw === 'enforce' ? 'enforce' : 'monitor'
    if (raw !== 'monitor' && raw !== 'enforce') {
      this.logger.warn(`CSRF_STRICT_MODE="${raw}" is not monitor|enforce; using "monitor"`)
    }
  }

  use(req: Request, _res: Response, next: NextFunction) {
    if (SAFE_METHODS.has(req.method.toUpperCase())) {
      return next()
    }

    const origin = headerValue(req.headers.origin)

    if (origin) {
      if (this.isAllowedOrigin(origin)) return next()

      this.logger.warn(
        `CSRF origin blocked method=${req.method} path=${req.originalUrl} origin=${origin}`,
      )
      throw new ForbiddenException({
        code: 'CSRF_ORIGIN_BLOCKED',
        message: 'Request origin is not allowed.',
      })
    }

    // ── No Origin header ──────────────────────────────────────────────
    // This used to be an unconditional pass, which meant the one CSRF
    // control could be skipped simply by the header being absent. It is now
    // only a pass when the request cannot be a forgery.

    // A bearer token has to be attached deliberately by the caller; a browser
    // never adds it on someone else's behalf. Covers the desktop app.
    if (headerValue(req.headers.authorization)?.startsWith('Bearer ')) return next()

    // Without one of our auth cookies there is no ambient credential to abuse:
    // webhooks, server-to-server calls and anonymous traffic land here.
    if (!this.hasAuthCookie(req)) return next()

    // Browsers that send Fetch Metadata tell us directly whether another site
    // caused this request.
    const fetchSite = headerValue(req.headers['sec-fetch-site'])
    if (fetchSite && SAFE_FETCH_SITES.has(fetchSite)) return next()

    this.logger.warn(
      `${this.strictMode === 'enforce' ? 'CSRF blocked' : 'CSRF would block'} ` +
        `(no Origin on a cookie-authenticated write) method=${req.method} ` +
        `path=${req.originalUrl} secFetchSite=${fetchSite ?? 'absent'}`,
    )

    if (this.strictMode !== 'enforce') return next()

    throw new ForbiddenException({
      code: 'CSRF_ORIGIN_BLOCKED',
      message: 'Request origin is not allowed.',
    })
  }

  private hasAuthCookie(req: Request): boolean {
    // Read the raw header rather than req.cookies, so this does not depend on
    // cookie-parser having run before this middleware.
    const cookieHeader = req.headers.cookie
    if (!cookieHeader) return false
    return AUTH_COOKIE_NAMES.some((name) =>
      new RegExp(`(?:^|;\\s*)${name}=`).test(cookieHeader),
    )
  }

  private isAllowedOrigin(origin: string): boolean {
    const normalized = normalizeOrigin(origin)
    return this.getAllowedOrigins().has(normalized)
  }

  private getAllowedOrigins(): Set<string> {
    const values = [
      this.config.get<string>('FRONTEND_URL') ?? '',
      this.config.get<string>('CSRF_ALLOWED_ORIGINS') ?? '',
    ]
      .flatMap((value) => value.split(','))
      .map(normalizeOrigin)
      .filter(Boolean)

    const isProd = process.env.NODE_ENV === 'production'

    if (!isProd) {
      values.push('http://localhost:3000')
      return new Set(values)
    }

    // A localhost origin in the production allow-list means any page running
    // on a victim's own machine is trusted against live data. FRONTEND_URL
    // carries one today, so it is dropped here rather than silently honoured.
    // ALLOW_LOCALHOST_ORIGIN=true restores it for a deliberate, temporary case.
    if ((this.config.get<string>('ALLOW_LOCALHOST_ORIGIN') || '').toLowerCase() === 'true') {
      return new Set(values)
    }

    const kept = values.filter((v) => !isLocalhostOrigin(v))
    if (kept.length !== values.length && !this.warnedLocalhost) {
      this.warnedLocalhost = true
      this.logger.warn(
        'Dropped localhost origin(s) from the production CSRF allow-list; ' +
          'remove them from FRONTEND_URL, or set ALLOW_LOCALHOST_ORIGIN=true to keep them',
      )
    }
    return new Set(kept)
  }
}
