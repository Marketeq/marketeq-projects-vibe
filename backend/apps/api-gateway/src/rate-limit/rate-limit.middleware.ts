import { Injectable, NestMiddleware } from '@nestjs/common'
import type { Request, Response, NextFunction } from 'express'
import { RateLimitService } from './rate-limit.service'

/**
 * Per-IP limiting, wired in main.ts with app.use() rather than as module
 * middleware, so it runs BEFORE body parsing and before CSRF/JWT.
 *
 * Two reasons it belongs that early:
 *  - a malformed JSON body is rejected inside express's json() parser, which
 *    runs before any module middleware; while the limiter sat behind it, those
 *    requests were never counted and could be sent without limit (found in
 *    testing, 2026-09-25);
 *  - floods of anonymous or bad-token requests are turned away before the
 *    gateway spends parsing, CSRF and JWT work on them.
 *
 * CORS is applied just above this in main.ts so a 429 carries the CORS
 * headers and a browser can read it.
 */
export function createPreAuthRateLimit(rateLimit: RateLimitService) {
  return (req: Request, res: Response, next: NextFunction) =>
    rateLimit.handle('pre-auth', req, res, next)
}

/**
 * Per-user limiting (general, money writes, uploads). Registered as module
 * middleware AFTER JwtMiddleware, because it keys on `req.user.userId` from
 * the verified token — a value a client cannot forge.
 */
@Injectable()
export class PostAuthRateLimitMiddleware implements NestMiddleware {
  constructor(private readonly rateLimit: RateLimitService) {}

  use(req: Request, res: Response, next: NextFunction) {
    return this.rateLimit.handle('post-auth', req, res, next)
  }
}
