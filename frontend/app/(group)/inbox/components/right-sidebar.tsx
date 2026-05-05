"use client"

import React, { useState } from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser } from "@/utils/auth"
import { apiFetch } from "@/src/lib/api"
import { Conversation } from "@/types/conversation"
import { UserProfile } from "@/types/user"
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
import { HireMeButton } from "@/components/hire-me-button"
import { SaveTalentButton } from "@/components/save-talent-button"
import {
  DropboxBrand,
  GoogleDrive1Brand,
  MsOnedriveBrand,
} from "@blend-metrics/icons/brands"
import { DropdownMenuArrow } from "@radix-ui/react-dropdown-menu"
import { useMeasure, useToggle } from "react-use"
import { Message } from "@/types/message"
import { User } from "@/types/user"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import { Chat, ChatsContextProvider, useChatsContext } from "@/components/chat"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  buttonVariants,
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
} from "@/components/ui"

interface RightSidebarProps {
  selectedConversation: Conversation | null
  jwtToken: string
}

const RightSidebar = ({ selectedConversation, jwtToken }: RightSidebarProps) => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)
  const currentUser = getCurrentUser()
  const router = useRouter()
  const { isOnline } = useOnlineUsers()

  useEffect(() => {
    setUser(null)
    setProfileError(null)
    if (!selectedConversation || !currentUser) return
    const otherId = selectedConversation.participantIds?.find((id) => id !== currentUser.id)
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
  }, [selectedConversation, jwtToken, retryToken])

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
  const rate = user.rateMin && user.rateMax ? `$${user.rateMin} - $${user.rateMax}` : null
  const availability = user.availability
  const memberSince = user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : null

  return (
    <div className="w-[300px] bg-white flex flex-col shrink-0 pt-10 pb-6 px-5 border-l border-gray-200">
      <div className="pb-5 flex flex-col items-center border-b border-gray-200">
        <Avatar size="2xl" isOnline={isOnline(user?.id)}>
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
            <span className="text-[13px] leading-[15.73px] text-[#122A4B] font-light">Rate</span>
            <span className="text-[13px] leading-[15.73px] text-[#122A4B] font-light">
              <span className="font-bold">{rate}</span> /hr
            </span>
          </div>
        )}
        {availability && (
          <div className="flex items-center gap-x-2">
            <span className="text-[13px] leading-[15.73px] text-[#122A4B] font-light">Availability</span>
            <span className="text-[13px] leading-[15.73px] text-[#122A4B] font-bold">{availability}</span>
          </div>
        )}
        {user?.clientSuccessRating && (
          <div className="flex items-center gap-x-2">
            <span className="inline-flex text-dark-blue-400 items-center text-xs leading-[14.52px] font-medium gap-x-1 py-1 px-2 bg-primary-50 rounded">
              <Star className="size-3 fill-dark-blue-400" /> {user.clientSuccessRating}
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
          <div className="mt-3 flex flex-wrap gap-2">
            {user.skills.map((s) => (
              <Badge key={s.id} visual="gray">{s.name}</Badge>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-y-6">
        <Button
          visual="gray"
          variant="outlined"
          disabled={!user?.username}
          onClick={() => {
            if (!user?.username) return
            router.push(`/talent-profile?username=${encodeURIComponent(user.username)}`)
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

export default RightSidebar
