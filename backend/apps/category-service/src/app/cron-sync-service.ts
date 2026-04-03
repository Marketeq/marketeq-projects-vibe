import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CategoryService } from './category.service';

/**
 * CronSyncService — fallback pull from Strapi (doc: every 10 minutes).
 */
@Injectable()
export class CronSyncService {
  private readonly logger = new Logger(CronSyncService.name);

  constructor(private readonly categoryService: CategoryService) {}

  @Cron('*/10 * * * *')
  async handleCronSync() {
    const strapiUrl = process.env.STRAPI_URL;
    const token = (process.env.STRAPI_TOKEN || process.env.STRAPI_API_TOKEN)?.trim();

    if (!strapiUrl) {
      this.logger.debug('Strapi URL not configured, skipping sync');
      return;
    }

    if (!token) {
      this.logger.debug(
        'STRAPI_TOKEN / STRAPI_API_TOKEN not set, skipping hierarchy verify (Strapi REST requires auth)',
      );
      return;
    }

    // Doc: periodic pull from Strapi reconciles parent/child fields with Nest (webhook-first, cron fallback).
    this.logger.log('Running Strapi hierarchy verify (fallback sync)...');

    try {
      await this.categoryService.fallbackSyncFromStrapi();
      this.logger.log('Strapi hierarchy verify completed');
    } catch (err: any) {
      this.logger.error(`Strapi hierarchy verify failed: ${err?.message || err}`);
    }
  }
}