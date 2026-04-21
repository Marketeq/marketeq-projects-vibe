"use client"

import React, { useCallback, useMemo, useRef, useState } from "react"
import { useEffect } from "react"
import { decryptAES, decryptWithPrivateKey } from "@/src/crypto/e2ee"
import { exportPrivateKey } from "@/src/crypto/keys"
import { loadKey, saveKey } from "@/src/crypto/storage"
import { apiFetch } from "@/src/lib/api"
import { Bubble, YourBubble } from "@/stories/inbox.stories"
import { getCurrentUser } from "@/utils/auth"
import { getOtherParticipantId } from "@/utils/conversation"
import {
  DataEmoji,
  EmojiProperties,
  noop,
  toPxIfNumber,
} from "@/utils/functions"
import { useControllableState } from "@/utils/hooks"
import { useAblyChannel } from "@/utils/useAblyChannel"
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
import { useMeasure, useToggle } from "react-use"
import { Conversation } from "@/types/conversation"
import { Message } from "@/types/message"
import { User } from "@/types/user"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import { Chat, ChatsContextProvider, useChatsContext } from "@/components/chat"
import { EmojiPicker } from "@/components/emoji-picker"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
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
import { Spinner } from "@/components/ui/spinner/spinner"
import { useFileUpload } from "../hooks/use-file-upload"
import { addParticipantToGroup } from "../hooks/use-group-encryption"
import { useEditMessage } from "../hooks/use-edit-message"
import { useMessages } from "../hooks/use-messages"
import { useSendMessage } from "../hooks/use-send-message"
import { useThreadActions } from "../hooks/use-thread-actions"
import { ForwardMessageDialog } from "./forward-message-dialog"

interface ChatsProps {
  selectedConversation: Conversation | null
  jwtToken: string
  privateKey: CryptoKey | null
  currentUserProfile?: any
}

export function Chats({
  selectedConversation,
  jwtToken,
  privateKey,
  currentUserProfile,
}: ChatsProps) {
  const [textareaValue, setTextareaValue] = useState("")
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const [uploadState, setUploadState] =
    useState<CircularProgressDropzoneState>()
  const [open, setOpen] = useState(false)
  const [receiverUser, setReceiverUser] = useState<User | null>(null)
  const [starredMap, setStarredMap] = useState<Record<string, boolean>>({})
  const [selectedTab, setSelectedTab] = useState<"Messages" | "Pinned">(
    "Messages"
  )
  const [pinnedMsgs, setPinnedMsgs] = useState<Message[]>([])
  const pinnedFetchRef = useRef<AbortController | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [forwardOpen, setForwardOpen] = useState(false)
  const [forwardTarget, setForwardTarget] = useState<Message | null>(null)
  const [keyReady, setKeyReady] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  // Thread-level state is source-of-truth from the server (selectedConversation)
  // which is kept up-to-date by the user:{userId} Ably subscription in left-sidebar.
  const threadPinned = !!(selectedConversation as any)?.isPinned
  const threadArchived = !!(selectedConversation as any)?.isArchived
  const threadSpam = !!(selectedConversation as any)?.isSpam
  const threadUnread = !!(selectedConversation as any)?.markedUnread
  const [starredOverride, setStarredOverride] = useState<boolean | null>(null)
  const threadStarred = starredOverride ?? !!(selectedConversation as any)?.isStarred
  const threadActions = useThreadActions(jwtToken)

  const handleOpenForward = useCallback((msg: Message) => {
    setForwardTarget(msg)
    setForwardOpen(true)
  }, [])

  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getCurrentUser>>(null)
  useEffect(() => {
    const base = getCurrentUser()
    if (base && currentUserProfile?.username) {
      setCurrentUser({ ...base, username: currentUserProfile.username })
    } else {
      setCurrentUser(base)
    }
  }, [currentUserProfile])

  const handleEmojiSelect = (emoji: DataEmoji) => {
    const emojiChar = String.fromCodePoint(
      ...emoji[EmojiProperties.unified]
        .split("-")
        .map((hex) => parseInt(hex, 16))
    )
    setTextareaValue((prev) => (prev || "") + emojiChar)
  }

  // Reset per-conversation state when switching conversations
  useEffect(() => {
    setStarredOverride(null)
    setReplyingTo(null)
    setEditingMessage(null)
    setTextareaValue("")
  }, [selectedConversation?.id])

  // Auto mark-read when opening a conversation
  useEffect(() => {
    if (!selectedConversation) return
    threadActions.markRead(selectedConversation.id).catch(() => {})
  }, [selectedConversation?.id])

  // 1) unwrap the AES key once per conversation
  useEffect(() => {
    setKeyReady(false)
    setKeyError(null)
    if (!selectedConversation || !privateKey) return
    const ac = new AbortController()
    const convId = selectedConversation.id
    ;(async () => {
      try {
        const { encryptedKey } = await apiFetch<{ encryptedKey: string }>(
          `/api/messaging/conversations/${convId}/key?isGroup=${selectedConversation.isGroup}`,
          {
            headers: { Authorization: `Bearer ${jwtToken}` },
            signal: ac.signal,
          }
        )
        if (ac.signal.aborted) return

        const privatePem = await exportPrivateKey(privateKey)
        const rawBuf = await decryptWithPrivateKey(encryptedKey, privatePem)
        if (ac.signal.aborted) return

        const arr = new Uint8Array(rawBuf)
        const b64 = btoa(String.fromCharCode(...arr))
        saveKey(convId, b64)
        setKeyReady(true)
      } catch (err: any) {
        if (err?.name === "AbortError") return
        console.error("Failed to unwrap conversation key", err)
        if (!ac.signal.aborted) {
          setKeyReady(false)
          setKeyError(
            "Could not decrypt this conversation key. Refresh and try again."
          )
        }
      }
    })()
    return () => ac.abort()
  }, [selectedConversation?.id, selectedConversation?.isGroup, privateKey, jwtToken])

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

  // File selection handler
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files])
      // Reset the input value to allow selecting the same file again
      event.target.value = ""
    }
  }

  // Remove selected file
  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

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
  const { messages: fetchedMsgs, loading: messagesLoading } = useMessages(
    selectedConversation ? selectedConversation.id : "",
    jwtToken,
    keyReady
  )
  const isSwitching = !keyError && (messagesLoading || !keyReady)

  // 2.1) local messages state for optimistic updates
  const [localMsgs, setLocalMsgs] = useState<Message[]>([])
  useEffect(() => {
    if (fetchedMsgs) {
      setLocalMsgs(fetchedMsgs)
    }
  }, [fetchedMsgs])

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
      pinned?: boolean
      deleted?: boolean
      forwardedFromId?: string
      quotedCiphertext?: string | null
    }) => {
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
          quotedPlain = "🔒 Encrypted message"
        }
      }
      setLocalMsgs((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev
        return [
          ...prev,
          {
            ...incoming,
            content: plain,
            quotedContent: quotedPlain,
            isRead: false,
            isPinned: incoming.pinned ?? false,
            isDeleted: incoming.deleted ?? false,
          },
        ]
      })
    },
    [setLocalMsgs]
  )

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
      updateMessage(messageId, { isDeleted: true, deletedAt: Date.now() } as any)
      setTimeout(() => {
        setLocalMsgs((prev) => prev.map((m) => m))
      }, 30000)
    },
    [updateMessage]
  )

  const handleLocalRestore = useCallback(
    (messageId: string) => {
      updateMessage(messageId, { isDeleted: false, deletedAt: undefined } as any)
    },
    [updateMessage]
  )

  // Ably incoming edit: decrypt + patch local state
  const handleIncomingEdit = useCallback(
    async (incoming: { id: string; ciphertext?: string; senderId: string; threadId: string; edited?: boolean }) => {
      let plain = ""
      try {
        const key = loadKey(incoming.threadId)
        if (key && incoming.ciphertext) {
          plain = await decryptAES(incoming.ciphertext, key)
        }
      } catch (err) {
        console.error("Failed to decrypt edited message:", err)
        plain = "🔒 Encrypted message"
      }
      updateMessage(incoming.id, {
        content: plain,
        ciphertext: incoming.ciphertext,
        edited: true,
      })
    },
    [updateMessage]
  )

  useAblyChannel(
    channelName,
    handleIncoming,
    ({ messageId, isPinned }) => updateMessage(messageId, { isPinned }),
    (messageId) => updateMessage(messageId, { isDeleted: true }),
    (messageId) => updateMessage(messageId, { isDeleted: false }),
    handleIncomingEdit
  )

  // 3) send message hook

  const send = useSendMessage(
    jwtToken,
    privateKey,
    selectedConversation?.isGroup
  )
  const editMsg = useEditMessage(jwtToken)
  //  useFileUpload call
  //const uploadFile = useFileUpload(jwtToken, privateKey, selectedConversation?.isGroup)

  // 4) scroll to bottom on new messages
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
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

    apiFetch<User>(`/users/${otherId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${jwtToken}` },
    })
      .then(setReceiverUser)
      .catch(console.error)
  }, [selectedConversation?.id])

  // 6) send handler
  const handleSendMessage = async () => {
    if (!selectedConversation || !textareaValue.trim()) return
    if (isSending) return

    setIsSending(true)
    try {
      const saved = await send(selectedConversation.id, textareaValue.trim(), replyingTo?.id)

      // Backend returns message directly or wrapped in { data }
      const msg = (saved as any).data ?? saved

      let displayContent = msg.content
      try {
        const key = loadKey(selectedConversation.id)
        if (key && msg.ciphertext) {
          displayContent = await decryptAES(msg.ciphertext, key)
        }
      } catch {
        // no key cached, content is already plaintext
      }

      setLocalMsgs((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [
          ...prev,
          {
            ...msg,
            content: displayContent,
          },
        ]
      })

      setTextareaValue("")
      setReplyingTo(null)
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
    if (!newContent) return
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
        const allMsgs = await apiFetch<Message[]>(
          `/v1/messages/thread/${convId}`,
          {
            headers: { Authorization: `Bearer ${jwtToken}` },
            signal: ac.signal,
          }
        )
        if (ac.signal.aborted) return
        const pinned = allMsgs.filter((m) => m.pinned || m.isPinned)

        let key: Uint8Array | null = null
        try { key = loadKey(convId) } catch { /* no key */ }
        const decrypted = await Promise.all(
          pinned.map(async (m) => {
            if (!m.ciphertext) return m
            if (!key) return { ...m, content: "🔒 Encrypted message" }
            try {
              return { ...m, content: await decryptAES(m.ciphertext, key) }
            } catch {
              return { ...m, content: "🔒 Encrypted message" }
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
        <p className="text-sm font-medium">Select a conversation to start messaging</p>
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

  // Compute full name
  const fullName = selectedConversation?.isGroup
    ? selectedConversation.group?.name ?? "Unnamed Group"
    : [receiverUser.firstName?.trim(), receiverUser.lastName?.trim()]
        .filter(Boolean)
        .join(" ") ||
      receiverUser.username ||
      "Unknown User"

  return (
    <div className="flex-auto relative">
      {/* Header */}
      <div className="px-8 sticky top-0 border-b flex items-center justify-between border-gray-200 py-6 bg-white z-10">
        <div className="inline-flex items-center gap-x-3">
          {/* <Avatar className="size-[43px]" size="md" isOnline>
                        <AvatarImage src={receiverUser.avatarUrl || '/default.png'} alt={receiverUser.username ?? ''} />
                        <AvatarFallback>{receiverUser.username?.[0] ?? ''}</AvatarFallback>
                    </Avatar> */}
          <Avatar className="size-[43px]" size="md" isOnline>
            <AvatarImage
              src={
                selectedConversation?.isGroup
                  ? "/group-default.png"
                  : receiverUser.avatarUrl || "/default.png"
              }
              alt={
                selectedConversation?.isGroup
                  ? selectedConversation?.group?.name || "Group"
                  : receiverUser.username ?? ""
              }
            />
            <AvatarFallback>
              {selectedConversation?.isGroup
                ? selectedConversation?.group?.name?.[0] ?? "G"
                : receiverUser.username?.[0] ?? ""}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col gap-y-1">
            <div className="inline-flex items-center gap-x-1">
              <span className="text-lg font-semibold text-dark-blue-400">
                {fullName}
              </span>
            </div>
            <div className="inline-flex items-center gap-x-2">
              <span className="text-sm text-dark-blue-400">Active now</span>
              {(receiverUser as any).recentJobTitle ||
              ((receiverUser as any).jobTitles &&
                (receiverUser as any).jobTitles[0]) ? (
                <>
                  <span className="inline-block h-4 w-px bg-gray-300" />
                  <span className="text-sm text-dark-blue-400">
                    {(receiverUser as any).recentJobTitle ||
                      (receiverUser as any).jobTitles[0]}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-x-6">
          <ToggleGroupRoot
            value={selectedTab ? [selectedTab] : undefined}
            onValueChange={(details: { value: string[] }) => {
              const val = details.value?.[0]
              if (val === "Messages" || val === "Pinned") {
                handleToggleChange(val)
              }
            }}
          >
            <ToggleGroupItem value="Messages">Messages</ToggleGroupItem>
            <ToggleGroupItem value="Pinned">
              Pinned
              {(() => {
                const count = localMsgs.filter((m) => m.pinned || m.isPinned).length
                return count > 0 ? (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-semibold bg-gray-300 text-gray-800 rounded-full">
                    {count}
                  </span>
                ) : null
              })()}
            </ToggleGroupItem>
          </ToggleGroupRoot>

          <div className="flex items-center gap-x-1">
            <IconButton visual="gray" variant="ghost" size="lg">
              <Info className="size-[22px]" />
            </IconButton>
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
                <div className="size-11 flex items-center justify-center">
                  <Favorite className="text-gray-500" />
                </div>
              )}
            </FavoriteRoot>

            <DropdownMenu modal={false}>
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
              <DropdownMenuContent align="end" side="bottom">
                <DropdownMenuItem>
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
                    ).catch((err) => console.error("mark unread/read failed", err))
                  }}
                >
                  <Mail05 className="size-4" /> {threadUnread ? "Mark as Read" : "Mark Unread"}
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
                    ).catch((err) => console.error("archive toggle failed", err))
                  }}
                >
                  <Archive className="size-4" /> {threadArchived ? "Unarchive" : "Archive"}
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
                  <AlertTriangle className="size-4" /> {threadSpam ? "Move to Inbox" : "Move to Spam"}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-error-500">
                  <AlertTriangle className="size-4" /> Block / Report
                </DropdownMenuItem>
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

            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
              <DialogContent className="max-w-[348px] p-7 rounded-xl">
                <DialogTitle>Delete this chat?</DialogTitle>
                <DialogDescription className="mt-2">
                  This chat will be moved to Trash. You can restore it later from the Trash filter.
                </DialogDescription>
                <div className="mt-8 grid grid-cols-2 gap-x-3">
                  <DialogClose asChild>
                    <Button visual="gray" variant="outlined">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button onClick={() => {
                    if (!selectedConversation) return
                    threadActions
                      .trash(selectedConversation.id)
                      .catch((err) => console.error("trash failed", err))
                    setShowDeleteConfirm(false)
                  }}>
                    Yes, Delete
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Message list */}
      <div style={{ ...({ "--h": toPxIfNumber(height) } as any) }}>
        <ScrollArea
          viewportClassName="max-h-[calc(theme(height.screen)-158px)]"
          scrollBar={<ScrollBar className="w-4 p-1" />}
        >
          <div className="p-8 pb-[100px] grid gap-y-6">
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
            {!isSwitching && displayedMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
                <Send className="size-8 stroke-[1.5]" />
                <p className="text-sm">No messages yet. Say hello!</p>
              </div>
            )}
            {!isSwitching && displayedMessages.map((m, i) => (
              <div
                key={i}
                className={`flex ${
                  m.senderId === currentUser.id
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                {m.senderId === currentUser.id ? (
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
                    replyToMessage={m.replyToMessageId ? localMsgs.find((r) => r.id === m.replyToMessageId) ?? null : null}
                  />
                ) : (
                  <YourBubble
                    message={m}
                    currentUser={currentUser}
                    onForward={handleOpenForward}
                    onReply={setReplyingTo}
                    replyToMessage={m.replyToMessageId ? localMsgs.find((r) => r.id === m.replyToMessageId) ?? null : null}
                    participantName={fullName}
                    participantUsername={receiverUser.username ?? ""}
                    participantAvatarUrl={receiverUser.avatarUrl ?? undefined}
                  />
                )}
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Composer */}
      <div
        className="bg-white absolute bottom-0 inset-x-0"
        ref={bottomRef}
      >
        {replyingTo && !editingMessage && (
          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary-600">
                Replying to {replyingTo.senderId === currentUser?.id ? "yourself" : (receiverUser?.firstName || receiverUser?.username || "Unknown")}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {replyingTo.content || "Encrypted message"}
              </p>
            </div>
            <IconButton
              visual="gray"
              variant="ghost"
              size="sm"
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
              onClick={handleCancelEdit}
            >
              <X className="size-4" />
            </IconButton>
          </div>
        )}

        <div className="p-3 flex min-h-[68px] items-end gap-x-3">
        {/* Emoji + File + Upload */}
        <div className="flex items-center gap-x-1">
          <EmojiPicker onEmojiSelect={handleEmojiSelect}>
            <IconButton visual="gray" variant="ghost" size="lg">
              <Smile className="size-[22px]" />
            </IconButton>
          </EmojiPicker>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <IconButton visual="gray" variant="ghost" size="lg">
                <Image03 className="size-[22px]" />
              </IconButton>
            </DialogTrigger>
            <DialogContent className="max-w-[467px] p-4">
              <h3 className="text-xs font-semibold text-gray-900">
                Upload Files
              </h3>
              <DialogClose asChild>
                <IconButton
                  visual="gray"
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                >
                  <X className="size-4" />
                </IconButton>
              </DialogClose>
              <div className="mt-4">
                <CircularProgressDropzone
                  icon
                  value={uploadState}
                  onChange={setUploadState}
                />
              </div>
              <div className="mt-8 grid grid-cols-2 gap-x-3">
                <DialogClose asChild>
                  <Button visual="gray" variant="outlined">
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  visual="primary"
                  variant="filled"
                  disabled={!uploadState?.length}
                  //   onClick={toggle}
                  // >
                  //   Send
                  onClick={() => {
                    // TODO: actually upload here…
                    setOpen(false)
                  }}
                >
                  Send
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          {/* // Updated attachment dropdown with file input */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton visual="gray" variant="ghost" size="lg">
                <Attachment01 className="size-[22px]" />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[212px]">
              <DropdownMenuItem
                onClick={() =>
                  document.getElementById("desktop-file-input")?.click()
                }
              >
                <UploadCloud className="size-6" /> Upload from Desktop
              </DropdownMenuItem>
              <DropdownMenuItem>
                <DropboxBrand className="size-6" /> Upload via Dropbox
              </DropdownMenuItem>
              <DropdownMenuItem>
                <GoogleDrive1Brand className="size-6" /> Upload via Google Drive
              </DropdownMenuItem>
              <DropdownMenuItem>
                <MsOnedriveBrand className="size-6" /> Upload via OneDrive
              </DropdownMenuItem>
              <DropdownMenuArrow className="fill-white" />
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Hidden file input */}
          <input
            id="desktop-file-input"
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.mp4,.mov"
            multiple
          />
        </div>

        {/* Updated message input area with file previews */}
        {/* Selected Files Preview */}
        {selectedFiles.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""}{" "}
                selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFiles([])}
                className="text-gray-500 hover:text-gray-700"
              >
                Clear all
              </Button>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between p-2 bg-white rounded border"
                >
                  <div className="flex items-center space-x-3">
                    <File className="size-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-48">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSelectedFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Text area + send - Updated */}
        <InputGroup className="flex-auto w-[calc(100%-164px)]">
          <Textarea
            ref={composerRef}
            placeholder={
              editingMessage
                ? "Edit message..."
                : selectedFiles.length > 0
                  ? "Add a message (optional)..."
                  : "Send message..."
            }
            className={`w-full resize-none py-1.5 leading-5 min-h-0 h-9 overflow-hidden ${
              editingMessage
                ? "pr-[120px] ring-1 ring-primary-500 border-primary-500 focus:ring-primary-500 focus:border-primary-500"
                : "pr-11"
            }`}
            rows={1}
            value={textareaValue}
            onChange={(e) => setTextareaValue(e.target.value)}
            onKeyDown={(e) => {
              if (editingMessage) {
                if (e.key === "Escape") {
                  e.preventDefault()
                  handleCancelEdit()
                } else if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSaveEdit()
                }
              }
            }}
          />
          <InputRightElement
            className={editingMessage ? "!w-[120px] justify-end" : "items-center"}
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
                    !textareaValue.trim() ||
                    !keyReady ||
                    !!keyError ||
                    textareaValue.trim() === (editingMessage.content || "").trim()
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
                      !!keyError
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
    </div>
  )
}
