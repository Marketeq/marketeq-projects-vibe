"use client"

import React, { useCallback, useMemo, useRef, useState } from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { decryptAES, decryptWithPrivateKey } from "@/src/crypto/e2ee"
import { exportPrivateKey } from "@/src/crypto/keys"
import { loadKey, saveKey } from "@/src/crypto/storage"
import { apiFetch } from "@/src/lib/api"
import { getCurrentUser } from "@/utils/auth"
import { getOtherParticipantId } from "@/utils/conversation"
import {
  DataEmoji,
  EmojiProperties,
  noop,
  toPxIfNumber,
} from "@/utils/functions"
import { useControllableState, useIsomorphicLayoutEffect } from "@/utils/hooks"
import { subscribeMessagingEvents } from "@/utils/messagingBroadcast"
import { useAblyChannel } from "@/utils/useAblyChannel"
import { useAblyPresence } from "@/utils/useAblyPresence"
import { useOnlineUsers } from "@/utils/useOnlineUsers"
import { useUserChannel } from "@/utils/useUserChannel"
import {
  AlertTriangle,
  Archive,
  Attachment01,
  ChevronDown,
  Edit05,
  File,
  Image03,
  Info,
  Mail05,
  MoreHorizontal,
  Pin02,
  Plus,
  SearchMd,
  Send,
  Smile,
  Star,
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
import { format, isSameDay, isToday, isYesterday, parseISO } from "date-fns"
import { useMeasure, useToggle } from "react-use"
import { Conversation } from "@/types/conversation"
import { Message, MessageAttachment } from "@/types/message"
import { User } from "@/types/user"
import { Spinner } from "@/components/ui/spinner/spinner"
import { toast } from "@/components/ui/toast/use-toast"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import { Chat, ChatsContextProvider, useChatsContext } from "@/components/chat"
import { EmojiPicker, type Result as TenorGif } from "@/components/emoji-picker"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CircularProgressDropzone,
  CircularProgressDropzoneState,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Favorite,
  FavoriteRoot,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  ScrollArea,
  ScrollBar,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"
import { UNDECRYPTABLE_PLACEHOLDER } from "../constants"
import {
  openDropboxChooser,
  openGoogleDrivePicker,
} from "../hooks/use-cloud-picker"
import { useEditMessage } from "../hooks/use-edit-message"
import { useFileUpload } from "../hooks/use-file-upload"
import { addParticipantToGroup } from "../hooks/use-group-encryption"
import { useMessages } from "../hooks/use-messages"
import { useSendMessage } from "../hooks/use-send-message"
import { useThreadActions } from "../hooks/use-thread-actions"
import { clearDraft, loadDraft, saveDraft } from "../lib/drafts"
import { BlockReportDialog } from "./block-report-dialog"
import { ForwardMessageDialog } from "./forward-message-dialog"
import { Bubble, YourBubble } from "./message-components"
import { OneDrivePickerDialog } from "./onedrive-picker-dialog"

interface ChatsProps {
  selectedConversation: Conversation | null
  jwtToken: string
  privateKey: CryptoKey | null
  currentUserProfile?: any
  onToggleRightSidebar?: () => void
  onMessagesLoaded?: (convId: string, msgs: Message[]) => void
  /** When set, the matching message is scrolled into view and briefly flashed. */
  highlightMessageId?: string | null
  /** Called after the highlight has been consumed (scrolled to). */
  onHighlightConsumed?: () => void
  /** Append a freshly sent/received message into the search index so it's
   * immediately searchable without waiting for the next page reload. */
  onIndexNewMessage?: (doc: {
    id: string
    threadId: string
    senderId: string
    content: string
    createdAt: string
    attachments?: Message["attachments"]
  }) => void
  acceptedOfferCard?: AcceptedOfferCardData | null
  counterOfferCard?: CounterOfferCardData | null
}

const COMPOSER_MAX_CHARS = 8000

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

interface UploadedAttachmentResult {
  message: Partial<Message> & {
    id: string
    senderId: string
    createdAt: string
    updatedAt: string
  }
  attachment: MessageAttachment
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
    <span className="text-[11px] font-medium text-gray-500 shrink-0">
      {label}
    </span>
    <div className="h-px flex-1 bg-gray-200" />
  </div>
)

export interface AcceptedOfferCardData {
  status: "accepted"
  contractId: string
  offerTitle: string
  offerType: string
  offerRate: string
  role: string
  duration: string
  schedule: string
  startDate: string
  acceptanceMessage?: string
}

export interface CounterOfferCardData {
  status: "submitted"
  contractId: string
  offerTitle: string
  offerType: string
  offerRate: string
  duration: string
  schedule: string
  startDate: string
  expiresLabel: string
  message?: string
}

export function Chats({
  selectedConversation,
  jwtToken,
  privateKey,
  currentUserProfile,
  onToggleRightSidebar,
  onMessagesLoaded,
  highlightMessageId,
  onHighlightConsumed,
  onIndexNewMessage,
  acceptedOfferCard,
  counterOfferCard,
}: ChatsProps) {
  const router = useRouter()
  const [textareaValue, setTextareaValue] = useState("")
  const lastTypedAtRef = useRef(0)
  const userTypedRef = useRef(false)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const messagesScrollRef = useRef<HTMLDivElement>(null)
  const [uploadModalMode, setUploadModalMode] = useState<
    "image" | "file" | null
  >(null)
  const [receiverUser, setReceiverUser] = useState<User | null>(null)
  const [counterpartDeleted, setCounterpartDeleted] = useState(false)
  const [starredMap, setStarredMap] = useState<Record<string, boolean>>({})
  const acceptedOfferToastRef = useRef<string | null>(null)
  const submittedCounterOfferRef = useRef<string | null>(null)

  useEffect(() => {
    if (
      !acceptedOfferCard ||
      acceptedOfferToastRef.current === acceptedOfferCard.contractId
    ) {
      return
    }

    acceptedOfferToastRef.current = acceptedOfferCard.contractId
    toast({
      title: "Offer Accepted",
      description: "Your contract is now active.",
    })
  }, [acceptedOfferCard])

  useEffect(() => {
    if (
      !counterOfferCard ||
      submittedCounterOfferRef.current === counterOfferCard.contractId
    ) {
      return
    }

    submittedCounterOfferRef.current = counterOfferCard.contractId
    toast({
      title: "Counter Offer Submitted",
      description: "Sent to the client. We'll notify you when they respond.",
    })
  }, [counterOfferCard])
  const [selectedTab, setSelectedTab] = useState<"Messages" | "Pinned">(
    "Messages"
  )
  const [pinnedMsgs, setPinnedMsgs] = useState<Message[]>([])
  const pinnedFetchRef = useRef<AbortController | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [rejectedFiles, setRejectedFiles] = useState<RejectedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const uploadAbortFlagsRef = useRef<Map<File, { aborted: boolean }>>(new Map())
  const recentlyAbortedMessageIdsRef = useRef<Set<string>>(new Set())
  const pendingIncomingRef = useRef<Message[]>([])
  const pendingIncomingRafRef = useRef<number | null>(null)
  const pendingEditsRef = useRef<Map<string, Partial<Message>>>(new Map())
  const pendingSendsRef = useRef<
    Map<string, { threadId: string; content: string; replyToId?: string }>
  >(new Map())
  const [isSending, setIsSending] = useState(false)
  const [forwardOpen, setForwardOpen] = useState(false)
  const [forwardTarget, setForwardTarget] = useState<Message | null>(null)
  const [keyReady, setKeyReady] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEditDeleteConfirm, setShowEditDeleteConfirm] = useState(false)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  // Thread-level state is source-of-truth from the server (selectedConversation)
  // which is kept up-to-date by the user:{userId} Ably subscription in left-sidebar.
  const threadPinned = !!(selectedConversation as any)?.isPinned
  const threadArchived = !!(selectedConversation as any)?.isArchived
  const threadSpam = !!(selectedConversation as any)?.isSpam
  const threadUnread = !!(selectedConversation as any)?.markedUnread
  const [starredOverride, setStarredOverride] = useState<boolean | null>(null)
  const threadStarred =
    starredOverride ?? !!(selectedConversation as any)?.isStarred
  const threadActions = useThreadActions(jwtToken)

  const handleOpenForward = useCallback((msg: Message) => {
    setForwardTarget(msg)
    setForwardOpen(true)
  }, [])

  const [currentUser, setCurrentUser] =
    useState<ReturnType<typeof getCurrentUser>>(null)
  useEffect(() => {
    const base = getCurrentUser()
    if (base && currentUserProfile?.username) {
      setCurrentUser({ ...base, username: currentUserProfile.username })
    } else {
      setCurrentUser(base)
    }
  }, [currentUserProfile])

  const handleEmojiSelect = useCallback((emoji: DataEmoji) => {
    const emojiChar = String.fromCodePoint(
      ...emoji[EmojiProperties.unified]
        .split("-")
        .map((hex) => parseInt(hex, 16))
    )
    setTextareaValue((prev) => (prev || "") + emojiChar)
    userTypedRef.current = true
    lastTypedAtRef.current = Date.now()
  }, [])

  const handleGifSelect = async (gif: TenorGif) => {
    if (!selectedConversation) return
    const url = gif.media?.[0]?.gif?.url
    if (!url) return
    try {
      const saved = await send(selectedConversation.id, url, undefined, "gif")
      const msg = (saved as any).data ?? saved
      let displayContent = msg.content
      try {
        const key = loadKey(selectedConversation.id)
        if (key && msg.ciphertext) {
          displayContent = await decryptAES(msg.ciphertext, key)
        }
      } catch {
        // no key cached
      }
      setLocalMsgs((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, { ...msg, content: displayContent ?? url }]
      })
      sendTyping(false)
    } catch (err) {
      console.error("Send GIF failed", err)
    }
  }

  // Auto-grow the composer to fit its content (Figma: composer expands as
  // the user types multi-line, then caps at max-height with internal scroll).
  // When empty, clear the inline height so the CSS `min-h-[36px]` rules the
  // box — otherwise an empty textarea's scrollHeight (which includes extra
  // browser padding) would lock the field at a taller-than-default size on
  // mount and after every send.
  useEffect(() => {
    const ta = composerRef.current
    if (!ta) return
    if (!textareaValue) {
      ta.style.height = ""
      return
    }
    ta.style.height = "auto"
    ta.style.height = `${ta.scrollHeight}px`
  }, [textareaValue])

  // Reset per-conversation state when switching conversations,
  // then restore any persisted draft for this thread (Doc 05 EC-3.3).
  useEffect(() => {
    setStarredOverride(null)
    setReplyingTo(null)
    setEditingMessage(null)
    setTextareaValue("")
    setSelectedFiles([])
    setRejectedFiles([])
    setUploadModalMode(null)
    userTypedRef.current = false

    const tid = selectedConversation?.id
    const uid = currentUser?.id
    if (!tid || !uid) return
    let cancelled = false
    loadDraft(tid, uid).then((draft) => {
      if (cancelled || !draft) return
      // If user already typed something between switch and load, don't clobber.
      setTextareaValue((cur) => (cur ? cur : draft))
    })
    return () => {
      cancelled = true
    }
  }, [selectedConversation?.id, currentUser?.id])

  // Debounced draft save — fires 400ms after the user stops typing.
  useEffect(() => {
    const tid = selectedConversation?.id
    const uid = currentUser?.id
    if (!tid || !uid) return
    if (!userTypedRef.current) return
    const handle = setTimeout(() => {
      saveDraft(tid, uid, textareaValue).catch(() => undefined)
    }, 400)
    return () => clearTimeout(handle)
  }, [textareaValue, selectedConversation?.id, currentUser?.id])

  useEffect(() => {
    const tid = selectedConversation?.id
    const uid = currentUser?.id
    if (!tid || !uid) return
    return subscribeMessagingEvents((evt) => {
      if (evt.type !== "draft") return
      if (evt.threadId !== tid || evt.userId !== uid) return
      if (Date.now() - lastTypedAtRef.current < 1000) return
      setTextareaValue(evt.text)
    })
  }, [selectedConversation?.id, currentUser?.id])

  useEffect(() => {
    setStarredOverride(null)
  }, [(selectedConversation as any)?.isStarred])

  // Auto mark-read when opening a conversation
  useEffect(() => {
    if (!selectedConversation || !jwtToken) return
    const threadId = selectedConversation.id
    threadActions.markRead(threadId).catch(() => {})
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("inbox:thread-read", { detail: { threadId } })
      )
    }
  }, [selectedConversation?.id, jwtToken])

  // 1) unwrap the AES key once per conversation
  useEffect(() => {
    setKeyReady(false)
    setKeyError(null)
    if (!selectedConversation || !privateKey) return
    const ac = new AbortController()
    const convId = selectedConversation.id
    ;(async () => {
      const isGroupParam = selectedConversation.isGroup
      const fetchAndUnwrap = async () => {
        const { encryptedKey } = await apiFetch<{ encryptedKey: string }>(
          `/api/messaging/conversations/${convId}/key?isGroup=${isGroupParam}`,
          {
            headers: { Authorization: `Bearer ${jwtToken}` },
            signal: ac.signal,
          }
        )
        if (ac.signal.aborted) return false

        const privatePem = await exportPrivateKey(privateKey)
        const rawBuf = await decryptWithPrivateKey(encryptedKey, privatePem)
        if (ac.signal.aborted) return false

        const arr = new Uint8Array(rawBuf)
        const b64 = btoa(String.fromCharCode(...arr))
        saveKey(convId, b64)
        setKeyReady(true)
        return true
      }

      try {
        await fetchAndUnwrap()
      } catch (firstErr: any) {
        if (firstErr?.name === "AbortError") return
        // Key mismatch — delete the stale wrapped key and let the server re-wrap
        try {
          await apiFetch(
            `/api/messaging/conversations/${convId}/key`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${jwtToken}` },
              signal: ac.signal,
            }
          )
          if (ac.signal.aborted) return
          await fetchAndUnwrap()
        } catch (retryErr: any) {
          if (retryErr?.name === "AbortError") return
          console.error("Failed to unwrap conversation key after retry", retryErr)
          if (!ac.signal.aborted) {
            setKeyReady(false)
            setKeyError(
              "Could not decrypt this conversation key. Refresh and try again."
            )
          }
        }
      }
    })()
    return () => ac.abort()
  }, [
    selectedConversation?.id,
    selectedConversation?.isGroup,
    privateKey,
    jwtToken,
  ])

  //below logic to add new user to a group chat //need to add button for it once user-service can be called to add users
  const handleAddUser = async (userId: string) => {
    if (!selectedConversation) {
      console.error("No conversation selected")
      return
    }
    try {
      await addParticipantToGroup(selectedConversation.id, userId)
    } catch (err) {
      console.error("Failed to add user:", err)
    }
  }

  const addFiles = (files: File[]) => {
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
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      addFiles(files)
      event.target.value = ""
    }
  }

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => {
      const file = prev[index]
      if (file) {
        const record = uploadAbortFlagsRef.current.get(file)
        if (record) record.aborted = true
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const removeRejectedFile = (id: string) => {
    setRejectedFiles((prev) => prev.filter((r) => r.id !== id))
  }

  const [cloudFetching, setCloudFetching] = useState<{
    provider: "google-drive" | "dropbox" | "onedrive"
    count: number
  } | null>(null)
  const [onedriveDialogOpen, setOnedriveDialogOpen] = useState(false)

  const handleCloudPick = async (
    provider: "google-drive" | "dropbox" | "onedrive"
  ) => {
    // OneDrive uses a custom Dialog component instead of a popup picker —
    // Microsoft's consumer picker can't be embedded reliably.
    if (provider === "onedrive") {
      setOnedriveDialogOpen(true)
      return
    }
    try {
      const picker =
        provider === "google-drive" ? openGoogleDrivePicker : openDropboxChooser
      const files = await picker((count) =>
        setCloudFetching({ provider, count })
      )
      if (files.length > 0) {
        addFiles(files)
      }
    } catch (err) {
      console.error(`Cloud picker (${provider}) failed:`, err)
    } finally {
      setCloudFetching(null)
    }
  }

  const providerLabel = (p: "google-drive" | "dropbox" | "onedrive") =>
    p === "google-drive"
      ? "Google Drive"
      : p === "dropbox"
        ? "Dropbox"
        : "OneDrive"

  // Format file size helper
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // 1) measure for sticky container
  const [bottomRef, { height }] = useMeasure<HTMLDivElement>()

  // 2) fetch & decrypt messages
  const {
    messages: fetchedMsgs,
    loading: messagesLoading,
    loadingOlder,
    hasMore,
    loadOlder,
  } = useMessages(
    selectedConversation ? selectedConversation.id : "",
    jwtToken,
    keyReady
  )
  const isSwitching = !keyError && (messagesLoading || !keyReady)

  // 2.2) Ably presence for this thread (online status + typing)
  // Per-thread presence: typing indicators only. The "isOnline" check used
  // to come from this hook too, but per-thread presence can't show whether
  // a user is online unless they're in the same thread channel right now —
  // which broke the avatar dot in 99% of cases. Online status now comes from
  // the global presence:online channel via useOnlineUsers().
  const {
    members: presentMembers,
    sendTyping,
    typingUserIds,
  } = useAblyPresence(selectedConversation?.id ?? "")
  const { isOnline } = useOnlineUsers()

  // 2.1) local messages state for optimistic updates
  const [localMsgs, setLocalMsgs] = useState<Message[]>([])
  const preLoadOlderHeightRef = useRef<{
    scrollHeight: number
    scrollTop: number
  } | null>(null)
  useEffect(() => {
    if (!fetchedMsgs) return
    const convId = selectedConversation?.id
    if (
      fetchedMsgs.length > 0 &&
      (fetchedMsgs[0] as any).threadId !== undefined &&
      (fetchedMsgs[0] as any).threadId !== convId
    ) {
      setLocalMsgs([])
      return
    }
    setLocalMsgs((prev) => {
      const fetchedIds = new Set(fetchedMsgs.map((m) => m.id))
      const localOnly = prev.filter(
        (m) =>
          !fetchedIds.has(m.id) &&
          ((m as any).threadId === undefined ||
            (m as any).threadId === convId),
      )
      return [...fetchedMsgs, ...localOnly]
    })
  }, [fetchedMsgs, selectedConversation?.id])

  const isNearBottomRef = useRef(true)
  useEffect(() => {
    const viewport = messagesScrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement | null
    if (!viewport) return
    const onScroll = () => {
      const distanceFromBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
      isNearBottomRef.current = distanceFromBottom < 120
      if (viewport.scrollTop < 120 && hasMore && !loadingOlder) {
        preLoadOlderHeightRef.current = {
          scrollHeight: viewport.scrollHeight,
          scrollTop: viewport.scrollTop,
        }
        loadOlder()
      }
    }
    viewport.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => viewport.removeEventListener("scroll", onScroll)
  }, [hasMore, loadingOlder, loadOlder])

  useIsomorphicLayoutEffect(() => {
    if (!preLoadOlderHeightRef.current) return
    if (loadingOlder) return
    const viewport = messagesScrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement | null
    if (!viewport) {
      preLoadOlderHeightRef.current = null
      return
    }
    const { scrollHeight: prevHeight, scrollTop: prevTop } =
      preLoadOlderHeightRef.current
    const delta = viewport.scrollHeight - prevHeight
    if (delta > 0) viewport.scrollTop = prevTop + delta
    preLoadOlderHeightRef.current = null
  }, [loadingOlder, localMsgs.length])

  // Hoist decrypted messages up so the sidebar can search over them
  // client-side. Required because backend search only matches plaintext
  // `content`, which is always null under E2EE.
  useEffect(() => {
    if (!selectedConversation) return
    onMessagesLoaded?.(selectedConversation.id, localMsgs)
  }, [localMsgs, selectedConversation?.id, onMessagesLoaded])

  // Scroll-to-and-flash a specific message when the sidebar opens a
  // search result. Waits until that message is actually in the rendered
  // list (it may arrive after a thread-switch's history fetch). Per
  // Doc 05 EC-8.2: if the message is missing after history load, toast
  // "Message no longer available" and clear the highlight.
  useEffect(() => {
    if (!highlightMessageId) return

    if (localMsgs.some((m) => m.id === highlightMessageId)) {
      const id = requestAnimationFrame(() => {
        const el = document.querySelector(
          `[data-message-id="${highlightMessageId}"]`
        ) as HTMLElement | null
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" })
          el.classList.add("inbox-highlight-flash")
          window.setTimeout(() => {
            el.classList.remove("inbox-highlight-flash")
          }, 2200)
        }
        onHighlightConsumed?.()
      })
      return () => cancelAnimationFrame(id)
    }

    const timeout = window.setTimeout(() => {
      toast({
        title: "Message no longer available",
        variant: "destructive",
      })
      onHighlightConsumed?.()
    }, 3000)
    return () => window.clearTimeout(timeout)
  }, [highlightMessageId, localMsgs, onHighlightConsumed])

  // 2.3) Read-receipts: react to message:read broadcasts on user:{me}.
  // Backend publishes when any reader PATCHes /v1/messages/:id/read, so the
  // sender learns their own message has been seen. Patches local state only.
  useUserChannel({
    onMessageRead: ({ messageId }) => {
      setLocalMsgs((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, status: "read" } : m))
      )
    },
  })

  // 2.4) Mark incoming messages as read when the thread is open.
  // Fires for each unread inbound message; backend's markRead is idempotent
  // and publishes message:read on the sender's user channel on success.
  const readSentRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!selectedConversation || !currentUser || !jwtToken) return
    const unread = localMsgs.filter(
      (m) =>
        m.senderId !== currentUser.id &&
        m.status !== "read" &&
        !readSentRef.current.has(m.id)
    )
    if (unread.length === 0) return
    for (const m of unread) {
      readSentRef.current.add(m.id)
      apiFetch(`/v1/messages/${m.id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${jwtToken}` },
      }).catch((err) => {
        console.error("markRead failed", err)
        readSentRef.current.delete(m.id)
      })
    }
  }, [localMsgs, selectedConversation?.id, currentUser?.id, jwtToken])

  // Reset the read-sent guard when switching threads.
  useEffect(() => {
    readSentRef.current = new Set()
  }, [selectedConversation?.id])

  const displayedMessages = (
    selectedTab === "Messages" ? localMsgs : pinnedMsgs
  ).filter((m) => {
    if (!m.isDeleted && !(m as any).deleted) return true
    const deletedAt = (m as any).deletedAt as number | undefined
    if (
      m.senderId === currentUser?.id &&
      deletedAt &&
      Date.now() - deletedAt < 30000
    ) {
      return true
    }
    return false
  })
  const localMessageById = useMemo(
    () => new Map(localMsgs.map((m) => [m.id, m])),
    [localMsgs]
  )

  // 3) subscribe to Ably for real-time incoming
  // subscribe to Ably for real-time updates

  const channelName = selectedConversation?.id || ""

  // 1) memoize your incoming‐message handler so it stays the same function reference:
  const handleIncoming = useCallback(
    async (incoming: {
      id: string
      ciphertext: string | null
      senderId: string
      threadId: string
      createdAt: string
      updatedAt: string
      attachments?: Message["attachments"]
      pinned?: boolean
      deleted?: boolean
      forwardedFromId?: string
      quotedCiphertext?: string | null
    }) => {
      if (recentlyAbortedMessageIdsRef.current.has(incoming.id)) {
        recentlyAbortedMessageIdsRef.current.delete(incoming.id)
        return
      }
      const convId = incoming.threadId
      let key: Uint8Array | null = null
      try {
        key = loadKey(convId)
      } catch {
        // no cached key
      }
      if (!key) {
        console.error("No AES key for", convId)
        return
      }
      let plain = ""
      if (incoming.ciphertext) {
        try {
          plain = await decryptAES(incoming.ciphertext, key)
        } catch (err) {
          console.error("Failed to decrypt incoming:", err)
          return
        }
      }
      let quotedPlain: string | null = null
      if (incoming.quotedCiphertext) {
        try {
          quotedPlain = await decryptAES(incoming.quotedCiphertext, key)
        } catch (err) {
          console.error("Failed to decrypt quoted content:", err)
          quotedPlain = UNDECRYPTABLE_PLACEHOLDER
        }
      }
      const prepared: Message = {
        ...incoming,
        content: plain,
        quotedContent: quotedPlain,
        isRead: false,
        isPinned: incoming.pinned ?? false,
        isDeleted: incoming.deleted ?? false,
      } as Message
      pendingIncomingRef.current.push(prepared)
      if (pendingIncomingRafRef.current == null) {
        pendingIncomingRafRef.current = requestAnimationFrame(() => {
          const batch = pendingIncomingRef.current
          pendingIncomingRef.current = []
          pendingIncomingRafRef.current = null
          if (batch.length === 0) return
          setLocalMsgs((prev) => {
            let next = prev
            let changed = false
            for (const m of batch) {
              const pendingEdit = pendingEditsRef.current.get(m.id)
              const incoming = pendingEdit ? { ...m, ...pendingEdit } : m
              if (pendingEdit) pendingEditsRef.current.delete(m.id)
              if (next.some((existing) => existing.id === incoming.id)) continue
              const tempIdx = next.findIndex(
                (existing) =>
                  typeof existing.id === "string" &&
                  existing.id.startsWith("tmp-") &&
                  existing.senderId === incoming.senderId &&
                  (existing.status === "sending" ||
                    existing.status === "optimistic-offline") &&
                  (existing.content ?? "") === (m.content ?? "")
              )
              if (tempIdx !== -1) {
                next = next.map((existing, i) =>
                  i === tempIdx ? incoming : existing,
                )
                changed = true
                continue
              }
              next = [...next, incoming]
              changed = true
            }
            return changed ? next : prev
          })
        })
      }
      onIndexNewMessage?.({
        id: incoming.id,
        threadId: incoming.threadId,
        senderId: incoming.senderId,
        content: plain ?? "",
        createdAt: incoming.createdAt,
        attachments: incoming.attachments,
      })
    },
    [setLocalMsgs, onIndexNewMessage]
  )

  useEffect(() => {
    return () => {
      if (pendingIncomingRafRef.current != null) {
        cancelAnimationFrame(pendingIncomingRafRef.current)
        pendingIncomingRafRef.current = null
      }
    }
  }, [])

  //pin/unpin,  delete, undo delete
  const updateMessage = useCallback(
    (messageId: string, updates: Partial<Message>) => {
      setLocalMsgs((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, ...updates } : m))
      )
    },
    []
  )

  const handleLocalDelete = useCallback(
    (messageId: string) => {
      updateMessage(messageId, {
        isDeleted: true,
        deletedAt: Date.now(),
      } as any)
      setTimeout(() => {
        setLocalMsgs((prev) => prev.map((m) => m))
      }, 30000)
    },
    [updateMessage]
  )

  const handleLocalRestore = useCallback(
    (messageId: string) => {
      updateMessage(messageId, {
        isDeleted: false,
        deletedAt: undefined,
      } as any)
    },
    [updateMessage]
  )

  // Ably incoming edit: decrypt + patch local state
  const handleIncomingEdit = useCallback(
    async (incoming: {
      id: string
      ciphertext?: string
      senderId: string
      threadId: string
      edited?: boolean
    }) => {
      let plain = ""
      try {
        const key = loadKey(incoming.threadId)
        if (key && incoming.ciphertext) {
          plain = await decryptAES(incoming.ciphertext, key)
        }
      } catch (err) {
        console.error("Failed to decrypt edited message:", err)
        plain = UNDECRYPTABLE_PLACEHOLDER
      }
      const patch: Partial<Message> = {
        content: plain,
        ciphertext: incoming.ciphertext,
        edited: true,
      }
      setLocalMsgs((prev) => {
        if (prev.some((m) => m.id === incoming.id)) {
          return prev.map((m) =>
            m.id === incoming.id ? { ...m, ...patch } : m,
          )
        }
        pendingEditsRef.current.set(incoming.id, patch)
        return prev
      })
    },
    []
  )

  useAblyChannel(
    channelName,
    handleIncoming,
    ({ messageId, isPinned }) => updateMessage(messageId, { isPinned }),
    (messageId) => updateMessage(messageId, { isDeleted: true }),
    (messageId) => updateMessage(messageId, { isDeleted: false }),
    handleIncomingEdit,
    ({ messageId, reactions }) =>
      setLocalMsgs((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, reactions: reactions as any } : m
        )
      )
  )

  const handleToggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!jwtToken) return
      // Optimistic toggle — Ably broadcast will reconcile.
      const me = currentUser?.id
      if (me) {
        setLocalMsgs((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m
            const current = m.reactions ?? []
            const idx = current.findIndex(
              (r) => r.userId === me && r.emoji === emoji
            )
            const next =
              idx >= 0
                ? current.filter((_, i) => i !== idx)
                : [
                    ...current,
                    { userId: me, emoji, createdAt: new Date().toISOString() },
                  ]
            return { ...m, reactions: next }
          })
        )
      }
      try {
        await apiFetch(`/v1/messages/${messageId}/reactions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${jwtToken}` },
          body: { emoji },
        })
      } catch (err) {
        console.error("toggleReaction failed", err)
      }
    },
    [jwtToken, currentUser?.id]
  )

  // 3) send message hook

  const send = useSendMessage(
    jwtToken,
    privateKey,
    selectedConversation?.isGroup
  )
  const editMsg = useEditMessage(jwtToken)
  const uploadFile = useFileUpload(
    jwtToken,
    privateKey,
    selectedConversation?.isGroup
  )

  const attemptOptimisticSend = useCallback(
    async (tempId: string) => {
      const params = pendingSendsRef.current.get(tempId)
      if (!params) return
      setLocalMsgs((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "sending" } : m))
      )
      try {
        const saved = await send(
          params.threadId,
          params.content,
          params.replyToId
        )
        const msg = (saved as any).data ?? saved
        let displayContent = msg.content
        try {
          const key = loadKey(params.threadId)
          if (key && msg.ciphertext) {
            displayContent = await decryptAES(msg.ciphertext, key)
          }
        } catch {
          /* plaintext */
        }
        pendingSendsRef.current.delete(tempId)
        setLocalMsgs((prev) => {
          const echoAlreadyIn = prev.some((m) => m.id === msg.id)
          if (echoAlreadyIn) {
            return prev.filter((m) => m.id !== tempId)
          }
          return prev.map((m) =>
            m.id === tempId ? { ...msg, content: displayContent } : m
          )
        })
        onIndexNewMessage?.({
          id: msg.id,
          threadId: params.threadId,
          senderId: msg.senderId,
          content: displayContent ?? "",
          createdAt: msg.createdAt,
          attachments: msg.attachments,
        })
      } catch {
        setLocalMsgs((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, status: "failed-send" } : m
          )
        )
      }
    },
    [send, onIndexNewMessage]
  )

  const retryOptimistic = useCallback(
    (tempId: string) => {
      void attemptOptimisticSend(tempId)
    },
    [attemptOptimisticSend]
  )

  const discardOptimistic = useCallback((tempId: string) => {
    pendingSendsRef.current.delete(tempId)
    setLocalMsgs((prev) => prev.filter((m) => m.id !== tempId))
  }, [])

  useEffect(() => {
    const onOnline = () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return
      const ids = Array.from(pendingSendsRef.current.keys())
      for (const id of ids) {
        void attemptOptimisticSend(id)
      }
    }
    window.addEventListener("online", onOnline)
    return () => window.removeEventListener("online", onOnline)
  }, [attemptOptimisticSend])

  const appendUploadedMessage = useCallback(
    async (result: UploadedAttachmentResult) => {
      if (!selectedConversation) return

      let displayContent = result.message.content ?? ""
      try {
        const key = loadKey(selectedConversation.id)
        if (key && result.message.ciphertext) {
          displayContent = await decryptAES(result.message.ciphertext, key)
        }
      } catch (err) {
        console.error("Failed to decrypt uploaded attachment caption:", err)
        if (result.message.ciphertext) {
          displayContent = UNDECRYPTABLE_PLACEHOLDER
        }
      }

      setLocalMsgs((prev) => {
        if (prev.some((m) => m.id === result.message.id)) return prev
        return [
          ...prev,
          {
            ...result.message,
            threadId:
              result.message.threadId ??
              result.message.conversationId ??
              selectedConversation.id,
            content: displayContent,
            messageType: result.message.messageType ?? "file",
            attachments: result.message.attachments?.length
              ? result.message.attachments
              : [result.attachment],
          },
        ]
      })
      onIndexNewMessage?.({
        id: result.message.id,
        threadId: selectedConversation.id,
        senderId: result.message.senderId,
        content: displayContent ?? "",
        createdAt: result.message.createdAt,
        attachments: result.message.attachments?.length
          ? result.message.attachments
          : [result.attachment],
      })
    },
    [selectedConversation?.id]
  )

  // 4) scroll to bottom on new messages
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastBottomIdRef = useRef<string | null>(null)
  useEffect(() => {
    const last = localMsgs[localMsgs.length - 1]
    const currentLastId = last?.id ?? null
    if (!currentLastId || currentLastId === lastBottomIdRef.current) return
    const isOwn = last?.senderId === currentUser?.id
    const wasFirstLoad = lastBottomIdRef.current === null
    lastBottomIdRef.current = currentLastId
    if (wasFirstLoad || isOwn || isNearBottomRef.current) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [localMsgs])

  // 5) load receiver's profile
  useEffect(() => {
    if (!selectedConversation) return
    const currentUser = getCurrentUser()
    if (!currentUser) {
      console.error("No logged-in user found")
      return
    }
    const otherId = selectedConversation.participantIds?.find(
      (id) => id !== currentUser.id
    )
    if (!otherId) return

    setCounterpartDeleted(false)
    const deletedPlaceholder = {
      id: otherId,
      email: "",
      username: undefined,
      firstName: null,
      lastName: null,
      avatarUrl: null,
    } as unknown as User
    apiFetch<User>(`/users/${otherId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${jwtToken}` },
    })
      .then((u) => {
        const isInactive =
          !!(u as { deletedAt?: unknown })?.deletedAt ||
          (u as { isActive?: boolean })?.isActive === false
        if (isInactive) {
          setCounterpartDeleted(true)
          setReceiverUser(deletedPlaceholder)
        } else {
          setReceiverUser(u)
        }
      })
      .catch((err) => {
        const status = err?.status ?? err?.response?.status
        if (
          status === 404 ||
          (typeof err?.message === "string" && err.message.includes("404"))
        ) {
          setCounterpartDeleted(true)
          setReceiverUser(deletedPlaceholder)
        } else {
          console.error(err)
        }
      })
  }, [selectedConversation?.id])

  // 6) send handler
  const handleSendMessage = async () => {
    if (!selectedConversation) return
    if (isSending) return
    const hasFiles = selectedFiles.length > 0
    const hasText = textareaValue.trim().length > 0
    if (!hasText && !hasFiles) return

    setIsSending(true)
    try {
      if (hasFiles) {
        const caption = textareaValue.trim()
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i]
          const abortRecord = { aborted: false }
          uploadAbortFlagsRef.current.set(file, abortRecord)
          try {
            const uploaded = await uploadFile(
              selectedConversation.id,
              file,
              i === 0 ? caption : undefined
            )
            if (abortRecord.aborted) {
              const abortedId = uploaded.message.id
              recentlyAbortedMessageIdsRef.current.add(abortedId)
              setTimeout(
                () => recentlyAbortedMessageIdsRef.current.delete(abortedId),
                30_000
              )
              apiFetch(`/v1/messages/${abortedId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${jwtToken}` },
              }).catch(() => undefined)
            } else {
              await appendUploadedMessage(uploaded)
            }
          } finally {
            uploadAbortFlagsRef.current.delete(file)
          }
        }
        setSelectedFiles([])
        setRejectedFiles([])
        setTextareaValue("")
        sendTyping(false)
        setReplyingTo(null)
        if (currentUser?.id) {
          clearDraft(selectedConversation.id, currentUser.id).catch(
            () => undefined
          )
        }
        return
      }

      if (!currentUser?.id) return
      const content = textareaValue.trim()
      const replyToId = replyingTo?.id
      const tempId = `tmp-${
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`
      }`
      const isOnline =
        typeof navigator === "undefined" ? true : navigator.onLine
      const nowIso = new Date().toISOString()
      const optimistic = {
        id: tempId,
        threadId: selectedConversation.id,
        senderId: currentUser.id,
        content,
        ciphertext: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        isRead: false,
        status: isOnline ? "sending" : "optimistic-offline",
        replyToMessageId: replyToId,
      } as Message
      setLocalMsgs((prev) => [...prev, optimistic])
      pendingSendsRef.current.set(tempId, {
        threadId: selectedConversation.id,
        content,
        replyToId,
      })

      setTextareaValue("")
      sendTyping(false)
      setReplyingTo(null)
      if (currentUser?.id) {
        clearDraft(selectedConversation.id, currentUser.id).catch(
          () => undefined
        )
      }

      if (!isOnline) {
        return
      }

      try {
        const saved = await send(selectedConversation.id, content, replyToId)
        const msg = (saved as any).data ?? saved
        let displayContent = msg.content
        try {
          const key = loadKey(selectedConversation.id)
          if (key && msg.ciphertext) {
            displayContent = await decryptAES(msg.ciphertext, key)
          }
        } catch {
          // already plaintext
        }
        pendingSendsRef.current.delete(tempId)
        setLocalMsgs((prev) => {
          const echoAlreadyIn = prev.some((m) => m.id === msg.id)
          if (echoAlreadyIn) {
            return prev.filter((m) => m.id !== tempId)
          }
          return prev.map((m) =>
            m.id === tempId ? { ...msg, content: displayContent } : m
          )
        })
        onIndexNewMessage?.({
          id: msg.id,
          threadId: selectedConversation.id,
          senderId: msg.senderId,
          content: displayContent ?? "",
          createdAt: msg.createdAt,
          attachments: msg.attachments,
        })
      } catch (err) {
        console.error("Send failed", err)
        setLocalMsgs((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, status: "failed-send" } : m
          )
        )
      }
    } catch (err) {
      console.error("Send failed", err)
    } finally {
      setIsSending(false)
    }
  }

  // Edit flow: enter edit mode, pre-fill composer
  const handleStartEdit = useCallback((msg: Message) => {
    setEditingMessage(msg)
    setTextareaValue(msg.content || "")
    setReplyingTo(null)
    // focus + move caret to end on next tick (after textarea gets the new value)
    requestAnimationFrame(() => {
      const el = composerRef.current
      if (el) {
        el.focus()
        const len = el.value.length
        el.setSelectionRange(len, len)
      }
    })
  }, [])

  const handleCancelEdit = () => {
    setEditingMessage(null)
    setTextareaValue("")
  }

  const handleSaveEdit = async () => {
    if (!editingMessage || !selectedConversation) return
    const newContent = textareaValue.trim()
    if (!newContent) {
      setShowEditDeleteConfirm(true)
      return
    }
    if (newContent === (editingMessage.content || "").trim()) {
      // no change — just exit edit mode
      handleCancelEdit()
      return
    }

    const messageId = editingMessage.id
    const prevContent = editingMessage.content
    // Optimistic update
    updateMessage(messageId, { content: newContent, edited: true })
    const editingSnapshot = editingMessage
    setEditingMessage(null)
    setTextareaValue("")

    try {
      await editMsg(messageId, selectedConversation.id, newContent)
    } catch (err) {
      console.error("Edit failed", err)
      // Rollback
      updateMessage(messageId, {
        content: prevContent,
        edited: !!editingSnapshot.edited,
      })
    }
  }

  const handleConfirmEditDelete = async () => {
    if (!editingMessage) return
    const messageId = editingMessage.id
    setShowEditDeleteConfirm(false)
    handleLocalDelete(messageId)
    setEditingMessage(null)
    setTextareaValue("")
    try {
      await apiFetch(`/v1/messages/${messageId}`, {
        method: "DELETE",
        headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {},
      })
    } catch (err) {
      console.error("Delete from edit failed", err)
      handleLocalRestore(messageId)
    }
  }

  // Updated handleSendMessage to handle both text and files
  //     const handleSendMessage = async () => {
  //     if (!selectedConversation) return

  //     // Check if we have either text or files to send
  //     const hasText = textareaValue.trim()
  //     const hasFiles = selectedFiles.length > 0

  //     if (!hasText && !hasFiles) return

  //     setIsUploading(true)
  //     console.log('> handleSendMessage – sending:', { hasText, hasFiles, filesCount: selectedFiles.length })

  //     try {
  //         // Case 1: Only text message (existing logic)
  //         if (hasText && !hasFiles) {
  //             const saved = await send(selectedConversation.id, textareaValue.trim())
  //             console.log('Text message sent:', saved.message, saved.data)

  //             // Decrypt and add to local state (existing logic)
  //             const key = loadKey(selectedConversation.id)
  //             const plain = await decryptAES(saved.data.ciphertext, key)

  //             setLocalMsgs(prev => [
  //                 ...prev,
  //                 {
  //                     ...saved.data,
  //                     content: plain
  //                 }
  //             ])
  //         }

  //         // Case 2: Files (with optional text)
  //         if (hasFiles) {
  //             // Upload each file
  //             console.log('Uploading files:', selectedFiles.map(f => f.name))
  //             console.log('Textarea value:', textareaValue.trim())
  //             console.log('Conversation ID:', selectedConversation.id)
  //             const uploadPromises = selectedFiles.map(file =>
  //                 uploadFile(selectedConversation.id, file, hasText ? textareaValue.trim() : undefined)
  //             )

  //             const uploadResults = await Promise.all(uploadPromises)
  //             console.log('Files uploaded:', uploadResults)

  //             // Add file messages to local state
  //             for (const result of uploadResults) {
  //                  // Decrypt and add to local state (existing logic)
  //             const key = loadKey(selectedConversation.id)
  //             const plain = await decryptAES(result.message.ciphertext, key)
  //                 setLocalMsgs(prev => [
  //                     ...prev,
  //                     {
  //                         ...result.message,
  //                         content: plain, // For file messages, content = ciphertext (which might be empty or the optional text)
  //                         // Add attachment data for rendering
  //                         fileUrl: result.attachment.fileUrl,
  //                         fileName: result.attachment.fileName,
  //                         fileType: result.attachment.fileType,
  //                         fileSize: result.attachment.fileSize
  //                     }
  //                 ])
  //             }

  //             // Clear selected files
  //             setSelectedFiles([])
  //         }

  //         // Clear text input
  //         setTextareaValue('')

  //     } catch (err) {
  //         console.error('Send failed', err)
  //         // You might want to show an error toast here
  //     } finally {
  //         setIsUploading(false)
  //     }
  // }

  // pinned messages or normal messages logic:

  const handleToggleChange = async (value: string) => {
    const tab = value as "Messages" | "Pinned"
    setSelectedTab(tab)

    if (tab === "Pinned") {
      if (!selectedConversation) return
      pinnedFetchRef.current?.abort()
      const ac = new AbortController()
      pinnedFetchRef.current = ac
      const convId = selectedConversation.id
      setPinnedMsgs([])
      try {
        const { messages: allMsgs } = await apiFetch<{
          messages: Message[]
        }>(`/v1/messages/thread/${convId}?all=true`, {
          headers: { Authorization: `Bearer ${jwtToken}` },
          signal: ac.signal,
        })
        if (ac.signal.aborted) return
        const pinned = allMsgs.filter((m) => m.pinned || m.isPinned)

        let key: Uint8Array | null = null
        try {
          key = loadKey(convId)
        } catch {
          /* no key */
        }
        const decrypted = await Promise.all(
          pinned.map(async (m) => {
            // Backend column is `pinned`; Bubble reads `isPinned`. Normalize.
            const normalized = {
              ...m,
              isPinned: (m as any).isPinned ?? (m as any).pinned ?? false,
            }
            if (!m.ciphertext) return normalized
            if (!key)
              return { ...normalized, content: UNDECRYPTABLE_PLACEHOLDER }
            try {
              return {
                ...normalized,
                content: await decryptAES(m.ciphertext, key),
              }
            } catch {
              return { ...normalized, content: UNDECRYPTABLE_PLACEHOLDER }
            }
          })
        )
        if (ac.signal.aborted) return
        setPinnedMsgs(decrypted)
      } catch (err: any) {
        if (err?.name === "AbortError") return
        console.error("Failed to fetch pinned messages", err)
      }
    }
  }

  // starring a conversation
  // const handleToggleStar = async () => {
  //   if (!selectedConversation) return;

  //   try {
  //     console.log("> handleToggleStar for:", selectedConversation.id);

  //      // 1) Call your API using apiFetch
  //     const { success } = await apiFetch<{ success: boolean }>(
  //       `/api/messaging/conversations/${selectedConversation.id}/star`,
  //       {
  //         method: "POST", // or POST if your backend uses POST
  //         headers: {
  //           Authorization: `Bearer ${jwtToken}`, // use your token state
  //         },
  //       }
  //     );

  //     // 2) Optimistically update local UI state
  //     if (success) {
  //       setIsStarred((prev) => !prev);
  //     }

  //     console.log("Toggle star success:", success);

  //   } catch (err) {
  //     console.error("Toggle star failed", err);
  //   }
  // };

  // const handleToggleStar = async (convId: string) => {
  //   try {
  //     const { success } = await apiFetch<{ success: boolean }>(
  //       `/api/messaging/conversations/${convId}/star`,
  //       {
  //         method: "POST",
  //         headers: { Authorization: `Bearer ${jwtToken}` },
  //       }
  //     );

  //     if (success) {
  //       setConversations((prev) =>
  //         prev.map((conv) =>
  //           conv.id === convId
  //             ? { ...conv, isStarred: !conv.isStarred }
  //             : conv
  //         )
  //       );
  //     }
  //   } catch (err) {
  //     console.error("Toggle star failed", err);
  //   }
  // };

  if (!currentUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400">
        <Spinner size={28} strokeWidth={3} />
      </div>
    )
  }

  if (!selectedConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
        <Mail05 className="size-10 stroke-[1.5]" />
        <p className="text-sm font-medium">
          Select a conversation to start messaging
        </p>
      </div>
    )
  }

  if (!receiverUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400">
        <Spinner size={28} strokeWidth={3} />
        <p className="text-sm">Loading conversation...</p>
      </div>
    )
  }

  // First-name-only display (per design)
  const fullName = selectedConversation?.isGroup
    ? (selectedConversation.group?.name ?? "Unnamed Group")
    : counterpartDeleted
      ? "Account no longer available"
      : receiverUser.firstName?.trim() ||
        receiverUser.username ||
        "Unknown User"

  return (
    <div className="flex-auto relative min-w-0 h-full flex flex-col">
      {/* Header */}
      <div className="px-8 shrink-0 border-b flex items-center justify-between border-gray-200 py-6 bg-white z-10">
        <div className="inline-flex items-center gap-x-3">
          {/* <Avatar className="size-[43px]" size="md" isOnline>
                        <AvatarImage src={receiverUser.avatarUrl || '/default.png'} alt={receiverUser.username ?? ''} />
                        <AvatarFallback>{receiverUser.username?.[0] ?? ''}</AvatarFallback>
                    </Avatar> */}
          <Avatar
            className="size-[43px]"
            size="md"
            isOnline={
              selectedConversation?.isGroup
                ? presentMembers.some((m) => m.clientId !== currentUser?.id)
                : isOnline(receiverUser.id)
            }
          >
            <AvatarImage
              src={
                selectedConversation?.isGroup
                  ? "/group-default.png"
                  : receiverUser.avatarUrl || "/default.png"
              }
              alt={
                selectedConversation?.isGroup
                  ? selectedConversation?.group?.name || "Group"
                  : (receiverUser.username ?? "")
              }
            />
            <AvatarFallback>
              {selectedConversation?.isGroup
                ? (selectedConversation?.group?.name?.[0] ?? "G")
                : (receiverUser.username?.[0] ?? "")}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col gap-y-1">
            <div className="inline-flex items-center gap-x-1.5">
              <span className="text-lg font-semibold text-dark-blue-400">
                {fullName}
              </span>
              {!selectedConversation?.isGroup && receiverUser.username && (
                <span className="text-sm font-normal text-gray-600">
                  @{receiverUser.username}
                </span>
              )}
            </div>
            <div className="inline-flex items-center gap-x-2">
              <span className="text-sm text-dark-blue-400">
                {selectedConversation?.isGroup
                  ? (() => {
                      const others = presentMembers.filter(
                        (m) => m.clientId !== currentUser?.id
                      ).length
                      return others > 0
                        ? `${others} active now`
                        : "No one active"
                    })()
                  : isOnline(receiverUser.id)
                    ? "Active now"
                    : "Offline"}
              </span>
              {receiverUser.recentJobTitle ||
              (receiverUser.jobTitles && receiverUser.jobTitles[0]) ? (
                <>
                  <span className="inline-block h-4 w-px bg-gray-300" />
                  <span className="text-sm text-dark-blue-400">
                    {receiverUser.recentJobTitle || receiverUser.jobTitles?.[0]}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-x-6">
          <ToggleGroupRoot
            className="bg-gray-50"
            value={selectedTab ? [selectedTab] : undefined}
            onValueChange={(details: { value: string[] }) => {
              const val = details.value?.[0]
              if (val === "Messages" || val === "Pinned") {
                handleToggleChange(val)
              }
            }}
          >
            {/* Local shadow override: primitive's arbitrary-value shadow is
                malformed (Tailwind drops it); patching the primitive would
                regress ~20 other pages where the no-shadow is established. */}
            <ToggleGroupItem
              value="Messages"
              className="data-[state=on]:shadow-sm"
            >
              Messages
            </ToggleGroupItem>
            <ToggleGroupItem
              value="Pinned"
              className="data-[state=on]:shadow-sm"
            >
              Pinned
              {(() => {
                const count = localMsgs.filter(
                  (m) => m.pinned || m.isPinned
                ).length
                return count > 0 ? (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-semibold bg-gray-200 text-gray-800 rounded-full">
                    {count}
                  </span>
                ) : null
              })()}
            </ToggleGroupItem>
          </ToggleGroupRoot>

          <div className="flex items-center gap-x-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconButton
                    visual="gray"
                    variant="ghost"
                    size="lg"
                    className="rounded-full"
                    onClick={onToggleRightSidebar}
                  >
                    <Info className="size-[22px]" />
                  </IconButton>
                </TooltipTrigger>
                <TooltipContent>Profile Info</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <FavoriteRoot
                  value={threadStarred}
                  onValueChange={(next) => {
                    if (!selectedConversation) return
                    setStarredOverride(next)
                    ;(next
                      ? threadActions.star(selectedConversation.id)
                      : threadActions.unstar(selectedConversation.id)
                    ).catch((err) => {
                      console.error("star toggle failed", err)
                      setStarredOverride(!next)
                    })
                  }}
                >
                  {() => (
                    // Wrap div, not Favorite — TooltipTrigger's data-state
                    // would overwrite Toggle's, breaking the active-color rule.
                    <TooltipTrigger asChild>
                      <div className="size-11 flex items-center justify-center">
                        <Favorite className="text-gray-500" />
                      </div>
                    </TooltipTrigger>
                  )}
                </FavoriteRoot>
                <TooltipContent>
                  {threadStarred ? "Remove from Favorites" : "Add to Favorites"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DropdownMenu modal={false}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <IconButton
                        className="rounded-full text-gray-500"
                        visual="gray"
                        variant="ghost"
                        size="lg"
                      >
                        <MoreHorizontal className="size-[22px]" />
                      </IconButton>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>More Options</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="end" side="bottom">
                <DropdownMenuItem onSelect={onToggleRightSidebar}>
                  <Info className="size-4" /> Profile Info
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    if (!selectedConversation) return
                    const next = !threadStarred
                    setStarredOverride(next)
                    ;(next
                      ? threadActions.star(selectedConversation.id)
                      : threadActions.unstar(selectedConversation.id)
                    ).catch((err) => {
                      console.error("star toggle failed", err)
                      setStarredOverride(!next)
                    })
                  }}
                >
                  <Star className="size-4" />
                  {threadStarred ? "Unmark Favorite" : "Mark Favorite"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    if (!selectedConversation) return
                    ;(threadUnread
                      ? threadActions.markRead(selectedConversation.id)
                      : threadActions.markUnread(selectedConversation.id)
                    ).catch((err) =>
                      console.error("mark unread/read failed", err)
                    )
                  }}
                >
                  <Mail05 className="size-4" />{" "}
                  {threadUnread ? "Mark as Read" : "Mark Unread"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    if (!selectedConversation) return
                    const next = !threadPinned
                    ;(next
                      ? threadActions.pin(selectedConversation.id)
                      : threadActions.unpin(selectedConversation.id)
                    ).catch((err) => console.error("pin toggle failed", err))
                  }}
                >
                  <Pin02 className="size-4" />
                  {threadPinned ? "Unpin Chat" : "Pin Chat"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    if (!selectedConversation) return
                    ;(threadArchived
                      ? threadActions.unarchive(selectedConversation.id)
                      : threadActions.archive(selectedConversation.id)
                    ).catch((err) =>
                      console.error("archive toggle failed", err)
                    )
                  }}
                >
                  <Archive className="size-4" />{" "}
                  {threadArchived ? "Unarchive" : "Archive"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    if (!selectedConversation) return
                    ;(threadSpam
                      ? threadActions.unspam(selectedConversation.id)
                      : threadActions.spam(selectedConversation.id)
                    ).catch((err) => console.error("spam toggle failed", err))
                  }}
                >
                  <AlertTriangle className="size-4" />{" "}
                  {threadSpam ? "Move to Inbox" : "Move to Spam"}
                </DropdownMenuItem>
                {!selectedConversation?.isGroup && (
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
                <DropdownMenuItem
                  className="text-error-500"
                  onSelect={(e) => {
                    e.preventDefault()
                    setShowDeleteConfirm(true)
                  }}
                >
                  <Trash2 className="size-4" /> Delete Chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog
              open={showDeleteConfirm}
              onOpenChange={setShowDeleteConfirm}
            >
              <DialogContent className="max-w-[348px] p-7 rounded-xl">
                <DialogTitle>Delete this chat?</DialogTitle>
                <DialogDescription className="mt-2">
                  This chat will be moved to Trash. You can restore it later
                  from the Trash filter.
                </DialogDescription>
                <div className="mt-8 grid grid-cols-2 gap-x-3">
                  <DialogClose asChild>
                    <Button visual="gray" variant="outlined">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    onClick={() => {
                      if (!selectedConversation) return
                      threadActions
                        .trash(selectedConversation.id)
                        .catch((err) => console.error("trash failed", err))
                      setShowDeleteConfirm(false)
                    }}
                  >
                    Yes, Delete
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog
              open={showEditDeleteConfirm}
              onOpenChange={setShowEditDeleteConfirm}
            >
              <DialogContent className="max-w-[348px] p-7 rounded-xl">
                <DialogTitle>Delete this message?</DialogTitle>
                <DialogDescription className="mt-2">
                  Saving an empty message will delete it for everyone.
                </DialogDescription>
                <div className="mt-8 grid grid-cols-2 gap-x-3">
                  <DialogClose asChild>
                    <Button visual="gray" variant="outlined">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button onClick={handleConfirmEditDelete}>Yes, Delete</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Message list */}
      <div
        className="flex-1 min-h-0 min-w-0"
        style={{ ...({ "--h": toPxIfNumber(height) } as any) }}
      >
        <ScrollArea
          ref={messagesScrollRef}
          className="h-full"
          viewportClassName="h-full"
          scrollBar={<ScrollBar className="w-4 p-1" />}
        >
          <div className="p-8 grid gap-y-6">
            {hasMore && (
              <div className="flex items-center justify-center py-3 text-gray-400">
                {loadingOlder ? (
                  <Spinner size={20} strokeWidth={3} />
                ) : (
                  <span className="text-xs">Scroll up for older messages</span>
                )}
              </div>
            )}
            {isSwitching && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
                <Spinner size={24} strokeWidth={3} />
                <p className="text-sm">Loading messages...</p>
              </div>
            )}
            {!isSwitching && keyError && (
              <div className="flex flex-col items-center justify-center py-20 text-error-500 gap-2">
                <p className="text-sm font-medium">{keyError}</p>
              </div>
            )}
            {!isSwitching &&
              displayedMessages.length === 0 &&
              !(
                selectedTab === "Messages" &&
                (acceptedOfferCard || counterOfferCard)
              ) && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
                  <Send className="size-8 stroke-[1.5]" />
                  <p className="text-sm">No messages yet. Say hello!</p>
                </div>
              )}
            {!isSwitching &&
              displayedMessages.map((m, i) => {
                const prev = i > 0 ? displayedMessages[i - 1] : null
                const showDate =
                  !prev ||
                  !isSameDay(parseISO(m.createdAt), parseISO(prev.createdAt))
                return (
                  <React.Fragment key={m.id ?? i}>
                    {showDate && (
                      <DateSeparator label={formatDateSeparator(m.createdAt)} />
                    )}
                    <div
                      data-message-id={m.id}
                      className={`flex rounded-lg ${
                        m.senderId === currentUser.id
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      {m.senderId === currentUser.id ? (
                        <div className="flex flex-col items-end gap-y-1">
                          <Bubble
                            message={m}
                            currentUser={currentUser}
                            participantUsername={receiverUser.username ?? ""}
                            participantName={fullName}
                            onForward={handleOpenForward}
                            onReply={setReplyingTo}
                            onEdit={handleStartEdit}
                            onLocalDelete={handleLocalDelete}
                            onLocalRestore={handleLocalRestore}
                            onToggleReaction={handleToggleReaction}
                            replyToMessage={
                              m.replyToMessageId
                                ? (localMessageById.get(m.replyToMessageId) ??
                                  null)
                                : null
                            }
                          />
                          {m.status === "optimistic-offline" && (
                            <div className="flex items-center gap-x-2 text-xs text-amber-600">
                              <span>
                                Will send when you&apos;re back online
                              </span>
                              <button
                                type="button"
                                className="text-gray-500 hover:text-gray-700 hover:underline"
                                onClick={() => discardOptimistic(m.id)}
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                          {m.status === "failed-send" && (
                            <div className="flex items-center gap-x-2 text-xs text-error-600">
                              <span>Failed to send</span>
                              <button
                                type="button"
                                className="font-semibold text-primary-500 hover:underline"
                                onClick={() => retryOptimistic(m.id)}
                              >
                                Retry
                              </button>
                              <button
                                type="button"
                                className="text-gray-500 hover:text-gray-700 hover:underline"
                                onClick={() => discardOptimistic(m.id)}
                              >
                                Discard
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <YourBubble
                          message={m}
                          currentUser={currentUser}
                          onForward={handleOpenForward}
                          onReply={setReplyingTo}
                          onToggleReaction={handleToggleReaction}
                          replyToMessage={
                            m.replyToMessageId
                              ? (localMessageById.get(m.replyToMessageId) ??
                                null)
                              : null
                          }
                          participantName={fullName}
                          participantUsername={receiverUser.username ?? ""}
                          participantAvatarUrl={
                            receiverUser.avatarUrl ?? undefined
                          }
                        />
                      )}
                    </div>
                  </React.Fragment>
                )
              })}
            {!isSwitching &&
              selectedTab === "Messages" &&
              acceptedOfferCard && (
                <div className="flex justify-end rounded-lg">
                  <article className="flex max-w-[calc(100%-60px)] flex-col items-start gap-y-2 rounded-xl bg-primary-500/[.04] p-5 md:max-w-[640px]">
                    <div className="text-sm leading-[16.94px] text-dark-blue-400">
                      <span className="font-bold">Me</span>{" "}
                      {currentUser.username ? (
                        <span>@{currentUser.username} </span>
                      ) : null}
                      <span className="font-semibold underline decoration-primary-500 decoration-2 underline-offset-2">
                        accepted the offer
                      </span>
                    </div>

                    <p className="text-sm leading-[20px] text-dark-blue-400">
                      {acceptedOfferCard.acceptanceMessage ||
                        "Excited to get started!"}
                    </p>

                    <Card className="mt-4 w-full min-w-[320px] flex-col items-stretch justify-start rounded-lg p-5 shadow-none hover:border-gray-200 hover:ring-0">
                      <h3 className="text-base font-bold leading-[19.36px] text-dark-blue-400">
                        Offer Accepted!
                      </h3>
                      <p className="mt-5 text-sm font-medium leading-[16.94px] text-dark-blue-400">
                        {acceptedOfferCard.offerTitle}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <Badge variant="rounded" visual="gray" size="sm">
                          {acceptedOfferCard.offerType}
                        </Badge>
                        <span className="text-xs leading-[14.52px] text-gray-500">
                          {acceptedOfferCard.startDate.startsWith("Starts")
                            ? acceptedOfferCard.startDate
                            : `Starts on ${acceptedOfferCard.startDate}`}
                        </span>
                      </div>
                      <Button
                        className="mt-4 w-fit px-5 text-primary-500"
                        variant="outlined"
                        visual="gray"
                        onClick={() =>
                          router.push(
                            `/my-contracts?contractId=${encodeURIComponent(
                              acceptedOfferCard.contractId
                            )}`
                          )
                        }
                      >
                        View Contract
                      </Button>
                    </Card>
                  </article>
                </div>
              )}
            {!isSwitching && selectedTab === "Messages" && counterOfferCard && (
              <div className="flex justify-end rounded-lg">
                <article className="flex max-w-[calc(100%-60px)] flex-col items-start gap-y-2 rounded-xl bg-primary-500/[.04] p-5 md:max-w-[640px]">
                  <div className="text-sm leading-[16.94px] text-dark-blue-400">
                    <span className="font-bold">You</span>{" "}
                    {currentUser.username ? (
                      <span>@{currentUser.username} </span>
                    ) : null}
                    <span className="font-semibold">sent a counter offer</span>
                  </div>

                  {counterOfferCard.message ? (
                    <p className="text-sm leading-[20px] text-dark-blue-400">
                      {counterOfferCard.message}
                    </p>
                  ) : null}

                  <Card className="mt-4 w-full min-w-[320px] flex-col items-stretch justify-start rounded-lg p-5 shadow-none hover:border-gray-200 hover:ring-0">
                    <h3 className="text-base font-bold leading-[19.36px] text-dark-blue-400">
                      Counter Offer Submitted
                    </h3>
                    <p className="mt-5 text-sm font-medium leading-[16.94px] text-dark-blue-400">
                      {counterOfferCard.offerTitle}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <Badge variant="rounded" visual="gray" size="sm">
                        {counterOfferCard.offerType}
                      </Badge>
                      <span className="text-xs leading-[14.52px] text-gray-500">
                        This counteroffer expires{" "}
                        {counterOfferCard.expiresLabel}.
                      </span>
                    </div>
                    <Button
                      className="mt-4 w-fit px-5 text-primary-500"
                      variant="outlined"
                      visual="gray"
                    >
                      View Details
                    </Button>
                  </Card>
                </article>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Composer */}
      <div
        className="bg-white shrink-0 border-t border-gray-200"
        ref={bottomRef}
      >
        {typingUserIds.length > 0 && (
          <div className="px-4 pt-2 pb-1 flex items-center gap-x-2">
            <span
              className="inline-flex items-center gap-x-0.5"
              aria-hidden="true"
            >
              <span className="size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="size-1.5 rounded-full bg-gray-400 animate-bounce" />
            </span>
            <span className="text-xs italic text-gray-500">
              {(() => {
                const displayName =
                  typingUserIds.length === 1 &&
                  receiverUser &&
                  typingUserIds[0] === receiverUser.id
                    ? receiverUser.firstName?.trim() ||
                      receiverUser.username ||
                      "Someone"
                    : typingUserIds.length === 1
                      ? "Someone"
                      : `${typingUserIds.length} people`
                return `${displayName} ${typingUserIds.length === 1 ? "is" : "are"} typing…`
              })()}
            </span>
          </div>
        )}
        {replyingTo && !editingMessage && (
          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary-600">
                Replying to{" "}
                {replyingTo.senderId === currentUser?.id
                  ? "yourself"
                  : receiverUser?.firstName ||
                    receiverUser?.username ||
                    "Unknown"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {replyingTo.content || "Encrypted message"}
              </p>
            </div>
            <IconButton
              visual="gray"
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={() => setReplyingTo(null)}
            >
              <X className="size-4" />
            </IconButton>
          </div>
        )}

        {editingMessage && (
          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <p className="text-xs font-semibold text-primary-600">
              Editing Message...
            </p>
            <IconButton
              visual="gray"
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={handleCancelEdit}
            >
              <X className="size-4" />
            </IconButton>
          </div>
        )}

        <Dialog
          open={uploadModalMode !== null}
          onOpenChange={(o) => setUploadModalMode(o ? uploadModalMode : null)}
        >
          <DialogContent className="max-w-[467px] p-4">
            <h3 className="text-xs font-semibold text-gray-900">
              {uploadModalMode === "image" ? "Upload Image" : "Upload Files"}
            </h3>
            <DialogClose asChild>
              <IconButton
                visual="gray"
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 rounded-full"
              >
                <X className="size-4" />
              </IconButton>
            </DialogClose>
            <div
              className="mt-4 flex flex-col items-center justify-center gap-y-1 rounded-md border-2 border-dashed border-gray-200 bg-gray-50 py-6 text-center text-xs text-gray-500"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const files = Array.from(e.dataTransfer.files || [])
                if (files.length > 0) {
                  addFiles(files)
                }
              }}
            >
              <UploadCloud className="size-6 text-gray-400" />
              <p>
                Drag and drop or{" "}
                <button
                  type="button"
                  className="font-semibold text-primary-600 hover:underline"
                  onClick={() =>
                    document
                      .getElementById(
                        uploadModalMode === "image"
                          ? "image-file-input"
                          : "desktop-file-input"
                      )
                      ?.click()
                  }
                >
                  Choose a File
                </button>
              </p>
            </div>

            <div className="mt-3 flex flex-col gap-y-2 max-h-[260px] overflow-y-auto">
              {selectedFiles.map((f, i) => {
                const sizeLabel =
                  f.size < 1024
                    ? `${f.size} B`
                    : f.size < 1024 * 1024
                      ? `${(f.size / 1024).toFixed(1)} KB`
                      : `${(f.size / (1024 * 1024)).toFixed(1)} MB`
                return (
                  <div
                    key={`modal-${f.name}-${i}`}
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
                        {isUploading ? " • uploading…" : ""}
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
                    key={`modal-rejected-${r.id}`}
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
              {rejectedFiles.map((r) => {
                const sizeLabel =
                  r.size < 1024
                    ? `${r.size} B`
                    : r.size < 1024 * 1024
                      ? `${(r.size / 1024).toFixed(1)} KB`
                      : `${(r.size / (1024 * 1024)).toFixed(1)} MB`
                return (
                  <div
                    key={`modal-rejected-${r.id}`}
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
            <p className="mt-2 text-[11px] text-gray-500">
              {uploadModalMode === "image"
                ? "Supported formats: PNG, JPG, GIF, SVG. Max 50 MB per file."
                : "Supported formats: PDF, DOC, JPG, PNG, MP4. Max 50 MB per file."}
            </p>
            <div className="mt-8 grid grid-cols-2 gap-x-3">
              <Button
                visual="gray"
                variant="outlined"
                onClick={() => setUploadModalMode(null)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                visual="primary"
                variant="filled"
                disabled={
                  !selectedFiles.length || !selectedConversation || isUploading
                }
                onClick={async () => {
                  if (!selectedConversation || !selectedFiles.length) return
                  setIsUploading(true)
                  try {
                    for (const file of selectedFiles) {
                      const abortRecord = { aborted: false }
                      uploadAbortFlagsRef.current.set(file, abortRecord)
                      try {
                        const uploaded = await uploadFile(
                          selectedConversation.id,
                          file,
                          undefined
                        )
                        if (abortRecord.aborted) {
                          const abortedId = uploaded.message.id
                          recentlyAbortedMessageIdsRef.current.add(abortedId)
                          setTimeout(
                            () =>
                              recentlyAbortedMessageIdsRef.current.delete(
                                abortedId
                              ),
                            30_000
                          )
                          apiFetch(`/v1/messages/${abortedId}`, {
                            method: "DELETE",
                            headers: { Authorization: `Bearer ${jwtToken}` },
                          }).catch(() => undefined)
                        } else {
                          await appendUploadedMessage(uploaded)
                        }
                      } finally {
                        uploadAbortFlagsRef.current.delete(file)
                      }
                    }
                    setSelectedFiles([])
                    setRejectedFiles([])
                    setUploadModalMode(null)
                  } catch (err: any) {
                    console.error("Attachment upload failed:", err)
                  } finally {
                    setIsUploading(false)
                  }
                }}
              >
                {isUploading ? <Spinner size={16} strokeWidth={3} /> : "Send"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {cloudFetching && (
          <div className="px-3 pt-2 flex flex-col gap-y-2">
            {Array.from({ length: cloudFetching.count }).map((_, i) => (
              <div
                key={`cloud-pending-${i}`}
                className="flex items-center gap-x-3 rounded-md border border-gray-200 bg-white px-3 py-2"
              >
                <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-500">
                  <Spinner size={16} strokeWidth={3} />
                </div>
                <div className="min-w-0 flex-auto">
                  <p className="truncate text-xs font-semibold text-gray-900">
                    Fetching from {providerLabel(cloudFetching.provider)}…
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {cloudFetching.count > 1
                      ? `File ${i + 1} of ${cloudFetching.count}`
                      : "Downloading file"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {(selectedFiles.length > 0 || rejectedFiles.length > 0) && (
          <div className="px-3 pt-2 flex flex-col gap-y-2">
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
                    <p className="text-[11px] text-gray-500">{sizeLabel}</p>
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

        <div className="p-3 flex min-h-[68px] items-end gap-x-3">
          {/* Emoji + File + Upload */}
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
              >
                <Smile className="size-[22px]" />
              </IconButton>
            </EmojiPicker>

            <IconButton
              visual="gray"
              variant="ghost"
              size="lg"
              className="rounded-full"
              onClick={() => setUploadModalMode("image")}
            >
              <Image03 className="size-[22px]" />
            </IconButton>
            {/* // Updated attachment dropdown with file input */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton
                  visual="gray"
                  variant="ghost"
                  size="lg"
                  className="rounded-full"
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

            {/* Hidden file inputs */}
            <input
              id="desktop-file-input"
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.svg,.zip,.mp4,.mov"
              multiple
            />
            <input
              id="image-file-input"
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*"
              multiple
            />
          </div>

          {/* Text area + send - Updated */}
          <InputGroup className="flex-auto w-[calc(100%-164px)]">
            <Textarea
              ref={composerRef}
              placeholder={
                counterpartDeleted
                  ? "You can no longer reply"
                  : editingMessage
                    ? "Edit message..."
                    : selectedFiles.length > 0
                      ? "Add a message (optional)..."
                      : "Send message..."
              }
              disabled={counterpartDeleted}
              className={`w-full resize-none py-1.5 leading-5 h-9 max-h-32 overflow-y-auto ${
                editingMessage
                  ? "pr-[120px] ring-1 ring-primary-500 border-primary-500 focus:ring-primary-500 focus:border-primary-500"
                  : "pr-11"
              }`}
              rows={1}
              value={textareaValue}
              onChange={(e) => {
                setTextareaValue(e.target.value)
                lastTypedAtRef.current = Date.now()
                userTypedRef.current = true
                if (e.target.value.length > 0) sendTyping(true)
                else sendTyping(false)
              }}
              onBlur={() => sendTyping(false)}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData("text")
                if (!pasted) return
                const target = e.currentTarget
                const selStart = target.selectionStart ?? textareaValue.length
                const selEnd = target.selectionEnd ?? textareaValue.length
                const projected =
                  textareaValue.slice(0, selStart) +
                  pasted +
                  textareaValue.slice(selEnd)
                if (projected.length <= COMPOSER_MAX_CHARS) return
                e.preventDefault()
                const room =
                  COMPOSER_MAX_CHARS -
                  (textareaValue.length - (selEnd - selStart))
                const truncated = pasted.slice(0, Math.max(0, room))
                const next =
                  textareaValue.slice(0, selStart) +
                  truncated +
                  textareaValue.slice(selEnd)
                setTextareaValue(next)
                userTypedRef.current = true
                lastTypedAtRef.current = Date.now()
                toast({
                  title: `Pasted content was truncated to ${COMPOSER_MAX_CHARS.toLocaleString()} characters`,
                })
              }}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return
                if (editingMessage) {
                  if (e.key === "Escape") {
                    e.preventDefault()
                    handleCancelEdit()
                  } else if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSaveEdit()
                  }
                  return
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
            />
            <InputRightElement
              className={
                editingMessage
                  ? "!w-[120px] justify-end items-end pb-2"
                  : "items-end pb-2"
              }
            >
              {editingMessage ? (
                <div className="flex items-center gap-x-3 pr-3">
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
                    onClick={handleSaveEdit}
                    disabled={
                      !keyReady ||
                      !!keyError ||
                      textareaValue.trim() ===
                        (editingMessage.content || "").trim()
                    }
                    className="text-xs font-semibold text-primary-500 hover:text-primary-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      className={`text-gray-500 hover:text-primary-500 disabled:text-gray-400 ${
                        isUploading || isSending ? "animate-pulse" : ""
                      }`}
                      onClick={handleSendMessage}
                      disabled={
                        (!textareaValue.trim() && selectedFiles.length === 0) ||
                        isUploading ||
                        isSending ||
                        !keyReady ||
                        !!keyError ||
                        counterpartDeleted
                      }
                    >
                      {isUploading || isSending ? (
                        <Spinner size={18} strokeWidth={3} />
                      ) : (
                        <Send className="size-[18px]" />
                      )}
                    </TooltipTrigger>
                    <TooltipContent>
                      {isUploading
                        ? "Uploading..."
                        : selectedFiles.length > 0
                          ? "Send files"
                          : textareaValue
                            ? "Send message"
                            : "Type a message or select files"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </InputRightElement>
          </InputGroup>
        </div>
      </div>

      <ForwardMessageDialog
        open={forwardOpen}
        onOpenChange={setForwardOpen}
        message={forwardTarget}
        currentUserId={currentUser.id}
        currentUserProfile={currentUserProfile}
        receiverUser={receiverUser}
        privateKey={privateKey}
      />

      <BlockReportDialog
        open={showBlockConfirm}
        onOpenChange={setShowBlockConfirm}
        targetUserId={
          selectedConversation && currentUser?.id
            ? (getOtherParticipantId(selectedConversation, currentUser.id) ??
              null)
            : null
        }
        targetDisplayName={
          (selectedConversation as any)?.participantName ||
          (selectedConversation as any)?.participantUsername
        }
        contextThreadId={selectedConversation?.id ?? null}
      />

      <OneDrivePickerDialog
        open={onedriveDialogOpen}
        onOpenChange={setOnedriveDialogOpen}
        onPicked={(count) => setCloudFetching({ provider: "onedrive", count })}
        onConfirm={(files) => {
          setCloudFetching(null)
          if (files.length > 0) {
            addFiles(files)
          }
        }}
      />
    </div>
  )
}
