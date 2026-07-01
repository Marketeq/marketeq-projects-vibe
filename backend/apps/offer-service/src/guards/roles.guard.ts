// apps/offer-service/src/guards/roles.guard.ts
// OS-12: RBAC guard — reads user.role attached by @libs/auth JwtStrategy.
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/types/user-role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    const userRole = typeof user?.role === 'string' ? user.role.toUpperCase() : user?.role;

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