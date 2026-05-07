import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * Protects admin-only routes (e.g. full unredacted signing-event data).
 * Caller must send: x-admin-token: <ADMIN_API_TOKEN env var>
 * Apply with @Public() + @UseGuards(AdminAuthGuard) to bypass the global JwtAuthGuard.
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Record<string, any>>();
    const received = req.headers['x-admin-token'] as string | undefined;
    const expected = process.env.ADMIN_API_TOKEN;

    if (!received || !expected || received !== expected) {
      throw new UnauthorizedException('Missing or invalid admin token');
    }
    return true;
  }
}
