import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Protects machine-to-machine routes (e.g. NDA generate, void, acceptance recording).
 * Caller must send: x-internal-api-secret: <INTERNAL_API_SECRET env var>
 * Apply with @Public() + @UseGuards(InternalAuthGuard) to bypass the global JwtAuthGuard.
 */
@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Record<string, any>>();
    const received = req.headers['x-internal-api-secret'] as string | undefined;
    const expected = process.env.INTERNAL_API_SECRET;

    if (!received || !expected || received !== expected) {
      throw new UnauthorizedException('Missing or invalid internal API secret');
    }
    return true;
  }
}
