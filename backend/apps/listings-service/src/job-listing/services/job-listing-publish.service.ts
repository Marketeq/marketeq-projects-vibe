import {
  Injectable,
  Logger,
  NotFoundException,
  HttpException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { JobListing } from '../entities/job-listing.entity';
import { JobListingType } from '../enums/job-listing-type.enum';
import { JobListingStatus } from '../enums/job-listing-status.enum';
import { ContractType } from '../enums/contract-type.enum';
import { ScopeKnowledge } from '../enums/scope-knowledge.enum';
import { wordCount } from './job-listing.service';
import { JobListingEventsPublisher } from '../events/job-listing-events.publisher';

// ── Return type for the publish endpoint ─────────────────────────────────────
export interface PublishResult {
  listingId:   string;
  status:      'pending_review';
  publishedAt: string;
  inviteBalance: number;
  openRoles:   number;
}

// ── Payload sent to content-moderation-service via RabbitMQ ──────────────────
interface ModerationPayload {
  objectType: string;
  objectId:   string;
  fields:     Record<string, unknown>;
}

@Injectable()
export class JobListingPublishService {
  private readonly logger = new Logger(JobListingPublishService.name);

  constructor(
    @InjectRepository(JobListing)
    private readonly repo: Repository<JobListing>,
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly publisher: JobListingEventsPublisher,
  ) {}

  // ── NDA ──────────────────────────────────────────────────────────────────────

  async handleNdaToggle(listingId: string, ndaEnabled: boolean): Promise<void> {
    if (!ndaEnabled) {
      // NDA disabled — clear the document ID.
      await this.repo.update(listingId, { ndaEnabled: false, ndaDocumentId: null });
      return;
    }

    // NDA enabled — fetch listing and client info, then generate NDA document.
    const listing = await this.repo.findOne({
      where: { id: listingId },
      relations: ['basicInformation'],
    });

    if (!listing) {
      throw new NotFoundException({ code: 'JL_NOT_FOUND', message: 'Listing not found.' });
    }

    const clientResponse = await firstValueFrom(
      this.http.get(
        `${this.config.get('USER_SERVICE_URL')}/v1/users/${listing.clientUserId}`,
      ),
    );

    const client = clientResponse.data;

    const ndaResponse = await firstValueFrom(
      this.http.post(
        `${this.config.get('LEGAL_SERVICE_URL')}/v1/nda/generate`,
        {
          listingId,
          clientUserId:  listing.clientUserId,
          clientName:    client.legalName,
          companyName:   client.companyName  ?? null,
          jobTitle:      client.jobTitle     ?? null,
          listingTitle:  listing.basicInformation?.[0]?.title ?? null,
        },
      ),
    );

    await this.repo.update(listingId, {
      ndaEnabled:    true,
      ndaDocumentId: ndaResponse.data.documentId,
    });
  }

  // ── Pre-publish validation ────────────────────────────────────────────────────

  async validateBeforePublish(listingId: string): Promise<void> {
    const listing = await this.repo.findOne({
      where: { id: listingId },
      relations: [
        'basicInformation',
        'roleDescriptions',
        'phases',
        'phases.tasks',
        'teamMemberRows',
      ],
    });

    if (!listing) {
      throw new NotFoundException({ code: 'JL_NOT_FOUND', message: 'Listing not found.' });
    }

    const errors: Record<string, string> = {};

    // ── Basic information ───────────────────────────────────────────────────
    const info = listing.basicInformation?.[0];

    if (!info?.title?.trim()) {
      errors['title'] = 'Project or service title is required.';
    }

    const needsJobType = [JobListingType.PROJECT, JobListingType.SERVICE].includes(listing.listingType!);
    if (needsJobType && !info?.jobType?.trim()) {
      errors['jobType'] = 'Job type is required for project and service listings.';
    }

    // ── Description ────────────────────────────────────────────────────────
    if (!listing.description?.trim()) {
      errors['description'] = 'Description is required.';
    }

    // ── Rich text word counts (overview, benefits, responsibilities) ────────
    for (const roleDescription of listing.roleDescriptions ?? []) {
      const roleLabel = roleDescription.roleTitle || 'role';
      const richTextFields = [
        { field: 'overview',         value: roleDescription.overview },
        { field: 'benefits',         value: roleDescription.benefits },
        { field: 'responsibilities', value: roleDescription.responsibilities },
      ];

      for (const { field, value } of richTextFields) {
        if (value && wordCount(value) > 100) {
          errors[`roleDescriptions.${roleLabel}.${field}`] =
            `${field} for ${roleLabel} must not exceed 100 words.`;
        }
      }
    }

    // ── Scope (project / service listings with a scope) ─────────────────────
    const needsScope =
      [JobListingType.PROJECT, JobListingType.SERVICE].includes(listing.listingType!) &&
      listing.scopeKnowledge !== ScopeKnowledge.NO_SCOPE_SELECTED;

    if (needsScope && (!listing.phases || listing.phases.length === 0)) {
      errors['scope'] = 'At least one phase with one task is required.';
    }

    // ── Team member rows (team / individual / existing contract) ────────────
    const needsTeam =
      [JobListingType.TEAM, JobListingType.INDIVIDUAL].includes(listing.listingType!) ||
      listing.contractType === ContractType.EXISTING;

    if (needsTeam && (!listing.teamMemberRows || listing.teamMemberRows.length === 0)) {
      errors['teamMembers'] = 'At least one team member role is required.';
    }

    // ── NDA document must exist if NDA is enabled ───────────────────────────
    if (listing.ndaEnabled && !listing.ndaDocumentId) {
      errors['nda'] = 'NDA document must be generated before publishing.';
    }

    if (Object.keys(errors).length > 0) {
      throw new HttpException(
        { code: 'JL_PUBLISH_VALIDATION_FAILED', message: 'Listing is incomplete.', details: errors },
        400,
      );
    }
  }

  // ── Publish ───────────────────────────────────────────────────────────────────

  async publish(userId: string, listingId: string): Promise<PublishResult> {
    // Step 1 — Validate completeness.
    await this.validateBeforePublish(listingId);

    const listing = await this.repo.findOneOrFail({ where: { id: listingId } });

    // Step 2 — Set status to pending_review.
    // publishedAt is only set on first publish (draft → pending_review).
    // Re-publishes after needs_update do NOT overwrite the original publishedAt.
    const isFirstPublish =
      listing.status === JobListingStatus.DRAFT ||
      listing.status === JobListingStatus.NEEDS_UPDATE;

    await this.repo.update(listingId, {
      status:                      JobListingStatus.PENDING_REVIEW,
      publishedAt:                 isFirstPublish ? new Date() : listing.publishedAt,
      lastModerationSubmittedAt:   new Date(),
      lastModeratedFields:         this.getAllModeratedFields(),
      lastActivityAt:              new Date(),
    });

    // Step 3 — Calculate invite balance.
    // 10 free invites (INVITE_DEFAULT_PER_ROLE) per open role.
    // An open role is one without an assigned user.
    const openRoles     = await this.countOpenRoles(listing);
    const inviteBalance = openRoles * this.config.get<number>('INVITE_DEFAULT_PER_ROLE', 10);
    await this.repo.update(listingId, { inviteBalance });

    // Step 4 — Build moderation payload and emit to RabbitMQ.
    // content-moderation-service consumes job_listing.published and runs checks.
    const moderationFields = await this.buildModerationPayload(listingId);
    this.publisher.emit('job_listing.published', {
      listingId,
      clientUserId: userId,
      listingType:  listing.listingType,
      ndaEnabled:   listing.ndaEnabled,
      fields:       moderationFields.fields as Record<string, unknown>,
    });

    // Step 5 — Return result so the frontend can redirect and show the modal.
    this.logger.log(`Job listing published: ${listingId}`);
    const publishedAt = isFirstPublish ? new Date() : (listing.publishedAt ?? new Date());
    return {
      listingId,
      status:        'pending_review',
      publishedAt:   publishedAt.toISOString(),
      inviteBalance,
      openRoles,
    };
  }

  // ── Moderation payload ────────────────────────────────────────────────────────

  async buildModerationPayload(listingId: string): Promise<ModerationPayload> {
    const listing = await this.repo.findOne({
      where: { id: listingId },
      relations: ['basicInformation', 'roleDescriptions', 'phases', 'phases.tasks'],
    });

    if (!listing) {
      throw new NotFoundException({ code: 'JL_NOT_FOUND', message: 'Listing not found.' });
    }

    return {
      objectType: 'job_listing',
      objectId:   listingId,
      fields: {
        title:           listing.basicInformation?.[0]?.title,
        jobType:         listing.basicInformation?.[0]?.jobType,
        industries:      listing.basicInformation?.[0]?.industries,
        languages:       listing.basicInformation?.[0]?.languages,
        description:     listing.description,
        deliverables:    listing.deliverables,
        successCriteria: listing.successCriteria,
        overview:        listing.roleDescriptions?.[0]?.overview,
        benefits:        listing.roleDescriptions?.[0]?.benefits,
        // Responsibilities keyed by role title — one entry per role tab.
        responsibilities: listing.roleDescriptions?.reduce<Record<string, string | null>>(
          (acc, rd) => ({ ...acc, [rd.roleTitle]: rd.responsibilities }),
          {},
        ),
        // Skills keyed by role title — one entry per role tab.
        skills: listing.roleDescriptions?.reduce<Record<string, string[]>>(
          (acc, rd) => ({ ...acc, [rd.roleTitle]: rd.skills }),
          {},
        ),
        phaseNames: listing.phases?.map((p) => p.phaseName) ?? [],
        taskNames:  listing.phases?.flatMap((p) => p.tasks?.map((t) => t.taskName) ?? []) ?? [],
      },
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  // Counts roles that have no assigned user — each earns INVITE_DEFAULT_PER_ROLE invites.
  // Team/Individual/Existing: counts unassigned TeamMemberRows.
  // Project/Service: counts distinct roleTitles across all tasks (all are open).
  private async countOpenRoles(listing: JobListing): Promise<number> {
    const full = await this.repo.findOne({
      where: { id: listing.id },
      relations: ['teamMemberRows', 'phases', 'phases.tasks'],
    });

    if (!full) return 0;

    const isTeamBased =
      [JobListingType.TEAM, JobListingType.INDIVIDUAL].includes(full.listingType!) ||
      full.contractType === ContractType.EXISTING;

    if (isTeamBased) {
      return full.teamMemberRows?.filter((r) => !r.assignedUserId).length ?? 0;
    }

    // Project/service: unique roleTitles across all tasks are all open.
    const roleTitles = new Set<string>();
    full.phases?.forEach((phase) =>
      phase.tasks?.forEach((task) => roleTitles.add(task.roleTitle)),
    );
    return roleTitles.size;
  }

  // Returns the full list of field names submitted to moderation on every publish.
  private getAllModeratedFields(): string[] {
    return [
      'title', 'jobType', 'industries', 'languages',
      'description', 'deliverables', 'successCriteria',
      'overview', 'benefits', 'responsibilities', 'skills',
      'phaseNames', 'taskNames',
    ];
  }

  async revertToDraft(_userId: string, listingId: string): Promise<void> {
    const listing = await this.repo.findOne({ where: { id: listingId } });

    if (!listing) {
      throw new NotFoundException({ code: 'JL_NOT_FOUND', message: 'Listing not found.' });
    }

    if (
      listing.status !== JobListingStatus.PUBLISHED &&
      listing.status !== JobListingStatus.NEEDS_UPDATE
    ) {
      throw new ConflictException({
        code: 'JL_REVERT_NOT_ALLOWED',
        message: 'Only published or needs_update listings can be reverted to draft.',
      });
    }

    await this.repo.update(listingId, {
      status: JobListingStatus.DRAFT,
      lastActivityAt: new Date(),
    });

    this.publisher.emit('job_listing.reverted_to_draft', {
      listingId,
      clientUserId: listing.clientUserId,
      algoliaObjectId: listing.algoliaObjectId,
    });

    this.logger.log(`Job listing reverted to draft: ${listingId}`);
  }
}
