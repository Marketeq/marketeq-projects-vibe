import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) throw new UnauthorizedException('Missing auth token');
    try {
      req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET!);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
