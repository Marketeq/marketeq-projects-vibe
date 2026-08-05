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
    // Accept either name: ALGOLIA_API_KEY is what .env.example documents for
    // this service, but the actual local/deployed .env (and algolia-service's
    // own client) only defines ALGOLIA_WRITE_API_KEY — without this fallback,
    // search-service silently never connects to Algolia and every request
    // falls through to the DB fallback path.
    const apiKey =
      this.config.get<string>('ALGOLIA_API_KEY') || this.config.get<string>('ALGOLIA_WRITE_API_KEY')
    if (!appId || !apiKey) {
      this.logger.warn('Algolia credentials not set — search will return empty results')
      return
    }
    this.client = algoliasearch(appId, apiKey)
  }

  get isConfigured(): boolean {
    return Boolean(this.client)
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
    if (!this.client) {
      return queries.map(() => ({ hits: [], nbHits: 0, page: 0, nbPages: 0 }))
    }
    // Search params (filters, hitsPerPage, page, ...) must be spread as
    // top-level properties of each request, matching search()'s
    // `{ query, ...params }` shape — Algolia's multi-query API has no
    // nested `params` field, so wrapping them under one silently drops
    // every filter/pagination param instead of erroring.
    const requests = queries.map(({ indexName, query, params = {} }) => ({
      indexName,
      query,
      ...params,
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

  async setSettings(indexName: string, settings: Record<string, any>, forwardToReplicas = false) {
    if (!this.client) return
    await this.client.setSettings({ indexName, indexSettings: settings, forwardToReplicas })
  }
}
