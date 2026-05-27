"use client"

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useAuth } from "@/contexts/auth"
import { decryptAES } from "@/src/crypto/e2ee"
import { loadPrivateKey } from "@/src/crypto/keys"
import { loadKey, saveKey } from "@/src/crypto/storage"
import { apiFetch } from "@/src/lib/api"
import { getAccessToken } from "@/utils/auth"
import { useUserChannel } from "@/utils/useUserChannel"
import type { Conversation } from "@/types/conversation"

interface ParticipantInfo {
  name: string
  username?: string
  avatarUrl?: string
}

export interface InboxThreadSummary extends Conversation {
  displayName: string
  displayAvatarUrl?: string
  displayInitial: string
  lastMessagePreview: string
  lastMessageAt: string | null
  hasUnread: boolean
  unreadCount: number
}

interface InboxThreadsContextValue {
  threads: InboxThreadSummary[]
  totalUnread: number
  loading: boolean
  refetch: () => void
}

const InboxThreadsContext = createContext<InboxThreadsContextValue>({
  threads: [],
  totalUnread: 0,
  loading: false,
  refetch: () => {},
})

function buildSummary(
  conv: Conversation,
  participants: Map<string, ParticipantInfo>,
  groupNames: Map<string, string>,
  decryptedPreviews: Map<string, string>,
  currentUserId: string | undefined
): InboxThreadSummary {
  let displayName = "Conversation"
  let displayAvatarUrl: string | undefined

  if (conv.isGroup) {
    displayName = groupNames.get(conv.id) ?? conv.group?.name ?? "Group"
  } else {
    const otherId = conv.participantIds?.find((id) => id !== currentUserId)
    const info = otherId ? participants.get(otherId) : undefined
    displayName = info?.name ?? "Conversation"
    displayAvatarUrl = info?.avatarUrl
  }

  const lm = (conv as { lastMessage?: Record<string, any> }).lastMessage
  let lastMessagePreview = "No messages yet"
  let lastMessageAt: string | null = null
  if (lm) {
    lastMessageAt = lm.m_createdAt ?? lm.createdAt ?? null
    const decrypted = decryptedPreviews.get(conv.id)
    if (decrypted) {
      lastMessagePreview = decrypted
    } else if (lm.attachment?.fileName) {
      lastMessagePreview = lm.attachment.fileName
    } else if (lm.m_messageType === "file" || lm.messageType === "file") {
      lastMessagePreview = "Attachment"
    } else if (lm.m_content || lm.content) {
      lastMessagePreview = lm.m_content ?? lm.content
    } else if (lm.m_ciphertext || lm.ciphertext) {
      lastMessagePreview = "Encrypted message"
    } else {
      lastMessagePreview = "New message"
    }
  }

  const unreadCount = ((conv as { unreadCount?: number }).unreadCount ?? 0) | 0
  const hasUnread = unreadCount > 0 || conv.markedUnread === true

  return {
    ...conv,
    displayName,
    displayAvatarUrl,
    displayInitial: (displayName || "?").trim().charAt(0).toUpperCase() || "?",
    lastMessagePreview,
    lastMessageAt,
    hasUnread,
    unreadCount,
  }
}

export function InboxThreadsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [participants, setParticipants] = useState<
    Map<string, ParticipantInfo>
  >(new Map())
  const [groupNames, setGroupNames] = useState<Map<string, string>>(new Map())
  const [decryptedPreviews, setDecryptedPreviews] = useState<
    Map<string, string>
  >(new Map())
  const [loading, setLoading] = useState(false)
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null)
  const fetchedUserIdsRef = useRef<Set<string>>(new Set())
  const fetchedGroupIdsRef = useRef<Set<string>>(new Set())
  const decryptedKeyRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!userId) {
      setPrivateKey(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const pk = await loadPrivateKey(userId)
        if (!cancelled) setPrivateKey(pk)
      } catch {
        if (!cancelled) setPrivateKey(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  const fetchThreads = useCallback(async () => {
    if (!userId) return
    const token = getAccessToken()
    if (!token) return
    try {
      setLoading(true)
      const data = await apiFetch<Conversation[]>("/v1/threads", {
        headers: { Authorization: `Bearer ${token}` },
      })
      setConversations(Array.isArray(data) ? data : [])
    } catch {
      setConversations([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchThreads()
  }, [fetchThreads])

  useEffect(() => {
    if (!userId || conversations.length === 0) return
    const token = getAccessToken()
    if (!token) return
    let cancelled = false
    ;(async () => {
      for (const conv of conversations) {
        if (cancelled) return
        if (conv.isGroup) {
          if (fetchedGroupIdsRef.current.has(conv.id)) continue
          fetchedGroupIdsRef.current.add(conv.id)
          if (conv.group?.name) {
            setGroupNames((prev) =>
              new Map(prev).set(conv.id, conv.group!.name)
            )
            continue
          }
          try {
            const g = await apiFetch<{ name?: string }>(
              `/v1/threads/${conv.id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
            if (cancelled) return
            if (g?.name) {
              setGroupNames((prev) => new Map(prev).set(conv.id, g.name!))
            }
          } catch {
            /* keep fallback */
          }
          continue
        }
        const otherId = conv.participantIds?.find((id) => id !== userId)
        if (!otherId || fetchedUserIdsRef.current.has(otherId)) continue
        fetchedUserIdsRef.current.add(otherId)
        try {
          const u = await apiFetch<{
            firstName?: string
            username?: string
            avatarUrl?: string
          }>(`/users/${otherId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (cancelled) return
          const name = u.firstName?.trim() || u.username || "Unknown User"
          setParticipants((prev) =>
            new Map(prev).set(otherId, {
              name,
              username: u.username,
              avatarUrl: u.avatarUrl,
            })
          )
        } catch {
          /* keep fallback */
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [conversations, userId])

  useEffect(() => {
    if (!userId || conversations.length === 0) return
    const token = getAccessToken()
    if (!token) return
    let cancelled = false
    ;(async () => {
      for (const conv of conversations) {
        if (cancelled) return
        const lm = (conv as { lastMessage?: Record<string, any> }).lastMessage
        if (!lm) continue
        if (lm.m_content || lm.content) continue
        const ciphertext: string | undefined = lm.m_ciphertext ?? lm.ciphertext
        if (!ciphertext) continue
        if (decryptedKeyRef.current.has(conv.id)) continue

        let key: Uint8Array | null = null
        try {
          key = loadKey(conv.id)
        } catch {
          /* not cached */
        }

        if (!key) {
          if (!privateKey) continue
          try {
            const { encryptedKey } = await apiFetch<{ encryptedKey: string }>(
              `/api/messaging/conversations/${conv.id}/key?isGroup=${conv.isGroup}`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
            const wrapped = Uint8Array.from(atob(encryptedKey), (c) =>
              c.charCodeAt(0)
            )
            const raw = await window.crypto.subtle.decrypt(
              { name: "RSA-OAEP" },
              privateKey,
              wrapped
            )
            key = new Uint8Array(raw)
            saveKey(conv.id, btoa(String.fromCharCode(...key)))
          } catch {
            continue
          }
        }

        try {
          const decrypted = await decryptAES(ciphertext, key)
          if (cancelled) return
          decryptedKeyRef.current.add(conv.id)
          setDecryptedPreviews((prev) => new Map(prev).set(conv.id, decrypted))
        } catch {
          /* leave placeholder */
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [conversations, userId, privateKey])

  useUserChannel({
    onThreadStateChanged: ({ threadId }) => {
      if (threadId) {
        decryptedKeyRef.current.delete(threadId)
        setDecryptedPreviews((prev) => {
          if (!prev.has(threadId)) return prev
          const next = new Map(prev)
          next.delete(threadId)
          return next
        })
      }
      fetchThreads()
    },
  })

  const threads = useMemo<InboxThreadSummary[]>(
    () =>
      conversations.map((c) =>
        buildSummary(c, participants, groupNames, decryptedPreviews, userId)
      ),
    [conversations, participants, groupNames, decryptedPreviews, userId]
  )

  const totalUnread = useMemo(
    () => threads.reduce((sum, t) => sum + t.unreadCount, 0),
    [threads]
  )

  const value = useMemo<InboxThreadsContextValue>(
    () => ({ threads, totalUnread, loading, refetch: fetchThreads }),
    [threads, totalUnread, loading, fetchThreads]
  )

  return (
    <InboxThreadsContext.Provider value={value}>
      {children}
    </InboxThreadsContext.Provider>
  )
}

export function useInboxThreads() {
  return useContext(InboxThreadsContext)
}
