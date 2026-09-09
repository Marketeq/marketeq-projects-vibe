import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class InternalServiceGuard implements CanActivate {
  private readonly logger = new Logger(InternalServiceGuard.name);
  private readonly token: string;

  constructor() {
    this.token = process.env.SERVICE_AUTH_TOKEN || '';
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.token) {
      this.logger.warn('SERVICE_AUTH_TOKEN not configured, allowing request in dev mode');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid internal service token',
      });
    }

    const provided = authHeader.slice(7);
    if (!this.constantTimeCompare(this.token, provided)) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid internal service token',
      });
    }

    return true;
  }

  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    try {
      return timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
      return false;
    }
  }
}
