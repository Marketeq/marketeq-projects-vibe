import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Thread } from './entities/thread.entity';

@Injectable()
export class ThreadsService {
  constructor(
    @InjectRepository(Thread) private readonly repo: Repository<Thread>,
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

  async getAblyToken(userId: string, ablyService: any) {
    return ablyService.createTokenRequest(userId);
  }
}
