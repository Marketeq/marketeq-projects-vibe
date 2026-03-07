import { useEffect, useRef } from "react"
import { apiFetch } from "@/src/lib/api"
import { getCurrentUser } from "@/utils/auth"
import * as Ably from "ably"

export function useAblyChannel(
  threadId: string,
  onMessage: (data: any) => void,
  onPinToggled?: (data: { messageId: string; isPinned: boolean }) => void,
  onDelete?: (messageId: string) => void,
  onUndelete?: (messageId: string) => void
) {
  const clientRef = useRef<Ably.Realtime | null>(null)

  useEffect(() => {
    const currentUser = getCurrentUser()

    if (!currentUser) {
      console.error("No logged-in user; cannot subscribe to Ably")
      return
    }

    const client = new Ably.Realtime({
      // we use authCallback instead of authUrl so we can use apiFetch

      authCallback: async (_tokenParams, callback) => {
        try {
          const token = localStorage.getItem("token")
          // your Nest endpoint returns the full Ably tokenDetails JSON
          const tokenDetails = await apiFetch<any>(
            `/api/messaging/ably?threadId=${threadId}`,
            { method: "POST", headers: { Authorization: `Bearer ${token}` } }
          )
          callback(null, tokenDetails)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          callback(msg, null)
        }
      },
      clientId: currentUser.id,
    })

    clientRef.current = client

    const channel = client.channels.get(`thread-${threadId}`)

    channel.subscribe((msg) => {
      console.log(`Ably received ${msg.name}:`, msg.data)

      if (msg.name === "message:new") {
        onMessage(msg.data)
      }
      if (msg.name === "message-pin-toggled" && onPinToggled) {
        onPinToggled(msg.data)
      }

      if (msg.name === "message-deleted" && onDelete) {
        onDelete(msg.data.messageId)
      }
      if (msg.name === "message-undeleted" && onUndelete) {
        onUndelete(msg.data.messageId)
      }
    })

    return () => {
      channel.unsubscribe()
      client.close()
    }
  }, [threadId, onMessage, onPinToggled, onDelete, onUndelete])
}
