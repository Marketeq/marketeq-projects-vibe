import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CategoryService } from './category.service';

/**
 * CronSyncService — fallback pull from CMS service (Payload CMS).
 * Runs every 10 minutes as reconciliation safety net.
 * Primary sync happens via RabbitMQ events from cms-service.
 */
@Injectable()
export class CronSyncService {
  private readonly logger = new Logger(CronSyncService.name);

  constructor(private readonly categoryService: CategoryService) {}

  @Cron('*/10 * * * *')
  async handleCronSync() {
    const cmsUrl = process.env.CMS_SERVICE_URL || process.env.STRAPI_URL;
    const apiKey = (process.env.CMS_API_KEY || process.env.STRAPI_TOKEN || process.env.STRAPI_API_TOKEN)?.trim();

    if (!cmsUrl) {
      this.logger.debug('CMS_SERVICE_URL not configured, skipping sync');
      return;
    }

    if (!apiKey) {
      this.logger.debug(
        'CMS_API_KEY / STRAPI_TOKEN not set, skipping hierarchy verify (CMS REST requires auth)',
      );
      return;
    }

    this.logger.log('Running CMS hierarchy verify (fallback sync)...');

    try {
      await this.categoryService.fallbackSyncFromCms();
      this.logger.log('CMS hierarchy verify completed');
    } catch (err: any) {
      this.logger.error(`CMS hierarchy verify failed: ${err?.message || err}`);
    }
  }
}
