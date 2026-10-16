import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly publicKey: string;

  constructor(private readonly reflector: Reflector) {
    this.publicKey =
      process.env.AUTH_JWT_PUBLIC_KEY?.replace(/\\n/g, '\n') ??
      process.env.JWT_SECRET ??
      '';
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];
    try {
      const algorithms = this.publicKey.includes('BEGIN') ? ['RS256'] : ['HS256'];
      const decoded = jwt.verify(token, this.publicKey, { algorithms } as any) as any;
      request.user = {
        userId: decoded.sub || decoded.id,
        email: decoded.email,
        // Profile label (talent/client). Carried for callers that display it;
        // RolesGuard does NOT read it — see platform-role.core.ts.
        role: decoded.role,
        // Security role. The only thing RolesGuard honours.
        platformRole: decoded.platformRole,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}