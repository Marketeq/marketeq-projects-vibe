import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Pool } from 'pg'
import { SearchCategory } from '../dto/search.dto'

interface FallbackHits {
  hits: any[]
  nbHits: number
  page: number
  nbPages: number
  hitsPerPage: number
  fallback: true
}

@Injectable()
export class DbFallbackService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DbFallbackService.name)
  private pool: Pool | null = null

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const connectionString = this.config.get<string>('DATABASE_URL')
    if (!connectionString) {
      this.logger.warn('DATABASE_URL not configured — DB search fallback disabled')
      return
    }
    this.pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 30_000 })
  }

  async onModuleDestroy() {
    await this.pool?.end()
  }

  async search(
    q: string,
    category: SearchCategory,
    limit: number,
    page: number,
  ): Promise<FallbackHits | Record<string, FallbackHits>> {
    if (category === SearchCategory.ALL) {
      const [talent, teams, projects, services] = await Promise.all([
        this.queryEntity(q, SearchCategory.TALENT, limit, page),
        this.queryEntity(q, SearchCategory.TEAMS, limit, page),
        this.queryEntity(q, SearchCategory.PROJECTS, limit, page),
        this.queryEntity(q, SearchCategory.SERVICES, limit, page),
      ])
      return { talent, teams, projects, services }
    }
    return this.queryEntity(q, category, limit, page)
  }

  private async queryEntity(
    q: string,
    category: SearchCategory,
    limit: number,
    page: number,
  ): Promise<FallbackHits> {
    if (!this.pool) return this.empty(limit, page)

    try {
      const offset = page * limit
      const pattern = `%${q}%`
      let rows: any[] = []

      if (category === SearchCategory.TALENT) {
        const result = await this.pool.query(
          `SELECT id, name, headline, location, rating, availability,
                  COUNT(*) OVER () AS total_count
           FROM talent_profiles
           WHERE status = 'active' AND (name ILIKE $1 OR headline ILIKE $1)
           ORDER BY rating DESC NULLS LAST
           LIMIT $2 OFFSET $3`,
          [pattern, limit, offset],
        )
        rows = result.rows
      }

      if (category === SearchCategory.TEAMS) {
        const result = await this.pool.query(
          `SELECT id, title AS team_name, description, rating,
                  COUNT(*) OVER () AS total_count
           FROM teams
           WHERE status = 'published' AND (title ILIKE $1 OR description ILIKE $1)
           ORDER BY rating DESC NULLS LAST
           LIMIT $2 OFFSET $3`,
          [pattern, limit, offset],
        )
        rows = result.rows
      }

      if (category === SearchCategory.PROJECTS) {
        const result = await this.pool.query(
          `SELECT id, title AS project_title, description, category AS project_category,
                  budget, rating,
                  COUNT(*) OVER () AS total_count
           FROM projects
           WHERE status = 'published' AND (title ILIKE $1 OR description ILIKE $1)
           ORDER BY rating DESC NULLS LAST, created_at DESC
           LIMIT $2 OFFSET $3`,
          [pattern, limit, offset],
        )
        rows = result.rows
      }

      if (category === SearchCategory.SERVICES) {
        const result = await this.pool.query(
          `SELECT id, title AS service_title, description, category, rating,
                  COUNT(*) OVER () AS total_count
           FROM services
           WHERE status = 'published' AND (title ILIKE $1 OR description ILIKE $1)
           ORDER BY rating DESC NULLS LAST, created_at DESC
           LIMIT $2 OFFSET $3`,
          [pattern, limit, offset],
        )
        rows = result.rows
      }

      const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0
      const hits = rows.map(({ total_count, ...r }) => ({ objectID: r.id, ...r }))

      return {
        hits,
        nbHits: total,
        page,
        nbPages: Math.ceil(total / limit),
        hitsPerPage: limit,
        fallback: true,
      }
    } catch (err) {
      this.logger.error(
        `DB fallback query failed for category "${category}": ${err instanceof Error ? err.message : String(err)}`,
      )
      return this.empty(limit, page)
    }
  }

  private empty(limit: number, page: number): FallbackHits {
    return { hits: [], nbHits: 0, page, nbPages: 0, hitsPerPage: limit, fallback: true }
  }
}
