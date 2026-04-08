import AxiosRequest from ".."

const BASE = "/notifications"

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

const NotificationsAPI = {
  list: (params?: ListNotificationsParams) => {
    const q = new URLSearchParams()
    if (params?.page) q.set("page", String(params.page))
    if (params?.limit) q.set("limit", String(params.limit))
    if (params?.category) q.set("category", params.category)
    if (params?.unread) q.set("unread", "true")
    const qs = q.toString()
    return AxiosRequest.get(
      qs ? `${BASE}?${qs}` : BASE,
    )
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
}

export default NotificationsAPI
