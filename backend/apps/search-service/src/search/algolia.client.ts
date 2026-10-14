import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { algoliasearch } from 'algoliasearch'

export const INDICES = {
  talent: 'talent',
  teams: 'teams',
  projects: 'projects',
  services: 'services',
} as const

// G1 marketplace discovery gate. A talent whose gate is closed must not appear
// in any marketplace talent hit, page, total or facet count, so the restriction
// is applied INSIDE Algolia (it filters before it ranks, paginates and counts)
// rather than on the page that comes back.
export const TALENT_GATE_FILTER = 'gate_open:true'

// How long one secured key is valid, and how long before that it is replaced.
// Generating a secured key is a local HMAC, not a network call, so renewal is
// cheap; the short life only bounds how long a leaked key would be useful.
const SECURED_KEY_TTL_SECONDS = 60 * 60
const SECURED_KEY_RENEW_BEFORE_MS = 10 * 60 * 1000

/** The talent index and every replica of it (talent_sort_*). */
export function isTalentIndex(indexName: string): boolean {
  return indexName === INDICES.talent || indexName.startsWith(`${INDICES.talent}_`)
}

/**
 * The caller's filters narrowed by the gate. The gate is always the outer
 * AND, so nothing in `filters` (which is built from user-controlled sidebar
 * values) can widen it back out, e.g. with an OR.
 */
export function withTalentGate(params: Record<string, any> = {}): Record<string, any> {
  const own = typeof params.filters === 'string' ? params.filters.trim() : ''
  return { ...params, filters: own ? `${TALENT_GATE_FILTER} AND (${own})` : TALENT_GATE_FILTER }
}

/**
 * The talent gate could not be applied (no search-only parent key, or the
 * secured key could not be created). Talent discovery then FAILS CLOSED: the
 * query is refused. It never falls back to the unrestricted key or to an
 * unfiltered query.
 */
export class TalentGateUnavailableError extends Error {
  constructor(reason: string) {
    super(`Talent discovery gate unavailable: ${reason}`)
    this.name = 'TalentGateUnavailableError'
  }
}

type SearchClient = ReturnType<typeof algoliasearch>

@Injectable()
export class AlgoliaClient implements OnModuleInit {
  private readonly logger = new Logger(AlgoliaClient.name)
  private client: SearchClient
  private appId?: string
  private mainKey?: string
  private talentClient?: { client: SearchClient; renewAtMs: number }

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
    this.appId = appId
    this.mainKey = apiKey
    this.client = algoliasearch(appId, apiKey)
  }

  get isConfigured(): boolean {
    return Boolean(this.client)
  }

  /**
   * The client every talent query goes through: authenticated with a secured
   * API key generated here from a SEARCH-ONLY parent key, with `gate_open:true`
   * and the talent indices embedded in the key itself. Whatever a request asks
   * for, Algolia ANDs the embedded filter in, so the restriction survives even
   * a bug in how a query is built.
   *
   * Throws TalentGateUnavailableError rather than ever returning the
   * unrestricted client.
   */
  private talentSearchClient(now = Date.now()): SearchClient {
    if (this.talentClient && now < this.talentClient.renewAtMs) return this.talentClient.client

    const parent = this.config.get<string>('ALGOLIA_SEARCH_API_KEY')
    if (!parent || !this.appId || !this.client) {
      throw new TalentGateUnavailableError('ALGOLIA_SEARCH_API_KEY (search-only parent key) is not configured')
    }
    // A secured key inherits its parent's rights. Refuse an admin/write parent
    // outright: the derived key would carry write access to whoever holds it.
    if (parent === this.mainKey) {
      throw new TalentGateUnavailableError('ALGOLIA_SEARCH_API_KEY must be a search-only key, not the write/admin key')
    }

    try {
      const validUntil = Math.floor(now / 1000) + SECURED_KEY_TTL_SECONDS
      const securedKey = this.client.generateSecuredApiKey({
        parentApiKey: parent,
        restrictions: {
          filters: TALENT_GATE_FILTER,
          restrictIndices: [INDICES.talent, `${INDICES.talent}_*`],
          validUntil,
        },
      })
      if (!securedKey) throw new Error('empty secured key')
      const client = algoliasearch(this.appId, securedKey)
      this.talentClient = { client, renewAtMs: validUntil * 1000 - SECURED_KEY_RENEW_BEFORE_MS }
      return client
    } catch (err) {
      this.talentClient = undefined
      throw new TalentGateUnavailableError(
        `could not create the secured key (${err instanceof Error ? err.message : String(err)})`,
      )
    }
  }

  async search(indexName: string, query: string, params: Record<string, any> = {}) {
    if (!this.client) return { hits: [], nbHits: 0, page: 0, nbPages: 0 }
    if (isTalentIndex(indexName)) {
      const result = await this.talentSearchClient().searchSingleIndex({
        indexName,
        searchParams: { query, ...withTalentGate(params) },
      })
      return result
    }
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
      ...(isTalentIndex(indexName) ? withTalentGate(params) : params),
    }))

    // Talent requests are sent with the gated secured key, everything else with
    // the regular key, and the answers are put back in the order asked.
    const talentAt = requests.map((r, i) => (isTalentIndex(r.indexName) ? i : -1)).filter((i) => i >= 0)
    const otherAt = requests.map((_, i) => i).filter((i) => !talentAt.includes(i))
    const answers: any[] = new Array(requests.length)

    if (talentAt.length) {
      const { results } = await this.talentSearchClient().search({ requests: talentAt.map((i) => requests[i]) })
      talentAt.forEach((at, n) => (answers[at] = results[n]))
    }
    if (otherAt.length) {
      const { results } = await this.client.search({ requests: otherAt.map((i) => requests[i]) })
      otherAt.forEach((at, n) => (answers[at] = results[n]))
    }
    return answers
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
