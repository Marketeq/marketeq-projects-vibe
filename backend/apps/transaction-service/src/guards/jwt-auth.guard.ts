import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Your session has expired. Please log in again to continue.',
      });
    }
    return user;
  }
}