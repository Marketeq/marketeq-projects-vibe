import { Injectable, NotFoundException, HttpException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobListing } from '../entities/job-listing.entity';
import { SendInvitesDto } from '../dto/send-invites.dto';
import { JobListingEventsPublisher } from '../events/job-listing-events.publisher';

@Injectable()
export class JobListingInviteService {
  constructor(
    @InjectRepository(JobListing)
    private readonly repo: Repository<JobListing>,
    private readonly publisher: JobListingEventsPublisher,
  ) {}

  async send(listingId: string, dto: SendInvitesDto): Promise<void> {
    const listing = await this.repo.findOne({
      where: { id: listingId },
      select: ['id', 'inviteBalance', 'invitesSent', 'clientUserId'],
    });

    if (!listing) {
      throw new NotFoundException({ code: 'JL_NOT_FOUND', message: 'Job listing not found.' });
    }

    // Deduplicate talent IDs so repeated entries do not consume balance twice
    // or emit duplicate invite events.
    const uniqueTalentUserIds = [...new Set(dto.talentUserIds)];
    const count = uniqueTalentUserIds.length;

    if (listing.inviteBalance < count) {
      throw new HttpException(
        { code: 'JL_INSUFFICIENT_INVITE_BALANCE', message: 'Insufficient invite balance.' },
        422,
      );
    }

    const updateResult = await this.repo
      .createQueryBuilder()
      .update(JobListing)
      .set({
        inviteBalance: () => `"invite_balance" - ${count}`,
        invitesSent: () => `"invites_sent" + ${count}`,
      })
      .where('id = :listingId', { listingId })
      .andWhere('"invite_balance" >= :count', { count })
      .execute();

    if (!updateResult.affected) {
      throw new HttpException(
        { code: 'JL_INSUFFICIENT_INVITE_BALANCE', message: 'Insufficient invite balance.' },
        422,
      );
    }

    for (const talentUserId of uniqueTalentUserIds) {
      this.publisher.emit('job_listing.invite_sent', {
        listingId,
        talentUserId,
        roleRowId:    dto.roleRowId ?? null,
        clientUserId: listing.clientUserId,
      });
    }
  }
}
