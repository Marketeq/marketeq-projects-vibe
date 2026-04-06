import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { JwtService } from '@nestjs/jwt'

const PUBLIC_ROUTES = [
  '/health', '/ready',
  '/auth/login', '/auth/signup', '/auth/register', '/auth/register-email',
  '/auth/refresh', '/auth/check-username',
  '/auth/google', '/auth/linkedin', '/auth/magic-link', '/auth/verify', '/auth/dev-login',
  '/auth/forgot-password', '/auth/reset-password',
  '/search', '/autocomplete', '/suggestions',
  '/talent/users',     // public talent profiles
  '/v1/users/username',
  '/v1/users/health',
  '/v1/projects',
  '/v1/services',
  '/v1/users',
]

// Routes that need special pattern matching (e.g. /v1/users/:uuid for public profiles)
const PUBLIC_PATTERNS = [
  /^\/v1\/users\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
]

function isPublic(path: string): boolean {
  if (PUBLIC_ROUTES.some((r) => path === r || path.startsWith(r + '/') || path.startsWith(r + '?'))) return true
  return PUBLIC_PATTERNS.some((re) => re.test(path))
}

@Injectable()
export class JwtMiddleware implements NestMiddleware {
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
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Your session has expired. Please log in again to continue.',
      })
    }

    try {
      const payload = this.jwt.verify<{ sub: string; email: string; role?: string }>(token)
      ;(req as any).user = { userId: payload.sub, email: payload.email, role: payload.role }
      next()
    } catch {
      // Public routes can proceed even with an invalid token
      if (pub) return next()
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Your session has expired. Please log in again to continue.',
      })
    }
  }
}
