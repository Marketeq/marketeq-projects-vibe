import { Controller, Post, Body, Headers, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProjectsService } from './projects.service';

@Controller('internal/projects')
export class ProjectsInternalController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly config: ConfigService,
  ) {}

  private validateToken(token: string | undefined): void {
    const expected = this.config.get<string>('INTERNAL_SERVICE_TOKEN');
    if (!expected || token !== expected) throw new ForbiddenException('Invalid internal token');
  }

  @Post('seed')
  seed(
    @Headers('x-internal-token') token: string | undefined,
    @Body() dto: Record<string, any>,
  ) {
    this.validateToken(token);
    return this.projects.seedFromN8n(dto);
  }
}
