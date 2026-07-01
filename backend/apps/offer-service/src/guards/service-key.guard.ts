// apps/offer-service/src/guards/service-key.guard.ts
// OS-12: Service-to-service authentication via X-Service-Key header.
// Used on internal-only endpoints (e.g. called by contracts-service or notification-service).
// Separate from user-facing JwtAuthGuard.
import {
  Injectable, CanActivate, ExecutionContext, UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OfferConfig } from '../config/offer.config';

@Injectable()
export class ServiceKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = request.headers['x-service-key'];
    const expected = this.configService.get<OfferConfig>('offer')!.services.apiKey;

    if (!key || key !== expected) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'INVALID_SERVICE_KEY',
        message: 'Unauthorized.',
      });
    }
    return true;
  }
}