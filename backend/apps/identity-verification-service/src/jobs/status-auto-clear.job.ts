import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IdentityVerificationService } from '../services/identity-verification.service';

// TRVG2 §3: FAILED_FINAL, BLOCKED_AGE, and the VERIFIED -> EXPIRED
// transition must each fire "without user action ... a scheduled
// evaluation ... not a check performed only on next login." No source
// specifies a cadence for any of the three; running all three as one
// daily sweep is this pass's own narrow engineering choice, consistent
// with TravelModeReminderJob's existing daily-sweep pattern.
@Injectable()
export class StatusAutoClearJob {
  private readonly logger = new Logger(StatusAutoClearJob.name);

  constructor(private readonly service: IdentityVerificationService) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async runDailySweep(): Promise<void> {
    const clearedFailedFinal = await this.service.clearExpiredFailedFinal();
    const clearedBlockedAge = await this.service.clearEligibleBlockedAge();
    const expired = await this.service.evaluateDocumentExpiry();

    this.logger.log(
      `Status auto-clear sweep: ${clearedFailedFinal} FAILED_FINAL cleared, ` +
        `${clearedBlockedAge} BLOCKED_AGE cleared, ${expired} transitioned to EXPIRED.`,
    );
  }
}
