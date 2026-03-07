import { Injectable } from '@nestjs/common';
import * as Ably from 'ably';

@Injectable()
export class AblyService {
  private readonly client: Ably.Rest;

  constructor() {
    this.client = new Ably.Rest({ key: process.env.ABLY_API_KEY });
  }

  async createTokenRequest(userId: string) {
    return this.client.auth.createTokenRequest({
      clientId: userId,
      capability: {
        [`chat:thread-*`]: ['publish', 'subscribe', 'presence'],
        [`user:${userId}`]: ['subscribe'],
        [`presence:thread-*`]: ['subscribe', 'presence'],
      },
    });
  }

  async publish(channel: string, event: string, data: unknown) {
    const ch = this.client.channels.get(channel);
    await ch.publish(event, data);
  }

  publishMessageNew(threadId: string, message: unknown) {
    return this.publish(`chat:thread-${threadId}`, 'message:new', message);
  }

  publishMessageEdit(threadId: string, message: unknown) {
    return this.publish(`chat:thread-${threadId}`, 'message:edit', message);
  }

  publishMessageDelete(threadId: string, messageId: string) {
    return this.publish(`chat:thread-${threadId}`, 'message:delete', { messageId });
  }

  publishMessageRead(userId: string, messageId: string) {
    return this.publish(`user:${userId}`, 'message:read', { messageId });
  }
}
