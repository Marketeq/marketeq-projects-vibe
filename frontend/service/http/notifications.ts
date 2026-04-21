import AxiosRequest from ".."

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ""
const USER_BASE = process.env.NEXT_PUBLIC_USER_URL ?? ""

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
  getPreferences: () =>
    AxiosRequest.get(`${API_BASE}/v1/notifications/preferences`),

  getCatalog: () =>
    AxiosRequest.get(`${API_BASE}/v1/notifications/preferences/catalog`),

  updatePreferences: (payload: UpdatePreferencesPayload) =>
    AxiosRequest.patch(`${API_BASE}/v1/notifications/preferences`, payload),

  resetPreferences: () =>
    AxiosRequest.post(
      `${API_BASE}/v1/notifications/preferences/reset`,
      {},
    ),

  updatePhone: (phone: string | null) =>
    AxiosRequest.patch(`${USER_BASE}/user/phone`, { phone }),
}
