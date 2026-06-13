import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BreakEvent } from '../entities/break-event.entity';
import { CreateBreakDto } from './dto/create-break.dto';
import { UpdateBreakDto } from './dto/update-break.dto';

@Injectable()
export class BreaksService {
  constructor(
    @InjectRepository(BreakEvent) private readonly repo: Repository<BreakEvent>,
  ) {}
 
  async create(sessionId: string, dto: CreateBreakDto): Promise<BreakEvent> {
    const existing = await this.repo.findOneBy({ id: dto.id });
    if (existing) return existing;
 
    return this.repo.save(this.repo.create({
      id: dto.id,
      sessionId,
      kind: dto.kind,
      startedAt: new Date(dto.startedAt),
      endedAt: null,
      idempotencyKey: dto.idempotencyKey ?? null,
    }));
  }
 
  async update(id: string, dto: UpdateBreakDto): Promise<BreakEvent> {
    const brk = await this.repo.findOneBy({ id });
    if (!brk) throw new NotFoundException('Break not found');
    if (dto.endedAt) brk.endedAt = new Date(dto.endedAt);
    return this.repo.save(brk);
  }
 
  async findBySession(sessionId: string): Promise<BreakEvent[]> {
    return this.repo.find({ where: { sessionId }, order: { startedAt: 'ASC' } });
  }
}