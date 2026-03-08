import { Injectable, Logger } from '@nestjs/common'
import { AlgoliaClient } from './algolia.client'
import { SyncRecordDto, SyncOperation } from '../dto/sync.dto'

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name)

  constructor(private readonly algolia: AlgoliaClient) {}

  async sync(dto: SyncRecordDto): Promise<void> {
    const { index, operation, objectID, record } = dto

    try {
      if (operation === SyncOperation.DELETE) {
        await this.algolia.delete(index, objectID)
        this.logger.log(`Deleted ${objectID} from ${index}`)
      } else {
        if (!record) {
          this.logger.warn(`Upsert called with no record for ${objectID}`)
          return
        }
        await this.algolia.upsert(index, { objectID, ...record })
        this.logger.log(`Upserted ${objectID} into ${index}`)
      }
    } catch (err) {
      this.logger.error(`Failed to sync ${objectID} to ${index}`, err)
      throw err
    }
  }

  async batchSync(records: SyncRecordDto[]): Promise<void> {
    const byIndex: Record<string, Record<string, any>[]> = {}

    for (const dto of records) {
      if (dto.operation === SyncOperation.DELETE) {
        await this.algolia.delete(dto.index, dto.objectID)
        continue
      }
      if (!dto.record) continue
      if (!byIndex[dto.index]) byIndex[dto.index] = []
      byIndex[dto.index].push({ objectID: dto.objectID, ...dto.record })
    }

    for (const [indexName, objects] of Object.entries(byIndex)) {
      await this.algolia.batchUpsert(indexName, objects)
      this.logger.log(`Batch upserted ${objects.length} records into ${indexName}`)
    }
  }

  // Called by listings-service when a listing is created/updated
  async syncListing(listing: any, operation: SyncOperation = SyncOperation.UPSERT): Promise<void> {
    await this.sync({
      index: listing.type === 'service' ? 'services' : 'projects',
      operation,
      objectID: listing.id,
      record: {
        title: listing.title,
        description: listing.description,
        skills: listing.skills ?? [],
        category: listing.category,
        ownerId: listing.ownerId,
        price: listing.price,
        location: listing.location,
        createdAt: listing.createdAt,
      },
    })
  }

  // Called by user-service when a talent profile is updated
  async syncTalent(user: any, operation: SyncOperation = SyncOperation.UPSERT): Promise<void> {
    await this.sync({
      index: 'talent',
      operation,
      objectID: user.id,
      record: {
        name: `${user.firstName} ${user.lastName}`,
        headline: user.headline,
        skills: user.skills ?? [],
        industry: user.industry,
        location: user.location,
        hourlyRate: user.hourlyRate,
        avatarUrl: user.avatarUrl,
      },
    })
  }
}
