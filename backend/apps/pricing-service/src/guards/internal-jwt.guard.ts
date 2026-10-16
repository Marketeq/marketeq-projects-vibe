import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class InternalJwtGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const auth = request.headers['authorization'] ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

    if (!token) {
      throw new UnauthorizedException({
        code: 'PS_UNAUTHORIZED',
        message: 'Missing token.',
      });
    }

    // auth-service issues the real access_token as RS256, signed with
    // AUTH_JWT_PRIVATE_KEY (see auth.module.ts). Verify against the matching
    // public key, same as api-gateway's jwt-auth.guard.ts. Only fall back to
    // the shared HS256 JWT_SECRET when no public key is configured.
    const rawPublicKey = this.config.get<string>('AUTH_JWT_PUBLIC_KEY');
    const publicKey = rawPublicKey?.replace(/\\n/g, '\n');
    const secret = this.config.get<string>('JWT_SECRET');

    if (!publicKey && !secret) {
      throw new UnauthorizedException({
        code: 'PS_UNAUTHORIZED',
        message: 'JWT secret not configured.',
      });
    }

    try {
      // Two kinds of caller reach this guard: real per-user access tokens
      // (RS256, forwarded from the frontend/gateway) and short-lived internal
      // service tokens (HS256, sub: '<service-name>', e.g. listings-service's
      // signInternalToken()). Try RS256 first, then fall back to HS256 — do
      // not gate the HS256 check behind "no public key configured", or every
      // internal service call breaks as soon as a public key is set.
      let payload: jwt.JwtPayload;
      try {
        if (!publicKey) throw new Error('no public key configured');
        payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as jwt.JwtPayload;
      } catch (rsErr) {
        if (!secret) throw rsErr;
        payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
      }

      if (!payload.sub) {
        throw new UnauthorizedException({
          code: 'PS_UNAUTHORIZED',
          message: 'Token missing required claims.',
        });
      }

      request.user = payload;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException({
        code: 'PS_UNAUTHORIZED',
        message: 'Invalid token.',
      });
    }
  }
}
