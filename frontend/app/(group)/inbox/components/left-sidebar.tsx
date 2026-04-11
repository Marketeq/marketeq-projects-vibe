"use client"

import React, { useCallback, useMemo, useState } from "react"
import { useEffect } from "react"
import {
  ensureEncryptionKeysExist,
  exportPrivateKey,
  exportPublicKey,
  generateKeyPair,
  importPrivateKey,
  savePrivateKey,
  savePublicKey,
} from "@/src/crypto/keys"
import { apiFetch } from "@/src/lib/api"
import { getCurrentUser, getAccessToken } from "@/utils/auth"
import { noop, toPxIfNumber } from "@/utils/functions"
import { useControllableState } from "@/utils/hooks"
import { useAblyChannel } from "@/utils/useAblyChannel"
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
  Loader,
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
import { decryptAES } from "@/src/crypto/e2ee"
import { loadKey } from "@/src/crypto/storage"
import { User } from "@/types/user"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import { Chat, ChatsContextProvider, useChatsContext } from "@/components/chat"
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

function getOtherParticipantId(
  conv: Conversation,
  me: string
): string | undefined {
  return conv.participantIds?.find((id) => id !== me)
}

interface LeftSidebarProps {
  selectedConversation: Conversation | null
  setSelectedConversation: (conv: Conversation) => void
  messagesByConversation: Record<string, Message[]>
}

const LeftSidebar = ({
  selectedConversation,
  setSelectedConversation,
  messagesByConversation,
}: LeftSidebarProps) => {
  const { pinnedChats, toggleShowPinnedIcon, showPinnedIcon, checkedChats } =
    useChatsContext()

  //getting the user id || can get other details later as required
  const currentUser = getCurrentUser()
  const currentUserId = currentUser?.id || ""
  const token = getAccessToken()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!token) return

    const fetchConversations = async () => {
      try {
        const data = await apiFetch<Conversation[]>(
          "/v1/threads",
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          }
        )

        const enriched = await Promise.all(
          data.map(async (conv: Conversation) => {
            // GROUP conversation
            if (conv.isGroup) {
              try {
                const group = await apiFetch<{ name: string }>(
                  `/v1/threads/${conv.id}`,
                  {
                    method: "GET",
                    headers: { Authorization: `Bearer ${token}` },
                  }
                )

                return {
                  ...conv,
                  participantUsername: group.name, // or participantName, whatever you're rendering
                }
              } catch (err) {
                console.warn(
                  `[LeftSidebar] failed to fetch group name for ${conv.id}`,
                  err
                )
                return {
                  ...conv,
                  participantUsername: "Unnamed Group",
                }
              }
            }

            // INDIVIDUAL conversation
            const otherId = conv.participantIds?.find(
              (id) => id !== currentUserId
            )

            if (!otherId) {
              console.warn(
                `[LeftSidebar] couldn’t find “other” participant for conv ${conv.id}`,
                { currentUserId, participantIds: conv.participantIds }
              )
              return {
                ...conv,
                participantUsername: "Unknown User",
              }
            }

            try {
              const user = await apiFetch<{ username: string; firstName?: string; lastName?: string }>(
                `/users/${otherId}`,
                { method: "GET", headers: { Authorization: `Bearer ${token}` } }
              )

              const displayName = [user.firstName?.trim(), user.lastName?.trim()].filter(Boolean).join(" ") || user.username

              // Decrypt last message preview if encrypted
              let lastMessagePreview = ""
              const lm = (conv as any).lastMessage
              if (lm) {
                if (lm.m_content) {
                  lastMessagePreview = lm.m_content
                } else if (lm.m_ciphertext) {
                  try {
                    const key = loadKey(conv.id)
                    if (key) {
                      lastMessagePreview = await decryptAES(lm.m_ciphertext, key)
                    }
                  } catch {
                    lastMessagePreview = "Encrypted message"
                  }
                }
              }

              return { ...conv, participantUsername: displayName, lastMessagePreview }
            } catch (err) {
              console.warn(
                `[LeftSidebar] failed to fetch user for ${otherId}`,
                err
              )
              return {
                ...conv,
                participantUsername: "Unknown User",
              }
            }
          })
        )

        setConversations(enriched)
      } catch (err) {
        console.error("[LeftSidebar] error fetching conversations:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchConversations()
  }, [currentUserId, token])

  return (
    <div className="w-[322px] shrink-0 border-r bg-white border-gray-200">
      <div className="pt-1 p-3 border-b border-gray-200">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button className="focus-visible:outline-none w-[157px] h-11 inline-flex items-center justify-center shrink-0 text-base leading-6 font-semibold gap-x-[6px]">
              All Messages <ChevronDown className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="bottom"
            sideOffset={4}
            className="w-[142px] max-h-[170px] overflow-y-auto rounded-[5px]"
          >
            <DropdownMenuItem className="w-[142px] h-[34px] gap-[8px] py-[10px] px-3">
              All Messages
            </DropdownMenuItem>
            <DropdownMenuItem className="w-[142px] h-[34px] gap-[8px] py-[10px] px-3">
              Unread
            </DropdownMenuItem>
            <DropdownMenuItem className="w-[142px] h-[34px] gap-[8px] py-[10px] px-3">
              Starred
            </DropdownMenuItem>
            <DropdownMenuItem className="w-[142px] h-[34px] gap-[8px] py-[10px] px-3">
              Sent
            </DropdownMenuItem>
            <DropdownMenuItem className="w-[142px] h-[34px] gap-[8px] py-[10px] px-3">
              Archived
            </DropdownMenuItem>
            <DropdownMenuItem className="w-[142px] h-[34px] gap-[8px] py-[10px] px-3">
              Spam
            </DropdownMenuItem>
            <DropdownMenuItem className="w-[142px] h-[34px] gap-[8px] py-[10px] px-3">
              Trash
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {checkedChats > 0 ? (
          <div className="flex items-center justify-between">
            <span className="inline-flex gap-x-0.5 items-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      className="rounded-full size-7 text-gray-400 hover:text-dark-blue-400"
                      visual="gray"
                      variant="ghost"
                    >
                      <X className="size-4" />
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Close</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="text-[13px] font-semibold leading-[18.88px] text-dark-blue-400">
                {checkedChats} selected
              </span>
            </span>

            <div className="flex items-center gap-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      className="rounded-full size-7 text-gray-400 hover:text-dark-blue-400"
                      visual="gray"
                      variant="ghost"
                    >
                      <Mail05 className="size-4" />
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Mark Unread</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      className="rounded-full size-7 text-gray-400 hover:text-dark-blue-400"
                      visual="gray"
                      variant="ghost"
                    >
                      <Pin02 className="size-4" />
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Pin</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      className="rounded-full size-7 text-gray-400 hover:text-dark-blue-400"
                      visual="gray"
                      variant="ghost"
                    >
                      <Archive className="size-4" />
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Archive</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      className="rounded-full size-7 text-gray-400 hover:text-dark-blue-400"
                      visual="gray"
                      variant="ghost"
                    >
                      <AlertTriangle className="size-4" />
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Move to Spam</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconButton
                      className="rounded-full size-7 text-gray-400 hover:text-error-500 hover:bg-error-100"
                      visual="gray"
                      variant="ghost"
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Delete</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-x-1">
            <InputGroup className="flex-auto">
              <Input
                id="search-bar"
                type="text"
                className="h-8 pl-[34px] py-2.5 pr-3 text-xs leading-5"
                placeholder="Search inbox"
              />
              <InputLeftElement>
                <SearchMd className="text-gray-400 size-4" />
              </InputLeftElement>
            </InputGroup>

            <IconButton className="size-8" visual="gray" variant="ghost">
              <Edit05 className="size-4" />
            </IconButton>
          </div>
        )}
      </div>
      {pinnedChats > 0 && (
        <div className="py-1 flex h-7 items-center justify-between pr-2 pl-4 bg-gray-25 border-b border-gray-200">
          <div className="flex items-center gap-x-1.5">
            <Pin02 className="text-gray-500 fill-gray-500 size-4" />
            <span className="text-[11px] leading-5 font-semibold text-gray-500">
              {pinnedChats} pinned chats
            </span>
          </div>

          {showPinnedIcon ? (
            <Button
              className="hover:no-underline opacity-50 hover:opacity-100"
              variant="link"
              visual="gray"
              onClick={toggleShowPinnedIcon}
            >
              <X className="size-[15px]" /> Close
            </Button>
          ) : (
            <Button
              className="group"
              variant="link"
              visual="gray"
              onClick={toggleShowPinnedIcon}
            >
              View{" "}
              <X className="size-[15px] opacity-50 group-hover:opacity-100" />
            </Button>
          )}
        </div>
      )}

      <ScrollArea>
        <div className="flex flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader className="size-5 animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
              <Mail05 className="size-8 stroke-[1.5]" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const otherId = getOtherParticipantId(conv, currentUserId)!
              return (
                <Chat
                  key={conv.id}
                  conversation={{
                    ...conv,
                    participantUsername: conv.participantUsername,
                  }}
                  currentUserId={currentUserId}
                  onClick={() => {
                    setSelectedConversation(conv)
                  }}
                />
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export default LeftSidebar
