"use client"

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  ArrowLeft,
  ChevronDown,
  Edit05,
  MessageChatSquare,
  SearchMd,
  Send03,
  Star01,
} from "@blend-metrics/icons"
import { apiFetch } from "@/src/lib/api"
import { getCurrentUser } from "@/utils/auth"
import { useAblyChannel } from "@/utils/useAblyChannel"
import { useOnlineUsers } from "@/utils/useOnlineUsers"
import { cn } from "@/utils/functions"
import { ProjectAPI } from "@/service/http/project"
import { EditContextProvider } from "@/components/inbox-comps"
import {
  Bubble,
  YourBubble,
} from "@/app/(group)/inbox/components/message-components"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  ScrollArea,
  useToast,
} from "@/components/ui"

type ProjectThread = {
  id: string
  participantIds: string[]
  projectId?: string | null
  updatedAt?: string
  participantName?: string
  participantUsername?: string
  participantAvatarUrl?: string
  isPinned?: boolean
  isStarred?: boolean
  unreadCount?: number
  markedUnread?: boolean
  lastMessage?: { m_content?: string | null } | null
}

type ChatMessage = {
  id: string
  threadId: string
  senderId: string
  content?: string | null
  createdAt: string
}

const formatDay = (iso?: string) => {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const formatTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : ""

export function ProjectChatPanel({ projectId }: { projectId: string }) {
  const me = getCurrentUser()
  const myId = me?.id ? String(me.id) : ""
  const { isOnline } = useOnlineUsers()
  const { toast } = useToast()

  const editContextValue = useMemo(
    () => ({
      chat: "",
      onChatChange: () => {},
      isSaved: false,
      onSave: () => {},
      onUnsave: () => {},
    }),
    []
  )

  const [threads, setThreads] = useState<ProjectThread[]>([])
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState("")
  const [search, setSearch] = useState("")
  const scrollBottomRef = useRef<HTMLDivElement | null>(null)

  const selectedThread = useMemo(
    () => threads.find((t) => t.id === selectedId) ?? null,
    [threads, selectedId]
  )
  const otherId = useMemo(
    () => selectedThread?.participantIds.find((id) => id !== myId) ?? "",
    [selectedThread, myId]
  )

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    setLoadingThreads(true)
    apiFetch<ProjectThread[]>(`/v1/threads?projectId=${projectId}`)
      .then(async (rows) => {
        const list = rows ?? []
        const hydrated = await Promise.all(
          list.map(async (t) => {
            const oid = t.participantIds?.find((id) => id !== myId)
            if (!oid) return { ...t, participantName: "Visitor" }
            try {
              const u = await apiFetch<{
                username: string
                firstName?: string
                lastName?: string
                avatarUrl?: string
              }>(`/users/${oid}`)
              return {
                ...t,
                participantName: u.firstName?.trim() || u.username,
                participantUsername: u.username,
                participantAvatarUrl: u.avatarUrl,
              }
            } catch {
              return { ...t, participantName: "Visitor" }
            }
          })
        )
        if (!cancelled) setThreads(hydrated)
      })
      .catch(() => {
        if (!cancelled) setThreads([])
      })
      .finally(() => {
        if (!cancelled) setLoadingThreads(false)
      })
    return () => {
      cancelled = true
    }
  }, [projectId, myId])

  useEffect(() => {
    if (!selectedId) {
      setMessages([])
      return
    }
    // Opening a thread marks it read (same as /inbox) — clear the unread
    // badge locally so it reverts to a star, and persist on the backend.
    setThreads((prev) =>
      prev.map((t) =>
        t.id === selectedId
          ? { ...t, unreadCount: 0, markedUnread: false }
          : t
      )
    )
    apiFetch(`/v1/threads/${selectedId}/read`, { method: "PATCH" }).catch(
      () => {}
    )
    let cancelled = false
    apiFetch<{ messages: ChatMessage[] }>(
      `/v1/messages/thread/${selectedId}?all=true`
    )
      .then((res) => {
        if (!cancelled) setMessages(res?.messages ?? [])
      })
      .catch(() => {
        if (!cancelled) setMessages([])
      })
    return () => {
      cancelled = true
    }
  }, [selectedId])

  const onIncoming = useCallback((data: any) => {
    if (!data?.id) return
    setMessages((prev) =>
      prev.some((m) => m.id === data.id) ? prev : [...prev, data]
    )
  }, [])
  useAblyChannel(selectedId ?? "", onIncoming)

  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ block: "end" })
  }, [messages, selectedId])

  const sendMessage = useCallback(async () => {
    const text = draft.trim()
    if (!text || !selectedId) return
    setDraft("")
    try {
      const saved = await apiFetch<ChatMessage>(`/v1/messages`, {
        method: "POST",
        body: { threadId: selectedId, content: text, messageType: "text" },
      })
      if (saved?.id) {
        setMessages((prev) =>
          prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]
        )
      }
    } catch {
      setDraft(text)
    }
  }, [draft, selectedId])

  const visibleThreads = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return threads
    return threads.filter(
      (t) =>
        (t.participantName ?? "").toLowerCase().includes(q) ||
        (t.participantUsername ?? "").toLowerCase().includes(q)
    )
  }, [threads, search])

  // Promote a chat message to the project's Recent Questions (Chris's ruling:
  // manual, per-message, via the message option menu — no auto/LLM).
  const addToRecentQuestions = useCallback(
    async (m: any) => {
      if (!projectId || !m?.content?.trim()) return
      try {
        const existing = await ProjectAPI.GetProjectQuestions(projectId)
        const list = Array.isArray(existing?.data) ? existing.data : []
        if (
          list.some(
            (q: any) =>
              (q.question ?? "").trim() === String(m.content).trim()
          )
        ) {
          toast({ title: "Already in Recent Questions" })
          return
        }
        const entry = {
          question: String(m.content),
          answer: null,
          askedByName: selectedThread?.participantName ?? null,
          askedByUsername: selectedThread?.participantUsername ?? null,
          askedAt: m.createdAt ?? null,
        }
        await ProjectAPI.SaveProjectQuestions(projectId, [...list, entry])
        toast({ title: "Added to Recent Questions", variant: "success" })
      } catch {
        toast({
          title: "Couldn't add to Recent Questions",
          variant: "destructive",
        })
      }
    },
    [projectId, selectedThread, toast]
  )

  const renderMessages = () => {
    let lastDay = ""
    return messages.map((m) => {
      const mine = String(m.senderId) === myId
      const day = formatDay(m.createdAt)
      const showDay = day !== lastDay
      lastDay = day
      return (
        <Fragment key={m.id}>
          {showDay && (
            <div className="my-4 flex items-center justify-center">
              <span className="text-xs text-gray-400">{day}</span>
            </div>
          )}
          <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
            {mine ? (
              <div className="flex flex-col items-end gap-y-1">
                <Bubble message={m as any} currentUser={me as any} />
              </div>
            ) : (
              <YourBubble
                message={m as any}
                currentUser={me as any}
                participantName={selectedThread?.participantName}
                participantUsername={selectedThread?.participantUsername}
                participantAvatarUrl={selectedThread?.participantAvatarUrl}
                onAddToRecentQuestions={addToRecentQuestions}
              />
            )}
          </div>
        </Fragment>
      )
    })
  }

  // --- Thread view ---
  if (selectedThread) {
    return (
      <EditContextProvider value={editContextValue}>
        <div className="flex h-[600px] flex-col">
          <div className="flex items-center justify-between border-b border-gray-200 px-2 py-4">
          <div className="flex items-center gap-3">
            <IconButton
              variant="ghost"
              visual="gray"
              size="sm"
              onClick={() => setSelectedId(null)}
              aria-label="Back to chats"
            >
              <ArrowLeft className="size-4" />
            </IconButton>
            <div className="relative">
              <Avatar size="md">
                <AvatarImage
                  src={selectedThread.participantAvatarUrl || "/man.jpg"}
                  alt=""
                />
                <AvatarFallback>
                  {(selectedThread.participantName ?? "V").slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              {isOnline(otherId) && (
                <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-success-500" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-dark-blue-400">
                {selectedThread.participantName}{" "}
                <span className="font-normal text-gray-400">
                  @{selectedThread.participantUsername}
                </span>
              </p>
              <p className="text-xs text-gray-500">
                {isOnline(otherId) ? "Active now" : "Offline"}
              </p>
            </div>
          </div>
          <IconButton variant="ghost" visual="gray" size="sm" aria-label="Star">
            <Star01 className="size-4" />
          </IconButton>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-2 py-4">
            {renderMessages()}
            <div ref={scrollBottomRef} />
          </div>
        </ScrollArea>

        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center gap-2">
            <InputGroup className="flex-1">
              <Input
                placeholder="Send message..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
              />
            </InputGroup>
            <Button size="sm" onClick={sendMessage} disabled={!draft.trim()}>
              <Send03 className="size-4" />
              Send
            </Button>
          </div>
        </div>
        </div>
      </EditContextProvider>
    )
  }

  // --- Loading ---
  if (loadingThreads) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-400">
        Loading chats…
      </div>
    )
  }

  // --- Empty (Variant2) ---
  if (threads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <MessageChatSquare className="size-10 text-gray-300" />
        <div className="flex flex-col items-center gap-1.5 text-center">
          <h3 className="text-base font-semibold text-dark-blue-400">
            You Have No Recent Chats
          </h3>
          <p className="max-w-[320px] text-sm text-dark-blue-400">
            Once your project is live, chat threads will be visible here when
            visitors message you.
          </p>
        </div>
      </div>
    )
  }

  // --- Thread list (Variant7) ---
  const pinnedCount = threads.filter((t) => t.isPinned).length
  return (
    <div className="pt-4">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-lg font-bold text-dark-blue-400">All Messages</h2>
        <ChevronDown className="size-5 text-dark-blue-400" />
      </div>
      <div className="mb-3 flex items-center gap-2">
        <InputGroup className="flex-1">
          <InputLeftElement>
            <SearchMd className="size-4 text-gray-400" />
          </InputLeftElement>
          <Input
            placeholder="Search inbox"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>
        <IconButton
          variant="outlined"
          visual="gray"
          size="md"
          aria-label="New message"
        >
          <Edit05 className="size-4" />
        </IconButton>
      </div>

      {pinnedCount > 0 && (
        <div className="mb-1 flex items-center justify-between border-y border-gray-100 bg-gray-25 px-2 py-2">
          <span className="flex items-center gap-2 text-xs text-gray-500">
            <Star01 className="size-3.5" />
            {pinnedCount} pinned chat{pinnedCount !== 1 ? "s" : ""}
          </span>
          <button
            type="button"
            className="text-xs font-medium text-gray-500 hover:text-dark-blue-400"
          >
            View
          </button>
        </div>
      )}

      <div>
        {visibleThreads.map((t) => {
          const oid = t.participantIds.find((id) => id !== myId) ?? ""
          const unread = (t.unreadCount ?? 0) > 0 || !!t.markedUnread
          const preview =
            t.lastMessage?.m_content ?? "Tap to view conversation"
          return (
            <button
              type="button"
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={cn(
                "flex w-full items-start gap-3 border-b border-gray-100 px-2 py-4 text-left transition-colors",
                unread ? "bg-primary-25 hover:bg-primary-50" : "hover:bg-gray-25"
              )}
            >
              <div className="relative shrink-0">
                <Avatar size="md">
                  <AvatarImage src={t.participantAvatarUrl || "/man.jpg"} alt="" />
                  <AvatarFallback>
                    {(t.participantName ?? "V").slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                {isOnline(oid) && (
                  <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-success-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-sm text-dark-blue-400",
                    unread ? "font-bold" : "font-semibold"
                  )}
                >
                  {t.participantName}{" "}
                  <span className="font-normal text-gray-400">
                    @{t.participantUsername}
                  </span>
                </p>
                <p
                  className={cn(
                    "truncate text-sm",
                    unread
                      ? "font-medium text-dark-blue-400"
                      : "font-light text-gray-500"
                  )}
                >
                  {preview}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="text-xs text-gray-400">
                  {formatDay(t.updatedAt)}
                </span>
                {unread ? (
                  <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary-100 text-[10px] font-semibold text-primary-600">
                    {t.unreadCount}
                  </span>
                ) : (
                  <Star01
                    className={cn(
                      "size-4",
                      t.isStarred
                        ? "fill-warning-400 text-warning-400"
                        : "text-gray-300"
                    )}
                  />
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
