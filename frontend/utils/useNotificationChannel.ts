import { useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth"
import { ApiError, apiFetch } from "@/src/lib/api"
import * as Ably from "ably"

type NotificationNewPayload = {
  id: string
  title: string
  body: string
  link?: string
  category: string
  // notification-service publishes these too; the invite card reads its
  // avatar and "View Invite" label straight out of metadata, so leaving
  // them off the type lets a publisher-side rename break the UI silently.
  event?: string
  metadata?: Record<string, unknown> | null
}

type NotificationBadgePayload = {
  unreadCount: number
}

export function useNotificationChannel(handlers: {
  onNotificationNew?: (payload: NotificationNewPayload) => void
  onBadgeCount?: (payload: NotificationBadgePayload) => void
}) {
  const { user } = useAuth()
  const ref = useRef(handlers)
  useEffect(() => {
    ref.current = handlers
  }, [handlers])

  useEffect(() => {
    if (!user?.id) return

    const client = new Ably.Realtime({
      authCallback: async (_params, cb) => {
        try {
          const details = await apiFetch<any>(`/v1/threads/ably-token`, {
            method: "GET",
          })
          if (!details) {
            cb("Ably realtime is not configured for this environment.", null)
            return
          }
          cb(null, details)
        } catch (err) {
          // apiFetch already refreshed once and that refresh failed, so the
          // session is over. Handing Ably a retryable error makes it reconnect
          // and re-auth every ~15s forever against a dead session; close instead.
          if (err instanceof ApiError && err.status === 401) {
            cb("Session expired", null)
            client.close()
            return
          }
          cb(err instanceof Error ? err.message : String(err), null)
        }
      },
      clientId: user.id,
    })

    const channel = client.channels.get(`user:${user.id}`)

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
      if (client.connection.state === "connected") {
        client.close()
      }
    }
  }, [user?.id])
}
