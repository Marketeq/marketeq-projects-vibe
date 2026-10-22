import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom } from 'rxjs'
import { AlgoliaClient, INDICES, TalentGateUnavailableError } from './algolia.client'
import { SearchDto, SearchCategory, SearchFiltersDto, SortDto } from '../dto/search.dto'
import { DbFallbackService } from './db-fallback.service'
import {
  isValidSortField,
  ALGOLIA_INDEX_SETTINGS,
  ALGOLIA_REPLICA_SETTINGS,
  CATEGORY_NAME_ATTRIBUTE,
  FILTER_VALUE_SOURCES,
  NUMERIC_BUCKET_SOURCES,
  normalizeLooseText,
} from '../config/search-config'
import { countryCodesForName, countryDisplayName, toCountryName } from '../config/countries'

/**
 * The talent attributes that carry taxonomy names. Sourced from the shared map
 * so the filter looks in exactly the attributes GET /search/category-values
 * offers names from — the two drifting apart is what would let the sidebar
 * offer a branch that matches nothing.
 */
const TALENT_CATEGORY_ATTRIBUTES = CATEGORY_NAME_ATTRIBUTE[SearchCategory.TALENT] ?? []

/**
 * Stands in for "nothing in the index matches what was typed". Filtering on a
 * value no record carries returns an empty result set, which is the honest
 * answer — dropping the filter instead would silently widen the search to
 * everyone.
 */
const NO_MATCH_VALUE = '__no_matching_value__'

/**
 * How long a facet's values are reused for. Short, because a newly indexed
 * profile should become findable quickly; long enough that a burst of filtered
 * searches costs one facet lookup rather than one per search.
 */
const FACET_CACHE_TTL_MS = 60_000

/**
 * The talent filters matched loosely, resolved from what the user typed to the
 * exact values the index holds. Kept apart from SearchFiltersDto because
 * `location` is shared with the other entities — see resolveTalentLooseFilters.
 */
interface ResolvedTalentFilters {
  job_title?: string[]
  location?: string[]
}

/** One option of a derived sidebar filter: the value and how many listings use it. */
export interface PopularValue {
  name: string
  count: number
}

/**
 * One rung of a numeric sidebar filter, with how many records fall in it.
 * `count` is omitted when the counts couldn't be read — see getNumericBuckets.
 */
export interface NumericBucketCount {
  label: string
  min?: number
  max?: number
  count?: number
}

@Injectable()
export class SearchService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SearchService.name)

  /** Cached facet values keyed by "index:attribute" — see indexedFacetValues. */
  private readonly facetValues = new Map<string, { values: string[]; expiresAt: number }>()

  constructor(
    private readonly algolia: AlgoliaClient,
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly dbFallback: DbFallbackService,
  ) {}

  async onApplicationBootstrap() {
    if (!this.algolia.isConfigured) return

    for (const [baseIndexName, settings] of Object.entries(ALGOLIA_INDEX_SETTINGS)) {
      try {
        // forwardToReplicas propagates shared settings (searchableAttributes,
        // attributesForFaceting, customRanking, ...) down to every replica.
        // Without this, replicas only ever get whatever ranking override we
        // push directly (see the loop below) — attributesForFaceting stays
        // null on them, so ANY filter combined with a non-default sort
        // silently matches nothing on that replica (no error, just an empty
        // result — Algolia doesn't reject a filter on an unfaceted
        // attribute, it just can't match anything against it).
        await this.algolia.setSettings(baseIndexName, settings, true)
        this.logger.log(`Applied settings to index "${baseIndexName}" (forwarded to replicas)`)
      } catch (err) {
        this.logger.warn(
          `Failed to set settings on index "${baseIndexName}": ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }

    // Replica-specific ranking overrides are applied after the loop above so
    // they aren't clobbered by the forwarded (shared) customRanking.
    for (const [replicaName, settings] of Object.entries(ALGOLIA_REPLICA_SETTINGS)) {
      try {
        await this.algolia.setSettings(replicaName, settings)
        this.logger.log(`Applied settings to replica "${replicaName}"`)
      } catch (err) {
        this.logger.warn(
          `Failed to set settings on replica "${replicaName}": ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }
  }

  async search(dto: SearchDto) {
    const { q = '', category = SearchCategory.ALL, limit = 20, page = 0, ml, sort, filters } = dto

    let resolvedSort: SortDto | undefined = sort
    if (sort && !isValidSortField(category, sort.field)) {
      this.logger.warn(`Ignoring invalid sort field "${sort.field}" for category "${category}"`)
      resolvedSort = undefined
    }

    if (!this.algolia.isConfigured) {
      // No Algolia credentials configured at all (e.g. local dev) — go
      // straight to the DB fallback rather than making a doomed API call.
      return this.dbFallback.search(q, category, limit, page, filters, resolvedSort)
    }

    try {
      return await this.searchAlgolia(q, category, limit, page, filters, resolvedSort, ml)
    } catch (err) {
      this.logger.warn(
        `Algolia unavailable, falling back to DB for query "${q}": ${err instanceof Error ? err.message : String(err)}`,
      )
      return this.dbFallback.search(q, category, limit, page, filters, resolvedSort)
    }
  }

  /**
   * The category names this entity's records actually carry — projects,
   * services and talent each get their own set, since a name only appears
   * here if at least one record of that entity carries it.
   *
   * The sidebar prunes the global taxonomy tree to these names so a branch
   * can never be offered that would return zero results, and so the Projects,
   * Services and Talent sidebars stop showing each other's categories. Names
   * common to several entities legitimately appear in each response.
   *
   * The names come back as one flat list regardless of the depth they sit at
   * in the taxonomy, because the sidebar's pruning is depth-agnostic: a node
   * survives when it or any descendant is named here. That's what lets talent
   * — which files names under `categories` and `subcategories` without either
   * array being pinned to a taxonomy level — grow the control from two levels
   * to three the moment a profile carries a third-level name, with no change
   * here or on the sidebar.
   *
   * Read from Algolia's facet counts (the same attributes the category filter
   * matches against, so the two can't disagree), falling back to a DISTINCT
   * over this entity's own tables when Algolia is unconfigured, erroring, or
   * has nothing indexed — mirroring search()'s own fallback.
   */
  async getCategoryValues(category: SearchCategory): Promise<{ category: SearchCategory; values: string[] }> {
    const attributes = CATEGORY_NAME_ATTRIBUTE[category]
    if (!attributes?.length) return { category, values: [] }

    if (this.algolia.isConfigured) {
      try {
        const index = INDICES[category as keyof typeof INDICES] ?? category
        // hitsPerPage: 0 — only the facet counts are wanted, not the records.
        // maxValuesPerFacet is capped at 1000 by Algolia, which is well above
        // the size of the taxonomy.
        const result: any = await this.algolia.search(index, '', {
          facets: attributes,
          maxValuesPerFacet: 1000,
          hitsPerPage: 0,
        })
        // Union across the attributes — sortNames dedupes, so a name carried
        // on both (a talent listing the same name as category and as
        // subcategory) still yields one option.
        const values = attributes.flatMap((attribute) =>
          Object.keys(result?.facets?.[attribute] ?? {}),
        )
        if (values.length) return { category, values: this.sortNames(values) }
        this.logger.warn(
          `No ${attributes.map((a) => `"${a}"`).join('/')} facet values on index "${index}" — falling back to DB for category values`,
        )
      } catch (err) {
        this.logger.warn(
          `Algolia unavailable, falling back to DB for category values of "${category}": ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }

    const values = await this.dbFallback.distinctCategoryNames(category)
    return { category, values: this.sortNames(values) }
  }

  private sortNames(values: string[]): string[] {
    return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b))
  }

  /**
   * The most-used values this entity's listings actually carry for one
   * sidebar filter field (tags, industries, skills), most popular first —
   * projects and services each get their own ranking, since a value only
   * appears here if at least one listing of that entity was published with
   * it.
   *
   * This is what makes those filters self-maintaining: the options come from
   * what publishers typed into their listings rather than a hardcoded list,
   * and because a value is only offered when at least one listing carries it,
   * ticking one on its own can't land on zero results. (Combined with other
   * active filters it still can, exactly like every other facet — the
   * guarantee is per-value, not per-combination.)
   *
   * Counts come from Algolia's facet counts on the same attribute that
   * field's filter matches against, so the offered list and the filter can't
   * disagree, falling back to a GROUP BY over the listings table when Algolia
   * is unconfigured, erroring, or has nothing indexed — mirroring search()'s
   * own fallback and getCategoryValues above.
   */
  async getFilterValues(
    category: SearchCategory,
    field: string,
    limit: number,
  ): Promise<{ category: SearchCategory; field: string; values: PopularValue[] }> {
    const source = FILTER_VALUE_SOURCES[category]?.[field]
    if (!source) return { category, field, values: [] }

    // Location is country-only and needs its raw facet values canonicalised
    // (ISO codes turned into display names, city strings dropped), so it can't
    // go through the verbatim single-attribute path below — see
    // countryFilterValues. Talent reads its ISO `country`; teams have no such
    // attribute and can only be read off free-text `location`.
    if (field === 'location') {
      const index = INDICES[category as keyof typeof INDICES] ?? category
      const attributes = category === SearchCategory.TALENT ? ['country'] : ['location']
      return { category, field, values: await this.countryFilterValues(index, attributes, limit) }
    }

    if (this.algolia.isConfigured) {
      try {
        const index = INDICES[category as keyof typeof INDICES] ?? category
        // hitsPerPage: 0 — only the facet counts are wanted, not the records.
        // maxValuesPerFacet is capped at 1000 by Algolia; the top `limit` of
        // those is picked below, so the cap only matters for an index with
        // more than 1000 distinct values, where the ones beyond it are rare by
        // definition and can't have placed anyway.
        const result: any = await this.algolia.search(index, '', {
          facets: [source.attribute],
          maxValuesPerFacet: 1000,
          hitsPerPage: 0,
        })
        const values = this.rankValues(result?.facets?.[source.attribute], limit)
        if (values.length) return { category, field, values }
        this.logger.warn(
          `No "${source.attribute}" facet values on index "${index}" — falling back to DB for "${field}" values`,
        )
      } catch (err) {
        this.logger.warn(
          `Algolia unavailable, falling back to DB for "${field}" values of "${category}": ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }

    const counts = await this.dbFallback.arrayValueCounts(category, field)
    return { category, field, values: this.rankValues(counts, limit) }
  }

  /**
   * Top `limit` values from a {value: listing count} map, most used first.
   *
   * Capitalisation variants of the same value are one entry: publishers type
   * these fields free-form, so "React" and "react" arrive as separate facet
   * values, but both filter paths match case-insensitively (Algolia facet
   * matching, and the DB fallback lowercases both sides) — so leaving them
   * split would both understate a value's real popularity and spend two of a
   * filter's slots on what a user reads as one option. The variant the most
   * listings actually use is kept as the display form.
   */
  private rankValues(counts: unknown, limit: number): PopularValue[] {
    if (!counts || typeof counts !== 'object') return []

    const merged = new Map<string, PopularValue & { displayCount: number }>()
    for (const [rawName, rawCount] of Object.entries(counts as Record<string, unknown>)) {
      const name = String(rawName).trim()
      const count = Number(rawCount)
      if (!name || !Number.isFinite(count) || count <= 0) continue

      const key = name.toLowerCase()
      const existing = merged.get(key)
      if (!existing) {
        merged.set(key, { name, count, displayCount: count })
        continue
      }
      existing.count += count
      if (count > existing.displayCount) {
        existing.name = name
        existing.displayCount = count
      }
    }

    return Array.from(merged.values())
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, limit)
      .map(({ name, count }) => ({ name, count }))
  }

  private async searchAlgolia(
    q: string,
    category: SearchCategory,
    limit: number,
    page: number,
    filters?: SearchFiltersDto,
    sort?: SortDto,
    ml?: boolean,
  ) {
    // Algolia's default typo tolerance treats a transposed pair of adjacent
    // characters as a single typo, so a query like "AD" can match text
    // containing "DA". Disable it so matches stay faithful to what was typed.
    const baseParams = { hitsPerPage: limit, page }
    let results: any

    // Job Title and Location are matched partially, which an Algolia filter
    // can't express — resolve the typed terms to concrete indexed values up
    // front so every filter string below is built from the same resolved list.
    const talentResolved = await this.resolveTalentLooseFilters(filters, category)

    if (category === SearchCategory.ALL) {
      // Each sub-index needs its own entity-specific filter string — a single
      // shared string (skills/location/tags/industry/rate/rating only) would
      // silently drop category-specific facets like project_category on the
      // "all" search view, the default state of /search. Mirrors the
      // per-entity filtering DbFallbackService already does for its ALL branch.
      const talentParams = { ...baseParams, filters: (filters ? this.buildAlgoliaFilters(filters, SearchCategory.TALENT, talentResolved) : '') || undefined }
      const teamsParams = { ...baseParams, filters: (filters ? this.buildAlgoliaFilters(filters, SearchCategory.TEAMS) : '') || undefined }
      const projectsParams = { ...baseParams, filters: (filters ? this.buildAlgoliaFilters(filters, SearchCategory.PROJECTS) : '') || undefined }
      const servicesParams = { ...baseParams, filters: (filters ? this.buildAlgoliaFilters(filters, SearchCategory.SERVICES) : '') || undefined }

      if (sort) {
        // multiSearch batches all 4 requests into one Algolia call, which
        // doesn't give us a way to fall back per-index if one entity's sort
        // replica doesn't exist. Run 4 individual calls instead so each
        // entity can independently fall back to its own base index.
        const [talent, teams, projects, services] = await Promise.all([
          this.searchSingleWithSortFallback(INDICES.talent, q, talentParams, sort),
          this.searchSingleWithSortFallback(INDICES.teams, q, teamsParams, sort),
          this.searchSingleWithSortFallback(INDICES.projects, q, projectsParams, sort),
          this.searchSingleWithSortFallback(INDICES.services, q, servicesParams, sort),
        ])
        results = { talent, teams, projects, services }
      } else {
        const [talent, teams, projects, services] = await this.algolia.multiSearch([
          { indexName: INDICES.talent,   query: q, params: talentParams },
          { indexName: INDICES.teams,    query: q, params: teamsParams },
          { indexName: INDICES.projects, query: q, params: projectsParams },
          { indexName: INDICES.services, query: q, params: servicesParams },
        ])
        results = { talent, teams, projects, services }
      }
    } else {
      const filterStr = filters ? this.buildAlgoliaFilters(filters, category, talentResolved) : ''
      const params = { ...baseParams, filters: filterStr || undefined }
      const baseIndex = INDICES[category as keyof typeof INDICES] ?? category
      results = await this.searchSingleWithSortFallback(baseIndex, q, params, sort)
    }

    if (ml) {
      // NOTE: rerank() reassigns `hits` from the ML reranker's own ordering,
      // so sort and ml=true are currently mutually exclusive in practice —
      // rerank always wins. Fixing that needs a product call on precedence.
      results = await this.rerank(q, results)
    }

    return results
  }

  /**
   * Resolves the talent filters that are matched loosely — Job Title and
   * Location — from what the user typed into the exact values the index
   * actually holds.
   *
   * This has to happen before any filter string is built because Algolia's
   * filter grammar only does exact facet equality: there is no substring
   * operator, so the only way to match partially is to work out which real
   * values the term stands for and filter on those.
   *
   * The result is returned **separately rather than written back onto
   * `filters`**, because `location` is not talent's alone — projects, services
   * and teams filter on it too, and on the `category=all` view one filters
   * object builds all four filter strings. Overwriting it there would hand
   * every other index talent's resolved values.
   */
  private async resolveTalentLooseFilters(
    filters: SearchFiltersDto | undefined,
    category: SearchCategory,
  ): Promise<ResolvedTalentFilters | undefined> {
    if (!filters) return undefined
    // Only the talent index uses these; anything else would pay for the facet
    // lookups and then ignore the result.
    if (category !== SearchCategory.TALENT && category !== SearchCategory.ALL) return undefined

    const [job_title, location] = await Promise.all([
      this.resolveJobTitles(filters.job_title),
      this.resolveLocations(filters.location),
    ])
    if (!job_title && !location) return undefined
    return { job_title, location }
  }

  /**
   * Indexed job titles matching what was typed: "designer" finds "Product
   * designer", "engineer" finds every engineer, and "full stack engineer"
   * finds "Full-stack engineer". The DB fallback expresses the identical rule
   * in SQL; both go through normalizeLooseText (see search-config).
   *
   * `undefined` means "leave the typed terms alone" — returned when there is
   * nothing to resolve or the facet can't be read, so a lookup failure
   * degrades to the old exact matching rather than to an empty page. A term
   * that matches nothing instead resolves to NO_MATCH_VALUE, so an unknown
   * title returns nothing rather than being dropped (which would widen the
   * results to everyone).
   */
  private async resolveJobTitles(values?: string[]): Promise<string[] | undefined> {
    const terms = (values ?? []).map(normalizeLooseText).filter(Boolean)
    if (!terms.length) return undefined

    const indexed = await this.indexedFacetValues(INDICES.talent, 'job_title')
    if (!indexed.length) return undefined

    const matched = indexed.filter((title) => {
      const normalized = normalizeLooseText(title)
      return terms.some((term) => normalized.includes(term))
    })
    return matched.length ? matched : [NO_MATCH_VALUE]
  }

  /**
   * Indexed locations matching what was typed, across both attributes the
   * Location filter spans.
   *
   * Location is country-only (see countryFilterValues), so only the ISO
   * `country` attribute is searched — the free-text `location` holds cities,
   * which are no longer offered and would otherwise let a partial term drag a
   * city in behind a country pick.
   *
   * Typing a country's NAME has to work — "United States" is what a user
   * types, and the record stores "US" — so each indexed code is compared both
   * as a code and by its display name, resolved with Intl (the same thing the
   * result card uses to render it, so the filter and the card can't disagree
   * about what "US" is called). That also means there is no country table to
   * keep up to date.
   *
   * Codes come back, which is exactly what pushTalentLocationFilter builds its
   * `country:"..."` clauses from.
   */
  private async resolveLocations(values?: string[]): Promise<string[] | undefined> {
    const terms = (values ?? []).map(normalizeLooseText).filter(Boolean)
    if (!terms.length) return undefined

    const countries = await this.indexedFacetValues(INDICES.talent, 'country')
    if (!countries.length) return undefined

    const matched = [
      ...countries.filter((code) => {
        const normalizedCode = normalizeLooseText(code)
        const name = normalizeLooseText(countryDisplayName(code))
        // The code matches only outright ("us"), never as a substring — two
        // letters turn up inside too many unrelated words to be a useful
        // signal. The display name matches as a substring like everything
        // else, so "united" finds the United States.
        return terms.some(
          (term) => normalizedCode === term || (!!name && name.includes(term)),
        )
      }),
    ]
    return matched.length ? matched : [NO_MATCH_VALUE]
  }

  /**
   * The rungs of a numeric sidebar filter that can actually return something,
   * each with the number of records behind it — what the Talent sidebar's
   * Client Success Rate section renders.
   *
   * The rungs are declared in NUMERIC_BUCKET_SOURCES (a bucket boundary is a
   * product decision, not something to be inferred); what's dynamic is the
   * `count` on each. Counting comes from the attribute's facet, so it is over
   * the same attribute the checkbox then filters on — the two can't describe
   * different things.
   *
   * EVERY rung is returned, including ones no record reaches (`count: 0`).
   * The section is a fixed part of the Talent sidebar's design, so it stays
   * rendered whether or not the stat is populated; the counts are what tracks
   * the data. Dropping empty rungs here would make the section disappear
   * entirely while `client_success_rate` is unpopulated, which is not the
   * intended layout.
   *
   * Records missing the value are absent from the facet, so they never inflate
   * a rung. On an Algolia failure the ladder comes back with `count` omitted
   * rather than zeroed — "unknown" and "nobody" are different answers, and
   * only the latter should ever be shown as 0.
   */
  async getNumericBuckets(
    category: SearchCategory,
    field: string,
  ): Promise<{ category: SearchCategory; field: string; buckets: NumericBucketCount[] }> {
    const source = NUMERIC_BUCKET_SOURCES[category]?.[field]
    if (!source) return { category, field, buckets: [] }

    const all = source.buckets.map((bucket) => ({ ...bucket }))
    if (!this.algolia.isConfigured) return { category, field, buckets: all }

    try {
      const index = INDICES[category as keyof typeof INDICES] ?? category
      // hitsPerPage: 0 — only the facet counts are wanted, not the records.
      const result: any = await this.algolia.search(index, '', {
        facets: [source.attribute],
        maxValuesPerFacet: 1000,
        hitsPerPage: 0,
      })

      const observed: Array<{ value: number; count: number }> = []
      for (const [rawValue, rawCount] of Object.entries(
        (result?.facets?.[source.attribute] ?? {}) as Record<string, unknown>,
      )) {
        const value = Number(rawValue)
        const count = Number(rawCount)
        if (!Number.isFinite(value) || !Number.isFinite(count) || count <= 0) continue
        observed.push({ value, count })
      }

      const buckets = source.buckets.map((bucket) => {
        // An unbounded rung is the "Any" opt-out, not a range. Counting it
        // would sum only the records that HAVE the value, which is the one
        // number it must not report — "Any" covers the records missing it too.
        // Left unset, the same way a failed lookup leaves every count unset.
        if (bucket.min === undefined && bucket.max === undefined) {
          return { ...bucket }
        }
        return {
          ...bucket,
          count: observed.reduce(
            (total, { value, count }) =>
              (bucket.min === undefined || value >= bucket.min) &&
              (bucket.max === undefined || value <= bucket.max)
                ? total + count
                : total,
            0,
          ),
        }
      })

      return { category, field, buckets }
    } catch (err) {
      this.logger.warn(
        `Algolia unavailable — "${field}" buckets for "${category}" fall back to the full ladder: ${err instanceof Error ? err.message : String(err)}`,
      )
      return { category, field, buckets: all }
    }
  }

  /**
   * The countries a category's records are actually in, most populated first —
   * what the Talent and Teams sidebars' Location pickers offer.
   *
   * **Countries only, never cities.** A location is offered at exactly one
   * grain, so the picker reads as one list of comparable options instead of
   * mixing "United States" with "San Francisco, CA". Anything that doesn't
   * name a country is dropped rather than parsed down to one — see
   * toCountryName for why a substring rule would file records under the wrong
   * country. Nothing about what is STORED changes: the free-text city string
   * stays on the record and on the result card, it just isn't an option here.
   *
   * The two entities reach a country by different routes, which is why the
   * attribute list is a parameter:
   *  - talent carries an ISO `country` ("US") alongside its free-text
   *    `location`, so its countries come off `country` alone and are shown by
   *    display name ("United States") — the way the result card labels it and
   *    the way someone would type it.
   *  - teams have no country attribute at all (see SyncService.syncTeam), only
   *    the one free-text `location`, so its country-named values are the only
   *    ones that can be offered. A team filed as "Berlin, Germany" is
   *    therefore not offered under Germany; a team filed as "Germany" is. That
   *    keeps the per-value guarantee intact — every option still has a record
   *    behind it — and it is the ceiling of what's reachable without changing
   *    what teams store.
   *
   * Counts for the same country arriving in different forms ("US", "us",
   * "United States") merge into one option, since all of them canonicalise to
   * the same display name.
   *
   * Empty when Algolia is unconfigured or erroring — there is no DB source for
   * this field (see FILTER_VALUE_SOURCES), and offering nothing is the right
   * degradation for a picker whose whole purpose is that every option has a
   * record behind it. Free typing still works, exactly as before.
   */
  private async countryFilterValues(
    index: string,
    attributes: string[],
    limit: number,
  ): Promise<PopularValue[]> {
    if (!this.algolia.isConfigured) return []

    try {
      // hitsPerPage: 0 — only the facet counts are wanted, not the records.
      const result: any = await this.algolia.search(index, '', {
        facets: attributes,
        maxValuesPerFacet: 1000,
        hitsPerPage: 0,
      })

      const counts: Record<string, number> = {}
      for (const attribute of attributes) {
        for (const [rawValue, rawCount] of Object.entries(
          (result?.facets?.[attribute] ?? {}) as Record<string, unknown>,
        )) {
          const name = toCountryName(String(rawValue))
          const count = Number(rawCount)
          if (!name || !Number.isFinite(count) || count <= 0) continue
          counts[name] = (counts[name] ?? 0) + count
        }
      }

      return this.rankValues(counts, limit)
    } catch (err) {
      this.logger.warn(
        `Algolia unavailable — location values for "${index}" unavailable: ${err instanceof Error ? err.message : String(err)}`,
      )
      return []
    }
  }

  /**
   * Values of one facet on one index, briefly cached.
   *
   * Read from the facet rather than the database on purpose: these are the
   * values the filter will be compared against, so taking them from anywhere
   * else could resolve to something the filter then fails to match.
   */
  private async indexedFacetValues(index: string, attribute: string): Promise<string[]> {
    const key = `${index}:${attribute}`
    const now = Date.now()
    const cached = this.facetValues.get(key)
    if (cached && cached.expiresAt > now) return cached.values

    try {
      const result: any = await this.algolia.search(index, '', {
        facets: [attribute],
        maxValuesPerFacet: 1000,
        hitsPerPage: 0,
      })
      const values = Object.keys(result?.facets?.[attribute] ?? {})
      this.facetValues.set(key, { values, expiresAt: now + FACET_CACHE_TTL_MS })
      return values
    } catch (err) {
      this.logger.warn(
        `Could not read the "${attribute}" facet on "${index}" — that filter falls back to exact matching: ${err instanceof Error ? err.message : String(err)}`,
      )
      return []
    }
  }

  // Algolia sort requires a replica index named {base}_sort_{field}_{direction}.
  // If the replica doesn't exist, fall back to unsorted results from the
  // primary index (never the DB fallback — Algolia is still available, just
  // unsorted).
  private async searchSingleWithSortFallback(
    baseIndex: string,
    q: string,
    params: Record<string, any>,
    sort?: SortDto,
  ) {
    if (!sort) return this.algolia.search(baseIndex, q, params)
    const replicaIndex = `${baseIndex}_sort_${sort.field}_${sort.direction}`
    try {
      return await this.algolia.search(replicaIndex, q, params)
    } catch (err) {
      // A closed talent gate is not a missing replica: never retry past it.
      if (err instanceof TalentGateUnavailableError) throw err
      this.logger.warn(`Sort replica "${replicaIndex}" not found — returning unsorted results`)
      return this.algolia.search(baseIndex, q, params)
    }
  }

  // Full filter set for a single-entity search
  private buildAlgoliaFilters(
    filters: SearchFiltersDto,
    category: SearchCategory,
    resolved?: ResolvedTalentFilters,
  ): string {
    const parts: string[] = []

    // Shared fields
    this.pushArrayFilter(parts, 'skills', filters.skills)
    // Talent has its own location handling below (it ORs the free-text
    // `location` with the ISO `country`), so it opts out here.
    if (category !== SearchCategory.TALENT) {
      this.pushArrayFilter(parts, 'location', filters.location)
    }
    this.pushArrayFilter(parts, 'tags', filters.tags)
    this.pushIndustryFilter(parts, filters)
    this.pushRangeFilter(parts, 'hourly_rate', filters.hourly_rate_min, filters.hourly_rate_max)
    if (filters.rating_min !== undefined) parts.push(`rating >= ${filters.rating_min}`)

    if (category === SearchCategory.TALENT) {
      // `resolved` carries the loosely-matched fields already expanded to the
      // exact indexed values (see resolveTalentLooseFilters); falling back to
      // the raw terms keeps exact matching when the facet couldn't be read.
      this.pushArrayFilter(parts, 'job_title', resolved?.job_title ?? filters.job_title)
      this.pushExperienceYearsFilter(parts, filters.experience_level)
      this.pushAvailabilityFilter(parts, filters.availability)
      // Reuses the shared `category` DTO field (also used by Teams) — talent
      // records index it as a plural `categories` array attribute since a
      // single talent can belong to more than one category, unlike Teams'
      // singular `category` attribute.
      //
      // Both keys match across `categories` AND `subcategories` rather than
      // one each, the same way the projects/services pair both match their
      // single category attribute. A talent's taxonomy names are split over
      // the two arrays by how broad they are, not by which sidebar level
      // selected them, so pinning a key to one array would drop real matches:
      // a profile that filled in only `subcategories` would be missed by a
      // top-level pick even though the pruned tree offers that branch on the
      // strength of that very profile. The sidebar sends each pick expanded
      // into its whole subtree of names, so ORing the two arrays here is what
      // makes "offered ⇒ non-empty" hold at every level. The two keys still
      // AND with each other, so a subcategory pick narrows within the branch
      // the parent already chose.
      this.pushArrayFilterAcross(parts, TALENT_CATEGORY_ATTRIBUTES, filters.category)
      this.pushArrayFilterAcross(parts, TALENT_CATEGORY_ATTRIBUTES, filters.subcategory)
      this.pushArrayFilter(parts, 'languages', filters.languages)
      this.pushTalentLocationFilter(parts, resolved?.location ?? filters.location)
      this.pushRangeFilter(
        parts,
        'projects_completed',
        filters.projects_completed_min,
        filters.projects_completed_max,
      )
      if (filters.client_success_rate_min !== undefined) {
        parts.push(`client_success_rate >= ${filters.client_success_rate_min}`)
      }
    }

    if (category === SearchCategory.TEAMS) {
      this.pushArrayFilter(parts, 'category', filters.category)
      this.pushArrayFilter(parts, 'team_size_range', filters.team_size_range)
      this.pushRangeFilter(parts, 'projects_completed', filters.projects_completed_min, filters.projects_completed_max)
      if (filters.client_success_rate_min !== undefined) {
        parts.push(`client_success_rate >= ${filters.client_success_rate_min}`)
      }
      this.pushArrayFilter(parts, 'availability', filters.availability)
      this.pushArrayFilter(parts, 'languages', filters.languages)
    }

    if (category === SearchCategory.PROJECTS) {
      this.pushArrayFilter(parts, 'project_category', filters.project_category)
      // Same attribute as the line above, deliberately: see the note on
      // SearchFiltersDto.project_subcategory. Both filters carry expanded
      // taxonomy NAME lists and the subcategory set is always a subset of
      // the parent's, so AND'ing the two clauses narrows within the branch.
      this.pushArrayFilter(parts, 'project_category', filters.project_subcategory)
      this.pushArrayFilter(parts, 'project_type', filters.project_type)
      this.pushRangeFilter(parts, 'budget_range', filters.budget_min, filters.budget_max)
      this.pushProjectDurationFilter(parts, filters.project_duration_range)
      this.pushArrayFilter(parts, 'team_size_range', filters.team_size_range)
      this.pushArrayFilter(parts, 'technologies', filters.technologies)
      // The Algolia record has no populated `additional_tags` attribute
      // (always empty — never indexed) and the attribute isn't declared as
      // facetable, so filtering on it directly always returns zero results.
      // Alias it onto the real `tags` attribute instead, as its own AND'd
      // clause (kept separate from the regular `tags` filter above so
      // selecting values in either facet independently narrows results,
      // rather than one silently overwriting the other) — mirrors the same
      // aliasing DbFallbackService already does for this field.
      this.pushArrayFilter(parts, 'tags', filters.additional_tags)
    }

    if (category === SearchCategory.SERVICES) {
      this.pushArrayFilter(parts, 'category', filters.service_category)
      // Same attribute as the line above — see the projects branch.
      this.pushArrayFilter(parts, 'category', filters.service_subcategory)
      this.pushArrayFilter(parts, 'pricing_model', filters.pricing_model)
      // Team Size is hidden on the Services sidebar — see search-config.
      // this.pushArrayFilter(parts, 'team_size_range', filters.team_size_range)
      this.pushRangeFilter(parts, 'price_range', filters.price_min, filters.price_max)
    }

    return parts.join(' AND ')
  }

  // Industry is indexed under different attribute names depending on entity:
  // talent/teams carry a plural `industries` array, projects/services carry a
  // singular scalar `industry`. Both attributes are declared as facetable on
  // every index (see search-config.ts), so ORing across both names here is
  // valid on every index regardless of which one that entity actually
  // populates — this lets one filter clause work correctly for all four
  // entity types, including the shared/ALL-category multi-search.
  private pushIndustryFilter(parts: string[], filters: SearchFiltersDto): void {
    const values = [...(filters.industries ?? []), ...(filters.industry ? [filters.industry] : [])]
    if (!values.length) return
    const clause = values.map((v) => `industries:"${v}" OR industry:"${v}"`).join(' OR ')
    parts.push(`(${clause})`)
  }

  // Algolia indexes project duration as a raw "N weeks" string, not a
  // number — there's no numeric attribute to run a real range filter
  // against, and Algolia's filter language can't parse/compare a formatted
  // string. The sidebar sends month-bucket labels (e.g. "6 - 12 months"),
  // so translate each bucket into its equivalent week range (×4 weeks per
  // month, same conversion DbFallbackService.durationWeeksRangeAny already
  // uses for the DB path) and OR together an exact match against every
  // integer week value in that range. Only matches values shaped exactly
  // like "N weeks" — any other format silently doesn't match, same
  // graceful-degradation style used elsewhere in this file.
  private static readonly WEEKS_PER_MONTH = 4
  private static readonly MAX_DURATION_WEEKS = 130 // cap for the open-ended "24+ months" bucket

  private pushProjectDurationFilter(parts: string[], labels?: string[]): void {
    if (!labels?.length) return
    const orTerms: string[] = []
    for (const label of labels) {
      const range = label.match(/(\d+)\s*-\s*(\d+)/)
      let minWeeks: number
      let maxWeeks: number
      if (range) {
        minWeeks = Number(range[1]) * SearchService.WEEKS_PER_MONTH
        maxWeeks = Number(range[2]) * SearchService.WEEKS_PER_MONTH
      } else {
        const openEnded = label.match(/(\d+)\s*\+/)
        if (!openEnded) continue
        minWeeks = Number(openEnded[1]) * SearchService.WEEKS_PER_MONTH
        maxWeeks = SearchService.MAX_DURATION_WEEKS
      }
      for (let w = minWeeks; w <= maxWeeks; w++) {
        orTerms.push(`project_duration_range:"${w} weeks"`)
      }
    }
    if (orTerms.length) parts.push(`(${orTerms.join(' OR ')})`)
  }

  // OR logic within a field: (skills:"React" OR skills:"TypeScript")
  /**
   * Blank values are dropped rather than rendered: `field:""` is rejected by
   * Algolia ("Not allowed empty string"), and a rejected filter doesn't
   * surface as an error — search() catches it and silently reruns the whole
   * query against the DB fallback, so one stray empty string quietly changes
   * which backend answers and which fields the hits carry.
   */
  private pushArrayFilter(parts: string[], field: string, values?: string[]): void {
    const clean = values?.filter((value) => value?.trim())
    if (!clean?.length) return
    if (clean.length === 1) {
      parts.push(`${field}:"${clean[0]}"`)
    } else {
      parts.push(`(${clean.map((v) => `${field}:"${v}"`).join(' OR ')})`)
    }
  }

  /**
   * pushArrayFilter over several attributes at once: matches when ANY of
   * `fields` carries ANY of `values`. Used for talent's category filters,
   * whose names are spread over `categories` and `subcategories`.
   *
   * Every term is a simple `attribute:"value"` equality, so the whole group
   * stays a flat OR — Algolia rejects an AND nested inside an OR, which is
   * what rules out building this as a per-value OR of per-attribute ANDs.
   */
  private pushArrayFilterAcross(parts: string[], fields: string[], values?: string[]): void {
    // Blank values dropped for the same reason as in pushArrayFilter above.
    const clean = values?.filter((value) => value?.trim())
    if (!clean?.length || !fields.length) return
    const terms = clean.flatMap((value) => fields.map((field) => `${field}:"${value}"`))
    parts.push(terms.length === 1 ? terms[0] : `(${terms.join(' OR ')})`)
  }

  /**
   * Talent's Location filter, OR'd across the two places a location can live
   * on the record: the free-text `location` ("San Francisco, CA") and the ISO
   * `country` ("US"). The sidebar offers whichever values the profiles
   * actually carry, so either form has to match.
   */
  private pushTalentLocationFilter(parts: string[], values?: string[]): void {
    // Blank values dropped for the same reason as in pushArrayFilter above.
    const clean = values?.filter((value) => value?.trim())
    if (!clean?.length) return
    // Country-only: the picker offers country display names ("United States")
    // and the record stores an ISO code ("US"), so each selected value is
    // expanded back to every code it stands for. The free-text `location`
    // attribute is deliberately NOT matched — it holds cities, which are no
    // longer an option, and matching it would let a profile in "Georgia, USA"
    // answer a filter for the country Georgia.
    //
    // A value naming no country resolves to no codes, which correctly matches
    // nothing rather than falling back to a looser attribute.
    const codes = clean.flatMap((value) => countryCodesForName(value))
    const clause = (codes.length ? codes : [NO_MATCH_VALUE])
      .map((code) => `country:"${code}"`)
      .join(' OR ')
    parts.push(`(${clause})`)
  }

  /**
   * Experience Level buckets ("Junior (1 - 3 years)", "Super Senior (10 +
   * years)") translated into numeric ranges over the record's
   * `years_of_experience`.
   *
   * Ranging over the number rather than exact-matching the bucket label means
   * the two sides can't drift apart on wording, and it's what lets the
   * design's "Custom Range" option work at all — a hand-entered range is just
   * another pair of bounds, not a label anyone could have pre-agreed.
   * Anything that doesn't parse as a range is skipped rather than matching
   * nothing, the same graceful degradation the duration filter uses.
   *
   * Bounded buckets MUST use Algolia's `attr:lower TO upper` range form, not
   * `attr >= lower AND attr <= upper`. Algolia's filter grammar rejects an AND
   * nested inside an OR ("filter (X AND Y) OR Z is not allowed, only
   * (X OR Y) AND Z is allowed"), so the comparison form parses fine for a
   * single bucket and then throws the moment a second one is ticked. That
   * throw is caught upstream as "Algolia unavailable" and silently drops the
   * whole search onto the DB fallback — same query, different backend,
   * different fields on the hits. `TO` keeps each bucket a single term, so
   * OR-ing them stays legal.
   */
  private pushExperienceYearsFilter(parts: string[], labels?: string[]): void {
    if (!labels?.length) return
    const clauses: string[] = []
    for (const label of labels) {
      const range = label.match(/(\d+)\s*-\s*(\d+)/)
      if (range) {
        clauses.push(`years_of_experience:${Number(range[1])} TO ${Number(range[2])}`)
        continue
      }
      const openEnded = label.match(/(\d+)\s*\+/)
      if (openEnded) clauses.push(`years_of_experience >= ${Number(openEnded[1])}`)
    }
    if (clauses.length) parts.push(`(${clauses.join(' OR ')})`)
  }

  /**
   * Availability buckets from the sidebar ("Available now", "Available within
   * 1 week", "Available within 1 month") mapped onto what the profile
   * actually stores, which is weekly capacity in hours ("40", "30", "20").
   *
   * There is no start-date or notice-period field anywhere on a talent
   * profile, so "how soon can they start" has to be read off capacity: the
   * more of their week is already free, the sooner they can take work. The
   * mapping is a documented product assumption, deliberately kept in one
   * place — if a real notice-period field is added later, this is the only
   * thing that needs to change.
   */
  private static readonly AVAILABILITY_MIN_HOURS: Record<string, number> = {
    'Available now': 40,
    'Available within 1 week': 30,
    'Available within 1 month': 20,
  }

  private pushAvailabilityFilter(parts: string[], labels?: string[]): void {
    if (!labels?.length) return
    // Several buckets selected together read as "any of these", so the widest
    // one wins — picking "now" and "within 1 month" must not exclude anyone
    // that either bucket alone would have matched.
    const thresholds = labels
      .map((label) => SearchService.AVAILABILITY_MIN_HOURS[label])
      .filter((hours): hours is number => hours !== undefined)
    if (!thresholds.length) {
      // Not one of the known buckets — fall back to matching the stored value
      // verbatim, so a caller filtering on a raw availability keeps working.
      this.pushArrayFilter(parts, 'availability', labels)
      return
    }
    parts.push(`availability_hours >= ${Math.min(...thresholds)}`)
  }

  // Numeric range: field >= min AND field <= max (each pushed as separate AND clause)
  private pushRangeFilter(parts: string[], field: string, min?: number, max?: number): void {
    if (min !== undefined) parts.push(`${field} >= ${min}`)
    if (max !== undefined) parts.push(`${field} <= ${max}`)
  }

  private async rerank(query: string, results: any): Promise<any> {
    const mlUrl = this.config.get<string>('ML_RERANK_URL')
    if (!mlUrl) return results
    try {
      const hits = Array.isArray(results) ? results : results.hits ?? []
      const { data } = await firstValueFrom(
        this.http.post(`${mlUrl}/rerank`, { query, results: hits }),
      )
      return { ...results, hits: data.reranked }
    } catch (error) {
      this.logger.warn(
        `ML rerank failed for query "${query}": ${error instanceof Error ? error.message : String(error)}`,
      )
      return results
    }
  }

  async indexRecord(indexName: string, objectID: string, record: Record<string, any>) {
    await this.algolia.saveObject(indexName, { objectID, ...record })
  }

  async removeRecord(indexName: string, objectID: string) {
    await this.algolia.deleteObject(indexName, objectID)
  }

  async updateRecord(indexName: string, objectID: string, attributes: Record<string, any>) {
    await this.algolia.partialUpdateObject(indexName, objectID, attributes)
  }
}
