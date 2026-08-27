import { getOffer } from "@/service/http/offers"
import { UserAPI } from "@/service/http/user"
import type { Offer } from "@/types/offer"
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
  list: async (params?: ListNotificationsParams) => {
    const q = new URLSearchParams()
    if (params?.page) q.set("page", String(params.page))
    if (params?.limit) q.set("limit", String(params.limit))
    if (params?.category) q.set("category", params.category)
    if (params?.unread) q.set("unread", "true")
    const qs = q.toString()
    const response = await AxiosRequest.get(qs ? `${BASE}?${qs}` : BASE)
    const items = Array.isArray(response?.data?.data)
      ? (response.data.data as NotificationItem[])
      : []
    const offerIds = Array.from(
      new Set(
        items
          .filter(isOfferNotificationItem)
          .map(readNotificationOfferId)
          .filter((id): id is string => Boolean(id))
      )
    )

    const offers = await Promise.allSettled(offerIds.map((id) => getOffer(id)))
    const offerById = new Map(
      offers.flatMap((result, index) =>
        result.status === "fulfilled"
          ? [[offerIds[index], result.value] as const]
          : []
      )
    )
    const actorIds = Array.from(
      new Set(
        items
          .filter(isOfferNotificationItem)
          .map((item) => readNotificationActorId(item, offerById))
          .filter((id): id is string => Boolean(id))
      )
    )

    if (offerById.size === 0 && actorIds.length === 0) return response

    const profiles = await Promise.allSettled(
      actorIds.map((actorId) => UserAPI.getProfile(actorId))
    )
    const profileById = new Map(
      profiles.flatMap((result, index) =>
        result.status === "fulfilled" && result.value?.data
          ? [[actorIds[index], result.value.data] as const]
          : []
      )
    )

    response.data.data = items.map((item) => {
      const offerId = readNotificationOfferId(item)
      const offer = offerId ? offerById.get(offerId) : undefined
      const actorId = readNotificationActorId(item, offerById)
      const profile = actorId ? profileById.get(actorId) : undefined
      if (!profile && !offer) return item
      const preserveSeededIdentity = item.metadata?.seeded === true
      const seededUsername =
        preserveSeededIdentity &&
        typeof item.metadata?.senderUsername === "string"
          ? item.metadata.senderUsername
          : undefined
      const seededDisplayName =
        preserveSeededIdentity &&
        typeof item.metadata?.senderDisplayName === "string"
          ? item.metadata.senderDisplayName
          : undefined

      return {
        ...item,
        metadata: {
          ...(item.metadata ?? {}),
          avatarUrl: profile?.avatarUrl || undefined,
          senderAvatarUrl: profile?.avatarUrl || undefined,
          senderUsername: seededUsername || profile?.username || undefined,
          senderDisplayName:
            seededDisplayName ||
            [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
            profile?.username ||
            undefined,
          contractTitle: offer?.contractTitle,
          contractType: offer?.contractType,
          clientId: offer?.clientId,
          talentId: offer?.talentId,
        },
      }
    })

    return response
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
  metadata?: Record<string, unknown> | null
  isRead: boolean
  isArchived: boolean
  createdAt: string
}

const isOfferNotificationItem = (item: NotificationItem): boolean =>
  item.category?.toLowerCase().includes("offer") === true ||
  item.event?.toLowerCase().includes("offer") === true ||
  item.title?.toLowerCase().includes("offer") === true

const readNotificationOfferId = (
  item: NotificationItem
): string | undefined => {
  const value = item.metadata?.offerId
  return typeof value === "string" && value.trim() ? value : undefined
}

const readNotificationActorId = (
  item: NotificationItem,
  offerById: Map<string, Offer>
): string | undefined => {
  const metadata = item.metadata
  if (!metadata) return undefined

  const event = item.event?.toLowerCase() || ""

  for (const key of [
    "actorId",
    "senderId",
    "senderUserId",
    "submittedById",
    "acceptedById",
    "declinedById",
    "withdrawnById",
  ]) {
    const value = metadata[key]
    if (typeof value === "string" && value.trim()) return value
  }

  const partyFallbackKey =
    event === "contract.offer.received" ||
    event === "offer.created" ||
    event === "offer.edited" ||
    event === "offer.resent" ||
    event === "offer.withdrawn"
      ? "clientId"
      : event === "offer.accepted" || event === "offer.declined"
        ? "talentId"
        : undefined
  const partyFallback = partyFallbackKey
    ? metadata[partyFallbackKey]
    : undefined
  if (typeof partyFallback === "string" && partyFallback.trim()) {
    return partyFallback
  }

  const offerId = readNotificationOfferId(item)
  const linkedOffer = offerId ? offerById.get(offerId) : undefined
  if (linkedOffer) return linkedOffer.clientId

  return undefined
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
    // 401 during auth bootstrap — not retryable.
    if (status === 401) return true
    // Retryable server errors.
    if (status === 408 || status === 429) return true
    if (status >= 500) return true
  }

  return false
}

export default NotificationsAPI
