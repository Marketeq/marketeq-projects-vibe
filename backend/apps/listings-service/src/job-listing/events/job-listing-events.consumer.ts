import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { JobListingService } from '../services/job-listing.service';
import { JobListingStatus } from '../enums/job-listing-status.enum';
import { AlgoliaService } from '../../algolia/algolia.service';

@Controller()
export class JobListingEventsConsumer {
  constructor(
    private readonly jobListingService: JobListingService,
    private readonly algoliaService: AlgoliaService,
  ) {}

  @EventPattern('moderation.approved')
  async handleModerationApproved(@Payload() payload: {
    listingId: string;
    objectType: string;
  }): Promise<void> {
    if (payload.objectType !== 'job_listing') return;

    await this.jobListingService.setStatus(
      payload.listingId,
      JobListingStatus.PUBLISHED,
    );

    const listing = await this.jobListingService.findOneInternal(payload.listingId);
    await this.algoliaService.indexJobListing(listing);
  }

  @EventPattern('moderation.rejected')
  async handleModerationRejected(@Payload() payload: {
    listingId: string;
    objectType: string;
    reason: string;
  }): Promise<void> {
    if (payload.objectType !== 'job_listing') return;

    await this.jobListingService.setStatus(
      payload.listingId,
      JobListingStatus.NEEDS_UPDATE,
      { moderationRejectionReason: payload.reason },
    );
  }

  @EventPattern('contract.activated')
  async handleContractActivated(@Payload() payload: {
    contractId: string;
    listingId: string;
  }): Promise<void> {
    if (!payload.listingId) return;

    await this.jobListingService.linkContract(
      payload.listingId,
      payload.contractId,
    );
  }
}
