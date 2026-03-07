import { Injectable } from '@nestjs/common';
import * as Ably from 'ably';

@Injectable()
export class AblyNotificationsService {
  private readonly client: Ably.Rest;

  constructor() {
    this.client = new Ably.Rest({ key: process.env.ABLY_API_KEY });
  }

  async sendInApp(userId: string, notification: {
    id: string;
    title: string;
    body: string;
    link?: string;
    category: string;
  }) {
    const channel = this.client.channels.get(`user:${userId}`);
    await channel.publish('notification:new', notification);
  }

  async updateBadgeCount(userId: string, unreadCount: number) {
    const channel = this.client.channels.get(`user:${userId}`);
    await channel.publish('notification:badge', { unreadCount });
  }
}
