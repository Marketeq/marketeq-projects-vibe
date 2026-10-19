import { Injectable, OnModuleInit, Logger, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { algoliasearch } from 'algoliasearch'

@Injectable()
export class AlgoliaClient implements OnModuleInit {
  private readonly logger = new Logger(AlgoliaClient.name)
  private client: ReturnType<typeof algoliasearch>

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const appId = this.config.get<string>('ALGOLIA_APP_ID')
    const apiKey = this.config.get<string>('ALGOLIA_WRITE_API_KEY')
    if (!appId || !apiKey) {
      this.logger.warn('Algolia credentials not configured')
      return
    }
    this.client = algoliasearch(appId, apiKey)
    this.logger.log('Algolia client initialized')
  }

  private ensureClient(): void {
    if (!this.client) {
      throw new InternalServerErrorException('Algolia client is not initialized — check ALGOLIA_APP_ID and ALGOLIA_WRITE_API_KEY')
    }
  }

  async upsert(indexName: string, record: Record<string, unknown>): Promise<void> {
    this.ensureClient()
    await this.client.saveObject({ indexName, body: record })
  }

  async delete(indexName: string, objectID: string): Promise<void> {
    this.ensureClient()
    await this.client.deleteObject({ indexName, objectID })
  }

  async batchUpsert(indexName: string, records: Record<string, unknown>[]): Promise<void> {
    this.ensureClient()
    if (!records.length) return
    await this.client.saveObjects({ indexName, objects: records })
  }

  // Partial update: only the attributes passed are written, every other
  // attribute on the record is kept. This is how talent records change - a
  // verification change must never delete and recreate a record.
  // createIfNotExists=false means an unknown objectID is a no-op, not a stub.
  async partialUpdate(
    indexName: string,
    objectID: string,
    attributes: Record<string, unknown>,
    createIfNotExists = false,
  ): Promise<void> {
    this.ensureClient()
    await this.client.partialUpdateObject({ indexName, objectID, attributesToUpdate: attributes, createIfNotExists })
  }

  async partialUpdateBatch(
    indexName: string,
    objects: Array<Record<string, unknown> & { objectID: string }>,
    createIfNotExists = false,
  ): Promise<void> {
    this.ensureClient()
    if (!objects.length) return
    await this.client.partialUpdateObjects({ indexName, objects, createIfNotExists })
  }

  // objectIDs of the records whose `attribute` equals `value`. The attribute
  // must be filterable on the index (see search-service's index settings).
  async findObjectIDs(indexName: string, attribute: string, value: string): Promise<string[]> {
    this.ensureClient()
    const result = await this.client.searchSingleIndex({
      indexName,
      searchParams: {
        query: '',
        filters: `${attribute}:${JSON.stringify(value)}`,
        attributesToRetrieve: ['objectID'],
        hitsPerPage: 50,
      },
    })
    return (result.hits ?? []).map((h: any) => String(h.objectID))
  }

  async clearIndex(indexName: string): Promise<void> {
    this.ensureClient()
    await this.client.clearObjects({ indexName })
  }
}
