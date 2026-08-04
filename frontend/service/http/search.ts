import AxiosRequest from ".."

export type SearchCategory =
  | "all"
  | "talent"
  | "teams"
  | "projects"
  | "services"

export interface SearchParams {
  q: string
  category?: SearchCategory
  limit?: number
  page?: number
  ml?: boolean
  sortBy?: string
  sortOrder?: "asc" | "desc"
  // Legacy single-value filter shortcuts — forwarded as flat query params.
  skills?: string
  location?: string
  industry?: string
  project_type?: string
  project_category?: string
  budget_range?: string
  project_duration_range?: string
  team_size_range?: string
  tags?: string
  // Full facet filter set — mirrors SearchFiltersDto on the backend and
  // supports multi-select arrays. Serialized as `filters[key][]=value`.
  filters?: Record<string, string[] | string | number>
}

export interface SearchHit {
  objectID: string
  [key: string]: any
}

export interface SingleIndexResponse {
  hits: SearchHit[]
  nbHits: number
  page: number
  nbPages: number
  hitsPerPage: number
  query?: string
}

/** Multi-index (category=all) response shape returned by the backend */
export interface GroupedSearchResponse {
  talent: SingleIndexResponse
  teams: SingleIndexResponse
  projects: SingleIndexResponse
  services: SingleIndexResponse
}

export type SearchResponse = SingleIndexResponse | GroupedSearchResponse

function buildQueryString(params: SearchParams): string {
  const entries: [string, string][] = []
  const { filters, ...rest } = params

  for (const [key, value] of Object.entries(rest)) {
    if (value === undefined || value === null || value === "") continue
    entries.push([key, String(value)])
  }

  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === "") continue
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item === undefined || item === null || item === "") return
          entries.push([`filters[${key}][]`, String(item)])
        })
      } else {
        entries.push([`filters[${key}]`, String(value)])
      }
    }
  }

  if (entries.length === 0) return ""
  const qs = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&")
  return `?${qs}`
}

/**
 * Entity types that back a derived filter — the scope accepted by
 * GET /search/filter-values. Which *fields* each one answers for differs (see
 * FilterValueField): projects and services expose tags/industries/skills off
 * their listings, talent only job_title. Teams stay out entirely.
 */
export type FilterValueScope = "projects" | "services" | "talent"

/**
 * Entity types with a drillable taxonomy category — the scope accepted by
 * GET /search/category-values. Teams are excluded: their single flat
 * `category` has no levels to drill into.
 */
export type CategoryScope = "projects" | "services" | "talent"

/** GET /search/category-values response. */
export interface CategoryValuesResponse {
  category: CategoryScope
  values: string[]
}

/**
 * Sidebar filter fields whose options are derived from real records rather
 * than a hardcoded list. Not every scope answers every field — `job_title`,
 * `languages` and `location` are talent-only and `tags` is
 * projects/services-only (talent reuses that key for fixed editorial badges),
 * while `skills` and `industries` are answered by all three. The backend
 * rejects a pair it has no source for.
 */
export type FilterValueField =
  | "tags"
  | "industries"
  | "skills"
  | "job_title"
  | "languages"
  | "location"

/** One option of a derived sidebar filter: the value and how many listings use it. */
export interface PopularValue {
  name: string
  count: number
}

/**
 * Sidebar filter fields that read as numeric ranges rather than values, and
 * whose rungs are derived from the records — the field accepted by
 * GET /search/numeric-buckets. Talent's Client Success Rate is the only one
 * today; the other numeric sections still carry static ladders.
 */
export type NumericBucketField = "client_success_rate"

/** Entity types answering GET /search/numeric-buckets. */
export type NumericBucketScope = "talent"

/**
 * One rung of a numeric filter. `min`/`max` are the bounds sent to the search,
 * `count` how many records fall in it — absent when the backend couldn't read
 * the counts and fell back to offering the full ladder.
 */
export interface NumericBucketCount {
  label: string
  min?: number
  max?: number
  count?: number
}

/** GET /search/numeric-buckets response — only rungs with records behind them. */
export interface NumericBucketsResponse {
  category: NumericBucketScope
  field: NumericBucketField
  buckets: NumericBucketCount[]
}

/** GET /search/filter-values response — `values` is already sorted most-used first. */
export interface FilterValuesResponse {
  category: FilterValueScope
  field: FilterValueField
  values: PopularValue[]
}

export const SearchAPI = {
  /**
   * GET /search — multi-entity Algolia search.
   * Backend: backend/apps/search-service/src/search/search.controller.ts
   */
  search: (params: SearchParams) => {
    return AxiosRequest.get(`/search${buildQueryString(params)}`)
  },

  /**
   * GET /search/category-values — the taxonomy names this entity's records
   * actually carry. Used to prune the global taxonomy tree down to the
   * branches that can return results, so Projects, Services and Talent each
   * offer their own categories and never an empty branch.
   */
  getCategoryValues: (category: CategoryScope) => {
    return AxiosRequest.get(`/search/category-values?category=${category}`)
  },

  /**
   * GET /search/filter-values — the values this entity's records actually
   * carry for one filter field, most used first. Drives the sidebar's Tags,
   * Industry, Skills and Job Title filters so their options track what people
   * actually entered rather than a hardcoded list.
   *
   * `limit` is optional: the backend already applies a per-field default.
   */
  getFilterValues: (
    category: FilterValueScope,
    field: FilterValueField,
    limit?: number
  ) => {
    const limitParam = limit === undefined ? "" : `&limit=${limit}`
    return AxiosRequest.get(
      `/search/filter-values?category=${category}&field=${field}${limitParam}`
    )
  },

  /**
   * GET /search/numeric-buckets — the rungs of a numeric sidebar filter that
   * have records behind them. Drives Talent's Client Success Rate section so
   * it can't offer a threshold nobody meets, and hides itself entirely when
   * the stat isn't populated.
   */
  getNumericBuckets: (
    category: NumericBucketScope,
    field: NumericBucketField
  ) => {
    return AxiosRequest.get(
      `/search/numeric-buckets?category=${category}&field=${field}`
    )
  },
}

/** Type guard — tells us whether the backend returned a grouped (all) or single-index response. */
export function isGroupedResponse(
  response: SearchResponse
): response is GroupedSearchResponse {
  return (
    response !== null &&
    typeof response === "object" &&
    "talent" in response &&
    "teams" in response &&
    "projects" in response &&
    "services" in response
  )
}
