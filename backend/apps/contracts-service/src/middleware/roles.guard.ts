import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly allowedRoles: string[]) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user; // decoded JWT payload

    if (!user || !user.role) {
      throw new ForbiddenException('User role not found in token');
    }

    if (!this.allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Role ${user.role} is not allowed for this action`,
      );
    }

    return true;
  }
}
