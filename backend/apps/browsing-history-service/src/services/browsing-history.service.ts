import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BrowsingHistory,
  BrowsingHistoryItemType,
} from '../entities/browsing-history.entity';
import { ListBrowsingHistoryQueryDto, RecordViewDto } from '../dto/browsing-history.dto';
import {
  LISTING_OWNER_TARGET_CLIENT,
  OwnerTargetClientPort,
  USER_OWNER_TARGET_CLIENT,
} from './owner-target-client.port';

/**
 * Which owner-target client resolves each item type — matches
 * favorites-service's target-validation.service.ts routing exactly:
 * PROJECT/SERVICE/JOB -> listing-service, TALENT/TEAM -> user-service.
 * Teams are user-service's resolveTeamOwnerTarget()/validateTeam(), not
 * listings-service's, which only ever resolves 'project' and hard-returns
 * exists:false for anything else — routing TEAM there silently made every
 * viewed team read back as unavailable.
 */
const CLIENT_BY_TYPE: Record<
  BrowsingHistoryItemType,
  typeof LISTING_OWNER_TARGET_CLIENT | typeof USER_OWNER_TARGET_CLIENT
> = {
  [BrowsingHistoryItemType.PROJECT]: LISTING_OWNER_TARGET_CLIENT,
  // SERVICE has no resolver anywhere today — listings-service's
  // validateTarget only ever resolves targetType 'project' and
  // hard-returns exists:false for anything else. Pre-existing platform
  // limitation shared with favorites-service, not introduced here; service
  // items will read as unavailable until listings-service adds a resolver
  // for them.
  [BrowsingHistoryItemType.SERVICE]: LISTING_OWNER_TARGET_CLIENT,
  [BrowsingHistoryItemType.TEAM]: USER_OWNER_TARGET_CLIENT,
  [BrowsingHistoryItemType.TALENT]: USER_OWNER_TARGET_CLIENT,
};

export interface BrowsingHistoryListItem {
  id: string;
  itemId: string;
  itemType: BrowsingHistoryItemType;
  firstViewedAt: Date;
  lastViewedAt: Date;
  viewCount: number | null;
  /** false when the underlying item no longer exists or isn't visible to this user. */
  available: boolean;
  displayName?: string;
  title?: string;
  skills?: string[];
}

@Injectable()
export class BrowsingHistoryService {
  private readonly logger = new Logger(BrowsingHistoryService.name);

  constructor(
    @InjectRepository(BrowsingHistory)
    private readonly repo: Repository<BrowsingHistory>,
    @Inject(LISTING_OWNER_TARGET_CLIENT)
    private readonly listingClient: OwnerTargetClientPort,
    @Inject(USER_OWNER_TARGET_CLIENT)
    private readonly userClient: OwnerTargetClientPort,
  ) {}

  private clientFor(itemType: BrowsingHistoryItemType): OwnerTargetClientPort {
    return CLIENT_BY_TYPE[itemType] === LISTING_OWNER_TARGET_CLIENT
      ? this.listingClient
      : this.userClient;
  }

  /**
   * Records a view. Upserts on (userId, itemId): a repeat view of the same
   * item updates lastViewedAt (and increments viewCount) instead of
   * inserting a duplicate row. Single indexed write — no cross-service call
   * on this path, so it never delays the page the user is actually on.
   */
  async recordView(userId: string, dto: RecordViewDto): Promise<void> {
    const now = new Date();
    const existing = await this.repo.findOne({
      where: { userId, itemId: dto.itemId },
    });

    if (existing) {
      existing.lastViewedAt = now;
      existing.viewCount = (existing.viewCount ?? 0) + 1;
      // itemType shouldn't change for a stable itemId, but keep it in sync
      // in case an id gets reused across a data fix elsewhere.
      existing.itemType = dto.itemType;
      await this.repo.save(existing);
      return;
    }

    await this.repo.save(
      this.repo.create({
        userId,
        itemId: dto.itemId,
        itemType: dto.itemType,
        firstViewedAt: now,
        lastViewedAt: now,
        viewCount: 1,
      }),
    );
  }

  /**
   * Returns this user's history, most-recently-viewed first, paginated, with
   * each row enriched with live display data via the owner-target gRPC
   * contract. Resolution is batched (parallel per page) rather than done as
   * a per-card round trip. An item that no longer exists or isn't visible to
   * this user comes back with available:false and no leaked details.
   */
  async listHistory(
    userId: string,
    query: ListBrowsingHistoryQueryDto,
  ): Promise<{ items: BrowsingHistoryListItem[]; total: number }> {
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const [rows, total] = await this.repo.findAndCount({
      where: query.itemType ? { userId, itemType: query.itemType } : { userId },
      order: { lastViewedAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    const items = await Promise.all(
      rows.map(async (row): Promise<BrowsingHistoryListItem> => {
        const client = this.clientFor(row.itemType);
        try {
          const validation = await client.validateTarget({
            targetType: row.itemType,
            targetId: row.itemId,
          });

          if (!validation.exists) {
            return {
              id: row.id,
              itemId: row.itemId,
              itemType: row.itemType,
              firstViewedAt: row.firstViewedAt,
              lastViewedAt: row.lastViewedAt,
              viewCount: row.viewCount,
              available: false,
            };
          }

          const metadata = await client.getTargetMetadata({
            targetType: row.itemType,
            targetId: row.itemId,
          });

          return {
            id: row.id,
            itemId: row.itemId,
            itemType: row.itemType,
            firstViewedAt: row.firstViewedAt,
            lastViewedAt: row.lastViewedAt,
            viewCount: row.viewCount,
            available: true,
            displayName: validation.displayName,
            title: metadata.title,
            skills: metadata.skills,
          };
        } catch (error) {
          // A resolver outage must not fail the whole page — degrade this
          // one row to unavailable rather than 500ing the request.
          this.logger.warn(
            `owner-target resolution failed for ${row.itemType}/${row.itemId}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          return {
            id: row.id,
            itemId: row.itemId,
            itemType: row.itemType,
            firstViewedAt: row.firstViewedAt,
            lastViewedAt: row.lastViewedAt,
            viewCount: row.viewCount,
            available: false,
          };
        }
      }),
    );

    return { items, total };
  }

  /** Deletes one record — only if it belongs to the requesting user. */
  async removeOne(userId: string, id: string): Promise<void> {
    const row = await this.repo.findOne({ where: { id, userId } });
    if (!row) {
      throw new NotFoundException('History record not found');
    }
    await this.repo.remove(row);
  }

  /** Deletes every record for the requesting user only. */
  async clearAll(userId: string): Promise<void> {
    await this.repo.delete({ userId });
  }
}
