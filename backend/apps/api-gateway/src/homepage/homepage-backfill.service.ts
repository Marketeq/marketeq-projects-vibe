import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HomepageService } from './homepage.service';

const BOOT_DELAY_MS = 5_000;

@Injectable()
export class HomepageBackfillService implements OnApplicationBootstrap {
  private readonly logger = new Logger(HomepageBackfillService.name);

  constructor(
    private readonly homepageService: HomepageService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // CMS backfill requires upsertHomepage/upsertBanner on HomepageService.
    // These are not yet wired — skip silently until the DB-backed homepage
    // layer is implemented.
    this.logger.log('[HomepageBackfill] Skipped — upsert methods not yet available');
  }

  // backfillHomepages and backfillBanner are deferred until HomepageService
  // gains upsertHomepage() and upsertBanner() backed by the homepages table.
}
