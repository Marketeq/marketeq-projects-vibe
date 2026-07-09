import { Injectable, CanActivate, ExecutionContext,
         UnauthorizedException } from '@nestjs/common';
import { ConfigService }         from '@nestjs/config';
import { timingSafeEqual }        from 'crypto';

@Injectable()
export class ServiceAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req   = ctx.switchToHttp().getRequest();
    const token = req.headers['x-service-token'] as string | undefined;
    if (!token) throw new UnauthorizedException('Missing service token');

    const expected = this.config.get<string>('INTERNAL_SERVICE_TOKEN') || '';
    const a = Buffer.from(token,    'utf8');
    const b = Buffer.from(expected || '', 'utf8');
    const valid = a.length === b.length && timingSafeEqual(a, b);
    if (!valid) throw new UnauthorizedException('Invalid service token');
    return true;
  }
}
