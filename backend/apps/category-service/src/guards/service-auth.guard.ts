import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class ServiceAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req: Request = context.switchToHttp().getRequest();
    const token = req.headers['x-service-token'] as string;
    const expectedToken = process.env.INTERNAL_SERVICE_TOKEN;

    if (!expectedToken) {
      throw new UnauthorizedException('INTERNAL_SERVICE_TOKEN not configured');
    }
    if (
      !token ||
      token.length !== expectedToken.length ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))
    ) {
      throw new UnauthorizedException('Invalid service token');
    }
    return true;
  }
}
