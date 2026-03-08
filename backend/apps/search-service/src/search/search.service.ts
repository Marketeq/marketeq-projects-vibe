import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom } from 'rxjs'
import { AlgoliaClient, INDICES } from './algolia.client'
import { SearchDto, SearchCategory } from '../dto/search.dto'

@Injectable()
export class SearchService {
  constructor(
    private readonly algolia: AlgoliaClient,
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async search(dto: SearchDto) {
    const { q, category = SearchCategory.ALL, limit = 20, page = 0, ml, skills, location, industry } = dto

    const filters = this.buildFilters({ skills, location, industry })
    const params = { hitsPerPage: limit, page, filters: filters || undefined }

    let results: any

    if (category === SearchCategory.ALL) {
      const queries = Object.values(INDICES).map((indexName) => ({
        indexName,
        query: q,
        params,
      }))
      const multiResults = await this.algolia.multiSearch(queries)
      results = {
        talent: multiResults[0],
        teams: multiResults[1],
        projects: multiResults[2],
        services: multiResults[3],
      }
    } else {
      const indexName = INDICES[category as keyof typeof INDICES] ?? category
      results = await this.algolia.search(indexName, q, params)
    }

    if (ml) {
      results = await this.rerank(q, results)
    }

    return results
  }

  private buildFilters(opts: { skills?: string; location?: string; industry?: string }): string {
    const parts: string[] = []
    if (opts.skills) parts.push(`skills:"${opts.skills}"`)
    if (opts.location) parts.push(`location:"${opts.location}"`)
    if (opts.industry) parts.push(`industry:"${opts.industry}"`)
    return parts.join(' AND ')
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
    } catch {
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
