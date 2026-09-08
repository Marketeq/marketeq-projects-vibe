import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JobListing } from '../entities/job-listing.entity';
import { JobListingStatus } from '../enums/job-listing-status.enum';
import { UpdateJobListingDto } from '../dto/update-job-listing.dto';
import { JobListingEventsPublisher } from '../events/job-listing-events.publisher';

@Injectable()
export class JobListingDraftService {
  private readonly logger = new Logger(JobListingDraftService.name);

  constructor(
    @InjectRepository(JobListing)
    private readonly repo: Repository<JobListing>,
    private readonly publisher: JobListingEventsPublisher,
    private readonly config: ConfigService,
  ) {}

  async autoSave(
    listingId: string,
    dto: UpdateJobListingDto,
    completedStep?: number,
  ): Promise<void> {
    const update: Partial<JobListing> = {
      ...this.toEntityFields(dto),
      lastActivityAt: new Date(),
      staleWarningSent: false, // Reset so warning can fire again if stale again.
    };

    if (completedStep !== undefined) {
      // Only advance lastCompletedStep — never decrease it.
      const current = await this.repo.findOne({
        where: { id: listingId },
        select: ['lastCompletedStep'],
      });
      if (!current || completedStep > (current.lastCompletedStep ?? 0)) {
        update.lastCompletedStep = completedStep;
      }
    }

    await this.repo.update(listingId, update as any);
  }

  // Background job — runs daily at midnight.
  // Finds draft and needs_update listings that have not been edited for more
  // than DRAFT_STALE_WARNING_DAYS days and emits a warning event for each.
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkStaleWarnings(): Promise<void> {
    const staleWarningDays = this.config.get<number>('DRAFT_STALE_WARNING_DAYS', 90);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - staleWarningDays);

    const staleDrafts = await this.repo.find({
      where: {
        status: In([JobListingStatus.DRAFT, JobListingStatus.NEEDS_UPDATE]),
        lastActivityAt: LessThan(cutoff),
        staleWarningSent: false,
      },
      select: ['id', 'clientUserId', 'lastActivityAt'],
    });

    for (const draft of staleDrafts) {
      this.publisher.emit('job_listing.stale_draft_warning', {
        listingId:      draft.id,
        clientUserId:   draft.clientUserId,
        lastActivityAt: draft.lastActivityAt?.toISOString(),
      });

      // The domain event above is for other services; this is the one the
      // owner sees. Worth notifying because nothing they did triggered it —
      // the cron did, and the draft is heading for archival.
      this.publisher.notify({
        recipientId: draft.clientUserId,
        event: 'job_listing.stale_draft_warning',
        title: 'A job listing draft needs your attention',
        body: `You haven't updated this draft in ${staleWarningDays} days. Open it to finish and publish.`,
        link: '/job-listing',
        metadata: {
          listingId: draft.id,
          lastActivityAt: draft.lastActivityAt?.toISOString(),
        },
      });

      await this.repo.update(draft.id, { staleWarningSent: true });
      this.logger.log(`Stale draft warning sent for listing ${draft.id}`);
    }
  }

  // Background job — runs every 5 minutes.
  // Counts listings in pending_review and emits the gauge to the log.
  // Log aggregator parses "jl_moderation_queue_depth:" to track queue health (JL-11 §4.3).
  @Cron('*/5 * * * *')
  async emitModerationQueueDepth(): Promise<void> {
    const count = await this.repo.count({ where: { status: JobListingStatus.PENDING_REVIEW } });
    this.logger.log(`jl_moderation_queue_depth: ${count}`);
  }

  // Maps only the fields from UpdateJobListingDto that go directly to entity
  // columns. Budget amount conversion (display currency → USD cents) is handled
  // separately by JobListingBudgetService before autoSave is called.
  private toEntityFields(dto: UpdateJobListingDto): Partial<JobListing> {
    const fields: Partial<JobListing> = {};

    if (dto.scopeKnowledge     !== undefined) fields.scopeKnowledge     = dto.scopeKnowledge;
    if (dto.workType           !== undefined) fields.workType           = dto.workType;
    if (dto.hiringType         !== undefined) fields.hiringType         = dto.hiringType;
    if (dto.description        !== undefined) fields.description        = dto.description;
    if (dto.deliverables       !== undefined) fields.deliverables       = dto.deliverables;
    if (dto.successCriteria    !== undefined) fields.successCriteria    = dto.successCriteria;
    if (dto.headcount          !== undefined) fields.headcount          = dto.headcount;
    if (dto.budgetFrequency    !== undefined) fields.budgetFrequency    = dto.budgetFrequency;
    if (dto.durationMonths     !== undefined) fields.durationMonths     = dto.durationMonths;
    if (dto.isOngoing          !== undefined) fields.isOngoing          = dto.isOngoing;
    if (dto.ndaEnabled         !== undefined) fields.ndaEnabled         = dto.ndaEnabled;
    if (dto.ndaScopeVisibility !== undefined) fields.ndaScopeVisibility = dto.ndaScopeVisibility;

    return fields;
  }
}
