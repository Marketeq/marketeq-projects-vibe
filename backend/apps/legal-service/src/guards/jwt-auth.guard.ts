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
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest();

    const gwUserId = req.headers['x-user-id'];
    if (gwUserId) {
      req.user = {
        userId: gwUserId,
        sub: gwUserId,
        email: req.headers['x-user-email'] || '',
        role: req.headers['x-user-role'] || 'user',
      };
      return true;
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader)
      throw new UnauthorizedException('Missing Authorization header');

    const token = authHeader.split(' ')[1];
    const publicKey = process.env.AUTH_JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');

    try {
      if (publicKey) {
        req.user = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
      } else {
        req.user = jwt.verify(token, process.env.JWT_SECRET!);
      }
      return true;
    } catch {
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
