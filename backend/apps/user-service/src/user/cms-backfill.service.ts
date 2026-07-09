import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, IsNull, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserEventPublisher } from './user-event.publisher';

const PAGE_SIZE = 50;
const BOOT_DELAY_MS = 5_000;
const PAGE_DELAY_MS = 300;

@Injectable()
export class CmsBackfillService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CmsBackfillService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly publisher: UserEventPublisher,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.config.get<string>('CMS_BACKFILL_ON_BOOT') === 'false') return;
    if (!this.config.get<string>('RABBITMQ_URL')) {
      this.logger.warn('[CmsBackfill:users] Skipping — RABBITMQ_URL not configured, events cannot be delivered');
      return;
    }
    await new Promise((r) => setTimeout(r, BOOT_DELAY_MS));
    await this.run();
  }

  async run(): Promise<void> {
    const total = await this.userRepo.count({ where: { username: Not(IsNull()) } });
    this.logger.log(`[CmsBackfill:users] Starting — ${total} users to sync`);

    let offset = 0;
    let published = 0;
    let failed = 0;

    while (offset < total) {
      const users = await this.userRepo.find({
        where: { username: Not(IsNull()) },
        relations: [
          'skills',
          'languages',
          'certifications',
          'educations',
          'experiences',
          'portfolioItems',
          'industries',
        ],
        order: { createdAt: 'ASC' },
        skip: offset,
        take: PAGE_SIZE,
      });

      for (const user of users) {
        try {
          await this.publisher.publishProfileUpdated(user);
          published++;
        } catch (err: any) {
          failed++;
          this.logger.error(`[CmsBackfill:users] Failed for ${user.username}: ${err.message}`);
        }
      }

      offset += PAGE_SIZE;
      if (offset < total) await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
    }

    this.logger.log(`[CmsBackfill:users] Done — published: ${published}, failed: ${failed}`);
  }
}
