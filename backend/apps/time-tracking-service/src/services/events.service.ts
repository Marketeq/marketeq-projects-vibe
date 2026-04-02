import { Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(@Inject('RABBITMQ_CLIENT') private readonly client: ClientProxy) {}

  private emit(eventName: string, data: Record<string, any>): void {
    const payload = { eventName, timestamp: new Date().toISOString(), data };
    try {
      this.client.emit(eventName, payload);
      this.logger.log(`Emitted: ${eventName}`);
    } catch (err) {
      this.logger.error(`Failed to emit ${eventName}: ${err instanceof Error ? err.message : err}`);
    }
  }

  hoursApproved(userId: string, manualTimeId: string, hours: number): void {
    this.emit('timetracking.hours.approved', { userId, manualTimeId, hours });
  }

  screenshotDeleted(screenshotId: string, userId: string, reason: string | null): void {
    this.emit('timetracking.screenshot.deleted', { screenshotId, userId, reason });
  }

  screenshotBlurred(screenshotId: string, userId: string, blurredAt: Date): void {
    this.emit('timetracking.screenshot.blurred', { screenshotId, userId, blurredAt: blurredAt.toISOString() });
  }

  screenshotFlagged(screenshotId: string, userId: string, flaggedBy: string, reason: string | null): void {
    this.emit('timetracking.screenshot.flagged', { screenshotId, userId, flaggedBy, reason });
  }

  screenshotReviewed(screenshotId: string, reviewedBy: string, status: string, comment: string | null): void {
    this.emit('timetracking.screenshot.reviewed', { screenshotId, reviewedBy, status, comment });
  }

  manualTimeSubmitted(manualTimeId: string, userId: string, hours: number): void {
    this.emit('timetracking.manual_time.submitted', { manualTimeId, userId, hours });
  }

  manualTimeRejected(manualTimeId: string, userId: string, reviewedBy: string, reason: string | null): void {
    this.emit('timetracking.manual_time.rejected', { manualTimeId, userId, reviewedBy, reason });
  }
}
