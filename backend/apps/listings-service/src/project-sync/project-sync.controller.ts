import { Controller, Post, Body, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { ProjectSyncService } from './project-sync.service';
import { ProjectSyncDto } from './dto/project-sync.dto';

@Controller('internal/project-sync')
export class ProjectSyncController {
  private readonly logger = new Logger(ProjectSyncController.name);

  constructor(private readonly projectSyncService: ProjectSyncService) {}

  @Post()
  async syncProject(
    @Body() projectData: ProjectSyncDto,
    @Headers('authorization') authHeader: string,
  ) {
    // Check authorization header
    const expectedToken = process.env.STRAPI_SYNC_TOKEN;
    if (!expectedToken) {
      this.logger.error('STRAPI_SYNC_TOKEN not configured');
      throw new UnauthorizedException('Sync token not configured');
    }

    const token = authHeader?.replace('Bearer ', '');
    if (token !== expectedToken) {
      this.logger.warn('Invalid sync token received');
      throw new UnauthorizedException('Invalid sync token');
    }

    try {
      await this.projectSyncService.syncFromStrapi(projectData);
      this.logger.log(`✅ Project synced successfully: ${projectData.id}`);
      return { status: 'ok', message: 'Project synced successfully' };
    } catch (error) {
      this.logger.error(`Failed to sync project: ${(error as any).message}`);
      throw error;
    }
  }
}
