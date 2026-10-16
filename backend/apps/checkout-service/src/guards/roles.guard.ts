import { CanActivate, ExecutionContext, ForbiddenException, Injectable, mixin } from '@nestjs/common';
import {
  auditRoleDecision,
  describeRequest,
  isRoleAllowed,
  logRoleDenial,
  resolveCallerRole,
} from './platform-role.core';

// Same exported shape as before — RolesGuard('admin') at the call site is
// unchanged. The decision logic lives in platform-role.core.ts, shared
// verbatim across services. A caller with no role is refused, which is still
// everyone, because no account holds a platform role yet.
//
// Both outcomes are written to the security audit log. The allow side is the
// one that matters: a denial shows up as a 403 anyway, but a privileged
// caller succeeding leaves no other trace.
export function RolesGuard(...allowedRoles: string[]) {
  @Injectable()
  class RolesGuardMixin implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest();
      if (!req.user) throw new ForbiddenException('No user context');

      const callerRole = resolveCallerRole(req.user);
      if (!isRoleAllowed(callerRole, allowedRoles)) {
        logRoleDenial(describeRequest(req), allowedRoles, callerRole);
        auditRoleDecision(req, allowedRoles, callerRole, 'denied');
        throw new ForbiddenException(
          `Role '${callerRole ?? 'none'}' is not allowed for this action`,
        );
      }
      auditRoleDecision(req, allowedRoles, callerRole, 'allowed');
      return true;
    }
  }
  return mixin(RolesGuardMixin);
}
