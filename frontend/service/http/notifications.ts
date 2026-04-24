import AxiosRequest from ".."

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ""
const USER_BASE = process.env.NEXT_PUBLIC_USER_URL ?? ""
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

  getUnreadCount: () =>
    AxiosRequest.get(`${BASE}/unread-count`),

  markRead: (id: string) =>
    AxiosRequest.post(`${BASE}/${id}/read`, {}),

  markAllRead: () =>
    AxiosRequest.post(`${BASE}/read-all`, {}),

  archive: (id: string) =>
    AxiosRequest.post(`${BASE}/${id}/archive`, {}),

  remove: (id: string) =>
    AxiosRequest.del(`${BASE}/${id}`),

  getPreferences: () =>
    AxiosRequest.get(`${BASE}/preferences`),

  getCatalog: () =>
    AxiosRequest.get(`${BASE}/preferences/catalog`),

  updatePreferences: (payload: UpdatePreferencesPayload) =>
    AxiosRequest.patch(`${BASE}/preferences`, payload),

  resetPreferences: () =>
    AxiosRequest.post(`${BASE}/preferences/reset`, {}),

  updatePhone: (phone: string | null) =>
    AxiosRequest.patch(`${USER_BASE}/user/phone`, { phone }),
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

export default NotificationsAPI
