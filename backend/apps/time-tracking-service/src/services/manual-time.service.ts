import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ManualTime } from '../entities/manual-time.entity';
import { CreateManualTimeDto, ReviewManualTimeDto } from '../dtos/create-manual-time.dto';

@Injectable()
export class ManualTimeService {
  constructor(
    @InjectRepository(ManualTime)
    private readonly repo: Repository<ManualTime>,
  ) {}

  async create(userId: string, dto: CreateManualTimeDto): Promise<ManualTime> {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    if (end <= start) {
      throw new BadRequestException('End time must be after start time');
    }

    const entry = this.repo.create({
      userId,
      projectId: dto.projectId ?? null,
      taskId: dto.taskId ?? null,
      startTime: start,
      endTime: end,
      notes: dto.notes ?? null,
      status: 'pending',
    });
    return this.repo.save(entry);
  }

  async findByUser(userId: string): Promise<ManualTime[]> {
    return this.repo.find({
      where: { userId },
      order: { startTime: 'DESC' },
    });
  }

  async delete(id: string, userId: string, role: string): Promise<void> {
    const entry = await this.repo.findOneBy({ id });
    if (!entry) throw new NotFoundException('Manual time entry not found');
    if (role !== 'admin' && entry.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    await this.repo.remove(entry);
  }

  async getPending(): Promise<ManualTime[]> {
    return this.repo.find({
      where: { status: 'pending' },
      order: { createdAt: 'ASC' },
    });
  }

  async review(id: string, adminId: string, dto: ReviewManualTimeDto): Promise<ManualTime> {
    const entry = await this.repo.findOneBy({ id });
    if (!entry) throw new NotFoundException('Manual time entry not found');
    if (entry.status !== 'pending') {
      throw new BadRequestException(`Entry has already been ${entry.status}`);
    }

    entry.status = dto.status;
    entry.reviewedBy = adminId;
    entry.reviewComment = dto.comment ?? null;
    return this.repo.save(entry);
  }
}
