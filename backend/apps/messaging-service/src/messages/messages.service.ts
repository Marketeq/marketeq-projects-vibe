import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { Thread } from '../threads/entities/thread.entity';
import { AblyService } from '../ably/ably.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message) private readonly messageRepo: Repository<Message>,
    @InjectRepository(Thread) private readonly threadRepo: Repository<Thread>,
    private readonly ablyService: AblyService,
  ) {}

  async getThreadMessages(threadId: string) {
    return this.messageRepo.find({
      where: { threadId, deleted: false },
      relations: ['attachments'],
      order: { createdAt: 'ASC' },
    });
  }

  async send(dto: Partial<Message> & { threadId: string; senderId: string }) {
    const thread = await this.threadRepo.findOne({ where: { id: dto.threadId } });
    if (!thread) throw new NotFoundException('Thread not found');
    if (!thread.participantIds.includes(dto.senderId)) {
      throw new ForbiddenException('Not a participant of this thread');
    }

    const message = this.messageRepo.create({ ...dto, status: 'sent' });
    const saved = await this.messageRepo.save(message);

    await this.ablyService.publishMessageNew(dto.threadId, saved);
    return saved;
  }

  async edit(id: string, content: string, userId: string) {
    const message = await this.messageRepo.findOne({ where: { id } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('Cannot edit others messages');

    await this.messageRepo.update(id, { content, edited: true });
    const updated = await this.messageRepo.findOne({ where: { id } });
    await this.ablyService.publishMessageEdit(message.threadId, updated);
    return updated;
  }

  async delete(id: string, userId: string) {
    const message = await this.messageRepo.findOne({ where: { id } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) throw new ForbiddenException('Cannot delete others messages');

    await this.messageRepo.update(id, { deleted: true });
    await this.ablyService.publishMessageDelete(message.threadId, id);
  }

  async markRead(messageId: string, userId: string) {
    await this.messageRepo.update(messageId, { status: 'read' });
    const message = await this.messageRepo.findOne({ where: { id: messageId } });
    if (message) {
      await this.ablyService.publishMessageRead(message.senderId, messageId);
    }
  }

  async forward(messageId: string, toUserIds: string[], senderId: string) {
    if (toUserIds.length > 5) throw new ForbiddenException('Cannot forward to more than 5 users');
    const original = await this.messageRepo.findOne({ where: { id: messageId } });
    if (!original) throw new NotFoundException('Message not found');

    const results = [];
    for (const userId of toUserIds) {
      let thread = await this.threadRepo.findOne({
        where: { isGroup: false },
      });
      // Find or create thread between sender and recipient
      thread = await this.threadRepo.save(
        this.threadRepo.create({ participantIds: [senderId, userId], isGroup: false }),
      );
      const msg = await this.send({
        threadId: thread.id,
        senderId,
        content: original.content,
        messageType: original.messageType,
        forwardedFromId: messageId,
      });
      results.push(msg);
    }
    return results;
  }

  async pin(messageId: string) {
    await this.messageRepo.update(messageId, { pinned: true });
  }

  async unpin(messageId: string) {
    await this.messageRepo.update(messageId, { pinned: false });
  }

  async star(messageId: string) {
    await this.messageRepo.update(messageId, { starred: true });
  }

  async search(query: string, userId: string) {
    return this.messageRepo
      .createQueryBuilder('m')
      .where('m.content ILIKE :q', { q: `%${query}%` })
      .andWhere('m.deleted = false')
      .orderBy('m.createdAt', 'DESC')
      .limit(50)
      .getMany();
  }
}
