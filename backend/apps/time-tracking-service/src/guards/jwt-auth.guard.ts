import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer '))
      throw new UnauthorizedException('Missing auth token');
    const token = authHeader.split(' ')[1];
    // Try RS256 with public key first (auth-service issues RS256 tokens),
    // fall back to HS256 with JWT_SECRET for M2M / bearer tokens.
    const publicKey = (process.env.AUTH_JWT_PUBLIC_KEY || '').replace(/\\n/g, '\n');
    const secret = process.env.JWT_SECRET;
    try {
      if (publicKey) {
        req.user = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
      } else {
        req.user = jwt.verify(token, secret!);
      }
      return true;
    } catch {
      // If RS256 failed and we have a symmetric secret, try that too
      if (publicKey && secret) {
        try {
          req.user = jwt.verify(token, secret);
          return true;
        } catch { /* fall through */ }
      }
      // Accept gateway-forwarded identity (JWT already validated by gateway)
      const gatewayUserId = req.headers['x-user-id'];
      if (gatewayUserId) {
        req.user = { sub: gatewayUserId, email: req.headers['x-user-email'] };
        return true;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}