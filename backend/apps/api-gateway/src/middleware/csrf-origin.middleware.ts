import {
  ForbiddenException,
  Injectable,
  Logger,
  NestMiddleware,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Request, Response, NextFunction } from 'express'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

const normalizeOrigin = (value: string): string => value.trim().replace(/\/$/, '')

@Injectable()
export class CsrfOriginMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfOriginMiddleware.name)

  constructor(private readonly config: ConfigService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    if (SAFE_METHODS.has(req.method.toUpperCase())) {
      return next()
    }

    const originHeader = req.headers.origin
    const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader

    if (!origin) {
      return next()
    }

    if (this.isAllowedOrigin(origin)) {
      return next()
    }

    this.logger.warn(`CSRF origin blocked method=${req.method} path=${req.originalUrl} origin=${origin}`)
    throw new ForbiddenException({
      code: 'CSRF_ORIGIN_BLOCKED',
      message: 'Request origin is not allowed.',
    })
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

    if (process.env.NODE_ENV !== 'production') {
      values.push('http://localhost:3000')
    }

    return new Set(values)
  }
}
