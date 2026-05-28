import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { Attachment } from './entities/attachment.entity';
import { Thread } from '../threads/entities/thread.entity';
import { AblyService } from '../ably/ably.service';
import { BlockEnforcementService } from '../blocks/block-enforcement.service';
import { R2Service } from '../storage/r2.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message) private readonly messageRepo: Repository<Message>,
    @InjectRepository(Attachment) private readonly attachmentRepo: Repository<Attachment>,
    @InjectRepository(Thread) private readonly threadRepo: Repository<Thread>,
    private readonly ablyService: AblyService,
    private readonly r2Service: R2Service,
    private readonly dataSource: DataSource,
    private readonly blockEnforcement: BlockEnforcementService,
  ) {}

  async getThreadMessages(
    threadId: string,
    userId: string,
    opts: { limit?: number; before?: string; all?: boolean } = {},
  ) {
    const thread = await this.assertParticipant(threadId, userId);

    if (opts.all) {
      const allRows = await this.messageRepo.find({
        where: { threadId, deleted: false },
        relations: ['attachments'],
        order: { createdAt: 'ASC' },
      });
      const filteredAll = await this.blockEnforcement.filterMessagesForBlocks(
        userId,
        thread,
        allRows,
      );
      return { messages: filteredAll, hasMore: false, nextCursor: null };
    }

    const limit = opts.limit ?? 50;

    let beforeCreatedAt: Date | undefined;
    if (opts.before) {
      const cursorRow = await this.messageRepo.findOne({
        where: { id: opts.before, threadId },
      });
      if (cursorRow) beforeCreatedAt = cursorRow.createdAt;
    }

    const idQb = this.messageRepo
      .createQueryBuilder('m')
      .select('m.id', 'id')
      .addSelect('m."createdAt"', 'createdAt')
      .where('m."threadId" = :threadId', { threadId })
      .andWhere('m.deleted = false');

    if (beforeCreatedAt) {
      idQb.andWhere(
        '(m."createdAt", m.id) < (:beforeCreatedAt, :beforeId)',
        { beforeCreatedAt, beforeId: opts.before },
      );
    }

    const idRows = await idQb
      .orderBy('m."createdAt"', 'DESC')
      .addOrderBy('m.id', 'DESC')
      .limit(limit + 1)
      .getRawMany<{ id: string; createdAt: Date }>();

    const rows =
      idRows.length === 0
        ? []
        : await this.messageRepo
            .createQueryBuilder('m')
            .leftJoinAndSelect('m.attachments', 'a')
            .where('m.id IN (:...ids)', { ids: idRows.map((r) => r.id) })
            .orderBy('m."createdAt"', 'DESC')
            .addOrderBy('m.id', 'DESC')
            .getMany();

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    const ascending = page.slice().reverse();
    const filtered = await this.blockEnforcement.filterMessagesForBlocks(
      userId,
      thread,
      ascending,
    );

    return { messages: filtered, hasMore, nextCursor };
  }

  private async assertParticipant(threadId: string, userId: string): Promise<Thread> {
    const thread = await this.threadRepo.findOne({ where: { id: threadId } });
    if (!thread) throw new NotFoundException('Thread not found');
    if (!userId || !thread.participantIds.includes(userId)) {
      throw new ForbiddenException('Not a participant of this thread');
    }
    return thread;
  }

  async send(dto: Partial<Message> & { threadId: string; senderId: string }) {
    const thread = await this.threadRepo.findOne({ where: { id: dto.threadId } });
    if (!thread) throw new NotFoundException('Thread not found');
    if (!thread.participantIds.includes(dto.senderId)) {
      throw new ForbiddenException('Not a participant of this thread');
    }
    const { shadow } = await this.blockEnforcement.assertCanSend(dto.senderId, thread);

    const message = this.messageRepo.create({ ...dto, status: 'sent' });
    const saved = await this.messageRepo.save(message);

    const bumpedAt = new Date();
    await this.threadRepo.update({ id: dto.threadId }, { updatedAt: bumpedAt });
    for (const pid of thread.participantIds) {
      this.ablyService
        .publishThreadStateChanged(pid, dto.threadId, {
          updatedAt: bumpedAt.toISOString(),
        })
        .catch(() => undefined);
    }

    if (!shadow) {
      if (saved.ciphertext) {
        const { content: _plaintext, ...ciphertextOnly } = saved;
        await this.ablyService.publishMessageNew(dto.threadId, ciphertextOnly);
      } else {
        await this.ablyService.publishMessageNew(dto.threadId, saved);
      }
    }
    return saved;
  }

  async uploadAttachment(params: {
    threadId: string;
    senderId: string;
    file: Express.Multer.File;
    ciphertext?: string;
  }) {
    const { threadId, senderId, file, ciphertext } = params;
    if (!file) throw new BadRequestException('file is required');
    const thread = await this.assertParticipant(threadId, senderId);
    const { shadow } = await this.blockEnforcement.assertCanSend(senderId, thread);

    const { key, url: fileUrl } = await this.r2Service.uploadMessageAttachment(
      threadId,
      file,
    );

    let result: { message: Message; attachment: Attachment };
    try {
      result = await this.dataSource.transaction(async (em) => {
        const msg = em.getRepository(Message).create({
          threadId,
          senderId,
          ciphertext: ciphertext ?? undefined,
          messageType: 'file',
          status: 'sent',
        });
        const savedMsg = await em.getRepository(Message).save(msg);

        const att = em.getRepository(Attachment).create({
          messageId: savedMsg.id,
          fileUrl,
          fileType: file.mimetype,
          fileName: file.originalname,
          fileSize: file.size,
        });
        const savedAtt = await em.getRepository(Attachment).save(att);

        return { message: savedMsg, attachment: savedAtt };
      });
    } catch (error) {
      await this.r2Service.deleteObject(key).catch(() => undefined);
      throw error;
    }

    const bumpedAt = new Date();
    await this.threadRepo.update({ id: threadId }, { updatedAt: bumpedAt });
    for (const pid of thread.participantIds) {
      this.ablyService
        .publishThreadStateChanged(pid, threadId, {
          updatedAt: bumpedAt.toISOString(),
        })
        .catch(() => undefined);
    }

    const payload = {
      ...result.message,
      attachments: [result.attachment],
    } as any;
    if (!shadow) {
      if (result.message.ciphertext) {
        const { content: _plaintext, ...ciphertextOnly } = payload;
        await this.ablyService.publishMessageNew(threadId, ciphertextOnly);
      } else {
        await this.ablyService.publishMessageNew(threadId, payload);
      }
    }
    return result;
  }

  async edit(id: string, content: string, userId: string, ciphertext?: string) {
    const message = await this.messageRepo.findOne({ where: { id } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('Cannot edit others messages');

    if (ciphertext) {
      await this.messageRepo.update(id, { ciphertext, content: null as any, edited: true });
    } else {
      await this.messageRepo.update(id, { content, edited: true });
    }
    const updated = await this.messageRepo.findOne({ where: { id } });
    await this.ablyService.publishMessageEdit(message.threadId, updated);
    return updated;
  }

  async delete(id: string, userId: string) {
    const message = await this.messageRepo.findOne({ where: { id } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('Cannot delete others messages');

    await this.messageRepo.update(id, { deleted: true, reactions: [] });
    await this.ablyService.publishMessageDelete(message.threadId, id);
  }

  async restore(id: string, userId: string) {
    const message = await this.messageRepo.findOne({ where: { id } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('Cannot restore others messages');

    await this.messageRepo.update(id, { deleted: false });
    await this.ablyService.publishMessageRestore(message.threadId, id);
  }

  async markRead(messageId: string, userId: string) {
    const message = await this.messageRepo.findOne({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');

    const thread = await this.threadRepo.findOne({ where: { id: message.threadId } });
    if (!thread || !thread.participantIds.includes(userId)) {
      throw new ForbiddenException('Not a participant of this thread');
    }

    await this.messageRepo.update(messageId, { status: 'read' });
    await this.ablyService.publishMessageRead(message.senderId, messageId, userId);
  }

  async toggleReaction(messageId: string, emoji: string, userId: string) {
    const trimmed = (emoji ?? '').trim();
    if (!trimmed || trimmed.length > 32) {
      throw new ForbiddenException('Invalid emoji');
    }

    const message = await this.messageRepo.findOne({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    await this.assertParticipant(message.threadId, userId);

    const current = Array.isArray(message.reactions) ? [...message.reactions] : [];
    const idx = current.findIndex(
      (r) => r.userId === userId && r.emoji === trimmed,
    );
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push({
        userId,
        emoji: trimmed,
        createdAt: new Date().toISOString(),
      });
    }

    await this.messageRepo.update(messageId, { reactions: current });
    await this.ablyService.publishMessageReaction(message.threadId, {
      messageId,
      reactions: current,
    });
    return current;
  }

  async forward(messageId: string, toUserIds: string[], senderId: string) {
    if (toUserIds.length > 5) throw new ForbiddenException('Cannot forward to more than 5 users');
    const original = await this.messageRepo.findOne({ where: { id: messageId } });
    if (!original) throw new NotFoundException('Message not found');
    await this.assertParticipant(original.threadId, senderId);

    const results = [];
    for (const userId of toUserIds) {
      // Find existing 1:1 thread between sender and recipient
      let thread = await this.threadRepo
        .createQueryBuilder('t')
        .where('t.isGroup = false')
        .andWhere(':senderId = ANY(t.participantIds)', { senderId })
        .andWhere(':userId = ANY(t.participantIds)', { userId })
        .orderBy('t.createdAt', 'ASC')
        .limit(1)
        .getOne();

      if (!thread) {
        thread = await this.threadRepo.save(
          this.threadRepo.create({ participantIds: [senderId, userId], isGroup: false }),
        );
      }

      const msg = await this.send({
        threadId: thread.id,
        senderId,
        content: original.content,
        ciphertext: original.ciphertext,
        messageType: original.messageType,
        forwardedFromId: messageId,
      });
      results.push(msg);
    }
    return results;
  }

  async pin(messageId: string, userId: string) {
    await this.assertMessageParticipant(messageId, userId);
    await this.messageRepo.update(messageId, { pinned: true });
    return { success: true };
  }

  async unpin(messageId: string, userId: string) {
    await this.assertMessageParticipant(messageId, userId);
    await this.messageRepo.update(messageId, { pinned: false });
    return { success: true };
  }

  async star(messageId: string, userId: string) {
    await this.assertMessageParticipant(messageId, userId);
    await this.messageRepo.update(messageId, { starred: true });
  }

  private async assertMessageParticipant(messageId: string, userId: string): Promise<void> {
    const message = await this.messageRepo.findOne({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    await this.assertParticipant(message.threadId, userId);
  }

  async search(query: string, userId: string) {
    if (!userId) throw new ForbiddenException('Authentication required');
    const q = (query ?? '').slice(0, 128);
    if (!q) return [];
    return this.messageRepo
      .createQueryBuilder('m')
      .where('m.content ILIKE :q', { q: `%${q}%` })
      .andWhere('m.deleted = false')
      .andWhere(
        'EXISTS (SELECT 1 FROM messaging.threads t WHERE t.id = m."threadId" AND :userId = ANY(t."participantIds"))',
        { userId },
      )
      .orderBy('m.createdAt', 'DESC')
      .limit(50)
      .getMany();
  }
}
