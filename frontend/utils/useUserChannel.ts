import { useEffect, useRef } from "react"
import { apiFetch } from "@/src/lib/api"
import { getAccessToken, getCurrentUser } from "@/utils/auth"
import * as Ably from "ably"

type ThreadStatePatch = Record<string, unknown> & { removed?: boolean }

export interface UserChannelHandlers {
  onThreadStateChanged?: (evt: {
    threadId: string
    patch: ThreadStatePatch
  }) => void
  onListAssignmentsChanged?: (evt: {
    threadId: string
    listIds: string[]
  }) => void
  onListsChanged?: () => void
  onMessageRead?: (evt: { messageId: string; readerId?: string }) => void
}

/**
 * Subscribes to the user:{userId} Ably channel for cross-device/tab sync
 * of thread state changes (pin/star/archive/...) per Doc 05 EC-1.4.
 */
export function useUserChannel(handlers: UserChannelHandlers) {
  const ref = useRef(handlers)
  useEffect(() => {
    ref.current = handlers
  }, [handlers])

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser) return

    // Reuse the ably-token endpoint. Capability is wildcard so it covers user:{id}.
    // We piggy-back on a known threadId request param or just pass empty; backend ignores for token issuance.
    const client = new Ably.Realtime({
      authCallback: async (_params, cb) => {
        try {
          const token = getAccessToken()
          const details = await apiFetch<any>(`/v1/threads/ably-token`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!details) {
            cb("Realtime token unavailable", null)
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
      switch (msg.name) {
        case "thread:state-changed":
          ref.current.onThreadStateChanged?.(msg.data)
          break
        case "thread:list-assignments-changed":
          ref.current.onListAssignmentsChanged?.(msg.data)
          break
        case "thread:lists-changed":
          ref.current.onListsChanged?.()
          break
        case "message:read":
          // Doc 05 EC-7.5: ignore read receipts where readerId === me.
          // Backend should only fan-out to the sender, but be defensive
          // in case backend ever publishes to the wrong channel.
          if (msg.data?.readerId && msg.data.readerId === currentUser.id) break
          ref.current.onMessageRead?.(msg.data)
          break
      }
    })

    return () => {
      channel.unsubscribe()
      client.close()
    }
  }, [])
}
