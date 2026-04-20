"use client"

import { useState } from "react"
import { apiFetch } from "@/src/lib/api"
import { cn } from "@/utils/functions"
import { useControllableState, useUncontrolledState } from "@/utils/hooks"
import { createContext } from "@/utils/react-utils"
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  EyeOff,
  MoreHorizontal,
  Pin02,
  Trash2,
} from "@blend-metrics/icons"
import { CheckedState } from "@radix-ui/react-checkbox"
import { cva } from "class-variance-authority"
import { format, isToday, isYesterday, parseISO } from "date-fns"
import { useToggle } from "react-use"
import { Conversation } from "@/types/conversation"
import {
  Avatar,
  AvatarFallbackIcon,
  AvatarImage,
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Favorite,
  FavoriteRoot,
  IconButton,
} from "@/components/ui"

const chatVariants = cva(
  "group/chat relative cursor-pointer flex items-start gap-x-2 pl-3.5 hover:bg-gray-100 data-[state=active]:bg-primary-50 hover:data-[state=active]:bg-primary-100"
)

const formatConversationDate = (isoDateStr: string) => {
  const date = parseISO(isoDateStr)

  if (isToday(date)) return "Today"
  if (isYesterday(date)) return "Yesterday"

  return format(date, "MMM dd") // e.g., "Jun 23"
}

interface ChatProps {
  conversation: Conversation
  currentUserId: string
  onClick: () => void
  className?: string
  variant?: "default" | "active"
  pinned?: boolean
  onPinnedChange?: (value: boolean) => void
  starred?: boolean
  onStarredChange?: (value: boolean) => void
  onMarkUnread?: () => void
  onArchive?: () => void
  onSpam?: () => void
  onTrash?: () => void
  onCheckedChange?: (convId: string, checked: boolean) => void
  checked?: boolean
}
export const [ChatsContextProvider, useChatsContext] = createContext<{
  pinnedChats: number
  setPinnedChats?: (n: number) => void
  onChatPinned: (pinned: boolean) => void
  onChatChecked: (checked: boolean) => void
  resetCheckedChats?: () => void
  showPinnedIcon: boolean
  toggleShowPinnedIcon: () => void
  checkedChats: number
}>({
  displayName: "ChatsContext",
})

interface UserDetailProps {
  name?: string
  className?: string
  variant?: "default" | "active"
  pinned?: boolean
  onPinnedChange?: (value: boolean) => void
  starred?: boolean
  onStarredChange?: (value: boolean) => void
  onMarkUnread?: () => void
  onArchive?: () => void
  onSpam?: () => void
  onTrash?: () => void
  onCheckedChange?: (convId: string, checked: boolean) => void
  checked?: boolean
  conversation: Conversation
  onClick?: () => void
}

export const UserDetail = ({
  conversation,
  className,
  variant = "default",
  pinned,
  onPinnedChange,
  starred,
  onStarredChange,
  onMarkUnread,
  onArchive,
  onSpam,
  onTrash,
  onCheckedChange,
  checked: checkedProp,
}: UserDetailProps) => {
  const { onChatPinned, showPinnedIcon, onChatChecked, checkedChats } =
    useChatsContext()

  //jwt token
  const jwtToken = (() => {
    if (typeof window === "undefined") return null
    const Cookies = require("js-cookie")
    return Cookies.get("access_token") || Cookies.get("accessToken") || localStorage.getItem("token") || null
  })()

  const [isPinned, setIsPinned] = useControllableState({
    defaultValue: false,
    value: pinned,
    onChange: async (value) => {
      onPinnedChange?.(value)
      onChatPinned(value)

      try {
        await apiFetch<unknown>(
          `/v1/threads/${conversation.id}/pin`,
          {
            method: value ? "POST" : "DELETE",
            headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {},
          }
        )
      } catch (err) {
        console.error("Failed to toggle pin on server", err)

        // Revert UI if server failed
        const reverted = !value
        setIsPinned(reverted)
        onPinnedChange?.(reverted)
        onChatPinned(reverted)
      }
    },
  })
  const [selected, setSelected] = useControllableState<CheckedState>({
    defaultValue: false,
    value: checkedProp,
    onChange: (value) => {
      if (typeof value === "boolean") {
        onChatChecked(value)
        onCheckedChange?.(conversation.id, value)
      }
    },
  })
  const [open, toggle] = useToggle(false)
  const showCheckbox = checkedChats > 0

  return (
    <article className={cn(chatVariants({ className }), conversation.markedUnread && "bg-primary-25")} data-state={variant}>
      <div className="pt-3.5 group">
        <Avatar
          size="md"
          className="hover:ring-0 active:ring-primary-100"
          isOnline
          containerClassName={cn(
            "group-hover:hidden",
            showCheckbox && "hidden"
          )}
        >
          <AvatarImage
            src={(conversation as any).participantAvatarUrl || undefined}
            alt={conversation.participantUsername || "User"}
          />
          <AvatarFallbackIcon />
        </Avatar>
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "size-10 rounded-full bg-white group-hover:inline-flex shrink-0 justify-center items-center hidden",
            showCheckbox && "inline-flex"
          )}
        >
          <Checkbox
            size="md"
            onCheckedChange={setSelected}
            checked={selected}
          />
        </div>
      </div>
      <div className="pr-3.5 flex flex-col flex-auto gap-y-0.5 items-start py-[18px] border-b border-gray-200 relative">
        <div className="flex self-stretch items-center justify-between">
          <h3 className={cn(
            "group-data-[state=active]/chat:font-bold text-[13px] leading-[18.88px] text-dark-blue-400",
            conversation.markedUnread ? "font-semibold group-hover/chat:font-bold" : "font-medium"
          )}>
            {conversation.participantUsername || "Unknown"}
          </h3>

          <span className={cn(
            "transition duration-300 group-data-[state=active]/chat:font-bold group-hover/chat:opacity-0 opacity-100 text-xs leading-[14.52px] text-dark-blue-400",
            conversation.markedUnread ? "font-semibold" : "font-medium"
          )}>
            {formatConversationDate(conversation.createdAt)}
          </span>

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="absolute top-[13.73px] right-[15px] size-[27px] hidden group-hover/chat:inline-flex data-[state=open]:inline-flex justify-center items-center focus-visible:outline-none text-gray-500 transition-opacity duration-300 group-hover/chat:opacity-100 data-[state=open]:opacity-100 opacity-0 rounded-full hover:text-dark-blue-500 hover:bg-primary-50"
              >
                <MoreHorizontal className="size-[15px]" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              onClick={(e) => e.stopPropagation()}
              className="min-w-[142px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-100"
              align="end"
              side="bottom"
              sideOffset={4}
              avoidCollisions={false}
            >
              <DropdownMenuItem onSelect={() => onMarkUnread?.()}>
                <EyeOff className="h-4 w-4" /> {conversation.markedUnread ? "Mark as Read" : "Mark Unread"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onSpam?.()}>
                <AlertCircle className="h-4 w-4" /> {conversation.isSpam ? "Move to Inbox" : "Move to Spam"}
              </DropdownMenuItem>

              <DropdownMenuItem onSelect={() => setIsPinned((prev) => !prev)}>
                <Pin02 className="h-4 w-4" /> {isPinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>

              <DropdownMenuItem onSelect={() => onArchive?.()}>
                <Archive className="h-4 w-4" /> {conversation.isArchived ? "Unarchive" : "Archive"}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <AlertTriangle className="h-4 w-4" /> Block / Report
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                visual={conversation.isTrashed ? undefined : "destructive"}
                onSelect={() => conversation.isTrashed ? onTrash?.() : toggle()}
              >
                <Trash2 className="h-4 w-4" /> {conversation.isTrashed ? "Restore" : "Delete Chat"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={open} onOpenChange={toggle}>
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
                <Button onClick={() => { onTrash?.(); toggle() }}>Yes, Delete</Button>
              </div>
            </DialogContent>
          </Dialog>

          {isPinned && (
            <Pin02 className="size-4 absolute shrink-0 text-primary-500 fill-primary-500 top-[3px] right-1" />
          )}
        </div>

        <div className="flex gap-x-1.5 self-stretch items-center justify-between">
          <span className={cn(
            "group-data-[state=active]/chat:text-dark-blue-500 text-[11px] line-clamp-2 leading-[13.31px] flex-1 min-w-0 group-data-[state=active]/chat:font-medium",
            conversation.markedUnread ? "text-dark-blue-400 font-medium" : "text-gray-500"
          )}>
            {(conversation as any).lastMessagePreview ||
              ((conversation as any).lastMessage?.m_content) ||
              ((conversation as any).lastMessage?.m_ciphertext ? "Encrypted message" : "No messages yet")}
          </span>

          <div className="shrink-0">
            {conversation.markedUnread && !starred ? (
              <>
                <Badge
                  visual="primary"
                  className="inline-flex rounded-full size-[22px] shrink-0 group-hover/chat:hidden"
                >
                  &bull;
                </Badge>
                <div className="hidden group-hover/chat:block">
                  <FavoriteRoot
                    value={false}
                    onValueChange={(next) => {
                      onStarredChange?.(next)
                      apiFetch(`/v1/threads/${conversation.id}/star`, {
                        method: "POST",
                        headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {},
                      }).catch((err) => {
                        console.error("Failed to toggle star", err)
                        onStarredChange?.(!next)
                      })
                    }}
                  >
                    {() => (
                      <Favorite
                        onClick={(e) => e.stopPropagation()}
                        className="fill-transparent transition duration-300 size-[22px] text-dark-blue-400/50 hover:text-dark-blue-400/50"
                        starClassName="size-[18px]"
                      />
                    )}
                  </FavoriteRoot>
                </div>
              </>
            ) : (
              <FavoriteRoot
                value={starred ?? false}
                onValueChange={(next) => {
                  onStarredChange?.(next)
                  apiFetch(`/v1/threads/${conversation.id}/star`, {
                    method: next ? "POST" : "DELETE",
                    headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {},
                  }).catch((err) => {
                    console.error("Failed to toggle star", err)
                    onStarredChange?.(!next)
                  })
                }}
              >
                {() => (
                  <Favorite
                    onClick={(e) => e.stopPropagation()}
                    className="fill-transparent transition duration-300 size-[22px] text-dark-blue-400/50 hover:text-dark-blue-400/50"
                    starClassName="size-[18px]"
                  />
                )}
              </FavoriteRoot>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

export const Chat = ({
  conversation,
  variant,
  className,
  onClick,
  pinned: pinnedProp,
  starred,
  onStarredChange,
  onMarkUnread,
  onArchive,
  onSpam,
  onTrash,
  onCheckedChange,
  checked,
}: ChatProps) => {
  const { showPinnedIcon } = useChatsContext()
  const [localPinned, setLocalPinned] = useState(false)
  const isPinned = pinnedProp ?? localPinned
  const setIsPinned = (v: boolean) => setLocalPinned(v)

  const detailProps = {
    pinned: isPinned,
    onPinnedChange: setIsPinned,
    starred,
    onStarredChange,
    onMarkUnread,
    onArchive,
    onSpam,
    onTrash,
    onCheckedChange,
    checked,
    variant,
    className,
    conversation,
    name: conversation.participantUsername || "Unknown",
  } as const

  if (showPinnedIcon) {
    return isPinned ? (
      <div onClick={onClick} className="cursor-pointer hover:bg-gray-100 rounded-md">
        <UserDetail {...detailProps} />
      </div>
    ) : null
  }

  return (
    <div onClick={onClick} className="cursor-pointer hover:bg-gray-100 rounded-md">
      <UserDetail {...detailProps} />
    </div>
  )
}
