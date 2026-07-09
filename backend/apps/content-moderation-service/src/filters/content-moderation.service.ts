import { Injectable } from '@nestjs/common';
import { ContentRepository } from './content.repository';
import { NotificationService } from '../notification.service';
import { ModerationEventsService } from '../services/moderation-events.service';

@Injectable()
export class ContentModerationService {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly notificationService: NotificationService,
    private readonly eventsService: ModerationEventsService,
  ) {}

  async approveContent(contentId: string, reason?: string): Promise<void> {
    await this.contentRepository.save({
      contentId,
      status: 'approved',
      reason: reason || 'No reason provided',
    });
    this.eventsService.emitContentApproved(contentId, 'project', reason);
  }

  async rejectContent(contentId: string, reason: string): Promise<void> {
    await this.contentRepository.save({
      contentId,
      status: 'rejected',
      reason,
    });
    await this.notificationService.sendRejectionNotice(contentId, reason);
    this.eventsService.emitContentRejected(contentId, 'project', reason);
  }

  async flagContent(contentId: string, reason: string): Promise<void> {
    await this.contentRepository.save({
      contentId,
      status: 'pending',
      reason,
    });
    this.eventsService.emitContentFlagged(contentId, 'project', reason);
  }
}
