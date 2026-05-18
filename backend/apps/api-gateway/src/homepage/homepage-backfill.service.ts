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
    await new Promise((r) => setTimeout(r, BOOT_DELAY_MS));
    await Promise.all([this.backfillHomepages(), this.backfillBanner()]);
  }

  private async backfillHomepages(): Promise<void> {
    const cmsUrl = this.config.get<string>('CMS_SERVICE_URL') ?? 'http://localhost:3020';
    try {
      const res = await fetch(`${cmsUrl}/api/homepages?limit=100&depth=2`);
      if (!res.ok) {
        this.logger.warn(`[HomepageBackfill] CMS returned ${res.status} — skipping`);
        return;
      }
      const data = (await res.json()) as any;
      const docs: any[] = data?.docs ?? [];
      this.logger.log(`[HomepageBackfill] ${docs.length} homepage(s) to sync`);
      let synced = 0;
      let failed = 0;
      for (const doc of docs) {
        try {
          await this.homepageService.upsertHomepage(doc);
          synced++;
        } catch (err: any) {
          failed++;
          this.logger.error(`[HomepageBackfill] Failed for slug "${doc.slug}": ${err.message}`);
        }
      }
      this.logger.log(`[HomepageBackfill] Done — synced: ${synced}, failed: ${failed}`);
    } catch (err: any) {
      this.logger.warn(`[HomepageBackfill] CMS unreachable — skipping: ${err.message}`);
    }
  }

  private async backfillBanner(): Promise<void> {
    const cmsUrl = this.config.get<string>('CMS_SERVICE_URL') ?? 'http://localhost:3020';
    try {
      const res = await fetch(`${cmsUrl}/api/globals/homepage-banner`);
      if (!res.ok) {
        this.logger.warn(`[BannerBackfill] CMS returned ${res.status} — skipping`);
        return;
      }
      const data = (await res.json()) as any;
      await this.homepageService.upsertBanner(data);
      this.logger.log('[BannerBackfill] Done');
    } catch (err: any) {
      this.logger.warn(`[BannerBackfill] CMS unreachable — skipping: ${err.message}`);
    }
  }
}
