import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { algoliasearch } from 'algoliasearch'

export const INDICES = {
  talent: 'talent',
  teams: 'teams',
  projects: 'projects',
  services: 'services',
} as const

// Marketplace discovery gates, enforced INSIDE Algolia (it filters before it
// ranks, paginates and counts, so hits, pages and facet counts only ever cover
// visible records):
//   G1  talent    `gate_open:true`         - the talent's own gate must be open
//   G5  listings  `NOT owner_hidden:true`  - a listing whose OWNER has no known
//                 open gate is withheld (projects, services, teams). Records with
//                 no owner (CMS, seeded) carry no `owner_hidden` and stay visible.
// Both are display filters on the index copy: the stored listing/profile is never
// changed, and it reappears by itself when the gate opens.
export const TALENT_GATE_FILTER = 'gate_open:true'
export const LISTING_GATE_FILTER = 'NOT owner_hidden:true'

interface DiscoveryGate {
  /** The base index name; its replicas are `${name}_*`. */
  name: string
  filter: string
}
const DISCOVERY_GATES: readonly DiscoveryGate[] = [
  { name: INDICES.talent, filter: TALENT_GATE_FILTER },
  { name: INDICES.projects, filter: LISTING_GATE_FILTER },
  { name: INDICES.services, filter: LISTING_GATE_FILTER },
  { name: INDICES.teams, filter: LISTING_GATE_FILTER },
]

// How long one secured key is valid, and how long before that it is replaced.
// Generating a secured key is a local HMAC, not a network call, so renewal is
// cheap; the short life only bounds how long a leaked key would be useful.
const SECURED_KEY_TTL_SECONDS = 60 * 60
const SECURED_KEY_RENEW_BEFORE_MS = 10 * 60 * 1000

/** The gate that covers an index (the base index or one of its replicas), if any. */
export function gateFor(indexName: string): DiscoveryGate | undefined {
  return DISCOVERY_GATES.find((g) => indexName === g.name || indexName.startsWith(`${g.name}_`))
}

/** The talent index and every replica of it (talent_sort_*). */
export function isTalentIndex(indexName: string): boolean {
  return gateFor(indexName)?.name === INDICES.talent
}

/**
 * The caller's filters narrowed by a gate. The gate is always the outer AND, so
 * nothing in `filters` (which is built from user-controlled sidebar values) can
 * widen it back out, e.g. with an OR.
 */
export function withGate(filter: string, params: Record<string, any> = {}): Record<string, any> {
  const own = typeof params.filters === 'string' ? params.filters.trim() : ''
  return { ...params, filters: own ? `${filter} AND (${own})` : filter }
}

export function withTalentGate(params: Record<string, any> = {}): Record<string, any> {
  return withGate(TALENT_GATE_FILTER, params)
}

/**
 * A discovery gate could not be applied (no search-only parent key, or the
 * secured key could not be created). The query then FAILS CLOSED: it is
 * refused. It never falls back to the unrestricted key or to an unfiltered
 * query. (Kept under its G1 name; it now covers the G5 listing gate too.)
 */
export class TalentGateUnavailableError extends Error {
  constructor(reason: string) {
    super(`Discovery gate unavailable: ${reason}`)
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
  private gatedClients = new Map<string, { client: SearchClient; renewAtMs: number }>()

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
   * The client every gated query goes through: authenticated with a secured API
   * key generated here from a SEARCH-ONLY parent key, with the gate filter and
   * the gate's own indices embedded in the key itself. Whatever a request asks
   * for, Algolia ANDs the embedded filter in, so the restriction survives even a
   * bug in how a query is built.
   *
   * Throws TalentGateUnavailableError rather than ever returning the
   * unrestricted client.
   */
  private gatedSearchClient(gate: DiscoveryGate, now = Date.now()): SearchClient {
    const cached = this.gatedClients.get(gate.name)
    if (cached && now < cached.renewAtMs) return cached.client

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
          filters: gate.filter,
          restrictIndices: [gate.name, `${gate.name}_*`],
          validUntil,
        },
      })
      if (!securedKey) throw new Error('empty secured key')
      const client = algoliasearch(this.appId, securedKey)
      this.gatedClients.set(gate.name, { client, renewAtMs: validUntil * 1000 - SECURED_KEY_RENEW_BEFORE_MS })
      return client
    } catch (err) {
      this.gatedClients.delete(gate.name)
      throw new TalentGateUnavailableError(
        `could not create the secured key (${err instanceof Error ? err.message : String(err)})`,
      )
    }
  }

  async search(indexName: string, query: string, params: Record<string, any> = {}) {
    if (!this.client) return { hits: [], nbHits: 0, page: 0, nbPages: 0 }
    const gate = gateFor(indexName)
    if (gate) {
      const result = await this.gatedSearchClient(gate).searchSingleIndex({
        indexName,
        searchParams: { query, ...withGate(gate.filter, params) },
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
    const requests = queries.map(({ indexName, query, params = {} }) => {
      const gate = gateFor(indexName)
      return { indexName, query, ...(gate ? withGate(gate.filter, params) : params) }
    })

    // Gated requests are sent with that gate's secured key, everything else with
    // the regular key, and the answers are put back in the order asked.
    const answers: any[] = new Array(requests.length)
    const groups = new Map<string, { gate?: DiscoveryGate; at: number[] }>()
    requests.forEach((r, i) => {
      const gate = gateFor(r.indexName)
      const key = gate?.name ?? ''
      if (!groups.has(key)) groups.set(key, { gate, at: [] })
      groups.get(key)!.at.push(i)
    })
    for (const { gate, at } of groups.values()) {
      const client = gate ? this.gatedSearchClient(gate) : this.client
      const { results } = await client.search({ requests: at.map((i) => requests[i]) })
      at.forEach((index, n) => (answers[index] = results[n]))
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
