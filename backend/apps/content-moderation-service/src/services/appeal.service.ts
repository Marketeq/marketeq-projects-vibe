import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appeal, AppealStatus } from '../entities/appeal.entity';
import { NotificationService } from '../notification.service';

@Injectable()
export class AppealService {
  constructor(
    @InjectRepository(Appeal)
    private readonly appealRepo: Repository<Appeal>,
    private readonly notificationService: NotificationService,
  ) {}

  async submitAppeal(contentId: string, userId: string, reason: string): Promise<Appeal> {
    const existing = await this.appealRepo.findOne({
      where: { contentId, userId, status: AppealStatus.PENDING },
    });
    if (existing) {
      throw new BadRequestException({
        code: 'DUPLICATE_APPEAL',
        message: 'You already have a pending appeal for this content.',
      });
    }

    const appeal = this.appealRepo.create({ contentId, userId, reason });
    const saved = await this.appealRepo.save(appeal);

    await this.notificationService.sendNotification(
      'admin',
      `New appeal submitted for content ${contentId} by user ${userId}`,
    );

    return saved;
  }

  async reviewAppeal(
    appealId: string,
    decision: 'approve' | 'reject' | 'request_edits',
    moderatorId: string,
    comments?: string,
  ): Promise<Appeal> {
    const appeal = await this.appealRepo.findOne({ where: { id: appealId } });
    if (!appeal) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Appeal not found.' });
    }
    if (appeal.status !== AppealStatus.PENDING) {
      throw new BadRequestException({
        code: 'ALREADY_REVIEWED',
        message: 'This appeal has already been reviewed.',
      });
    }

    const statusMap: Record<string, AppealStatus> = {
      approve: AppealStatus.APPROVED,
      reject: AppealStatus.REJECTED,
      request_edits: AppealStatus.REQUEST_EDITS,
    };

    appeal.status = statusMap[decision];
    appeal.reviewedBy = moderatorId;
    appeal.moderatorComments = comments ?? null;
    appeal.reviewedAt = new Date();

    const saved = await this.appealRepo.save(appeal);

    const messageMap: Record<string, string> = {
      approve: 'Your appeal was successful. Your content has been approved.',
      reject: 'Your appeal was unsuccessful. Your content remains rejected.',
      request_edits: 'Your content requires edits before it can be approved. Please review the feedback.',
    };
    await this.notificationService.sendNotification(appeal.userId, messageMap[decision]);

    return saved;
  }

  async getAppeals(
    status?: AppealStatus,
    page: number = 1,
    perPage: number = 20,
  ): Promise<{ appeals: Appeal[]; total: number; page: number; perPage: number }> {
    const qb = this.appealRepo.createQueryBuilder('appeal').orderBy('appeal.createdAt', 'DESC');
    if (status) {
      qb.andWhere('appeal.status = :status', { status });
    }
    qb.skip((page - 1) * perPage).take(perPage);
    const [appeals, total] = await qb.getManyAndCount();
    return { appeals, total, page, perPage };
  }

  async getAppealsByUser(userId: string): Promise<Appeal[]> {
    return this.appealRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }
}
