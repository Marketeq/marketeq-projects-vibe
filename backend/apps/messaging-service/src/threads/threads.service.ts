import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Thread } from './entities/thread.entity';
import { ConversationKey } from '../encryption/entities/conversation-key.entity';

@Injectable()
export class ThreadsService {
  constructor(
    @InjectRepository(Thread) private readonly repo: Repository<Thread>,
    @InjectRepository(ConversationKey) private readonly convKeyRepo: Repository<ConversationKey>,
  ) {}

  async getUserThreads(userId: string) {
    const threads = await this.repo
      .createQueryBuilder('t')
      .where(':userId = ANY(t.participantIds)', { userId })
      .orderBy('t.updatedAt', 'DESC')
      .getMany();

    // Attach the latest message to each thread
    const enriched = await Promise.all(
      threads.map(async (t) => {
        const lastMessage = await this.repo.manager
          .createQueryBuilder('messaging.messages', 'm')
          .where('m."threadId" = :tid', { tid: t.id })
          .andWhere('m.deleted = false')
          .orderBy('m."createdAt"', 'DESC')
          .limit(1)
          .getRawOne();
        return { ...t, lastMessage: lastMessage || null };
      }),
    );
    return enriched;
  }

  async findOne(id: string) {
    const thread = await this.repo.findOne({ where: { id }, relations: ['messages'] });
    if (!thread) throw new NotFoundException('Thread not found');
    return thread;
  }

  async assertUserIsParticipant(threadId: string, userId: string) {
    const thread = await this.repo.findOne({ where: { id: threadId } });
    if (!thread) throw new NotFoundException('Thread not found');
    if (!thread.participantIds.includes(userId)) {
      throw new ForbiddenException('Not a participant of this thread');
    }
  }

  async create(participantIds: string[], isGroup = false, groupName?: string) {
    // For 1:1 threads, find existing thread between the same participants
    if (!isGroup && participantIds.length === 2) {
      const existing = await this.repo
        .createQueryBuilder('t')
        .where('t.isGroup = false')
        .andWhere(':a = ANY(t.participantIds)', { a: participantIds[0] })
        .andWhere(':b = ANY(t.participantIds)', { b: participantIds[1] })
        .getOne();
      if (existing) return existing;
    }

    const thread = this.repo.create({ participantIds, isGroup, groupName });
    return this.repo.save(thread);
  }

  async addParticipant(threadId: string, requesterId: string, newUserId: string, encryptedGroupKey: string) {
    const thread = await this.repo.findOne({ where: { id: threadId } });
    if (!thread) throw new NotFoundException('Thread not found');
    if (!thread.isGroup) throw new BadRequestException('Cannot add participants to a non-group thread');
    if (!thread.participantIds.includes(requesterId)) {
      throw new ForbiddenException('Not a participant of this thread');
    }
    if (thread.participantIds.includes(newUserId)) {
      throw new BadRequestException('User is already a participant');
    }

    // Add user to thread participants
    thread.participantIds = [...thread.participantIds, newUserId];
    await this.repo.save(thread);

    // Store the pre-wrapped conversation key for the new participant
    await this.convKeyRepo.save(
      this.convKeyRepo.create({ threadId, userId: newUserId, encryptedKey: encryptedGroupKey }),
    );

    return thread;
  }

  async getAblyToken(userId: string, ablyService: any) {
    return ablyService.createTokenRequest(userId);
  }
}
