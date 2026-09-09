import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class InternalServiceGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const auth = request.headers['authorization'] ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

    if (!token) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid internal service token',
      });
    }

    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Internal service authentication not configured',
      });
    }

    try {
      const payload = jwt.verify(token, secret) as jwt.JwtPayload;

      if (!payload.sub) {
        throw new UnauthorizedException({
          code: 'UNAUTHORIZED',
          message: 'Invalid internal service token',
        });
      }

      request.user = payload;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired internal service token',
      });
    }
  }
}
