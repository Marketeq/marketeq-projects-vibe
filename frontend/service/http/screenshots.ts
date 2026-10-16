import AxiosRequest from ".."

export interface AppUsageEntry {
  iconUrl: string
  appName: string
  url?: string
}

export interface ScreenshotCardDTO {
  id: string
  userId: string
  key: string
  mimeType: string
  bytes: number
  capturedAt: string | null
  contractId: string | null
  taskId: string | null
  contractName: string | null
  taskName: string | null
  url: string | null
  keyboard: number
  mouse: number
  keyboardPct: number
  mousePct: number
  apps: AppUsageEntry[] | null
  isBlurred: boolean
  isFlagged: boolean
  isDeleted: boolean
  /** Set while a delete waits for the client's approval. */
  deleteRequestedAt: string | null
  /** Set once the contract's client has asked to see this blurred screenshot. */
  accessRequestedAt?: string | null
  monitorId: string | null
  groupKey: string | null
  thumbnailUrl: string
  createdAt: string
  
}

export interface ScreenshotCardsResponse {
  data: ScreenshotCardDTO[]
  total: number
  page: number
  pageSize: number
}

export type ActivityBand = "none" | "low" | "medium" | "high"
export type TimeEntryType = "automatic" | "manual" | "edited"

export interface ScreenshotCardsParams {
  contractId?: string
  taskId?: string
  /** Any of these contracts (US-TT-023). */
  contractIds?: string[]
  /** Any of these tasks (US-TT-024). */
  taskIds?: string[]
  /** none = 0%, low = 1–33%, medium = 34–66%, high = 67–100% (US-TT-025). */
  activityBands?: ActivityBand[]
  /** US-TT-026. "manual" alone matches no screenshot cards. */
  timeEntryTypes?: TimeEntryType[]
  from?: string
  to?: string
  /** Any of these app names (Filter → Apps). */
  apps?: string[]
  /** Any of these visited URLs (Filter → URLs). */
  urls?: string[]
  activityLevel?: number
  minKeyboard?: number
  maxKeyboard?: number
  minMouse?: number
  maxMouse?: number
  sortBy?: "timestamp" | "keyboard" | "mouse" | "project" | "activity"
  sortOrder?: "ASC" | "DESC"
  page?: number
  pageSize?: number
  /** "client": screenshots on contracts where the caller is the client. */
  view?: "talent" | "client"
}

// List params go out as one comma-joined value ("a,b") — the backend splits
// them — so they survive the gateway proxy regardless of how it re-encodes
// repeated or bracketed keys.
const LIST_PARAMS = ["contractIds", "taskIds", "activityBands", "timeEntryTypes", "apps", "urls"] as const

export const getScreenshotCards = async (
  params: ScreenshotCardsParams = {}
): Promise<ScreenshotCardsResponse> => {
  const query: Record<string, unknown> = { ...params }
  for (const key of LIST_PARAMS) {
    const list = params[key]
    if (list && list.length > 0) query[key] = list.join(",")
    else delete query[key]
  }
  const res = await AxiosRequest.get("/screenshots/cards", { params: query })
  return res.data
}

export interface ScreenshotFacetsDTO {
  apps: { name: string; iconUrl: string | null }[]
  urls: string[]
}

/** The apps and visited URLs in the caller's screenshots, for the Apps / URLs filters. */
export const getScreenshotFacets = async (
  view: "talent" | "client"
): Promise<ScreenshotFacetsDTO> => {
  const res = await AxiosRequest.get("/screenshots/facets", { params: { view } })
  return { apps: res.data?.apps ?? [], urls: res.data?.urls ?? [] }
}

/** Every page of cards for these filters, in order (the API caps a page at 100). */
export const getAllScreenshotCards = async (
  params: Omit<ScreenshotCardsParams, "page" | "pageSize"> = {}
): Promise<ScreenshotCardDTO[]> => {
  const pageSize = 100
  const all: ScreenshotCardDTO[] = []
  for (let page = 1; ; page++) {
    const res = await getScreenshotCards({ ...params, page, pageSize })
    all.push(...(res.data ?? []))
    if (!res.data?.length || all.length >= res.total) return all
  }
}

export const getScreenshotDetail = async (id: string) => {
  const res = await AxiosRequest.get(`/screenshots/${id}/detail`)
  return res.data
}

/**
 * `deleteRequested` means the contract requires the client's approval: the
 * screenshot stays until the client reviews the request.
 */
export const deleteScreenshot = async (
  id: string,
  reason?: string
): Promise<{ id: string; isDeleted: boolean; deleteRequested: boolean }> => {
  const res = await AxiosRequest.del(`/screenshots/${id}`, {
    data: reason ? { reason } : {},
  })
  return res.data
}

/** The contract's client approves (deletes) or rejects (keeps) a pending delete. */
export const reviewDeleteRequest = async (
  id: string,
  status: "approved" | "rejected",
  comment?: string
): Promise<{ id: string; isDeleted: boolean }> => {
  const res = await AxiosRequest.put(`/screenshots/${id}/delete-request`, {
    status,
    ...(comment ? { comment } : {}),
  })
  return res.data
}

export const blurScreenshot = async (id: string, reason?: string) => {
  const res = await AxiosRequest.patch(`/screenshots/${id}/blur`, reason ? { reason } : {})
  return res.data
}

/** The contract's client asks the talent to unblur a screenshot. */
export const requestScreenshotAccess = async (id: string): Promise<ScreenshotCardDTO> => {
  const res = await AxiosRequest.post(`/screenshots/${id}/request-access`, {})
  return res.data
}

export const unblurScreenshot = async (id: string) => {
  const res = await AxiosRequest.patch(`/screenshots/${id}/unblur`, {})
  return res.data
}

export const updateScreenshotMeta = async (
  id: string,
  data: { contractId?: string; taskId?: string }
) => {
  const res = await AxiosRequest.patch(`/screenshots/${id}/meta`, data)
  return res.data
}

/**
 * Reassign screenshots in one call (PATCH /screenshots/batch/meta through the
 * gateway). `taskId: null` clears the task — used when the contract changes,
 * since a task never carries over to another contract (US-TT-010–012).
 */
export const reassignScreenshots = async (
  ids: string[],
  data: { contractId?: string; taskId?: string | null }
): Promise<{ updated: number }> => {
  const res = await AxiosRequest.patch("/screenshots/batch/meta", { ids, ...data })
  return res.data
}
