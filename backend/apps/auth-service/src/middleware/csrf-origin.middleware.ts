import {
  ForbiddenException,
  Injectable,
  Logger,
  NestMiddleware,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

// Kept deliberately identical to
// apps/api-gateway/src/middleware/csrf-origin.middleware.ts. There is no
// working shared-module mechanism between services in this monorepo, so the
// two copies are maintained together — change one, change the other.

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Cookies the browser attaches on its own, which is what makes CSRF possible.
// Production sets these SameSite=None (site and API are different sites).
const AUTH_COOKIE_NAMES = [
  'access_token',
  'accessToken',
  'refresh_token',
  'session_id',
];

// Sec-Fetch-Site values that cannot be a cross-site forgery.
const SAFE_FETCH_SITES = new Set(['same-origin', 'same-site', 'none']);

const normalizeOrigin = (value: string): string =>
  value.trim().replace(/\/$/, '');

const isLocalhostOrigin = (value: string): boolean => {
  try {
    const { hostname } = new URL(value);
    return (
      hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
    );
  } catch {
    return false;
  }
};

const headerValue = (
  raw: string | string[] | undefined,
): string | undefined => (Array.isArray(raw) ? raw[0] : raw);

@Injectable()
export class CsrfOriginMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfOriginMiddleware.name);
  /** monitor (default) logs the new checks; enforce rejects. */
  private readonly strictMode: 'monitor' | 'enforce';
  private warnedLocalhost = false;

  constructor(private readonly config: ConfigService) {
    const raw = (this.config.get<string>('CSRF_STRICT_MODE') || 'monitor')
      .trim()
      .toLowerCase();
    this.strictMode = raw === 'enforce' ? 'enforce' : 'monitor';
    if (raw !== 'monitor' && raw !== 'enforce') {
      this.logger.warn(
        `CSRF_STRICT_MODE="${raw}" is not monitor|enforce; using "monitor"`,
      );
    }
  }

  use(req: Request, _res: Response, next: NextFunction) {
    if (SAFE_METHODS.has(req.method.toUpperCase())) {
      return next();
    }

    const origin = headerValue(req.headers.origin);

    if (origin) {
      if (this.isAllowedOrigin(origin)) return next();

      this.logger.warn(
        `CSRF origin blocked method=${req.method} path=${req.originalUrl} origin=${origin}`,
      );
      throw new ForbiddenException({
        code: 'CSRF_ORIGIN_BLOCKED',
        message: 'Request origin is not allowed.',
      });
    }

    // No Origin header: previously an unconditional pass. Now only a pass
    // when the request cannot be a cross-site forgery.
    if (headerValue(req.headers.authorization)?.startsWith('Bearer ')) {
      return next();
    }
    if (!this.hasAuthCookie(req)) return next();

    const fetchSite = headerValue(req.headers['sec-fetch-site']);
    if (fetchSite && SAFE_FETCH_SITES.has(fetchSite)) return next();

    this.logger.warn(
      `${this.strictMode === 'enforce' ? 'CSRF blocked' : 'CSRF would block'} ` +
        `(no Origin on a cookie-authenticated write) method=${req.method} ` +
        `path=${req.originalUrl} secFetchSite=${fetchSite ?? 'absent'}`,
    );

    if (this.strictMode !== 'enforce') return next();

    throw new ForbiddenException({
      code: 'CSRF_ORIGIN_BLOCKED',
      message: 'Request origin is not allowed.',
    });
  }

  private hasAuthCookie(req: Request): boolean {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return false;
    return AUTH_COOKIE_NAMES.some((name) =>
      new RegExp(`(?:^|;\\s*)${name}=`).test(cookieHeader),
    );
  }

  private isAllowedOrigin(origin: string): boolean {
    const normalized = normalizeOrigin(origin);
    return this.getAllowedOrigins().has(normalized);
  }

  private getAllowedOrigins(): Set<string> {
    const values = [
      this.config.get<string>('FRONTEND_URL') ?? '',
      this.config.get<string>('CSRF_ALLOWED_ORIGINS') ?? '',
    ]
      .flatMap((value) => value.split(','))
      .map(normalizeOrigin)
      .filter(Boolean);

    const isProd = process.env.NODE_ENV === 'production';

    if (!isProd) {
      values.push('http://localhost:3000');
      return new Set(values);
    }

    if (
      (this.config.get<string>('ALLOW_LOCALHOST_ORIGIN') || '').toLowerCase() ===
      'true'
    ) {
      return new Set(values);
    }

    const kept = values.filter((v) => !isLocalhostOrigin(v));
    if (kept.length !== values.length && !this.warnedLocalhost) {
      this.warnedLocalhost = true;
      this.logger.warn(
        'Dropped localhost origin(s) from the production CSRF allow-list; ' +
          'remove them from FRONTEND_URL, or set ALLOW_LOCALHOST_ORIGIN=true to keep them',
      );
    }
    return new Set(kept);
  }
}
