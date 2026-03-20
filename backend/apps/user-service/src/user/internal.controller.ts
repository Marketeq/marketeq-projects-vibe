import {
  Controller, Post, Body, Headers,
  UnauthorizedException, Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from './user.service';

@Controller('internal/users')
export class InternalUserController {
  private readonly logger = new Logger(InternalUserController.name);

  constructor(
    private readonly userService: UserService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  async syncProfile(
    @Headers('x-internal-token') token: string,
    @Body() dto: { id: string; email: string; username?: string; provider?: string; hasPassword?: boolean },
  ) {
    const expected = this.config.get<string>('INTERNAL_SERVICE_TOKEN');
    if (!token || token !== expected) {
      throw new UnauthorizedException('Invalid internal token');
    }

    const existing = await this.userService.findByEmail(dto.email);
    if (existing) {
      // Update if needed
      if (dto.username && !existing.username) {
        await this.userService.update(existing.id, { username: dto.username });
      }
      return { synced: true, userId: existing.id };
    }

    // Create new user profile
    const user = await this.userService.create({
      id: dto.id,
      email: dto.email,
      username: dto.username,
    });
    this.logger.log(`Synced new user profile: ${user.id}`);
    return { synced: true, userId: user.id };
  }
}
