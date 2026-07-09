import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ServiceAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req: Request = context.switchToHttp().getRequest();
    const token = req.headers['x-service-token'] as string;
    // Prefer INTERNAL_SERVICE_TOKEN (matches docker-compose / env files).
    // Keep SERVICE_TOKEN as a backwards-compatible fallback.
    const expectedToken =
      process.env.INTERNAL_SERVICE_TOKEN ?? process.env.SERVICE_TOKEN;

    if (!token || !expectedToken || token !== expectedToken) {
      throw new UnauthorizedException('Invalid service token');
    }
    return true;
  }
}
