import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Protects machine-to-machine routes (e.g. NDA generate, void, acceptance recording).
 * Caller must send: x-internal-api-secret: <INTERNAL_API_SECRET env var>
 * Apply with @Public() + @UseGuards(InternalAuthGuard) to bypass the global JwtAuthGuard.
 *
 * Uses crypto.timingSafeEqual() to prevent timing-based secret enumeration attacks.
 */
@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Record<string, any>>();
    const received = req.headers['x-internal-api-secret'] as string | undefined;
    const expected = process.env.INTERNAL_API_SECRET;

    if (!received || !expected) {
      throw new UnauthorizedException('Missing or invalid internal API secret');
    }

    // Constant-time comparison prevents timing attacks where an attacker
    // measures response latency to guess the secret one character at a time.
    const receivedBuf = Buffer.from(received);
    const expectedBuf = Buffer.from(expected);
    if (
      receivedBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(receivedBuf, expectedBuf)
    ) {
      throw new UnauthorizedException('Missing or invalid internal API secret');
    }

    return true;
  }
}
