import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class GatewayAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const userId = req.headers['x-user-id'];
    if (!userId) throw new UnauthorizedException('Missing x-user-id header');
    req.user = {
      id: userId,
      email: req.headers['x-user-email'] ?? null,
    };
    return true;
  }
}
