import { getPublicApiUrl, getPublicUserUrl } from "@/lib/runtime-urls"
import AxiosRequest from ".."

const API_BASE = getPublicApiUrl()
const USER_BASE = getPublicUserUrl()
const BASE = `${API_BASE}/v1/notifications`

export type ChannelKey = "inApp" | "email" | "sms"

export interface InAppChannelPrefs {
  enabled: boolean
  bell: boolean
  popup: boolean
  browser: boolean
}

export interface EmailChannelPrefs {
  enabled: boolean
  address: string | null
}

export interface SmsChannelPrefs {
  enabled: boolean
  phone: string | null
}

export interface GlobalChannelPrefs {
  inApp: InAppChannelPrefs
  email: EmailChannelPrefs
  sms: SmsChannelPrefs
}

export interface ScopedChannelState {
  inApp: boolean
  email: boolean
  sms: boolean
}

export interface CategoryPref {
  enabled: boolean
  channels: ScopedChannelState
}

export interface NotificationItemPref {
  enabled: boolean
  channels: ScopedChannelState
}

export interface PreferencesResponse {
  id: string
  userId: string
  channels: GlobalChannelPrefs | null
  categories: Record<string, CategoryPref> | null
  notifications: Record<string, NotificationItemPref> | null
  inAppEnabled: boolean
  emailEnabled: boolean
  smsEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface CatalogItem {
  id: string
  title: string
  description: string
  defaultEnabled: boolean
  defaultChannels: ScopedChannelState
}

export interface CatalogCategory {
  id: string
  title: string
  icon: string
  defaultEnabled: boolean
  defaultChannels: ScopedChannelState
  notifications: CatalogItem[]
}

export interface CategoryPrefPatch {
  enabled?: boolean
  channels?: Partial<ScopedChannelState>
}

export interface NotificationItemPrefPatch {
  enabled?: boolean
  channels?: Partial<ScopedChannelState>
}

export interface UpdatePreferencesPayload {
  channels?: Partial<{
    inApp: Partial<InAppChannelPrefs>
    email: Partial<EmailChannelPrefs>
    sms: Partial<SmsChannelPrefs>
  }>
  categories?: Record<string, CategoryPrefPatch>
  notifications?: Record<string, NotificationItemPrefPatch>
}

export const NotificationsAPI = {
  list: (params?: ListNotificationsParams) => {
    const q = new URLSearchParams()
    if (params?.page) q.set("page", String(params.page))
    if (params?.limit) q.set("limit", String(params.limit))
    if (params?.category) q.set("category", params.category)
    if (params?.unread) q.set("unread", "true")
    const qs = q.toString()
    return AxiosRequest.get(qs ? `${BASE}?${qs}` : BASE)
  },

  getUnreadCount: () => AxiosRequest.get(`${BASE}/unread-count`),

  markRead: (id: string) => AxiosRequest.post(`${BASE}/${id}/read`, {}),

  markAllRead: () => AxiosRequest.post(`${BASE}/read-all`, {}),

  archive: (id: string) => AxiosRequest.post(`${BASE}/${id}/archive`, {}),

  remove: (id: string) => AxiosRequest.del(`${BASE}/${id}`),

  getPreferences: () => AxiosRequest.get(`${BASE}/preferences`),

  getCatalog: () => AxiosRequest.get(`${BASE}/preferences/catalog`),

  updatePreferences: (payload: UpdatePreferencesPayload) =>
    AxiosRequest.patch(`${BASE}/preferences`, payload),

  resetPreferences: () => AxiosRequest.post(`${BASE}/preferences/reset`, {}),

  updatePhone: (phone: string | null) =>
    AxiosRequest.patch(`${USER_BASE}/user/phone`, { phone }),

  // Keep this explicit even when unavailable so callers can feature-detect
  // safely without reaching for `any` or failing type-checks.
  seedDev: undefined as undefined | (() => Promise<unknown>),
}

export interface NotificationItem {
  id: string
  title: string
  body: string
  link?: string
  category: string
  event?: string
  isRead: boolean
  isArchived: boolean
  createdAt: string
}

export interface ListNotificationsParams {
  page?: number
  limit?: number
  category?: string
  unread?: boolean
}

// Used by UI to avoid noisy console errors on expected transient failures
// (e.g., notifications-service temporarily down in dev).
export const isTransientNotificationsApiError = (error: unknown): boolean => {
  // AxiosRequest is an axios wrapper; errors may follow axios error shape.
  const anyErr = error as any
  const status = anyErr?.response?.status
  const code = anyErr?.code

  // Network / CORS / service down / gateway timeout etc.
  if (
    code === "ECONNABORTED" ||
    code === "ERR_NETWORK" ||
    code === "ERR_BAD_RESPONSE" ||
    code === "ENOTFOUND" ||
    code === "ECONNREFUSED"
  ) {
    return true
  }

  if (typeof status === "number") {
    // 401 happens frequently during auth bootstrap; UI retries after ensureDevAuth().
    if (status === 401) return true
    // Retryable server errors.
    if (status === 408 || status === 429) return true
    if (status >= 500) return true
  }

  return false
}

export default NotificationsAPI
