import { Controller, ForbiddenException, Headers, Param, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PublishService } from './publish.service';

/**
 * Service-to-service endpoints for the project-invite lifecycle
 * (invitations-service's PublishServiceClient calls these). Same
 * x-internal-token pattern as ProjectsInternalController.
 */
@Controller('internal/projects')
export class PublishInternalController {
  constructor(
    private readonly publishService: PublishService,
    private readonly config: ConfigService,
  ) {}

  private validateToken(token: string | undefined): void {
    const expected = this.config.get<string>('INTERNAL_SERVICE_TOKEN');
    if (!expected || token !== expected) throw new ForbiddenException('Invalid internal token');
  }

  @Post(':projectId/members/:userId/pending')
  async markPending(
    @Headers('x-internal-token') token: string | undefined,
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
  ) {
    this.validateToken(token);
    await this.publishService.setProjectMemberStatus(projectId, userId, 'Pending');
    return { ok: true };
  }

  @Post(':projectId/members/:userId/activate')
  async activate(
    @Headers('x-internal-token') token: string | undefined,
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
  ) {
    this.validateToken(token);
    await this.publishService.setProjectMemberStatus(projectId, userId, 'Active');
    return { ok: true };
  }

  @Post(':projectId/members/:userId/decline')
  async decline(
    @Headers('x-internal-token') token: string | undefined,
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
  ) {
    this.validateToken(token);
    await this.publishService.setProjectMemberStatus(projectId, userId, 'Declined');
    return { ok: true };
  }
}
