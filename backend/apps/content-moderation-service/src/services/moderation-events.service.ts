import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ModerationEventsService {
  private readonly logger = new Logger(ModerationEventsService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  emitContentApproved(contentId: string, contentType: string, reason?: string): void {
    this.eventEmitter.emit('moderation.content.approved', {
      contentId,
      contentType,
      reason: reason ?? null,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Event emitted: moderation.content.approved for ${contentId}`);
  }

  emitContentRejected(contentId: string, contentType: string, reason: string): void {
    this.eventEmitter.emit('moderation.content.rejected', {
      contentId,
      contentType,
      reason,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Event emitted: moderation.content.rejected for ${contentId}`);
  }

  emitContentFlagged(contentId: string, contentType: string, reason: string): void {
    this.eventEmitter.emit('moderation.content.flagged', {
      contentId,
      contentType,
      reason,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Event emitted: moderation.content.flagged for ${contentId}`);
  }

  emitAppealReviewed(
    contentId: string,
    appealId: string,
    decision: string,
  ): void {
    this.eventEmitter.emit('moderation.appeal.reviewed', {
      contentId,
      appealId,
      decision,
      timestamp: new Date().toISOString(),
    });
    this.logger.log(`Event emitted: moderation.appeal.reviewed for appeal ${appealId}`);
  }
}
