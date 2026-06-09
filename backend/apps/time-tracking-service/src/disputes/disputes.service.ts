import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dispute } from '../entities/dispute.entity';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { UpdateDisputeDto } from './dto/update-dispute.dto';

@Injectable()
export class DisputesService {
  constructor(
    @InjectRepository(Dispute) private readonly repo: Repository<Dispute>,
  ) {}
 
  async create(sessionId: string, userId: string, dto: CreateDisputeDto): Promise<Dispute> {
    const existing = await this.repo.findOneBy({ id: dto.id });
    if (existing) return existing;
 
    return this.repo.save(this.repo.create({
      id: dto.id,
      sessionId,
      openedBy: userId,
      reason: dto.reason,
      note: dto.note ?? null,
      status: 'open',
    }));
  }
 
  async update(id: string, userId: string, dto: UpdateDisputeDto): Promise<Dispute> {
    const dispute = await this.repo.findOneBy({ id });
    if (!dispute) throw new NotFoundException('Dispute not found');
 
    dispute.status = dto.status;
    dispute.resolvedBy = userId;
    dispute.resolvedAt = new Date();
    dispute.resolutionNote = dto.resolutionNote ?? null;
    return this.repo.save(dispute);
  }
 
  async findBySession(sessionId: string): Promise<Dispute[]> {
    return this.repo.find({ where: { sessionId }, order: { createdAt: 'DESC' } });
  }
}