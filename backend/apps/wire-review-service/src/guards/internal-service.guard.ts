import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { timingSafeEqual } from 'crypto';

/**
 * Requires the shared internal-service token.
 *
 * The wire-review admin endpoint confirms or flags wire transfers and had no
 * guard of any kind: anything that could reach the service could settle a
 * transfer. It is not currently reachable from the internet — the gateway
 * maps the `admin` prefix to admin-service, so no external path lands on
 * `admin/wire-review` — but that is a routing accident, not a control, and
 * one line in the gateway's prefix map would undo it.
 *
 * The internal token is used rather than a role check because roles do not
 * exist yet: the access token carries no role claim, so every role guard in
 * the platform currently rejects everyone. When real roles land, this should
 * become a role check (or both), so a named human is authorising a wire.
 *
 * Accepts the header in either spelling: `x-service-token` (category-service's
 * convention) or `x-internal-token` (what the gateway forwards).
 */
@Injectable()
export class InternalServiceGuard implements CanActivate {
  private readonly logger = new Logger(InternalServiceGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const req: Request = context.switchToHttp().getRequest();
    const expected = process.env.INTERNAL_SERVICE_TOKEN;

    if (!expected) {
      // Fail closed: an unset token must not mean "let everyone through".
      this.logger.error('INTERNAL_SERVICE_TOKEN is not configured — refusing the request');
      throw new UnauthorizedException('Service authentication is not configured');
    }

    const header =
      (req.headers['x-service-token'] as string | undefined) ??
      (req.headers['x-internal-token'] as string | undefined);

    if (
      !header ||
      header.length !== expected.length ||
      !timingSafeEqual(Buffer.from(header), Buffer.from(expected))
    ) {
      this.logger.warn(
        `Rejected an unauthenticated wire-review request path=${req.originalUrl} method=${req.method}`,
      );
      throw new UnauthorizedException('Invalid service token');
    }

    return true;
  }
}
