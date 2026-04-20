import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ThreadUserState } from './entities/thread-user-state.entity';

const TRASH_RETENTION_DAYS = 30;

@Injectable()
export class TrashCleanupService {
  private readonly logger = new Logger(TrashCleanupService.name);

  constructor(
    @InjectRepository(ThreadUserState)
    private readonly stateRepo: Repository<ThreadUserState>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpiredTrash() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - TRASH_RETENTION_DAYS);

    const result = await this.stateRepo.delete({
      isTrashed: true,
      updatedAt: LessThan(cutoff),
    });

    if (result.affected && result.affected > 0) {
      this.logger.log(
        `Purged ${result.affected} trashed thread state(s) older than ${TRASH_RETENTION_DAYS} days`,
      );
    }
  }
}
