import {
  ForbiddenException,
  Injectable,
  Logger,
  NestMiddleware,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Request, Response, NextFunction } from 'express'
import { DataSource } from 'typeorm'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

// Auth endpoints that establish or renew the session — they produce the CSRF
// token, so they cannot require one.
const CSRF_EXEMPT_PATHS = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/register-email',
  '/auth/refresh',
  '/auth/logout',
  '/auth/google',
  '/auth/linkedin',
  '/auth/dev-login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/2fa/verify',
  '/auth/2fa/resend',
  '/v1/webhooks/stripe',
  '/v1/webhooks/ramp',
  '/v1/payouts/verify-email',
  '/v1/payouts/verify',
])

/**
 * CSRF token validation middleware.
 *
 * Runs after JwtMiddleware. For write requests (POST/PUT/PATCH/DELETE) from
 * authenticated sessions, compares the X-CSRF-Token header against the token
 * stored in the session row.
 *
 * Controlled by CSRF_TOKEN_MODE env var:
 *   - "off"     — skip entirely (default until rollout is complete)
 *   - "log"     — log mismatches but allow the request through
 *   - "enforce" — reject mismatches with 403 CSRF_TOKEN_INVALID
 */
@Injectable()
export class CsrfTokenMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfTokenMiddleware.name)
  private readonly mode: 'off' | 'log' | 'enforce'

  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    const raw = (this.config.get<string>('CSRF_TOKEN_MODE') ?? 'off').toLowerCase()
    this.mode = raw === 'enforce' ? 'enforce' : raw === 'log' ? 'log' : 'off'
    this.logger.log(`CSRF token validation mode: ${this.mode}`)
  }

  async use(req: Request, _res: Response, next: NextFunction) {
    if (this.mode === 'off') return next()
    if (SAFE_METHODS.has(req.method.toUpperCase())) return next()

    // Strip /api prefix for path matching (same normalization as JwtMiddleware)
    const rawPath = req.originalUrl.split('?')[0]
    const reqPath = rawPath.replace(/^\/api(?=\/|$)/, '') || '/'
    if (CSRF_EXEMPT_PATHS.has(reqPath)) return next()

    const user = (req as any).user
    const sessionId = user?.sid
    if (!sessionId) {
      // No session (public route or no JWT) — skip CSRF check
      return next()
    }

    const headerToken = req.headers['x-csrf-token'] as string | undefined

    if (!headerToken) {
      this.logger.warn(
        `CSRF missing method=${req.method} path=${req.originalUrl} session=${sessionId}`,
      )
      if (this.mode === 'enforce') {
        throw new ForbiddenException({
          code: 'CSRF_TOKEN_INVALID',
          message: 'Missing CSRF token.',
        })
      }
      return next()
    }

    // Look up the session's stored CSRF token
    try {
      const result = await this.dataSource.query(
        `SELECT "csrfToken" FROM "sessions" WHERE "id" = $1 LIMIT 1`,
        [sessionId],
      )

      const storedToken = result?.[0]?.csrfToken

      if (!storedToken) {
        // Session exists but has no CSRF token (pre-migration session) — allow
        this.logger.debug(
          `CSRF no-stored-token method=${req.method} path=${req.originalUrl} session=${sessionId}`,
        )
        return next()
      }

      if (headerToken !== storedToken) {
        this.logger.warn(
          `CSRF mismatch method=${req.method} path=${req.originalUrl} session=${sessionId}`,
        )
        if (this.mode === 'enforce') {
          throw new ForbiddenException({
            code: 'CSRF_TOKEN_INVALID',
            message: 'Invalid CSRF token.',
          })
        }
      }
    } catch (err) {
      if (err instanceof ForbiddenException) throw err
      // DB error — don't block the request, just log
      this.logger.error(
        `CSRF check DB error method=${req.method} path=${req.originalUrl}: ${(err as Error).message}`,
      )
    }

    return next()
  }
}
