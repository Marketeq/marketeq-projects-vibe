import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

const normalizeKey = (value?: string) =>
  value ? value.replace(/\\n/g, '\n') : value;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing auth token');
    }
    const token = authHeader.split(' ')[1];
    try {
      // Auth service signs tokens with RS256 — verify with the public key
      const publicKey = normalizeKey(process.env.AUTH_JWT_PUBLIC_KEY);
      if (publicKey) {
        const payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
        req.user = payload;
      } else {
        // Fallback to symmetric secret for backwards compatibility
        const payload = jwt.verify(token, process.env.JWT_SECRET!);
        req.user = payload;
      }
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
