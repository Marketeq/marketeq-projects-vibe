import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException('Missing auth token');
    try {
      const publicKey = process.env.AUTH_JWT_PUBLIC_KEY;
      const secret = publicKey || process.env.JWT_SECRET!;
      const algorithms = publicKey ? ['RS256'] as jwt.Algorithm[] : ['HS256'] as jwt.Algorithm[];
      req.user = jwt.verify(authHeader.split(' ')[1], secret, { algorithms });
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
