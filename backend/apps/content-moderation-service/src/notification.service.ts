import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationService {
  async sendNotification(userId: string, message: string): Promise<void> {
    console.log(`Notification sent to user ${userId}: ${message}`);
  }

  async sendRejectionNotice(contentId: string, reason: string): Promise<void> {
    console.log(`Notifying user for content ${contentId}: ${reason}`);
  }
}
