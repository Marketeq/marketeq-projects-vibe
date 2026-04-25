"use client"

import React, { useCallback, useMemo, useRef, useState } from "react"
import { useEffect } from "react"
import {
  ensureEncryptionKeysExist,
  loadPrivateKey,
} from "@/src/crypto/keys"
import { useRouter } from "next/navigation"
import { useThreadActions, type ThreadBulkAction } from "../hooks/use-thread-actions"
import { apiFetch } from "@/src/lib/api"
import { useUserChannel } from "@/utils/useUserChannel"
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
} from "@blend-metrics/icons"
import { Spinner } from "@/components/ui/spinner/spinner"
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
import { loadKey, saveKey } from "@/src/crypto/storage"
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
  initialThreadId?: string | null
  initialParticipantId?: string | null
  searchIndex?: {
    search: (q: string) => Array<{
      id: string
      threadId: string
      senderId: string
      content: string
      createdAt: string
    }>
    isIndexing: boolean
    progress: number
    ready: boolean
    docCount: number
  }
  onHighlightMessage?: (messageId: string) => void
}

const LeftSidebar = ({
  selectedConversation,
  setSelectedConversation,
  messagesByConversation,
  initialThreadId,
  initialParticipantId,
  searchIndex,
  onHighlightMessage,
}: LeftSidebarProps) => {
  const { pinnedChats, setPinnedChats, toggleShowPinnedIcon, showPinnedIcon, checkedChats, resetCheckedChats } =
    useChatsContext()

  //getting the user id || can get other details later as required
  const currentUser = getCurrentUser()
  const currentUserId = currentUser?.id || ""
  const token = getAccessToken()

  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; threadId: string; senderId: string; content: string; createdAt: string }>
  >([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [bulkActionPending, setBulkActionPending] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const threadActions = useThreadActions(token || "")
  const visibleConversations = useMemo(
    () =>
      conversations.filter((c: any) => {
        switch (activeFilter) {
          case "starred":
            return c.isStarred
          case "unread":
            return c.markedUnread
          case "sent":
            return c.lastMessage?.m_senderId === currentUserId
          case "archived":
            return c.isArchived
          case "spam":
            return c.isSpam
          case "trash":
            return c.isTrashed
          case "all":
          default:
            return !c.isArchived && !c.isSpam && !c.isTrashed
        }
      }),
    [activeFilter, conversations, currentUserId]
  )

  const clearSelection = () => {
    setCheckedIds(new Set())
    resetCheckedChats?.()
  }

  const bulkAction = async (action: ThreadBulkAction, patch: Partial<Conversation>) => {
    if (bulkActionPending) return false
    const ids = Array.from(checkedIds)
    if (!ids.length) return false

    setBulkActionPending(true)
    try {
      await threadActions.bulk(ids, action)
      const idSet = new Set(ids)
      setConversations((prev) =>
        prev.map((c) => idSet.has(c.id) ? { ...c, ...patch } : c)
      )
      if (selectedConversation && idSet.has(selectedConversation.id)) {
        setSelectedConversation({ ...(selectedConversation as any), ...patch })
      }
      clearSelection()
      return true
    } catch (err) {
      console.error("[LeftSidebar] bulk action failed:", err)
      return false
    } finally {
      setBulkActionPending(false)
    }
  }

  useEffect(() => {
    if (!token) return

    let cancelled = false

    const patchConv = (id: string, patch: Partial<Conversation>) => {
      if (cancelled) return
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? ({ ...c, ...patch } as Conversation) : c))
      )
    }

    const enrichGroup = async (conv: Conversation) => {
      try {
        const group = await apiFetch<{ name: string }>(
          `/v1/threads/${conv.id}`,
          { method: "GET", headers: { Authorization: `Bearer ${token}` } }
        )
        patchConv(conv.id, { participantUsername: group.name } as any)
      } catch (err) {
        console.warn(
          `[LeftSidebar] failed to fetch group name for ${conv.id}`,
          err
        )
        patchConv(conv.id, { participantUsername: "Unnamed Group" } as any)
      }
    }

    const enrichIndividual = async (
      conv: Conversation,
      privKeyRef: { current: CryptoKey | null }
    ) => {
      const otherId = conv.participantIds?.find((id) => id !== currentUserId)
      if (!otherId) {
        patchConv(conv.id, { participantUsername: "Unknown User" } as any)
        return
      }

      try {
        const user = await apiFetch<{
          username: string
          firstName?: string
          lastName?: string
          avatarUrl?: string
        }>(`/users/${otherId}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        })
        const displayName = user.firstName?.trim() || user.username
        patchConv(conv.id, {
          participantUsername: displayName,
          participantAvatarUrl: user.avatarUrl,
        } as any)
      } catch (err) {
        console.warn(`[LeftSidebar] failed to fetch user for ${otherId}`, err)
        patchConv(conv.id, { participantUsername: "Unknown User" } as any)
        return
      }

      // Last-message preview (best-effort; placeholder already rendered)
      const lm = (conv as any).lastMessage
      if (!lm) return
      if (lm.m_content) {
        patchConv(conv.id, { lastMessagePreview: lm.m_content } as any)
        return
      }
      if (!lm.m_ciphertext) return

      let key: Uint8Array | null = null
      try {
        key = loadKey(conv.id)
      } catch { /* not cached */ }

      if (!key && currentUserId) {
        try {
          const privKey = privKeyRef.current
          if (privKey) {
            const { encryptedKey } = await apiFetch<{ encryptedKey: string }>(
              `/api/messaging/conversations/${conv.id}/key?isGroup=${conv.isGroup}`,
              { headers: { Authorization: `Bearer ${token}` } }
            )
            const wrapped = Uint8Array.from(atob(encryptedKey), (c) =>
              c.charCodeAt(0)
            )
            const rawBuffer = await window.crypto.subtle.decrypt(
              { name: "RSA-OAEP" },
              privKey,
              wrapped
            )
            key = new Uint8Array(rawBuffer)
            const b64 = btoa(String.fromCharCode(...key))
            saveKey(conv.id, b64)
          }
        } catch {
          /* unwrap failed; keep placeholder */
        }
      }

      if (key) {
        try {
          const preview = await decryptAES(lm.m_ciphertext, key)
          patchConv(conv.id, { lastMessagePreview: preview } as any)
        } catch {
          /* decrypt failed; placeholder remains */
        }
      }
    }

    const run = async () => {
      try {
        const data = await apiFetch<Conversation[]>("/v1/threads", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        })
        if (cancelled) return

        // Render list immediately with placeholders; no network/crypto blocked.
        const placeholders = data.map((conv: Conversation) => ({
          ...conv,
          participantUsername: conv.isGroup ? "Group" : "…",
          lastMessagePreview: (conv as any).lastMessage?.m_ciphertext
            ? "Encrypted message"
            : (conv as any).lastMessage?.m_content ?? "",
        })) as Conversation[]
        setConversations(placeholders)
        setPinnedChats?.(placeholders.filter((c) => (c as any).isPinned).length)
        setIsLoading(false)

        // Auto-select the thread if the caller passed ?threadId=... and it
        // exists in this user's threads. Only fires once per mount.
        // If the thread was previously trashed, restore it so it's visible
        // again (user explicitly chose to message this person). Other flags
        // (archived, spam) are intentional — leave them as-is.
        if (initialThreadId) {
          const match = placeholders.find((c) => c.id === initialThreadId)
          if (match && !cancelled) {
            if (match.isTrashed) {
              threadActions.untrash(match.id).catch(() => {})
              const restored = { ...match, isTrashed: false }
              setConversations((prev) =>
                prev.map((c) => c.id === match.id ? restored : c)
              )
              setSelectedConversation(restored)
            } else {
              setSelectedConversation(match)
            }
            // Clear threadId from URL so refreshes don't re-trigger
            // auto-select or auto-untrash.
            router.replace("/inbox", { scroll: false })
          }
        }

        // Load the private key once per pass; share across all unwraps.
        const privKeyRef: { current: CryptoKey | null } = { current: null }
        if (currentUserId) {
          try {
            privKeyRef.current = await loadPrivateKey(currentUserId)
          } catch {
            privKeyRef.current = null
          }
        }

        // Enrich in parallel; each resolves independently and patches state.
        await Promise.allSettled(
          data.map((conv) =>
            conv.isGroup ? enrichGroup(conv) : enrichIndividual(conv, privKeyRef)
          )
        )
      } catch (err) {
        if (!cancelled) {
          console.error("[LeftSidebar] error fetching conversations:", err)
          setIsLoading(false)
        }
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [currentUserId, token, initialThreadId])

  // Handle ?participantId= independently of the thread-list fetch so it works
  // even when GET /v1/threads is unavailable.
  // Fast path: if the thread-list load has populated a 1:1 thread with the
  // target participant, select it immediately — skips the POST round-trip.
  // Slow path: no local match → POST /v1/threads to create; backend is
  // idempotent and the DB unique index on 1:1 pairs prevents duplicates.
  // Ref guard covers React 18 StrictMode double-invoke and rapid clicks.
  const createdForParticipantRef = useRef<string | null>(null)
  useEffect(() => {
    if (!initialParticipantId || !currentUserId || !token) return
    if (initialParticipantId === currentUserId) {
      router.replace("/inbox", { scroll: false })
      return
    }
    if (createdForParticipantRef.current === initialParticipantId) return
    // Wait for the thread-list fetch before deciding local-vs-POST.
    if (isLoading) return
    createdForParticipantRef.current = initialParticipantId

    const local = conversations.find(
      (c) =>
        !c.isGroup &&
        c.participantIds?.length === 2 &&
        c.participantIds.includes(initialParticipantId)
    )
    if (local) {
      if (local.isTrashed) {
        threadActions.untrash(local.id).catch(() => {})
        const restored = { ...local, isTrashed: false }
        setConversations((prev) =>
          prev.map((c) => (c.id === restored.id ? restored : c))
        )
        setSelectedConversation(restored)
      } else {
        setSelectedConversation(local)
      }
      router.replace("/inbox", { scroll: false })
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const thread = await apiFetch<Conversation>("/v1/threads", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: { participantIds: [currentUserId, initialParticipantId], isGroup: false },
        })
        if (cancelled) return
        setConversations((prev) => {
          const existing = prev.find((c) => c.id === thread.id)
          if (existing) {
            if (!existing.isTrashed) {
              setSelectedConversation(existing)
            } else {
              threadActions.untrash(existing.id).catch(() => {})
              const restored = { ...existing, isTrashed: false }
              setSelectedConversation(restored)
              return prev.map((c) => (c.id === restored.id ? restored : c))
            }
            return prev
          }
          const placeholder = {
            ...thread,
            participantUsername: "…",
            lastMessagePreview: "",
          } as Conversation
          setSelectedConversation(placeholder)
          return [placeholder, ...prev]
        })
        router.replace("/inbox", { scroll: false })
      } catch (err) {
        console.error("[LeftSidebar] participantId thread create failed:", err)
      }
    })()
    return () => { cancelled = true }
  }, [currentUserId, token, initialParticipantId, isLoading, conversations])

  // Live-sync: apply server state-change broadcasts (pin/star/archive/...)
  useUserChannel({
    onThreadStateChanged: ({ threadId, patch }) => {
      if (patch.removed) {
        setConversations((prev) => prev.filter((c) => c.id !== threadId))
        return
      }
      setConversations((prev) => {
        const next = prev.map((c) => (c.id === threadId ? { ...c, ...patch } : c))
        next.sort((a, b) => {
          if (!!a.isPinned !== !!b.isPinned) return a.isPinned ? -1 : 1
          return (
            new Date((b as any).updatedAt).getTime() -
            new Date((a as any).updatedAt).getTime()
          )
        })
        return next
      })
      // Keep the currently-open thread in the top bar in sync too
      if (selectedConversation && selectedConversation.id === threadId) {
        setSelectedConversation({ ...(selectedConversation as any), ...patch })
      }
    },
  })

  // Keep the pinned-chats bar count in sync with the live conversations list
  useEffect(() => {
    setPinnedChats?.(conversations.filter((c) => c.isPinned).length)
  }, [conversations, setPinnedChats])

  const searching = searchQuery.trim().length > 0

  useEffect(() => {
    if (isLoading || initialParticipantId || searching) return

    const selectedVisible = selectedConversation
      ? visibleConversations.some((c) => c.id === selectedConversation.id)
      : false

    if (selectedVisible) return

    const firstVisible = visibleConversations[0] ?? null
    if (firstVisible) {
      setSelectedConversation(firstVisible)
    }
  }, [
    initialParticipantId,
    isLoading,
    searching,
    selectedConversation,
    setSelectedConversation,
    visibleConversations,
  ])

  // Search uses the persisted client-side index when available (covers the
  // full history). Falls back to in-memory messagesByConversation (only
  // opened threads) when the index hook isn't plumbed in yet.
  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }
    setSearchLoading(true)
    const handle = setTimeout(() => {
      if (searchIndex?.ready) {
        setSearchResults(searchIndex.search(q))
      } else {
        const ql = q.toLowerCase()
        const hits: Array<{
          id: string
          threadId: string
          senderId: string
          content: string
          createdAt: string
        }> = []
        for (const [threadId, msgs] of Object.entries(messagesByConversation ?? {})) {
          for (const m of msgs as Message[]) {
            if ((m as any).isDeleted || (m as any).deleted) continue
            const content = m.content || ""
            if (content.toLowerCase().includes(ql)) {
              hits.push({
                id: m.id,
                threadId,
                senderId: m.senderId,
                content,
                createdAt: m.createdAt,
              })
            }
          }
        }
        hits.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        setSearchResults(hits.slice(0, 50))
      }
      setSearchLoading(false)
    }, 150)
    return () => clearTimeout(handle)
  }, [searchQuery, messagesByConversation, searchIndex])

  const openSearchResult = (threadId: string, messageId: string) => {
    const conv = conversations.find((c) => c.id === threadId)
    if (conv) setSelectedConversation(conv)
    onHighlightMessage?.(messageId)
    setSearchQuery("")
  }

  return (
    <div className="w-[322px] shrink-0 border-r bg-white border-gray-200 h-full flex flex-col min-h-0">
      <div className="pt-1 p-3 border-b border-gray-200 shrink-0">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button className="focus-visible:outline-none w-[157px] h-11 inline-flex items-center justify-center shrink-0 text-base leading-6 font-semibold gap-x-[6px]">
              {{ all: "All Messages", unread: "Unread", starred: "Starred", sent: "Sent", archived: "Archived", spam: "Spam", trash: "Trash" }[activeFilter] ?? "All Messages"} <ChevronDown className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="bottom"
            sideOffset={4}
            className="w-[142px] max-h-[170px] overflow-y-auto rounded-[5px]"
          >
            {([
              ["all", "All Messages"],
              ["unread", "Unread"],
              ["starred", "Starred"],
              ["sent", "Sent"],
              ["archived", "Archived"],
              ["spam", "Spam"],
              ["trash", "Trash"],
            ] as const).map(([key, label]) => (
              <DropdownMenuItem
                key={key}
                className={`w-[142px] h-[34px] gap-[8px] py-[10px] px-3 ${activeFilter === key ? "font-semibold" : ""}`}
                onSelect={() => setActiveFilter(key)}
              >
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {checkedChats > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <span className="inline-flex gap-x-0.5 items-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <IconButton
                        className="rounded-full size-7 text-gray-400 hover:text-dark-blue-400"
                        visual="gray"
                        variant="ghost"
                        onClick={() => clearSelection()}
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
                        onClick={() => { void bulkAction("mark-unread", { markedUnread: true }) }}
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
                        onClick={() => { void bulkAction("star", { isStarred: true }) }}
                      >
                        <Star className="size-4" />
                      </IconButton>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Star</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <IconButton
                        className="rounded-full size-7 text-gray-400 hover:text-dark-blue-400"
                        visual="gray"
                        variant="ghost"
                        onClick={() => { void bulkAction("pin", { isPinned: true }) }}
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
                        onClick={() => { void bulkAction("archive", { isArchived: true }) }}
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
                        onClick={() => { void bulkAction("spam", { isSpam: true }) }}
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
                        onClick={() => setShowBulkDeleteConfirm(true)}
                      >
                        <Trash2 className="size-4" />
                      </IconButton>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Delete</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
              <DialogContent className="max-w-[348px] p-7 rounded-xl">
                <DialogTitle>Delete {checkedIds.size} chats?</DialogTitle>
                <DialogDescription className="mt-2">
                  These chats will be moved to Trash. You can restore them later from the Trash filter.
                </DialogDescription>
                <div className="mt-8 grid grid-cols-2 gap-x-3">
                  <DialogClose asChild>
                    <Button visual="gray" variant="outlined">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    onClick={() => {
                      void bulkAction("trash", { isTrashed: true }).then((ok) => {
                        if (ok) setShowBulkDeleteConfirm(false)
                      })
                    }}
                    disabled={bulkActionPending}
                  >
                    Yes, Delete
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <div className="flex items-center gap-x-1">
            <InputGroup className="flex-auto">
              <Input
                id="search-bar"
                type="text"
                className="h-8 pl-[34px] py-2.5 pr-8 text-xs leading-5"
                placeholder="Search inbox"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <InputLeftElement>
                <SearchMd className="text-gray-400 size-4" />
              </InputLeftElement>
              {searchQuery && (
                <InputRightElement>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                </InputRightElement>
              )}
            </InputGroup>

            <IconButton className="size-8 rounded-full" visual="gray" variant="ghost">
              <Edit05 className="size-4" />
            </IconButton>
          </div>
        )}
      </div>
      {pinnedChats > 0 && (
        <div className="py-1 flex h-7 items-center justify-between pr-2 pl-4 bg-gray-25 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-x-1.5">
            <Pin02 className="text-gray-500 fill-gray-500 size-4" />
            <span className="text-[11px] leading-5 font-semibold text-gray-500">
              {pinnedChats} pinned chats
            </span>
          </div>

          {showPinnedIcon ? (
            <Button
              className="hover:no-underline"
              variant="link"
              visual="gray"
              onClick={() => toggleShowPinnedIcon()}
            >
              <X className="size-[15px]" /> Close
            </Button>
          ) : (
            <Button
              className="hover:no-underline"
              variant="link"
              visual="gray"
              onClick={() => toggleShowPinnedIcon()}
            >
              View
            </Button>
          )}
        </div>
      )}

      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col">
          {searching ? (
            <div className="py-2">
              <div className="px-4 py-1.5 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                  Messages
                </span>
                {searchIndex?.isIndexing && (
                  <span className="inline-flex items-center gap-x-1 text-[10px] text-gray-400">
                    <Spinner size={10} strokeWidth={3} />
                    Indexing {Math.round((searchIndex.progress ?? 0) * 100)}%
                  </span>
                )}
              </div>
              {searchLoading ? (
                <div className="flex items-center justify-center py-8 text-gray-400">
                  <Spinner size={20} strokeWidth={3} />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2 text-gray-400 px-6 text-center">
                  <SearchMd className="size-6 stroke-[1.5]" />
                  <p className="text-xs">No messages matching "{searchQuery}"</p>
                  {searchIndex?.isIndexing && (
                    <p className="text-[11px] leading-4 text-gray-500">
                      Still indexing older messages — try again in a moment.
                    </p>
                  )}
                </div>
              ) : (
                searchResults.map((r) => {
                  const conv = conversations.find((c) => c.id === r.threadId)
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => openSearchResult(r.threadId, r.id)}
                      className="flex flex-col items-start gap-y-1 px-4 py-3 text-left hover:bg-gray-100 border-b border-gray-100"
                    >
                      <div className="flex items-center justify-between w-full gap-x-2">
                        <span className="text-[13px] font-semibold text-dark-blue-400 truncate">
                          {conv?.participantUsername || "Conversation"}
                        </span>
                        <span className="text-[11px] text-gray-500 shrink-0">
                          {new Date(r.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-600 line-clamp-2 break-words [overflow-wrap:anywhere]">
                        {r.content || "Encrypted message"}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Spinner size={24} strokeWidth={3} />
            </div>
          ) : (() => {
            return visibleConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
                <Mail05 className="size-8 stroke-[1.5]" />
                <p className="text-sm">
                  {activeFilter === "all" ? "No conversations yet" : `No ${activeFilter} conversations`}
                </p>
              </div>
            ) : (
              visibleConversations.map((conv) => (
                <Chat
                  key={conv.id}
                  conversation={{
                    ...conv,
                    participantUsername: conv.participantUsername,
                  }}
                  variant={selectedConversation?.id === conv.id ? "active" : "default"}
                  pinned={conv.isPinned}
                  starred={conv.isStarred}
                  onStarredChange={(val) => {
                    setConversations((prev) =>
                      prev.map((c) => c.id === conv.id ? { ...c, isStarred: val } : c)
                    )
                  }}
                  onMarkUnread={() => {
                    const next = !conv.markedUnread
                    ;(next ? threadActions.markUnread(conv.id) : threadActions.markRead(conv.id)).catch(console.error)
                    setConversations((prev) =>
                      prev.map((c) => c.id === conv.id ? { ...c, markedUnread: next } : c)
                    )
                  }}
                  onArchive={() => {
                    const next = !conv.isArchived
                    ;(next ? threadActions.archive(conv.id) : threadActions.unarchive(conv.id)).catch(console.error)
                    setConversations((prev) =>
                      prev.map((c) => c.id === conv.id ? { ...c, isArchived: next } : c)
                    )
                  }}
                  onSpam={() => {
                    const next = !conv.isSpam
                    ;(next ? threadActions.spam(conv.id) : threadActions.unspam(conv.id)).catch(console.error)
                    setConversations((prev) =>
                      prev.map((c) => c.id === conv.id ? { ...c, isSpam: next } : c)
                    )
                  }}
                  onTrash={() => {
                    const next = !conv.isTrashed
                    ;(next ? threadActions.trash(conv.id) : threadActions.untrash(conv.id)).catch(console.error)
                    setConversations((prev) =>
                      prev.map((c) => c.id === conv.id ? { ...c, isTrashed: next } : c)
                    )
                  }}
                  checked={checkedIds.has(conv.id)}
                  onCheckedChange={(convId, isChecked) => {
                    setCheckedIds((prev) => {
                      const next = new Set(prev)
                      isChecked ? next.add(convId) : next.delete(convId)
                      return next
                    })
                  }}
                  currentUserId={currentUserId}
                  onClick={() => {
                    setSelectedConversation(conv)
                  }}
                />
              ))
            )
          })()}
        </div>
      </ScrollArea>
    </div>
  )
}

export default LeftSidebar
