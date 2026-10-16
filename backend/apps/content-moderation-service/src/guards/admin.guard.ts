import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  auditRoleDecision,
  describeRequest,
  isRoleAllowed,
  logRoleDenial,
  resolveCallerRole,
} from './platform-role.core';

/**
 * AdminGuard — restricts a route to admin callers. Must be used together
 * with JwtAuthGuard (so req.user is set).
 *
 * The decision logic now lives in platform-role.core.ts, shared verbatim by
 * every service that checks roles; it already handles the `role` vs `roles[]`
 * difference this guard used to special-case. Behaviour is unchanged: a
 * caller with no role is refused, which today is everyone, because no access
 * token carries a role claim yet.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.user) throw new ForbiddenException('Missing user context');

    const callerRole = resolveCallerRole(req.user);
    if (!isRoleAllowed(callerRole, ['admin'])) {
      logRoleDenial(describeRequest(req), ['admin'], callerRole);
      auditRoleDecision(req, ['admin'], callerRole, 'denied');
      throw new ForbiddenException('Admin role required');
    }
    auditRoleDecision(req, ['admin'], callerRole, 'allowed');
    return true;
  }
}
