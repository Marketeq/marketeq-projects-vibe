import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * AdminGuard — restricts a route to users whose JWT payload identifies them
 * as an admin. Must be used together with JwtAuthGuard (so req.user is set).
 *
 * Accepts either `req.user.role === 'admin'` or `req.user.roles` including
 * 'admin', to be tolerant of different token shapes across services.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user as
      | { role?: string; roles?: string[] }
      | undefined;
    if (!user) throw new ForbiddenException('Missing user context');
    const isAdmin =
      user.role === 'admin' ||
      (Array.isArray(user.roles) && user.roles.includes('admin'));
    if (!isAdmin) throw new ForbiddenException('Admin role required');
    return true;
  }
}
