import { Injectable, Logger } from '@nestjs/common';
import * as Ably from 'ably';

@Injectable()
export class AblyNotificationsService {
  private readonly logger = new Logger(AblyNotificationsService.name);
  private readonly client: Ably.Rest | null = null;
  private readonly disabled: boolean;

  constructor() {
    const ablyKey = process.env.ABLY_API_KEY;
    const isProd = process.env.NODE_ENV === 'production';
    const looksValid = !!ablyKey && /^[^:]+:[^:]+$/.test(ablyKey) && !ablyKey.startsWith('your_');

    if (!looksValid) {
      this.disabled = true;
      if (isProd) {
        this.logger.error(
          'ABLY_API_KEY is missing or invalid in production; realtime notifications are disabled until the key is configured.',
        );
      } else {
        this.logger.warn(
          'ABLY_API_KEY is missing or a placeholder; realtime notifications are disabled in local/dev mode.',
        );
      }
      return;
    }

    try {
      this.client = new Ably.Rest({ key: ablyKey as string });
      this.disabled = false;
    } catch (err) {
      this.disabled = true;
      this.logger.warn(
        `Ably client initialization failed — realtime disabled: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  isEnabled(): boolean {
    return !this.disabled && !!this.client;
  }

  async sendInApp(userId: string, notification: {
    id: string;
    title: string;
    body: string;
    link?: string;
    category: string;
  }) {
    if (this.disabled || !this.client) {
      this.logger.debug(
        `Skipping Ably sendInApp for user ${userId} because realtime is disabled.`,
      );
      return;
    }

    const channel = this.client.channels.get(`user:${userId}`);
    await channel.publish('notification:new', notification);
  }

  async updateBadgeCount(userId: string, unreadCount: number) {
    if (this.disabled || !this.client) {
      this.logger.debug(
        `Skipping Ably updateBadgeCount for user ${userId} because realtime is disabled.`,
      );
      return;
    }

    const channel = this.client.channels.get(`user:${userId}`);
    await channel.publish('notification:badge', { unreadCount });
  }
}
