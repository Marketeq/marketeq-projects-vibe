import { Fragment, type ReactNode, createElement } from "react"
import type { NotificationItem as ApiNotificationItem } from "@/service/http/notifications"

export type NotificationKind = "system" | "team" | "project" | "message"
export type NotificationMetadata = Record<string, unknown> | null | undefined

export type UiNotificationItem = {
  id: string
  kind: NotificationKind
  title: string
  description: ReactNode
  timeLabel: string
  href: string
  ctaLabel: string
  read: boolean
  category: string
  event?: string
  metadata?: NotificationMetadata
  isUserNotification: boolean
  isOfferNotification: boolean
  avatarSrc?: string
  avatarAlt: string
  senderDisplayName?: string
  senderUsername?: string
}

export type AblyNotificationPayload = {
  id: string
  title: string
  body: string
  link?: string
  category: string
  event?: string
  metadata?: Record<string, unknown> | null
}

const DEFAULT_USER_NOTIFICATION_AVATAR = "/man.jpg"

const readAvatarUrl = (metadata?: NotificationMetadata) => {
  const avatarUrl =
    metadata?.senderAvatarUrl ??
    metadata?.senderAvatarSrc ??
    metadata?.senderAvatar ??
    metadata?.avatarUrl
  return typeof avatarUrl === "string" && avatarUrl.trim().length > 0
    ? avatarUrl
    : undefined
}

const readCtaLabel = (metadata?: NotificationMetadata) => {
  const ctaLabel = metadata?.ctaLabel
  return typeof ctaLabel === "string" && ctaLabel.trim().length > 0
    ? ctaLabel
    : undefined
}

const isOfferNotification = (item: {
  category?: string
  event?: string
  title?: string
}) =>
  item.category?.toLowerCase().includes("offer") === true ||
  item.event?.toLowerCase().includes("offer") === true ||
  item.title?.toLowerCase().includes("offer") === true

const OFFER_NOTIFICATION_CTA: Record<string, string> = {
  "contract.offer.received": "View Offer",
  "offer.received": "View Offer",
  "offer.created": "View Offer",
  "offer.edited": "View Offer",
  "offer.resent": "View Offer",
  "offer.accepted": "View Contracts",
  "offer.declined": "View Details",
  "offer.withdrawn": "View Details",
  "offer.expiring_soon": "View Offer",
  "offer.expired": "View Details",
  "offer.countered": "View Counter Offer",
  "offer.counter_edited": "View Counter Offer",
  "offer.counter_accepted": "View Contracts",
  "offer.counter_declined": "View Active Offer",
  "offer.counter_withdrawn": "View Offer Details",
  "offer.counter_expiring_soon": "View Counter Offer",
  "offer.counter_expired": "View Details",
}

const OFFER_NOTIFICATION_TITLE: Record<string, string> = {
  "contract.offer.received": "New Offer",
  "offer.received": "New Offer",
  "offer.created": "New Offer",
  "offer.edited": "Offer Edited",
  "offer.resent": "New Offer",
  "offer.accepted": "Offer Accepted",
  "offer.declined": "Offer Declined",
  "offer.withdrawn": "Offer Withdrawn",
  "offer.expiring_soon": "Offer Expiring Soon",
  "offer.expired": "Offer Expired",
  "offer.countered": "Counter Offer",
  "offer.counter_edited": "Counter Offer Edited",
  "offer.counter_accepted": "Counter Offer Accepted",
  "offer.counter_declined": "Counter Offer Declined",
  "offer.counter_withdrawn": "Counter Offer Withdrawn",
  "offer.counter_expiring_soon": "Counter Offer Expiring Soon",
  "offer.counter_expired": "Counter Offer Expired",
}

const inferOfferEventFromTitle = (title: string): string => {
  const normalized = title.toLowerCase()
  const isCounter = normalized.includes("counter")

  if (normalized.includes("expiring soon")) {
    return isCounter ? "offer.counter_expiring_soon" : "offer.expiring_soon"
  }
  if (normalized.includes("accepted")) {
    return isCounter ? "offer.counter_accepted" : "offer.accepted"
  }
  if (normalized.includes("declined")) {
    return isCounter ? "offer.counter_declined" : "offer.declined"
  }
  if (normalized.includes("withdrawn")) {
    return isCounter ? "offer.counter_withdrawn" : "offer.withdrawn"
  }
  if (normalized.includes("expired")) {
    return isCounter ? "offer.counter_expired" : "offer.expired"
  }
  if (normalized.includes("edited")) {
    return isCounter ? "offer.counter_edited" : "offer.edited"
  }
  return isCounter ? "offer.countered" : "offer.received"
}

const getOfferNotificationCta = (item: { event?: string; title?: string }) => {
  const event = item.event?.toLowerCase() || ""
  const title = item.title?.toLowerCase() || ""
  if (title.includes("counter offer")) {
    if (title.includes("accepted")) return "View Contracts"
    if (title.includes("declined")) {
      return "View Active Offer"
    }
    if (title.includes("withdrawn")) {
      return "View Offer Details"
    }
    if (title.includes("expired")) return "View Details"
    return "View Counter Offer"
  }
  if (OFFER_NOTIFICATION_CTA[event]) return OFFER_NOTIFICATION_CTA[event]
  if (title.includes("accepted")) return "View Contracts"
  if (
    title.includes("declined") ||
    title.includes("withdrawn") ||
    title.includes("expired")
  ) {
    return "View Details"
  }
  return "View Offer"
}

const readMetadataText = (
  metadata: NotificationMetadata,
  key: string
): string | undefined => {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

const ensureUsernameHandle = (value?: string) => {
  if (!value) return undefined
  return value.startsWith("@") ? value : `@${value}`
}

const emphasizeContractTitle = (text: string, contractTitle: string) => {
  const titleIndex = text.lastIndexOf(contractTitle)
  if (titleIndex < 0) return text

  return createElement(
    Fragment,
    null,
    text.slice(0, titleIndex),
    createElement("span", { className: "font-semibold" }, contractTitle),
    text.slice(titleIndex + contractTitle.length)
  )
}

const getOfferSubject = (
  contractType: string,
  contractTitle: string,
  event: string
) => {
  const normalizedType = contractType.toUpperCase()
  if (normalizedType === "SERVICE") return `for the service ${contractTitle}`
  if (normalizedType === "TEAM") return `to join the team ${contractTitle}`
  if (normalizedType === "CONTRACT" || normalizedType === "INDIVIDUAL") {
    return `for the role ${contractTitle}`
  }
  if (event === "offer.withdrawn") return `for project ${contractTitle}`
  return `${event.includes("counter") ? "for the project" : "to join the project"} ${contractTitle}`
}

const getExpiringOfferSubject = (
  contractType: string,
  contractTitle: string
) => {
  const normalizedType = contractType.toUpperCase()
  if (normalizedType === "SERVICE") return `for the service ${contractTitle}`
  if (normalizedType === "TEAM") return `for the team ${contractTitle}`
  if (normalizedType === "CONTRACT" || normalizedType === "INDIVIDUAL") {
    return `for the role ${contractTitle}`
  }
  return `for the project ${contractTitle}`
}

const formatOfferNotificationDescription = (
  item: Pick<ApiNotificationItem, "body" | "event">,
  metadata: NotificationMetadata
) => {
  const event = item.event?.toLowerCase() || ""
  const contractTitle =
    readMetadataText(metadata, "contractTitle") ||
    readMetadataText(metadata, "offerTitle") ||
    readMetadataText(metadata, "projectTitle")
  const contractType =
    readMetadataText(metadata, "contractType") ||
    readMetadataText(metadata, "offerType") ||
    "PROJECT"

  if (
    contractTitle &&
    (event === "offer.expired" ||
      event === "offer.expiring_soon" ||
      event === "offer.counter_expired" ||
      event === "offer.counter_expiring_soon")
  ) {
    const cleanTitle = contractTitle.split(/\s+(?:--|—)\s+/)[0].trim()
    const isCounterOffer = event.includes("counter")
    const subject =
      isCounterOffer && contractType.toUpperCase() === "TEAM"
        ? `to join the team ${cleanTitle}`
        : getExpiringOfferSubject(contractType, cleanTitle)
    const noun = isCounterOffer ? "counter offer" : "offer"
    const description = event.endsWith("expiring_soon")
      ? `The ${noun} ${subject} expires in 48h.${
          isCounterOffer && contractType.toUpperCase() === "PROJECT" ? "." : ""
        }`
      : `The ${noun} ${subject} has expired.`
    return emphasizeContractTitle(description, cleanTitle)
  }

  const username = ensureUsernameHandle(
    readMetadataText(metadata, "senderUsername")
  )
  if (!username) return item.body

  if (!contractTitle) {
    return item.body.trim().startsWith("@")
      ? item.body
      : `${username} ${item.body.charAt(0).toLowerCase()}${item.body.slice(1)}`
  }

  const actionByEvent: Record<string, string> = {
    "contract.offer.received": "sent you an offer",
    "offer.received": "sent you an offer",
    "offer.created": "sent you an offer",
    "offer.edited": "edited the offer",
    "offer.resent": "resent you an offer",
    "offer.accepted": "accepted your offer",
    "offer.declined": "declined your offer",
    "offer.withdrawn": "withdrew the offer",
    "offer.countered": "sent you a counter offer",
    "offer.counter_edited": "edited their counter offer",
    "offer.counter_accepted": "accepted your counter offer",
    "offer.counter_declined": "declined your counter offer",
    "offer.counter_withdrawn": "withdrew their counter offer",
  }
  const action = actionByEvent[event]
  if (!action) {
    return item.body.trim().startsWith("@")
      ? item.body
      : `${username} ${item.body.charAt(0).toLowerCase()}${item.body.slice(1)}`
  }

  const cleanTitle = contractTitle.split(/\s+(?:--|—)\s+/)[0].trim()

  if (event === "offer.accepted") {
    const normalizedType = contractType.toUpperCase()
    if (normalizedType === "SERVICE") {
      return emphasizeContractTitle(
        `${username} accepted your offer to for the project ${cleanTitle}.`,
        cleanTitle
      )
    }
    if (normalizedType === "TEAM") {
      return emphasizeContractTitle(
        `${username} accepted your offer to join the team ${cleanTitle}.`,
        cleanTitle
      )
    }
    if (normalizedType === "CONTRACT" || normalizedType === "INDIVIDUAL") {
      return emphasizeContractTitle(
        `${username} accepted your offer for the role ${cleanTitle}.`,
        cleanTitle
      )
    }
    return emphasizeContractTitle(
      `${username} accepted your offer to join the project ${cleanTitle}.`,
      cleanTitle
    )
  }

  if (event === "offer.declined") {
    const normalizedType = contractType.toUpperCase()
    if (normalizedType === "SERVICE") {
      return emphasizeContractTitle(
        `${username} declined your offer for the service ${cleanTitle}.`,
        cleanTitle
      )
    }
    if (normalizedType === "TEAM") {
      return emphasizeContractTitle(
        `${username} declined your offer to join the team ${cleanTitle}.`,
        cleanTitle
      )
    }
    if (normalizedType === "CONTRACT" || normalizedType === "INDIVIDUAL") {
      return emphasizeContractTitle(
        `${username} declined your offer for the role ${cleanTitle}.`,
        cleanTitle
      )
    }
    return emphasizeContractTitle(
      `${username} declined your offer to join the project ${cleanTitle}.`,
      cleanTitle
    )
  }

  if (event === "offer.countered") {
    const normalizedType = contractType.toUpperCase()
    if (normalizedType === "SERVICE") {
      return emphasizeContractTitle(
        `${username} sent you a counter offer for the service ${cleanTitle}.`,
        cleanTitle
      )
    }
    if (normalizedType === "TEAM") {
      return emphasizeContractTitle(
        `${username} sent you a counter offer to join the team ${cleanTitle}.`,
        cleanTitle
      )
    }
    if (normalizedType === "CONTRACT" || normalizedType === "INDIVIDUAL") {
      return emphasizeContractTitle(
        `${username} sent you a counter offer for the role ${cleanTitle}.`,
        cleanTitle
      )
    }
    return emphasizeContractTitle(
      `${username} sent you a counter offer for the project ${cleanTitle}.`,
      cleanTitle
    )
  }

  if (event === "offer.counter_edited") {
    const normalizedType = contractType.toUpperCase()
    if (normalizedType === "SERVICE") {
      return emphasizeContractTitle(
        `${username} edited the counter offer for the service ${cleanTitle}.`,
        cleanTitle
      )
    }
    if (normalizedType === "TEAM") {
      return emphasizeContractTitle(
        `${username} edited the counter offer to join the team ${cleanTitle}.`,
        cleanTitle
      )
    }
    if (normalizedType === "CONTRACT" || normalizedType === "INDIVIDUAL") {
      return emphasizeContractTitle(
        `${username} edited the counter offer for the role ${cleanTitle}.`,
        cleanTitle
      )
    }
    return emphasizeContractTitle(
      `${username} edited their counter offer for the project ${cleanTitle}.`,
      cleanTitle
    )
  }

  if (event === "offer.counter_withdrawn") {
    const normalizedType = contractType.toUpperCase()
    if (normalizedType === "SERVICE") {
      return emphasizeContractTitle(
        `${username} withdrew the offer for the service ${cleanTitle}.`,
        cleanTitle
      )
    }
    if (normalizedType === "TEAM") {
      return emphasizeContractTitle(
        `${username} withdrew the counter offer to join the team ${cleanTitle}.`,
        cleanTitle
      )
    }
    if (normalizedType === "CONTRACT" || normalizedType === "INDIVIDUAL") {
      return emphasizeContractTitle(
        `${username} withdrew the counter offer for the role ${cleanTitle}.`,
        cleanTitle
      )
    }
    return emphasizeContractTitle(
      `${username} withdrew their counter offer for the project ${cleanTitle}.`,
      cleanTitle
    )
  }

  return emphasizeContractTitle(
    `${username} ${action} ${getOfferSubject(contractType, cleanTitle, event)}.`,
    cleanTitle
  )
}

const formatGeneralNotificationDescription = (
  body: string,
  metadata: NotificationMetadata
) => {
  const referencedTitle =
    readMetadataText(metadata, "projectTitle") ||
    readMetadataText(metadata, "contractTitle") ||
    readMetadataText(metadata, "listingTitle") ||
    readMetadataText(metadata, "fileTitle")

  return referencedTitle ? emphasizeContractTitle(body, referencedTitle) : body
}

export const isUserNotification = (
  item: Pick<ApiNotificationItem, "title" | "category" | "event"> & {
    metadata?: NotificationMetadata
  },
  kind: NotificationKind
) => {
  const normalizedTitle = item.title?.trim?.() || ""
  return (
    isOfferNotification(item) ||
    kind === "message" ||
    normalizedTitle.startsWith("@") ||
    !!readAvatarUrl(item.metadata) ||
    typeof item.metadata?.senderUsername === "string" ||
    typeof item.metadata?.inviterUsername === "string" ||
    typeof item.metadata?.inviterId === "string"
  )
}

const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

export const formatNotificationTime = (value: string) => {
  const timestamp = new Date(value).getTime()
  const deltaSeconds = Math.round((timestamp - Date.now()) / 1000)

  // Anything inside the last minute reads as "Just now" rather than
  // "now" / "12 seconds ago". Also absorbs small client/server clock skew,
  // which would otherwise render a fresh notification as "in 2 seconds".
  if (Math.abs(deltaSeconds) < 60) return "Just now"

  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ]

  for (const [unit, secondsInUnit] of ranges) {
    if (Math.abs(deltaSeconds) >= secondsInUnit || unit === "second") {
      return formatter.format(Math.round(deltaSeconds / secondsInUnit), unit)
    }
  }

  return "Just now"
}

export const getNotificationKind = (
  item: ApiNotificationItem
): NotificationKind => {
  const category = item.category?.toLowerCase?.() || ""
  const event = item.event?.toLowerCase?.() || ""

  if (
    category.includes("message") ||
    category.includes("chat") ||
    event.includes("message") ||
    event.includes("thread")
  ) {
    return "message"
  }

  if (
    category.includes("team") ||
    category.includes("invite") ||
    event.includes("invite")
  ) {
    return "team"
  }

  if (
    category.includes("offer") ||
    event.includes("offer") ||
    category.includes("project") ||
    category.includes("contract") ||
    category.includes("listing") ||
    event.includes("project") ||
    event.includes("contract")
  ) {
    return "project"
  }

  return "system"
}

export const getNotificationHref = (
  item: ApiNotificationItem,
  kind: NotificationKind
) => {
  if (isOfferNotification(item)) {
    return "/notifications"
  }

  if (item.link) return item.link

  switch (kind) {
    case "message":
      return "/inbox"
    case "team":
      return "/my-network"
    case "project":
      return "/publish-project"
    case "system":
    default:
      return "/notifications"
  }
}

export const getNotificationCta = (
  kind: NotificationKind,
  metadata?: NotificationMetadata
) => {
  const metadataCta = readCtaLabel(metadata)
  if (metadataCta) return metadataCta

  switch (kind) {
    case "message":
      return "Open conversation"
    case "team":
      return "View Invite"
    case "project":
      return "Open details"
    case "system":
    default:
      return "View details"
  }
}

export const mapApiNotificationToUi = (
  item: ApiNotificationItem
): UiNotificationItem => {
  const kind = getNotificationKind(item)
  const metadata =
    (item as ApiNotificationItem & { metadata?: NotificationMetadata })
      .metadata || null
  const userNotification = isUserNotification({ ...item, metadata }, kind)
  const offerNotification = isOfferNotification(item)

  return {
    id: item.id,
    kind,
    title:
      OFFER_NOTIFICATION_TITLE[item.event?.toLowerCase() || ""] || item.title,
    description: offerNotification
      ? formatOfferNotificationDescription(item, metadata)
      : formatGeneralNotificationDescription(item.body, metadata),
    timeLabel: formatNotificationTime(item.createdAt),
    href: getNotificationHref(item, kind),
    ctaLabel: offerNotification
      ? getOfferNotificationCta(item)
      : getNotificationCta(kind, metadata),
    read: item.isRead,
    category: item.category,
    event: item.event,
    metadata,
    isUserNotification: userNotification,
    isOfferNotification: offerNotification,
    avatarSrc:
      readAvatarUrl(metadata) ||
      (userNotification ? DEFAULT_USER_NOTIFICATION_AVATAR : undefined),
    avatarAlt: item.title,
    senderDisplayName: readMetadataText(metadata, "senderDisplayName"),
    senderUsername: ensureUsernameHandle(
      readMetadataText(metadata, "senderUsername")
    ),
  }
}

export const mapAblyNotificationToUi = (
  item: AblyNotificationPayload
): UiNotificationItem => {
  const itemEvent = item.event || (item.metadata?.event as string) || ""
  const liveEvent =
    itemEvent ||
    (isOfferNotification(item) ? inferOfferEventFromTitle(item.title) : "")
  const kind = getNotificationKind({
    id: item.id,
    title: item.title,
    body: item.body,
    link: item.link,
    category: item.category,
    event: liveEvent,
    isRead: false,
    isArchived: false,
    createdAt: new Date().toISOString(),
  })

  const userNotification = isUserNotification(
    {
      title: item.title,
      category: item.category,
      event: liveEvent,
      metadata: item.metadata,
    },
    kind
  )
  const liveOfferNotification = {
    category: item.category,
    event: liveEvent,
    title: item.title,
  }
  const offerNotification = isOfferNotification(liveOfferNotification)

  return {
    id: item.id,
    kind,
    title: item.title,
    description: offerNotification
      ? formatOfferNotificationDescription(
          { body: item.body, event: liveEvent },
          item.metadata
        )
      : formatGeneralNotificationDescription(item.body, item.metadata),
    timeLabel: "Just now",
    href: getNotificationHref(
      {
        id: item.id,
        title: item.title,
        body: item.body,
        link: item.link,
        category: item.category,
        event: liveEvent,
        metadata: item.metadata,
        isRead: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
      },
      kind
    ),
    ctaLabel: offerNotification
      ? getOfferNotificationCta(liveOfferNotification)
      : getNotificationCta(kind, item.metadata),
    read: false,
    category: item.category,
    event: liveEvent,
    metadata: item.metadata,
    isUserNotification: userNotification,
    isOfferNotification: offerNotification,
    avatarSrc:
      readAvatarUrl(item.metadata) ||
      (userNotification ? DEFAULT_USER_NOTIFICATION_AVATAR : undefined),
    avatarAlt: item.title,
    senderDisplayName: readMetadataText(item.metadata, "senderDisplayName"),
    senderUsername: ensureUsernameHandle(
      readMetadataText(item.metadata, "senderUsername")
    ),
  }
}
