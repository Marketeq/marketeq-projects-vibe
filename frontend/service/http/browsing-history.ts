import AxiosRequest from ".."

/**
 * Mirrors `BrowsingHistoryItemType` in browsing-history-service. `job` was
 * added in AddJobItemType1794000727405 so the Recent Jobs tab has somewhere
 * to read from.
 */
export type BrowsingHistoryItemType =
  | "project"
  | "service"
  | "team"
  | "talent"
  | "job"

/**
 * One row of the caller's own history, as `GET /browsing-history` returns it.
 *
 * `displayName`, `title` and `skills` are everything the service can learn
 * about an item: they come from the shared `owner_target` gRPC contract,
 * which exposes only `{exists, displayName, status}` and `{title, skills}`.
 * None of the richer card fields — rate, rating, avatars, counts — are
 * available through it, which is why cards built from this alone are sparse.
 * See docs/BROWSING_HISTORY_NOTES.md §10.
 */
export interface BrowsingHistoryEntry {
  id: string
  itemId: string
  itemType: BrowsingHistoryItemType
  firstViewedAt: string
  lastViewedAt: string
  viewCount: number | null
  /** false when the item no longer exists or isn't visible to this user. */
  available: boolean
  displayName?: string
  title?: string
  skills?: string[]
}

export interface BrowsingHistoryPage {
  items: BrowsingHistoryEntry[]
  total: number
}

export interface BrowsingHistoryQuery {
  /** Server caps this at 50; the page uses 20, matching AC-SCALE.1. */
  limit?: number
  offset?: number
  itemType?: BrowsingHistoryItemType
}

/**
 * The caller's own history, most-recently-viewed first — the service orders
 * by `lastViewedAt DESC`, so AC-01.4 is satisfied server-side.
 */
export const getBrowsingHistory = async (
  query: BrowsingHistoryQuery = {}
): Promise<BrowsingHistoryPage> => {
  const params = new URLSearchParams()
  if (query.limit != null) params.set("limit", String(query.limit))
  if (query.offset != null) params.set("offset", String(query.offset))
  if (query.itemType) params.set("itemType", query.itemType)

  const qs = params.toString()
  const res = await AxiosRequest.get(
    `/browsing-history${qs ? `?${qs}` : ""}`
  )
  return {
    items: Array.isArray(res.data?.items) ? res.data.items : [],
    total: Number(res.data?.total ?? 0),
  }
}
