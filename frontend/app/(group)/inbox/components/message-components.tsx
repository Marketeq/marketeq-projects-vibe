"use client"

import { memo, useEffect, useState } from "react"
import { apiFetch } from "@/src/lib/api"
import { CurrentUser } from "@/utils/auth"
import { DataEmoji, EmojiProperties } from "@/utils/functions"
import { useOnlineUsers } from "@/utils/useOnlineUsers"
import {
  AlertCircle,
  Archive,
  Compass03,
  CornerUpLeft,
  DotsHorizontal,
  Download02,
  Edit03,
  EyeOff,
  HelpCircle,
  Pin02,
  Send03,
  Smile,
  Trash2,
  X,
} from "@blend-metrics/icons"
import { GoogleDrive1Brand } from "@blend-metrics/icons/brands"
import { format, isToday, isYesterday, parseISO } from "date-fns"
import Cookies from "js-cookie"
import { useIsomorphicLayoutEffect } from "react-use"
import { Message } from "@/types/message"
import { EmojiPicker } from "@/components/emoji-picker"
import { useEditContext } from "@/components/inbox-comps"
import {
  Avatar,
  AvatarFallback,
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

const getJwtToken = () => {
  if (typeof window === "undefined") return null
  return (
    Cookies.get("access_token") ||
    Cookies.get("accessToken") ||
    localStorage.getItem("token") ||
    null
  )
}

const dataEmojiToChar = (emoji: DataEmoji): string =>
  String.fromCodePoint(
    ...emoji[EmojiProperties.unified].split("-").map((hex) => parseInt(hex, 16))
  )

// Groups a message's reactions by emoji and returns [{ emoji, count, reactedByMe }].
const groupReactions = (
  reactions: Message["reactions"] | undefined,
  myId: string | undefined
) => {
  if (!reactions || reactions.length === 0) return []
  const by = new Map<string, { count: number; reactedByMe: boolean }>()
  for (const r of reactions) {
    const entry = by.get(r.emoji) ?? { count: 0, reactedByMe: false }
    entry.count += 1
    if (r.userId === myId) entry.reactedByMe = true
    by.set(r.emoji, entry)
  }
  return Array.from(by.entries()).map(([emoji, v]) => ({ emoji, ...v }))
}

const ReactionChips = ({
  reactions,
  myId,
  onToggle,
}: {
  reactions: Message["reactions"] | undefined
  myId: string | undefined
  onToggle?: (emoji: string) => void
}) => {
  const groups = groupReactions(reactions, myId)
  if (groups.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {groups.map((g) => (
        <button
          key={g.emoji}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggle?.(g.emoji)
          }}
          className={`inline-flex items-center gap-x-1 px-2 py-0.5 rounded-full border text-xs leading-4 transition-colors ${
            g.reactedByMe
              ? "bg-primary-50 border-primary-300 text-primary-700"
              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
          }`}
        >
          <span>{g.emoji}</span>
          <span className="text-[11px] font-medium">{g.count}</span>
        </button>
      ))}
    </div>
  )
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

const formatAttachmentSize = (bytes?: number | null) => {
  if (!bytes && bytes !== 0) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const toSafeHttpUrl = (value?: string | null): string | null => {
  if (!value) return null
  try {
    const parsed = /^https?:\/\//i.test(value)
      ? new URL(value)
      : value.startsWith("/")
        ? new URL(
            value,
            typeof window !== "undefined"
              ? window.location.origin
              : "https://localhost"
          )
        : null
    if (!parsed) return null
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
    return parsed.toString()
  } catch {
    return null
  }
}

export const MessageAttachmentView = ({
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
  const [imageBroken, setImageBroken] = useState(false)
  const safeAttachmentUrl = toSafeHttpUrl(attachment.fileUrl)
  const isImage = attachment.fileType?.startsWith("image/")
  if (isImage && safeAttachmentUrl && !imageBroken) {
    return (
      <div className="flex flex-col gap-y-1">
        {/* Image preview frame matches storybook's `BubbleWithPicture`:
            fixed 146.09px height, 4px primary-50 border, rounded-lg corners,
            with the actual image filling via object-cover. */}
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="relative mt-2 h-[146.09px] w-[300px] max-w-full rounded-lg border-primary-50 border-[4px] overflow-hidden focus-visible:outline-none cursor-zoom-in transition hover:opacity-95"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={safeAttachmentUrl}
            alt={attachment.fileName || "image"}
            className="size-full object-cover"
            onError={() => setImageBroken(true)}
          />
        </button>
        {attachment.fileName && (
          <p className="mt-3 flex items-center gap-x-2 text-sm">
            <Download02 className="size-[15px] shrink-0 text-dark-blue-400" />
            <span
              className="leading-5 text-dark-blue-400 font-semibold"
              title={attachment.fileName}
            >
              {truncateFilenameMiddle(attachment.fileName)}
              {attachment.fileSize ? (
                <span className="font-normal">
                  {" "}
                  ({formatAttachmentSize(attachment.fileSize)})
                </span>
              ) : null}
            </span>
          </p>
        )}
        <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
          <DialogContent
            className="max-w-none w-auto rounded-none bg-transparent p-0 shadow-none"
            accessibilityTitle={attachment.fileName || "Image preview"}
          >
            <div className="relative flex items-center justify-center">
              <img
                src={safeAttachmentUrl}
                alt={attachment.fileName || "image"}
                className="max-h-[92vh] max-w-[92vw] rounded-md object-contain"
              />
              <div className="absolute right-3 top-3 flex items-center gap-x-2">
                <a
                  href={safeAttachmentUrl}
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
  if (!safeAttachmentUrl) {
    return (
      <span className="inline-flex items-center gap-x-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500 max-w-[300px]">
        <Download02 className="size-4 shrink-0 text-gray-400" />
        <span className="truncate">
          {attachment.fileName || "Attachment unavailable"}
        </span>
      </span>
    )
  }
  return (
    <a
      href={safeAttachmentUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-x-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 hover:border-gray-300 max-w-[300px]"
    >
      <Download02 className="size-4 shrink-0 text-gray-500" />
      <span className="truncate" title={attachment.fileName || "Attachment"}>
        {attachment.fileName
          ? truncateFilenameMiddle(attachment.fileName)
          : "Attachment"}
      </span>
      {attachment.fileSize ? (
        <span className="text-gray-400">
          {formatAttachmentSize(attachment.fileSize)}
        </span>
      ) : null}
    </a>
  )
}

// URL extractor for in-message links + per-URL preview card. The card
// reuses the `BubbleWithLink` / `BubbleWithLinkBlack` layout (this file)
// so chat bubbles get a rich preview when a URL is sent — same shape
// as the Search Results link card.
const MESSAGE_URL_REGEX = /https?:\/\/[^\s<>"]+/g
const extractMessageUrls = (text: string | null | undefined): string[] =>
  text ? (text.match(MESSAGE_URL_REGEX) ?? []) : []

const LinkifiedText = ({ text }: { text: string | null | undefined }) => {
  if (!text) return null
  const parts: Array<{ type: "text" | "url"; value: string; key: string }> = []
  let lastIdx = 0
  let i = 0
  for (const m of text.matchAll(MESSAGE_URL_REGEX)) {
    const idx = m.index ?? 0
    if (idx > lastIdx) {
      parts.push({
        type: "text",
        value: text.slice(lastIdx, idx),
        key: `t${i++}`,
      })
    }
    parts.push({ type: "url", value: m[0], key: `u${i++}` })
    lastIdx = idx + m[0].length
  }
  if (lastIdx < text.length) {
    parts.push({ type: "text", value: text.slice(lastIdx), key: `t${i++}` })
  }
  return (
    <>
      {parts.map((p) =>
        p.type === "text" ? (
          <span key={p.key}>{p.value}</span>
        ) : (
          <a
            key={p.key}
            href={p.value}
            target="_blank"
            rel="noreferrer"
            title={p.value}
            onClick={(e) => e.stopPropagation()}
            className="inline-block align-bottom max-w-[220px] truncate underline"
          >
            {p.value}
          </a>
        )
      )}
    </>
  )
}

const MessageLinkCard = memo(function MessageLinkCard({
  url,
}: {
  url: string
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const isImageUrl = /\.(png|jpe?g|gif|webp|svg|bmp|ico)(\?|#|$)/i.test(url)
  const isDrive = /drive\.google\.com/.test(url)
  const hostName = (() => {
    try {
      return new URL(url).host
    } catch {
      return url
    }
  })()
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block w-full max-w-[280px] min-w-0"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col w-full min-w-0 rounded-lg overflow-hidden border border-gray-200 bg-white hover:border-gray-300 transition">
        <div className="relative flex items-center justify-center h-[131px] p-2.5 bg-gray-100 overflow-hidden min-w-0">
          {isImageUrl && !imgFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt=""
              className="size-full min-w-0 object-cover"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <Compass03 className="size-16 shrink-0 text-gray-300 stroke-[3px]" />
          )}
        </div>
        <div className="p-2 bg-gray-50 border-t border-gray-200 flex items-center gap-x-2 rounded-b-lg min-w-0 overflow-hidden">
          <div className="size-7 inline-flex shrink-0 items-center justify-center bg-white border-gray-200 border rounded-full shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
            {isDrive ? (
              <GoogleDrive1Brand className="size-7" />
            ) : (
              <Compass03 className="size-4 text-gray-400" />
            )}
          </div>
          <div className="flex flex-col gap-y-px min-w-0 flex-1">
            <h3 className="text-xs leading-[14.52px] font-semibold text-dark-blue-400 truncate">
              {isDrive ? "Google Drive" : hostName}
            </h3>
            <span className="text-xs leading-[21.1px] text-dark-blue-400 line-clamp-1">
              {url}
            </span>
          </div>
        </div>
      </div>
    </a>
  )
})

const BubbleImpl = ({
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
  onToggleReaction,
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
  onToggleReaction?: (messageId: string, emoji: string) => void
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
    ? currentUser.username
      ? "@" + currentUser.username
      : ""
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
    const incomingDeletedAt = (message as any).deletedAt as number | undefined
    if (incomingDeletedAt && !deletedAt) setDeletedAt(incomingDeletedAt)
  }, [message.isDeleted, (message as any).deletedAt])

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

      await apiFetch<{ message: string }>(`/v1/messages/${message.id}/pin`, {
        method: "POST",
        headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {},
      })
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
    <article className="group flex flex-col items-start gap-y-2 min-w-0 max-w-[calc(100%-60px)] md:max-w-[640px]">
      <div className="p-5 pt-2.5 min-w-0 w-full rounded-xl flex flex-col gap-y-2 bg-primary-500/[.04]">
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
                actionMenuOpen
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              }`}
            >
              <button
                className="size-7 inline-flex rounded-full focus-visible:outline-none text-gray-400 hover:bg-primary-50 hover:text-dark-blue-400 justify-center items-center shrink-0"
                onClick={() => onReply?.(message)}
              >
                <CornerUpLeft className="size-4" />
              </button>
              <EmojiPicker
                side="top"
                align="end"
                onEmojiSelect={(emoji) =>
                  onToggleReaction?.(message.id, dataEmojiToChar(emoji))
                }
              >
                <button className="size-7 inline-flex rounded-full focus-visible:outline-none text-gray-400 hover:bg-primary-50 hover:text-dark-blue-400 justify-center items-center shrink-0">
                  <Smile className="size-4" />
                </button>
              </EmojiPicker>

              <DropdownMenu
                open={actionMenuOpen}
                onOpenChange={setActionMenuOpen}
              >
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
                    <Pin02 className="h-4 w-4" /> {isPinned ? "Unpin" : "Pin"}
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

        {message.replyToMessageId && !isDeleted && (
          <div className="border-l-2 border-primary-300 pl-3 py-1 mb-1 rounded-r bg-primary-50/50">
            <p className="text-xs font-semibold text-primary-600">
              Replying to{" "}
              {replyToMessage
                ? replyToMessage.senderId === currentUser.id
                  ? "yourself"
                  : participantName || participantUsername || "Unknown"
                : "a message"}
            </p>
            <p className="text-xs text-gray-500 line-clamp-2 italic">
              {!replyToMessage || (replyToMessage as any).isDeleted
                ? "Original message no longer available"
                : replyToMessage.content || "Encrypted message"}
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
        ) : message.messageType === "gif" && value ? (
          <img
            src={value}
            alt="GIF"
            className="rounded-md w-60 h-auto max-h-80"
          />
        ) : (
          <span className="text-sm leading-[16.94px] text-dark-blue-400 whitespace-pre-line break-words [overflow-wrap:anywhere]">
            <LinkifiedText text={value} />
          </span>
        )}
        {!isDeleted &&
          message.messageType !== "gif" &&
          extractMessageUrls(value).map((url) => (
            <MessageLinkCard key={url} url={url} />
          ))}
        {!isDeleted && (
          <ReactionChips
            reactions={message.reactions}
            myId={currentUser.id}
            onToggle={(emoji) => onToggleReaction?.(message.id, emoji)}
          />
        )}
      </div>

      <span className="inline-flex self-end text-[11px] leading-[15.47px] text-gray-500 items-center gap-x-1">
        {isPinned && !isDeleted && (
          <Pin02 className="size-3 fill-current shrink-0" />
        )}
        {message.status === "read" && !isDeleted ? <>Seen</> : <>Sent</>}{" "}
        <span className="font-bold">{formattedTime}</span>
        {message.edited && !isDeleted && (
          <span className="text-gray-400 italic">(edited)</span>
        )}
      </span>
    </article>
  )
}

export const Bubble = memo(BubbleImpl)
Bubble.displayName = "Bubble"

const YourBubbleImpl = ({
  message,
  currentUser,
  participantUsername,
  participantName,
  participantAvatarUrl,
  onForward,
  onReply,
  replyToMessage,
  onToggleReaction,
  onAddToRecentQuestions,
}: {
  message: Message
  currentUser: CurrentUser
  participantUsername?: string
  participantName?: string
  participantAvatarUrl?: string
  onForward?: (message: Message) => void
  onReply?: (message: Message) => void
  replyToMessage?: Message | null
  onToggleReaction?: (messageId: string, emoji: string) => void
  onAddToRecentQuestions?: (message: Message) => void
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

      await apiFetch<{ message: string }>(`/v1/messages/${message.id}/pin`, {
        method: "POST",
        headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {},
      })
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
    ? currentUser.username
      ? "@" + currentUser.username
      : ""
    : participantUsername
      ? "@" + participantUsername
      : ""

  // Format timestamp
  const formattedTime = formatConversationDate(message.createdAt)

  // Drive the receiver-bubble avatar dot off real global presence instead of
  // the previously-hardcoded `isOnline` (which made every received bubble
  // show a green dot regardless of the sender's actual status).
  const { isOnline: isUserOnline } = useOnlineUsers()

  return (
    <article className="flex items-end gap-x-2 min-w-0 max-w-[calc(100%-60px)] md:max-w-[680px]">
      <Avatar
        size="md"
        className="hover:ring-0 active:ring-primary-100 shrink-0"
        isOnline={isUserOnline(message.senderId)}
      >
        <AvatarImage
          src={participantAvatarUrl || undefined}
          alt={participantName || "User"}
        />
        <AvatarFallback>
          {(participantName || "U").charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="group flex flex-col items-start gap-y-2 min-w-0 flex-1">
        <div className="p-5 pt-2.5 min-w-0 w-full rounded-xl flex flex-col gap-y-2 bg-primary-500/[.04]">
          <div className="flex items-end justify-between">
            <h3 className="text-sm leading-[16.8px] font-bold text-dark-blue-400">
              {senderName}{" "}
              <span className="text-xs leading-[14.52px] font-normal">
                {senderUsername}
              </span>
            </h3>

            <div
              className={`inline-flex transition duration-300 items-center gap-x-0.5 ${
                actionMenuOpen
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              }`}
            >
              <button
                className="size-7 inline-flex rounded-full focus-visible:outline-none text-gray-400 hover:bg-primary-50 hover:text-dark-blue-400 justify-center items-center shrink-0"
                onClick={() => onReply?.(message)}
              >
                <CornerUpLeft className="size-4" />
              </button>
              <EmojiPicker
                side="top"
                align="start"
                onEmojiSelect={(emoji) =>
                  onToggleReaction?.(message.id, dataEmojiToChar(emoji))
                }
              >
                <button className="size-7 inline-flex rounded-full focus-visible:outline-none text-gray-400 hover:bg-primary-50 hover:text-dark-blue-400 justify-center items-center shrink-0">
                  <Smile className="size-4" />
                </button>
              </EmojiPicker>

              <DropdownMenu
                open={actionMenuOpen}
                onOpenChange={setActionMenuOpen}
              >
                <DropdownMenuTrigger className="size-7 inline-flex rounded-full focus-visible:outline-none text-gray-400 hover:bg-primary-50 hover:text-dark-blue-400 justify-center items-center shrink-0">
                  <DotsHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="bottom"
                  align="end"
                  className="min-w-0 w-auto"
                >
                  <DropdownMenuItem onSelect={handlePinMessage}>
                    <Pin02 className="h-4 w-4" /> {isPinned ? "Unpin" : "Pin"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onForward?.(message)}>
                    <Send03 className="h-4 w-4" /> Forward
                  </DropdownMenuItem>
                  {onAddToRecentQuestions && (
                    <DropdownMenuItem
                      onSelect={() => onAddToRecentQuestions(message)}
                    >
                      <HelpCircle className="h-4 w-4" /> Add to Recent Questions
                    </DropdownMenuItem>
                  )}
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

          {message.replyToMessageId && !isDeleted && (
            <div className="border-l-2 border-primary-300 pl-3 py-1 mb-1 rounded-r bg-primary-50/50">
              <p className="text-xs font-semibold text-primary-600">
                Replying to{" "}
                {replyToMessage
                  ? replyToMessage.senderId === currentUser.id
                    ? "yourself"
                    : participantName || participantUsername || "Unknown"
                  : "a message"}
              </p>
              <p className="text-xs text-gray-500 line-clamp-2 italic">
                {!replyToMessage || (replyToMessage as any).isDeleted
                  ? "Original message no longer available"
                  : replyToMessage.content || "Encrypted message"}
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
          ) : message.messageType === "gif" && value ? (
            <img
              src={value}
              alt="GIF"
              className="rounded-md w-60 h-auto max-h-80"
            />
          ) : (
            <span className="text-sm leading-[16.94px] text-dark-blue-400 whitespace-pre-line break-words [overflow-wrap:anywhere]">
              <LinkifiedText text={value} />
            </span>
          )}
          {!isDeleted &&
            message.messageType !== "gif" &&
            extractMessageUrls(value).map((url) => (
              <MessageLinkCard key={url} url={url} />
            ))}
          {!isDeleted && (
            <ReactionChips
              reactions={message.reactions}
              myId={currentUser.id}
              onToggle={(emoji) => onToggleReaction?.(message.id, emoji)}
            />
          )}
        </div>

        <span className="inline-flex self-start text-[11px] leading-[15.47px] text-gray-500 items-center gap-x-1">
          {isPinned && !isDeleted && (
            <Pin02 className="size-3 fill-current shrink-0" />
          )}
          Sent <span className="font-bold">{formattedTime}</span>
          {message.edited && !isDeleted && (
            <span className="text-gray-400 italic">(edited)</span>
          )}
        </span>
      </div>
    </article>
  )
}

export const YourBubble = memo(YourBubbleImpl)
YourBubble.displayName = "YourBubble"

// ---------------------------------------------------------------------------
// Search result rows (per Figma: "Inbox - Search Results - All Messages
// Panel States"). One component per section so left-sidebar can compose
// them without inlining JSX.
// ---------------------------------------------------------------------------

const SearchPeopleRowImpl = ({
  name,
  avatarUrl,
  onClick,
}: {
  name: string
  /** Accepted for API compatibility with `SearchPeopleResult` but not
   * rendered — Figma's People search row shows the display name only. */
  username?: string
  avatarUrl?: string
  onClick: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-x-3 px-4 py-2 w-full text-left hover:bg-gray-100"
  >
    <Avatar size="md" className="shrink-0">
      <AvatarImage src={avatarUrl || undefined} alt={name} />
      <AvatarFallback>{(name || "U").charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
    <div className="flex flex-col min-w-0">
      <span className="text-[13px] text-gray-700 truncate">{name}</span>
    </div>
  </button>
)

export const SearchPeopleRow = memo(SearchPeopleRowImpl)
SearchPeopleRow.displayName = "SearchPeopleRow"

const SearchMessageRowImpl = ({
  participantName,
  participantAvatarUrl,
  snippet,
  date,
  onClick,
}: {
  participantName: string
  participantAvatarUrl?: string
  snippet: string
  date: string
  onClick: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-start gap-x-3 px-4 py-3 w-full text-left hover:bg-gray-100 border-b border-gray-100"
  >
    <Avatar size="md" className="shrink-0">
      <AvatarImage
        src={participantAvatarUrl || undefined}
        alt={participantName}
      />
      <AvatarFallback>
        {(participantName || "U").charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <div className="flex flex-col min-w-0 flex-1 gap-y-0.5">
      <div className="flex items-center justify-between gap-x-2">
        <span className="text-[13px] text-gray-700 truncate">
          {participantName}
        </span>
        <span className="text-[11px] text-gray-600 shrink-0">{date}</span>
      </div>
      <span className="text-[11px] text-gray-600 line-clamp-2 break-words [overflow-wrap:anywhere]">
        {snippet}
      </span>
    </div>
  </button>
)

export const SearchMessageRow = memo(SearchMessageRowImpl)
SearchMessageRow.displayName = "SearchMessageRow"

const SearchLinkRowImpl = ({
  url,
  title,
  senderName,
  date,
  onClick,
}: {
  url: string
  title?: string
  senderName?: string
  date?: string
  onClick: () => void
}) => {
  const isDrive = /drive\.google\.com/.test(url)
  // URL points at an image (file extension match, with optional querystring
  // or anchor) — render the actual thumbnail in the preview area; otherwise
  // the preview area sits empty as a light-gray placeholder, matching the
  // Figma `Search Results - All Messages Panel States` sidebar variants.
  const isImageUrl = /\.(png|jpe?g|gif|webp|svg|bmp|ico)(\?|#|$)/i.test(url)
  const [imgFailed, setImgFailed] = useState(false)
  const hostName = (() => {
    try {
      return new URL(url).host
    } catch {
      return url
    }
  })()
  // Card layout (image preview on top + small icon-chip row with title + URL
  // below) is reused from `BubbleWithLink` / `BubbleWithLinkBlack` in this
  // same file. Same Tailwind classes (h-[131px], leading-[14.52px],
  // leading-[21.1px], the inset shadow on the icon chip) — nothing new.
  return (
    <div className="px-4 pt-2 pb-2 border-b border-gray-100">
      {(senderName || date) && (
        <div className="flex items-center justify-between gap-x-2 pb-1">
          <span className="text-xs text-gray-900 truncate">
            {senderName || ""}
          </span>
          {date && (
            <span className="text-[11px] text-gray-600 shrink-0">{date}</span>
          )}
        </div>
      )}
      {/* `min-w-0` on the button is critical: a <button> element gets
          `min-width: min-content` by default in browsers, and with a long
          unbreakable URL string inside, `min-content` becomes the full URL
          width — pushing the card past the 322px sidebar so it overflows
          horizontally. min-w-0 lets the button shrink so truncate works. */}
      <button
        type="button"
        onClick={onClick}
        className="block w-full min-w-0 text-left"
      >
        <div className="flex flex-col w-full min-w-0 rounded-lg overflow-hidden border border-gray-200 bg-white hover:border-gray-300 transition">
          {/* `min-w-0` on the preview area + `min-w-0` on the <img> are
              critical: an <img>'s default min-size in a flex container is
              its intrinsic pixel width, so a 1200px wide tenor GIF
              forces the whole card past the 322px sidebar even with
              w-full + overflow-hidden. min-w-0 lets the image shrink. */}
          <div className="relative flex items-center justify-center h-[131px] p-2.5 bg-gray-100 overflow-hidden min-w-0">
            {isImageUrl && !imgFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt=""
                className="size-full min-w-0 object-cover"
                onError={() => setImgFailed(true)}
              />
            ) : (
              // Same placeholder shape as `BubbleWithLinkBlack` in this file:
              // a centered Compass icon fills the otherwise-empty preview
              // area when the URL has no image.
              <Compass03 className="size-16 shrink-0 text-gray-300 stroke-[3px]" />
            )}
          </div>
          <div className="p-2 bg-gray-50 border-t border-gray-200 flex items-center gap-x-2 rounded-b-lg min-w-0 overflow-hidden">
            <div className="size-7 inline-flex shrink-0 items-center justify-center bg-white border-gray-200 border rounded-full shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
              {isDrive ? (
                <GoogleDrive1Brand className="size-7" />
              ) : (
                <Compass03 className="size-4 text-gray-400" />
              )}
            </div>
            <div className="flex flex-col gap-y-px min-w-0 flex-1">
              <h3 className="text-xs leading-[14.52px] text-gray-700 truncate">
                {title || (isDrive ? "Google Drive" : hostName)}
              </h3>
              <span className="text-xs leading-[21.1px] text-dark-blue-400 line-clamp-1">
                {url}
              </span>
            </div>
          </div>
        </div>
      </button>
    </div>
  )
}

export const SearchLinkRow = memo(SearchLinkRowImpl)
SearchLinkRow.displayName = "SearchLinkRow"

// Mid-string ellipsis that preserves the file extension so users can still
// tell .docx from .png at a glance even after truncation.
//   UncertaintyPropagation-Pilot Study.docx (39) → Uncertainty…Study.docx (22)
export function truncateFilenameMiddle(name: string, max = 28): string {
  if (name.length <= max) return name
  const dot = name.lastIndexOf(".")
  if (dot < 0 || name.length - dot > 6) {
    return name.slice(0, max - 1) + "…"
  }
  const ext = name.slice(dot)
  const headBudget = max - ext.length - 1
  if (headBudget <= 1) return "…" + ext
  return name.slice(0, headBudget) + "…" + ext
}

const SearchFileRowImpl = ({
  fileName,
  fileSize,
  fileType,
  fileUrl,
  senderName,
  date,
  onClick,
}: {
  fileName: string
  fileSize?: number | null
  fileType?: string
  fileUrl?: string
  senderName?: string
  date?: string
  onClick: () => void
}) => {
  const isImage = fileType?.startsWith("image/")
  const safeFileUrl = toSafeHttpUrl(fileUrl)
  const ext = fileName.includes(".")
    ? fileName.split(".").pop()?.slice(0, 4).toUpperCase()
    : "FILE"
  // Fall back to the EXT text if the image URL fails to load (R2 signed-URL
  // expiry, CORS, network) instead of showing a broken-image icon.
  const [imgFailed, setImgFailed] = useState(false)
  return (
    <div className="px-4 pt-2 pb-1 border-b border-gray-100">
      {(senderName || date) && (
        <div className="flex items-center justify-between gap-x-2 pb-1">
          <span className="text-xs text-gray-900 truncate">
            {senderName || ""}
          </span>
          {date && (
            <span className="text-[11px] text-gray-600 shrink-0">{date}</span>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-x-3 p-2 w-full text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition"
      >
        {isImage && safeFileUrl && !imgFailed ? (
          <div className="w-20 h-16 shrink-0 rounded border border-gray-200 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={safeFileUrl}
              alt={fileName}
              className="size-full min-w-0 object-cover"
              onError={() => setImgFailed(true)}
            />
          </div>
        ) : (
          <div className="w-20 h-16 shrink-0 rounded border border-gray-200 bg-gray-50 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-500">{ext}</span>
          </div>
        )}
        <div className="flex flex-col min-w-0 flex-1 gap-y-0.5">
          <span className="text-[13px] text-gray-700 truncate" title={fileName}>
            {truncateFilenameMiddle(fileName)}
          </span>
          {fileSize != null && (
            <span className="text-[11px] text-gray-500">
              {formatAttachmentSize(fileSize)}
            </span>
          )}
        </div>
      </button>
    </div>
  )
}

export const SearchFileRow = memo(SearchFileRowImpl)
SearchFileRow.displayName = "SearchFileRow"
