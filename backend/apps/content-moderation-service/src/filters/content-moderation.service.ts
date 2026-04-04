import { Injectable } from '@nestjs/common';
import { ContentRepository } from './content.repository';  
import { NotificationService } from '../notification.service';  

@Injectable()
export class ContentModerationService {
  constructor(
    private readonly contentRepository: ContentRepository,
    private readonly notificationService: NotificationService
  ) {}
  async approveContent(contentId: string, reason?: string): Promise<void> {
    console.log(`Content ${contentId} approved with reason: ${reason || 'No reason provided'}`);
    await this.contentRepository.save({
      contentId,
      status: 'approved',
      reason: reason || 'No reason provided',
    });
  }

  async rejectContent(contentId: string, reason: string): Promise<void> {
    console.log(`Content ${contentId} rejected with reason: ${reason}`);
    await this.contentRepository.save({
      contentId,
      status: 'rejected',
      reason,
    });
    await this.notificationService.sendRejectionNotice(contentId, reason);
  }
  async flagContent(contentId: string, reason: string): Promise<void> {
    console.log(`Content ${contentId} flagged for review with reason: ${reason}`);
    await this.contentRepository.save({
      contentId,
      status: 'pending',
      reason,
    });
  }
}
