import { Injectable } from '@nestjs/common';
import * as Ably from 'ably';

@Injectable()
export class AblyService {
  private readonly client: Ably.Rest;

  constructor() {
    this.client = new Ably.Rest({ key: process.env.ABLY_API_KEY });
  }

  async createTokenRequest(userId: string, threadIds: string[] = []) {
    const capability: Record<string, string[]> = {
      [`user:${userId}`]: ['subscribe'],
    };
    for (const threadId of threadIds) {
      capability[`chat:thread-${threadId}`] = ['subscribe', 'presence'];
      capability[`presence:thread-${threadId}`] = ['subscribe', 'presence'];
    }

    return this.client.auth.createTokenRequest({
      clientId: userId,
      capability: JSON.stringify(capability),
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

  publishMessageRestore(threadId: string, messageId: string) {
    return this.publish(`chat:thread-${threadId}`, 'message:restore', { messageId });
  }

  publishMessageRead(userId: string, messageId: string) {
    return this.publish(`user:${userId}`, 'message:read', { messageId });
  }

  publishThreadStateChanged(
    userId: string,
    threadId: string,
    patch: Record<string, unknown>,
  ) {
    return this.publish(`user:${userId}`, 'thread:state-changed', { threadId, patch });
  }

  publishThreadListAssignments(userId: string, threadId: string, listIds: string[]) {
    return this.publish(`user:${userId}`, 'thread:list-assignments-changed', { threadId, listIds });
  }

  publishThreadListsChanged(userId: string) {
    return this.publish(`user:${userId}`, 'thread:lists-changed', {});
  }
}
