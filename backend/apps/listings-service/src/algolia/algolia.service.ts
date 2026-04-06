import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { JobListing } from '../job-listing/entities/job-listing.entity';

@Injectable()
export class AlgoliaService {
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('ALGOLIA_SERVICE_URL');
  }

  // Called by the moderation.approved consumer after status is set to published.
  async indexJobListing(listing: JobListing): Promise<void> {
    const record = this.buildIndexRecord(listing);
    await lastValueFrom(
      this.http.post(
        `${this.baseUrl}/v1/index/job-listings`,
        record,
      ),
    );
  }

  // Called when any text or structural field changes on a published listing.
  async updateJobListingIndex(listing: JobListing): Promise<void> {
    const record = this.buildIndexRecord(listing);
    await lastValueFrom(
      this.http.put(
        `${this.baseUrl}/v1/index/job-listings/${listing.id}`,
        record,
      ),
    );
  }

  // Called on closed, deleted, or reverted-to-draft.
  async removeJobListingIndex(listingId: string): Promise<void> {
    await lastValueFrom(
      this.http.delete(
        `${this.baseUrl}/v1/index/job-listings/${listingId}`,
      ),
    );
  }

  private buildIndexRecord(listing: JobListing): Record<string, unknown> {
    const skills = listing.roleDescriptions?.flatMap(rd => rd.skills) ?? [];
    const roles = [
      ...listing.teamMemberRows?.map(r => r.roleTitle) ?? [],
      ...listing.phases?.flatMap(p => p.tasks?.map(t => t.roleTitle) ?? []) ?? [],
    ];

    const record: Record<string, unknown> = {
      objectID:             listing.id,
      listingType:          listing.listingType,
      title:                listing.basicInformation?.[0]?.title,
      jobType:              listing.basicInformation?.[0]?.jobType,
      industries:           listing.basicInformation?.[0]?.industries ?? [],
      languages:            listing.basicInformation?.[0]?.languages ?? [],
      overview:             listing.roleDescriptions?.[0]?.overview,
      skills:               [...new Set(skills)],
      roles:                [...new Set(roles)],
      locations:            this.extractLocations(listing),
      experienceLevels:     this.extractExperienceLevels(listing),
      workSchedules:        this.extractWorkSchedules(listing),
      budgetAmountUsdCents: listing.budgetAmountUsdCents,
      durationMonths:       listing.durationMonths,
      isOngoing:            listing.isOngoing,
      ndaEnabled:           listing.ndaEnabled,
      clientUserId:         listing.clientUserId,
      publishedAt:          listing.publishedAt?.toISOString(),
      status:               'published',
    };

    // NDA-gated fields: omit scope details when NDA is required.
    if (!listing.ndaEnabled) {
      record.phaseNames = listing.phases?.map(p => p.phaseName) ?? [];
      record.taskNames  = listing.phases?.flatMap(
        p => p.tasks?.map(t => t.taskName) ?? [],
      ) ?? [];
    }

    return record;
  }

  private extractLocations(listing: JobListing): string[] {
    const locs = [
      ...listing.teamMemberRows?.map(r => r.location).filter(Boolean) ?? [],
      ...listing.phases?.flatMap(
        p => p.tasks?.map(t => t.location).filter(Boolean) ?? [],
      ) ?? [],
    ];
    return [...new Set(locs)];
  }

  private extractExperienceLevels(listing: JobListing): string[] {
    const levels = [
      ...listing.teamMemberRows?.map(r => r.experienceLevel).filter(Boolean) ?? [],
      ...listing.phases?.flatMap(
        p => p.tasks?.map(t => t.experienceLevel).filter(Boolean) ?? [],
      ) ?? [],
    ];
    return [...new Set(levels)];
  }

  private extractWorkSchedules(listing: JobListing): string[] {
    const schedules = [
      ...listing.teamMemberRows?.map(r => r.workSchedule) ?? [],
      ...listing.phases?.flatMap(
        p => p.tasks?.map(t => t.workSchedule) ?? [],
      ) ?? [],
    ];
    return [...new Set(schedules)];
  }
}
