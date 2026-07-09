import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom } from 'rxjs'
import { AlgoliaClient, INDICES } from './algolia.client'
import { SearchDto, SearchCategory, SearchFiltersDto, SortDto } from '../dto/search.dto'
import { DbFallbackService } from './db-fallback.service'

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name)

  constructor(
    private readonly algolia: AlgoliaClient,
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly dbFallback: DbFallbackService,
  ) {}

  async search(dto: SearchDto) {
    const { q = '', category = SearchCategory.ALL, limit = 20, page = 0, ml, sort, filters } = dto

    try {
      return await this.searchAlgolia(q, category, limit, page, filters, sort, ml)
    } catch (err) {
      this.logger.warn(
        `Algolia unavailable, falling back to DB for query "${q}": ${err instanceof Error ? err.message : String(err)}`,
      )
      return this.dbFallback.search(q, category, limit, page)
    }
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
    const baseParams = { hitsPerPage: limit, page }
    let results: any

    if (category === SearchCategory.ALL) {
      // For multi-index search, only shared filters apply (entity-specific filters
      // are only meaningful when a single category is selected).
      const sharedFilterStr = filters ? this.buildSharedFilters(filters) : ''
      const params = { ...baseParams, filters: sharedFilterStr || undefined }
      const [talent, teams, projects, services] = await this.algolia.multiSearch([
        { indexName: INDICES.talent,   query: q, params },
        { indexName: INDICES.teams,    query: q, params },
        { indexName: INDICES.projects, query: q, params },
        { indexName: INDICES.services, query: q, params },
      ])
      results = { talent, teams, projects, services }
    } else {
      const filterStr = filters ? this.buildAlgoliaFilters(filters, category) : ''
      const params = { ...baseParams, filters: filterStr || undefined }
      const baseIndex = INDICES[category as keyof typeof INDICES] ?? category

      if (sort) {
        // Algolia sort requires a replica index named {base}_sort_{field}_{direction}.
        // If the replica doesn't exist, fall back to unsorted results from the primary index
        // (never the DB fallback — Algolia is still available, just unsorted).
        const replicaIndex = `${baseIndex}_sort_${sort.field}_${sort.direction}`
        try {
          results = await this.algolia.search(replicaIndex, q, params)
        } catch {
          this.logger.warn(`Sort replica "${replicaIndex}" not found — returning unsorted results`)
          results = await this.algolia.search(baseIndex, q, params)
        }
      } else {
        results = await this.algolia.search(baseIndex, q, params)
      }
    }

    if (ml) {
      results = await this.rerank(q, results)
    }

    return results
  }

  // Shared filters — fields that exist on all four indices
  private buildSharedFilters(filters: SearchFiltersDto): string {
    const parts: string[] = []
    this.pushArrayFilter(parts, 'skills', filters.skills)
    this.pushArrayFilter(parts, 'location', filters.location)
    this.pushArrayFilter(parts, 'tags', filters.tags)
    this.pushArrayFilter(parts, 'industries', filters.industries)
    this.pushRangeFilter(parts, 'hourly_rate', filters.hourly_rate_min, filters.hourly_rate_max)
    if (filters.rating_min !== undefined) parts.push(`rating >= ${filters.rating_min}`)
    return parts.join(' AND ')
  }

  // Full filter set for a single-entity search
  private buildAlgoliaFilters(filters: SearchFiltersDto, category: SearchCategory): string {
    const parts: string[] = []

    // Shared fields
    this.pushArrayFilter(parts, 'skills', filters.skills)
    this.pushArrayFilter(parts, 'location', filters.location)
    this.pushArrayFilter(parts, 'tags', filters.tags)
    this.pushArrayFilter(parts, 'industries', filters.industries)
    this.pushRangeFilter(parts, 'hourly_rate', filters.hourly_rate_min, filters.hourly_rate_max)
    if (filters.rating_min !== undefined) parts.push(`rating >= ${filters.rating_min}`)

    if (category === SearchCategory.TALENT) {
      this.pushArrayFilter(parts, 'job_title', filters.job_title)
      this.pushArrayFilter(parts, 'experience_level', filters.experience_level)
      if (filters.availability) parts.push(`availability:"${filters.availability}"`)
    }

    if (category === SearchCategory.TEAMS) {
      if (filters.category) parts.push(`category:"${filters.category}"`)
      this.pushArrayFilter(parts, 'team_size_range', filters.team_size_range)
      this.pushRangeFilter(parts, 'projects_completed', filters.projects_completed_min, filters.projects_completed_max)
      if (filters.client_success_rate_min !== undefined) {
        parts.push(`client_success_rate >= ${filters.client_success_rate_min}`)
      }
      if (filters.availability) parts.push(`availability:"${filters.availability}"`)
      this.pushArrayFilter(parts, 'languages', filters.languages)
    }

    if (category === SearchCategory.PROJECTS) {
      if (filters.project_category) parts.push(`project_category:"${filters.project_category}"`)
      if (filters.project_type) parts.push(`project_type:"${filters.project_type}"`)
      if (filters.industry) parts.push(`industry:"${filters.industry}"`)
      this.pushRangeFilter(parts, 'budget_range', filters.budget_min, filters.budget_max)
      this.pushArrayFilter(parts, 'project_duration_range', filters.project_duration_range)
      this.pushArrayFilter(parts, 'team_size_range', filters.team_size_range)
      this.pushArrayFilter(parts, 'technologies', filters.technologies)
      this.pushArrayFilter(parts, 'additional_tags', filters.additional_tags)
    }

    if (category === SearchCategory.SERVICES) {
      if (filters.service_category) parts.push(`category:"${filters.service_category}"`)
      if (filters.pricing_model) parts.push(`pricing_model:"${filters.pricing_model}"`)
      if (filters.delivery_time) parts.push(`delivery_time:"${filters.delivery_time}"`)
      this.pushRangeFilter(parts, 'price_range', filters.price_min, filters.price_max)
    }

    return parts.join(' AND ')
  }

  // OR logic within a field: (skills:"React" OR skills:"TypeScript")
  private pushArrayFilter(parts: string[], field: string, values?: string[]): void {
    if (!values?.length) return
    if (values.length === 1) {
      parts.push(`${field}:"${values[0]}"`)
    } else {
      parts.push(`(${values.map((v) => `${field}:"${v}"`).join(' OR ')})`)
    }
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
