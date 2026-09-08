import { Injectable, NotFoundException, HttpException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JobListing } from "../entities/job-listing.entity";
import { SendInvitesDto } from "../dto/send-invites.dto";
import { JobListingEventsPublisher } from "../events/job-listing-events.publisher";

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
      select: ["id", "inviteBalance", "invitesSent", "clientUserId"],
    });

    if (!listing) {
      throw new NotFoundException({
        code: "JL_NOT_FOUND",
        message: "Job listing not found.",
      });
    }

    // Deduplicate talent IDs so repeated entries do not consume balance twice
    // or emit duplicate invite events.
    const uniqueTalentUserIds = [...new Set(dto.talentUserIds)];
    const count = uniqueTalentUserIds.length;

    if (listing.inviteBalance < count) {
      throw new HttpException(
        {
          code: "JL_INSUFFICIENT_INVITE_BALANCE",
          message: "Insufficient invite balance.",
        },
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
      .where("id = :listingId", { listingId })
      .andWhere('"invite_balance" >= :count', { count })
      .execute();

    if (!updateResult.affected) {
      throw new HttpException(
        {
          code: "JL_INSUFFICIENT_INVITE_BALANCE",
          message: "Insufficient invite balance.",
        },
        422,
      );
    }

    for (const talentUserId of uniqueTalentUserIds) {
      this.publisher.emit("job_listing.invite_sent", {
        listingId,
        talentUserId,
        roleRowId: dto.roleRowId ?? null,
        roleTitle: dto.roleTitle ?? null,
        clientUserId: listing.clientUserId,
      });

      // To the invited talent, not the client who sent it — the sender already
      // knows. The role title is included when the invite names one; the
      // listing title lives on a separate entity and is not worth a join here,
      // so the link carries the rest of the context.
      this.publisher.notify({
        recipientId: talentUserId,
        event: "job_listing.invite_sent",
        title: dto.roleTitle
          ? `You've been invited to apply: ${dto.roleTitle}`
          : "You've been invited to apply to a job",
        body: "A client invited you to apply. Open the listing to see the details.",
        link: "/job-listing",
        metadata: {
          listingId,
          roleRowId: dto.roleRowId ?? null,
          roleTitle: dto.roleTitle ?? null,
          invitedByUserId: listing.clientUserId,
        },
      });
    }
  }

  async creditPurchasedInvites(
    listingId: string,
    inviteCount: number,
    checkoutSessionId?: string,
  ): Promise<{ inviteBalance: number }> {
    const listing = await this.repo.findOne({
      where: { id: listingId },
      select: [
        "id",
        "inviteBalance",
        "clientUserId",
        "processedInviteCheckoutSessionIds",
      ],
    });

    if (!listing) {
      throw new NotFoundException({
        code: "JL_NOT_FOUND",
        message: "Job listing not found.",
      });
    }

    if (checkoutSessionId) {
      const processedSessionIds =
        listing.processedInviteCheckoutSessionIds ?? [];

      if (processedSessionIds.includes(checkoutSessionId)) {
        return { inviteBalance: listing.inviteBalance };
      }

      const updateResult = await this.repo
        .createQueryBuilder()
        .update(JobListing)
        .set({
          inviteBalance: () => `"invite_balance" + ${inviteCount}`,
          processedInviteCheckoutSessionIds: () =>
            `COALESCE("processed_invite_checkout_session_ids", '[]'::jsonb) || to_jsonb(ARRAY[:checkoutSessionId]::text[])`,
        })
        .where("id = :listingId", { listingId })
        .andWhere(
          `NOT (COALESCE("processed_invite_checkout_session_ids", '[]'::jsonb) ? :checkoutSessionId)`,
        )
        .setParameters({ checkoutSessionId })
        .execute();

      if (!updateResult.affected) {
        const current = await this.repo.findOne({
          where: { id: listingId },
          select: ["inviteBalance"],
        });
        return {
          inviteBalance: current?.inviteBalance ?? listing.inviteBalance,
        };
      }
    } else {
      await this.repo.increment(
        { id: listingId },
        "inviteBalance",
        inviteCount,
      );
    }

    this.publisher.emit("job_listing.invites_purchased", {
      listingId,
      inviteCount,
      checkoutSessionId: checkoutSessionId ?? null,
      clientUserId: listing.clientUserId,
    });

    return { inviteBalance: listing.inviteBalance + inviteCount };
  }
}
