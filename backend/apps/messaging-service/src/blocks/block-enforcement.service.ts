import { ForbiddenException, Injectable } from '@nestjs/common';
import { BlocksClient } from './blocks.client';
import { BlockAuditService } from './block-audit.service';
import { Thread } from '../threads/entities/thread.entity';
import { Message } from '../messages/entities/message.entity';

@Injectable()
export class BlockEnforcementService {
  constructor(
    private readonly blocksClient: BlocksClient,
    private readonly audit: BlockAuditService,
  ) {}

  async getCapabilityThreadIds(
    userId: string,
    threads: Pick<Thread, 'id' | 'isGroup' | 'participantIds'>[],
  ): Promise<string[]> {
    if (!threads.length) return [];

    const blockedIds = new Set(await this.blocksClient.listBlockedIds(userId));
    if (!blockedIds.size) {
      return threads.map((t) => t.id);
    }

    const allowed: string[] = [];
    for (const t of threads) {
      if (t.isGroup) {
        allowed.push(t.id);
        continue;
      }
      const other = t.participantIds.find((p) => p !== userId);
      if (!other || !blockedIds.has(other)) {
        allowed.push(t.id);
      } else {
        this.audit.recordDenied({
          actorId: userId,
          targetId: other,
          kind: 'token-capability',
          threadId: t.id,
        });
      }
    }
    return allowed;
  }

  async filterThreadsForBlocks<T extends Pick<Thread, 'id' | 'isGroup' | 'participantIds'>>(
    userId: string,
    threads: T[],
  ): Promise<T[]> {
    if (!threads.length) return threads;
    const blockedIds = new Set(await this.blocksClient.listBlockedIds(userId));
    if (!blockedIds.size) return threads;

    return threads.filter((t) => {
      if (t.isGroup) return true;
      const other = t.participantIds.find((p) => p !== userId);
      return !other || !blockedIds.has(other);
    });
  }

  async assertCanSend(
    senderId: string,
    thread: Pick<Thread, 'id' | 'isGroup' | 'participantIds'>,
  ): Promise<{ shadow: boolean }> {
    if (thread.isGroup) return { shadow: false };
    const recipient = thread.participantIds.find((p) => p !== senderId);
    if (!recipient) return { shadow: false };

    const status = await this.blocksClient.getPairStatus(senderId, recipient);
    if (status.aBlockedB) {
      this.audit.recordDenied({
        actorId: senderId,
        targetId: recipient,
        kind: 'send-rejected',
        threadId: thread.id,
      });
      throw new ForbiddenException(
        'Unblock this user before sending a message',
      );
    }
    if (status.bBlockedA) {
      this.audit.recordDenied({
        actorId: senderId,
        targetId: recipient,
        kind: 'send-shadow-dropped',
        threadId: thread.id,
      });
      return { shadow: true };
    }
    return { shadow: false };
  }

  async assertCanCreate(participantIds: string[]): Promise<void> {
    if (!participantIds || participantIds.length !== 2) return;
    const [a, b] = participantIds;
    const status = await this.blocksClient.getPairStatus(a, b);
    if (status.aBlockedB) {
      this.audit.recordDenied({
        actorId: a,
        targetId: b,
        kind: 'thread-create-rejected',
      });
      throw new ForbiddenException(
        'Unblock this user before starting a conversation',
      );
    }
    if (status.bBlockedA) {
      this.audit.recordDenied({
        actorId: a,
        targetId: b,
        kind: 'thread-create-shadow',
      });
    }
  }

  async filterMessagesForBlocks(
    viewerId: string,
    thread: Pick<Thread, 'id' | 'isGroup'>,
    messages: Message[],
  ): Promise<Message[]> {
    if (thread.isGroup || !messages.length) return messages;
    const blockedIds = new Set(await this.blocksClient.listBlockedIds(viewerId));
    if (!blockedIds.size) return messages;
    return messages.filter((m) => !blockedIds.has(m.senderId));
  }
}
