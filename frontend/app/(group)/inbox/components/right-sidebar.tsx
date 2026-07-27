"use client"

import React, { useLayoutEffect, useRef, useState } from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { apiFetch } from "@/src/lib/api"
import { getCurrentUser } from "@/utils/auth"
import { useOnlineUsers } from "@/utils/useOnlineUsers"
import {
  AlertTriangle,
  Archive,
  Attachment01,
  ChevronDown,
  Edit05,
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
import { UserProfile } from "@/types/user"
import { User } from "@/types/user"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import { Chat, ChatsContextProvider, useChatsContext } from "@/components/chat"
import { HireMeButton } from "@/components/hire-me-button"
import { SaveTalentButton } from "@/components/save-talent-button"
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
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  ScrollArea,
  ScrollBar,
  Textarea,
  Toggle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  buttonVariants,
} from "@/components/ui"

interface RightSidebarProps {
  selectedConversation: Conversation | null
  jwtToken: string
}

const SaveButton = () => {
  const [isOpen, toggleIsOpen] = useToggle(false)
  const [value, setValue] = useState("")

  return (
    <div className="flex items-center">
      <Toggle
        className={buttonVariants({
          className:
            "group border-r-0 xs:max-lg:gap-x-[5.1px] xs:max-lg:leading-[12.75px] xs:max-lg:text-[8.93px] xs:max-lg:h-[25.75px] rounded-r-none",
          variant: "outlined",
          visual: "gray",
          size: "md",
        })}
      >
        <Star className="size-[12.75px] lg:size-5 text-gray-300 transition duration-300 group-hover:text-gray-500 group-hover:group-data-[state=on]:text-primary-500 group-data-[state=on]:text-primary-500  group-data-[state=on]:fill-primary-500" />
        <span className="group-data-[state=off]:inline-block hidden">Save</span>
        <span className="hidden group-data-[state=on]:inline-block">Saved</span>
      </Toggle>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton
            className="group rounded-l-none xs:max-lg:size-[25.5px] text-gray-500"
            variant="outlined"
            visual="gray"
            size="md"
          >
            <ChevronDown className="duration transition group-data-[state=open]:-rotate-180 size-[12.75px] lg:size-5" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom">
          <DropdownMenuRadioGroup value={value} onValueChange={setValue}>
            <DropdownMenuRadioTrigger value="Digital Marketing">
              Digital Marketing
            </DropdownMenuRadioTrigger>
            <DropdownMenuRadioTrigger value="Customer Service">
              Customer Service
            </DropdownMenuRadioTrigger>
            <DropdownMenuRadioTrigger value="Email Marketing">
              Email Marketing
            </DropdownMenuRadioTrigger>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => toggleIsOpen()}
            className="text-primary-500"
          >
            <Plus className="size-4" /> Create New List
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isOpen} onOpenChange={toggleIsOpen}>
        <DialogContent>
          <DialogTitle className="sr-only">Save to List</DialogTitle>
          <form className="flex items-center gap-x-3">
            <Input placeholder="Enter List Name" className="flex-auto" />
            <Button size="lg">Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
const SKILLS_MAX_ROWS = 5

const SkillsRow = ({
  skills,
  username,
}: {
  skills: { id: string; name: string }[]
  username: string
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(skills.length)

  useLayoutEffect(() => {
    setVisibleCount(skills.length)
  }, [skills])

  useLayoutEffect(() => {
    const children = [...(ref.current?.children ?? [])] as HTMLElement[]
    const rows = new Set(children.map((el) => el.offsetTop)).size

    if (rows > SKILLS_MAX_ROWS) {
      setVisibleCount((count) => Math.max(0, count - 1))
    }
  }, [visibleCount, skills])

  const hiddenCount = skills.length - visibleCount

  return (
    <div ref={ref} className="mt-3 flex flex-wrap gap-2">
      {skills.slice(0, visibleCount).map((skill) => (
        <Badge key={skill.id} visual="gray">
          {skill.name}
        </Badge>
      ))}

      {hiddenCount > 0 &&
        (username ? (
          <Badge
            asChild
            visual="gray"
            className="transition-colors duration-150 hover:bg-gray-200"
          >
            <a
              href={`/talent-profile?username=${encodeURIComponent(username)}#skills`}
            >
              {hiddenCount} more...
            </a>
          </Badge>
        ) : (
          // username is "" for users without one — linking anyway would produce
          // /talent-profile?username=#skills, so show the count without a link.
          <Badge visual="gray">{hiddenCount} more...</Badge>
        ))}
    </div>
  )
}
const RightSidebar = ({
  selectedConversation,
  jwtToken,
}: RightSidebarProps) => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)
  const currentUser = getCurrentUser()
  const router = useRouter()
  const { isOnline } = useOnlineUsers()

  const otherId =
    selectedConversation && currentUser
      ? (selectedConversation.participantIds?.find(
          (id) => id !== currentUser.id
        ) ?? null)
      : null

  useEffect(() => {
    setUser(null)
    setProfileError(null)
    if (!otherId) return

    apiFetch<UserProfile>(`/users/${otherId}`, {
      method: "GET",
      headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {},
    })
      .then((profile) => {
        setUser(profile)
        setProfileError(null)
      })
      .catch((err) => {
        console.error("Profile fetch failed", err)
        setProfileError("Couldn't load profile.")
      })
  }, [otherId, jwtToken, retryToken])

  if (!selectedConversation) {
    return (
      <div className="w-[300px] bg-white flex flex-col shrink-0 pt-10 pb-6 px-5 border-l border-gray-200 items-center justify-center text-gray-400">
        <p className="text-sm">Select a conversation</p>
      </div>
    )
  }

  if (profileError) {
    return (
      <div className="w-[300px] bg-white flex flex-col shrink-0 pt-10 pb-6 px-5 border-l border-gray-200 items-center justify-center gap-y-3">
        <p className="text-sm text-error-500 text-center">{profileError}</p>
        <Button
          visual="gray"
          variant="outlined"
          onClick={() => setRetryToken((t) => t + 1)}
        >
          Retry
        </Button>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="w-[300px] bg-white flex flex-col shrink-0 pt-10 pb-6 px-5 border-l border-gray-200 items-center justify-center text-gray-400">
        <p className="text-sm">Loading profile...</p>
      </div>
    )
  }

  const fullName = user.firstName?.trim() || user.username || "Unknown"
  const username = user.username || ""
  const avatarUrl = user.avatarUrl
  const initials = fullName.charAt(0).toUpperCase()
  const rate =
    user.rateMin && user.rateMax ? `$${user.rateMin} - $${user.rateMax}` : null
  const availability = user.availability
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null

  return (
    <div className="w-[300px] bg-white flex flex-col shrink-0 pt-10 pb-6 px-5 border-l border-gray-200">
      <div className="pb-5 flex flex-col items-center border-b border-gray-200">
        <Avatar size="3xl" isOnline={isOnline(user?.id)}>
          <AvatarImage src={avatarUrl || undefined} alt={fullName} />
          <AvatarFallback delayMs={0}>{initials}</AvatarFallback>
        </Avatar>

        <div className="mt-2 flex flex-col gap-y-1.5">
          <h3 className="text-base leading-[19.36px] text-center font-bold text-dark-blue-400">
            {fullName}
          </h3>
          {username && (
            <p className="text-[13px] leading-[15.73px] text-center text-dark-blue-400">
              @{username}
            </p>
          )}
        </div>

        <div className="mt-5 flex items-center gap-x-2 justify-center">
          <SaveTalentButton userId={user?.id} />
          <HireMeButton profile={user} />
        </div>
      </div>

      <div className="mt-5 pb-5 flex flex-col gap-y-3 border-b border-gray-200">
        {rate && (
          <div className="flex items-center gap-x-2">
            <span className="text-[13px] leading-[15.73px] text-[#122A4B] font-light">
              Rate
            </span>
            <span className="text-[13px] leading-[15.73px] text-[#122A4B] font-light">
              <span className="font-bold">{rate}</span> /hr
            </span>
          </div>
        )}
        {availability && (
          <div className="flex items-center gap-x-2">
            <span className="text-[13px] leading-[15.73px] text-[#122A4B] font-light">
              Current Availability
            </span>
            <span className="text-[13px] leading-[15.73px] text-[#122A4B] font-bold">
              {availability}
            </span>
          </div>
        )}
        {/* Only surfaced once there are enough completed projects for the
            rating to mean anything — same threshold talent-profile uses, so a
            talent with no history shows nothing here rather than a bare or
            zeroed score. */}
        {(user?.totalProjectsCompleted ?? 0) >= 2 &&
          user?.clientSuccessRating != null && (
            <div className="flex items-center gap-x-2">
              <span className="inline-flex text-dark-blue-400 items-center text-xs leading-[14.52px] font-medium gap-x-1 py-1 px-2 bg-primary-50 rounded">
                <Star className="size-3 fill-dark-blue-400" />{" "}
                {user.clientSuccessRating}
              </span>
              {user.totalProjectsCompleted != null && (
                <span className="text-[13px] leading-[15.73px] text-[#122A4B] font-light">
                  {user.totalProjectsCompleted} projects
                </span>
              )}
            </div>
          )}
      </div>

      {user?.skills && user.skills.length > 0 && (
        <div className="mt-3 pb-5 border-b border-gray-200">
          <h3 className="font-bold text-sm text-dark-blue-400">Skills</h3>
          <SkillsRow skills={user.skills} username={username} />
        </div>
      )}

      <div className="mt-auto flex flex-col gap-y-6">
        <Button
          visual="gray"
          variant="outlined"
          disabled={!user?.username}
          onClick={() => {
            if (!user?.username) return
            router.push(
              `/talent-profile?username=${encodeURIComponent(user.username)}`
            )
          }}
        >
          View Full Profile
        </Button>

        {memberSince && (
          <span className="text-center text-xs leading-[14.52px] text-dark-blue-400">
            Member since <span className="font-semibold">{memberSince}</span>
          </span>
        )}
      </div>
    </div>
  )
}

export default React.memo(RightSidebar)
