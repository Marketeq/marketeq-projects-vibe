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
}
export const [ChatsContextProvider, useChatsContext] = createContext<{
  pinnedChats: number
  onChatPinned: (pinned: boolean) => void
  onChatChecked: (checked: boolean) => void
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
  conversation: Conversation
  onClick?: () => void
}

export const UserDetail = ({
  conversation,
  className,
  variant = "default",
  pinned,
  onPinnedChange,
}: UserDetailProps) => {
  const { onChatPinned, showPinnedIcon, onChatChecked, checkedChats } =
    useChatsContext()

  //jwt token
  const jwtToken =
    typeof window !== "undefined" ? localStorage.getItem("token") : null

  const [isPinned, setIsPinned] = useControllableState({
    defaultValue: false,
    value: pinned,
    onChange: async (value) => {
      onPinnedChange?.(value)
      onChatPinned(value)

      try {
        await apiFetch<{ message: string }>(
          `/api/messaging/conversations/${conversation.id}/pin`,
          {
            method: "POST",
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
  const [selected, setSelected] = useUncontrolledState<CheckedState>({
    defaultValue: false,
    onChange: (value) => typeof value === "boolean" && onChatChecked(value),
  })
  const [open, toggle] = useToggle(false)
  const showCheckbox = checkedChats > 0

  return (
    <article className={cn(chatVariants({ className }))} data-state={variant}>
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
          <AvatarImage src="/man.jpg" alt="Man" />
          <AvatarFallbackIcon />
        </Avatar>
        <div
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
          <h3 className="group-data-[state=active]/chat:font-bold text-[13px] leading-[18.88px] font-medium text-dark-blue-400">
            {conversation.participantUsername || "Unknown"}
          </h3>

          <span className="transition duration-300 group-data-[state=active]/chat:font-bold group-hover/chat:opacity-0 opacity-100 text-xs leading-[14.52px] font-medium text-dark-blue-400">
            {formatConversationDate(conversation.createdAt)}
          </span>

          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button className="absolute top-[13.73px] right-[15px] size-[27px] hidden group-hover/chat:inline-flex data-[state=open]:inline-flex justify-center items-center focus-visible:outline-none text-gray-500 transition-opacity duration-300 group-hover/chat:opacity-100 data-[state=open]:opacity-100 opacity-0 rounded-full hover:text-dark-blue-500 hover:bg-primary-50">
                <MoreHorizontal className="size-[15px]" />
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="min-w-[142px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-100"
              align="end"
              side="bottom"
              sideOffset={4}
              avoidCollisions={false}
            >
              <DropdownMenuItem>
                <EyeOff className="h-4 w-4" /> Mark Unread
              </DropdownMenuItem>
              <DropdownMenuItem>
                <AlertCircle className="h-4 w-4" /> Move to Spam
              </DropdownMenuItem>

              <DropdownMenuItem onSelect={() => setIsPinned((prev) => !prev)}>
                <Pin02 className="h-4 w-4" /> {isPinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>

              <DropdownMenuItem>
                <Archive className="h-4 w-4" /> Archive
              </DropdownMenuItem>
              <DropdownMenuItem>
                <AlertTriangle className="h-4 w-4" /> Block / Report
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem visual="destructive" onClick={toggle}>
                <Trash2 className="h-4 w-4" /> Delete Chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={open} onOpenChange={toggle}>
            <DialogContent className="max-w-[348px] p-7 rounded-xl">
              <DialogTitle>Delete this chat?</DialogTitle>
              <DialogDescription className="mt-2">
                This chat will be deleted permanently. You will not be able to
                recover it.
              </DialogDescription>
              <div className="mt-8 grid grid-cols-2 gap-x-3">
                <DialogClose asChild>
                  <Button visual="gray" variant="outlined">
                    Cancel
                  </Button>
                </DialogClose>
                <Button>Yes, Delete</Button>
              </div>
            </DialogContent>
          </Dialog>

          {showPinnedIcon && isPinned && (
            <Pin02 className="size-4 absolute shrink-0 text-primary-500 fill-primary-500 top-[3px] right-1" />
          )}
        </div>

        <div className="flex gap-x-1.5 self-stretch items-end justify-between">
          <span className="group-data-[state=active]/chat:text-dark-blue-500 text-gray-500 text-[11px] line-clamp-2 leading-[13.31px] group-data-[state=active]/chat:font-medium">
            Ad reprehenderit deserunt in qui ut esse magna ipsum fugiat qui
            aliqua aliquip Lorem, ipsum dolor Lorem ipsum dolor sit, amet
            consectetur adipisicing elit. Repudiandae, odit.
          </span>

          <Favorite
            className="group-data-[state=active]/chat:hidden fill-transparent group-data-[state=active]/chat:group-hover/chat:inline-flex group-data-[state=active]/chat:group-hover/chat:opacity-100 transition duration-300 size-[22px] text-dark-blue-400/50 hover:text-dark-blue-400/50"
            starClassName="size-[18px]"
          />
          <Badge
            visual="primary"
            className="hidden transition-300 group-data-[state=active]/chat:inline-flex rounded-full size-[22px] group-data-[state=active]/chat:group-hover/chat:group-hover/chat:hidden"
          >
            1
          </Badge>
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
}: ChatProps) => {
  const { showPinnedIcon } = useChatsContext()
  const [isPinned, setIsPinned] = useState(false)

  if (showPinnedIcon) {
    return isPinned ? (
      <div
        onClick={onClick}
        className="cursor-pointer hover:bg-gray-100 rounded-md"
      >
        <UserDetail
          pinned={isPinned}
          onPinnedChange={setIsPinned}
          variant={variant}
          className={className}
          conversation={conversation}
          name={conversation.participantUsername || "Unknown"}
        />
      </div>
    ) : null
  }

  return (
    <div
      onClick={onClick}
      className="cursor-pointer hover:bg-gray-100 rounded-md"
    >
      <UserDetail
        pinned={isPinned}
        onPinnedChange={setIsPinned}
        variant={variant}
        className={className}
        conversation={conversation}
        name={conversation.participantUsername || "Unknown"}
      />
    </div>
  )
}
