import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { JwtService } from '@nestjs/jwt'

const PUBLIC_ROUTES = [
  '/health', '/ready',
  '/auth/login', '/auth/signup', '/auth/refresh',
  '/auth/google', '/auth/linkedin', '/auth/magic-link', '/auth/verify',
  '/search', '/autocomplete', '/suggestions',
]

function isPublic(path: string): boolean {
  return PUBLIC_ROUTES.some((r) => path === r || path.startsWith(r + '/') || path.startsWith(r + '?'))
}

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(private readonly jwt: JwtService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    if (isPublic(req.path)) return next()

    const authHeader = req.headers.authorization
    const cookieToken = (req as any).cookies?.access_token
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken

    if (!token) {
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
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Your session has expired. Please log in again to continue.',
      })
    }
  }
}
