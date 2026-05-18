import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Protects admin-only routes (e.g. full unredacted signing-event data).
 * Caller must send: x-admin-token: <ADMIN_API_TOKEN env var>
 * Apply with @Public() + @UseGuards(AdminAuthGuard) to bypass the global JwtAuthGuard.
 *
 * Uses crypto.timingSafeEqual() to prevent timing-based token enumeration attacks.
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Record<string, any>>();
    const received = req.headers['x-admin-token'] as string | undefined;
    const expected = process.env.ADMIN_API_TOKEN;

    if (!received || !expected) {
      throw new UnauthorizedException('Missing or invalid admin token');
    }

    // Constant-time comparison prevents timing attacks where an attacker
    // measures response latency to guess the token one character at a time.
    const receivedBuf = Buffer.from(received);
    const expectedBuf = Buffer.from(expected);
    if (
      receivedBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(receivedBuf, expectedBuf)
    ) {
      throw new UnauthorizedException('Missing or invalid admin token');
    }

    return true;
  }
}
