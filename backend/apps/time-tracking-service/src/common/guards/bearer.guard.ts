import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class BearerGuard implements CanActivate {
  private readonly expected = process.env.API_BEARER_TOKEN || '';

  canActivate(context: ExecutionContext): boolean {
    if (!this.expected) return true;
    const req = context.switchToHttp().getRequest();
    const auth = (req.headers['authorization'] as string | undefined) || '';
    if (!auth.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token');
    const token = auth.slice(7);
    if (token !== this.expected) throw new UnauthorizedException('Invalid token');
    return true;
  }
}
