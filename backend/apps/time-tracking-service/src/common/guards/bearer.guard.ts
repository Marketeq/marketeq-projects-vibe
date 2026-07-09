import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class BearerGuard implements CanActivate {
  private readonly expected = process.env.API_BEARER_TOKEN;

  canActivate(context: ExecutionContext): boolean {
    if (!this.expected) {
      throw new InternalServerErrorException(
        'API_BEARER_TOKEN is not configured — cannot accept machine requests',
      );
    }
    const req = context.switchToHttp().getRequest();
    const auth = (req.headers['authorization'] as string | undefined) ?? '';
    if (!auth.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token');
    const token = auth.slice(7);
    if (token === this.expected) return true;
    // Also accept requests from the gateway (JWT already validated, x-user-id set)
    const gatewayUserId = req.headers['x-user-id'];
    if (gatewayUserId) {
      req.user = { sub: gatewayUserId, email: req.headers['x-user-email'] };
      return true;
    }
    throw new UnauthorizedException('Invalid token');
  }
}
