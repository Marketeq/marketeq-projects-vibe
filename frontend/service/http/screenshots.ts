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

export interface ScreenshotCardsParams {
  contractId?: string
  taskId?: string
  from?: string
  to?: string
  apps?: string[]
  activityLevel?: number
  minKeyboard?: number
  maxKeyboard?: number
  minMouse?: number
  maxMouse?: number
  sortBy?: "timestamp" | "keyboard" | "mouse" | "project"
  sortOrder?: "ASC" | "DESC"
  page?: number
  pageSize?: number
}

export const getScreenshotCards = async (
  params: ScreenshotCardsParams = {}
): Promise<ScreenshotCardsResponse> => {
  const res = await AxiosRequest.get("/screenshots/cards", { params })
  return res.data
}

export const getScreenshotDetail = async (id: string) => {
  const res = await AxiosRequest.get(`/screenshots/${id}/detail`)
  return res.data
}

export const deleteScreenshot = async (id: string) => {
  const res = await AxiosRequest.del(`/screenshots/${id}`)
  return res.data
}

export const blurScreenshot = async (id: string) => {
  const res = await AxiosRequest.patch(`/screenshots/${id}/blur`, {})
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

export const bulkTransferScreenshots = async (
  ids: string[],
  contractId: string,
  taskId?: string
) => {
  const axios = (await import("axios")).default
  const Cookies = (await import("js-cookie")).default
  const token = Cookies.get("access_token") || Cookies.get("accessToken")
  const res = await axios.patch(
    "http://localhost:3017/api/screenshots/batch/meta",
    {
      ids,
      contractId,
      ...(taskId ? { taskId } : {}),
    },
    {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  )
  return res.data
}