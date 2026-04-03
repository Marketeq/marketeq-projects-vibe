import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AirtableSyncService } from '../services/airtable-sync.service';

@Injectable()
export class AirtableSyncJob {
  constructor(private readonly airtableSyncService: AirtableSyncService) {}

  // Run every 10 minutes
  @Cron(CronExpression.EVERY_5_SECONDS)
  async handle() {
    //console.log('Running Airtable sync job...');
    await this.airtableSyncService.pushPendingReviewsToAirtable();
  }
}



// try webhook implementation = done
// retry logic for webhook = done
// retest checkout service = pending