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

  screenshotConfirmed(data: {
    userId: string;
    contractId: string;
    taskId: string | null;
    taskName: string | null;
    day: string;
    screenshotCount: number;
    firstAt: string;
    lastAt: string;
    avgKbd: number;
    avgMouse: number;
  }): void {
    this.emit('earnings.screenshot_confirmed', data);
  }

  // Approving a manual time entry is the manual-entry equivalent of a
  // confirmed screenshot batch — earnings-service needs its own event
  // (distinct from the pre-existing timetracking.hours.approved, which
  // carries only {userId, manualTimeId, hours} and has no consumer) since
  // it needs contractId/taskId/day to build an earnings_cache row.
  manualTimeConfirmed(data: {
    userId: string;
    contractId: string;
    taskId: string | null;
    taskName: string | null;
    manualTimeId: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
  }): void {
    this.emit('earnings.manual_time_confirmed', data);
  }
}
