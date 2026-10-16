import { useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth"
import { ApiError, apiFetch } from "@/src/lib/api"
import * as Ably from "ably"

// The inbox mints synthetic conversation ids (`offer-notifications-<actorId>`)
// for offers with no thread row yet. Those are not thread primary keys, so
// asking for a thread-scoped token with one made messaging-service 500
// (uuid cast failure). GET /v1/threads/ably-token without ?threadId returns a
// user-scoped token, which is the correct grant for a conversation that has
// no thread behind it.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function useAblyChannel(
  threadId: string,
  onMessage: (data: any) => void,
  onPinToggled?: (data: { messageId: string; isPinned: boolean }) => void,
  onDelete?: (messageId: string) => void,
  onUndelete?: (messageId: string) => void,
  onEdit?: (data: any) => void,
  onReaction?: (data: { messageId: string; reactions: any[] }) => void
) {
  const { user } = useAuth()
  // Stable refs so the effect doesn't tear down on every render
  const onMessageRef = useRef(onMessage)
  const onPinToggledRef = useRef(onPinToggled)
  const onDeleteRef = useRef(onDelete)
  const onUndeleteRef = useRef(onUndelete)
  const onEditRef = useRef(onEdit)
  const onReactionRef = useRef(onReaction)

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])
  useEffect(() => {
    onPinToggledRef.current = onPinToggled
  }, [onPinToggled])
  useEffect(() => {
    onDeleteRef.current = onDelete
  }, [onDelete])
  useEffect(() => {
    onUndeleteRef.current = onUndelete
  }, [onUndelete])
  useEffect(() => {
    onEditRef.current = onEdit
  }, [onEdit])
  useEffect(() => {
    onReactionRef.current = onReaction
  }, [onReaction])

  useEffect(() => {
    if (!threadId) return

    if (!user?.id) {
      console.error("No logged-in user; cannot subscribe to Ably")
      return
    }

    const client = new Ably.Realtime({
      authCallback: async (_tokenParams, callback) => {
        try {
          const tokenDetails = await apiFetch<any>(
            UUID_RE.test(threadId ?? "")
              ? `/v1/threads/ably-token?threadId=${threadId}`
              : `/v1/threads/ably-token`,
            { method: "GET" }
          )
          if (!tokenDetails) {
            callback("Realtime token unavailable", null)
            return
          }
          callback(null, tokenDetails)
        } catch (err) {
          // apiFetch already refreshed once and that refresh failed, so the
          // session is over. Handing Ably a retryable error makes it reconnect
          // and re-auth every ~15s forever against a dead session; close instead.
          if (err instanceof ApiError && err.status === 401) {
            callback("Session expired", null)
            client.close()
            return
          }
          const msg = err instanceof Error ? err.message : String(err)
          callback(msg, null)
        }
      },
      clientId: user.id,
    })

    const channel = client.channels.get(`chat:thread-${threadId}`)

    channel.subscribe((msg) => {
      if (msg.name === "message:new") {
        onMessageRef.current(msg.data)
      }
      if (msg.name === "message:edit" && onEditRef.current) {
        onEditRef.current(msg.data)
      }
      if (msg.name === "message-pin-toggled" && onPinToggledRef.current) {
        onPinToggledRef.current(msg.data)
      }
      if (msg.name === "message:delete" && onDeleteRef.current) {
        onDeleteRef.current(msg.data.messageId)
      }
      if (msg.name === "message:restore" && onUndeleteRef.current) {
        onUndeleteRef.current(msg.data.messageId)
      }
      if (msg.name === "message:reaction" && onReactionRef.current) {
        onReactionRef.current(msg.data)
      }
    })

    return () => {
      channel.unsubscribe()
      if (client.connection.state === "connected") {
        client.close()
      }
    }
  }, [threadId, user?.id])
}
