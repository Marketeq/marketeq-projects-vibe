import { useEffect, useRef } from "react"
import { apiFetch } from "@/src/lib/api"
import { getAccessToken, getCurrentUser } from "@/utils/auth"
import * as Ably from "ably"

type NotificationNewPayload = {
  id: string
  title: string
  body: string
  link?: string
  category: string
}

type NotificationBadgePayload = {
  unreadCount: number
}

export function useNotificationChannel(handlers: {
  onNotificationNew?: (payload: NotificationNewPayload) => void
  onBadgeCount?: (payload: NotificationBadgePayload) => void
}) {
  const ref = useRef(handlers)
  useEffect(() => {
    ref.current = handlers
  }, [handlers])

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser) return

    const client = new Ably.Realtime({
      authCallback: async (_params, cb) => {
        try {
          const token = getAccessToken()
          const details = await apiFetch<any>(`/v1/threads/ably-token`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!details) {
            cb("Ably realtime is not configured for this environment.", null)
            return
          }
          cb(null, details)
        } catch (err) {
          cb(err instanceof Error ? err.message : String(err), null)
        }
      },
      clientId: currentUser.id,
    })

    const channel = client.channels.get(`user:${currentUser.id}`)

    channel.subscribe((msg) => {
      if (msg.name === "notification:new") {
        ref.current.onNotificationNew?.(msg.data)
      }
      if (msg.name === "notification:badge") {
        ref.current.onBadgeCount?.(msg.data)
      }
    })

    return () => {
      channel.unsubscribe()
      client.close()
    }
  }, [])
}
