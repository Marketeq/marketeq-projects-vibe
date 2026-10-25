import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom, timeout } from 'rxjs'
import { Pool } from 'pg'
import { SearchCategory, SearchFiltersDto, SortDto, SortDirection } from '../dto/search.dto'
import {
  FILTER_VALUE_SOURCES,
  normalizeLooseText,
  normalizedTextSql,
} from '../config/search-config'

/**
 * Categories derived for a profile by category-service rather than stored on
 * it. Keyed back to the profile so a single match call serves both the filter
 * and the chips on the result card.
 */
interface DerivedCategories {
  categories: string[]
  subcategories: string[]
}

/**
 * Bounded so an unreachable or slow matcher degrades to an empty category
 * result rather than hanging the search request. Generous enough to cover a
 * cold taxonomy rebuild on category-service's first request after a restart.
 */
const CATEGORY_MATCH_TIMEOUT_MS = 10_000

interface FallbackHits {
  hits: any[]
  nbHits: number
  page: number
  nbPages: number
  hitsPerPage: number
  fallback: true
}

// G1 - a talent profile is listed only when its account has a KNOWN OPEN gate. user-service owns
// the last-known state (user_service.talent_gate_state, migration 1799500000000); this is a
// semi-join against it, and the partial expression index on ("userId"::text) WHERE "gateOpen" serves
// the text comparison. The account is the one the talent index is keyed on: source_id, else uuid.
const openTalentSqlFor = (rel: string): string => `EXISTS (SELECT 1 FROM user_service.talent_gate_state g
               WHERE g."userId"::text = COALESCE(NULLIF(${rel}.source_id::text, ''), ${rel}.uuid::text)
                 AND g."gateOpen" = true)`
const OPEN_TALENT_SQL = openTalentSqlFor('talent_profiles')

// G5 - a listing whose OWNER has no known open gate is withheld from marketplace
// discovery (no public owner exemption). The gate state is listings-service's own
// last-known table, kept current by `identity.gate_changed` events, so this is a
// plain join, never a live identity lookup. Ownerless listings (CMS, seeded) are
// not subject to it, and an owner whose state has never been received is hidden.
// Display only: the stored listing and its published status are never changed;
// it reappears by itself when the owner's gate opens.
// The owning account of a listing row, the same one listings-service gates on: a
// service falls back to a createdBy that is a real user id when it has no userId
// (system values such as 'n8n-seed' are not owners); a project is owned by userId.
const PROJECT_OWNER_SQL = `(CASE WHEN listings.project."listingType" = 'service'
                 THEN COALESCE(listings.project."userId",
                   CASE WHEN listings.project."createdBy" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                        THEN listings.project."createdBy"::uuid END)
                 ELSE listings.project."userId" END)`
const PROJECT_OWNER_GATE_SQL = `AND (${PROJECT_OWNER_SQL} IS NULL OR EXISTS (
               SELECT 1 FROM listings.account_gate_state g
               WHERE g."userId" = ${PROJECT_OWNER_SQL} AND g."gateOpen"))`
// listings.teams.createdBy is free text (system values exist), so only a real
// user id is an owner to gate.
const TEAM_OWNER_GATE_SQL = `AND ("createdBy" IS NULL
               OR "createdBy" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
               OR EXISTS (
                 SELECT 1 FROM listings.account_gate_state g
                 WHERE g."userId"::text = listings.teams."createdBy" AND g."gateOpen"))`

@Injectable()
export class DbFallbackService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DbFallbackService.name)
  private pool: Pool | null = null
  private talentProfileExtras: { locationSql: string; avatarSql: string } | null = null
  private talentNameSql: Promise<string> | null = null

  // Maps a category + requested sort field to a real, hardcoded SQL ORDER BY
  // expression. Only fields present here are honored — sort.field is looked
  // up as an object key (never string-interpolated), so this cannot be used
  // for SQL injection even though the map's values are raw SQL fragments.
  private static readonly SORT_COLUMNS: Record<string, Record<string, string>> = {
    talent: {
      created_at: 'created_at',
      hourly_rate:
        '(SELECT MIN(jt.rate) FROM cms.talent_profiles_job_titles jt WHERE jt._parent_id = talent_profiles.id)',
      // 'rating' intentionally omitted — cms.talent_profiles has no rating
      // column; requesting it falls through to the default order below.
    },
    teams: {
      created_at: '"createdAt"',
      // 'rating' and 'hourly_rate' intentionally omitted — the live
      // listings.teams table has neither column (the TypeORM entity
      // declares a `rating` field, but no migration has actually added it
      // to the schema yet — verified via information_schema). Requesting
      // either falls through to the default order below rather than
      // erroring.
    },
    projects: {
      created_at: '"createdAt"',
      budget: 'budget',
      // 'rating' intentionally omitted — same schema-drift reason as teams.
    },
    services: {
      created_at: '"createdAt"',
      // Services store priceMin/priceMax (a range), not one price column.
      // priceMin is used as the sort proxy for both directions since
      // there's no single backing column for "price".
      price_range: '"priceMin"',
      // 'rating' intentionally omitted — same schema-drift reason as teams.
    },
  }

  private static readonly DEFAULT_ORDER: Record<string, string> = {
    talent: 'created_at DESC NULLS LAST',
    teams: '"createdAt" DESC',
    projects: '"createdAt" DESC',
    services: '"createdAt" DESC',
  }

  private buildOrderBy(category: SearchCategory, sort?: SortDto): string {
    const fallback = DbFallbackService.DEFAULT_ORDER[category]
    if (!sort) return fallback
    const columnExpr = DbFallbackService.SORT_COLUMNS[category]?.[sort.field]
    if (!columnExpr) return fallback // no backing column — graceful no-op
    const direction = sort.direction === SortDirection.ASC ? 'ASC' : 'DESC'
    return `${columnExpr} ${direction}`
  }

  constructor(
    private readonly config: ConfigService,
    @Inject('CATEGORY_CLIENT')
    private readonly categoryClient: ClientProxy,
  ) {}

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

  // Applies whatever subset of SearchFiltersDto has a real column/join to
  // filter against in the fallback tables. Fields with no backing column
  // (e.g. talent location, team hourly rate, project duration buckets) are
  // silently ignored here — see the per-category NOTE comments below.
  async search(
    q: string,
    category: SearchCategory,
    limit: number,
    page: number,
    filters?: SearchFiltersDto,
    sort?: SortDto,
  ): Promise<FallbackHits | Record<string, FallbackHits>> {
    if (category === SearchCategory.ALL) {
      const [talent, teams, projects, services] = await Promise.all([
        this.queryEntity(q, SearchCategory.TALENT, limit, page, filters, sort),
        this.queryEntity(q, SearchCategory.TEAMS, limit, page, filters, sort),
        this.queryEntity(q, SearchCategory.PROJECTS, limit, page, filters, sort),
        this.queryEntity(q, SearchCategory.SERVICES, limit, page, filters, sort),
      ])
      return { talent, teams, projects, services }
    }
    return this.queryEntity(q, category, limit, page, filters, sort)
  }

  // ── Filter-clause builders ────────────────────────────────────────────
  // All values are pushed onto `params` and referenced by position — never
  // interpolated into the query string — to keep this injection-safe.

  /** `column` is a text[] column. Matches if any element case-insensitively equals one of `values`. */
  private arrayContainsAny(params: any[], column: string, values?: string[]): string | null {
    if (!values?.length) return null
    const idx = params.push(values.map((v) => v.toLowerCase()))
    return `EXISTS (SELECT 1 FROM unnest("${column}") v(val) WHERE lower(v.val) = ANY($${idx}::text[]))`
  }

  /** `column` is a scalar text column. Matches case-insensitively against any of `values`. */
  private scalarInAny(params: any[], column: string, values?: string[]): string | null {
    if (!values?.length) return null
    const idx = params.push(values.map((v) => v.toLowerCase()))
    return `lower("${column}") = ANY($${idx}::text[])`
  }

  /** `column` is a scalar text column. Substring match (ILIKE) against any of `values`. */
  private scalarIlikeAny(params: any[], column: string, values?: string[]): string | null {
    if (!values?.length) return null
    const escaped = values.map((v) => `%${v.replace(/([%_\\])/g, '\\$1')}%`)
    const idx = params.push(escaped)
    return `"${column}" ILIKE ANY($${idx}::text[])`
  }

  /**
   * The free-text half of the WHERE clause: the query pattern ($1) matched
   * against every attribute the Algolia index declares searchable for this
   * entity, resolved to its real backing column. Keep the arguments in sync
   * with ALGOLIA_INDEX_SETTINGS[<index>].searchableAttributes in
   * `config/search-config.ts` — when the two drift, the fallback silently
   * returns fewer hits than Algolia would for the same query, which is not
   * visible from the client because every hit still comes back HTTP 200.
   *
   * `textExprs` are SQL expressions yielding text (usually a quoted column,
   * but `overview::text` and the like are fine). `arrayColumns` are text[]
   * columns, matched when ANY element matches — that is what makes a listing
   * tagged "Linux" in `skills` findable by searching for "linux". A NULL
   * array unnests to zero rows, so it correctly fails to match.
   *
   * ESCAPE '\\' renders as ESCAPE '\' in the emitted SQL. It has to be
   * written doubled here: in a template literal `'\'` collapses to `''`,
   * which Postgres reads as "no escape character at all" — that disables
   * the wildcard escaping queryEntity applies to `q`, and any query
   * containing % or _ then matches nothing.
   */
  private freeTextClause(textExprs: string[], arrayColumns: string[] = []): string {
    const parts = [
      ...textExprs.map((expr) => `${expr} ILIKE $1 ESCAPE '\\'`),
      ...arrayColumns.map(
        (col) =>
          `EXISTS (SELECT 1 FROM unnest("${col}") v(val) WHERE v.val ILIKE $1 ESCAPE '\\')`,
      ),
    ]
    return `(${parts.join(' OR ')})`
  }

  /** `column` is a numeric column. */
  private numRange(params: any[], column: string, min?: number, max?: number): string[] {
    const clauses: string[] = []
    if (min !== undefined) clauses.push(`"${column}" >= $${params.push(min)}`)
    if (max !== undefined) clauses.push(`"${column}" <= $${params.push(max)}`)
    return clauses
  }

  /** Parses labels like "2 - 5 members" / "20+ members" into a BETWEEN/>= clause on a numeric column. */
  private sizeRangeAny(params: any[], column: string, labels?: string[]): string | null {
    if (!labels?.length) return null
    const clauses: string[] = []
    for (const label of labels) {
      const range = label.match(/(\d+)\s*-\s*(\d+)/)
      if (range) {
        clauses.push(`("${column}" BETWEEN $${params.push(Number(range[1]))} AND $${params.push(Number(range[2]))})`)
        continue
      }
      const openEnded = label.match(/(\d+)\s*\+/)
      if (openEnded) {
        clauses.push(`("${column}" >= $${params.push(Number(openEnded[1]))})`)
      }
    }
    return clauses.length ? `(${clauses.join(' OR ')})` : null
  }



  /**
   * Parses month-bucket labels like "1 - 3 months" / "24 + months" and
   * matches them against `column`, a free-text duration column formatted
   * as "N weeks" (e.g. "16 weeks"). Converts months to weeks at 4
   * weeks/month, so "1 - 3 months" covers 4-12 weeks.
   */
  private durationWeeksRangeAny(params: any[], column: string, labels?: string[]): string | null {
    if (!labels?.length) return null
    const weeksExpr = `NULLIF(regexp_replace("${column}", '[^0-9]', '', 'g'), '')::numeric`
    const clauses: string[] = []
    for (const label of labels) {
      const range = label.match(/(\d+)\s*-\s*(\d+)/)
      if (range) {
        const minWeeks = Number(range[1]) * 4
        const maxWeeks = Number(range[2]) * 4
        clauses.push(`(${weeksExpr} BETWEEN $${params.push(minWeeks)} AND $${params.push(maxWeeks)})`)
        continue
      }
      const openEnded = label.match(/(\d+)\s*\+/)
      if (openEnded) {
        const minWeeks = Number(openEnded[1]) * 4
        clauses.push(`(${weeksExpr} >= $${params.push(minWeeks)})`)
      }
    }
    return clauses.length ? `(${clauses.join(' OR ')})` : null
  }

  private async queryEntity(
    q: string,
    category: SearchCategory,
    limit: number,
    page: number,
    filters?: SearchFiltersDto,
    sort?: SortDto,
  ): Promise<FallbackHits> {
    if (!this.pool) return this.empty(limit, page)

    try {
      const offset = page * limit
      // Escape literal ILIKE wildcard characters so a user typing "%" or "_"
      // doesn't get unintended wildcard matching.
      const escaped = q.replace(/([%_\\])/g, '\\$1')
      const pattern = `%${escaped}%`
      const orderBy = this.buildOrderBy(category, sort)
      let rows: any[] = []

      // NOTE: table names/columns below match the actual per-service schemas
      // (listings.project, listings.teams, cms.talent_profiles) — NOT the
      // unqualified public.* names Algolia's index config implies.
      //
      // Projects and services are NOT separate tables. Both live in
      // listings.project and are told apart by "listingType" ('project' /
      // 'service'), which is how listings-service itself reads them
      // (ProjectsService and ServiceService both filter on it). Every query
      // here that reads one of them must carry the discriminator or it will
      // return the other's rows too. Keep this in sync with each service's
      // entity definitions if they change.
      if (category === SearchCategory.TALENT) {
        const params: any[] = [pattern]
        const clauses: string[] = []
        const nameSql = await this.resolveTalentNameSql()
        const { locationSql, avatarSql } = await this.resolveTalentProfileExtras()

        // cms.talent_profiles has no skills/industries/languages/rate columns
        // on the main row — Payload stores those array fields as child
        // tables keyed by _parent_id. Location, tags, and rating have no
        // backing column anywhere in this table, so those filters are
        // no-ops for the DB fallback.
        const skillsClause = this.arrayContainsAnyJoin(
          params,
          'cms.talent_profiles_skills',
          'name',
          filters?.skills,
        )
        if (skillsClause) clauses.push(skillsClause)

        const industriesClause = this.arrayContainsAnyJoin(
          params,
          'cms.talent_profiles_industries',
          'name',
          filters?.industries,
        )
        if (industriesClause) clauses.push(industriesClause)

        const languagesClause = this.arrayContainsAnyJoin(
          params,
          'cms.talent_profiles_languages',
          'language',
          filters?.languages,
        )
        if (languagesClause) clauses.push(languagesClause)

        // Talent categories are no longer stored on the profile — they're
        // derived by semantically matching job titles and work-history roles
        // against the taxonomy (category-service owns both the taxonomy and
        // the matcher). So there is no column to put in a WHERE clause here.
        //
        // Instead, every other filter runs first in SQL, and the surviving
        // candidates are sent to category-service in one call; the ids it
        // matches become an `id = ANY(...)` clause. Doing it in this order is
        // what keeps the matching cost proportional to the filtered set
        // rather than the whole talent table, and it keeps sorting and
        // pagination in SQL where they belong.
        const selectedCategories = [
          ...(filters?.category ?? []),
          ...(filters?.subcategory ?? []),
        ]
        let derivedByProfileId: Map<string, DerivedCategories> | null = null

        if (selectedCategories.length) {
          const matched = await this.semanticCategoryMatch(
            selectedCategories,
            pattern,
            clauses,
            params,
            nameSql,
          )
          // No match is a real, empty answer — not a reason to ignore the
          // filter and hand back everybody.
          if (!matched.size) return this.empty(limit, page)
          derivedByProfileId = matched
          // id::text, because the matcher round-trips ids as strings while
          // cms.talent_profiles.id is an integer.
          clauses.push(
            `id::text = ANY($${params.push([...matched.keys()])}::text[])`,
          )
        }

        if (filters?.job_title?.length) {
          // Loose matching, identical to what SearchService.expandJobTitleFilter
          // does against the Algolia facet: both sides are reduced to lowercase
          // alphanumeric words separated by single spaces, then compared by
          // substring — so "designer" finds "Product designer" and "full stack
          // engineer" finds "Full-stack engineer". Normalising the column is
          // what makes the punctuation-insensitive half work; matching the raw
          // headline would miss the hyphen cases.
          //
          // LIKE rather than ILIKE because both sides are already lowercased.
          const jobTitlePatterns = filters.job_title
            .map(normalizeLooseText)
            .filter(Boolean)
            .map((v) => `%${v.replace(/([%_\\])/g, '\\$1')}%`)
          if (jobTitlePatterns.length) {
            const idx = params.push(jobTitlePatterns)
            clauses.push(
              `EXISTS (SELECT 1 FROM cms.talent_profiles_job_titles jt WHERE jt._parent_id = talent_profiles.id AND ${normalizedTextSql('jt.headline')} LIKE ANY($${idx}::text[]))`,
            )
          }
        }

        if (filters?.hourly_rate_min !== undefined || filters?.hourly_rate_max !== undefined) {
          const rateClauses: string[] = []
          if (filters.hourly_rate_min !== undefined) {
            rateClauses.push(`jt.rate >= $${params.push(filters.hourly_rate_min)}`)
          }
          if (filters.hourly_rate_max !== undefined) {
            rateClauses.push(`jt.rate <= $${params.push(filters.hourly_rate_max)}`)
          }
          clauses.push(
            `EXISTS (SELECT 1 FROM cms.talent_profiles_job_titles jt WHERE jt._parent_id = talent_profiles.id AND ${rateClauses.join(' AND ')})`,
          )
        }

        if (filters?.availability?.length) {
          clauses.push(`availability::text = ANY($${params.push(filters.availability)}::text[])`)
        }

        const experienceClause = this.experienceYearsRangeAny(params, filters?.experience_level)
        if (experienceClause) clauses.push(experienceClause)

        const filterSql = clauses.length ? `AND ${clauses.join(' AND ')}` : ''
        // G1 - marketplace discovery gate, applied INSIDE the query. A talent is listed only
        // while its account has a KNOWN OPEN gate in user-service's locally kept last-known state
        // (user_service.talent_gate_state, fed by identity's gate_changed events): a semi-join,
        // evaluated before the COUNT and before LIMIT/OFFSET. So the total, the page count and the
        // page are all over visible talent, in the original ranking order, in two bounded
        // queries - no id list of every matching talent is loaded, identity is not called, and a
        // hidden talent's profile data is never read. The account is the same one the index is
        // keyed on (source_id, else the profile uuid). An account whose state was never received
        // has no row and is hidden. If the state table cannot be read, nobody is listed.
        const baseWhere = `status = 'active'
             AND ${this.freeTextClause([nameSql, 'username', 'overview::text'])}
             ${filterSql}
             AND ${OPEN_TALENT_SQL}`
        let total: number
        let pageIds: number[]
        try {
          const counted = await this.pool.query(
            `SELECT COUNT(*)::int AS n FROM cms.talent_profiles WHERE ${baseWhere}`,
            params,
          )
          total = Number(counted.rows[0]?.n ?? 0)
          if (total === 0 || page * limit >= total) {
            pageIds = []
          } else {
            const pageParams = [...params, limit, page * limit]
            const paged = await this.pool.query(
              `SELECT id FROM cms.talent_profiles
               WHERE ${baseWhere}
               ORDER BY ${orderBy}, id ASC
               LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
              pageParams,
            )
            pageIds = paged.rows.map((r) => r.id)
          }
        } catch (err) {
          if (!/talent_gate_state/i.test(err instanceof Error ? err.message : String(err))) throw err
          this.logger.warn(
            `Talent gate state unreadable; showing no talent: ${err instanceof Error ? err.message : String(err)}`,
          )
          return this.empty(limit, page)
        }

        let hits: any[] = []
        if (pageIds.length) {
          const detail = await this.pool.query(
            `SELECT id, ${nameSql} AS name, username, availability, ${locationSql} AS location, ${avatarSql} AS avatar_url,
                    (SELECT MIN(jt.rate) FROM cms.talent_profiles_job_titles jt WHERE jt._parent_id = talent_profiles.id) AS hourly_rate,
                    (SELECT jt.headline FROM cms.talent_profiles_job_titles jt WHERE jt._parent_id = talent_profiles.id ORDER BY jt._order LIMIT 1) AS job_title,
                    (SELECT array_agg(s.name ORDER BY s._order) FROM cms.talent_profiles_skills s WHERE s._parent_id = talent_profiles.id) AS skills,
                    (SELECT EXTRACT(YEAR FROM AGE(now(), MIN(we.start_date)))::int FROM cms.talent_profiles_work_experience we WHERE we._parent_id = talent_profiles.id) AS years_of_experience
             FROM cms.talent_profiles
             WHERE id = ANY($1::int[])`,
            [pageIds],
          )
          const byId = new Map<number, any>(detail.rows.map((r) => [r.id, r]))
          hits = pageIds
            .map((id) => byId.get(id))
            .filter(Boolean)
            .map((r) => ({
              objectID: r.id,
              id: r.id,
              name: r.name || r.username,
              username: r.username,
              availability: r.availability,
              location: r.location || undefined,
              avatar_url: r.avatar_url || undefined,
              hourly_rate: r.hourly_rate != null ? Number(r.hourly_rate) : undefined,
              job_title: r.job_title ?? undefined,
              skills: Array.isArray(r.skills) ? r.skills : undefined,
              // Derived, not stored - only present when a category filter was
              // applied, since that's the only time we've paid to match.
              categories: derivedByProfileId?.get(String(r.id))?.categories,
              subcategories: derivedByProfileId?.get(String(r.id))?.subcategories,
              years_of_experience: r.years_of_experience != null ? Number(r.years_of_experience) : undefined,
            }))
        }

        return {
          hits,
          nbHits: total,
          page,
          nbPages: Math.ceil(total / limit),
          hitsPerPage: limit,
          fallback: true,
        }
      }

      if (category === SearchCategory.TEAMS) {
        const params: any[] = [pattern]
        const clauses: string[] = []

        const skillsClause = this.arrayContainsAny(params, 'skills', filters?.skills)
        if (skillsClause) clauses.push(skillsClause)

        // Tag and Additional Tags are separate sidebar facets, so they must
        // be independent AND'd clauses even though they both match against
        // the same `tags` column (there's no dedicated additional_tags
        // column) — merging their values into one OR'd array would let a
        // match on either satisfy both filters at once, which is wrong.
        const tagsClause = this.arrayContainsAny(params, 'tags', filters?.tags)
        if (tagsClause) clauses.push(tagsClause)

        const additionalTagsClause = this.arrayContainsAny(params, 'tags', filters?.additional_tags)
        if (additionalTagsClause) clauses.push(additionalTagsClause)

        const industryValues = [
          ...(filters?.industries ?? []),
          ...(filters?.industry ? [filters.industry] : []),
        ]
        const industryClause = this.arrayContainsAny(params, 'industry', industryValues)
        if (industryClause) clauses.push(industryClause)

        // "Team Specialty" in the UI has no dedicated column — filtered
        // against `category`, same as service/project category filters.
        const categoryClause = this.scalarInAny(params, 'category', filters?.category)
        if (categoryClause) clauses.push(categoryClause)

        const teamSizeClause = this.sizeRangeAny(params, 'teamSize', filters?.team_size_range)
        if (teamSizeClause) clauses.push(teamSizeClause)

        // No location/hourlyRate/availability/languages/rating columns on
        // this table — those filters are no-ops for the DB fallback.
        const filterSql = clauses.length ? `AND ${clauses.join(' AND ')}` : ''
        const result = await this.pool.query(
          `SELECT id, title AS team_name, description,
                  COUNT(*) OVER () AS total_count
           FROM listings.teams
           WHERE status = 'published'
             AND ${this.freeTextClause(['title', 'description'])}
             ${TEAM_OWNER_GATE_SQL}
             ${filterSql}
           ORDER BY ${orderBy}
           LIMIT $${params.push(limit)} OFFSET $${params.push(offset)}`,
          params,
        )
        rows = result.rows
      }

      if (category === SearchCategory.PROJECTS) {
        const params: any[] = [pattern]
        const clauses: string[] = []

        const skillsClause = this.arrayContainsAny(params, 'skills', filters?.skills)
        if (skillsClause) clauses.push(skillsClause)

        // Tag and Additional Tags are separate sidebar facets, so they must
        // be independent AND'd clauses even though they both match against
        // the same `tags` column (there's no dedicated additional_tags
        // column) — merging their values into one OR'd array would let a
        // match on either satisfy both filters at once, which is wrong.
        const tagsClause = this.arrayContainsAny(params, 'tags', filters?.tags)
        if (tagsClause) clauses.push(tagsClause)

        const additionalTagsClause = this.arrayContainsAny(params, 'tags', filters?.additional_tags)
        if (additionalTagsClause) clauses.push(additionalTagsClause)

        const industryValues = [
          ...(filters?.industries ?? []),
          ...(filters?.industry ? [filters.industry] : []),
        ]
        // PLURAL on listings.project, unlike listings.teams' singular
        // `industry` — the Algolia attribute is singular for both, so only the
        // DB column differs.
        const industryClause = this.arrayContainsAny(params, 'industries', industryValues)
        if (industryClause) clauses.push(industryClause)

        const locationClause = this.arrayContainsAny(params, 'locations', filters?.location)
        if (locationClause) clauses.push(locationClause)

        if (filters?.technologies?.length) {
          const idx = params.push(filters.technologies.map((v) => v.toLowerCase()))
          clauses.push(
            `(EXISTS (SELECT 1 FROM unnest("programmingLanguages") v(val) WHERE lower(v.val) = ANY($${idx}::text[]))` +
              ` OR EXISTS (SELECT 1 FROM unnest("developmentTech") v(val) WHERE lower(v.val) = ANY($${idx}::text[])))`,
          )
        }

        const categoryClause = this.scalarInAny(params, 'category', filters?.project_category)
        if (categoryClause) clauses.push(categoryClause)

        // Matches the same `category` column as the clause above — the
        // sidebar sends expanded taxonomy name lists and a subcategory's
        // names are always a subset of its parent's, so the two AND'd
        // clauses narrow within the selected branch. The row's own
        // `subcategories` column is NOT used: it holds free-form editorial
        // tags ("SaaS", "Research"), not taxonomy names, so matching on it
        // would pull in listings from unrelated categories.
        const subcategoryClause = this.scalarInAny(params, 'category', filters?.project_subcategory)
        if (subcategoryClause) clauses.push(subcategoryClause)

        const projectTypeClause = this.scalarInAny(params, 'projectType', filters?.project_type)
        if (projectTypeClause) clauses.push(projectTypeClause)

        clauses.push(...this.numRange(params, 'budget', filters?.budget_min, filters?.budget_max))

        const durationClause = this.durationWeeksRangeAny(params, 'duration', filters?.project_duration_range)
        if (durationClause) clauses.push(durationClause)

        const teamSizeClause = this.sizeRangeAny(params, 'teamSize', filters?.team_size_range)
        if (teamSizeClause) clauses.push(teamSizeClause)

        const filterSql = clauses.length ? `AND ${clauses.join(' AND ')}` : ''
        const result = await this.pool.query(
          `SELECT id, title AS project_title, description, category AS project_category,
                  "projectType" AS project_type, "teamSize" AS team_size,
                  budget, duration, "mediaUrls" AS media_urls, skills,
                  COUNT(*) OVER () AS total_count
           FROM listings.project
           WHERE status = 'published' AND "listingType" = $${params.push('project')}
             AND ${this.freeTextClause(
               ['title', 'description', '"category"'],
               // skills/tags/industries/programmingLanguages/developmentTech
               // back the searchable `skills`, `tags`, `industry` and
               // `technologies` attributes respectively — `technologies` is
               // split across the two tech columns, same as the technologies
               // filter above.
               ['skills', 'tags', 'industries', 'programmingLanguages', 'developmentTech'],
             )}
             ${PROJECT_OWNER_GATE_SQL}
             ${filterSql}
           ORDER BY ${orderBy}
           LIMIT $${params.push(limit)} OFFSET $${params.push(offset)}`,
          params,
        )
        rows = result.rows.map((r) => ({
          ...r,
          media_url: Array.isArray(r.media_urls) ? r.media_urls[0] : undefined,
          media_urls: undefined,
        }))
      }

      if (category === SearchCategory.SERVICES) {
        const params: any[] = [pattern]
        const clauses: string[] = []

        const skillsClause = this.arrayContainsAny(params, 'skills', filters?.skills)
        if (skillsClause) clauses.push(skillsClause)

        // Tag and Additional Tags are separate sidebar facets, so they must
        // be independent AND'd clauses even though they both match against
        // the same `tags` column (there's no dedicated additional_tags
        // column) — merging their values into one OR'd array would let a
        // match on either satisfy both filters at once, which is wrong.
        const tagsClause = this.arrayContainsAny(params, 'tags', filters?.tags)
        if (tagsClause) clauses.push(tagsClause)

        const additionalTagsClause = this.arrayContainsAny(params, 'tags', filters?.additional_tags)
        if (additionalTagsClause) clauses.push(additionalTagsClause)

        const industryValues = [
          ...(filters?.industries ?? []),
          ...(filters?.industry ? [filters.industry] : []),
        ]
        // PLURAL on listings.project — see the projects branch above.
        const industryClause = this.arrayContainsAny(params, 'industries', industryValues)
        if (industryClause) clauses.push(industryClause)

        const locationClause = this.arrayContainsAny(params, 'locations', filters?.location)
        if (locationClause) clauses.push(locationClause)

        if (filters?.technologies?.length) {
          const idx = params.push(filters.technologies.map((v) => v.toLowerCase()))
          clauses.push(
            `(EXISTS (SELECT 1 FROM unnest("programmingLanguages") v(val) WHERE lower(v.val) = ANY($${idx}::text[]))` +
              ` OR EXISTS (SELECT 1 FROM unnest("developmentTech") v(val) WHERE lower(v.val) = ANY($${idx}::text[])))`,
          )
        }

        const categoryClause = this.scalarInAny(params, 'category', filters?.service_category)
        if (categoryClause) clauses.push(categoryClause)

        // Same `category` column as above — see the projects branch.
        const subcategoryClause = this.scalarInAny(params, 'category', filters?.service_subcategory)
        if (subcategoryClause) clauses.push(subcategoryClause)

        clauses.push(...this.numRange(params, 'priceMin', filters?.price_min, undefined))
        clauses.push(...this.numRange(params, 'priceMax', undefined, filters?.price_max))

        // Pricing Model is a no-op for the DB fallback: listings.project has
        // no "pricingModel" column and no listings entity declares one — it
        // only exists on the project-sync contract. Filtering or selecting it
        // errors the whole query, which is why it is neither here nor in the
        // SELECT below. Re-add both halves if the column is ever added.
        // const pricingModelClause = this.scalarInAny(params, 'pricingModel', filters?.pricing_model)
        // if (pricingModelClause) clauses.push(pricingModelClause)

        // Team Size is hidden on the Services sidebar and the backing column
        // has been dropped — see search-config.
        // const teamSizeClause = this.sizeRangeAny(params, 'teamSize', filters?.team_size_range)
        // if (teamSizeClause) clauses.push(teamSizeClause)

        const filterSql = clauses.length ? `AND ${clauses.join(' AND ')}` : ''
        const result = await this.pool.query(
          `SELECT id, title AS service_title, description, category,
                  "priceMin" AS price_min, "priceMax" AS price_max, "deliveryTime" AS timeline,
                  "mediaUrls" AS media_urls, skills,
                  COUNT(*) OVER () AS total_count
           FROM listings.project
           WHERE status = 'published' AND "listingType" = $${params.push('service')}
             AND ${this.freeTextClause(
               ['title', 'description', '"category"'],
               ['skills', 'tags'],
             )}
             ${PROJECT_OWNER_GATE_SQL}
             ${filterSql}
           ORDER BY ${orderBy}
           LIMIT $${params.push(limit)} OFFSET $${params.push(offset)}`,
          params,
        )
        rows = result.rows.map((r) => ({
          ...r,
          budget_range: r.price_min != null && r.price_max != null
            ? `$${r.price_min} - $${r.price_max}`
            : undefined,
          media_url: Array.isArray(r.media_urls) ? r.media_urls[0] : undefined,
          media_urls: undefined,
        }))
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

  // Where each entity's taxonomy category name is actually stored, for
  // distinctCategoryNames below. Same tables/columns the PROJECTS and
  // SERVICES branches of queryEntity filter against — keep in sync with them.
  //
  // Talent is absent because it stores no category at all — its categories are
  // derived semantically from job titles, so distinctTalentCategoryNames
  // answers from the taxonomy instead of from a column.
  private static readonly CATEGORY_SOURCES: Record<
    string,
    { table: string; column: string; listingType: string }
  > = {
    projects: { table: 'listings.project', column: 'category', listingType: 'project' },
    services: { table: 'listings.project', column: 'category', listingType: 'service' },
  }

  // Talent's counterpart of CATEGORY_SOURCES. Payload stores both arrays as
  // child tables keyed by _parent_id, and a taxonomy name can sit in either
  // (see CATEGORY_NAME_ATTRIBUTE), so every talent category query — the
  // filters in the TALENT branch of queryEntity and distinctTalentCategoryNames
  // below — spans both. Keep this list, CATEGORY_NAME_ATTRIBUTE.talent and
  // those two call sites in step, or the sidebar could offer a name the
  // filter never looks for.
  /**
   * Upper bound on how many profiles are sent to the matcher in one request.
   *
   * Semantic matching is per-candidate work, so an unfiltered category-only
   * search must not turn into "embed the entire talent table". The cheap SQL
   * filters run first and this caps whatever survives them; past the cap the
   * page is built from the first N candidates in sort order, which is the
   * same set the user would have paged into anyway.
   */
  private static readonly MAX_SEMANTIC_CANDIDATES = 2000

  /**
   * Ask category-service which of the candidate profiles semantically match
   * the categories the user picked in the sidebar.
   *
   * Runs the already-built filter clauses first so only the surviving rows are
   * scored, then hands the whole set over in a single call — one round trip
   * with a shared embedding cache, rather than one per profile.
   *
   * Returns a map of profile id to the categories that were derived for it, so
   * the caller can both filter by id and render chips without matching twice.
   *
   * G1: only talent with a known open gate are candidates, so a hidden talent's text is never
   * sent for scoring and the candidate cap is spent on talent that can actually be listed.
   */
  private async semanticCategoryMatch(
    selected: string[],
    pattern: string,
    clauses: string[],
    params: any[],
    nameSql: string,
  ): Promise<Map<string, DerivedCategories>> {
    const empty = new Map<string, DerivedCategories>()
    if (!this.pool) return empty

    // Built on a copy: these params belong to this probe query only, and the
    // caller goes on to push its own LIMIT/OFFSET onto the original array.
    const probeParams = [...params]
    const filterSql = clauses.length ? `AND ${clauses.join(' AND ')}` : ''

    let candidates: { id: string; texts: string[] }[]
    try {
      const result = await this.pool.query(
        `SELECT id,
                COALESCE(
                  (SELECT array_agg(jt.headline) FROM cms.talent_profiles_job_titles jt
                    WHERE jt._parent_id = talent_profiles.id AND jt.headline IS NOT NULL),
                  ARRAY[]::text[]
                )
                ||
                COALESCE(
                  (SELECT array_agg(we.role) FROM cms.talent_profiles_work_experience we
                    WHERE we._parent_id = talent_profiles.id AND we.role IS NOT NULL),
                  ARRAY[]::text[]
                ) AS texts
           FROM cms.talent_profiles
          WHERE status = 'active'
            AND ${this.freeTextClause([nameSql, 'username', 'overview::text'])}
            ${filterSql}
            AND ${OPEN_TALENT_SQL}
          LIMIT ${DbFallbackService.MAX_SEMANTIC_CANDIDATES}`,
        probeParams,
      )
      candidates = result.rows
        .map((r) => ({
          id: String(r.id),
          texts: Array.isArray(r.texts) ? r.texts.filter(Boolean) : [],
        }))
        .filter((c) => c.texts.length > 0)
    } catch (err) {
      this.logger.error(
        `Talent category candidate query failed: ${err instanceof Error ? err.message : String(err)}`,
      )
      return empty
    }

    if (!candidates.length) return empty

    try {
      const matches = await firstValueFrom(
        this.categoryClient
          .send<{ id: string; categories: string[]; subcategories: string[] }[]>(
            'category.match_filter',
            { selected, candidates },
          )
          .pipe(timeout(CATEGORY_MATCH_TIMEOUT_MS)),
      )
      const out = new Map<string, DerivedCategories>()
      for (const m of matches ?? []) {
        out.set(String(m.id), {
          categories: m.categories ?? [],
          subcategories: m.subcategories ?? [],
        })
      }
      return out
    } catch (err) {
      this.logger.error(
        `Talent category matching unavailable: ${err instanceof Error ? err.message : String(err)}`,
      )
      return empty
    }
  }

  /**
   * Every category name that at least one live record of this entity actually
   * carries. Backs GET /search/category-values when Algolia is unavailable (or
   * has nothing indexed), so the sidebar can prune the taxonomy down to
   * branches that can return results.
   *
   * Table and column names come from the hardcoded maps above, never from the
   * request, so interpolating them into the SQL is injection-safe.
   */
  async distinctCategoryNames(category: SearchCategory): Promise<string[]> {
    if (category === SearchCategory.TALENT) return this.distinctTalentCategoryNames()

    const source = DbFallbackService.CATEGORY_SOURCES[category]
    if (!this.pool || !source) return []

    try {
      const result = await this.pool.query(
        `SELECT DISTINCT btrim("${source.column}") AS name
           FROM ${source.table}
          WHERE status = 'published'
            AND "listingType" = $1
            AND "${source.column}" IS NOT NULL
            AND btrim("${source.column}") <> ''
          ORDER BY name ASC`,
        [source.listingType],
      )
      return result.rows.map((row) => row.name as string)
    } catch (err) {
      this.logger.error(
        `DB category-values query failed for category "${category}": ${err instanceof Error ? err.message : String(err)}`,
      )
      return []
    }
  }

  /**
   * distinctCategoryNames for talent — the published taxonomy itself, fetched
   * from category-service.
   *
   * Projects and services can answer this from their own rows because they
   * store a category name. Talent no longer stores one: a profile's categories
   * are derived on demand, so there is nothing to take a DISTINCT over, and
   * deriving them for every profile just to populate a sidebar would be
   * absurdly expensive. With derivation, any published category is reachable
   * by definition, which makes the taxonomy the correct answer.
   *
   * Returned as one flat list with no record of which level a name came from,
   * matching the Algolia path and what the sidebar wants: pruning keeps a
   * taxonomy node when it or any descendant is named, so the depth a name sits
   * at is read off the tree, not off the array it was stored in.
   */
  private async distinctTalentCategoryNames(): Promise<string[]> {
    try {
      const names = await firstValueFrom(
        this.categoryClient
          .send<{ categories: string[]; subcategories: string[] }>(
            'category.names',
            {},
          )
          .pipe(timeout(CATEGORY_MATCH_TIMEOUT_MS)),
      )
      return [
        ...new Set([
          ...(names?.categories ?? []),
          ...(names?.subcategories ?? []),
        ]),
      ].sort((a, b) => a.localeCompare(b))
    } catch (err) {
      this.logger.error(
        `DB category-values query failed for category "talent": ${err instanceof Error ? err.message : String(err)}`,
      )
      return []
    }
  }

  // Which listings table each entity's derived filter values come from, for
  // arrayValueCounts below. The `text[]` column per filter field lives in
  // FILTER_VALUE_SOURCES (search-config) so the Algolia attribute and the DB
  // column for a field stay declared side by side. Both must match the
  // clauses the PROJECTS and SERVICES branches of queryEntity filter against,
  // or the sidebar would offer values the filter can't match.
  private static readonly LISTING_TABLES: Record<
    string,
    { table: string; listingType: string }
  > = {
    projects: { table: 'listings.project', listingType: 'project' },
    services: { table: 'listings.project', listingType: 'service' },
  }

  // Filter fields whose values live in a Payload child table keyed by
  // `_parent_id` rather than in a `text[]` column on the row itself. Only the
  // tables are declared here — the column comes from FILTER_VALUE_SOURCES, so
  // a field's Algolia attribute and its DB column stay declared side by side
  // there as they are for every other field.
  //
  // `status` is the parent's liveness test, and differs from the listings
  // tables' 'published' because talent profiles are active/inactive. It has to
  // be applied through the join: a child row carries no status of its own, so
  // without it an inactive profile's job title would be offered as an option
  // the search can never return.
  private static readonly CHILD_VALUE_TABLES: Record<
    string,
    Record<string, { childTable: string; parentTable: string; status: string }>
  > = {
    talent: {
      job_title: {
        childTable: 'cms.talent_profiles_job_titles',
        parentTable: 'cms.talent_profiles',
        status: 'active',
      },
      skills: {
        childTable: 'cms.talent_profiles_skills',
        parentTable: 'cms.talent_profiles',
        status: 'active',
      },
      industries: {
        childTable: 'cms.talent_profiles_industries',
        parentTable: 'cms.talent_profiles',
        status: 'active',
      },
      languages: {
        childTable: 'cms.talent_profiles_languages',
        parentTable: 'cms.talent_profiles',
        status: 'active',
      },
    },
  }

  /**
   * How many published listings of this entity carry each value of a `text[]`
   * filter field (tags, industries, skills), keyed by the value exactly as
   * stored. Backs GET /search/filter-values when Algolia is unavailable (or
   * has nothing indexed), standing in for the facet counts so the sidebar can
   * rank options by popularity either way.
   *
   * Capitalisation variants are returned separately, matching what Algolia's
   * facet counts look like — SearchService.rankValues merges them, so both
   * paths land on the same ranking.
   *
   * The 1000-row cap mirrors Algolia's maxValuesPerFacet: only the top slice
   * is ever shown, so values past that point can't place regardless.
   *
   * Table and column names come from hardcoded maps, never from the request,
   * so interpolating them into the SQL is injection-safe.
   */
  async arrayValueCounts(
    category: SearchCategory,
    field: string,
  ): Promise<Record<string, number>> {
    const column = FILTER_VALUE_SOURCES[category]?.[field]?.column
    if (!this.pool || !column) return {}

    // Child-table fields (talent's job_title) are counted by joining to the
    // parent instead of unnesting a column on the row.
    const childSource = DbFallbackService.CHILD_VALUE_TABLES[category]?.[field]
    if (childSource) return this.childValueCounts(category, field, column, childSource)

    const source = DbFallbackService.LISTING_TABLES[category]
    if (!source) return {}

    try {
      const result = await this.pool.query(
        `SELECT btrim(t.value) AS name, COUNT(*)::int AS usage_count
           FROM ${source.table} l, unnest(l."${column}") AS t(value)
          WHERE l.status = 'published'
            AND l."listingType" = $1
            AND btrim(t.value) <> ''
          GROUP BY btrim(t.value)
          ORDER BY usage_count DESC, name ASC
          LIMIT 1000`,
        [source.listingType],
      )
      return Object.fromEntries(
        result.rows.map((row) => [row.name as string, Number(row.usage_count)]),
      )
    } catch (err) {
      this.logger.error(
        `DB filter-values query failed for "${field}" of category "${category}": ${err instanceof Error ? err.message : String(err)}`,
      )
      return {}
    }
  }

  /**
   * arrayValueCounts for a field stored in a Payload child table — talent's
   * job_title today. Counts how many live parent records carry each value.
   *
   * Counts DISTINCT parents rather than child rows: a profile listing the same
   * headline on two job-title rows is one profile the search would return, and
   * counting rows would let it outrank a title held by two different people.
   * That keeps the number meaning the same thing as the Algolia facet count it
   * stands in for, which counts records.
   *
   * G1: for talent, only profiles whose account has a known open gate are counted, the same
   * rule the results use, so a sidebar count never includes a talent the results leave out.
   *
   * Table and column names come from hardcoded maps, never from the request,
   * so interpolating them into the SQL is injection-safe.
   */
  private async childValueCounts(
    category: SearchCategory,
    field: string,
    column: string,
    source: { childTable: string; parentTable: string; status: string },
  ): Promise<Record<string, number>> {
    if (!this.pool) return {}

    try {
      const result = await this.pool.query(
        `SELECT btrim(c."${column}") AS name, COUNT(DISTINCT p.id)::int AS usage_count
           FROM ${source.childTable} c
           JOIN ${source.parentTable} p ON p.id = c._parent_id
          WHERE p.status = $1
            AND c."${column}" IS NOT NULL
            AND btrim(c."${column}") <> ''
            ${category === SearchCategory.TALENT ? `AND ${openTalentSqlFor('p')}` : ''}
          GROUP BY btrim(c."${column}")
          ORDER BY usage_count DESC, name ASC
          LIMIT 1000`,
        [source.status],
      )
      return Object.fromEntries(
        result.rows.map((row) => [row.name as string, Number(row.usage_count)]),
      )
    } catch (err) {
      this.logger.error(
        `DB filter-values query failed for "${field}" of category "${category}": ${err instanceof Error ? err.message : String(err)}`,
      )
      return {}
    }
  }

  /**
   * Parses year-bucket labels like "Entry level (0 - 2 yrs)" / "Expert
   * (10+ yrs)" and matches them against a talent's total years of
   * experience, computed as the age of their earliest work-experience
   * start date (cms.talent_profiles_work_experience has no separate
   * years-of-experience column, but does have real start/end dates).
   */
  private experienceYearsRangeAny(params: any[], labels?: string[]): string | null {
    if (!labels?.length) return null
    const yearsExpr =
      `EXTRACT(YEAR FROM AGE(now(), (SELECT MIN(we.start_date) FROM cms.talent_profiles_work_experience we WHERE we._parent_id = talent_profiles.id)))`
    const clauses: string[] = []
    for (const label of labels) {
      const range = label.match(/(\d+)\s*-\s*(\d+)/)
      if (range) {
        clauses.push(`(${yearsExpr} BETWEEN $${params.push(Number(range[1]))} AND $${params.push(Number(range[2]))})`)
        continue
      }
      const openEnded = label.match(/(\d+)\s*\+/)
      if (openEnded) {
        clauses.push(`(${yearsExpr} >= $${params.push(Number(openEnded[1]))})`)
      }
    }
    return clauses.length ? `(${clauses.join(' OR ')})` : null
  }

  /** Talent's array fields (skills/industries/languages) live in Payload child tables keyed by `_parent_id`, not columns on `talent_profiles`. */
  private arrayContainsAnyJoin(
    params: any[],
    childTable: string,
    column: string,
    values?: string[],
  ): string | null {
    if (!values?.length) return null
    const idx = params.push(values.map((v) => v.toLowerCase()))
    return `EXISTS (SELECT 1 FROM ${childTable} c WHERE c._parent_id = talent_profiles.id AND lower(c."${column}") = ANY($${idx}::text[]))`
  }

  /**
   * SQL expression for a talent's display name. Which columns hold it depends
   * on the database: the TalentProfiles collection stores firstName/lastName
   * (first_name/last_name), but databases whose cms schema predates that split
   * still carry a single `name`, and Payload's schema push is what decides.
   * Naming a column that isn't there fails the whole talent query with 42703,
   * so the shape is read from information_schema instead of assumed.
   *
   * Cached after the first successful probe; a failed probe is not cached, so
   * the next search retries it.
   */
  private resolveTalentNameSql(): Promise<string> {
    if (!this.talentNameSql) {
      this.talentNameSql = this.probeTalentNameSql().catch((err) => {
        this.talentNameSql = null
        throw err
      })
    }
    return this.talentNameSql
  }

  private async probeTalentNameSql(): Promise<string> {
    if (!this.pool) return 'NULL::text'
    const result = await this.pool.query(
      `SELECT column_name
         FROM information_schema.columns
        WHERE table_schema = 'cms'
          AND table_name = 'talent_profiles'
          AND column_name IN ('first_name', 'last_name', 'name')`,
    )
    const present = new Set(result.rows.map((row) => row.column_name as string))
    const parts = ['first_name', 'last_name']
      .filter((column) => present.has(column))
      .map((column) => `talent_profiles.${column}`)
    if (parts.length) return `NULLIF(btrim(concat_ws(' ', ${parts.join(', ')})), '')`
    if (present.has('name')) return 'talent_profiles.name'
    return 'NULL::text'
  }

  private async resolveTalentProfileExtras(): Promise<{ locationSql: string; avatarSql: string }> {
    if (this.talentProfileExtras) return this.talentProfileExtras
    if (!this.pool) return { locationSql: 'NULL::text', avatarSql: 'NULL::text' }
    const result = await this.pool.query(
      `SELECT column_name
         FROM information_schema.columns
        WHERE table_schema = 'cms'
          AND table_name = 'talent_profiles'
          AND column_name IN ('location', 'avatar_url')`,
    )
    const present = new Set(result.rows.map((row) => row.column_name as string))
    const extras = {
      locationSql: present.has('location') ? 'talent_profiles.location' : 'NULL::text',
      avatarSql: present.has('avatar_url') ? 'talent_profiles.avatar_url' : 'NULL::text',
    }
    if (present.size === 2) this.talentProfileExtras = extras
    return extras
  }

  private empty(limit: number, page: number): FallbackHits {
    return { hits: [], nbHits: 0, page, nbPages: 0, hitsPerPage: limit, fallback: true }
  }
}
