import { useEffect, useState } from "react"
import Image from "next/image"
import { apiFetch } from "@/src/lib/api"
import { CurrentUser } from "@/utils/auth"
import { isNotUndefined } from "@/utils/functions"
import { useUncontrolledState } from "@/utils/hooks"
import { createContext } from "@/utils/react-utils"
import {
  AlertCircle,
  Archive,
  Compass03,
  CornerUpLeft,
  DotsHorizontal,
  Download02,
  Edit03,
  EyeOff,
  Send03,
  Smile,
  Tag,
  Trash2,
  X,
} from "@blend-metrics/icons"
import { GoogleDrive1Brand } from "@blend-metrics/icons/brands"
import { Meta } from "@storybook/react"
import { format, isToday, isYesterday, parseISO } from "date-fns"
import { useIsomorphicLayoutEffect, useToggle } from "react-use"
import type { Conversation } from "@/types/conversation"
import { Message } from "@/types/message"
import { Chat } from "@/components/chat"
import {
  Avatar,
  AvatarFallbackIcon,
  AvatarImage,
  Dialog,
  DialogClose,
  DialogContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui"

const meta: Meta = {
  title: "Inbox",
}

export default meta

const getJwtToken = () => {
  if (typeof window === "undefined") return null
  const Cookies = require("js-cookie")
  return Cookies.get("access_token") || Cookies.get("accessToken") || localStorage.getItem("token") || null
}

const formatConversationDate = (isoDateStr: string) => {
  const date = parseISO(isoDateStr)

  if (isToday(date)) {
    return format(date, "hh:mm a")
  }

  if (isYesterday(date)) {
    return "Yesterday " + format(date, "hh:mm a") // e.g., Yesterday 5:01 PM
  }

  const now = new Date()
  if (date.getFullYear() === now.getFullYear()) {
    return format(date, "MMM dd, hh:mm a") // e.g., Jul 28, 5:01 PM
  }

  return format(date, "MMM dd yyyy, hh:mm a") // e.g., Dec 5 2024, 5:01 PM
}

const handlePinMessage = async (messageId: string) => {
  const jwtToken = getJwtToken()
  try {
    await apiFetch<{ message: string }>(
      `/v1/messages/${messageId}/pin`,
      {
        method: "POST",
        headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {},
      }
    )
  } catch (err) {
    console.error("Failed to pin message:", err)
  }
}

const formatAttachmentSize = (bytes?: number | null) => {
  if (!bytes && bytes !== 0) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kb`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const MessageAttachmentView = ({
  attachment,
}: {
  attachment: {
    id: string
    fileUrl: string
    fileType: string
    fileName?: string | null
    fileSize?: number | null
  }
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const isImage = attachment.fileType?.startsWith("image/")
  if (isImage) {
    return (
      <div className="flex flex-col gap-y-1">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="focus-visible:outline-none"
        >
          <img
            src={attachment.fileUrl}
            alt={attachment.fileName || "image"}
            className="max-w-[300px] max-h-[300px] rounded-md object-cover cursor-zoom-in transition hover:opacity-95"
          />
        </button>
        {attachment.fileName && (
          <p className="text-[11px] text-gray-500">
            {attachment.fileName}
            {attachment.fileSize
              ? ` (${formatAttachmentSize(attachment.fileSize)})`
              : ""}
          </p>
        )}
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent
            className="max-w-none w-auto rounded-none bg-transparent p-0 shadow-none"
            accessibilityTitle={attachment.fileName || "Image preview"}
          >
            <div className="relative flex items-center justify-center">
              <img
                src={attachment.fileUrl}
                alt={attachment.fileName || "image"}
                className="max-h-[92vh] max-w-[92vw] rounded-md object-contain"
              />
              <div className="absolute right-3 top-3 flex items-center gap-x-2">
                <a
                  href={attachment.fileUrl}
                  download={attachment.fileName || true}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Download image"
                  className="inline-flex size-9 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                >
                  <Download02 className="size-4" />
                </a>
                <DialogClose
                  aria-label="Close"
                  className="inline-flex size-9 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
                >
                  <X className="size-4" />
                </DialogClose>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }
  return (
    <a
      href={attachment.fileUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-x-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:border-gray-300 max-w-[300px]"
    >
      <Download02 className="size-4 shrink-0 text-gray-500" />
      <span className="truncate">{attachment.fileName || "Attachment"}</span>
      {attachment.fileSize ? (
        <span className="text-gray-400">
          {formatAttachmentSize(attachment.fileSize)}
        </span>
      ) : null}
    </a>
  )
}

export const Bubble = ({
  message,
  currentUser,
  participantUsername,
  participantName,
  onForward,
  onReply,
  onEdit,
  replyToMessage,
  onLocalDelete,
  onLocalRestore,
}: {
  message: Message
  currentUser: CurrentUser
  participantUsername?: string
  participantName?: string
  onForward?: (message: Message) => void
  onReply?: (message: Message) => void
  onEdit?: (message: Message) => void
  replyToMessage?: Message | null
  onLocalDelete?: (messageId: string) => void
  onLocalRestore?: (messageId: string) => void
}) => {
  const [value, setValue] = useState(message.content)
  const { onChatChange, chat, isSaved, onUnsave } = useEditContext()
  const [isPinned, setIsPinned] = useState(!!message.isPinned)
  const [isDeleted, setIsDeleted] = useState(!!message.isDeleted)
  const [deletedAt, setDeletedAt] = useState<number | null>(null)
  const [showUndo, setShowUndo] = useState(false)
  const [actionMenuOpen, setActionMenuOpen] = useState(false)

  // Determine sender name
  const isMe = message.senderId === currentUser.id
  const senderName = isMe
    ? "Me"
    : participantName || participantUsername || "Unknown"
  const senderUsername = isMe
    ? (currentUser.username ? "@" + currentUser.username : "")
    : participantUsername
      ? "@" + participantUsername
      : ""

  // Format timestamp
  const formattedTime = formatConversationDate(message.createdAt)

  useEffect(() => {
    if (isDeleted && isMe && deletedAt) {
      const timeSinceDelete = Date.now() - deletedAt
      if (timeSinceDelete < 30000) {
        setShowUndo(true)
        const remaining = 30000 - timeSinceDelete

        const timer = setTimeout(() => {
          setShowUndo(false)
        }, remaining)

        return () => clearTimeout(timer)
      } else {
        setShowUndo(false)
      }
    }
  }, [isDeleted, isMe, deletedAt])

  useEffect(() => {
    setIsPinned(!!message.isPinned)
  }, [message.isPinned])

  useEffect(() => {
    setIsDeleted(!!message.isDeleted)
  }, [message.isDeleted])

  useEffect(() => {
    setValue(message.content)
  }, [message.content])

  useIsomorphicLayoutEffect(() => {
    if (chat && isSaved) {
      setValue(chat)
      onUnsave()
    }
  }, [isSaved])

  const handlePinMessage = async () => {
    const jwtToken = getJwtToken()
    try {
      // Optimistic UI
      setIsPinned((prev) => !prev)

      await apiFetch<{ message: string }>(
        `/v1/messages/${message.id}/pin`,
        {
          method: "POST",
          headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {},
        }
      )
    } catch (err) {
      console.error("Failed to pin message:", err)
      setIsPinned((prev) => !prev) // revert if failed
    }
  }

  const handleDeleteMessage = async () => {
    const jwtToken = getJwtToken()
    try {
      setIsDeleted(true) // Optimistic UI
      setDeletedAt(Date.now())
      onLocalDelete?.(message.id)
      await apiFetch(`/v1/messages/${message.id}`, {
        method: "DELETE",
        headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {},
      })
    } catch (err) {
      console.error("Failed to delete message:", err)
      setIsDeleted(false) // revert if failed
      onLocalRestore?.(message.id)
    }
  }

  const handleRestoreMessage = async () => {
    const jwtToken = getJwtToken()
    try {
      setIsDeleted(false) // Optimistic UI
      onLocalRestore?.(message.id)
      await apiFetch(`/v1/messages/${message.id}/restore`, {
        method: "PATCH",
        headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {},
      })
    } catch (err) {
      console.error("Failed to restore message:", err)
      setIsDeleted(true) // revert if failed
      onLocalDelete?.(message.id)
    }
  }

  return (
    <article className="group inline-flex flex-col items-start gap-y-2">
      <div className="p-5 pt-2.5 flex-auto rounded-xl flex flex-col gap-y-2 bg-primary-500/[.04]">
        <div className="flex items-end justify-between">
          <h3 className="text-sm leading-[16.8px] font-bold text-dark-blue-400">
            {senderName}{" "}
            <span className="text-xs leading-[14.52px] font-normal">
              {senderUsername}
            </span>
          </h3>

          {!isDeleted && (
            <div
              className={`inline-flex transition duration-300 items-center gap-x-0.5 ${
                actionMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              <button
                className="size-7 inline-flex rounded-full focus-visible:outline-none text-gray-400 hover:bg-primary-50 hover:text-dark-blue-400 justify-center items-center shrink-0"
                onClick={() => onReply?.(message)}
              >
                <CornerUpLeft className="size-4" />
              </button>
              <button className="size-7 inline-flex rounded-full focus-visible:outline-none text-gray-400 hover:bg-primary-50 hover:text-dark-blue-400 justify-center items-center shrink-0">
                <Smile className="size-4" />
              </button>

              <DropdownMenu open={actionMenuOpen} onOpenChange={setActionMenuOpen}>
                <DropdownMenuTrigger className="size-7 inline-flex rounded-full focus-visible:outline-none text-gray-400 hover:bg-primary-50 hover:text-dark-blue-400 justify-center items-center shrink-0">
                  <DotsHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="bottom"
                  align="end"
                  className="min-w-0 w-auto"
                >
                  <DropdownMenuItem onSelect={() => onEdit?.(message)}>
                    <Edit03 className="h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handlePinMessage}>
                    <Edit03 className="h-4 w-4" /> {isPinned ? "Unpin" : "Pin"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onForward?.(message)}>
                    <Send03 className="h-4 w-4" /> Forward
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    visual="destructive"
                    onSelect={handleDeleteMessage}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* <span className="text-sm leading-[16.94px] text-dark-blue-400">
          {value}
        </span> */}

        {message.forwardedFromId && !isDeleted && (
          <div className="border-l-2 border-primary-300 pl-3 py-1 mb-1 rounded-r bg-primary-50/50">
            <p className="inline-flex items-center gap-x-1 text-xs font-semibold text-primary-600">
              <Send03 className="size-3" /> Forwarded
            </p>
            {message.quotedContent && (
              <p className="text-xs text-gray-600 line-clamp-3 mt-0.5">
                {message.quotedContent}
              </p>
            )}
          </div>
        )}

        {replyToMessage && !isDeleted && (
          <div className="border-l-2 border-primary-300 pl-3 py-1 mb-1 rounded-r bg-primary-50/50">
            <p className="text-xs font-semibold text-primary-600">
              Replying to {replyToMessage.senderId === currentUser.id ? "yourself" : (participantName || participantUsername || "Unknown")}
            </p>
            <p className="text-xs text-gray-500 line-clamp-2">
              {replyToMessage.content || "Encrypted message"}
            </p>
          </div>
        )}

        {!isDeleted && message.attachments?.[0] && (
          <MessageAttachmentView attachment={message.attachments[0]} />
        )}

        {isDeleted ? (
          <div className="text-gray-400 italic flex gap-2 items-center">
            This message was deleted
            {isMe && showUndo && (
              <button
                className="text-blue-500 underline text-xs"
                onClick={handleRestoreMessage}
              >
                Undo
              </button>
            )}
          </div>
        ) : (
          <span className="text-sm leading-[16.94px] text-dark-blue-400">
            {value}
          </span>
        )}
      </div>

      {isPinned && !isDeleted && (
        <span className="text-xs text-primary-500 mt-1">📌 Pinned</span>
      )}

      <span className="inline-flex self-end text-[11px] leading-[15.47px] text-gray-500 items-center gap-x-1">
        Sent <span className="font-bold">{formattedTime}</span>
        {message.edited && !isDeleted && (
          <span className="text-gray-400 italic">(edited)</span>
        )}
      </span>
    </article>
  )
}

export const [EditContextProvider, useEditContext] = createContext<{
  chat: string
  onChatChange: (value: string) => void
  isSaved: boolean
  onSave: () => void
  onUnsave: () => void
}>({
  displayName: "EditContext",
})

export const YourBubble = ({
  message,
  currentUser,
  participantUsername,
  participantName,
  participantAvatarUrl,
  onForward,
  onReply,
  replyToMessage,
}: {
  message: Message
  currentUser: CurrentUser
  participantUsername?: string
  participantName?: string
  participantAvatarUrl?: string
  onForward?: (message: Message) => void
  onReply?: (message: Message) => void
  replyToMessage?: Message | null
}) => {
  const [isPinned, setIsPinned] = useState(!!message.isPinned)
  const [isDeleted, setIsDeleted] = useState(!!message.isDeleted)
  const [value, setValue] = useState(message.content)
  const [actionMenuOpen, setActionMenuOpen] = useState(false)

  useEffect(() => {
    setIsDeleted(!!message.isDeleted)
  }, [message.isDeleted])

  useEffect(() => {
    setIsPinned(!!message.isPinned)
  }, [message.isPinned])

  useEffect(() => {
    setValue(message.content)
  }, [message.content])

  const handlePinMessage = async () => {
    const jwtToken = getJwtToken()
    try {
      // Optimistic UI
      setIsPinned((prev) => !prev)

      await apiFetch<{ message: string }>(
        `/v1/messages/${message.id}/pin`,
        {
          method: "POST",
          headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {},
        }
      )
    } catch (err) {
      console.error("Failed to pin message:", err)
      setIsPinned((prev) => !prev) // revert if failed
    }
  }

  const isMe = message.senderId === currentUser.id
  const senderName = isMe
    ? "Me"
    : participantName || participantUsername || "Unknown"
  const senderUsername = isMe
    ? (currentUser.username ? "@" + currentUser.username : "")
    : participantUsername
      ? "@" + participantUsername
      : ""

  // Format timestamp
  const formattedTime = formatConversationDate(message.createdAt)

  return (
    <article className="inline-flex items-end gap-x-2">
      <Avatar
        size="md"
        className="hover:ring-0 active:ring-primary-100"
        isOnline
      >
        <AvatarImage
          src={participantAvatarUrl || undefined}
          alt={participantName || "User"}
        />
        <AvatarFallbackIcon />
      </Avatar>

      <div className="group inline-flex flex-col items-start gap-y-2">
        <div className="p-5 pt-2.5 flex-auto rounded-xl flex flex-col gap-y-2 bg-primary-500/[.04]">
          <div className="flex items-end justify-between">
            <h3 className="text-sm leading-[16.8px] font-bold text-dark-blue-400">
              {senderName}{" "}
              <span className="text-xs leading-[14.52px] font-normal">
                {senderUsername}
              </span>
            </h3>

            <div
              className={`inline-flex transition duration-300 items-center gap-x-0.5 ${
                actionMenuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              <button
                className="size-7 inline-flex rounded-full focus-visible:outline-none text-gray-400 hover:bg-primary-50 hover:text-dark-blue-400 justify-center items-center shrink-0"
                onClick={() => onReply?.(message)}
              >
                <CornerUpLeft className="size-4" />
              </button>
              <button className="size-7 inline-flex rounded-full focus-visible:outline-none text-gray-400 hover:bg-primary-50 hover:text-dark-blue-400 justify-center items-center shrink-0">
                <Smile className="size-4" />
              </button>

              <DropdownMenu open={actionMenuOpen} onOpenChange={setActionMenuOpen}>
                <DropdownMenuTrigger className="size-7 inline-flex rounded-full focus-visible:outline-none text-gray-400 hover:bg-primary-50 hover:text-dark-blue-400 justify-center items-center shrink-0">
                  <DotsHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="bottom"
                  align="end"
                  className="min-w-0 w-auto"
                >
                  <DropdownMenuItem onSelect={handlePinMessage}>
                    <Edit03 className="h-4 w-4" /> {isPinned ? "Unpin" : "Pin"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onForward?.(message)}>
                    <Send03 className="h-4 w-4" /> Forward
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {message.forwardedFromId && !isDeleted && (
            <div className="border-l-2 border-primary-300 pl-3 py-1 mb-1 rounded-r bg-primary-50/50">
              <p className="inline-flex items-center gap-x-1 text-xs font-semibold text-primary-600">
                <Send03 className="size-3" /> Forwarded
              </p>
              {message.quotedContent && (
                <p className="text-xs text-gray-600 line-clamp-3 mt-0.5">
                  {message.quotedContent}
                </p>
              )}
            </div>
          )}

          {replyToMessage && !isDeleted && (
            <div className="border-l-2 border-primary-300 pl-3 py-1 mb-1 rounded-r bg-primary-50/50">
              <p className="text-xs font-semibold text-primary-600">
                Replying to {replyToMessage.senderId === currentUser.id ? "yourself" : (participantName || participantUsername || "Unknown")}
              </p>
              <p className="text-xs text-gray-500 line-clamp-2">
                {replyToMessage.content || "Encrypted message"}
              </p>
            </div>
          )}

          {!isDeleted && message.attachments?.[0] && (
            <MessageAttachmentView attachment={message.attachments[0]} />
          )}

          {isDeleted ? (
            <div className="text-gray-400 italic flex gap-2 items-center">
              This message was deleted
            </div>
          ) : (
            <span className="text-sm leading-[16.94px] text-dark-blue-400">
              {value}
            </span>
          )}
        </div>

        {isPinned && !isDeleted && (
          <span className="text-xs text-primary-500 mt-1">📌 Pinned</span>
        )}

        <span className="inline-flex self-start text-[11px] leading-[15.47px] text-gray-500 items-center gap-x-1">
          Sent <span className="font-bold">{formattedTime}</span>
          {message.edited && !isDeleted && (
            <span className="text-gray-400 italic">(edited)</span>
          )}
        </span>
      </div>
    </article>
  )
}

const dummyConv: Conversation & { participantUsername: string } = {
  id: "conv-1",
  isGroup: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  participantIds: ["user-1", "user-2"],
  participantUsername: "Alice",
  isStarred: false,
  isPinned: false,
  isArchived: false,
  isSpam: false,
  isMuted: false,
  isTrashed: false,
  markedUnread: false,
  lastReadAt: null,
  messages: [],
}

export const ChatDefault = () => (
  <Chat
    conversation={dummyConv}
    currentUserId="user-1"
    onClick={() => console.log("Chat clicked")}
  />
)

export const ChatActive = () => (
  <Chat
    conversation={dummyConv}
    currentUserId="user-1"
    variant="active"
    onClick={() => console.log("Chat clicked")}
  />
)

// export const ChatDefault = () => {
//   return <Chat />
// }

// export const ChatActive = () => {
//   return <Chat variant="active" />
// }

export const BubbleWithPicture = () => {
  return (
    <div className="flex flex-col items-end gap-y-2">
      <div className="p-5 pt-2.5 rounded-xl bg-primary-25">
        <h3 className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          Me
          <span className="text-xs leading-[14.52px]">@uxguy297$</span>
        </h3>

        <div className="relative mt-2 h-[146.09px] rounded-lg border-primary-50 border-[4px] overflow-hidden">
          <Image
            className="object-cover"
            src="/dashboard.png"
            alt="Message"
            fill
          />
        </div>

        <div className="mt-3 flex items-center gap-x-2">
          <Download02 className="size-[15px] shrink-0" />
          <span className="text-sm leading-5 text-dark-blue-400 font-semibold">
            ai_screenshot.png <span className="font-normal">(2 MB)</span>
          </span>
        </div>
      </div>

      <span className="text-[11px] leading-[15.47px] text-gray-500">
        Sent
        <span className="font-semibold">12:01 AM</span>
      </span>
    </div>
  )
}

export const BubbleWithLink = () => {
  return (
    <div className="flex flex-col items-end gap-y-2">
      <div className="flex flex-col rounded-lg overflow-hidden border border-gray-200 bg-white">
        <div className="relative flex items-center justify-center h-[131px] p-2.5 bg-gray-100">
          <Image
            className="object-cover"
            src="/google-drive-01.png"
            alt="Google Drive"
            fill
          />
        </div>

        <div className="p-2 bg-gray-50 border-t border-gray-200 flex items-center gap-x-2 rounded-b-lg">
          <div className="size-7 inline-flex shrink-0 items-center justify-center bg-white border-gray-200 border rounded-full shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
            <GoogleDrive1Brand className="size-7" />
          </div>

          <div className="flex flex-col gap-y-px">
            <h1 className="text-xs leading-[14.52px] font-semibold text-dark-blue-400">
              Google Drive
            </h1>
            <span className="text-xs leading-[21.1px] text-dark-blue-400 line-clamp-1">
              https//drive.google.com
            </span>
          </div>
        </div>
      </div>

      <span className="text-[11px] leading-[15.47px] text-gray-500">
        Sent
        <span className="font-semibold">12:01 AM</span>
      </span>
    </div>
  )
}

export const BubbleWithLinkBlack = () => {
  return (
    <div className="flex flex-col items-end gap-y-2">
      <div className="flex flex-col rounded-lg overflow-hidden border border-gray-200 bg-white">
        <div className="relative flex items-center justify-center h-[131px] p-2.5 bg-gray-100">
          <Compass03 className="size-16 shrink-0 text-gray-300 stroke-[3px]" />
        </div>

        <div className="p-2 bg-gray-50 border-t border-gray-200 flex items-center gap-x-2 rounded-b-lg">
          <div className="size-7 inline-flex shrink-0 items-center justify-center bg-white border-gray-200 border rounded-full shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
            <GoogleDrive1Brand className="size-7" />
          </div>

          <div className="flex flex-col gap-y-px">
            <h1 className="text-xs leading-[14.52px] font-semibold text-dark-blue-400">
              Google Drive
            </h1>
            <span className="text-xs leading-[21.1px] text-dark-blue-400 line-clamp-1">
              https//drive.google.com
            </span>
          </div>
        </div>
      </div>

      <span className="text-[11px] leading-[15.47px] text-gray-500">
        Sent
        <span className="font-semibold">12:01 AM</span>
      </span>
    </div>
  )
}
