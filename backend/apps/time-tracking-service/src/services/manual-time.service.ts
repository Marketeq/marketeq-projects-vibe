import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThan, MoreThan, Not, Repository } from 'typeorm';
import { ManualTime } from '../entities/manual-time.entity';
import { CreateManualTimeDto, ReviewManualTimeDto } from '../dtos/create-manual-time.dto';
import { Actor, ContractAccessService } from '../contracts/contract-access.service';

const MAX_DURATION_HOURS = 12;
const MAX_PAST_DAYS = 90;

@Injectable()
export class ManualTimeService {
  constructor(
    @InjectRepository(ManualTime)
    private readonly repo: Repository<ManualTime>,
    private readonly access: ContractAccessService,
  ) {}

  async create(userId: string, dto: CreateManualTimeDto): Promise<ManualTime> {
    if (dto.contractId && !(await this.access.isTalentOf(userId, dto.contractId))) {
      throw new BadRequestException('You can only log time on your own contracts.');
    }
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
    // AC-79.02: future-dated entries are rejected server-side too — the
    // frontend already blocks this client-side, but that's bypassable via a
    // direct API call, and this is the only real enforcement point.
    if (start > new Date()) {
      throw new BadRequestException('Entries cannot be logged for a future date or time');
    }

    // US-78: overlap is a soft, dismissible warning, not a hard block — the
    // first submit (confirmOverlap unset/false) throws ERR_MANUAL_TIME_OVERLAP
    // so the frontend can show "You have an overlapping entry. Continue?"; a
    // resubmit with confirmOverlap: true skips this check and proceeds.
    if (!dto.confirmOverlap) {
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
        throw new BadRequestException({
          message: 'You have an overlapping entry. Continue?',
          errorCode: 'ERR_MANUAL_TIME_OVERLAP',
        });
      }
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

  /** Entries logged on contracts where this user is the client. */
  async findForClient(userId: string): Promise<ManualTime[]> {
    const owned = await this.access.clientContractIds(userId);
    if (!owned.length) return [];
    return this.repo.find({
      where: { contractId: In(owned) },
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

  /** Pending entries: platform admins see all, clients see their contracts'. */
  async getPending(actor: Actor): Promise<ManualTime[]> {
    if (this.access.isAdmin(actor)) {
      return this.repo.find({ where: { status: 'pending' }, order: { createdAt: 'ASC' } });
    }
    const owned = await this.access.clientContractIds(actor.userId);
    if (!owned.length) return [];
    return this.repo.find({
      where: { status: 'pending', contractId: In(owned) },
      order: { createdAt: 'ASC' },
    });
  }

  /** The contract's client (or a platform admin) approves or rejects. */
  async review(id: string, actor: Actor, dto: ReviewManualTimeDto): Promise<ManualTime> {
    const entry = await this.repo.findOneBy({ id });
    if (!entry) throw new NotFoundException('Manual time entry not found');
    await this.access.assertClientOf(actor, entry.contractId);
    if (entry.status !== 'pending') {
      throw new BadRequestException(`Entry has already been ${entry.status}`);
    }

    entry.status = dto.status;
    entry.reviewedBy = actor.userId;
    entry.reviewComment = dto.comment ?? null;
    return this.repo.save(entry);
  }
}
