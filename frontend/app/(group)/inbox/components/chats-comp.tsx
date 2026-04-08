"use client"

import React, { useCallback, useMemo, useRef, useState } from "react"
import { useEffect } from "react"
import { decryptAES, decryptWithPrivateKey } from "@/src/crypto/e2ee"
import {
  ensureEncryptionKeysExist,
  exportPrivateKey,
  exportPublicKey,
  generateKeyPair,
  importPrivateKey,
  savePrivateKey,
  savePublicKey,
} from "@/src/crypto/keys"
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
  Loader,
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
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Favorite,
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
import { useFileUpload } from "../hooks/use-file-upload"
import { addParticipantToGroup } from "../hooks/use-group-encryption"
import { useMessages } from "../hooks/use-messages"
import { useSendMessage } from "../hooks/use-send-message"

interface ChatsProps {
  selectedConversation: Conversation | null
  jwtToken: string
  privateKey: CryptoKey | null
}

export function Chats({
  selectedConversation,
  jwtToken,
  privateKey,
}: ChatsProps) {
  const [textareaValue, setTextareaValue] = useState("")
  const [uploadState, setUploadState] =
    useState<CircularProgressDropzoneState>()
  const [open, setOpen] = useState(false)
  const [receiverUser, setReceiverUser] = useState<User | null>(null)
  const [starredMap, setStarredMap] = useState<Record<string, boolean>>({})
  const [selectedTab, setSelectedTab] = useState<"Messages" | "Pinned">(
    "Messages"
  )
  const [pinnedMsgs, setPinnedMsgs] = useState<Message[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const currentUser = getCurrentUser()

  const handleEmojiSelect = (emoji: DataEmoji) => {
    const emojiChar = String.fromCodePoint(
      ...emoji[EmojiProperties.unified]
        .split("-")
        .map((hex) => parseInt(hex, 16))
    )
    setTextareaValue((prev) => (prev || "") + emojiChar)
  }

  // 1) unwrap the AES key once per conversation
  useEffect(() => {
    if (!selectedConversation || !privateKey) return
    ;(async () => {
      try {
        const { encryptedKey } = await apiFetch<{ encryptedKey: string }>(
          `/api/messaging/conversations/${selectedConversation.id}/key?isGroup=${selectedConversation.isGroup}`,
          { headers: { Authorization: `Bearer ${jwtToken}` } }
        )

        // decrypt with your RSA privateKey → ArrayBuffer
        const privatePem = await exportPrivateKey(privateKey)
        const rawBuf = await decryptWithPrivateKey(encryptedKey, privatePem)

        // store base64 so loadKey() can find it
        const arr = new Uint8Array(rawBuf)
        const b64 = btoa(String.fromCharCode(...arr))
        saveKey(selectedConversation.id, b64)
      } catch (err) {
        console.error("Failed to unwrap conversation key", err)
      }
    })()
  }, [selectedConversation, privateKey, jwtToken])

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
  const fetchedMsgs = useMessages(
    selectedConversation ? selectedConversation.id : "",
    jwtToken
  )

  // 2.1) local messages state for optimistic updates
  const [localMsgs, setLocalMsgs] = useState<Message[]>([])
  useEffect(() => {
    if (fetchedMsgs) {
      setLocalMsgs(fetchedMsgs)
    }
  }, [fetchedMsgs])

  const displayedMessages =
    selectedTab === "Messages" ? localMsgs : localMsgs.filter((m) => m.isPinned)

  // 3) subscribe to Ably for real-time incoming
  // subscribe to Ably for real-time updates

  const channelName = selectedConversation?.id || ""

  // 1) memoize your incoming‐message handler so it stays the same function reference:
  const handleIncoming = useCallback(
    async (incoming: {
      id: string
      ciphertext: string
      senderId: string
      conversationId: string
      createdAt: string
      updatedAt: string
      isPinned?: boolean
      isDeleted?: boolean
    }) => {
      // Skip if the message is from current user
      if (incoming.senderId === currentUser?.id) return

      const key = loadKey(incoming.conversationId)
      if (!key) {
        console.error("No AES key for", incoming.conversationId)
        return
      }
      let plain: string
      try {
        plain = await decryptAES(incoming.ciphertext, key)
      } catch (err) {
        console.error("Failed to decrypt incoming:", err)
        return
      }
      setLocalMsgs((prev) => [
        ...prev,
        {
          ...incoming,
          content: plain,
          isRead: false,
          isPinned: incoming.isPinned ?? false,
          isDeleted: incoming.isDeleted ?? false,
        },
      ])
    },
    [setLocalMsgs, currentUser?.id] // only changes if setLocalMsgs ever changes (it won’t)
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

  useAblyChannel(
    channelName,
    handleIncoming,
    ({ messageId, isPinned }) => updateMessage(messageId, { isPinned }),
    (messageId) => updateMessage(messageId, { isDeleted: true }),
    (messageId) => updateMessage(messageId, { isDeleted: false })
  )

  // 3) send message hook

  const send = useSendMessage(
    jwtToken,
    privateKey,
    selectedConversation?.isGroup
  )
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
    const otherId = selectedConversation.participants.find(
      (p) => p.userId !== currentUser.id
    )?.userId
    if (!otherId) return

    apiFetch<User>(`/api/messaging/users/${otherId}`, {
      method: "GET",
    })
      .then(setReceiverUser)
      .catch(console.error)
  }, [selectedConversation])

  // 6) send handler
  const handleSendMessage = async () => {
    if (!selectedConversation || !textareaValue.trim()) return

    try {
      const saved = await send(selectedConversation.id, textareaValue.trim())

      // Optimistically append to local state
      // 2)decrypt the returned ciphertext so you display plaintext
      const key = loadKey(selectedConversation.id)
      const plain = await decryptAES(saved.data.ciphertext, key)

      // 3) append to local state
      setLocalMsgs((prev) => [
        ...prev,
        {
          ...saved.data,
          content: plain,
        },
      ])

      setTextareaValue("")
    } catch (err) {
      console.error("Send failed", err)
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
      try {
        if (!selectedConversation) return
        const pinned = await apiFetch<Message[]>(
          `/api/messaging/conversations/${selectedConversation.id}/pinned`,
          {
            headers: { Authorization: `Bearer ${jwtToken}` },
          }
        )
        setPinnedMsgs(pinned)
      } catch (err) {
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
      <div className="flex-1 flex items-center justify-center">
        Not logged in
      </div>
    )
  }

  if (!selectedConversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        Select a conversation
      </div>
    )
  }

  if (!receiverUser) {
    return (
      <div className="flex-1 flex items-center justify-center">
        Loading user…
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
                {receiverUser.firstName}
              </span>
              <span className="text-base text-dark-blue-400">{fullName}</span>
            </div>
            <div className="inline-flex items-center gap-x-2">
              <span className="text-sm text-dark-blue-400">Active now</span>
              <span className="inline-block h-4 w-px bg-gray-300" />
              <span className="text-sm text-dark-blue-400">
                {receiverUser.role}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-x-6">
          <ToggleGroupRoot
            value={selectedTab ? [selectedTab] : undefined}
            onValueChange={(details: { value: string[] }) => {
              const val = details.value?.[0]
              if (val === "Messages" || val === "Pinned") {
                setSelectedTab(val)
              }
            }}
          >
            <ToggleGroupItem value="Messages">Messages</ToggleGroupItem>
            <ToggleGroupItem value="Pinned">Pinned</ToggleGroupItem>
          </ToggleGroupRoot>

          <div className="flex items-center gap-x-1">
            <IconButton visual="gray" variant="ghost" size="lg">
              <Info className="size-[22px]" />
            </IconButton>
            <div className="size-11 flex items-center justify-center">
              <Favorite className="text-gray-500" />
            </div>

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
                <DropdownMenuItem>
                  <Star className="size-4" /> Mark Favorite
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Mail05 className="size-4" /> Mark Unread
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Pin02 className="size-4" /> Pin Chat
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Archive className="size-4" /> Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <AlertTriangle className="size-4" /> Move to Spam
                </DropdownMenuItem>
                <DropdownMenuItem className="text-error-500">
                  <AlertTriangle className="size-4" /> Block / Report
                </DropdownMenuItem>
                <DropdownMenuItem className="text-error-500">
                  <Trash2 className="size-4" /> Delete Chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
            {displayedMessages.map((m, i) => (
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
                    participantUsername={
                      receiverUser.username ?? "Unknown User"
                    }
                  />
                ) : (
                  <YourBubble
                    message={m}
                    currentUser={currentUser}
                    participantUsername={
                      receiverUser.username ?? "Unknown User"
                    }
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
        className="p-3 flex min-h-[68px] bg-white items-end gap-x-3 absolute bottom-0 inset-x-0"
        ref={bottomRef}
      >
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
            placeholder={
              selectedFiles.length > 0
                ? "Add a message (optional)..."
                : "Send message..."
            }
            className="[field-sizing:content] h-auto pr-11 w-full"
            value={textareaValue}
            onChange={(e) => setTextareaValue(e.target.value)}
          />
          <InputRightElement className="items-end pb-[13px]">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  className={`text-gray-500 hover:text-primary-500 disabled:text-gray-400 ${
                    isUploading ? "animate-pulse" : ""
                  }`}
                  onClick={handleSendMessage}
                  disabled={
                    (!textareaValue.trim() && selectedFiles.length === 0) ||
                    isUploading
                  }
                >
                  {isUploading ? (
                    <Loader className="size-[18px] animate-spin" />
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
          </InputRightElement>
        </InputGroup>
      </div>
    </div>
  )
}
