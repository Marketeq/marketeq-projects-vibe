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
    return this.repo
      .createQueryBuilder('t')
      .where(':userId = ANY(t.participantIds)', { userId })
      .orderBy('t.updatedAt', 'DESC')
      .getMany();
  }

  async findOne(id: string) {
    const thread = await this.repo.findOne({ where: { id }, relations: ['messages'] });
    if (!thread) throw new NotFoundException('Thread not found');
    return thread;
  }

  async create(participantIds: string[], isGroup = false, groupName?: string) {
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
