import {
  Controller,
  Post,
  Delete,
  Body,
  Headers,
  Param,
  UnauthorizedException,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ProjectSyncService } from './project-sync.service';
import { ProjectSyncDto } from './dto/project-sync.dto';

/**
 * Internal sync endpoint called by the cms-service Payload afterChange
 * and afterDelete hooks for the `projects` collection. Bearer-authed via
 * the shared CMS_SYNC_TOKEN env var.
 */
@Controller('internal/project-sync')
export class ProjectSyncController {
  private readonly logger = new Logger(ProjectSyncController.name);

  constructor(private readonly projectSyncService: ProjectSyncService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }))
  async syncProject(
    @Body() projectData: ProjectSyncDto,
    @Headers('authorization') authHeader: string,
  ) {
    this.assertAuthorized(authHeader);
    try {
      const result = await this.projectSyncService.syncFromCms(projectData);
      return { status: 'ok', ...result };
    } catch (error) {
      this.logger.error(`Failed to sync project ${projectData?.id}: ${(error as Error).message}`);
      throw error;
    }
  }

  @Delete(':payloadId')
  async deleteProject(
    @Param('payloadId') payloadId: string,
    @Headers('authorization') authHeader: string,
  ) {
    this.assertAuthorized(authHeader);
    try {
      const result = await this.projectSyncService.deleteByPayloadId(payloadId);
      return { status: 'ok', ...result };
    } catch (error) {
      this.logger.error(`Failed to delete project ${payloadId}: ${(error as Error).message}`);
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
