// apps/payout-service/src/guards/roles.guard.ts
// PS-00 §6: Role-based access control
// Used by admin endpoints (PS-24) to restrict access to support/admin users.
//
// The decision logic now lives in platform-role.core.ts, shared verbatim by
// every service that checks roles. This file keeps its original exports, so
// no call site changes. Behaviour is unchanged: a caller with no role is
// still refused — no access token carries a role claim yet.
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  auditRoleDecision,
  describeRequest,
  isRoleAllowed,
  logRoleDenial,
  resolveCallerRole,
} from './platform-role.core';

export const ROLES_KEY = 'roles';

export function Roles(...roles: string[]) {
  return (target: any, key?: string, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(ROLES_KEY, roles, descriptor?.value ?? target);
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      ROLES_KEY,
      context.getHandler(),
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // no roles required — allow
    }

    const request = context.switchToHttp().getRequest();
    const callerRole = resolveCallerRole(request.user);

    if (!isRoleAllowed(callerRole, requiredRoles)) {
      logRoleDenial(describeRequest(request), requiredRoles, callerRole);
      auditRoleDecision(request, requiredRoles, callerRole, 'denied');
      throw new ForbiddenException('Insufficient permissions');
    }

    auditRoleDecision(request, requiredRoles, callerRole, 'allowed');
    return true;
  }
}
