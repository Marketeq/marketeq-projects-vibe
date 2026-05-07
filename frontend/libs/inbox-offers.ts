import type { OfferDialogData } from "@/components/offer-dialog.types"

export interface InboxOfferMessage {
  kind: "offer"
  contractId?: string
  senderAvatarSrc?: string
  ctaLabel: string
  viewJobHref?: string
  messageBody: string
  data: OfferDialogData
}

type InboxOfferCandidate = {
  kind?: string
  type?: string
  contractId?: string
  senderAvatarSrc?: string
  senderDisplayName?: string
  senderUsername?: string
  senderProfileHref?: string
  offerType?: string
  receivedLabel?: string
  receivedAt?: string
  offerTitle?: string
  offerRate?: string
  role?: string
  duration?: string
  schedule?: string
  scheduleLabel?: string
  startDate?: string
  expiresLabel?: string
  expiresAt?: string
  viewJobHref?: string
  jobHref?: string
  ctaLabel?: string
  messageBody?: string
  body?: string
  data?: Partial<OfferDialogData>
}

const DEFAULT_MESSAGE_BODY =
  "I am developing an application focused on delivering an industry-leading user experience and would like to invite you to join the project as our lead UX Designer."

const trimString = (value?: string | null) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined

const ensureUsernameHandle = (value?: string) => {
  if (!value) return "@lauradesign21"
  return value.startsWith("@") ? value : `@${value}`
}

const formatShortDate = (value?: string, fallback?: string) => {
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

const normalizeOfferMessage = (
  candidate: InboxOfferCandidate
): InboxOfferMessage => {
  const data = candidate.data ?? {}
  const senderUsername = ensureUsernameHandle(
    trimString(candidate.senderUsername)
  )

  return {
    kind: "offer",
    contractId: trimString(candidate.contractId),
    senderAvatarSrc: trimString(candidate.senderAvatarSrc),
    ctaLabel: trimString(candidate.ctaLabel) || "View Offer",
    viewJobHref:
      trimString(candidate.viewJobHref) ||
      trimString(candidate.jobHref) ||
      "/inbox",
    messageBody:
      trimString(candidate.messageBody) ||
      trimString(candidate.body) ||
      DEFAULT_MESSAGE_BODY,
    data: {
      senderDisplayName:
        trimString(candidate.senderDisplayName) ||
        trimString(data.senderDisplayName) ||
        "Laura",
      senderUsername,
      senderProfileHref:
        trimString(candidate.senderProfileHref) ||
        trimString(data.senderProfileHref),
      offerType:
        trimString(candidate.offerType) ||
        trimString(data.offerType) ||
        "Project",
      receivedLabel:
        trimString(candidate.receivedLabel) ||
        trimString(data.receivedLabel) ||
        formatShortDate(trimString(candidate.receivedAt), "Feb 1, 2025") ||
        "Feb 1, 2025",
      offerTitle:
        trimString(candidate.offerTitle) ||
        trimString(data.offerTitle) ||
        "The Ultimate Mobile App Experience",
      offerRate:
        trimString(candidate.offerRate) ||
        trimString(data.offerRate) ||
        "$45/hr",
      role: trimString(candidate.role) || trimString(data.role) || "UX Designer",
      duration:
        trimString(candidate.duration) || trimString(data.duration) || "4 Months",
      schedule:
        trimString(candidate.scheduleLabel) ||
        trimString(candidate.schedule) ||
        trimString(data.schedule) ||
        "Full Time",
      startDate:
        trimString(candidate.startDate) ||
        trimString(data.startDate) ||
        formatOfferStartDate(undefined, "Feb 5th, 2025") ||
        "Feb 5th, 2025",
      expiresLabel:
        trimString(candidate.expiresLabel) ||
        trimString(data.expiresLabel) ||
        formatShortDate(trimString(candidate.expiresAt), "Sep 19, 2025") ||
        "Sep 19, 2025",
    },
  }
}

export const parseInboxOfferMessage = (
  content?: string | null
): InboxOfferMessage | null => {
  if (!content) return null

  try {
    const parsed = JSON.parse(content) as InboxOfferCandidate
    const kind = trimString(parsed.kind) || trimString(parsed.type)
    if (kind !== "offer") return null

    return normalizeOfferMessage(parsed)
  } catch {
    return null
  }
}

export const getInboxMessagePreview = (
  content?: string | null,
  options?: { sentByCurrentUser?: boolean }
) => {
  const offer = parseInboxOfferMessage(content)
  if (offer) {
    return options?.sentByCurrentUser
      ? `You sent an offer for ${offer.data.offerTitle}`
      : `${offer.data.senderUsername} sent you an offer`
  }

  const fallback = trimString(content)
  return fallback ? fallback.replace(/\s+/g, " ") : ""
}
