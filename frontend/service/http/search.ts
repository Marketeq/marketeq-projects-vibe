import AxiosRequest from ".."

export type SearchCategory = "all" | "talent" | "teams" | "projects" | "services"

export interface SearchParams {
  q: string
  category?: SearchCategory
  limit?: number
  page?: number
  ml?: boolean
  // Filters — forwarded to backend as query params, mapped to Algolia facet filters
  skills?: string
  location?: string
  industry?: string
  project_type?: string
  project_category?: string
  budget_range?: string
  project_duration_range?: string
  team_size_range?: string
  tags?: string
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
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    entries.push([key, String(value)])
  }
  if (entries.length === 0) return ""
  const qs = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&")
  return `?${qs}`
}

export const SearchAPI = {
  /**
   * GET /search — multi-entity Algolia search.
   * Backend: backend/apps/search-service/src/search/search.controller.ts
   */
  search: (params: SearchParams) => {
    return AxiosRequest.get(`/search${buildQueryString(params)}`)
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
