import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class InternalServiceGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    throw new UnauthorizedException(
      'InternalServiceGuard is a placeholder — replace with the platform\'s real internal-service auth before use.',
    );
  }
}
