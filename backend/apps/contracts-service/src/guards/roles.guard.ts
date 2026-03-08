import { CanActivate, ExecutionContext, ForbiddenException, Injectable, mixin } from '@nestjs/common';

export function RolesGuard(...allowedRoles: string[]) {
  @Injectable()
  class RolesGuardMixin implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest();
      const user = req.user;
      if (!user) throw new ForbiddenException('No user context');
      if (!allowedRoles.includes(user.role)) {
        throw new ForbiddenException(`Role '${user.role}' is not allowed for this action`);
      }
      return true;
    }
  }
  return mixin(RolesGuardMixin);
}
