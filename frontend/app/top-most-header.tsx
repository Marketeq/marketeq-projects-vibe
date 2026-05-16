"use client"

import React, { useCallback, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { useAutocomplete } from "@/libs/autocomplete"
import {
  formatNotificationTime,
  mapAblyNotificationToUi,
  mapApiNotificationToUi,
  type NotificationMetadata,
  type UiNotificationItem,
} from "@/libs/notifications"
import { ensureDevAuth } from "@/src/lib/api/dev-login"
import { respondToContract } from "@/src/lib/api/contracts"
import NotificationsAPI, {
  isTransientNotificationsApiError,
} from "@/service/http/notifications"
import { UserAPI } from "@/service/http/user"
import { ROLE } from "@/types/user"
import { cn } from "@/utils/functions"
import {
  BarChart2,
  Bell,
  ChevronDown,
  CoinStack,
  FileCheck02,
  LayoutGrid02,
  LifeBuoy,
  List,
  LogOut,
  Monitor,
  Plus,
  Repeat,
  SearchMd,
  Settings,
  Star,
  User,
  Users,
  X,
} from "@blend-metrics/icons"
import { Campaigns, Logo3, Project, Talent } from "@/components/icons"
import { InviteWindowTrigger } from "@/components/invite-window"
import { CounterOfferDialog } from "@/components/counter-offer-dialog"
import {
  OfferFlowDialog,
  type OfferFlowDialogVariant,
} from "@/components/offer-flow-dialog"
import NextLink from "@/components/next-link"
import { ThreeHorizontalLines } from "@/components/three-horizontal-lines"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  ComboboxTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScaleOutIn,
  ScrollArea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui"
import { ScrollBar } from "@/components/ui"
import { useNotificationChannel } from "@/utils/useNotificationChannel"
import {
  useInboxThreads,
  type InboxThreadSummary,
} from "@/utils/useInboxThreads"

const OFFER_NOTIFICATION_EVENT = "contract.offer.received"

const readMetadataString = (
  metadata: NotificationMetadata,
  key: string
) => {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined
}

const ensureUsernameHandle = (value?: string) => {
  if (!value) return undefined
  return value.startsWith("@") ? value : `@${value}`
}

const formatOfferDate = (value?: string, fallback?: string) => {
  if (!value) return fallback

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return fallback

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const formatOfferStartDate = (value?: string, fallback?: string) => {
  if (!value) return fallback

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return fallback

  const day = parsed.getDate()
  const remainder = day % 10
  const suffix =
    day >= 11 && day <= 13
      ? "th"
      : remainder === 1
        ? "st"
        : remainder === 2
          ? "nd"
          : remainder === 3
            ? "rd"
            : "th"

  return `${parsed.toLocaleDateString("en-US", {
    month: "short",
  })} ${day}${suffix}, ${parsed.getFullYear()}`
}

const getOfferNotificationDetails = (item: UiNotificationItem) => {
  const metadata = item.metadata
  const senderUsername =
    ensureUsernameHandle(readMetadataString(metadata, "senderUsername")) ||
    ensureUsernameHandle(item.title.match(/@[\w.]+/)?.[0]) ||
    "@lauradesign21"
  const senderDisplayName =
    readMetadataString(metadata, "senderDisplayName") || "Offer from"
  const offerTitle =
    readMetadataString(metadata, "offerTitle") ||
    readMetadataString(metadata, "projectTitle") ||
    "The Ultimate Mobile App Experience"
  const receivedLabel =
    formatOfferDate(
      readMetadataString(metadata, "receivedAt") || undefined,
      formatOfferDate(new Date().toISOString(), "Feb 1, 2025")
    ) || "Feb 1, 2025"
  const expiresLabel =
    formatOfferDate(
      readMetadataString(metadata, "expiresAt") || undefined,
      "Sep 19, 2025"
    ) || "Sep 19, 2025"

  return {
    contractId: readMetadataString(metadata, "contractId"),
    senderUsername,
    senderDisplayName,
    offerType: readMetadataString(metadata, "offerType") || "Project",
    receivedLabel,
    offerTitle,
    viewJobHref:
      readMetadataString(metadata, "jobHref") ||
      readMetadataString(metadata, "projectHref") ||
      item.href ||
      "/inbox",
    messageHref:
      readMetadataString(metadata, "messageHref") || "/inbox",
    offerRate: readMetadataString(metadata, "offerRate") || "$45/hr",
    role: readMetadataString(metadata, "role") || "UX Designer",
    duration: readMetadataString(metadata, "duration") || "4 Months",
    schedule:
      readMetadataString(metadata, "scheduleLabel") ||
      readMetadataString(metadata, "schedule") ||
      "Full Time over 30 hrs/week",
    startDate:
      formatOfferStartDate(
        readMetadataString(metadata, "startDate") || undefined,
        "Feb 5th, 2025"
      ) || "Feb 5th, 2025",
    expiresLabel,
  }
}

const Notifications = () => {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [offerDialogOpen, setOfferDialogOpen] = useState(false)
  const [offerDialogMode, setOfferDialogMode] = useState<
    "details" | "accept" | "decline" | "counter"
  >("details")
  const [selectedOfferNotification, setSelectedOfferNotification] =
    useState<UiNotificationItem | null>(null)
  const [offerAcceptanceNote, setOfferAcceptanceNote] = useState("")
  const [offerTermsAccepted, setOfferTermsAccepted] = useState(false)
  const [offerDeclineNote, setOfferDeclineNote] = useState("")
  const [offerDeclineReason, setOfferDeclineReason] = useState("")
  const [offerActionLoading, setOfferActionLoading] = useState<
    "accept" | "decline" | null
  >(null)
  const [activeTab, setActiveTab] = useState<"Notifications" | "Messages">(
    "Notifications"
  )
  const [allNotifications, setAllNotifications] = useState<UiNotificationItem[]>([])
  const [unreadBadgeCount, setUnreadBadgeCount] = useState(0)
  const {
    threads: inboxThreads,
    totalUnread: inboxTotalUnread,
    loading: inboxLoading,
  } = useInboxThreads()

  const loadNotifications = useCallback(async (allowSeed = true) => {
    try {
      setLoading(true)

      if (process.env.NODE_ENV !== "production") {
        await ensureDevAuth()
      }

      const response = await NotificationsAPI.list({ limit: 8 })
      const items: UiNotificationItem[] = Array.isArray(response?.data?.data)
        ? response.data.data.map(mapApiNotificationToUi)
        : []

      if (
        allowSeed &&
        items.length === 0 &&
        process.env.NEXT_PUBLIC_ENV === "development" &&
        typeof NotificationsAPI.seedDev === "function"
      ) {
        await NotificationsAPI.seedDev()
        return loadNotifications(false)
      }

      setAllNotifications(items)
      setUnreadBadgeCount(items.filter((item) => !item.read).length)
    } catch (error) {
      if (!isTransientNotificationsApiError(error)) {
        console.error("Failed to load header notifications:", error)
      }
      setAllNotifications([])
      setUnreadBadgeCount(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  useEffect(() => {
    if (!open) return
    loadNotifications(false)
  }, [open, loadNotifications])

  useNotificationChannel({
    onNotificationNew: (payload) => {
      const nextItem = mapAblyNotificationToUi(payload)

      setAllNotifications((prev) => {
        const deduped = prev.filter((item) => item.id !== nextItem.id)
        return [nextItem, ...deduped].slice(0, 8)
      })
      setUnreadBadgeCount((prev) => prev + 1)
      setActiveTab("Messages")
    },
    onBadgeCount: ({ unreadCount }) => {
      setUnreadBadgeCount(unreadCount)
    },
  })

  const selectedOfferDetails = selectedOfferNotification
    ? getOfferNotificationDetails(selectedOfferNotification)
    : null
  const resetOfferDialogState = useCallback(() => {
    setOfferDialogMode("details")
    setOfferAcceptanceNote("")
    setOfferTermsAccepted(false)
    setOfferDeclineNote("")
    setOfferDeclineReason("")
    setOfferActionLoading(null)
  }, [])
  const offerDialogVariant: OfferFlowDialogVariant =
    offerDialogMode === "details"
      ? "offer-details"
      : offerDialogMode === "accept"
        ? offerAcceptanceNote.trim().length > 0 && offerTermsAccepted
          ? "accept-offer-ready"
          : "accept-offer-empty"
        : offerDeclineNote.trim().length > 0 || offerDeclineReason.trim().length > 0
          ? "decline-offer-ready"
          : "decline-offer-empty"

  const markNotificationRead = async (item: UiNotificationItem) => {
    try {
      if (!item.read) {
        await NotificationsAPI.markRead(item.id)
        setAllNotifications((prev) =>
          prev.map((notification) =>
            notification.id === item.id
              ? { ...notification, read: true }
              : notification
          )
        )
        setUnreadBadgeCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      if (!isTransientNotificationsApiError(error)) {
        console.error(`Failed to mark notification ${item.id} as read:`, error)
      }
    }
  }

  const handleOfferResponse = async (accepted: boolean) => {
    const details = selectedOfferNotification
      ? getOfferNotificationDetails(selectedOfferNotification)
      : null

    if (!selectedOfferNotification || !details?.contractId || !user?.id) {
      setOfferDialogOpen(false)
      return
    }

    setOfferActionLoading(accepted ? "accept" : "decline")

    try {
      const response = await respondToContract(details.contractId, {
        accepted,
        talentId: user.id,
      })

      if (response) {
        setOfferDialogOpen(false)
        setSelectedOfferNotification(null)
        resetOfferDialogState()
        await loadNotifications(false)
      }
    } finally {
      setOfferActionLoading(null)
    }
  }

  const handleNotificationClick = async (item: UiNotificationItem) => {
    await markNotificationRead(item)

    if (item.event === OFFER_NOTIFICATION_EVENT) {
      setSelectedOfferNotification(item)
      resetOfferDialogState()
      setOpen(false)
      setOfferDialogOpen(true)
      return
    }

    router.push(item.href)
  }

  const handleInboxThreadClick = (thread: InboxThreadSummary) => {
    setOpen(false)
    router.push(`/inbox?thread=${thread.id}`)
  }

  const renderInboxThreadItem = (thread: InboxThreadSummary) => {
    const timeLabel = thread.lastMessageAt
      ? formatNotificationTime(thread.lastMessageAt)
      : ""
    return (
      <button
        key={thread.id}
        type="button"
        className="w-full text-left hover:bg-gray-100 rounded-lg flex py-2.5 px-3 items-start gap-x-3 transition-colors"
        onClick={() => handleInboxThreadClick(thread)}
      >
        <Avatar size="md">
          {thread.displayAvatarUrl ? (
            <AvatarImage src={thread.displayAvatarUrl} alt={thread.displayName} />
          ) : null}
          <AvatarFallback>{thread.displayInitial}</AvatarFallback>
        </Avatar>

        <div className="flex-auto min-w-0">
          <div className="flex items-center justify-between gap-x-3">
            <div
              className={cn(
                "text-sm leading-[16.94px] text-dark-blue-400 truncate",
                thread.hasUnread ? "font-bold" : "font-semibold",
              )}
            >
              {thread.displayName}
            </div>
            <div className="flex items-center gap-x-2 shrink-0">
              {timeLabel ? (
                <span className="text-xs leading-[14.06px] text-[#585C65] whitespace-nowrap">
                  {timeLabel}
                </span>
              ) : null}
              {thread.unreadCount > 0 ? (
                <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-semibold text-white">
                  {thread.unreadCount > 99 ? "99+" : thread.unreadCount}
                </span>
              ) : null}
            </div>
          </div>
          <div
            className={cn(
              "mt-1 text-sm leading-[16.94px] truncate",
              thread.hasUnread ? "text-dark-blue-400 font-medium" : "text-gray-700",
            )}
          >
            {thread.lastMessagePreview}
          </div>
        </div>
      </button>
    )
  }

  const renderNotificationItem = (
    item: UiNotificationItem,
    showCategory: boolean
  ) => {
    const accent =
      item.kind === "project"
        ? {
            label: "Project",
            className: "bg-[#FEF3F2] text-[#B42318]",
            icon: FileCheck02,
          }
        : item.kind === "team"
          ? {
              label: "Team",
              className: "bg-[#ECFDF3] text-[#027A48]",
              icon: Users,
            }
          : item.kind === "message"
            ? {
                label: "Message",
                className: "bg-primary-50 text-primary-500",
                icon: User,
              }
            : {
                label: "System",
                className: "bg-[#EEF4FF] text-[#3538CD]",
                icon: Bell,
              }

    const AccentIcon = accent.icon

    return (
      <button
        key={item.id}
        type="button"
        className="w-full text-left hover:bg-gray-100 rounded-lg flex py-2.5 px-3 items-start gap-x-3 transition-colors"
        onClick={() => handleNotificationClick(item)}
      >
        {item.isUserNotification ? (
          <Avatar size="md" isOnline>
            <AvatarImage src={item.avatarSrc} alt={item.avatarAlt} />
            <AvatarFallback>{item.title.slice(0, 1)}</AvatarFallback>
          </Avatar>
        ) : (
          <span
            className={cn(
              "inline-flex size-10 shrink-0 items-center justify-center rounded-full",
              accent.className
            )}
          >
            <AccentIcon className="size-[18px]" />
          </span>
        )}

        <div className="flex-auto min-w-0">
          <div className="flex items-center justify-between gap-x-3">
            <div className="min-w-0">
              {showCategory ? (
                <span
                  className={cn(
                    "mb-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
                    accent.className
                  )}
                >
                  {accent.label}
                </span>
              ) : null}
              <div className="text-sm leading-[16.94px] font-semibold text-dark-blue-400 truncate">
                {item.title}
              </div>
            </div>

            <span className="text-xs leading-[14.06px] text-[#585C65] whitespace-nowrap">
              {item.timeLabel}
            </span>
          </div>

          <div className="mt-1 text-sm leading-[16.94px] text-gray-700">
            {item.description}
          </div>
          <div className="mt-2 text-xs font-semibold text-primary-500">
            {item.ctaLabel}
          </div>
        </div>
      </button>
    )
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <IconButton
            className="rounded-full"
            size="md"
            variant="ghost"
            visual="gray"
          >
            <Bell className="size-[18px]" />
          </IconButton>
        </PopoverTrigger>
        <PopoverContent
          className="w-[370px] bg-white border border-gray-100 rounded-lg shadow-[0px_12px_16px_-4px_rgba(16,24,40,.08)]"
          align="end"
        >
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "Notifications" | "Messages")}>
            <TabsList className="w-full">
              <TabsTrigger value="Notifications">
                Notifications
                <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gray-100 text-[10px] leading-[18px] text-gray-500 group-data-[state=active]:bg-primary-50 group-data-[state=active]:text-primary-500">
                  {unreadBadgeCount}
                </span>
              </TabsTrigger>
              <TabsTrigger value="Messages">
                Messages
                <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gray-100 text-[10px] leading-[18px] text-gray-500 group-data-[state=active]:bg-primary-50 group-data-[state=active]:text-primary-500">
                  {inboxTotalUnread > 99 ? "99+" : inboxTotalUnread}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="Notifications">
              <div className="py-3 border-b border-gray-100 flex flex-col gap-y-1">
                <ScrollArea
                  className="h-[328px]"
                  scrollBar={<ScrollBar className="w-4 px-1" />}
                >
                  <div className="px-2">
                    {loading ? (
                      <div className="px-3 py-6 text-sm text-gray-500">
                        Loading notifications...
                      </div>
                    ) : allNotifications.length > 0 ? (
                      allNotifications.map((item) => renderNotificationItem(item, false))
                    ) : (
                      <div className="px-3 py-6 text-sm text-gray-500">
                        No notifications to show
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="py-3.5 grid">
                <button className="focus-visible:outline-none text-[13px] leading-[13.3px] text-gray-500 hover:underline font-medium" onClick={() => router.push("/notifications")}>
                  View All
                </button>
              </div>
            </TabsContent>
            <TabsContent value="Messages">
              <div className="py-3 border-b border-gray-100 flex flex-col gap-y-1">
                <ScrollArea
                  className="h-[328px]"
                  scrollBar={<ScrollBar className="w-4 px-1" />}
                >
                  <div className="px-2">
                    {(() => {
                      const unreadThreads = inboxThreads.filter(
                        (t) => t.hasUnread,
                      )
                      if (inboxLoading && inboxThreads.length === 0) {
                        return (
                          <div className="px-3 py-6 text-sm text-gray-500">
                            Loading messages...
                          </div>
                        )
                      }
                      if (unreadThreads.length === 0) {
                        return (
                          <div className="px-3 py-6 text-sm text-gray-500">
                            No unread messages
                          </div>
                        )
                      }
                      return unreadThreads
                        .slice(0, 8)
                        .map(renderInboxThreadItem)
                    })()}
                  </div>
                </ScrollArea>
              </div>
              <div className="py-3.5 grid">
                <button
                  className="focus-visible:outline-none text-[13px] leading-[13.3px] text-gray-500 hover:underline font-medium"
                  onClick={() => {
                    setOpen(false)
                    router.push("/inbox")
                  }}
                >
                  View All
                </button>
              </div>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>

      {selectedOfferDetails && offerDialogMode !== "counter" ? (
        <OfferFlowDialog
          open={offerDialogOpen}
          onOpenChange={(nextOpen) => {
            setOfferDialogOpen(nextOpen)
            if (!nextOpen) {
              setSelectedOfferNotification(null)
              resetOfferDialogState()
            }
          }}
          variant={offerDialogVariant}
          data={selectedOfferDetails}
          acceptanceMessage={offerAcceptanceNote}
          termsAccepted={offerTermsAccepted}
          declineMessage={offerDeclineNote}
          selectedDeclineReason={offerDeclineReason}
          acceptLoading={offerActionLoading === "accept"}
          declineLoading={offerActionLoading === "decline"}
          onAcceptanceMessageChange={setOfferAcceptanceNote}
          onTermsAcceptedChange={setOfferTermsAccepted}
          onDeclineMessageChange={setOfferDeclineNote}
          onDeclineReasonChange={setOfferDeclineReason}
          onViewJob={() => router.push(selectedOfferDetails.viewJobHref)}
          onMessage={() => {
            setOfferDialogOpen(false)
            setSelectedOfferNotification(null)
            resetOfferDialogState()
            router.push(selectedOfferDetails.messageHref)
          }}
          onCounterOffer={() => setOfferDialogMode("counter")}
          onDecline={() => {
            if (offerDialogMode === "decline") {
              void handleOfferResponse(false)
              return
            }
            setOfferDialogMode("decline")
          }}
          onAccept={() => {
            if (offerDialogMode === "details") {
              setOfferDialogMode("accept")
              return
            }
            void handleOfferResponse(true)
          }}
          onCancelAccept={() => setOfferDialogMode("details")}
          onCancelDecline={() => setOfferDialogMode("details")}
        />
      ) : null}

      {selectedOfferDetails && offerDialogMode === "counter" ? (
        <CounterOfferDialog
          open={offerDialogOpen}
          onOpenChange={(nextOpen) => {
            setOfferDialogOpen(nextOpen)
            if (!nextOpen) {
              setSelectedOfferNotification(null)
              resetOfferDialogState()
            }
          }}
          variant="default"
          data={selectedOfferDetails}
          onCancel={() => setOfferDialogMode("details")}
          onReview={() => {}}
        />
      ) : null}
    </>
  )
}

const options = [
  {
    value: "$1,540",
    currencyCode: "USD",
  },
  {
    value: "$1,440",
    currencyCode: "USD",
  },
  {
    value: "$1,340",
    currencyCode: "USD",
  },
  {
    value: "$1,240",
    currencyCode: "USD",
  },
]

const [{ value: defaultValue }] = options

// Fixed "Browse ..." suggestions shown in the empty-state dropdown.
// `route` marks these as navigation targets — the Combobox onChange handler
// routes to `route` instead of treating `value` as a search term.
//
// Routes point at the dedicated L1 browse pages restored from
// `archive/backup_old_structure/level-1/` into the app routing tree.
const fixedSuggestions: Array<{
  id: number
  icon: React.JSXElementConstructor<any>
  value: string
  route: string
}> = [
  { id: 1, icon: Talent, value: "Browse Talent", route: "/talent" },
  { id: 2, icon: Project, value: "Browse Projects", route: "/projects" },
  { id: 3, icon: Campaigns, value: "Browse Services", route: "/services" },
  { id: 4, icon: Users, value: "Browse Teams", route: "/teams" },
  { id: 5, icon: SearchMd, value: "Find Jobs", route: "/find-jobs" },
]

const suggestions = [
  { id: 1, value: "UX Architect" },
  { id: 2, value: "Bulma developer" },
  { id: 3, value: "React" },
  { id: 4, value: "Golang framework" },
  { id: 5, value: "Mobile applications" },
  { id: 6, value: "Magento development" },
]

const listingTypes = ["Projects", "Services", "Talent", "Teams", "Jobs"]

const SearchBar = () => {
  const router = useRouter()
  const pathname = usePathname()
  const [state, setState] = useState<string>()
  const [selected, setSelected] = React.useState<{
    id: number
    value: string
    icon?: React.JSXElementConstructor<any>
    route?: string
  }>()
  const [query, setQuery] = React.useState("")
  // Nonce used as `key` on the Combobox wrapper. Incrementing it forces
  // Headless UI to unmount/remount, which reliably resets its internal open
  // state. Used to force-close the dropdown after a search submit even when
  // the keyword hasn't changed (router.push to same URL is a no-op).
  const [resetNonce, setResetNonce] = React.useState(0)
  // Ref to the hidden ComboboxButton so we can click-through from the input
  // and explicitly open the dropdown on focus/click (industry standard).
  const openButtonRef = React.useRef<HTMLButtonElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Industry-standard behavior (Amazon/Upwork/Fiverr):
  //  • On /search → show the active query term in the bar (from ?q=)
  //  • On any other route → clear the bar so the next search starts fresh
  const searchParamsHook = useSearchParams()
  React.useEffect(() => {
    if (pathname?.startsWith("/search")) {
      const qParam = searchParamsHook?.get("q") ?? ""
      setQuery(qParam)
      // Mirror into `selected` so Headless UI's displayValue renders the term
      setSelected(qParam ? { id: -1, value: qParam } : undefined)
    } else {
      setQuery("")
      setSelected(undefined)
    }
  }, [pathname, searchParamsHook])

  // Imperative flag set while submitting a search, so `onFocus` knows not
  // to re-open the combobox during the final blur/navigation step.
  const submittingRef = React.useRef(false)

  const closeDropdown = () => {
    // Force-close by remounting the Combobox via a key change. This is the
    // only reliable way to close when the search URL doesn't change (e.g.
    // user hits Enter with the same keyword — router.push is a no-op, so
    // effect-based closes never fire). The remount also resets Headless
    // UI's internal focus/active-index state.
    submittingRef.current = true
    inputRef.current?.blur()
    setResetNonce((n) => n + 1)
    // Release the re-open guard flag after React flushes the remount.
    setTimeout(() => {
      submittingRef.current = false
    }, 300)
  }

  const submitSearch = (term: string) => {
    const trimmed = term.trim()
    if (!trimmed) return
    const params = new URLSearchParams()
    params.set("q", trimmed)
    if (state) params.set("category", state.toLowerCase())
    closeDropdown()
    router.push(`/search?${params.toString()}`)
  }

  const searchPlaceholder = (() => {
    switch (state) {
      case "Projects": return "Search by skills or project type"
      case "Services": return "Search by skills or service type"
      case "Teams": return "Search by skills or team type"
      case "Talent": return "Search by skills or expertise"
      default: return "Search by skills or keyword"
    }
  })()

  // Live autocomplete from backend — debounced at 250ms, hits
  // /autocomplete/{type}. Falls back to /public/mock/{type}.json on error.
  // Type depends on the category selector: Talent/Projects → job_titles,
  // Teams/Services → skills, default (All) → skills.
  const autocompleteType = (() => {
    switch (state) {
      case "Talent":
      case "Projects":
        return "job_titles"
      case "Teams":
      case "Services":
        return "skills"
      default:
        return "skills"
    }
  })()

  const { suggestions: liveSuggestions } = useAutocomplete(
    autocompleteType,
    query
  )

  const filteredSuggestions = React.useMemo(() => {
    if (Array.isArray(liveSuggestions) && liveSuggestions.length > 0) {
      return liveSuggestions.slice(0, 10).map((s: any, i: number) => ({
        id: typeof s?.id === "number" ? s.id : i + 1000,
        value: s?.label ?? s?.value ?? String(s),
      }))
    }
    // Static fallback: preserves the previous UX when the API is unreachable
    return query === ""
      ? suggestions
      : suggestions.filter((industry) =>
          industry.value
            .toLowerCase()
            .replace(/\s+/g, "")
            .includes(query.toLowerCase().replace(/\s+/g, ""))
        )
  }, [liveSuggestions, query])

  // Only clear the input text when the dropdown closes after an explicit
  // submit. Switching the category Listbox also triggers afterLeave — we
  // must NOT erase the user's query in that case. (Amazon, Upwork, Google
  // all preserve the search term when toggling the category selector.)
  const reset = () => {
    if (submittingRef.current) {
      setQuery("")
    }
  }

  return (
    <Combobox
      key={resetNonce}
      className="group/root w-auto flex-auto"
      value={selected}
      onChange={(value: { id: number; value: string; icon?: React.JSXElementConstructor<any>; route?: string }) => {
        if (!value) return
        // Fixed "Browse ..." items have a route — navigate instead of searching.
        if (value.route) {
          closeDropdown()
          setSelected(undefined)
          router.push(value.route)
          return
        }
        if (value.value) {
          submitSearch(value.value)
          // Do NOT persist the selected object — pathname effect will reset
          // on the next route, and we want the bar to show the term via the
          // pathname-synced query instead.
          setSelected(undefined)
        }
      }}
    >
      {({ open }) => (
      <>
      {/* Amazon-style page overlay: when the search combobox is open, dim
          the rest of the page so focus is entirely on the search. Rendered
          via portal to document.body so it escapes the header's stacking
          context, allowing z-40 to sit cleanly below the z-50 sticky nav. */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/40 z-40 pointer-events-none animate-in fade-in duration-150"
            aria-hidden="true"
          />,
          document.body
        )}
      <ComboboxTrigger className="relative z-50 flex h-[34px] lg:h-10 rounded-[5px] items-center gap-x-3 border border-gray-300 bg-white ui-open:rounded-b-none py-[7px] lg:py-2 pl-2.5 pr-3 lg:px-3">
        <div className="flex items-center gap-x-2 flex-auto">
          <SearchMd className="size-4 shrink-0 text-gray-400" />
          <ComboboxInput
            ref={inputRef}
            placeholder={searchPlaceholder}
            className="p-0 border-0 text-xs leading-5 h-auto rounded-none hover:ring-0 hover:border-gray-300 focus:ring-0 focus:border-gray-300 ui-open:rounded-b-none"
            size="lg"
            displayValue={(value: {
              id: number
              value: string
              icon?: React.JSXElementConstructor<any>
            }) => value?.value ?? ""}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => {
              // Open the dropdown the moment the user focuses the input
              // (industry-standard behavior — Amazon, Upwork, Fiverr all do this).
              // Guard against double-firing: only click the hidden trigger if
              // the options aren't already open, otherwise we'd toggle it shut.
              // Also skip if we're in the middle of submitting a search, so
              // the dropdown doesn't reopen right as it's closing.
              if (submittingRef.current) return
              const btn = openButtonRef.current
              if (btn && btn.getAttribute("aria-expanded") !== "true") {
                btn.click()
              }
            }}
            onKeyDownCapture={(e: React.KeyboardEvent<HTMLInputElement>) => {
              // Capture-phase so we intercept Enter before Headless UI's own
              // keydown handler tries to "select the highlighted option"
              // (which would otherwise swallow the event when nothing is
              // highlighted, or submit the wrong term if something is).
              if (e.key === "Enter") {
                e.preventDefault()
                e.stopPropagation()
                submitSearch(query)
              } else if (e.key === "Escape") {
                // Standard: Escape clears the input without submitting
                setQuery("")
                setSelected(undefined)
              }
            }}
          />
          {/* Hidden trigger — gives clicking/focusing the input the ability
              to open the Headless UI Combobox popover. */}
          <ComboboxButton
            ref={openButtonRef}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>
        <span className="w-px h-4 shrink-0 inline-block bg-gray-200" />
        <Listbox className="w-auto" value={state} onChange={setState}>
          <ListboxButton
            className="p-0 border-0 text-[11px] leading-[16.67px] lg:text-sm lg:leading-5 font-semibold gap-x-[6.67px] lg:gap-x-1.5 w-auto h-auto rounded-none hover:ring-0 focus:ring-0"
            placeholder="View All"
            iconClassName="size-[12.5px]"
          />
          <ListboxOptions
              className="w-[160px] -right-3 left-auto mt-3.5 rounded-lg border border-gray-100 shadow-lg overflow-hidden"
              viewportClassName="max-h-none"
              wrapperClassName="p-1 space-y-0"
            >
            {listingTypes.map((type) => (
              <ListboxOption
                key={type}
                value={type}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 ui-active:bg-gray-50"
              >
                {type}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Listbox>
      </ComboboxTrigger>
      <ScaleOutIn afterLeave={reset}>
        <ComboboxOptions className="px-0 mt-0 space-y-0 border border-gray-300 border-t-0 rounded-t-none bg-white">
          {query === "" ? (
            <>
              {/* Empty state: fixed "Browse ..." suggestions + Recent Searches */}
              <div className="p-3">
                {fixedSuggestions.map((fixedSuggestion) => (
                  <ComboboxOption
                    key={fixedSuggestion.id}
                    value={fixedSuggestion}
                    className="text-xs flex items-center gap-x-3 leading-[13.3px] text-gray-400"
                  >
                    <fixedSuggestion.icon className="size-5" />
                    {fixedSuggestion.value}
                  </ComboboxOption>
                ))}
              </div>

              <div className="space-y-1 p-3 border-t border-gray-100">
                <div className="px-3 flex items-center justify-between">
                  <h1 className="text-[13px] leading-6 font-semibold text-dark-blue-400">
                    Recent Searches
                  </h1>

                  <Button
                    className="opacity-50 hover:opacity-100"
                    variant="link"
                    visual="gray"
                  >
                    Clear Search History
                  </Button>
                </div>
                <ScrollArea viewportClassName="max-h-[360px]">
                  {suggestions.map((suggestion) => (
                    <ComboboxOption key={suggestion.id} value={suggestion}>
                      {suggestion.value}
                    </ComboboxOption>
                  ))}
                </ScrollArea>
              </div>
            </>
          ) : (
            /* Typing state: live autocomplete matches only */
            <div className="p-3">
              <ScrollArea viewportClassName="max-h-[360px]">
                {filteredSuggestions.length > 0 ? (
                  filteredSuggestions.map((suggestion) => (
                    <ComboboxOption key={suggestion.id} value={suggestion}>
                      {suggestion.value}
                    </ComboboxOption>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-gray-400">
                    No matches
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </ComboboxOptions>
      </ScaleOutIn>
      </>
      )}
    </Combobox>
  )
}

const PATHNAMES = ["/talent-dashboard", "/client-dashboard", "/talent-profile"]

// Pages that have a secondary nav bar below the primary nav — shadow should only appear on the secondary nav, not the primary
const HAS_SECONDARY_NAV = ["/", "/talent-profile", "/my-team", "/favorite-projects", "/favorite-talent", "/browser-history", "/search", "/talent-search", "/projects", "/services", "/teams", "/talent", "/find-jobs"]

const ONBOARDING = "/onboarding"

export const TopMostHeader = ({ showShadow = true }: { showShadow?: boolean }) => {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [secondaryNavHidden, setSecondaryNavHidden] = React.useState(false)

  const router = useRouter()
  const { logoutHandler, user, setUser } = useAuth()

  // Job details pages use the same marketplace secondary nav shell as the
  // homepage/category surfaces, so the primary header must coordinate with it.
  const hasSecondaryNav =
    HAS_SECONDARY_NAV.includes(pathname) ||
    pathname.startsWith("/c/") ||
    pathname.startsWith("/project-details/") ||
    pathname.startsWith("/job-details/")

  // Listen for secondary nav visibility changes
  React.useEffect(() => {
    if (!hasSecondaryNav) return
    const observer = new MutationObserver(() => {
      const val = document.documentElement.dataset.secondaryNav
      setSecondaryNavHidden(val === "hidden")
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-secondary-nav"] })
    return () => observer.disconnect()
  }, [hasSecondaryNav])

  if (pathname.startsWith(ONBOARDING)) {
    return null
  }

  // Show shadow: always on pages without secondary nav, or when secondary nav is hidden (scrolled away)
  const showNavShadow = !hasSecondaryNav || secondaryNavHidden

  return (
      <div
        className={cn(
        // Keep the primary nav pinned to the viewport so iOS/macOS overscroll
        // bounce only affects page content, not the header itself.
        "fixed inset-x-0 top-0 px-3.5 md:px-6 lg:px-[50px] bg-white flex flex-col xs:max-md:pt-1 xs:max-md:pb-3.5 z-50",
        showNavShadow
          ? "shadow-[0px_1px_3px_0px_rgba(16,24,40,.1)]"
          : "shadow-[0px_1px_3px_0px_rgba(16,24,40,.1)] md:shadow-none",
        PATHNAMES.includes(pathname) && "md:max-lg:pb-2.5"
      )}
    >
      <div className="flex items-center justify-between md:gap-x-3 lg:gap-x-[50px] md:pt-2 md:pb-1 lg:py-3">
        <NextLink className="focus-visible:outline-none" href="/">
          <Logo3 className="h-[14.25px] w-[97px] lg:w-[128px] lg:h-[18.81px]" />
        </NextLink>

        <div className="flex flex-auto gap-x-3 xs:max-lg:ml-3 xs:max-md:hidden">
          <SearchBar />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="gap-x-2 xs:max-lg:h-[34px] xs:max-lg:px-[12.6px] xs:max-lg:py-[7.2px] bg-white"
                visual="gray"
                variant="outlined"
                size="md"
              >
                <span className="inline-flex items-center gap-x-[7.2px] lg:gap-x-1 text-[12.6px] leading-5 lg:text-base lg:leading-6 font-light">
                  <span className="font-semibold">$ 1,540</span> USD
                </span>
                <ChevronDown className="text-gray-500 size-[13.5px] lg:size-[15px]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[174px]">
              <DropdownMenuItem onSelect={() => router.push("/add-funds")}>
                <Plus className="size-4" /> Add Funds
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push("/transfer-funds")}>
                <Repeat className="size-4" /> Transfer Funds
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center">
          <div className="flex items-center gap-x-1">
            <InviteWindowTrigger asChild>
              <IconButton
                className="rounded-full"
                size="md"
                variant="ghost"
                visual="gray"
              >
                <Plus className="size-[18px]" />
              </IconButton>
            </InviteWindowTrigger>
            <Notifications />
            <IconButton
              className="rounded-full lg:hidden"
              size="md"
              variant="ghost"
              visual="gray"
            >
              <ThreeHorizontalLines className="text-dark-blue-400" />
            </IconButton>
          </div>

          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger className="hidden lg:inline-flex items-center gap-x-2 px-3 py-1.5 rounded-[8px] hover:bg-gray-100 focus-visible:outline-none">
              <div className="inline-flex items-center gap-x-2">
                <Avatar>
                  <AvatarImage
                    src={user?.avatarUrl ?? ""}
                    alt={user?.firstName ?? "User"}
                  />
                  <AvatarFallback suppressHydrationWarning>
                    {user?.firstName?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold leading-[15px] text-gray-700" suppressHydrationWarning>
                    {`${user?.firstName || ""} ${user?.lastName || ""}`.trim()}
                  </span>
                  <span className="text-[9px] leading-[14px] text-gray-500" suppressHydrationWarning>
                    {user?.email}
                  </span>
                </div>
              </div>

              <ChevronDown className="size-4 shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[278px]">
              <DropdownMenuLabel className="font-normal" size="md">
                <div className="flex flex-col gap-y-2">
                  <div className="flex flex-col">
                    <span className="text-xs leading-5 text-gray-700">
                      User ID: 2459749
                    </span>
                    <span className="text-[13px] leading-5 text-primary-500" suppressHydrationWarning>
                      {user?.email}
                    </span>
                  </div>

                  <Button className="w-full" onClick={() => { setMenuOpen(false); router.push("/settings") }}>My Account</Button>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => { setMenuOpen(false); router.push("/talent-profile") }}>
                <User className="size-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { setMenuOpen(false); router.push(user?.accountType === "TALENT" ? "/talent-dashboard" : "/client-dashboard") }}>
                <LayoutGrid02 className="size-4" />
                My Dashboard
              </DropdownMenuItem>
              {user?.accountType === "TALENT" && (
                <DropdownMenuItem onSelect={() => { setMenuOpen(false); router.push("/my-listings") }}>
                  <List className="size-4" />
                  My Listings
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => { setMenuOpen(false); router.push("/my-contracts") }}>
                <FileCheck02 className="size-4" />
                My Contracts
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { setMenuOpen(false); router.push("/my-team") }}>
                <Users className="size-4" />
                My Team
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { setMenuOpen(false); router.push("/favorites") }}>
                <Star className="size-4" />
                My Favorites
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { setMenuOpen(false); router.push("/billing") }}>
                <CoinStack className="size-4" />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { setMenuOpen(false); router.push("/settings") }}>
                <Settings className="size-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={async () => {
                setMenuOpen(false)
                const newType = user?.accountType === "TALENT" ? "client" : "talent"
                const newDashboard = newType === "client" ? "/client-dashboard" : "/talent-dashboard"
                // Optimistically update local user so the dropdown label flips immediately,
                // even if the backend doesn't accept the userType change.
                setUser((prev) => prev ? { ...prev, userType: newType, accountType: newType === "talent" ? ROLE.TALENT : ROLE.CLIENT } : prev)
                if (user?.id) {
                  UserAPI.updateProfile(user.id, { userType: newType }).catch(() => {})
                }
                router.push(newDashboard)
              }}>
                <Repeat className="size-4" />
                {user?.accountType === "TALENT" ? "Switch to Client" : "Switch to Talent"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="grid grid-cols-2 gap-x-[9px]">
                <DropdownMenuItem>
                  <LifeBuoy className="size-4" />
                  Help Center
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => logoutHandler()}>
                  <LogOut className="size-4" />
                  Log out
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="md:hidden">
        <SearchBar />
      </div>
    </div>
  )
}
