import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './session.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { CloseSessionDto } from './dto/close-session.dto';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly repo: Repository<Session>,
  ) {}

  async create(userId: string, dto: CreateSessionDto): Promise<Session> {
    const existing = await this.repo.findOneBy({ id: dto.id });
    if (existing) return existing; // idempotent

    const session = this.repo.create({
      id: dto.id,
      userId,
      contractId: dto.contractId,
      taskId: dto.taskId,
      deviceId: dto.deviceId,
      startedAt: new Date(dto.startedAt),
      endedAt: null,
      endReason: null,
      billableSeconds: 0,
    });
    return this.repo.save(session);
  }

  async close(id: string, userId: string, dto: CloseSessionDto): Promise<Session> {
    const session = await this.repo.findOneBy({ id });
    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId) throw new BadRequestException('Not your session');

    session.endedAt = new Date(dto.endedAt);
    session.endReason = dto.reason;
    if (dto.billableSeconds !== undefined) {
      session.billableSeconds = dto.billableSeconds;
    } else {
      const diffMs = new Date(dto.endedAt).getTime() - session.startedAt.getTime();
      session.billableSeconds = Math.max(0, Math.round(diffMs / 1000));
    }
    return this.repo.save(session);
  }

  async findByContract(userId: string, contractId: string): Promise<Session[]> {
    return this.repo.find({
      where: { userId, contractId },
      order: { startedAt: 'DESC' },
    });
  }
}
