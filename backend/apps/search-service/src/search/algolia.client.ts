import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { algoliasearch } from 'algoliasearch'

export const INDICES = {
  talent: 'talent',
  teams: 'teams',
  projects: 'projects',
  services: 'services',
} as const

@Injectable()
export class AlgoliaClient implements OnModuleInit {
  private readonly logger = new Logger(AlgoliaClient.name)
  private client: ReturnType<typeof algoliasearch>

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const appId = this.config.get<string>('ALGOLIA_APP_ID')
    const apiKey = this.config.get<string>('ALGOLIA_API_KEY')
    if (!appId || !apiKey) {
      this.logger.warn('Algolia credentials not set — search will return empty results')
      return
    }
    this.client = algoliasearch(appId, apiKey)
  }

  async search(indexName: string, query: string, params: Record<string, any> = {}) {
    if (!this.client) return { hits: [], nbHits: 0, page: 0, nbPages: 0 }
    const result = await this.client.searchSingleIndex({
      indexName,
      searchParams: { query, ...params },
    })
    return result
  }

  async multiSearch(queries: Array<{ indexName: string; query: string; params?: Record<string, any> }>) {
    if (!this.client) return []
    const requests = queries.map(({ indexName, query, params = {} }) => ({
      indexName,
      query,
      params,
    }))
    const { results } = await this.client.search({ requests })
    return results
  }

  async saveObject(indexName: string, body: Record<string, any>) {
    if (!this.client) return
    await this.client.saveObject({ indexName, body })
  }

  async deleteObject(indexName: string, objectID: string) {
    if (!this.client) return
    await this.client.deleteObject({ indexName, objectID })
  }

  async partialUpdateObject(indexName: string, objectID: string, attributes: Record<string, any>) {
    if (!this.client) return
    await this.client.partialUpdateObject({ indexName, objectID, attributesToUpdate: attributes })
  }
}
