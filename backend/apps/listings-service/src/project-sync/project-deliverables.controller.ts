import {
  Body,
  Controller,
  Headers,
  Logger,
  Post,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { DeriveDeliverablesDto } from './dto/derive-deliverables.dto';
import { ProjectSyncService } from './project-sync.service';

/**
 * Internal endpoint used by cms-service to trigger deliverables generation
 * using the listings-service DeliverablesAdapter.
 *
 * Bearer-authed via the shared CMS_SYNC_TOKEN env var (same as project-sync).
 */
@Controller('internal/project-deliverables')
export class ProjectDeliverablesController {
  private readonly logger = new Logger(ProjectDeliverablesController.name);

  constructor(private readonly projectSyncService: ProjectSyncService) {}

  @Post()
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )
  async derive(
    @Body() dto: DeriveDeliverablesDto,
    @Headers('authorization') authHeader: string,
  ) {
    this.assertAuthorized(authHeader);
    try {
      const deliverables =
        await this.projectSyncService.deriveDeliverablesFromScope(dto.scope);
      return { status: 'ok', deliverables };
    } catch (error) {
      this.logger.error(
        `Failed to derive deliverables: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  private assertAuthorized(authHeader: string | undefined): void {
    const expectedToken = process.env.CMS_SYNC_TOKEN;
    if (!expectedToken) {
      this.logger.error('CMS_SYNC_TOKEN not configured');
      throw new UnauthorizedException('Sync token not configured');
    }
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (token !== expectedToken) {
      this.logger.warn('Invalid sync token received');
      throw new UnauthorizedException('Invalid sync token');
    }
  }
}

