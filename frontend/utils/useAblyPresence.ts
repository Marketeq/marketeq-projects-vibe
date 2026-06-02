import { useCallback, useEffect, useRef, useState } from "react"
import { apiFetch } from "@/src/lib/api"
import { getAccessToken, getCurrentUser } from "@/utils/auth"
import * as Ably from "ably"

export interface PresenceMember {
  clientId: string
  connectionId?: string
  data?: any
}

const TYPING_TIMEOUT_MS = 5000

export function useAblyPresence(threadId: string) {
  const [members, setMembers] = useState<PresenceMember[]>([])
  const channelRef = useRef<Ably.RealtimeChannel | null>(null)
  const sendingTypingRef = useRef(false)
  const typingResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const staleTypingTimersRef = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map())

  useEffect(() => {
    if (!threadId) {
      setMembers([])
      return
    }

    const currentUser = getCurrentUser()
    if (!currentUser) return

    let cancelled = false
    let entered = false

    const client = new Ably.Realtime({
      authCallback: async (_tokenParams, callback) => {
        try {
          const token = getAccessToken()
          const tokenDetails = await apiFetch<any>(
            `/v1/threads/ably-token?threadId=${threadId}`,
            { method: "GET", headers: { Authorization: `Bearer ${token}` } }
          )
          if (!tokenDetails) {
            callback("Realtime token unavailable", null)
            return
          }
          callback(null, tokenDetails)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          callback(msg, null)
        }
      },
      clientId: currentUser.id,
    })

    const channel = client.channels.get(`presence:thread-${threadId}`)
    channelRef.current = channel

    const syncMembers = async () => {
      if (cancelled) return
      try {
        const current = await channel.presence.get()
        if (cancelled) return
        setMembers(
          current.map((m) => ({
            clientId: m.clientId,
            connectionId: m.connectionId,
            data: m.data,
          }))
        )
      } catch {
        // channel may have been detached by cleanup; ignore.
      }
    }

    const handlePresence = (member: Ably.PresenceMessage) => {
      if (cancelled) return
      void syncMembers()

      // Safety net: if a typing:true update never gets a typing:false
      // follow-up (dropped event, tab close, etc.), auto-clear locally
      // after the doc's 5s timeout so the indicator doesn't linger.
      if (member.action === "update" && member.data?.typing) {
        const existing = staleTypingTimersRef.current.get(member.clientId)
        if (existing) clearTimeout(existing)
        const timer = setTimeout(() => {
          setMembers((prev) =>
            prev.map((m) =>
              m.clientId === member.clientId
                ? { ...m, data: { ...(m.data ?? {}), typing: false } }
                : m
            )
          )
          staleTypingTimersRef.current.delete(member.clientId)
        }, TYPING_TIMEOUT_MS + 500)
        staleTypingTimersRef.current.set(member.clientId, timer)
      }
    }

    channel.presence.subscribe(handlePresence).catch(() => {})
    ;(async () => {
      try {
        await channel.presence.enter({ userId: currentUser.id, typing: false })
        if (cancelled) return
        entered = true
        await syncMembers()
      } catch (err) {
        // StrictMode double-mount or rapid thread switch can tear the
        // channel down before attach completes; that's not actionable.
        if (!cancelled) {
          console.warn(
            "[useAblyPresence] enter failed (probably tore down mid-attach):",
            err
          )
        }
      }
    })()

    return () => {
      cancelled = true
      channelRef.current = null

      if (typingResetTimerRef.current) {
        clearTimeout(typingResetTimerRef.current)
        typingResetTimerRef.current = null
      }
      staleTypingTimersRef.current.forEach((t) => clearTimeout(t))
      staleTypingTimersRef.current.clear()

      try {
        channel.presence.unsubscribe(handlePresence)
      } catch {}

      // Only attempt leave if we actually entered. Swallow any error —
      // client.close() below detaches the channel regardless, and
      // detaching mid-attach would otherwise produce a scary console error.
      ;(async () => {
        try {
          if (entered) await channel.presence.leave()
        } catch {}
        try {
          client.close()
        } catch {}
      })()

      sendingTypingRef.current = false
    }
  }, [threadId])

  // Publish our own typing state. Call with `true` from the composer's
  // onChange; the hook auto-clears after TYPING_TIMEOUT_MS of silence.
  const sendTyping = useCallback((typing: boolean) => {
    const channel = channelRef.current
    if (!channel) return
    const currentUser = getCurrentUser()
    if (!currentUser) return

    if (typing) {
      if (typingResetTimerRef.current) {
        clearTimeout(typingResetTimerRef.current)
      }
      typingResetTimerRef.current = setTimeout(() => {
        sendTyping(false)
      }, TYPING_TIMEOUT_MS)

      if (sendingTypingRef.current) return
      sendingTypingRef.current = true
      channel.presence
        .update({ userId: currentUser.id, typing: true })
        .catch((err) => {
          console.warn("[useAblyPresence] typing update failed", err)
          sendingTypingRef.current = false
        })
    } else {
      if (typingResetTimerRef.current) {
        clearTimeout(typingResetTimerRef.current)
        typingResetTimerRef.current = null
      }
      if (!sendingTypingRef.current) return
      sendingTypingRef.current = false
      channel.presence
        .update({ userId: currentUser.id, typing: false })
        .catch((err) => {
          console.warn("[useAblyPresence] typing clear failed", err)
        })
    }
  }, [])

  const isOnline = (userId: string | undefined | null) =>
    !!userId && members.some((m) => m.clientId === userId)

  const me = getCurrentUser()?.id
  const typingUserIds = members
    .filter((m) => m.clientId !== me && !!m.data?.typing)
    .map((m) => m.clientId)

  return { members, isOnline, sendTyping, typingUserIds }
}
