// Service-to-service auth via the shared INTERNAL_SERVICE_TOKEN + x-internal-token
// header (same convention as apps/listings-service/src/projects/projects-internal.controller.ts).
// Used on endpoints that are only ever called by another backend service (the
// gateway, in this case) rather than directly by an end-user client, so the
// caller is trusted to supply an already-verified clientId instead of us
// re-validating a forwarded user JWT.
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InternalTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const token = req.headers['x-internal-token'] as string | undefined;
    const expected = this.config.get<string>('INTERNAL_SERVICE_TOKEN');

    if (!expected || token !== expected) {
      throw new ForbiddenException('Invalid internal token');
    }
    return true;
  }
}
