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

  async clearIndex(indexName: string): Promise<void> {
    this.ensureClient()
    await this.client.clearObjects({ indexName })
  }
}
