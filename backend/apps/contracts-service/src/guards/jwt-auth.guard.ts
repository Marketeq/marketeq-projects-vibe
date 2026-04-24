import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Allow @Public() decorated endpoints through without auth
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();

    // Trust gateway-forwarded user context (x-user-id header)
    const gwUserId = req.headers['x-user-id'];
    if (gwUserId) {
      req.user = {
        userId: gwUserId,
        email: req.headers['x-user-email'] || '',
        role: req.headers['x-user-role'] || 'user',
      };
      return true;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException('Missing auth token');
    const token = authHeader.split(' ')[1];

    // Try RS256 with public key first (auth-service signs with RS256),
    // fall back to HS256 with JWT_SECRET for M2M tokens
    const publicKey = process.env.AUTH_JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');
    try {
      if (publicKey) {
        req.user = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
      } else {
        req.user = jwt.verify(token, process.env.JWT_SECRET!);
      }
      return true;
    } catch {
      // If RS256 failed, try HS256 fallback
      if (publicKey) {
        try {
          req.user = jwt.verify(token, process.env.JWT_SECRET!);
          return true;
        } catch {
          // both failed
        }
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
