import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * UUID v4 regex used to validate the x-user-id header.
 * Prevents empty strings, arbitrary strings, or malformed values from
 * being blindly trusted as authenticated user identities.
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest();

    // x-user-id bypass — set by the API gateway after verifying the user's JWT.
    // SECURITY NOTE: This service MUST be deployed behind the API gateway only.
    // Direct external access must be blocked at the network level (Render internal
    // network / private service). The x-user-id header is never validated
    // cryptographically here — we rely on network isolation to ensure only the
    // trusted API gateway can set it.
    // We validate UUID format as a minimal sanity check to prevent obviously
    // malformed or empty values from producing corrupt database records.
    const gwUserId = req.headers['x-user-id'] as string | undefined;
    if (gwUserId) {
      if (!UUID_REGEX.test(gwUserId)) {
        throw new UnauthorizedException('Invalid x-user-id format');
      }
      req.user = {
        userId: gwUserId,
        sub: gwUserId,
        email: (req.headers['x-user-email'] as string) || '',
        role: (req.headers['x-user-role'] as string) || 'user',
      };
      return true;
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader)
      throw new UnauthorizedException('Missing Authorization header');

    const token = authHeader.split(' ')[1];
    const publicKey = process.env.AUTH_JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');

    try {
      if (publicKey) {
        req.user = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
      } else {
        req.user = jwt.verify(token, process.env.JWT_SECRET!);
      }
      return true;
    } catch {
      if (publicKey) {
        try {
          req.user = jwt.verify(token, process.env.JWT_SECRET!);
          return true;
        } catch {
          // both failed
        }
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
