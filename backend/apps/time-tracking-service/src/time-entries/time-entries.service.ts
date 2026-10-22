import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';
import { TimeEntry } from '../entities/time-entry.entity';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
 
@Injectable()
export class TimeEntriesService {
  constructor(
    @InjectRepository(TimeEntry) private readonly repo: Repository<TimeEntry>,
  ) {}
 
  async create(sessionId: string, dto: CreateTimeEntryDto): Promise<TimeEntry> {
    // Idempotent: return existing if same ID
    const existing = await this.repo.findOneBy({ id: dto.id });
    if (existing) return existing;
 
    const entry = this.repo.create({
      id: dto.id,
      sessionId,
      startedAt: new Date(dto.startedAt),
      endedAt: dto.endedAt ? new Date(dto.endedAt) : null,
      durationSeconds: dto.durationSeconds ?? 0,
      idempotencyKey: dto.idempotencyKey ?? null,
      source: dto.source ?? 'live',
    });
    return this.repo.save(entry);
  }
 
  async update(id: string, dto: UpdateTimeEntryDto): Promise<TimeEntry> {
    const entry = await this.repo.findOneBy({ id });
    if (!entry) throw new NotFoundException('Time entry not found');
 
    if (dto.endedAt) {
      entry.endedAt = new Date(dto.endedAt);
      if (!dto.durationSeconds) {
        entry.durationSeconds = Math.max(0,
          Math.round((entry.endedAt.getTime() - entry.startedAt.getTime()) / 1000));
      }
    }
    if (dto.durationSeconds !== undefined) entry.durationSeconds = dto.durationSeconds;
    return this.repo.save(entry);
  }
 
  async findBySession(sessionId: string): Promise<TimeEntry[]> {
    return this.repo.find({ where: { sessionId }, order: { startedAt: 'ASC' } });
  }
}