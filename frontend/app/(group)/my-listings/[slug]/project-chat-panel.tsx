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
  AlertTriangle,
  Archive,
  ArrowLeft,
  Attachment01,
  ChevronDown,
  Edit05,
  File,
  Image03,
  Info,
  Mail05,
  MessageChatSquare,
  MoreHorizontal,
  Pin02,
  SearchMd,
  Send,
  Smile,
  Star,
  Star01,
  Trash2,
  UploadCloud,
  X,
} from "@blend-metrics/icons"
import {
  DropboxBrand,
  GoogleDrive1Brand,
  MsOnedriveBrand,
} from "@blend-metrics/icons/brands"
import { DropdownMenuArrow } from "@radix-ui/react-dropdown-menu"
import { format, isToday, isYesterday, parseISO } from "date-fns"
import { useToggle } from "react-use"
import { apiFetch } from "@/src/lib/api"
import { getCurrentUser } from "@/utils/auth"
import { useAblyChannel } from "@/utils/useAblyChannel"
import { useOnlineUsers } from "@/utils/useOnlineUsers"
import { cn, EmojiProperties, type DataEmoji } from "@/utils/functions"
import { getPublicBackendUrl } from "@/lib/runtime-urls"
import { ProjectAPI } from "@/service/http/project"
import { Conversation } from "@/types/conversation"
import { type SearchDoc, makeSearcher } from "@/src/search/message-search"
import { EmojiPicker, type Result as TenorGif } from "@/components/emoji-picker"
import { Spinner } from "@/components/ui/spinner/spinner"
import { Chat, ChatsContextProvider } from "@/components/chat"
import { EditContextProvider } from "@/components/inbox-comps"
import {
  Bubble,
  YourBubble,
} from "@/app/(group)/inbox/components/message-components"
import { BlockReportDialog } from "@/app/(group)/inbox/components/block-report-dialog"
import { OneDrivePickerDialog } from "@/app/(group)/inbox/components/onedrive-picker-dialog"
import {
  openDropboxChooser,
  openGoogleDrivePicker,
} from "@/app/(group)/inbox/hooks/use-cloud-picker"
import {
  type SearchFileResult,
  type SearchLinkResult,
  type SearchMessageResult,
  type SearchPeopleResult,
  SearchResultsPanel,
  extractUrls,
} from "@/app/(group)/inbox/components/search-results-panel"
import { useThreadActions } from "@/app/(group)/inbox/hooks/use-thread-actions"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  ScrollArea,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
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
  isArchived?: boolean
  isSpam?: boolean
  isTrashed?: boolean
  unreadCount?: number
  markedUnread?: boolean
  lastMessage?: {
    m_content?: string | null
    m_createdAt?: string
    attachment?: any
  } | null
  lastMessagePreview?: string
}

type ChatMessage = {
  id: string
  threadId: string
  senderId: string
  content?: string | null
  createdAt: string
  messageType?: string
  replyToMessageId?: string | null
  reactions?: Array<{ userId: string; emoji: string; createdAt?: string }>
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

const previewFromLastMessage = (lm: any): string => {
  if (!lm) return ""
  if (lm.m_content) return lm.m_content
  const att = lm.attachment
  if (att?.a_fileName || att?.a_fileType || att?.fileName || att?.fileType) {
    const fileType = att.a_fileType || att.fileType || ""
    const isImage = fileType.startsWith("image/")
    const name = att.a_fileName || att.fileName || (isImage ? "Image" : "File")
    return `${isImage ? "🖼️" : "📎"} ${name}`
  }
  return ""
}

const fileMessagePreview = (file: File): string => {
  const isImage = (file.type || "").startsWith("image/")
  return `${isImage ? "🖼️" : "📎"} ${file.name}`
}

const formatDateSeparator = (iso: string): string => {
  const d = parseISO(iso)
  if (isToday(d)) return "Today"
  if (isYesterday(d)) return "Yesterday"
  const now = new Date()
  return d.getFullYear() === now.getFullYear()
    ? format(d, "MMM d")
    : format(d, "MMM d, yyyy")
}

const DateSeparator = ({ label }: { label: string }) => (
  <div
    className="flex items-center gap-x-3 py-1"
    role="separator"
    aria-label={label}
  >
    <div className="h-px flex-1 bg-gray-200" />
    <span className="shrink-0 text-[11px] font-medium text-gray-500">
      {label}
    </span>
    <div className="h-px flex-1 bg-gray-200" />
  </div>
)

const API_BASE_URL = getPublicBackendUrl() || "http://localhost:3002/api"

const FILE_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.mp4,.mov,.jpg,.jpeg,.png,.gif,.webp,.svg"

const MAX_FILE_BYTES = 50 * 1024 * 1024

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
  "video/mp4",
  "video/quicktime",
])

interface RejectedFile {
  id: string
  name: string
  size: number
  error: string
}

const validateFile = (file: File): string | null => {
  if (file.size > MAX_FILE_BYTES) {
    return `Too large (max ${Math.round(MAX_FILE_BYTES / (1024 * 1024))}MB)`
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return "Unsupported file type"
  }
  return null
}

const providerLabel = (p: "google-drive" | "dropbox" | "onedrive") =>
  p === "google-drive" ? "Google Drive" : p === "dropbox" ? "Dropbox" : "OneDrive"

const formatBytes = (size: number): string =>
  size < 1024
    ? `${size} B`
    : size < 1024 * 1024
      ? `${(size / 1024).toFixed(1)} KB`
      : `${(size / (1024 * 1024)).toFixed(1)} MB`

const FILTERS = [
  ["all", "All Messages"],
  ["unread", "Unread"],
  ["starred", "Starred"],
  ["sent", "Sent"],
  ["archived", "Archived"],
  ["spam", "Spam"],
  ["trash", "Trash"],
] as const

export function ProjectChatPanel({ projectId }: { projectId: string }) {
  const me = useMemo(() => getCurrentUser(), [])
  const myId = me?.id ? String(me.id) : ""
  const { isOnline } = useOnlineUsers()
  const { toast } = useToast()
  const threadActions = useThreadActions()

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
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null)
  const [draft, setDraft] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadModalMode, setUploadModalMode] = useState<
    "image" | "file" | null
  >(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [rejectedFiles, setRejectedFiles] = useState<RejectedFile[]>([])
  const [cloudFetching, setCloudFetching] = useState<{
    provider: "google-drive" | "dropbox" | "onedrive"
    count: number
  } | null>(null)
  const [onedriveDialogOpen, setOnedriveDialogOpen] = useState(false)
  const [showHeaderDeleteConfirm, setShowHeaderDeleteConfirm] = useState(false)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const scrollBottomRef = useRef<HTMLDivElement | null>(null)

  const [docs, setDocs] = useState<SearchDoc[]>([])
  const [indexing, setIndexing] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchDoc[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searcherRef = useRef<(q: string) => SearchDoc[]>(() => [])

  const [pinnedChats, setPinnedChats] = useState(0)
  const [showPinnedIcon, toggleShowPinnedIcon] = useToggle(false)
  const [checkedChats, setCheckedChats] = useState(0)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [bulkActionPending, setBulkActionPending] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)

  const onChatPinned = useCallback(
    (value: boolean) =>
      value
        ? setPinnedChats((prev) => prev + 1)
        : setPinnedChats((prev) => prev - 1),
    []
  )
  const onChatChecked = useCallback(
    (value: boolean) =>
      value
        ? setCheckedChats((prev) => prev + 1)
        : setCheckedChats((prev) => prev - 1),
    []
  )
  const resetCheckedChats = useCallback(() => {
    setCheckedChats(0)
    setCheckedIds(new Set())
  }, [])

  useEffect(() => {
    if (pinnedChats === 0 && showPinnedIcon) toggleShowPinnedIcon(false)
  }, [pinnedChats, showPinnedIcon, toggleShowPinnedIcon])

  const chatsCtx = useMemo(
    () => ({
      pinnedChats,
      setPinnedChats,
      onChatPinned,
      showPinnedIcon,
      toggleShowPinnedIcon,
      onChatChecked,
      resetCheckedChats,
      checkedChats,
    }),
    [
      pinnedChats,
      onChatPinned,
      showPinnedIcon,
      toggleShowPinnedIcon,
      onChatChecked,
      resetCheckedChats,
      checkedChats,
    ]
  )

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
            const lastMessagePreview = previewFromLastMessage(
              (t as any).lastMessage
            )
            const oid = t.participantIds?.find((id) => id !== myId)
            if (!oid)
              return { ...t, participantName: "Visitor", lastMessagePreview }
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
                lastMessagePreview,
              }
            } catch {
              return { ...t, participantName: "Visitor", lastMessagePreview }
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
    setPinnedChats(threads.filter((t) => t.isPinned).length)
  }, [threads])

  const threadIdsKey = useMemo(
    () => threads.map((t) => t.id).sort().join(","),
    [threads]
  )

  useEffect(() => {
    searcherRef.current = makeSearcher(docs)
  }, [docs])

  useEffect(() => {
    if (!threadIdsKey) return
    let cancelled = false
    setIndexing(true)
    ;(async () => {
      try {
        const ids = threadIdsKey.split(",")
        const built: SearchDoc[] = []
        await Promise.all(
          ids.map(async (tid) => {
            try {
              const res = await apiFetch<{ messages: any[] }>(
                `/v1/messages/thread/${tid}?all=true`
              )
              for (const m of res?.messages ?? []) {
                if (m.deleted || m.isDeleted) continue
                const content = m.content || ""
                if (!content && !m.attachments?.length) continue
                built.push({
                  id: m.id,
                  threadId: tid,
                  senderId: String(m.senderId),
                  content,
                  createdAt: m.createdAt,
                  attachments: m.attachments,
                })
              }
            } catch {}
          })
        )
        if (!cancelled) setDocs(built)
      } finally {
        if (!cancelled) setIndexing(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [threadIdsKey])

  useEffect(() => {
    const q = search.trim()
    if (!q) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }
    setSearchLoading(true)
    const handle = setTimeout(() => {
      setSearchResults(searcherRef.current(q))
      setSearchLoading(false)
    }, 150)
    return () => clearTimeout(handle)
  }, [search, docs])

  useEffect(() => {
    if (!selectedId) {
      setMessages([])
      return
    }
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
  useAblyChannel(
    selectedId ?? "",
    onIncoming,
    undefined,
    (messageId) =>
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? ({ ...m, isDeleted: true } as any) : m
        )
      ),
    (messageId) =>
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? ({ ...m, isDeleted: false } as any) : m
        )
      ),
    (data) => {
      const id = data?.id ?? data?.messageId
      if (!id) return
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? ({
                ...m,
                content: data.content ?? data.m_content ?? m.content,
                edited: true,
              } as any)
            : m
        )
      )
    },
    ({ messageId, reactions }) =>
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? ({ ...m, reactions: reactions as any }) : m
        )
      )
  )

  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ block: "end" })
  }, [messages.length, selectedId])

  useEffect(() => {
    const ta = composerRef.current
    if (!ta) return
    if (!draft) {
      ta.style.height = ""
      return
    }
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`
  }, [draft])

  const uploadFile = useCallback(
    async (file: File) => {
      if (!selectedId) return
      setUploading(true)
      try {
        const fd = new FormData()
        fd.append("file", file)
        fd.append("conversationId", selectedId)
        const res = await fetch(`${API_BASE_URL}/messaging/upload`, {
          method: "POST",
          credentials: "include",
          body: fd,
        })
        if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
        const result = await res.json()
        const msg = result?.message
        if (msg?.id) {
          const withAtt = {
            ...msg,
            attachments:
              msg.attachments ??
              (result.attachment ? [result.attachment] : []),
          }
          setMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, withAtt]
          )
          const nowIso = new Date().toISOString()
          const preview = fileMessagePreview(file)
          setThreads((prev) =>
            prev.map((t) =>
              t.id === selectedId
                ? {
                    ...t,
                    lastMessage: { m_content: null, m_createdAt: nowIso },
                    lastMessagePreview: preview,
                    updatedAt: nowIso,
                  }
                : t
            )
          )
        }
      } catch (err) {
        console.error("[ProjectChatPanel] file upload failed:", err)
        toast({ title: "Couldn't upload file", variant: "destructive" })
      } finally {
        setUploading(false)
      }
    },
    [selectedId, toast]
  )

  const sendMessage = useCallback(async () => {
    const text = draft.trim()
    const files = selectedFiles
    if (!selectedId) return
    if (!text && !files.length) return

    if (files.length) {
      setSelectedFiles([])
      setRejectedFiles([])
      for (const f of files) {
        await uploadFile(f)
      }
    }

    if (!text) return
    setDraft("")
    const replyToId = replyingTo?.id
    setReplyingTo(null)
    try {
      const saved = await apiFetch<ChatMessage>(`/v1/messages`, {
        method: "POST",
        body: {
          threadId: selectedId,
          content: text,
          messageType: "text",
          replyToMessageId: replyToId,
        },
      })
      if (saved?.id) {
        setMessages((prev) =>
          prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]
        )
        const nowIso = new Date().toISOString()
        setThreads((prev) =>
          prev.map((t) =>
            t.id === selectedId
              ? {
                  ...t,
                  lastMessage: { m_content: text, m_createdAt: nowIso },
                  lastMessagePreview: text,
                  updatedAt: nowIso,
                }
              : t
          )
        )
      }
    } catch {
      setDraft(text)
    }
  }, [draft, selectedId, replyingTo, selectedFiles, uploadFile])

  const messageById = useMemo(
    () => new Map(messages.map((m) => [m.id, m])),
    [messages]
  )

  const handleToggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (myId) {
        const nowIso = new Date().toISOString()
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m
            const current = m.reactions ?? []
            const idx = current.findIndex(
              (r) => r.userId === myId && r.emoji === emoji
            )
            const next =
              idx >= 0
                ? current.filter((_, i) => i !== idx)
                : [...current, { userId: myId, emoji, createdAt: nowIso }]
            return { ...m, reactions: next }
          })
        )
      }
      try {
        await apiFetch(`/v1/messages/${messageId}/reactions`, {
          method: "POST",
          body: { emoji },
        })
      } catch (err) {
        console.error("[ProjectChatPanel] toggleReaction failed:", err)
      }
    },
    [myId]
  )

  const handleReply = useCallback(
    (msg: any) => setReplyingTo(msg as ChatMessage),
    []
  )

  const handleStartEdit = useCallback((msg: any) => {
    setEditingMessage(msg as ChatMessage)
    setDraft(msg.content || "")
    setReplyingTo(null)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null)
    setDraft("")
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!editingMessage) return
    const newContent = draft.trim()
    if (!newContent || newContent === (editingMessage.content || "").trim()) {
      handleCancelEdit()
      return
    }
    const messageId = editingMessage.id
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? ({ ...m, content: newContent, edited: true } as any)
          : m
      )
    )
    setEditingMessage(null)
    setDraft("")
    try {
      await apiFetch(`/v1/messages/${messageId}`, {
        method: "PATCH",
        body: { content: newContent },
      })
    } catch (err) {
      console.error("[ProjectChatPanel] edit failed:", err)
    }
  }, [editingMessage, draft, handleCancelEdit])

  const handleEmojiSelect = useCallback((emoji: DataEmoji) => {
    const emojiChar = String.fromCodePoint(
      ...emoji[EmojiProperties.unified]
        .split("-")
        .map((hex) => parseInt(hex, 16))
    )
    setDraft((prev) => (prev || "") + emojiChar)
  }, [])

  const handleGifSelect = useCallback(
    async (gif: TenorGif) => {
      if (!selectedId) return
      const url = gif.media?.[0]?.gif?.url
      if (!url) return
      try {
        const saved = await apiFetch<ChatMessage>(`/v1/messages`, {
          method: "POST",
          body: { threadId: selectedId, content: url, messageType: "gif" },
        })
        if (saved?.id) {
          const withType = {
            ...saved,
            messageType: "gif",
            content: (saved as any).content ?? url,
          } as ChatMessage
          setMessages((prev) =>
            prev.some((m) => m.id === saved.id) ? prev : [...prev, withType]
          )
          const nowIso = new Date().toISOString()
          setThreads((prev) =>
            prev.map((t) =>
              t.id === selectedId
                ? {
                    ...t,
                    lastMessage: { m_content: url, m_createdAt: nowIso },
                    lastMessagePreview: "🎞️ GIF",
                    updatedAt: nowIso,
                  }
                : t
            )
          )
        }
      } catch (err) {
        console.error("[ProjectChatPanel] gif send failed:", err)
      }
    },
    [selectedId]
  )

  const addFiles = useCallback((files: File[]) => {
    if (files.length === 0) return
    const valid: File[] = []
    const rejected: RejectedFile[] = []
    for (const f of files) {
      const error = validateFile(f)
      if (error) {
        rejected.push({
          id: `${f.name}-${f.size}-${f.lastModified}-${Math.random()}`,
          name: f.name,
          size: f.size,
          error,
        })
      } else {
        valid.push(f)
      }
    }
    if (valid.length) setSelectedFiles((prev) => [...prev, ...valid])
    if (rejected.length) setRejectedFiles((prev) => [...prev, ...rejected])
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      addFiles(Array.from(e.target.files || []))
      e.target.value = ""
    },
    [addFiles]
  )

  const removeSelectedFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const removeRejectedFile = useCallback((id: string) => {
    setRejectedFiles((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const handleCloudPick = useCallback(
    async (provider: "google-drive" | "dropbox" | "onedrive") => {
      if (provider === "onedrive") {
        setOnedriveDialogOpen(true)
        return
      }
      setUploadModalMode("file")
      try {
        const picker =
          provider === "google-drive"
            ? openGoogleDrivePicker
            : openDropboxChooser
        const files = await picker((count) =>
          setCloudFetching({ provider, count })
        )
        if (files.length > 0) addFiles(files)
      } catch (err) {
        console.error(`[ProjectChatPanel] cloud picker (${provider}) failed:`, err)
      } finally {
        setCloudFetching(null)
      }
    },
    [addFiles]
  )

  const closeUploadModal = useCallback(() => {
    setUploadModalMode(null)
    setSelectedFiles([])
    setRejectedFiles([])
    setCloudFetching(null)
  }, [])

  const handleUploadSend = useCallback(async () => {
    if (!selectedId || !selectedFiles.length) return
    const files = selectedFiles
    for (const f of files) {
      await uploadFile(f)
    }
    closeUploadModal()
  }, [selectedId, selectedFiles, uploadFile, closeUploadModal])

  const patchThread = useCallback(
    (id: string, patch: Partial<ProjectThread>) =>
      setThreads((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
      ),
    []
  )

  const visibleThreads = useMemo(() => {
    const q = search.trim().toLowerCase()
    return threads.filter((t) => {
      switch (activeFilter) {
        case "starred":
          if (!t.isStarred) return false
          break
        case "unread":
          if (!(t.markedUnread || (t.unreadCount ?? 0) > 0)) return false
          break
        case "archived":
          if (!t.isArchived) return false
          break
        case "spam":
          if (!t.isSpam) return false
          break
        case "trash":
          if (!t.isTrashed) return false
          break
        case "sent":
          break
        case "all":
        default:
          if (t.isArchived || t.isSpam || t.isTrashed) return false
      }
      if (!q) return true
      return (
        (t.participantName ?? "").toLowerCase().includes(q) ||
        (t.participantUsername ?? "").toLowerCase().includes(q)
      )
    })
  }, [threads, search, activeFilter])

  const clearSelection = useCallback(() => resetCheckedChats(), [resetCheckedChats])

  const bulkAction = useCallback(
    async (
      action: Parameters<typeof threadActions.bulk>[1],
      patch: Partial<ProjectThread>
    ) => {
      if (bulkActionPending) return false
      const ids = Array.from(checkedIds)
      if (!ids.length) return false
      setBulkActionPending(true)
      try {
        await threadActions.bulk(ids, action)
        const idSet = new Set(ids)
        setThreads((prev) =>
          prev.map((t) => (idSet.has(t.id) ? { ...t, ...patch } : t))
        )
        clearSelection()
        return true
      } catch (err) {
        console.error("[ProjectChatPanel] bulk action failed:", err)
        return false
      } finally {
        setBulkActionPending(false)
      }
    },
    [bulkActionPending, checkedIds, threadActions, clearSelection]
  )

  const addToRecentQuestions = useCallback(
    async (m: any) => {
      if (!projectId || !m?.content?.trim()) return
      try {
        const existing = await ProjectAPI.GetProjectQuestions(projectId)
        const list = Array.isArray(existing?.data) ? existing.data : []
        if (
          list.some(
            (q: any) => (q.question ?? "").trim() === String(m.content).trim()
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

  const searching = search.trim().length > 0

  const openSearchResult = (threadId: string) => {
    setSelectedId(threadId)
    setSearch("")
  }

  const searchSections = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) {
      return {
        people: [] as SearchPeopleResult[],
        messages: [] as SearchMessageResult[],
        links: [] as SearchLinkResult[],
        files: [] as SearchFileResult[],
      }
    }

    const people: SearchPeopleResult[] = []
    for (const t of threads) {
      const otherId = t.participantIds?.find((id) => id !== myId)
      if (!otherId) continue
      const name = t.participantName || t.participantUsername
      const username = t.participantUsername
      if (!name && !username) continue
      const haystack = `${name ?? ""} ${username ?? ""}`.toLowerCase()
      if (!haystack.includes(q)) continue
      people.push({
        participantId: otherId,
        threadId: t.id,
        name: name || username || "Unknown",
        username,
        avatarUrl: t.participantAvatarUrl,
      })
    }

    const byId = new Map(threads.map((t) => [t.id, t]))

    const messages: SearchMessageResult[] = searchResults
      .filter((r) => {
        if (!byId.has(r.threadId)) return false
        const content = (r.content || "").trim()
        if (!content) return false
        const urls = extractUrls(content)
        if (urls.length > 0) {
          const remainder = urls
            .reduce((acc, u) => acc.replace(u, ""), content)
            .trim()
          if (remainder.length === 0) return false
        }
        return true
      })
      .map((r) => {
        const t = byId.get(r.threadId)
        return {
          id: r.id,
          threadId: r.threadId,
          participantName:
            t?.participantName || t?.participantUsername || "Conversation",
          participantAvatarUrl: t?.participantAvatarUrl,
          snippet: r.content,
          createdAt: r.createdAt,
        }
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    const senderNameFor = (senderId: string, t?: ProjectThread) => {
      if (senderId === myId) return "You"
      return t?.participantName || t?.participantUsername || "Unknown"
    }

    const links: SearchLinkResult[] = []
    for (const r of docs) {
      if (!byId.has(r.threadId)) continue
      const contentLower = (r.content || "").toLowerCase()
      const urls = extractUrls(r.content || "")
      const t = byId.get(r.threadId)
      for (const url of urls) {
        if (!url.toLowerCase().includes(q) && !contentLower.includes(q)) {
          continue
        }
        links.push({
          id: r.id,
          threadId: r.threadId,
          url,
          senderName: senderNameFor(r.senderId, t),
          createdAt: r.createdAt,
        })
      }
    }

    const files: SearchFileResult[] = []
    for (const r of docs) {
      if (!byId.has(r.threadId)) continue
      if (!r.attachments?.length) continue
      const contentLower = (r.content || "").toLowerCase()
      const t = byId.get(r.threadId)
      for (const a of r.attachments) {
        const fname = a.fileName || "(untitled)"
        if (!fname.toLowerCase().includes(q) && !contentLower.includes(q)) {
          continue
        }
        files.push({
          id: a.id,
          messageId: r.id,
          threadId: r.threadId,
          fileName: fname,
          fileSize: a.fileSize ?? null,
          fileType: a.fileType,
          fileUrl: a.fileUrl,
          senderName: senderNameFor(r.senderId, t),
          createdAt: r.createdAt,
        })
      }
    }

    const byCreatedDesc = (
      a: { createdAt?: string },
      b: { createdAt?: string }
    ) => (b.createdAt || "").localeCompare(a.createdAt || "")
    links.sort(byCreatedDesc)
    files.sort(byCreatedDesc)

    return { people, messages, links, files }
  }, [search, searchResults, threads, docs, myId])

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
            <div className="my-4">
              <DateSeparator label={formatDateSeparator(m.createdAt)} />
            </div>
          )}
          <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
            {mine ? (
              <div className="flex flex-col items-end gap-y-1">
                <Bubble
                  message={m as any}
                  currentUser={me as any}
                  onReply={handleReply}
                  onEdit={handleStartEdit}
                  onToggleReaction={handleToggleReaction}
                  replyToMessage={
                    m.replyToMessageId
                      ? ((messageById.get(m.replyToMessageId) as any) ?? null)
                      : null
                  }
                />
              </div>
            ) : (
              <YourBubble
                message={m as any}
                currentUser={me as any}
                participantName={selectedThread?.participantName}
                participantUsername={selectedThread?.participantUsername}
                participantAvatarUrl={selectedThread?.participantAvatarUrl}
                onReply={handleReply}
                onToggleReaction={handleToggleReaction}
                replyToMessage={
                  m.replyToMessageId
                    ? ((messageById.get(m.replyToMessageId) as any) ?? null)
                    : null
                }
                onAddToRecentQuestions={addToRecentQuestions}
              />
            )}
          </div>
        </Fragment>
      )
    })
  }

  let content: React.ReactNode

  if (selectedThread) {
    content = (
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
          <div className="flex items-center gap-x-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconButton
                    variant="ghost"
                    visual="gray"
                    size="sm"
                    className="rounded-full"
                    aria-label="Profile Info"
                  >
                    <Info className="size-4" />
                  </IconButton>
                </TooltipTrigger>
                <TooltipContent>Profile Info</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <IconButton
              variant="ghost"
              visual="gray"
              size="sm"
              className="rounded-full"
              aria-label={selectedThread.isStarred ? "Unstar" : "Star"}
              onClick={() => {
                const next = !selectedThread.isStarred
                ;(next
                  ? threadActions.star(selectedThread.id)
                  : threadActions.unstar(selectedThread.id)
                ).catch(console.error)
                patchThread(selectedThread.id, { isStarred: next })
              }}
            >
              <Star01
                className={cn(
                  "size-4",
                  selectedThread.isStarred &&
                    "fill-primary-500 text-primary-500"
                )}
              />
            </IconButton>

            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <IconButton
                  variant="ghost"
                  visual="gray"
                  size="sm"
                  className="rounded-full text-gray-500"
                  aria-label="More options"
                >
                  <MoreHorizontal className="size-4" />
                </IconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom">
                <DropdownMenuItem>
                  <Info className="size-4" /> Profile Info
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    const next = !selectedThread.isStarred
                    ;(next
                      ? threadActions.star(selectedThread.id)
                      : threadActions.unstar(selectedThread.id)
                    ).catch(console.error)
                    patchThread(selectedThread.id, { isStarred: next })
                  }}
                >
                  <Star className="size-4" />
                  {selectedThread.isStarred ? "Unmark Favorite" : "Mark Favorite"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    const next = !selectedThread.markedUnread
                    ;(next
                      ? threadActions.markUnread(selectedThread.id)
                      : threadActions.markRead(selectedThread.id)
                    ).catch(console.error)
                    patchThread(selectedThread.id, { markedUnread: next })
                  }}
                >
                  <Mail05 className="size-4" />
                  {selectedThread.markedUnread ? "Mark as Read" : "Mark Unread"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    const next = !selectedThread.isPinned
                    ;(next
                      ? threadActions.pin(selectedThread.id)
                      : threadActions.unpin(selectedThread.id)
                    ).catch(console.error)
                    patchThread(selectedThread.id, { isPinned: next })
                  }}
                >
                  <Pin02 className="size-4" />
                  {selectedThread.isPinned ? "Unpin Chat" : "Pin Chat"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    const next = !selectedThread.isArchived
                    ;(next
                      ? threadActions.archive(selectedThread.id)
                      : threadActions.unarchive(selectedThread.id)
                    ).catch(console.error)
                    patchThread(selectedThread.id, { isArchived: next })
                  }}
                >
                  <Archive className="size-4" />
                  {selectedThread.isArchived ? "Unarchive" : "Archive"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    const next = !selectedThread.isSpam
                    ;(next
                      ? threadActions.spam(selectedThread.id)
                      : threadActions.unspam(selectedThread.id)
                    ).catch(console.error)
                    patchThread(selectedThread.id, { isSpam: next })
                  }}
                >
                  <AlertTriangle className="size-4" />
                  {selectedThread.isSpam ? "Move to Inbox" : "Move to Spam"}
                </DropdownMenuItem>
                {otherId && (
                  <DropdownMenuItem
                    className="text-error-500"
                    onSelect={(e) => {
                      e.preventDefault()
                      setShowBlockConfirm(true)
                    }}
                  >
                    <AlertTriangle className="size-4" /> Block / Report
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-error-500"
                  onSelect={(e) => {
                    e.preventDefault()
                    setShowHeaderDeleteConfirm(true)
                  }}
                >
                  <Trash2 className="size-4" /> Delete Chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-2 py-4">
            {renderMessages()}
            <div ref={scrollBottomRef} />
          </div>
        </ScrollArea>

        {replyingTo && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-primary-600">
                Replying to{" "}
                {replyingTo.senderId === myId
                  ? "yourself"
                  : selectedThread.participantName ||
                    selectedThread.participantUsername ||
                    "Unknown"}
              </p>
              <p className="truncate text-xs text-gray-500">
                {replyingTo.content || "Message"}
              </p>
            </div>
            <IconButton
              visual="gray"
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={() => setReplyingTo(null)}
              aria-label="Cancel reply"
            >
              <X className="size-4" />
            </IconButton>
          </div>
        )}

        {(selectedFiles.length > 0 || rejectedFiles.length > 0) && (
          <div className="flex max-h-40 flex-col gap-y-2 overflow-y-auto border-t border-gray-200 px-3 pt-2">
            {selectedFiles.map((f, i) => (
              <div
                key={`bar-${f.name}-${i}`}
                className="flex items-center gap-x-3 rounded-md border border-gray-200 bg-white px-3 py-2"
              >
                <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-500">
                  <File className="size-4" />
                </div>
                <div className="min-w-0 flex-auto">
                  <p className="truncate text-xs font-semibold text-gray-900">
                    {f.name}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {formatBytes(f.size)}
                    {uploading ? " • uploading…" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-xs font-semibold text-gray-500 hover:text-gray-700"
                  onClick={() => removeSelectedFile(i)}
                >
                  Remove
                </button>
              </div>
            ))}
            {rejectedFiles.map((r) => (
              <div
                key={`bar-rejected-${r.id}`}
                className="flex items-center gap-x-3 rounded-md border border-error-300 bg-error-25 px-3 py-2"
              >
                <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-error-50 text-error-500">
                  <AlertTriangle className="size-4" />
                </div>
                <div className="min-w-0 flex-auto">
                  <p className="truncate text-xs font-semibold text-gray-900">
                    {r.name}
                  </p>
                  <p className="text-[11px] text-error-600">
                    {formatBytes(r.size)} • {r.error}
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 text-xs font-semibold text-gray-500 hover:text-gray-700"
                  onClick={() => removeRejectedFile(r.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-x-3 border-t border-gray-200 p-3">
          <div className="flex items-center gap-x-1">
            <EmojiPicker
              onEmojiSelect={handleEmojiSelect}
              onGifSelect={handleGifSelect}
            >
              <IconButton
                visual="gray"
                variant="ghost"
                size="lg"
                className="rounded-full"
                aria-label="Emoji"
              >
                <Smile className="size-[22px]" />
              </IconButton>
            </EmojiPicker>
            <IconButton
              visual="gray"
              variant="ghost"
              size="lg"
              className="rounded-full"
              aria-label="Send image"
              onClick={() => setUploadModalMode("image")}
            >
              <Image03 className="size-[22px]" />
            </IconButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton
                  visual="gray"
                  variant="ghost"
                  size="lg"
                  className="rounded-full"
                  aria-label="Attach file"
                >
                  <Attachment01 className="size-[22px]" />
                </IconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[212px]">
                <DropdownMenuItem onClick={() => setUploadModalMode("file")}>
                  <UploadCloud className="size-6" /> Upload from Desktop
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCloudPick("dropbox")}>
                  <DropboxBrand className="size-6" /> Upload via Dropbox
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleCloudPick("google-drive")}
                >
                  <GoogleDrive1Brand className="size-6" /> Upload via Google
                  Drive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCloudPick("onedrive")}>
                  <MsOnedriveBrand className="size-6" /> Upload via OneDrive
                </DropdownMenuItem>
                <DropdownMenuArrow className="fill-white" />
              </DropdownMenuContent>
            </DropdownMenu>
            <input
              ref={imageInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
            />
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={FILE_ACCEPT}
              multiple
              onChange={handleFileSelect}
            />
          </div>

          <InputGroup className="flex-auto">
            <Textarea
              ref={composerRef}
              rows={1}
              placeholder={
                editingMessage
                  ? "Edit message..."
                  : selectedFiles.length > 0
                    ? "Add a message (optional)..."
                    : "Send message..."
              }
              className={cn(
                "h-9 max-h-32 resize-none overflow-y-auto py-1.5 leading-5",
                editingMessage ? "pr-[110px]" : "pr-11"
              )}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (editingMessage) {
                  if (e.key === "Escape") {
                    e.preventDefault()
                    handleCancelEdit()
                  } else if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    void handleSaveEdit()
                  }
                  return
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
            />
            <InputRightElement
              className={cn(
                "items-end pb-2",
                editingMessage && "!w-[110px] justify-end pr-3"
              )}
            >
              {editingMessage ? (
                <div className="flex items-center gap-x-3">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-xs font-medium text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <span className="h-3 w-px bg-gray-300" aria-hidden />
                  <button
                    type="button"
                    onClick={() => void handleSaveEdit()}
                    disabled={
                      !draft.trim() ||
                      draft.trim() === (editingMessage.content || "").trim()
                    }
                    className="text-xs font-semibold text-primary-500 hover:text-primary-600 disabled:cursor-not-allowed disabled:text-gray-400"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={cn(
                    "text-gray-500 hover:text-primary-500 disabled:text-gray-400",
                    uploading && "animate-pulse"
                  )}
                  onClick={sendMessage}
                  disabled={
                    (!draft.trim() && !selectedFiles.length) || uploading
                  }
                  aria-label="Send message"
                >
                  {uploading ? (
                    <Spinner size={18} strokeWidth={3} />
                  ) : (
                    <Send className="size-[18px]" />
                  )}
                </button>
              )}
            </InputRightElement>
          </InputGroup>
        </div>

        <Dialog
          open={uploadModalMode !== null}
          onOpenChange={(o) => {
            if (!o) {
              setUploadModalMode(null)
              setCloudFetching(null)
            }
          }}
        >
          <DialogContent className="max-w-[467px] p-4">
            <DialogTitle className="text-xs font-semibold text-gray-900">
              {uploadModalMode === "image" ? "Upload Image" : "Upload Files"}
            </DialogTitle>
            <DialogClose asChild>
              <IconButton
                visual="gray"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 rounded-full"
                aria-label="Close"
              >
                <X className="size-4" />
              </IconButton>
            </DialogClose>

            <div
              className="mt-4 flex flex-col items-center justify-center gap-y-1 rounded-md border-2 border-dashed border-gray-200 bg-gray-50 py-6 text-center text-xs text-gray-500"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                addFiles(Array.from(e.dataTransfer.files || []))
              }}
            >
              <UploadCloud className="size-6 text-gray-400" />
              <p>
                Drag and drop or{" "}
                <button
                  type="button"
                  className="font-semibold text-primary-600 hover:underline"
                  onClick={() =>
                    (uploadModalMode === "image"
                      ? imageInputRef
                      : fileInputRef
                    ).current?.click()
                  }
                >
                  Choose a File
                </button>
              </p>
            </div>

            {cloudFetching && (
              <div className="mt-3 flex items-center gap-x-3 rounded-md border border-gray-200 bg-white px-3 py-2">
                <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-500">
                  <Spinner size={16} strokeWidth={3} />
                </div>
                <div className="min-w-0 flex-auto">
                  <p className="truncate text-xs font-semibold text-gray-900">
                    Fetching from {providerLabel(cloudFetching.provider)}…
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {cloudFetching.count > 1
                      ? `${cloudFetching.count} files`
                      : "Downloading file"}
                  </p>
                </div>
              </div>
            )}

            {(selectedFiles.length > 0 || rejectedFiles.length > 0) && (
              <div className="mt-3 flex max-h-[260px] flex-col gap-y-2 overflow-y-auto">
                {selectedFiles.map((f, i) => {
                  const sizeLabel =
                    f.size < 1024
                      ? `${f.size} B`
                      : f.size < 1024 * 1024
                        ? `${(f.size / 1024).toFixed(1)} KB`
                        : `${(f.size / (1024 * 1024)).toFixed(1)} MB`
                  return (
                    <div
                      key={`${f.name}-${i}`}
                      className="flex items-center gap-x-3 rounded-md border border-gray-200 bg-white px-3 py-2"
                    >
                      <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-500">
                        <File className="size-4" />
                      </div>
                      <div className="min-w-0 flex-auto">
                        <p className="truncate text-xs font-semibold text-gray-900">
                          {f.name}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {sizeLabel}
                          {uploading ? " • uploading…" : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 text-xs font-semibold text-gray-500 hover:text-gray-700"
                        onClick={() => removeSelectedFile(i)}
                      >
                        Remove
                      </button>
                    </div>
                  )
                })}
                {rejectedFiles.map((r) => {
                  const sizeLabel =
                    r.size < 1024
                      ? `${r.size} B`
                      : r.size < 1024 * 1024
                        ? `${(r.size / 1024).toFixed(1)} KB`
                        : `${(r.size / (1024 * 1024)).toFixed(1)} MB`
                  return (
                    <div
                      key={`rejected-${r.id}`}
                      className="flex items-center gap-x-3 rounded-md border border-error-300 bg-error-25 px-3 py-2"
                    >
                      <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-error-50 text-error-500">
                        <AlertTriangle className="size-4" />
                      </div>
                      <div className="min-w-0 flex-auto">
                        <p className="truncate text-xs font-semibold text-gray-900">
                          {r.name}
                        </p>
                        <p className="text-[11px] text-error-600">
                          {sizeLabel} • {r.error}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 text-xs font-semibold text-gray-500 hover:text-gray-700"
                        onClick={() => removeRejectedFile(r.id)}
                      >
                        Remove
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <p className="mt-2 text-[11px] text-gray-500">
              {uploadModalMode === "image"
                ? "Supported formats: PNG, JPG, GIF, SVG. Max 50 MB per file."
                : "Supported formats: PDF, DOC, JPG, PNG, MP4. Max 50 MB per file."}
            </p>

            <div className="mt-8 grid grid-cols-2 gap-x-3">
              <DialogClose asChild>
                <Button visual="gray" variant="outlined">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                onClick={() => void handleUploadSend()}
                disabled={!selectedFiles.length || uploading}
              >
                {uploading ? <Spinner size={16} strokeWidth={3} /> : "Send"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <OneDrivePickerDialog
          open={onedriveDialogOpen}
          onOpenChange={setOnedriveDialogOpen}
          onPicked={(count) =>
            setCloudFetching({ provider: "onedrive", count })
          }
          onConfirm={(files) => {
            setCloudFetching(null)
            if (files.length > 0) {
              addFiles(files)
              setUploadModalMode("file")
            }
          }}
        />

        <Dialog
          open={showHeaderDeleteConfirm}
          onOpenChange={setShowHeaderDeleteConfirm}
        >
          <DialogContent className="max-w-[348px] rounded-xl p-7">
            <DialogTitle>Delete this chat?</DialogTitle>
            <DialogDescription className="mt-2">
              This chat will be moved to Trash. You can restore it later from the
              Trash filter.
            </DialogDescription>
            <div className="mt-8 grid grid-cols-2 gap-x-3">
              <DialogClose asChild>
                <Button visual="gray" variant="outlined">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                onClick={() => {
                  threadActions.trash(selectedThread.id).catch(console.error)
                  patchThread(selectedThread.id, { isTrashed: true })
                  setShowHeaderDeleteConfirm(false)
                  setSelectedId(null)
                }}
              >
                Yes, Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <BlockReportDialog
          open={showBlockConfirm}
          onOpenChange={setShowBlockConfirm}
          targetUserId={otherId || null}
          targetDisplayName={
            selectedThread.participantName || selectedThread.participantUsername
          }
          contextThreadId={selectedThread.id}
        />
      </div>
    )
  } else if (loadingThreads) {
    content = (
      <div className="flex items-center justify-center py-16 text-sm text-gray-400">
        Loading chats…
      </div>
    )
  } else if (threads.length === 0) {
    content = (
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
  } else {
    content = (
      <div className="pt-4">
        {checkedChats > 0 ? (
          <div className="mb-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-x-0.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      className="size-6 rounded-full text-gray-400 hover:text-dark-blue-400"
                      visual="gray"
                      variant="ghost"
                      onClick={() => clearSelection()}
                    >
                      <X className="size-4" />
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Close</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="text-xs font-semibold leading-4 text-dark-blue-400">
                {checkedChats} selected
              </span>
            </span>
            <div className="flex items-center gap-x-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      className="size-6 rounded-full text-gray-400 hover:text-dark-blue-400"
                      visual="gray"
                      variant="ghost"
                      onClick={() => {
                        void bulkAction("mark-unread", { markedUnread: true })
                      }}
                    >
                      <Mail05 className="size-4" />
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Mark Unread</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      className="size-6 rounded-full text-gray-400 hover:text-dark-blue-400"
                      visual="gray"
                      variant="ghost"
                      onClick={() => {
                        void bulkAction("star", { isStarred: true })
                      }}
                    >
                      <Star className="size-4" />
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Star</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      className="size-6 rounded-full text-gray-400 hover:text-dark-blue-400"
                      visual="gray"
                      variant="ghost"
                      onClick={() => {
                        void bulkAction("pin", { isPinned: true })
                      }}
                    >
                      <Pin02 className="size-4" />
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Pin</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      className="size-6 rounded-full text-gray-400 hover:text-dark-blue-400"
                      visual="gray"
                      variant="ghost"
                      onClick={() => {
                        void bulkAction("archive", { isArchived: true })
                      }}
                    >
                      <Archive className="size-4" />
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Archive</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      className="size-6 rounded-full text-gray-400 hover:text-dark-blue-400"
                      visual="gray"
                      variant="ghost"
                      onClick={() => {
                        void bulkAction("spam", { isSpam: true })
                      }}
                    >
                      <AlertTriangle className="size-4" />
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Move to Spam</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      className="size-7 rounded-full text-gray-400 hover:bg-error-100 hover:text-error-500"
                      visual="gray"
                      variant="ghost"
                      onClick={() => setShowBulkDeleteConfirm(true)}
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Delete</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2">
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center gap-x-1.5 text-lg font-bold text-dark-blue-400 focus-visible:outline-none">
                    {FILTERS.find(([key]) => key === activeFilter)?.[1] ??
                      "All Messages"}
                    <ChevronDown className="size-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  side="bottom"
                  sideOffset={4}
                  className="w-[142px] rounded-[5px]"
                >
                  {FILTERS.map(([key, label]) => (
                    <DropdownMenuItem
                      key={key}
                      className={cn(
                        "h-[34px] w-[142px] gap-2 px-3 py-2.5",
                        activeFilter === key && "font-semibold"
                      )}
                      onSelect={() => setActiveFilter(key)}
                    >
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
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
          </>
        )}

        {searching ? (
          <SearchResultsPanel
            query={search}
            isLoading={searchLoading}
            isIndexing={indexing}
            people={searchSections.people}
            messages={searchSections.messages}
            links={searchSections.links}
            files={searchSections.files}
            onOpenThread={openSearchResult}
          />
        ) : (
          <>
        {pinnedChats > 0 && (
          <div className="mb-1 flex h-7 items-center justify-between border-y border-gray-200 bg-gray-25 py-1 pl-4 pr-2">
            <div className="flex items-center gap-x-1.5">
              <Pin02 className="size-4 fill-gray-500 text-gray-500" />
              <span className="text-[11px] font-semibold leading-5 text-gray-500">
                {pinnedChats} pinned chats
              </span>
            </div>
            <Button
              className="hover:no-underline"
              variant="link"
              visual="gray"
              onClick={() => toggleShowPinnedIcon()}
            >
              {showPinnedIcon ? (
                <>
                  <X className="size-[15px]" /> Close
                </>
              ) : (
                "View"
              )}
            </Button>
          </div>
        )}

        {visibleThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-400">
            {(() => {
              const empty = {
                unread: { Icon: Mail05, title: "No unread conversations" },
                starred: { Icon: Star, title: "No starred conversations" },
                sent: { Icon: Send, title: "No sent messages" },
                archived: { Icon: Archive, title: "No archived conversations" },
                spam: { Icon: AlertTriangle, title: "No spam" },
                trash: { Icon: Trash2, title: "Trash is empty" },
              }[activeFilter] ?? { Icon: Mail05, title: "No conversations" }
              const { Icon, title } = empty
              return (
                <>
                  <Icon className="size-8 stroke-[1.5]" />
                  <p className="text-sm">{title}</p>
                </>
              )
            })()}
          </div>
        ) : (
          <div>
            {visibleThreads.map((t) => (
              <Chat
                key={t.id}
                conversation={t as unknown as Conversation}
                variant={selectedId === t.id ? "active" : "default"}
                pinned={t.isPinned}
                starred={t.isStarred}
                currentUserId={myId}
                onStarredChange={(val) => patchThread(t.id, { isStarred: val })}
                onMarkUnread={() => {
                  const next = !t.markedUnread
                  ;(next
                    ? threadActions.markUnread(t.id)
                    : threadActions.markRead(t.id)
                  ).catch(console.error)
                  patchThread(t.id, { markedUnread: next })
                }}
                onArchive={() => {
                  const next = !t.isArchived
                  ;(next
                    ? threadActions.archive(t.id)
                    : threadActions.unarchive(t.id)
                  ).catch(console.error)
                  patchThread(t.id, { isArchived: next })
                }}
                onSpam={() => {
                  const next = !t.isSpam
                  ;(next
                    ? threadActions.spam(t.id)
                    : threadActions.unspam(t.id)
                  ).catch(console.error)
                  patchThread(t.id, { isSpam: next })
                }}
                onTrash={() => {
                  const next = !t.isTrashed
                  ;(next
                    ? threadActions.trash(t.id)
                    : threadActions.untrash(t.id)
                  ).catch(console.error)
                  patchThread(t.id, { isTrashed: next })
                }}
                checked={checkedIds.has(t.id)}
                onCheckedChange={(convId, isChecked) => {
                  setCheckedIds((prev) => {
                    const next = new Set(prev)
                    isChecked ? next.add(convId) : next.delete(convId)
                    return next
                  })
                }}
                onClick={() => setSelectedId(t.id)}
              />
            ))}
          </div>
        )}
          </>
        )}

        <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
          <DialogContent className="max-w-[348px] rounded-xl p-7">
            <DialogTitle>Delete {checkedIds.size} chats?</DialogTitle>
            <DialogDescription className="mt-2">
              These chats will be moved to Trash. You can restore them later
              from the Trash filter.
            </DialogDescription>
            <div className="mt-8 grid grid-cols-2 gap-x-3">
              <DialogClose asChild>
                <Button visual="gray" variant="outlined">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                disabled={bulkActionPending}
                onClick={() => {
                  void bulkAction("trash", { isTrashed: true }).then((ok) => {
                    if (ok) setShowBulkDeleteConfirm(false)
                  })
                }}
              >
                Yes, Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <ChatsContextProvider value={chatsCtx}>
      <EditContextProvider value={editContextValue}>
        {content}
      </EditContextProvider>
    </ChatsContextProvider>
  )
}
