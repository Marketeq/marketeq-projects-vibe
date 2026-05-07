import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

/**
 * Per-user rate limiter for the NDA signing endpoint.
 * Allows a maximum of 5 signing attempts per user per 60-second window.
 * Returns HTTP 429 with code LS_RATE_LIMIT_EXCEEDED when exceeded.
 *
 * Must be applied AFTER JwtAuthGuard (global) so req.user is populated.
 * Uses an in-memory Map — window resets on service restart (acceptable for rate limiting).
 */
@Injectable()
export class SigningRateLimitGuard implements CanActivate {
  private readonly window = new Map<string, { count: number; resetAt: number }>();
  private readonly MAX_REQUESTS = 5;
  private readonly WINDOW_MS = 60_000; // 1 minute

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const userId: string =
      (req.user?.sub as string) ?? (req.user?.userId as string) ?? 'anonymous';
    const now = Date.now();

    const entry = this.window.get(userId);

    // First request in window, or window has expired — start fresh
    if (!entry || now >= entry.resetAt) {
      this.window.set(userId, { count: 1, resetAt: now + this.WINDOW_MS });
      return true;
    }

    // Window is active — check against limit
    if (entry.count >= this.MAX_REQUESTS) {
      throw new HttpException(
        {
          statusCode: 429,
          code: 'LS_RATE_LIMIT_EXCEEDED',
          message: 'Too many signing attempts. Please wait before trying again.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.count++;
    return true;
  }
}
