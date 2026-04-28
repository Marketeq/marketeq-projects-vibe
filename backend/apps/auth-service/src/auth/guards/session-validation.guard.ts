import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { CanActivate } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../../session/entities/session.entity';

@Injectable()
export class SessionValidationGuard implements CanActivate {
  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as any;

    if (!user?.sub) {
      throw new UnauthorizedException('Invalid user');
    }

    // If the JWT payload has a session ID, validate it exists in the database
    if (user?.sid) {
      const session = await this.sessionRepository.findOne({
        where: { id: user.sid, userId: user.sub },
      });

      if (!session || session.expiresAt < new Date()) {
        throw new UnauthorizedException('Session has been revoked or expired');
      }
    }

    return true;
  }
}
