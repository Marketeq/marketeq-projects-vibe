import type { NotificationItem as ApiNotificationItem } from "@/service/http/notifications"

export type NotificationKind = "system" | "team" | "project" | "message"
export type NotificationMetadata = Record<string, unknown> | null | undefined

export type UiNotificationItem = {
  id: string
  kind: NotificationKind
  title: string
  description: string
  timeLabel: string
  href: string
  ctaLabel: string
  read: boolean
  category: string
  event?: string
  metadata?: NotificationMetadata
  isUserNotification: boolean
  avatarSrc?: string
  avatarAlt: string
}

export type AblyNotificationPayload = {
  id: string
  title: string
  body: string
  link?: string
  category: string
  metadata?: Record<string, unknown> | null
}

const DEFAULT_USER_NOTIFICATION_AVATAR = "/man.jpg"

const readAvatarUrl = (metadata?: NotificationMetadata) => {
  const avatarUrl = metadata?.avatarUrl
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

export const isUserNotification = (
  item: Pick<ApiNotificationItem, "title" | "category" | "event"> & {
    metadata?: NotificationMetadata
  },
  kind: NotificationKind
) => {
  const normalizedTitle = item.title?.trim?.() || ""
  return (
    kind === "message" ||
    normalizedTitle.startsWith("@") ||
    !!readAvatarUrl(item.metadata) ||
    typeof item.metadata?.senderUsername === "string"
  )
}

const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

export const formatNotificationTime = (value: string) => {
  const timestamp = new Date(value).getTime()
  const deltaSeconds = Math.round((timestamp - Date.now()) / 1000)

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

  return "just now"
}

export const getNotificationKind = (item: ApiNotificationItem): NotificationKind => {
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

export const getNotificationHref = (item: ApiNotificationItem, kind: NotificationKind) => {
  if (item.link) return item.link

  switch (kind) {
    case "message":
      return "/inbox"
    case "team":
      return "/my-team"
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
      return "Open team"
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
    (item as ApiNotificationItem & { metadata?: NotificationMetadata }).metadata ||
    null
  const userNotification = isUserNotification({ ...item, metadata }, kind)

  return {
    id: item.id,
    kind,
    title: item.title,
    description: item.body,
    timeLabel: formatNotificationTime(item.createdAt),
    href: getNotificationHref(item, kind),
    ctaLabel: getNotificationCta(kind, metadata),
    read: item.isRead,
    category: item.category,
    event: item.event,
    metadata,
    isUserNotification: userNotification,
    avatarSrc:
      readAvatarUrl(metadata) ||
      (userNotification ? DEFAULT_USER_NOTIFICATION_AVATAR : undefined),
    avatarAlt: item.title,
  }
}

export const mapAblyNotificationToUi = (
  item: AblyNotificationPayload
): UiNotificationItem => {
  const kind = getNotificationKind({
    id: item.id,
    title: item.title,
    body: item.body,
    link: item.link,
    category: item.category,
    event: "",
    isRead: false,
    isArchived: false,
    createdAt: new Date().toISOString(),
  })

  const userNotification = isUserNotification(
    {
      title: item.title,
      category: item.category,
      event: "",
      metadata: item.metadata,
    },
    kind
  )

  return {
    id: item.id,
    kind,
    title: item.title,
    description: item.body,
    timeLabel: "just now",
    href: getNotificationHref(
      {
        id: item.id,
        title: item.title,
        body: item.body,
        link: item.link,
        category: item.category,
        event: "",
        isRead: false,
        isArchived: false,
        createdAt: new Date().toISOString(),
      },
      kind
    ),
    ctaLabel: getNotificationCta(kind, item.metadata),
    read: false,
    category: item.category,
    event: "",
    metadata: item.metadata,
    isUserNotification: userNotification,
    avatarSrc:
      readAvatarUrl(item.metadata) ||
      (userNotification ? DEFAULT_USER_NOTIFICATION_AVATAR : undefined),
    avatarAlt: item.title,
  }
}
