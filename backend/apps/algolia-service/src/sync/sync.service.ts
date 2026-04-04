import { Injectable, Logger, InternalServerErrorException, BadRequestException } from '@nestjs/common'
import { AlgoliaClient } from './algolia.client'
import { SyncRecordDto, SyncOperation, AlgoliaIndex } from '../dto/sync.dto'
import { ListingEventPayload, TalentEventPayload } from '../types/event-payloads'

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
          throw new BadRequestException(`Upsert called with no record for ${objectID}`)
        }
        await this.algolia.upsert(index, { objectID, ...record })
        this.logger.log(`Upserted ${objectID} into ${index}`)
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err
      this.logger.error(`Failed to sync ${objectID} to ${index}`, err)
      throw new InternalServerErrorException(`Failed to sync ${objectID} to index ${index}`)
    }
  }

  async batchSync(records: SyncRecordDto[]): Promise<void> {
    const byIndex: Record<string, Record<string, unknown>[]> = {}

    try {
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
    } catch (err) {
      this.logger.error('Batch sync failed', err)
      throw new InternalServerErrorException('Batch sync operation failed')
    }
  }

  async syncListing(listing: ListingEventPayload, operation: SyncOperation = SyncOperation.UPSERT): Promise<void> {
    await this.sync({
      index: listing.type === 'service' ? AlgoliaIndex.SERVICES : AlgoliaIndex.PROJECTS,
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

  async syncTalent(user: TalentEventPayload, operation: SyncOperation = SyncOperation.UPSERT): Promise<void> {
    await this.sync({
      index: AlgoliaIndex.TALENT,
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
