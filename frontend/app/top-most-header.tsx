"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  hasCompletedClientOnboarding,
  hasCompletedTalentOnboarding,
  resolveDashboardRole,
  useAuth,
} from "@/contexts/auth"
import { useAutocomplete } from "@/libs/autocomplete"
import {
  type NotificationMetadata,
  type UiNotificationItem,
  formatNotificationTime,
  mapAblyNotificationToUi,
  mapApiNotificationToUi,
} from "@/libs/notifications"
import NotificationsAPI, {
  isTransientNotificationsApiError,
} from "@/service/http/notifications"
import { UserAPI } from "@/service/http/user"
import { persistActiveRole } from "@/src/lib/api/active-role"
import { getContract, respondToContract } from "@/src/lib/api/contracts"
import { jobDetailsUrl } from "@/src/lib/listing-urls"
import { cn } from "@/utils/functions"
import {
  type InboxThreadSummary,
  useInboxThreads,
} from "@/utils/useInboxThreads"
import { useNotificationChannel } from "@/utils/useNotificationChannel"
import {
  BarChart2,
  Bell,
  Briefcase02,
  ChevronDown,
  ClockRewind,
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
import { createPortal } from "react-dom"
import { ROLE } from "@/types/user"
import { AuthModal } from "@/components/auth/auth-modal"
import {
  CounterOfferDialog,
  type CounterOfferSubmissionData,
} from "@/components/counter-offer-dialog"
import { Campaigns, Logo3, Project, Talent } from "@/components/icons"
import { InviteWindowTrigger } from "@/components/invite-window"
import NextLink from "@/components/next-link"
import type { OfferDialogData } from "@/components/offer-dialog.types"
import {
  OfferFlowDialog,
  type OfferFlowDialogVariant,
} from "@/components/offer-flow-dialog"
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

const OFFER_NOTIFICATION_EVENT = "contract.offer.received"
const INVITE_NOTIFICATION_EVENT = "team.invitation.received"

// The panel is 370px wide and capped at 463px tall including the View All row.
// The chrome around the list (tab bar + paddings + View All) measures 112.3px,
// so this is the tallest the scroll viewport can be without busting that cap.
// It is a max, not a height: a short list hugs its content instead.
const NOTIFICATION_LIST_MAX_HEIGHT = 350

// The panel scrolls, so it lists everything the endpoint will hand back rather
// than an arbitrary handful. 100 is that endpoint's own hard ceiling, so asking
// for more is a no-op; anything older lives behind View All.
const NOTIFICATION_PANEL_LIMIT = 100
const OFFER_ACCEPTED_STORAGE_PREFIX = "inbox_offer_accepted"
const COUNTER_OFFER_STORAGE_PREFIX = "inbox_counter_offer_submitted"
const OFFER_DECLINED_STORAGE_PREFIX = "inbox_offer_declined"

const readMetadataString = (metadata: NotificationMetadata, key: string) => {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined
}

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

const getOfferJobHref = (
  metadata: NotificationMetadata,
  fallbackHref?: string
) => {
  const explicitHref =
    readMetadataString(metadata, "jobHref") ||
    readMetadataString(metadata, "jobUrl") ||
    readMetadataString(metadata, "projectHref") ||
    readMetadataString(metadata, "listingHref")
  if (explicitHref) return explicitHref

  const jobSlugOrId =
    readMetadataString(metadata, "jobSlug") ||
    readMetadataString(metadata, "jobId") ||
    readMetadataString(metadata, "listingSlug") ||
    readMetadataString(metadata, "listingId")
  if (jobSlugOrId) return jobDetailsUrl(jobSlugOrId)

  return fallbackHref?.includes("/job-details/") ? fallbackHref : "/find-jobs"
}

const withOfferView = (href: string) => {
  if (!href.includes("/job-details/")) return href

  const separator = href.includes("?") ? "&" : "?"
  return `${href}${separator}view=offer`
}

const normalizeInboxHref = (href: string) => {
  if (!href.startsWith("/inbox")) return href

  const [pathname, query = ""] = href.split("?")
  const params = new URLSearchParams(query)
  const legacyThreadId = params.get("thread")

  if (legacyThreadId && !params.get("threadId")) {
    params.set("threadId", legacyThreadId)
    params.delete("thread")
  }

  const normalizedQuery = params.toString()
  return normalizedQuery ? `${pathname}?${normalizedQuery}` : pathname
}

const getInboxHref = (href?: string) => {
  if (!href?.startsWith("/inbox")) return undefined
  return normalizeInboxHref(href)
}

const withAcceptedOfferState = (href: string, contractId?: string) => {
  try {
    const url = new URL(
      href,
      typeof window !== "undefined"
        ? window.location.origin
        : "https://localhost"
    )
    url.searchParams.set("offerStatus", "accepted")
    if (contractId) url.searchParams.set("contractId", contractId)
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    const separator = href.includes("?") ? "&" : "?"
    const contractParam = contractId
      ? `&contractId=${encodeURIComponent(contractId)}`
      : ""
    return `${href}${separator}offerStatus=accepted${contractParam}`
  }
}

const withDeclinedOfferState = (href: string, contractId?: string) => {
  try {
    const url = new URL(
      href,
      typeof window !== "undefined"
        ? window.location.origin
        : "https://localhost"
    )
    url.searchParams.set("offerStatus", "declined")
    if (contractId) url.searchParams.set("contractId", contractId)
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    const separator = href.includes("?") ? "&" : "?"
    const contractParam = contractId
      ? `&contractId=${encodeURIComponent(contractId)}`
      : ""
    return `${href}${separator}offerStatus=declined${contractParam}`
  }
}

const storeAcceptedOfferCard = (
  contractId: string | undefined,
  details: OfferDialogData,
  acceptanceMessage?: string
) => {
  if (!contractId || typeof window === "undefined") return

  sessionStorage.setItem(
    `${OFFER_ACCEPTED_STORAGE_PREFIX}:${contractId}`,
    JSON.stringify({
      status: "accepted",
      contractId,
      offerTitle: details.offerTitle,
      offerType: details.offerType,
      offerRate: details.offerRate,
      role: details.role,
      duration: details.duration,
      schedule: details.schedule,
      startDate: details.startDate,
      acceptanceMessage,
    })
  )
}

const storeDeclinedOfferCard = (
  contractId: string | undefined,
  details: OfferDialogData,
  declineMessage: string
) => {
  if (!contractId || typeof window === "undefined") return
  const declinedDetails = details as OfferDialogData & {
    senderAvatarSrc?: string
  }
  const declinedAt = new Date().toISOString()

  sessionStorage.setItem(
    `${OFFER_DECLINED_STORAGE_PREFIX}:${contractId}`,
    JSON.stringify({
      status: "declined",
      contractId,
      offerTitle: details.offerTitle,
      offerType: details.offerType,
      receivedLabel: details.receivedLabel,
      declinedAt,
      declinedLabel: details.receivedLabel,
      offerRate: details.offerRate,
      role: details.role,
      duration: details.duration,
      schedule: details.schedule,
      startDate: details.startDate,
      senderDisplayName: details.senderDisplayName,
      senderUsername: details.senderUsername,
      senderAvatarSrc: declinedDetails.senderAvatarSrc,
      declineMessage,
    })
  )
}

const storeCounterOfferCard = (
  contractId: string | undefined,
  details: OfferDialogData,
  counterOffer: CounterOfferSubmissionData
) => {
  if (!contractId || typeof window === "undefined") return

  sessionStorage.setItem(
    `${COUNTER_OFFER_STORAGE_PREFIX}:${contractId}`,
    JSON.stringify({
      status: "submitted",
      contractId,
      offerTitle: details.offerTitle,
      offerType: details.offerType,
      expiresLabel: details.expiresLabel,
      ...counterOffer,
    })
  )
}

const normalizeContactText = (value?: string) =>
  value?.trim().replace(/^@/, "").toLowerCase().replace(/\s+/g, " ")

const getOfferThreadHref = (
  threads: InboxThreadSummary[],
  senderUsername?: string,
  senderDisplayName?: string
) => {
  const normalizedUsername = normalizeContactText(senderUsername)
  const normalizedDisplayName = normalizeContactText(senderDisplayName)

  if (!normalizedUsername && !normalizedDisplayName) return undefined

  const thread = threads.find((candidate) => {
    const participantUsername = normalizeContactText(
      candidate.participantUsername
    )
    const displayName = normalizeContactText(candidate.displayName)
    const participantName = normalizeContactText(candidate.participantName)

    return (
      (!!normalizedUsername &&
        (participantUsername === normalizedUsername ||
          displayName === normalizedUsername ||
          participantName === normalizedUsername)) ||
      (!!normalizedDisplayName &&
        (displayName === normalizedDisplayName ||
          participantName === normalizedDisplayName))
    )
  })

  return thread ? `/inbox?threadId=${encodeURIComponent(thread.id)}` : undefined
}

const getOfferAcceptedMessageHref = (
  metadata: NotificationMetadata,
  messageHref: string,
  clientId?: string | null,
  threads: InboxThreadSummary[] = [],
  senderUsername?: string,
  senderDisplayName?: string
) => {
  const explicitMessageHref = getInboxHref(
    readMetadataString(metadata, "messageHref")
  )
  if (explicitMessageHref) return explicitMessageHref

  const threadId =
    readMetadataString(metadata, "threadId") ||
    readMetadataString(metadata, "messageThreadId")
  if (threadId) return `/inbox?threadId=${encodeURIComponent(threadId)}`

  const participantId =
    readMetadataString(metadata, "participantId") ||
    readMetadataString(metadata, "senderId") ||
    readMetadataString(metadata, "senderUserId") ||
    readMetadataString(metadata, "clientId") ||
    clientId
  if (participantId) {
    return `/inbox?participantId=${encodeURIComponent(participantId)}`
  }

  const threadHref = getOfferThreadHref(
    threads,
    senderUsername,
    senderDisplayName
  )
  if (threadHref) return threadHref

  return getInboxHref(messageHref) || "/inbox"
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
  const senderAvatarSrc =
    readMetadataString(metadata, "senderAvatarUrl") ||
    readMetadataString(metadata, "senderAvatarSrc") ||
    readMetadataString(metadata, "senderAvatar")
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
    senderAvatarSrc,
    offerType: readMetadataString(metadata, "offerType") || "Project",
    receivedLabel,
    offerTitle,
    viewJobHref: withOfferView(getOfferJobHref(metadata, item.href)),
    messageHref: readMetadataString(metadata, "messageHref") || "/inbox",
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
  const [allNotifications, setAllNotifications] = useState<
    UiNotificationItem[]
  >([])
  const [unreadBadgeCount, setUnreadBadgeCount] = useState(0)
  // Snapshot of unread count captured when the panel opens. The bell badge
  // (unreadBadgeCount) clears to 0 immediately on open, but the tab counter
  // needs to stay visible so users can see how many notifications were new.
  const [panelTabCount, setPanelTabCount] = useState(0)
  const {
    threads: inboxThreads,
    totalUnread: inboxTotalUnread,
    loading: inboxLoading,
  } = useInboxThreads()

  const loadNotifications = useCallback(async (allowSeed = true) => {
    try {
      setLoading(true)

      const response = await NotificationsAPI.list({
        limit: NOTIFICATION_PANEL_LIMIT,
      })
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

      // The bell badge counts every unread notification, not just the 8 this
      // panel fetches, so it comes from the dedicated count endpoint. The page
      // count is only a fallback so a transient failure can't blank the badge.
      const pageUnreadCount = items.filter((item) => !item.read).length
      try {
        const unreadResponse = await NotificationsAPI.getUnreadCount()
        const unreadCount = unreadResponse?.data?.unreadCount
        const resolved =
          typeof unreadCount === "number" ? unreadCount : pageUnreadCount
        setUnreadBadgeCount(resolved)
        return resolved
      } catch (error) {
        if (!isTransientNotificationsApiError(error)) {
          console.error("Failed to load unread notification count:", error)
        }
        setUnreadBadgeCount(pageUnreadCount)
        return pageUnreadCount
      }
    } catch (error) {
      if (!isTransientNotificationsApiError(error)) {
        console.error("Failed to load header notifications:", error)
      }
      setAllNotifications([])
      setUnreadBadgeCount(0)
      return 0
    } finally {
      setLoading(false)
    }
  }, [])

  // Opening the panel is what "viewing" means for the bell, so the count
  // clears on open. This is also what keeps the badge reachable: it counts
  // every unread notification server-side while the panel only lists the most
  // recent few, so anything past that window could never be cleared by
  // clicking it. Rows keep their own unread styling from local state, so you
  // can still see which ones were new.
  const markAllNotificationsRead = useCallback(async () => {
    try {
      await NotificationsAPI.markAllRead()
      setUnreadBadgeCount(0)
    } catch (error) {
      if (!isTransientNotificationsApiError(error)) {
        console.error("Failed to mark all notifications as read:", error)
      }
    }
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  useEffect(() => {
    if (!open) {
      setPanelTabCount(0)
      return
    }
    let cancelled = false

    void (async () => {
      const unread = await loadNotifications(false)
      if (cancelled) return
      // Capture before clearing so the tab counter stays visible while the
      // panel is open, even though the bell badge clears to 0 immediately.
      setPanelTabCount(unread)
      if (unread === 0) return
      await markAllNotificationsRead()
    })()

    return () => {
      cancelled = true
    }
  }, [open, loadNotifications, markAllNotificationsRead])

  useNotificationChannel({
    onNotificationNew: (payload) => {
      const nextItem = mapAblyNotificationToUi(payload)

      setAllNotifications((prev) => {
        const deduped = prev.filter((item) => item.id !== nextItem.id)
        return [nextItem, ...deduped].slice(0, NOTIFICATION_PANEL_LIMIT)
      })
      setUnreadBadgeCount((prev) => prev + 1)
      if (nextItem.kind === "message") {
        setActiveTab("Messages")
      } else {
        setActiveTab("Notifications")
      }
    },
    onBadgeCount: ({ unreadCount }) => {
      setUnreadBadgeCount(unreadCount)
    },
  })

  const selectedOfferDetails = useMemo(
    () =>
      selectedOfferNotification
        ? getOfferNotificationDetails(selectedOfferNotification)
        : null,
    [selectedOfferNotification]
  )
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
        : offerDeclineNote.trim().length > 0 ||
            offerDeclineReason.trim().length > 0
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
    const metadata = selectedOfferNotification?.metadata

    if (!selectedOfferNotification || !details?.contractId || !user?.id) {
      setOfferDialogOpen(false)
      return
    }

    setOfferActionLoading(accepted ? "accept" : "decline")

    try {
      const acceptedMessageHref = getOfferAcceptedMessageHref(
        metadata,
        details.messageHref,
        undefined,
        inboxThreads,
        details.senderUsername,
        details.senderDisplayName
      )

      if (accepted && !isUuid(details.contractId)) {
        setOfferDialogOpen(false)
        setSelectedOfferNotification(null)
        resetOfferDialogState()
        storeAcceptedOfferCard(
          details.contractId,
          details,
          offerAcceptanceNote.trim()
        )
        router.push(
          withAcceptedOfferState(acceptedMessageHref, details.contractId)
        )
        return
      }
      if (!accepted && !isUuid(details.contractId)) {
        setOfferDialogOpen(false)
        setSelectedOfferNotification(null)
        resetOfferDialogState()
        storeDeclinedOfferCard(
          details.contractId,
          details,
          offerDeclineNote.trim() ||
            offerDeclineReason.trim() ||
            "Thanks, unfortunately I can't take this on right now."
        )
        router.push(
          withDeclinedOfferState(acceptedMessageHref, details.contractId)
        )
        return
      }

      const offerContract = accepted
        ? await getContract(details.contractId)
        : null
      const response = await respondToContract(details.contractId, {
        accepted,
        talentId: user.id,
      })

      if (!response) {
        if (
          accepted &&
          offerContract?.clientId &&
          offerContract.status.toUpperCase() !== "PENDING"
        ) {
          setOfferDialogOpen(false)
          setSelectedOfferNotification(null)
          resetOfferDialogState()
          storeAcceptedOfferCard(
            details.contractId,
            details,
            offerAcceptanceNote.trim()
          )
          router.push(
            withAcceptedOfferState(
              getOfferAcceptedMessageHref(
                metadata,
                details.messageHref,
                offerContract.clientId,
                inboxThreads,
                details.senderUsername,
                details.senderDisplayName
              ),
              details.contractId
            )
          )
        }
        if (!accepted) {
          setOfferDialogOpen(false)
          setSelectedOfferNotification(null)
          resetOfferDialogState()
          storeDeclinedOfferCard(
            details.contractId,
            details,
            offerDeclineNote.trim() ||
              offerDeclineReason.trim() ||
              "Thanks, unfortunately I can't take this on right now."
          )
          router.push(
            withDeclinedOfferState(acceptedMessageHref, details.contractId)
          )
        }
        return
      }

      setOfferDialogOpen(false)
      setSelectedOfferNotification(null)
      resetOfferDialogState()
      if (accepted) {
        storeAcceptedOfferCard(
          details.contractId,
          details,
          offerAcceptanceNote.trim()
        )
        router.push(
          withAcceptedOfferState(
            getOfferAcceptedMessageHref(
              metadata,
              details.messageHref,
              response.clientId ?? offerContract?.clientId,
              inboxThreads,
              details.senderUsername,
              details.senderDisplayName
            ),
            details.contractId
          )
        )
      } else {
        storeDeclinedOfferCard(
          details.contractId,
          details,
          offerDeclineNote.trim() ||
            offerDeclineReason.trim() ||
            "Thanks, unfortunately I can't take this on right now."
        )
        router.push(
          withDeclinedOfferState(
            getOfferAcceptedMessageHref(
              metadata,
              details.messageHref,
              response.clientId,
              inboxThreads,
              details.senderUsername,
              details.senderDisplayName
            ),
            details.contractId
          )
        )
      }
      await loadNotifications(false)
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

    // Team invites are read-only in the panel for now: clicking marks them read
    // and drops the bell count, deliberately without navigating anywhere. The
    // panel stays open so that count change is visible.
    if (item.event === INVITE_NOTIFICATION_EVENT) {
      return
    }

    if (item.href) {
      setOpen(false)
      router.push(item.href)
      return
    }
  }

  const handleInboxThreadClick = (thread: InboxThreadSummary) => {
    setOpen(false)
    router.push(`/inbox?threadId=${thread.id}`)
  }

  const getThreadOfferNotification = (thread: InboxThreadSummary) => {
    if (thread.lastMessagePreview !== "No messages yet") return undefined

    const otherParticipantId = thread.participantIds?.find(
      (participantId) => participantId !== user?.id
    )

    return allNotifications.find((item) => {
      if (!item.isOfferNotification) return false

      const metadata = item.metadata
      const notificationThreadId =
        readMetadataString(metadata, "threadId") ||
        readMetadataString(metadata, "messageThreadId")
      if (notificationThreadId === thread.id) return true

      if (!otherParticipantId) return false
      return [
        "actorId",
        "senderId",
        "senderUserId",
        "submittedById",
        "acceptedById",
        "declinedById",
        "withdrawnById",
        "clientId",
        "talentId",
      ].some((key) => readMetadataString(metadata, key) === otherParticipantId)
    })
  }

  const renderInboxThreadItem = (thread: InboxThreadSummary) => {
    const offerNotification = getThreadOfferNotification(thread)
    const timeLabel = thread.lastMessageAt
      ? formatNotificationTime(thread.lastMessageAt)
      : offerNotification?.timeLabel || ""
    const preview = offerNotification?.description ?? thread.lastMessagePreview
    return (
      <button
        key={thread.id}
        type="button"
        className="w-full text-left hover:bg-gray-100 rounded-lg flex py-2.5 px-3 items-start gap-x-3 transition-colors"
        onClick={() => handleInboxThreadClick(thread)}
      >
        <Avatar size="md">
          {thread.displayAvatarUrl ? (
            <AvatarImage
              src={thread.displayAvatarUrl}
              alt={thread.displayName}
            />
          ) : null}
          <AvatarFallback>{thread.displayInitial}</AvatarFallback>
        </Avatar>

        <div className="flex-auto min-w-0">
          <div className="flex items-center justify-between gap-x-3">
            <div
              className={cn(
                "text-sm leading-[16.94px] text-dark-blue-400 truncate",
                thread.hasUnread ? "font-bold" : "font-semibold"
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
              thread.hasUnread
                ? "text-dark-blue-400 font-medium"
                : "text-gray-700"
            )}
          >
            {preview}
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
            className: "bg-[#ECFDF3] text-[#027A48]",
            icon: FileCheck02,
          }
        : item.kind === "team"
          ? {
              label: "Team",
              className: "bg-[#ECFDF3] text-[#027A48]",
              icon: Briefcase02,
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
        className={cn(
          "w-full text-left rounded-lg flex py-2.5 px-3 items-start gap-x-4 transition-colors",
          !item.read ? "bg-[#F8F9FC] hover:bg-gray-100" : "hover:bg-gray-50"
        )}
        onClick={() => handleNotificationClick(item)}
      >
        {item.isUserNotification ? (
          <div className="relative inline-block shrink-0">
            <Avatar size="md">
              <AvatarImage src={item.avatarSrc} alt={item.avatarAlt} />
              <AvatarFallback>{item.title.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <span
              className={cn(
                "absolute -bottom-1.5 -right-2 flex size-[21px] items-center justify-center rounded-full",
                item.kind === "team"
                  ? "bg-success-100 text-success-500"
                  : item.kind === "project"
                    ? "bg-success-100 text-success-500"
                    : item.kind === "message"
                      ? "bg-primary-50 text-primary-600"
                      : "bg-[#EEF4FF] text-[#3538CD]"
              )}
            >
              {item.kind === "team" ? (
                <Briefcase02 className="size-2.5" />
              ) : item.kind === "project" ? (
                <FileCheck02 className="size-2.5" />
              ) : (
                <AccentIcon className="size-2.5" />
              )}
            </span>
          </div>
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

          <div className="mt-1 text-sm leading-[16.94px] text-gray-700 break-words">
            {item.description}
          </div>
          {item.ctaLabel ? (
            <div className="mt-1 text-xs font-semibold leading-5 text-primary-500 underline underline-offset-2">
              {item.ctaLabel}
            </div>
          ) : null}
        </div>
      </button>
    )
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative inline-flex">
            <IconButton
              className="rounded-full"
              size="md"
              variant="ghost"
              visual="gray"
            >
              <Bell className="size-[18px]" />
            </IconButton>
            {unreadBadgeCount + inboxTotalUnread > 0 ? (
              <span className="absolute top-0 right-0 pointer-events-none inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-error-100 px-2 text-[10px] font-bold leading-[18px] text-error-500">
                {unreadBadgeCount + inboxTotalUnread > 99
                  ? "99+"
                  : unreadBadgeCount + inboxTotalUnread}
              </span>
            ) : null}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[370px] bg-white border border-gray-100 rounded-lg shadow-[0px_12px_16px_-4px_rgba(16,24,40,.08)]"
          align="end"
        >
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "Notifications" | "Messages")
            }
          >
            <TabsList className="w-full">
              <TabsTrigger value="Notifications">
                Notifications
                {panelTabCount > 0 && (
                  <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gray-100 text-[10px] leading-[18px] text-gray-500 group-data-[state=active]:bg-primary-50 group-data-[state=active]:text-primary-500">
                    {panelTabCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="Messages">
                Messages
                {inboxTotalUnread > 0 && (
                  <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gray-100 text-[10px] leading-[18px] text-gray-500 group-data-[state=active]:bg-primary-50 group-data-[state=active]:text-primary-500">
                    {inboxTotalUnread > 99 ? "99+" : inboxTotalUnread}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="Notifications">
              <div className="py-3 border-b border-gray-100 flex flex-col gap-y-1">
                <ScrollArea
                  scrollBar={<ScrollBar className="w-4 px-1" />}
                  viewportClassName="[&>div]:!block"
                  viewportStyle={{ maxHeight: NOTIFICATION_LIST_MAX_HEIGHT }}
                >
                  <div className="px-2">
                    {loading ? (
                      <div className="px-3 py-6 text-sm text-gray-500">
                        Loading notifications...
                      </div>
                    ) : allNotifications.length > 0 ? (
                      allNotifications.map((item) =>
                        renderNotificationItem(item, false)
                      )
                    ) : (
                      <div className="px-3 py-6 text-sm text-gray-500">
                        No notifications to show
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="py-3.5 grid">
                <button
                  className="focus-visible:outline-none text-[13px] leading-[13.3px] text-gray-500 hover:underline font-medium"
                  onClick={() => {
                    setOpen(false)
                    router.push("/notifications")
                  }}
                >
                  View All
                </button>
              </div>
            </TabsContent>
            <TabsContent value="Messages">
              <div className="py-3 border-b border-gray-100 flex flex-col gap-y-1">
                <ScrollArea
                  scrollBar={<ScrollBar className="w-4 px-1" />}
                  viewportClassName="[&>div]:!block"
                  viewportStyle={{ maxHeight: NOTIFICATION_LIST_MAX_HEIGHT }}
                >
                  <div className="px-2">
                    {(() => {
                      if (inboxLoading && inboxThreads.length === 0) {
                        return (
                          <div className="px-3 py-6 text-sm text-gray-500">
                            Loading messages...
                          </div>
                        )
                      }
                      if (inboxThreads.length === 0) {
                        return (
                          <div className="px-3 py-6 text-sm text-gray-500">
                            No messages
                          </div>
                        )
                      }
                      return inboxThreads.filter(t => t.lastMessageAt).slice(0, 8).map(renderInboxThreadItem)
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
          onViewJob={() => {
            setOfferDialogOpen(false)
            setSelectedOfferNotification(null)
            resetOfferDialogState()
            router.push(selectedOfferDetails.viewJobHref || "/find-jobs")
          }}
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
          onSubmit={(counterOffer) => {
            const messageHref = getOfferAcceptedMessageHref(
              selectedOfferNotification?.metadata,
              selectedOfferDetails.messageHref,
              undefined,
              inboxThreads,
              selectedOfferDetails.senderUsername,
              selectedOfferDetails.senderDisplayName
            )

            storeCounterOfferCard(
              selectedOfferDetails.contractId,
              selectedOfferDetails,
              counterOffer
            )
            setOfferDialogOpen(false)
            setSelectedOfferNotification(null)
            resetOfferDialogState()

            const separator = messageHref.includes("?") ? "&" : "?"
            const contractParam = selectedOfferDetails.contractId
              ? `&contractId=${encodeURIComponent(
                  selectedOfferDetails.contractId
                )}`
              : ""
            router.push(
              `${messageHref}${separator}offerStatus=counter-submitted${contractParam}`
            )
          }}
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

  const handleCategoryChange = (newCategory: string) => {
    setState(newCategory)
    if (pathname?.startsWith("/search") && query.trim()) {
      const params = new URLSearchParams()
      params.set("q", query.trim())
      if (newCategory) params.set("category", newCategory.toLowerCase())
      closeDropdown()
      router.push(`/search?${params.toString()}`)
    }
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
      case "Projects":
        return "Search by skills or project type"
      case "Services":
        return "Search by skills or service type"
      case "Teams":
        return "Search by skills or team type"
      case "Talent":
        return "Search by skills or expertise"
      default:
        return "Search by skills or keyword"
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
      onChange={(value: {
        id: number
        value: string
        icon?: React.JSXElementConstructor<any>
        route?: string
      }) => {
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
                onKeyDownCapture={(
                  e: React.KeyboardEvent<HTMLInputElement>
                ) => {
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
            <Listbox
              className="w-auto"
              value={state}
              onChange={handleCategoryChange}
            >
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

const PATHNAMES = [
  "/talent-dashboard",
  "/client-dashboard",
  "/talent-profile",
  "/client-profile",
]

// Pages with sidebar navigation that should use tighter header padding (24px)
const HAS_SIDEBAR_NAV = [
  "/talent-dashboard",
  "/client-dashboard",
  "/inbox",
  "/earnings",
  "/my-teams",
  "/my-listings",
  "/my-contracts",
  "/my-jobs",
  "/time-tracking",
  "/reports",
  "/invoices",
  "/payments",
  "/notifications",
  "/complete-profile",
  "/settings",
]

// Pages that have a secondary nav bar below the primary nav — shadow should only appear on the secondary nav, not the primary
const HAS_SECONDARY_NAV = [
  "/",
  "/talent-profile",
  "/client-profile",
  "/my-network",
  "/favorite-projects",
  "/favorite-talent",
  "/browsing-history",
  "/search",
  "/talent-search",
  "/projects",
  "/services",
  "/teams",
  "/talent",
  "/find-jobs",
]

const ONBOARDING = "/onboarding"

export const TopMostHeader = ({
  showShadow = true,
}: {
  showShadow?: boolean
}) => {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = React.useState(false)
  // null = no secondary nav shell mounted on this route.
  const [navState, setNavState] = React.useState<"visible" | "hidden" | null>(
    null
  )
  const { authModalOpen, authModalView, openAuthModal, closeAuthModal } =
    useAuth()

  const router = useRouter()
  const { logoutHandler, user, setUser } = useAuth()

  // The secondary nav shell publishes `data-secondary-nav` on <html> while it is
  // mounted and removes it on unmount, so the DOM is the authority on whether a
  // route actually has one. The route list below is only a first-paint hint for
  // the frame before this effect runs -- a page missing from it (every new page
  // under the marketplace layout) still resolves correctly.
  const routeHint =
    HAS_SECONDARY_NAV.includes(pathname) ||
    pathname === "/favorites" ||
    pathname.startsWith("/favorites/") ||
    pathname.startsWith("/c/") ||
    pathname.startsWith("/project-details/") ||
    pathname.startsWith("/job-details/")

  React.useEffect(() => {
    const read = () => {
      const val = document.documentElement.dataset.secondaryNav
      setNavState(val === "hidden" ? "hidden" : val ? "visible" : null)
    }
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-secondary-nav"],
    })
    return () => observer.disconnect()
  }, [pathname])

  const hasSecondaryNav = navState !== null || routeHint
  const secondaryNavHidden = navState === "hidden"

  if (pathname.startsWith(ONBOARDING)) {
    return null
  }

  // Show shadow: always on pages without secondary nav, or when secondary nav is hidden (scrolled away)
  const showNavShadow = !hasSecondaryNav || secondaryNavHidden
  const hasSidebarNav = HAS_SIDEBAR_NAV.includes(pathname)

  return (
    <div
      className={cn(
        // Keep the primary nav pinned to the viewport so iOS/macOS overscroll
        // bounce only affects page content, not the header itself.
        "fixed inset-x-0 top-0 px-3.5 md:px-6 bg-white flex flex-col xs:max-md:pt-1 xs:max-md:pb-3.5 z-50",
        !hasSidebarNav && "lg:px-[50px]",
        showNavShadow
          ? "shadow-[0px_1px_3px_0px_rgba(16,24,40,.1)]"
          : "shadow-none",
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
          {user ? (
            <>
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
                      <span
                        className="text-xs font-semibold leading-[15px] text-gray-700"
                        suppressHydrationWarning
                      >
                        {`${user?.firstName || ""} ${user?.lastName || ""}`.trim()}
                      </span>
                      <span
                        className="text-[9px] leading-[14px] text-gray-500"
                        suppressHydrationWarning
                      >
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
                        <span
                          className="text-[13px] leading-5 text-primary-500"
                          suppressHydrationWarning
                        >
                          {user?.email}
                        </span>
                      </div>

                      <Button
                        className="w-full"
                        onClick={() => {
                          setMenuOpen(false)
                          router.push("/settings")
                        }}
                      >
                        My Account
                      </Button>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      setMenuOpen(false)
                      // A client account sees the client profile; the talent
                      // profile is only for talent accounts.
                      router.push(
                        resolveDashboardRole(user) === ROLE.CLIENT
                          ? "/client-profile"
                          : "/talent-profile"
                      )
                    }}
                  >
                    <User className="size-4" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setMenuOpen(false)
                      router.push(
                        user?.accountType === "TALENT"
                          ? "/talent-dashboard"
                          : "/client-dashboard"
                      )
                    }}
                  >
                    <LayoutGrid02 className="size-4" />
                    My Dashboard
                  </DropdownMenuItem>
                  {user?.accountType === "TALENT" && (
                    <DropdownMenuItem
                      onSelect={() => {
                        setMenuOpen(false)
                        router.push("/my-listings")
                      }}
                    >
                      <List className="size-4" />
                      My Listings
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onSelect={() => {
                      setMenuOpen(false)
                      router.push("/my-contracts")
                    }}
                  >
                    <FileCheck02 className="size-4" />
                    My Contracts
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setMenuOpen(false)
                      router.push("/my-network")
                    }}
                  >
                    <Users className="size-4" />
                    My Network
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setMenuOpen(false)
                      router.push("/favorites")
                    }}
                  >
                    <Star className="size-4" />
                    My Favorites
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setMenuOpen(false)
                      router.push("/browsing-history")
                    }}
                  >
                    <ClockRewind className="size-4" />
                    Browsing History
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setMenuOpen(false)
                      router.push("/settings?tab=billing-overview")
                    }}
                  >
                    <CoinStack className="size-4" />
                    Billing
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setMenuOpen(false)
                      router.push("/settings?tab=personal-info")
                    }}
                  >
                    <Settings className="size-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      setMenuOpen(false)
                      const isTalent =
                        user?.accountType?.toUpperCase() === "TALENT" ||
                        user?.userType?.toLowerCase() === "talent" ||
                        user?.role?.toUpperCase() === "TALENT"
                      const newType = isTalent ? "client" : "talent"
                      const newRole =
                        newType === "talent" ? ROLE.TALENT : ROLE.CLIENT
                      // Optimistically update local user so the dropdown label flips immediately,
                      // even if the backend doesn't accept the userType change.
                      const updatedUser = user
                        ? {
                            ...user,
                            userType: newType,
                            accountType: newRole,
                            activeRole: newRole,
                            role: newRole,
                          }
                        : null
                      setUser((prev) =>
                        prev
                          ? {
                              ...prev,
                              userType: newType,
                              accountType: newRole,
                              activeRole: newRole,
                              role: newRole,
                            }
                          : prev
                      )
                      if (user?.id) {
                        UserAPI.updateProfile(user.id, {
                          userType: newType,
                        }).catch(() => {})
                        // Persist the active role so it survives a reload.
                        // `accountType` only ever lived in memory, so after a
                        // refresh the app fell back to inferring from `role` and
                        // showed the wrong role's features.
                        persistActiveRole(newRole).catch(() => {})
                      }
                      // Check if the user needs onboarding for the target role
                      const needsOnboarding =
                        newType === "client"
                          ? !hasCompletedClientOnboarding(updatedUser)
                          : !hasCompletedTalentOnboarding(updatedUser)
                      const destination = needsOnboarding
                        ? `/onboarding/${newType}`
                        : newType === "client"
                          ? "/client-dashboard"
                          : "/talent-dashboard"
                      router.push(destination)
                    }}
                  >
                    <Repeat className="size-4" />
                    {user?.accountType?.toUpperCase() === "TALENT" ||
                    user?.userType?.toLowerCase() === "talent" ||
                    user?.role?.toUpperCase() === "TALENT"
                      ? "Switch to Client"
                      : "Switch to Talent"}
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
            </>
          ) : (
            <div className="flex items-center gap-x-5">
              <Button
                variant="link"
                visual="primary"
                size="sm"
                onClick={() => openAuthModal("sign-in")}
              >
                Sign In
              </Button>
              <Button
                variant="filled"
                visual="primary"
                size="sm"
                onClick={() => openAuthModal("sign-up")}
              >
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="md:hidden">
        <SearchBar />
      </div>

      <AuthModal
        open={authModalOpen}
        onOpenChange={(open) => {
          if (!open) closeAuthModal()
        }}
        defaultView={authModalView}
      />
    </div>
  )
}
