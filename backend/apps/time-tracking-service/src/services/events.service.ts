import { Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(@Inject('RABBITMQ_CLIENT') private readonly client: ClientProxy) {}

  private emit(eventName: string, data: Record<string, any>): void {
    const payload = { eventName, timestamp: new Date().toISOString(), data };
    this.client.emit(eventName, payload);
    this.logger.log(`Emitted: ${eventName}`);
  }

  hoursApproved(userId: string, manualTimeId: string, hours: number): void {
    this.emit('timetracking.hours.approved', { userId, manualTimeId, hours });
  }

  screenshotDeleted(screenshotId: string, userId: string, reason: string | null): void {
    this.emit('timetracking.screenshot.deleted', { screenshotId, userId, reason });
  }
}
