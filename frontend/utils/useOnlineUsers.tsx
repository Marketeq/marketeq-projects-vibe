"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import * as Ably from "ably"
import { apiFetch } from "@/src/lib/api"
import { getAccessToken, getCurrentUser } from "@/utils/auth"

// Global presence channel — every authenticated client joins on mount and
// observes who else is online. Drives the avatar dot in the inbox left/right
// sidebars and the chat header (replacing the previous per-thread-only check
// which only worked when both users were viewing the same thread).
const PRESENCE_CHANNEL = "presence:online"

interface OnlineUsersContextValue {
  isOnline: (userId: string | null | undefined) => boolean
  onlineIds: ReadonlySet<string>
}

const OnlineUsersContext = createContext<OnlineUsersContextValue>({
  isOnline: () => false,
  onlineIds: new Set(),
})

export function OnlineUsersProvider({ children }: { children: ReactNode }) {
  const [onlineIds, setOnlineIds] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser) return

    let cancelled = false
    let entered = false

    const client = new Ably.Realtime({
      authCallback: async (_tokenParams, callback) => {
        try {
          const token = getAccessToken()
          // No threadId — backend returns a token with the global
          // `presence:online` capability (plus `user:${userId}`).
          const tokenDetails = await apiFetch<any>("/v1/threads/ably-token", {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!tokenDetails) {
            callback("Realtime token unavailable", null)
            return
          }
          callback(null, tokenDetails)
        } catch (err) {
          callback(err instanceof Error ? err.message : String(err), null)
        }
      },
      clientId: currentUser.id,
    })

    const channel = client.channels.get(PRESENCE_CHANNEL)

    const sync = async () => {
      if (cancelled) return
      try {
        const present = await channel.presence.get()
        if (cancelled) return
        setOnlineIds(new Set(present.map((m) => m.clientId)))
      } catch {
        // detached during cleanup; ignore.
      }
    }

    const handle = (_msg: Ably.PresenceMessage) => {
      if (!cancelled) void sync()
    }

    channel.presence.subscribe(handle).catch(() => {})
    ;(async () => {
      try {
        await channel.presence.enter({ online: true })
        if (cancelled) return
        entered = true
        await sync()
      } catch (err) {
        if (!cancelled) {
          console.warn("[useOnlineUsers] enter failed:", err)
        }
      }
    })()

    return () => {
      cancelled = true
      try {
        channel.presence.unsubscribe(handle)
      } catch {}
      ;(async () => {
        try {
          if (entered) await channel.presence.leave()
        } catch {}
        try {
          client.close()
        } catch {}
      })()
    }
  }, [])

  const value = useMemo<OnlineUsersContextValue>(
    () => ({
      onlineIds,
      isOnline: (userId) => !!userId && onlineIds.has(userId),
    }),
    [onlineIds],
  )

  return (
    <OnlineUsersContext.Provider value={value}>
      {children}
    </OnlineUsersContext.Provider>
  )
}

export function useOnlineUsers(): OnlineUsersContextValue {
  return useContext(OnlineUsersContext)
}
