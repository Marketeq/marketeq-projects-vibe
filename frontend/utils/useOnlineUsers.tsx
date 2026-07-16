"use client"

import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useAuth } from "@/contexts/auth"
import { apiFetch } from "@/src/lib/api"
import * as Ably from "ably"

// Global presence channel — every authenticated client joins on mount and
// observes who else is online. Drives the avatar dot in the inbox left/right
// sidebars and the chat header (replacing the previous per-thread-only check
// which only worked when both users were viewing the same thread).
const PRESENCE_CHANNEL = "presence:online"

// Doc 05 EC-7.2: brief Ably disconnects (<10s) should not flicker the
// presence dot offline/online. When a member disappears from the channel,
// keep them in `onlineIds` for this long before actually marking offline.
const OFFLINE_GRACE_MS = 10_000
const isExpectedRealtimeUnavailable = (err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  return /realtime token unavailable|connection to server unavailable|connection closed/i.test(
    message
  )
}

interface OnlineUsersContextValue {
  isOnline: (userId: string | null | undefined) => boolean
  onlineIds: ReadonlySet<string>
}

const OnlineUsersContext = createContext<OnlineUsersContextValue>({
  isOnline: () => false,
  onlineIds: new Set(),
})

export function OnlineUsersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [onlineIds, setOnlineIds] = useState<ReadonlySet<string>>(new Set())
  const pendingOfflineRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  )

  useEffect(() => {
    if (!user?.id) return

    let cancelled = false
    let entered = false
    const pending = pendingOfflineRef.current

    const client = new Ably.Realtime({
      authCallback: async (_tokenParams, callback) => {
        try {
          // No threadId — backend returns a token with the global
          // `presence:online` capability (plus `user:${userId}`).
          const tokenDetails = await apiFetch<any>("/v1/threads/ably-token", {
            method: "GET",
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
      clientId: user.id,
    })

    const channel = client.channels.get(PRESENCE_CHANNEL)

    const sync = async () => {
      if (cancelled) return
      try {
        const present = await channel.presence.get()
        if (cancelled) return
        const presentSet = new Set(present.map((m) => m.clientId))
        setOnlineIds((prev) => {
          const next = new Set<string>(prev)
          for (const id of presentSet) {
            next.add(id)
            const t = pending.get(id)
            if (t) {
              clearTimeout(t)
              pending.delete(id)
            }
          }
          for (const id of prev) {
            if (!presentSet.has(id) && !pending.has(id)) {
              const timer = setTimeout(() => {
                pending.delete(id)
                setOnlineIds((cur) => {
                  if (!cur.has(id)) return cur
                  const updated = new Set<string>(cur)
                  updated.delete(id)
                  return updated
                })
              }, OFFLINE_GRACE_MS)
              pending.set(id, timer)
            }
          }
          return next
        })
      } catch {
        // detached during cleanup; ignore.
      }
    }

    const handle = (_msg: Ably.PresenceMessage) => {
      if (!cancelled) void sync()
    }

    channel.presence.subscribe(handle).catch(() => {})

    // Doc 05 EC-14.2: only one tab per browser should hold the Ably
    // presence membership. Other tabs still observe, but defer the
    // .enter() to the lock-holder so we don't double-count.
    let releaseLeaderLock: (() => void) | null = null
    const enterAsLeader = async () => {
      try {
        await channel.presence.enter({ online: true })
        if (cancelled) {
          channel.presence.leave().catch(() => {})
          return
        }
        entered = true
        await sync()
      } catch (err) {
        if (!cancelled && !isExpectedRealtimeUnavailable(err)) {
          console.warn("[useOnlineUsers] enter failed:", err)
        }
      }
    }

    const locks = (typeof navigator !== "undefined" ? navigator : undefined)
      ?.locks as LockManager | undefined
    if (locks?.request) {
      locks
        .request(
          "messaging-presence-leader",
          { mode: "exclusive" },
          () =>
            new Promise<void>((resolve) => {
              if (cancelled) {
                resolve()
                return
              }
              releaseLeaderLock = resolve
              void enterAsLeader()
            })
        )
        .catch(() => {
          if (!cancelled) void enterAsLeader()
        })
    } else {
      void enterAsLeader()
    }

    return () => {
      cancelled = true
      for (const timer of pending.values()) clearTimeout(timer)
      pending.clear()
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
        if (releaseLeaderLock) {
          releaseLeaderLock()
          releaseLeaderLock = null
        }
      })()
    }
  }, [user?.id])

  const value = useMemo<OnlineUsersContextValue>(
    () => ({
      onlineIds,
      isOnline: (userId) => !!userId && onlineIds.has(userId),
    }),
    [onlineIds]
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
