import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, MoreThan, Not, Repository } from 'typeorm';
import { ManualTime } from '../entities/manual-time.entity';
import { CreateManualTimeDto, ReviewManualTimeDto } from '../dtos/create-manual-time.dto';

const MAX_DURATION_HOURS = 12;
const MAX_PAST_DAYS = 90;

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

    // US-79: a single manual entry can't exceed 12 hours, and can't start
    // more than 90 days in the past.
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (durationHours > MAX_DURATION_HOURS) {
      throw new BadRequestException(`A single entry cannot exceed ${MAX_DURATION_HOURS} hours`);
    }
    const earliestAllowed = new Date(Date.now() - MAX_PAST_DAYS * 24 * 60 * 60 * 1000);
    if (start < earliestAllowed) {
      throw new BadRequestException(`Entries cannot start more than ${MAX_PAST_DAYS} days in the past`);
    }

    // US-78: reject entries that overlap an existing (non-rejected) manual
    // entry for the same contractor and contract.
    const overlapping = await this.repo.findOne({
      where: {
        userId,
        contractId: dto.contractId ?? IsNull(),
        status: Not('rejected'),
        startTime: LessThan(end),
        endTime: MoreThan(start),
      },
    });
    if (overlapping) {
      throw new BadRequestException('This time range overlaps an existing manual time entry');
    }

    const entry = this.repo.create({
      userId,
      contractId: dto.contractId ?? null,
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
    await this.repo.softRemove(entry);
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
