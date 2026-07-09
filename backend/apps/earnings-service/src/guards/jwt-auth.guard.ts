import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException('Missing auth token');
    try {
      const publicKey = this.config.get<string>('AUTH_JWT_PUBLIC_KEY')
        || this.config.get<string>('earnings.jwtSecret');
      req.user = jwt.verify(authHeader.split(' ')[1], publicKey!, { algorithms: ['RS256', 'HS256'] });
      // normalise: some tokens use `sub`, earnings service expects `id`
      if (req.user.sub && !req.user.id) req.user.id = req.user.sub;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
