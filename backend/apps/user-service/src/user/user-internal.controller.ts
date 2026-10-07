import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserService } from './user.service';
import { Public } from '../decorators/public.decorator';

/**
 * Internal user lookup — no JWT required.
 *
 * Used by other microservices (listings-service, api-gateway) for
 * service-to-service profile hydration. Mounted under `/internal/users`
 * so it doesn't collide with the auth-gated `/users` routes.
 *
 * Returns a projection with only the public-safe fields needed by the
 * project-details <TeamSection /> and similar consumers — not the full
 * user entity (which includes hasPassword etc.).
 *
 * Security: relies on network-level isolation (internal-only port).
 * In production, add a CMS_SYNC_TOKEN bearer check or an internal
 * API-key guard.
 *
 * The `by-email` route is the primary lookup used by the CMS team-
 * assignment flow (per spec §16 `TeamMemberAssignment.user_email`).
 * Editors type emails — which they already know and recognise — and
 * the sync hook / hydration resolves them to profiles. Exposing raw
 * UUIDs in the admin UI is an info-disclosure risk avoided by using
 * email as the authored value.
 */
@Controller('internal/users')
export class UserInternalController {
  constructor(
    private readonly userService: UserService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private project(user: User) {
    return {
      id: user.id,
      firstName: (user as any).firstName ?? null,
      lastName: (user as any).lastName ?? null,
      username: (user as any).username ?? null,
      email: user.email,
      avatarUrl: (user as any).avatarUrl ?? null,
      location: (user as any).location ?? null,
      rate: (user as any).rate ?? null,
      languages: Array.isArray((user as any).languages)
        ? (user as any).languages
            .map((l: any) => (typeof l === 'string' ? l : l?.name ?? ''))
            .filter(Boolean)
        : [],
      skills: Array.isArray((user as any).skills)
        ? (user as any).skills
            .map((s: any) => (typeof s === 'string' ? s : s?.name ?? ''))
            .filter(Boolean)
        : [],
    };
  }

  @Public()
  @Get('by-email/:email')
  async getByEmail(@Param('email') email: string) {
    const normalised = decodeURIComponent(email).trim().toLowerCase();
    if (!normalised) throw new NotFoundException('Email required');
    const user = await this.userRepository.findOne({
      where: { email: normalised },
      relations: ['skills', 'languages'],
    });
    if (!user) throw new NotFoundException(`User ${normalised} not found`);
    return this.project(user);
  }

  // Batch avatar lookup for service-to-service callers (one request per list,
  // no N+1). Returns { [userId]: avatarUrl } and omits users with no avatar.
  // Declared ahead of `@Get(':id')`: both are one-segment GETs, so with the
  // reverse order Nest would treat "avatars" as an id.
  @Public()
  @Get('avatars')
  async getAvatars(@Query('ids') ids?: string): Promise<Record<string, string>> {
    const list = Array.from(
      new Set((ids ?? '').split(',').map((id) => id.trim()).filter(Boolean)),
    );
    if (list.length === 0) return {};
    if (list.length > 100) {
      throw new BadRequestException('At most 100 ids per request');
    }
    const users = await this.userRepository.find({
      where: { id: In(list) },
      select: ['id', 'avatarUrl'],
    });
    const result: Record<string, string> = {};
    for (const user of users) {
      if (user.avatarUrl) result[user.id] = user.avatarUrl;
    }
    return result;
  }

  @Public()
  @Get(':id')
  async getProfile(@Param('id') id: string) {
    const user = await this.userService.getUserWithRelations(id);
    return this.project(user);
  }
}
