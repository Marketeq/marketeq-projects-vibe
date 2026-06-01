import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdleEvent } from '../entities/idle-event.entity';
import { CreateIdleDto } from './dto/create-idle.dto';

@Injectable()
export class IdlesService {
  constructor(
    @InjectRepository(IdleEvent) private readonly repo: Repository<IdleEvent>,
  ) {}
 
  async create(sessionId: string, dto: CreateIdleDto): Promise<IdleEvent> {
    const existing = await this.repo.findOneBy({ id: dto.id });
    if (existing) return existing;
 
    return this.repo.save(this.repo.create({
      id: dto.id,
      sessionId,
      startedAt: new Date(dto.startedAt),
      endedAt: new Date(dto.endedAt),
      seconds: dto.seconds,
      resolution: dto.resolution ?? null,
      idempotencyKey: dto.idempotencyKey ?? null,
    }));
  }
 
  async findBySession(sessionId: string): Promise<IdleEvent[]> {
    return this.repo.find({ where: { sessionId }, order: { startedAt: 'ASC' } });
  }
}