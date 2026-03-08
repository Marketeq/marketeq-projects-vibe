import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException('No user context');
    if (user.role === 'admin') return true;

    const ownerId = req.body?.ownerUserId ?? req.query?.owner;
    if (ownerId && user.userId === ownerId) return true;

    throw new ForbiddenException('Access denied');
  }
}
