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

const getJwtToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("token") : null

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
      `/api/messaging/messages/${messageId}/pin`,
      {
        method: "POST",
        headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {},
      }
    )
  } catch (err) {
    console.error("Failed to pin message:", err)
  }
}

export const Bubble = ({
  message,
  currentUser,
  participantUsername,
}: {
  message: Message
  currentUser: CurrentUser
  participantUsername?: string
}) => {
  const [value, setValue] = useState(message.content)
  const { onChatChange, chat, isSaved, onUnsave } = useEditContext()
  const [isPinned, setIsPinned] = useState(!!message.isPinned)
  const [isDeleted, setIsDeleted] = useState(!!message.isDeleted)
  const [deletedAt, setDeletedAt] = useState<number | null>(null)
  const [showUndo, setShowUndo] = useState(false)

  // Determine sender name
  const isMe = message.senderId === currentUser.id
  const senderName = isMe ? "You" : participantUsername || "Unknown"
  const senderUsername = isMe
    ? "@" + currentUser.username
    : "@" + participantUsername

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
        `/api/messaging/messages/${message.id}/pin`,
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
      await apiFetch(`/api/messaging/messages/${message.id}/delete`, {
        method: "PATCH",
        headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {},
      })
    } catch (err) {
      console.error("Failed to delete message:", err)
      setIsDeleted(false) // revert if failed
    }
  }

  const handleRestoreMessage = async () => {
    const jwtToken = getJwtToken()
    try {
      setIsDeleted(false) // Optimistic UI
      await apiFetch(`/api/messaging/messages/${message.id}/undo-delete`, {
        method: "PATCH",
        headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {},
      })
    } catch (err) {
      console.error("Failed to restore message:", err)
      setIsDeleted(true) // revert if failed
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
            <div className="inline-flex transition duration-300 opacity-0 group-hover:opacity-100 items-center gap-x-0.5">
              <button className="size-7 inline-flex rounded-full focus-visible:outline-none text-gray-400 hover:bg-primary-50 hover:text-dark-blue-400 justify-center items-center shrink-0">
                <CornerUpLeft className="size-4" />
              </button>
              <button className="size-7 inline-flex rounded-full focus-visible:outline-none text-gray-400 hover:bg-primary-50 hover:text-dark-blue-400 justify-center items-center shrink-0">
                <Smile className="size-4" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger className="size-7 inline-flex rounded-full focus-visible:outline-none text-gray-400 hover:bg-primary-50 hover:text-dark-blue-400 justify-center items-center shrink-0">
                  <DotsHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="bottom"
                  align="start"
                  className="min-w-[142px]"
                >
                  <DropdownMenuItem>
                    {/* //onSelect={() => onChatChange(value)}> */}
                    <Edit03 className="h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handlePinMessage}>
                    <Edit03 className="h-4 w-4" /> {isPinned ? "Unpin" : "Pin"}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
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
}: {
  message: Message
  currentUser: CurrentUser
  participantUsername?: string
}) => {
  const [isPinned, setIsPinned] = useState(!!message.isPinned)
  const [isDeleted, setIsDeleted] = useState(!!message.isDeleted)
  const [value, setValue] = useState(message.content)

  useEffect(() => {
    setIsDeleted(!!message.isDeleted)
  }, [message.isDeleted])

  useEffect(() => {
    setIsPinned(!!message.isPinned)
  }, [message.isPinned])

  const handlePinMessage = async () => {
    const jwtToken = getJwtToken()
    try {
      // Optimistic UI
      setIsPinned((prev) => !prev)

      await apiFetch<{ message: string }>(
        `/api/messaging/messages/${message.id}/pin`,
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
  const senderName = isMe ? "You" : participantUsername || "Unknown"
  const senderUsername = isMe
    ? "@" + currentUser.username
    : "@" + participantUsername

  // Format timestamp
  const formattedTime = formatConversationDate(message.createdAt)

  return (
    <article className="inline-flex items-end gap-x-2">
      <Avatar
        size="md"
        className="hover:ring-0 active:ring-primary-100"
        isOnline
      >
        <AvatarImage src="/man.jpg" alt="Man" />
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

            <div className="inline-flex transition duration-300 opacity-0 group-hover:opacity-100 items-center gap-x-0.5">
              <button className="size-7 inline-flex rounded-full focus-visible:outline-none text-gray-400 hover:bg-primary-50 hover:text-dark-blue-400 justify-center items-center shrink-0">
                <CornerUpLeft className="size-4" />
              </button>
              <button className="size-7 inline-flex rounded-full focus-visible:outline-none text-gray-400 hover:bg-primary-50 hover:text-dark-blue-400 justify-center items-center shrink-0">
                <Smile className="size-4" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger className="size-7 inline-flex rounded-full focus-visible:outline-none text-gray-400 hover:bg-primary-50 hover:text-dark-blue-400 justify-center items-center shrink-0">
                  <DotsHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="bottom"
                  align="start"
                  className="min-w-[142px]"
                >
                  <DropdownMenuItem>
                    <Edit03 className="h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handlePinMessage}>
                    <Edit03 className="h-4 w-4" /> {isPinned ? "Unpin" : "Pin"}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Send03 className="h-4 w-4" /> Forward
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem visual="destructive">
                    <Trash2 className="h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* <span className="text-sm leading-[16.94px] text-dark-blue-400">
            {message.content}
          </span> */}

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
  participants: [
    {
      conversationId: "conv-1",
      userId: "user-1",
      joinedAt: new Date().toISOString(),
    },
    {
      conversationId: "conv-1",
      userId: "user-2",
      joinedAt: new Date().toISOString(),
    },
  ],
  participantUsername: "Alice",
  isStarred: false,
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
