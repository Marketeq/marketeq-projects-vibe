// apps/offer-service/src/guards/roles.guard.ts
// OS-12: RBAC guard — reads user.role attached by @libs/auth JwtStrategy.
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/types/user-role.enum';
import { resolveEffectiveRole } from './party-role.util';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();

    // OfferPartyGuard (when it runs first — guard order matters) derives
    // request.partyRole from actual offer party membership, which is
    // authoritative on routes that operate on an existing offer. Routes
    // with no offer in scope (createOffer) have nothing to derive and
    // fall back to the JWT's own role claim exactly as before — still
    // broken until the upstream libs/auth gap is fixed, unchanged here on
    // purpose (see offer-party.guard.ts's comment for the full story).
    const userRole = resolveEffectiveRole(request.partyRole, request.user?.role);

    if (!userRole || !requiredRoles.includes(userRole as UserRole)) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'FORBIDDEN_FOR_ROLE',
        message: "You don't have permission to do that.",
      });
    }
    return true;
  }
}