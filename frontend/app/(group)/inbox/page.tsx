"use client"

import React, { useCallback, useMemo, useRef, useState } from "react"
import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { getNotificationHref, getNotificationKind } from "@/libs/notifications"
import {
  type NotificationItem,
  NotificationsAPI,
} from "@/service/http/notifications"
import { getOffer } from "@/service/http/offers"
import { ensureEncryptionKeysExist, loadPrivateKey } from "@/src/crypto/keys"
import { apiFetch } from "@/src/lib/api"
import { jobDetailsUrl } from "@/src/lib/listing-urls"
import { getAccessToken, getCurrentUser } from "@/utils/auth"
import { useMessageSearchIndex } from "@/utils/useMessageSearchIndex"
import { useToggle } from "react-use"
import { Conversation } from "@/types/conversation"
import { Message } from "@/types/message"
import { User } from "@/types/user"
import { ChatsContextProvider } from "@/components/chat"
import { EditContextProvider } from "@/components/inbox-comps"
import {
  type AcceptedOfferCardData,
  Chats,
  type CounterOfferCardData,
  type DeclinedOfferCardData,
  type OfferNotificationMessageData,
} from "./components/chats-comp"
import LeftSidebar from "./components/left-sidebar"
import RightSidebar from "./components/right-sidebar"

const OFFER_ACCEPTED_STORAGE_PREFIX = "inbox_offer_accepted"
const COUNTER_OFFER_STORAGE_PREFIX = "inbox_counter_offer_submitted"
const OFFER_DECLINED_STORAGE_PREFIX = "inbox_offer_declined"

const Inbox = ({ children }: { children?: React.ReactNode }) => {
  const [pinnedChats, setPinnedChats] = useState(0)
  const [showPinnedIcon, toggleShowPinnedIcon] = useToggle(false)
  const [checkedChats, setCheckedChats] = useState(0)

  // If everything gets unpinned while in "View pinned" mode, exit the mode
  // so the sidebar doesn't render empty with no visible Close control.
  useEffect(() => {
    if (pinnedChats === 0 && showPinnedIcon) {
      toggleShowPinnedIcon(false)
    }
  }, [pinnedChats, showPinnedIcon, toggleShowPinnedIcon])

  const onChatPinned = useCallback(
    (value: boolean) =>
      value
        ? setPinnedChats((prev) => prev + 1)
        : setPinnedChats((prev) => prev - 1),
    []
  )

  const onChatChecked = useCallback(
    (value: boolean) =>
      value
        ? setCheckedChats((prev) => prev + 1)
        : setCheckedChats((prev) => prev - 1),
    []
  )

  const resetCheckedChats = useCallback(() => setCheckedChats(0), [])

  const value = useMemo(
    () => ({
      pinnedChats,
      setPinnedChats,
      onChatPinned,
      showPinnedIcon,
      toggleShowPinnedIcon,
      onChatChecked,
      resetCheckedChats,
      checkedChats,
    }),
    [
      pinnedChats,
      onChatPinned,
      showPinnedIcon,
      toggleShowPinnedIcon,
      onChatChecked,
      resetCheckedChats,
      checkedChats,
    ]
  )

  const [chat, setChat] = useState("")
  const [isSaved, setIsSaved] = useState(false)

  const [selectedUser, setSelectedUser] = useState<User | null>(null) //  NEW STATE

  const onSave = useCallback(() => {
    setIsSaved(true)
  }, [])

  const onUnsave = useCallback(() => {
    setChat("")
    setIsSaved(false)
  }, [])

  const editContextValue = useMemo(
    () => ({
      chat,
      onChatChange: setChat,
      onSave,
      isSaved,
      onUnsave,
    }),
    [chat, setChat, onSave, isSaved, onUnsave]
  )

  return (
    <EditContextProvider value={editContextValue}>
      <ChatsContextProvider value={value}>{children}</ChatsContextProvider>
    </EditContextProvider>
  )
}

//New implementation for new encryption logic
export default function InboxRoot() {
  const searchParams = useSearchParams()
  const initialThreadId = searchParams?.get("threadId") ?? null
  const initialParticipantId = searchParams?.get("participantId") ?? null
  const acceptedOfferStatus = searchParams?.get("offerStatus") ?? null
  const acceptedOfferContractId = searchParams?.get("contractId") ?? null

  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null)
  const [acceptedOfferCard, setAcceptedOfferCard] =
    useState<AcceptedOfferCardData | null>(null)
  const [counterOfferCard, setCounterOfferCard] =
    useState<CounterOfferCardData | null>(null)
  const [declinedOfferCard, setDeclinedOfferCard] =
    useState<DeclinedOfferCardData | null>(null)
  const [offerNotificationMessages, setOfferNotificationMessages] = useState<
    OfferNotificationMessageData[]
  >([])
  const [offerNotificationRefreshToken, setOfferNotificationRefreshToken] =
    useState(0)
  const [seededThreadVersion, setSeededThreadVersion] = useState(0)
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(
    null
  )
  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<string, Message[]>
  >({})

  // Set by LeftSidebar so other panes can patch its conversation list
  // directly (e.g. the open thread's header star) instead of waiting on
  // an Ably round-trip to reflect the change in the list.
  const patchConversationRef = useRef<
    (id: string, patch: Partial<Conversation>) => void
  >(() => {})
  const patchConversation = useCallback(
    (id: string, patch: Partial<Conversation>) =>
      patchConversationRef.current(id, patch),
    []
  )

  const [token, setToken] = useState("")
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  useEffect(() => {
    setToken(getAccessToken() || "")
  }, [])

  useEffect(() => {
    const refreshOfferMessages = () =>
      setOfferNotificationRefreshToken((value) => value + 1)
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshOfferMessages()
    }
    window.addEventListener("focus", refreshOfferMessages)
    document.addEventListener("visibilitychange", refreshWhenVisible)
    return () => {
      window.removeEventListener("focus", refreshOfferMessages)
      document.removeEventListener("visibilitychange", refreshWhenVisible)
    }
  }, [])

  useEffect(() => {
    if (!token) return
    let cancelled = false

    void NotificationsAPI.list({ limit: 100 })
      .then(async (response) => {
        const items = Array.isArray(response?.data?.data)
          ? (response.data.data as NotificationItem[])
          : []
        const offerItems = items.filter((item) => {
          const marker =
            `${item.category} ${item.event} ${item.title}`.toLowerCase()
          return marker.includes("offer")
        })

        const resolved = await Promise.all(
          offerItems.map(
            async (item): Promise<OfferNotificationMessageData | null> => {
              const metadata = item.metadata ?? {}
              const offerId =
                typeof metadata.offerId === "string" ? metadata.offerId : null
              if (!offerId) return null
              try {
                const offer = await getOffer(offerId)
                const actorKeys = [
                  "actorId",
                  "senderId",
                  "senderUserId",
                  "submittedById",
                  "acceptedById",
                  "declinedById",
                  "withdrawnById",
                ]
                const actorId = actorKeys
                  .map((key) => metadata[key])
                  .find((value): value is string => typeof value === "string")
                const jobListingId =
                  (typeof metadata.jobId === "string" && metadata.jobId) ||
                  (typeof metadata.jobListingId === "string" &&
                    metadata.jobListingId) ||
                  offer.jobListingId
                const conversationParticipantId =
                  actorId ||
                  (offer.clientId === getCurrentUser()?.id
                    ? offer.talentId
                    : offer.clientId)
                return {
                  id: item.id,
                  contractId: offerId,
                  // PMCM-393 AC-42: live status from this same getOffer() call,
                  // separate from `event` below (the notification's own fixed
                  // event type, which never changes once the notification is
                  // created). The seeded-fixture catch branch below has no
                  // live offer to source this from and must leave it unset.
                  offerStatus: offer.status,
                  // PMCM-392 AC-40.06: same rule as offerStatus above — real,
                  // live signal only. The seeded-fixture catch branch has no
                  // live offer to source this from and must leave it unset,
                  // not invent one.
                  realContractId: offer.contractId,
                  event: item.event?.toLowerCase() || "offer.received",
                  title: item.title,
                  body: item.body,
                  href: getNotificationHref(item, getNotificationKind(item)),
                  viewJobHref: offerJobHref(
                    jobListingId,
                    offerId,
                    conversationParticipantId,
                    metadata
                  ),
                  jobListingId,
                  createdAt: item.createdAt,
                  actorId: conversationParticipantId,
                  threadId:
                    typeof metadata.threadId === "string"
                      ? metadata.threadId
                      : undefined,
                  senderDisplayName:
                    typeof metadata.senderDisplayName === "string"
                      ? metadata.senderDisplayName
                      : "Talent",
                  senderUsername:
                    typeof metadata.senderUsername === "string"
                      ? metadata.senderUsername
                      : "",
                  senderAvatarSrc:
                    typeof metadata.senderAvatarUrl === "string"
                      ? metadata.senderAvatarUrl
                      : typeof metadata.avatarUrl === "string"
                        ? metadata.avatarUrl
                        : undefined,
                  offerTitle: offer.contractTitle.split(/\s+[—-]\s+/)[0].trim(),
                  offerType:
                    offer.contractType.charAt(0) +
                    offer.contractType.slice(1).toLowerCase(),
                  offerRate: `${new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: offer.currencyCode,
                    maximumFractionDigits: 0,
                  }).format(offer.rate)}/hr`,
                  originalOfferRate:
                    typeof metadata.originalOfferRate === "string"
                      ? metadata.originalOfferRate
                      : undefined,
                  originalDuration:
                    typeof metadata.originalDuration === "string"
                      ? metadata.originalDuration
                      : undefined,
                  originalSchedule:
                    typeof metadata.originalSchedule === "string"
                      ? metadata.originalSchedule
                      : undefined,
                  originalStartDate:
                    typeof metadata.originalStartDate === "string"
                      ? metadata.originalStartDate
                      : undefined,
                  role:
                    typeof metadata.role === "string" && metadata.role.trim()
                      ? metadata.role.trim()
                      : typeof metadata.jobTitle === "string" &&
                          metadata.jobTitle.trim()
                        ? metadata.jobTitle.trim()
                        : offer.contractTitle.split(/\s+[—-]\s+/)[0].trim() ||
                          "Team Member",
                  duration: `${offer.durationMonths} Month${offer.durationMonths === 1 ? "" : "s"}`,
                  schedule:
                    offer.workSchedule.type === "FULL_TIME"
                      ? "Full Time"
                      : offer.workSchedule.type === "PART_TIME"
                        ? "Part Time"
                        : "Custom",
                  scheduleDetail:
                    offer.workSchedule.type === "CUSTOM" &&
                    typeof offer.workSchedule.hoursPerWeek === "number"
                      ? `${offer.workSchedule.hoursPerWeek} hrs/week`
                      : undefined,
                  startDate: new Date(offer.startDate).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric", year: "numeric" }
                  ),
                  expiresLabel: new Date(offer.expiresAt).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric", year: "numeric" }
                  ),
                  seeded: metadata.seeded === true,
                  clientPerspective: metadata.clientPerspective === true,
                  withdrawnByViewer: metadata.withdrawnByViewer === true,
                  // No backend producer writes offer notification metadata,
                  // so metadata.withdrawalMessage is always undefined for a
                  // real withdrawn offer — fall back to the real offer's own
                  // withdrawalMessage (already fetched above) before giving
                  // up to undefined, so the "No message was sent." fallback
                  // only fires when the message is genuinely absent.
                  withdrawalMessage:
                    typeof metadata.withdrawalMessage === "string" &&
                    metadata.withdrawalMessage.trim()
                      ? metadata.withdrawalMessage
                      : typeof offer.withdrawalMessage === "string"
                        ? offer.withdrawalMessage
                        : undefined,
                  declineReason:
                    typeof metadata.declineReason === "string"
                      ? metadata.declineReason
                      : undefined,
                  counterOfferMessage:
                    typeof metadata.counterOfferMessage === "string"
                      ? metadata.counterOfferMessage
                      : undefined,
                  counterOfferFromClient:
                    metadata.counterOfferFromClient === true,
                  extensionRequestVariant:
                    metadata.extensionRequestVariant === true,
                  singleMessageOnly: metadata.singleMessageOnly === true,
                  recipientFirstName:
                    typeof metadata.recipientFirstName === "string"
                      ? metadata.recipientFirstName
                      : undefined,
                } satisfies OfferNotificationMessageData
              } catch {
                // Seeded inbox fixtures carry the complete card payload in
                // notification metadata. Keep them visible even when the
                // secondary offer-service lookup is temporarily unavailable.
                if (metadata.seeded !== true) return null

                const actorId = [
                  "actorId",
                  "senderId",
                  "senderUserId",
                ]
                  .map((key) => metadata[key])
                  .find((value): value is string => typeof value === "string")
                if (!actorId) return null

                const rawRate = metadata.offerRate
                const formattedRate =
                  typeof rawRate === "number"
                    ? `$${rawRate}/hr`
                    : typeof rawRate === "string"
                      ? rawRate.includes("/")
                        ? rawRate
                        : `$${rawRate.replace(/^\$/, "")}/hr`
                      : "$45/hr"
                const formatDate = (value: unknown) =>
                  typeof value === "string" && !Number.isNaN(Date.parse(value))
                    ? new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : ""
                const jobListingId =
                  typeof metadata.jobListingId === "string"
                    ? metadata.jobListingId
                    : typeof metadata.jobId === "string"
                      ? metadata.jobId
                      : undefined
                const rawType =
                  typeof metadata.offerType === "string"
                    ? metadata.offerType
                    : typeof metadata.contractType === "string"
                      ? metadata.contractType
                      : "PROJECT"

                return {
                  id: item.id,
                  contractId: offerId,
                  event: item.event?.toLowerCase() || "offer.received",
                  title: item.title,
                  body: item.body,
                  href: getNotificationHref(item, getNotificationKind(item)),
                  viewJobHref: jobListingId
                    ? offerJobHref(jobListingId, offerId, actorId, metadata)
                    : "",
                  jobListingId: jobListingId ?? "",
                  createdAt: item.createdAt,
                  actorId,
                  threadId:
                    typeof metadata.threadId === "string"
                      ? metadata.threadId
                      : undefined,
                  senderDisplayName:
                    typeof metadata.senderDisplayName === "string"
                      ? metadata.senderDisplayName
                      : "Talent",
                  senderUsername:
                    typeof metadata.senderUsername === "string"
                      ? metadata.senderUsername
                      : "",
                  senderAvatarSrc:
                    typeof metadata.senderAvatarUrl === "string"
                      ? metadata.senderAvatarUrl
                      : typeof metadata.avatarUrl === "string"
                        ? metadata.avatarUrl
                        : undefined,
                  offerTitle:
                    typeof metadata.offerTitle === "string"
                      ? metadata.offerTitle
                      : typeof metadata.contractTitle === "string"
                        ? metadata.contractTitle
                        : "Offer",
                  offerType:
                    rawType.charAt(0) + rawType.slice(1).toLowerCase(),
                  offerRate: formattedRate,
                  originalOfferRate:
                    typeof metadata.originalOfferRate === "string"
                      ? metadata.originalOfferRate
                      : undefined,
                  originalDuration:
                    typeof metadata.originalDuration === "string"
                      ? metadata.originalDuration
                      : undefined,
                  originalSchedule:
                    typeof metadata.originalSchedule === "string"
                      ? metadata.originalSchedule
                      : undefined,
                  originalStartDate:
                    typeof metadata.originalStartDate === "string"
                      ? metadata.originalStartDate
                      : undefined,
                  role:
                    typeof metadata.role === "string" && metadata.role.trim()
                      ? metadata.role.trim()
                      : typeof metadata.jobTitle === "string" &&
                          metadata.jobTitle.trim()
                        ? metadata.jobTitle.trim()
                        : typeof metadata.contractTitle === "string"
                          ? metadata.contractTitle.split(/\s+[—-]\s+/)[0].trim() ||
                            "Team Member"
                          : "Team Member",
                  duration:
                    typeof metadata.duration === "string"
                      ? metadata.duration
                      : "Ongoing",
                  schedule:
                    typeof metadata.scheduleLabel === "string"
                      ? metadata.scheduleLabel
                      : typeof metadata.schedule === "string"
                        ? metadata.schedule
                        : "Full Time",
                  startDate: formatDate(metadata.startDate),
                  expiresLabel: formatDate(metadata.expiresAt),
                  seeded: true,
                  clientPerspective: metadata.clientPerspective === true,
                  withdrawnByViewer: metadata.withdrawnByViewer === true,
                  withdrawalMessage:
                    typeof metadata.withdrawalMessage === "string"
                      ? metadata.withdrawalMessage
                      : undefined,
                  declineReason:
                    typeof metadata.declineReason === "string"
                      ? metadata.declineReason
                      : undefined,
                  counterOfferMessage:
                    typeof metadata.counterOfferMessage === "string"
                      ? metadata.counterOfferMessage
                      : undefined,
                  counterOfferFromClient:
                    metadata.counterOfferFromClient === true,
                  extensionRequestVariant:
                    metadata.extensionRequestVariant === true,
                  singleMessageOnly: metadata.singleMessageOnly === true,
                  recipientFirstName:
                    typeof metadata.recipientFirstName === "string"
                      ? metadata.recipientFirstName
                      : undefined,
                } satisfies OfferNotificationMessageData
              }
            }
          )
        )

        if (!cancelled) {
          const messages = resolved.filter(
            (item): item is OfferNotificationMessageData => item !== null
          )
          setOfferNotificationMessages(messages)

          const currentUserId = getCurrentUser()?.id
          const seededActorIds = Array.from(
            new Set(
              messages
                .filter(
                  (item) =>
                    item.seeded &&
                    item.actorId &&
                    item.actorId !== currentUserId
                )
                .map((item) => item.actorId)
            )
          )
          if (currentUserId && seededActorIds.length) {
            await Promise.allSettled(
              seededActorIds.map((actorId) =>
                apiFetch("/v1/threads", {
                  method: "POST",
                  headers: { Authorization: `Bearer ${token}` },
                  body: {
                    participantIds: [currentUserId, actorId],
                    isGroup: false,
                  },
                })
              )
            )
            if (!cancelled) setSeededThreadVersion((version) => version + 1)
          }
        }
      })
      .catch(() => {
        if (!cancelled) setOfferNotificationMessages([])
      })

    return () => {
      cancelled = true
    }
  }, [offerNotificationRefreshToken, token])

  useEffect(() => {
    if (
      acceptedOfferStatus !== "accepted" ||
      !acceptedOfferContractId ||
      typeof window === "undefined"
    ) {
      setAcceptedOfferCard(null)
      return
    }

    const storageKey = `${OFFER_ACCEPTED_STORAGE_PREFIX}:${acceptedOfferContractId}`
    try {
      const stored = sessionStorage.getItem(storageKey)
      if (stored) {
        setAcceptedOfferCard(JSON.parse(stored))
        return
      }
    } catch {}

    setAcceptedOfferCard({
      status: "accepted",
      contractId: acceptedOfferContractId,
      offerTitle: "The Ultimate Mobile App Experience",
      offerType: "Project",
      offerRate: "$45/hr",
      role: "UX Designer",
      duration: "4 Months",
      schedule: "Full Time",
      startDate: "Starts on Mon, Jun 14",
      acceptanceMessage: "Excited to get started!",
    })
  }, [acceptedOfferStatus, acceptedOfferContractId])

  useEffect(() => {
    if (
      acceptedOfferStatus !== "declined" ||
      !acceptedOfferContractId ||
      typeof window === "undefined"
    ) {
      setDeclinedOfferCard(null)
      return
    }

    const storageKey = `${OFFER_DECLINED_STORAGE_PREFIX}:${acceptedOfferContractId}`
    try {
      const stored = sessionStorage.getItem(storageKey)
      if (stored) {
        setDeclinedOfferCard(JSON.parse(stored))
        return
      }
    } catch {}

    setDeclinedOfferCard({
      status: "declined",
      contractId: acceptedOfferContractId,
      offerTitle: "The Ultimate Mobile App Experience",
      offerType: "Project",
      receivedLabel: "Feb 1, 2025",
      declinedAt: new Date().toISOString(),
      declinedLabel: "Feb 1, 2025",
      offerRate: "$45/hr",
      role: "UX Designer",
      duration: "4 Months",
      schedule: "Full Time",
      startDate: "Feb 5th, 2025",
      senderDisplayName: "Laura",
      senderUsername: "@lauradesign21",
      declineMessage: "Thanks, unfortunately I can't take this on right now.",
    })
  }, [acceptedOfferStatus, acceptedOfferContractId])

  useEffect(() => {
    if (
      acceptedOfferStatus !== "counter-submitted" ||
      !acceptedOfferContractId ||
      typeof window === "undefined"
    ) {
      setCounterOfferCard(null)
      return
    }

    const storageKey = `${COUNTER_OFFER_STORAGE_PREFIX}:${acceptedOfferContractId}`
    try {
      const stored = sessionStorage.getItem(storageKey)
      if (stored) {
        setCounterOfferCard(JSON.parse(stored))
        return
      }
    } catch {}

    setCounterOfferCard({
      status: "submitted",
      contractId: acceptedOfferContractId,
      offerTitle: "The Ultimate Mobile App Experience",
      offerType: "Project",
      offerRate: "$85/hr",
      duration: "3 Months",
      schedule: "Full Time",
      startDate: "Feb 5, 2025",
      expiresLabel: "Aug 2, 2025",
      message: "I would like to increase the hourly rate if it's ok.",
    })
  }, [acceptedOfferStatus, acceptedOfferContractId])

  const selectedConversationCacheKey = currentUserProfile?.id
    ? `inbox_selected_conversation_${currentUserProfile.id}`
    : ""

  const seededOfferConversations = useMemo<Conversation[]>(() => {
    const currentUserId = getCurrentUser()?.id
    if (!currentUserId) return []
    const byActor = new Map<string, OfferNotificationMessageData[]>()
    for (const message of offerNotificationMessages) {
      if (!message.seeded || !message.actorId) continue
      const actorMessages = byActor.get(message.actorId) ?? []
      actorMessages.push(message)
      byActor.set(message.actorId, actorMessages)
    }

    return Array.from(byActor.entries()).map(([actorId, messages]) => {
      const sortedMessages = [...messages].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      const latest = sortedMessages[0]
      // Some actors have multiple offer notifications. Use the newest real
      // messaging thread available for that actor instead of allowing a newer
      // display-only notification to force a synthetic conversation id.
      const realThreadId = sortedMessages.find((message) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          message.threadId ?? ""
        )
      )?.threadId
      return {
        id: realThreadId || `offer-notifications-${actorId}`,
        isGroup: false,
        createdAt: latest.createdAt,
        updatedAt: latest.createdAt,
        participantIds: [currentUserId, actorId],
        isStarred: false,
        isPinned: false,
        isArchived: false,
        isSpam: false,
        isMuted: false,
        isTrashed: false,
        markedUnread: false,
        lastReadAt: null,
        unreadCount: messages.filter((message) => message.event).length,
        participantName: latest.senderDisplayName,
        participantUsername: latest.senderUsername.replace(/^@/, ""),
        participantAvatarUrl: latest.senderAvatarSrc,
        lastMessagePreview: latest.body,
        isOfferNotificationThread: true,
      }
    })
  }, [offerNotificationMessages])

  useEffect(() => {
    if (!selectedConversation && seededOfferConversations.length > 0) {
      setSelectedConversation(seededOfferConversations[0])
      return
    }

    // Older seeded inbox sessions cached a display-only conversation ID such
    // as `offer-notifications-<actorId>`. Reconcile that stale snapshot to the
    // real messaging thread carried by the notification so encrypted sends use
    // a valid UUID without requiring the user to clear session storage.
    if (selectedConversation?.id.startsWith("offer-notifications-")) {
      const currentUserId = getCurrentUser()?.id
      const actorId = selectedConversation.participantIds.find(
        (participantId) => participantId !== currentUserId
      )
      const realConversation = seededOfferConversations.find(
        (conversation) =>
          conversation.id !== selectedConversation.id &&
          conversation.participantIds.includes(actorId ?? "")
      )
      if (realConversation) setSelectedConversation(realConversation)
    }
  }, [selectedConversation, seededOfferConversations])

  // Hydrate selected conversation AFTER mount — keyed by current user so
  // a stale snapshot from a different login can't fire chat effects with
  // the wrong jwt/profile.
  useEffect(() => {
    if (!selectedConversationCacheKey) return
    try {
      const cached = sessionStorage.getItem(selectedConversationCacheKey)
      if (cached) setSelectedConversation(JSON.parse(cached))
    } catch {}
  }, [selectedConversationCacheKey])

  useEffect(() => {
    if (!selectedConversationCacheKey) return
    try {
      if (selectedConversation) {
        sessionStorage.setItem(
          selectedConversationCacheKey,
          JSON.stringify(selectedConversation)
        )
      } else {
        sessionStorage.removeItem(selectedConversationCacheKey)
      }
    } catch {}
  }, [selectedConversation, selectedConversationCacheKey])

  useEffect(() => {
    ;(async () => {
      if (!token) return

      // 0) Fetch full user profile (includes username)
      let me: any = null
      try {
        me = await apiFetch<any>("/user/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
        setCurrentUserProfile(me)
      } catch (err) {
        console.error("Failed to fetch user profile", err)
      }

      // 1) Ensure keypair exists, device registered, public key pushed
      const uid = me?.id ?? me?.data?.user?.id ?? getCurrentUser()?.id
      await ensureEncryptionKeysExist(uid)

      // 2) Load private key from IndexedDB (keyed by userId)
      if (!uid) {
        console.error("No userId available after key setup")
        return
      }
      const key = await loadPrivateKey(uid)
      if (!key) {
        console.error("No private key found after key setup")
        return
      }
      setPrivateKey(key)
    })()
  }, [token])

  // Callback to let Chats tell us when history is loaded. Stable ref so
  // chats-comp's effect dep array doesn't fire every render → infinite loop.
  const handleMessagesLoaded = useCallback(
    (convId: string, msgs: Message[]) => {
      setMessagesByConversation((prev) => {
        if (prev[convId] === msgs) return prev
        return { ...prev, [convId]: msgs }
      })
    },
    []
  )

  // Persisted client-side search index. Loads cached docs from IndexedDB
  // immediately, then rebuilds in the background as soon as we have a
  // private key (E2EE makes server-side search impossible).
  const currentUserId = getCurrentUser()?.id ?? null
  const searchIndex = useMessageSearchIndex({
    userId: currentUserId,
    token,
    privateKey,
  })

  return (
    <AuthenticatedRoute>
      <Inbox>
        <div
          className="flex w-full bg-white overflow-hidden"
          style={{ height: "calc(100vh - 65px)" }}
        >
          <LeftSidebar
            key={`offer-notification-threads-${seededThreadVersion}`}
            selectedConversation={selectedConversation}
            setSelectedConversation={setSelectedConversation}
            // We pass the whole map so Sidebar can show previews:
            messagesByConversation={messagesByConversation}
            initialThreadId={initialThreadId}
            initialParticipantId={initialParticipantId}
            searchIndex={searchIndex}
            onHighlightMessage={setHighlightMessageId}
            privateKey={privateKey}
            seededConversations={seededOfferConversations}
            registerPatchConversation={(fn) => {
              patchConversationRef.current = fn
            }}
          />

          {/* pass only the conversation and token into Chats */}
          <Chats
            selectedConversation={selectedConversation}
            setSelectedConversation={setSelectedConversation}
            onPatchConversation={patchConversation}
            jwtToken={token}
            privateKey={privateKey}
            currentUserProfile={currentUserProfile}
            onToggleRightSidebar={() => setRightSidebarOpen((v) => !v)}
            onMessagesLoaded={handleMessagesLoaded}
            highlightMessageId={highlightMessageId}
            onHighlightConsumed={() => setHighlightMessageId(null)}
            onIndexNewMessage={searchIndex.addDoc}
            acceptedOfferCard={acceptedOfferCard}
            counterOfferCard={counterOfferCard}
            declinedOfferCard={declinedOfferCard}
            offerNotificationMessages={offerNotificationMessages}
            onOfferUpdateRequested={() =>
              setOfferNotificationRefreshToken((value) => value + 1)
            }
          />

          {rightSidebarOpen && (
            <RightSidebar
              selectedConversation={selectedConversation}
              jwtToken={token}
            />
          )}
        </div>
      </Inbox>
    </AuthenticatedRoute>
  )
}
const isHiringFlowOfferMetadata = (metadata: Record<string, unknown>) => {
  const source = [
    metadata.offerSource,
    metadata.source,
    metadata.origin,
    metadata.createdFrom,
  ].find((value): value is string => typeof value === "string")

  return (
    metadata.hiringFlow === true ||
    metadata.isPrivate === true ||
    source?.toLowerCase() === "hire" ||
    source?.toLowerCase() === "hire-me" ||
    source?.toLowerCase() === "hiring-page"
  )
}

const offerJobHref = (
  jobListingId: string,
  offerId: string,
  participantId: string | undefined,
  metadata: Record<string, unknown>
) => {
  const params = new URLSearchParams({
    view: "offer",
    visibility: isHiringFlowOfferMetadata(metadata) ? "private" : "public",
    contractId: offerId,
  })
  if (participantId) params.set("participantId", participantId)
  return `${jobDetailsUrl(jobListingId)}?${params.toString()}`
}
