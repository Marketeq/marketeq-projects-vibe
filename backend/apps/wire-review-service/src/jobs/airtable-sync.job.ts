import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AirtableSyncService } from '../services/airtable-sync.service';

@Injectable()
export class AirtableSyncJob {
  constructor(private readonly airtableSyncService: AirtableSyncService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handle() {
    try {
      await this.airtableSyncService.pushPendingReviewsToAirtable();
    } catch (err: any) {
      // Survive missing tables — don't crash the service
    }
  }
}



// try webhook implementation = done
// retry logic for webhook = done
// retest checkout service = pending