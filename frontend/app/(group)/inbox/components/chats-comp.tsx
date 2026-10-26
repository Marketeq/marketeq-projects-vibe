"use client"

import React, { useCallback, useMemo, useRef, useState } from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { decryptAES, decryptWithPrivateKey } from "@/src/crypto/e2ee"
import { exportPrivateKey, republishPublicKey } from "@/src/crypto/keys"
import { loadKey, saveKey } from "@/src/crypto/storage"
import { ApiError, apiFetch } from "@/src/lib/api"
import { formatNotificationTime } from "@/libs/notifications"
import { acceptCounterOffer, acceptOffer, createCounterOffer, declineCounterOffer, declineOffer, editCounterOffer, withdrawCounterOffer, withdrawOffer } from "@/service/http/offers"
import { getCurrentUser } from "@/utils/auth"
import { getOtherParticipantId } from "@/utils/conversation"
import {
  DataEmoji,
  EmojiProperties,
  cn,
  noop,
  toPxIfNumber,
} from "@/utils/functions"
import { useControllableState, useIsomorphicLayoutEffect } from "@/utils/hooks"
import { subscribeMessagingEvents } from "@/utils/messagingBroadcast"
import { useAblyChannel } from "@/utils/useAblyChannel"
import { useAblyPresence } from "@/utils/useAblyPresence"
import { useOnlineUsers } from "@/utils/useOnlineUsers"
import { useUserChannel } from "@/utils/useUserChannel"
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Archive,
  Attachment01,
  Calendar,
  ChevronDown,
  Clock,
  CornerUpLeft,
  Briefcase,
  DollarSign,
  Edit05,
  File,
  Image03,
  Info,
  Mail05,
  MessageSquare,
  MoreHorizontal,
  Pin02,
  Plus,
  Repeat,
  SearchMd,
  Send,
  Smile,
  Star,
  Trash2,
  UploadCloud,
  User as UserIcon,
  X,
} from "@blend-metrics/icons"
import {
  DropboxBrand,
  GoogleDrive1Brand,
  MsOnedriveBrand,
} from "@blend-metrics/icons/brands"
import { DropdownMenuArrow } from "@radix-ui/react-dropdown-menu"
import { format, isSameDay, parseISO } from "date-fns"
import { useMeasure, useToggle } from "react-use"
import { Conversation } from "@/types/conversation"
import { Message, MessageAttachment } from "@/types/message"
import type { DeclineChip, OfferStatus } from "@/types/offer"
import { User } from "@/types/user"
import { Spinner } from "@/components/ui/spinner/spinner"
import { toast } from "@/components/ui/toast/use-toast"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import { Chat, ChatsContextProvider, useChatsContext } from "@/components/chat"
import { CounterOfferDialog } from "@/components/counter-offer-dialog"
import { EmojiPicker, type Result as TenorGif } from "@/components/emoji-picker"
import type { OfferDialogData } from "@/components/offer-dialog.types"
import { OfferHistoryDialog } from "@/components/offer-history-dialog"
import {
  OfferFlowDialog,
  type OfferFlowDialogVariant,
} from "@/components/offer-flow-dialog"
import { useOfferChannel } from "@/utils/useOfferChannel"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
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
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  ScrollArea,
  ScrollBar,
  Textarea,
  ToastAction,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"
import { UNDECRYPTABLE_PLACEHOLDER } from "../constants"
import {
  openDropboxChooser,
  openGoogleDrivePicker,
} from "../hooks/use-cloud-picker"
import { useEditMessage } from "../hooks/use-edit-message"
import { useFileUpload } from "../hooks/use-file-upload"
import { addParticipantToGroup } from "../hooks/use-group-encryption"
import { useMessages } from "../hooks/use-messages"
import { useSendMessage } from "../hooks/use-send-message"
import { useThreadActions } from "../hooks/use-thread-actions"
import { clearDraft, loadDraft, saveDraft } from "../lib/drafts"
import { BlockReportDialog } from "./block-report-dialog"
import { ForwardMessageDialog } from "./forward-message-dialog"
import { Bubble, YourBubble } from "./message-components"
import { OneDrivePickerDialog } from "./onedrive-picker-dialog"

/**
 * Turn a key-unwrap failure into a message that matches what actually went
 * wrong. Every failure here used to be reported as a decryption error, so an
 * expired session or an unreachable backend told the user their conversation
 * key was corrupt — pointing debugging at the crypto layer instead of the
 * session. Only a genuine crypto failure gets the decryption wording.
 */
function describeKeyFailure(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401)
      return "Your session expired. Sign in again to view this conversation."
    if (err.status === 403) return "You don't have access to this conversation."
    if (err.status === 404)
      return "This conversation's encryption key is no longer available."
    // 409/422 are both permanent server-side key-material problems. Telling the
    // user to retry would be false — no amount of retrying recovers these.
    if (err.status === 409 || err.status === 422)
      return "This conversation can't be unlocked. Its encryption key is missing from the server — contact support."
    if (err.status >= 500)
      return "Messaging is temporarily unavailable. Try again in a moment."
    return "Couldn't load this conversation. Try again."
  }
  if (err instanceof TypeError) {
    // fetch() rejects with TypeError for network/CORS failures
    return "Couldn't reach the server. Check your connection and try again."
  }
  return "Could not decrypt this conversation key. Refresh and try again."
}

interface ChatsProps {
  selectedConversation: Conversation | null
  setSelectedConversation?: (conv: Conversation | null) => void
  /** Patches a conversation directly in the sidebar's list (see
   * left-sidebar.tsx's registerPatchConversation) so header actions like
   * the favorite star show up in the list without an Ably round-trip. */
  onPatchConversation?: (id: string, patch: Partial<Conversation>) => void
  jwtToken: string
  privateKey: CryptoKey | null
  currentUserProfile?: any
  onToggleRightSidebar?: () => void
  onMessagesLoaded?: (convId: string, msgs: Message[]) => void
  /** When set, the matching message is scrolled into view and briefly flashed. */
  highlightMessageId?: string | null
  /** Called after the highlight has been consumed (scrolled to). */
  onHighlightConsumed?: () => void
  /** Append a freshly sent/received message into the search index so it's
   * immediately searchable without waiting for the next page reload. */
  onIndexNewMessage?: (doc: {
    id: string
    threadId: string
    senderId: string
    content: string
    createdAt: string
    attachments?: Message["attachments"]
  }) => void
  acceptedOfferCard?: AcceptedOfferCardData | null
  counterOfferCard?: CounterOfferCardData | null
  declinedOfferCard?: DeclinedOfferCardData | null
  offerNotificationMessages?: OfferNotificationMessageData[]
  /** Ably 'offer.updated' fired (or the channel reconnected) for the
   * currently open offer notification — re-run the existing notification
   * list refetch so selectedNotificationOffer picks up fresh data. */
  onOfferUpdateRequested?: () => void
}

const COMPOSER_MAX_CHARS = 8000

const MAX_FILE_BYTES = 50 * 1024 * 1024

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/zip",
  "video/mp4",
  "video/quicktime",
])

interface RejectedFile {
  id: string
  name: string
  size: number
  error: string
}

const validateFile = (file: File): string | null => {
  if (file.size > MAX_FILE_BYTES) {
    return `Too large (max ${Math.round(MAX_FILE_BYTES / (1024 * 1024))}MB)`
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return "Unsupported file type"
  }
  return null
}

interface UploadedAttachmentResult {
  message: Partial<Message> & {
    id: string
    senderId: string
    createdAt: string
    updatedAt: string
  }
  attachment: MessageAttachment
}

const formatDateSeparator = (iso: string): string => {
  const d = parseISO(iso)
  return format(d, "MMM d, yyyy")
}

const DateSeparator = ({
  label,
  className = "",
}: {
  label: string
  className?: string
}) => (
  <div
    className={`flex items-center gap-x-3 py-1 ${className}`}
    role="separator"
    aria-label={label}
  >
    <div className="h-px flex-1 bg-gray-200" />
    <span className="text-[11px] font-medium text-gray-500 shrink-0">
      {label}
    </span>
    <div className="h-px flex-1 bg-gray-200" />
  </div>
)

export interface AcceptedOfferCardData {
  status: "accepted"
  contractId: string
  offerTitle: string
  offerType: string
  offerRate: string
  role: string
  duration: string
  schedule: string
  startDate: string
  acceptanceMessage?: string
}

export interface CounterOfferCardData {
  status: "submitted"
  contractId: string
  offerTitle: string
  offerType: string
  offerRate: string
  duration: string
  schedule: string
  startDate: string
  expiresLabel: string
  message?: string
}

export interface DeclinedOfferCardData {
  status: "declined"
  contractId: string
  offerTitle: string
  offerType: string
  receivedLabel?: string
  declinedAt?: string
  declinedLabel?: string
  offerRate: string
  role: string
  duration: string
  schedule: string
  startDate: string
  senderDisplayName?: string
  senderUsername?: string
  senderAvatarSrc?: string
  declineMessage?: string
  declineReason?: string
}

export interface OfferNotificationMessageData {
  id: string
  contractId: string
  // PMCM-393 AC-42: the offer's live status as of the last refetch — distinct
  // from `event` below, which is fixed to whatever this notification's own
  // event type was when it was created and never changes. Undefined means
  // "no live signal" (seeded fixtures, or the offer-service lookup failed)
  // and must never be treated as withdrawn/expired.
  offerStatus?: OfferStatus
  // PMCM-392 AC-40.06: the real contracts-service contract id, once one
  // exists — a different thing from `contractId` above, which (despite the
  // name) is this offer's own id. Undefined means no contract yet, same
  // "no live signal" rule as offerStatus: never invent one, never treat
  // absence as an error.
  realContractId?: string | null
  // PMCM-376: the id of this offer's own latest counter offer (whatever its
  // status), sourced from getOffer()'s latestCounterOffer.id. Undefined
  // means "no live signal" — the seeded catch branch in page.tsx never sets
  // this, and neither does a pre-PMCM-376-backend-merge fetch. Never invent
  // one; a withdraw action must stay disabled/hidden when this is absent.
  latestCounterOfferId?: string
  event: string
  title: string
  body: string
  href: string
  viewJobHref: string
  jobListingId: string
  createdAt: string
  actorId: string
  threadId?: string
  senderDisplayName: string
  senderUsername: string
  senderAvatarSrc?: string
  offerTitle: string
  offerType: string
  offerRate: string
  originalOfferRate?: string
  originalDuration?: string
  originalSchedule?: string
  originalStartDate?: string
  role: string
  duration: string
  schedule: string
  scheduleDetail?: string
  startDate: string
  expiresLabel: string
  seeded?: boolean
  clientPerspective?: boolean
  withdrawnByViewer?: boolean
  withdrawalMessage?: string
  declineReason?: string
  counterOfferMessage?: string
  counterOfferFromClient?: boolean
  extensionRequestVariant?: boolean
  singleMessageOnly?: boolean
  recipientFirstName?: string
}

const COUNTER_OFFER_STORAGE_PREFIX = "inbox_counter_offer_submitted"

// BTB-287: OfferFlowDialog's own DECLINE_REASONS chip labels
// (offer-flow-dialog.tsx, not exported) mapped to offer-service's
// DeclineChip enum (decline-chip.enum.ts) — same six reasons, same order.
// The dialog only ever hands back the human label via
// onDeclineReasonChange; DeclineOfferDto's optional `chip` field needs the
// enum value, so this is the one place that conversion has to happen.
const DECLINE_CHIP_BY_REASON: Record<string, DeclineChip> = {
  "Budget doesn’t work": "BUDGET_DOESNT_WORK",
  "Start date doesn’t work": "START_DATE_DOESNT_WORK",
  "Requirements are unclear": "REQUIREMENTS_UNCLEAR",
  "Not a fit for my skills": "NOT_A_FIT",
  "Too busy right now": "TOO_BUSY",
  "Need different terms": "NEED_DIFFERENT_TERMS",
}

// PMCM-392 AC-40.02: "Monday, Jan 30, 2025" — the weekday variant, matching
// offer-service's own OfferResponse.startDateDisplay spec and the identical
// toLocaleDateString call already in hire-me-button.tsx. Display-time only:
// the already-formatted "Jan 30, 2025" values this reads (selectedNotificationOfferData.startDate,
// acceptedOfferCard.startDate) are untouched everywhere else they render.
const formatAcceptedHeadlineDate = (startDate: string): string => {
  const parsed = new Date(startDate)
  return Number.isNaN(parsed.getTime())
    ? startDate
    : parsed.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
}

// BTB-365: offer-state-machine.ts's OfferConcurrentModificationException —
// the ONE other party's accept/decline/withdraw/edit landed between this
// viewer's last refetch and this click, so the CAS update affected 0 rows.
// HTTP 409, { error: "OFFER_CONCURRENT_MODIFICATION", message: "..." }
// (offer-exception.filter.ts's generic OfferServiceException case) — this
// mapping doesn't exist anywhere in the frontend yet (confirmed via a
// repo-wide search before writing this), so every accept/decline/withdraw/
// edit handler's catch block still shows the same generic
// "Couldn't <verb> the <offer>. Please try again." regardless of cause.
// Scoped to Accept only here, per this ticket — not retrofitted onto the
// other already-shipped handlers.
const getAcceptFailureMessage = (error: unknown, fallback: string): string => {
  const errorCode = (error as { response?: { data?: { error?: string } } })
    ?.response?.data?.error
  if (errorCode === "OFFER_CONCURRENT_MODIFICATION") {
    return "This was just updated elsewhere. Please reload and try again."
  }
  return fallback
}

// BTB-365/AC-27.04: the Contract row contracts-service creates on accept is
// asynchronous — offer-service's outbox drains on a 10s cron, then
// contracts-service's own subscriber has to process it — so the single
// onOfferUpdateRequested() refetch right after a successful accept will
// usually still see realContractId as null. onViewContract (below) is
// already gated on it being set; this re-triggers that same refetch a few
// more times on a short, bounded schedule so "View Contract" appears
// without the viewer needing to manually reload. Calling the setter after
// this component unmounts is a harmless no-op (React 18 just drops it) —
// no cleanup tracked here, same as every other fire-and-forget
// onOfferUpdateRequested?.() call in this file.
const pollForAcceptedContract = (onOfferUpdateRequested?: () => void) => {
  if (!onOfferUpdateRequested) return
  for (const delayMs of [4000, 8000, 13000, 19000]) {
    setTimeout(() => onOfferUpdateRequested(), delayMs)
  }
}

const OFFER_EVENT_ACTION: Record<string, string> = {
  "offer.received": "sent an offer",
  "offer.created": "sent an offer",
  "offer.edited": "edited the offer",
  "offer.resent": "resent the offer",
  "offer.accepted": "accepted the offer",
  "offer.declined": "declined the offer",
  "offer.withdrawn": "withdrew the offer",
  "offer.expiring_soon": "has an offer expiring soon",
  "offer.expired": "has an offer that expired",
  "offer.countered": "sent a counter offer",
  "offer.counter_edited": "edited the counter offer",
  "offer.counter_accepted": "accepted the counter offer",
  "offer.counter_declined": "declined the counter offer",
  "offer.counter_withdrawn": "withdrew the counter offer",
  "offer.counter_expiring_soon": "has a counter offer expiring soon",
  "offer.counter_expired": "has a counter offer that expired",
}

const offerInvitationMessage = (role: string) =>
  `I am developing an application focused on delivering an industry-leading user experience and would like to invite you to join the project as our ${role}.`

const OFFER_EVENT_STATE: Record<
  string,
  { label: string; visual: "success" | "error" | "warning" | "gray" }
> = {
  "offer.accepted": { label: "Offer Accepted", visual: "success" },
  "offer.counter_accepted": { label: "Offer Accepted", visual: "success" },
  "offer.declined": { label: "Offer Declined", visual: "error" },
  "offer.counter_declined": { label: "Offer Declined", visual: "error" },
  "offer.expiring_soon": { label: "Offer Pending", visual: "warning" },
  "offer.counter_expiring_soon": {
    label: "Offer Pending",
    visual: "warning",
  },
  "offer.countered": { label: "Offer Countered", visual: "gray" },
  "offer.counter_edited": { label: "Offer Countered", visual: "gray" },
  "offer.withdrawn": { label: "Offer Withdrawn", visual: "gray" },
  "offer.counter_withdrawn": { label: "Offer Withdrawn", visual: "gray" },
  "offer.expired": { label: "Offer Expired", visual: "gray" },
  "offer.counter_expired": { label: "Offer Expired", visual: "gray" },
}

const isMutedOfferEvent = (event: string) =>
  event.includes("countered") ||
  event.includes("withdrawn") ||
  event.includes("expired")

export function Chats({
  selectedConversation,
  setSelectedConversation,
  onPatchConversation,
  jwtToken,
  privateKey,
  currentUserProfile,
  onToggleRightSidebar,
  onMessagesLoaded,
  highlightMessageId,
  onHighlightConsumed,
  onIndexNewMessage,
  acceptedOfferCard,
  counterOfferCard,
  declinedOfferCard,
  offerNotificationMessages = [],
  onOfferUpdateRequested,
}: ChatsProps) {
  const router = useRouter()
  // AC-42.08: live connectivity, unlike the existing navigator.onLine
  // pre-flight checks elsewhere in this file (one-time checks paired with a
  // toast) — this needs to react while a dialog is already open. Named
  // isNetworkOnline (not isOnline) — that name is already the presence-check
  // function returned by useOnlineUsers() below.
  const [isNetworkOnline, setIsNetworkOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  )
  useEffect(() => {
    const goOnline = () => setIsNetworkOnline(true)
    const goOffline = () => setIsNetworkOnline(false)
    window.addEventListener("online", goOnline)
    window.addEventListener("offline", goOffline)
    return () => {
      window.removeEventListener("online", goOnline)
      window.removeEventListener("offline", goOffline)
    }
  }, [])
  const [textareaValue, setTextareaValue] = useState("")
  const lastTypedAtRef = useRef(0)
  const userTypedRef = useRef(false)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const messagesScrollRef = useRef<HTMLDivElement>(null)
  const [uploadModalMode, setUploadModalMode] = useState<
    "image" | "file" | null
  >(null)
  const [receiverUser, setReceiverUser] = useState<User | null>(null)
  const [counterpartDeleted, setCounterpartDeleted] = useState(false)
  const [starredMap, setStarredMap] = useState<Record<string, boolean>>({})
  const [declinedOfferDetailsOpen, setDeclinedOfferDetailsOpen] =
    useState(false)
  const [locallyDeclinedTalentOffers, setLocallyDeclinedTalentOffers] =
    useState<string[]>([])
  const [selectedNotificationOffer, setSelectedNotificationOffer] =
    useState<OfferNotificationMessageData | null>(null)

  // PMCM-393 AC-42: keep the open offer notification dialog live. The
  // channel event doesn't carry OfferNotificationMessageData's display shape
  // (formatted currency/duration/schedule strings), so rather than hand-merge
  // the raw payload, re-run the existing offerNotificationMessages refetch
  // (owned by the inbox page) and let the sync effect below pick up the
  // refreshed item — no parallel formatting/state.
  const { isLive: offerChannelIsLive, hasConnected: offerChannelHasConnected } =
    useOfferChannel(
      selectedNotificationOffer?.contractId,
      () => onOfferUpdateRequested?.(),
      () => onOfferUpdateRequested?.()
    )
  // AC-42.07: only once we've actually connected once — otherwise this would
  // read true (not live yet) for the brief moment every modal takes to open.
  const showOfferChannelReconnecting =
    offerChannelHasConnected && !offerChannelIsLive

  // AC-42.05: fires only when the expiry itself changed on a still-open
  // offer — not on every unrelated update — so it can't misfire together
  // with the withdrawn/expired button-swap below.
  const [showOfferUpdatedBanner, setShowOfferUpdatedBanner] = useState(false)
  useEffect(() => {
    if (!selectedNotificationOffer) setShowOfferUpdatedBanner(false)
  }, [selectedNotificationOffer])

  useEffect(() => {
    if (!selectedNotificationOffer) return
    const fresh = offerNotificationMessages.find(
      (item) => item.id === selectedNotificationOffer.id
    )
    if (fresh && fresh !== selectedNotificationOffer) {
      if (
        fresh.offerStatus === "PENDING" &&
        fresh.expiresLabel !== selectedNotificationOffer.expiresLabel
      ) {
        setShowOfferUpdatedBanner(true)
      }
      setSelectedNotificationOffer(fresh)
    }
  }, [offerNotificationMessages, selectedNotificationOffer])

  const [notificationOfferStep, setNotificationOfferStep] = useState<
    | "event"
    | "accept"
    | "accepted"
    | "decline"
    | "declined"
    | "counter"
    | "edit"
    | "edit-expired"
    | "resend-edit"
    | "history"
    | "previous"
    | "withdraw-confirm"
    | "resend"
    | "resend-summary"
    | "sent-counter"
    | "expired-counter"
    | "resend-counter"
  >("event")
  const [notificationAcceptanceMessage, setNotificationAcceptanceMessage] =
    useState("")
  const [notificationTermsAccepted, setNotificationTermsAccepted] =
    useState(false)
  const [notificationDeclineMessage, setNotificationDeclineMessage] =
    useState("")
  const [notificationDeclineReason, setNotificationDeclineReason] = useState("")
  const [notificationWithdrawalMessage, setNotificationWithdrawalMessage] =
    useState("")
  const [submittingCounterOffer, setSubmittingCounterOffer] = useState(false)
  // BTB-365: same double-submit-guard shape as decliningOffer/
  // decliningCounterOffer below — acceptingCounterOffer covers both
  // directions (client accepting a talent's counter, talent accepting a
  // client's counter), since both call the same acceptCounterOffer() and
  // never run concurrently in the same dialog instance.
  const [acceptingOffer, setAcceptingOffer] = useState(false)
  const [acceptingCounterOffer, setAcceptingCounterOffer] = useState(false)
  const [decliningOffer, setDecliningOffer] = useState(false)
  const [decliningCounterOffer, setDecliningCounterOffer] = useState(false)
  const [editingCounterOffer, setEditingCounterOffer] = useState(false)
  const [withdrawingCounterOffer, setWithdrawingCounterOffer] = useState(false)
  const [withdrawingOffer, setWithdrawingOffer] = useState(false)
  const [declinedCounterOfferMessage, setDeclinedCounterOfferMessage] =
    useState<OfferNotificationMessageData | null>(null)
  const [acceptedCounterOfferMessage, setAcceptedCounterOfferMessage] =
    useState<OfferNotificationMessageData | null>(null)
  const [acceptedCounterOfferBody, setAcceptedCounterOfferBody] = useState("")
  const [withdrawnClientOfferMessage, setWithdrawnClientOfferMessage] =
    useState<OfferNotificationMessageData | null>(null)
  const [withdrawnTalentCounterOfferMessage, setWithdrawnTalentCounterOfferMessage] =
    useState<OfferNotificationMessageData | null>(null)
  const [sentClientOfferMessages, setSentClientOfferMessages] = useState<
    OfferNotificationMessageData[]
  >([])
  const [notificationResendMessage, setNotificationResendMessage] =
    useState("")
  const [dismissedExpiredOfferActions, setDismissedExpiredOfferActions] =
    useState<string[]>([])
  const [reopenedExpiredOfferIds, setReopenedExpiredOfferIds] = useState<
    string[]
  >([])
  const [showClientPreviousStartDate, setShowClientPreviousStartDate] =
    useState(false)

  useEffect(() => {
    if (!showClientPreviousStartDate || !selectedNotificationOffer) return

    const previousValues: Record<string, string> = {
      "Offer Rate": selectedNotificationOffer.offerRate,
      "Contract Duration": selectedNotificationOffer.duration,
      "Work Schedule": selectedNotificationOffer.schedule,
      "Start Date": selectedNotificationOffer.startDate,
    }
    const normalizeValue = (value: string) =>
      value.replace(/\s+/g, " ").trim().toLowerCase()
    const decorateReviewChanges = () => {
      const reviewDialog = Array.from(
        document.querySelectorAll<HTMLElement>('[role="dialog"]')
      ).find((dialog) => dialog.textContent?.includes("Review your offer"))
      if (!reviewDialog) return

      const offerRateLabel = Array.from(
        reviewDialog.querySelectorAll<HTMLElement>("div")
      ).find((element) => element.textContent?.trim() === "Offer Rate")
      const offerRateValue = offerRateLabel?.parentElement?.children.item(1)
      const arrowTemplate =
        offerRateValue instanceof HTMLElement
          ? offerRateValue.querySelector("svg")?.cloneNode(true)
          : null

      for (const [label, previousValue] of Object.entries(previousValues)) {
        const labelElement = Array.from(
          reviewDialog.querySelectorAll<HTMLElement>("div")
        ).find((element) => element.textContent?.trim() === label)
        const value = labelElement?.parentElement?.children.item(1)
        if (!(value instanceof HTMLElement)) continue

        const currentValue =
          label === "Offer Rate"
            ? Array.from(value.querySelectorAll("span")).find(
                (span) => !span.textContent?.trim().startsWith("(was")
              )?.textContent || ""
            : value.textContent || ""
        const changed =
          normalizeValue(currentValue) !== normalizeValue(previousValue)

        if (label === "Offer Rate") {
          if (!changed) {
            value.querySelector("svg")?.remove()
            Array.from(value.querySelectorAll("span"))
              .find((span) => span.textContent?.trim().startsWith("(was"))
              ?.remove()
          } else {
            value
              .querySelector("svg")
              ?.classList.replace("text-success-500", "text-success-400")
          }
          continue
        }
        if (!changed) continue

        value.classList.add("flex", "items-center", "gap-2")
        if (arrowTemplate instanceof SVGElement) {
          const arrow = arrowTemplate.cloneNode(true) as SVGElement
          arrow.dataset.clientOfferChange = "true"
          arrow.classList.replace("text-success-500", "text-success-400")
          value.prepend(arrow)
        }

        const comparison = document.createElement("span")
        comparison.dataset.clientOfferChange = "true"
        comparison.className = "font-normal text-gray-400"
        comparison.textContent = `(was ${previousValue})`
        value.appendChild(comparison)
      }
    }

    const frame = requestAnimationFrame(decorateReviewChanges)
    return () => {
      cancelAnimationFrame(frame)
      document
        .querySelectorAll('[data-client-offer-change="true"]')
        .forEach((element) => element.remove())
    }
  }, [selectedNotificationOffer, showClientPreviousStartDate])

  useEffect(() => {
    if (
      sentClientOfferMessages.length === 0 &&
      !acceptedCounterOfferMessage &&
      !declinedCounterOfferMessage &&
      !withdrawnTalentCounterOfferMessage
    ) {
      return
    }
    requestAnimationFrame(() =>
      scrollRef.current?.scrollIntoView({ behavior: "smooth" })
    )
  }, [
    acceptedCounterOfferMessage,
    declinedCounterOfferMessage,
    sentClientOfferMessages.length,
    withdrawnTalentCounterOfferMessage,
  ])
  const acceptedOfferToastRef = useRef<string | null>(null)
  const submittedCounterOfferRef = useRef<string | null>(null)
  const declinedOfferToastRef = useRef<string | null>(null)

  const selectedNotificationOfferEventVariant =
    useMemo<OfferFlowDialogVariant>(() => {
      // BTB-365/AC-26.08: same liveStatusEvent fix as the inline chat card
      // below (PMCM-393 AC-42) — this dialog's own variant was still keyed
      // purely off selectedNotificationOffer.event, the notification's
      // frozen event type (set once, e.g. "offer.received"/
      // "offer.countered", never updated afterward — no notification-
      // service consumer exists for offer.accepted/offer.counter_accepted
      // to ever create an "accepted" notification). Reopening a just-
      // accepted offer or counter showed the live "offer-details"/
      // "counter-offer-details" variant (active Accept/Decline/Counter
      // buttons) instead of the read-only "offer-accepted" terminal
      // variant — exactly the BTB-365 repro's step 4. offerStatus is the
      // live status from the same getOffer() refetch every load already
      // runs; consulted first, falling back to the frozen event when
      // there's no live signal (seeded fixtures, or the lookup failed),
      // same precedence the inline card already uses.
      const liveStatusEvent =
        selectedNotificationOffer?.offerStatus === "ACCEPTED"
          ? "offer.accepted"
          : selectedNotificationOffer?.offerStatus === "DECLINED"
            ? "offer.declined"
            : selectedNotificationOffer?.offerStatus === "WITHDRAWN"
              ? "offer.withdrawn"
              : selectedNotificationOffer?.offerStatus === "EXPIRED"
                ? "offer.expired"
                : undefined
      const event = liveStatusEvent ?? selectedNotificationOffer?.event
      if (event === "offer.accepted" || event === "offer.counter_accepted") {
        return "offer-accepted"
      }
      if (event === "offer.declined" || event === "offer.counter_declined") {
        return "offer-declined"
      }
      if (event === "offer.withdrawn" || event === "offer.counter_withdrawn") {
        return "offer-withdrawn"
      }
      if (event === "offer.expired" || event === "offer.counter_expired") {
        return "offer-expired"
      }
      return event?.includes("counter")
        ? "counter-offer-details"
        : "offer-details"
    }, [selectedNotificationOffer])
  const selectedNotificationOfferIsClientExpired =
    selectedNotificationOffer?.event === "offer.expired" ||
    selectedNotificationOffer?.event === "offer.counter_expired"
  const selectedNotificationOfferIsClientWithdrawn =
    selectedNotificationOffer?.event === "offer.withdrawn" ||
    selectedNotificationOffer?.event === "offer.counter_withdrawn"
  const selectedNotificationOfferIsClientDeclined =
    selectedNotificationOffer?.event === "offer.declined"
  const selectedNotificationOfferIsTalentCounter =
    selectedNotificationOffer != null &&
    selectedNotificationOffer.clientPerspective !== true &&
    (selectedNotificationOffer.event.includes("counter") ||
      counterOfferCard?.contractId === selectedNotificationOffer.contractId)
  const showClientTerminalNotificationOffer =
    selectedNotificationOffer?.clientPerspective === true &&
    notificationOfferStep === "event" &&
    (selectedNotificationOffer.event === "offer.accepted" ||
      selectedNotificationOffer.event === "offer.counter_accepted" ||
      selectedNotificationOfferIsClientExpired ||
      selectedNotificationOfferIsClientWithdrawn ||
      selectedNotificationOfferIsClientDeclined)
  const showTalentExpiredNotificationOffer =
    selectedNotificationOffer?.clientPerspective !== true &&
    notificationOfferStep === "event" &&
    (selectedNotificationOffer?.event === "offer.expired" ||
      selectedNotificationOffer?.event === "offer.counter_expired")
  const showTalentWithdrawnNotificationOffer =
    selectedNotificationOffer?.clientPerspective !== true &&
    notificationOfferStep === "event" &&
    selectedNotificationOffer?.event === "offer.withdrawn"

  // PMCM-393 AC-42.02/03/04: live status for whichever offer/counter view is
  // currently open. `offerStatus` is undefined whenever there's no live
  // signal (seeded fixtures, or the getOffer() lookup failed) — every check
  // below requires an explicit match against a live value, so undefined
  // always falls through to "no override", never to withdrawn/expired.
  //
  // A local Decline never reaches this: declining closes the dialog
  // synchronously in the same handler that calls the API (see onDecline
  // below), before any Ably-driven refetch could arrive, so there's no
  // window where our own decline could be misread as a withdrawal here.
  const liveOfferWithdrawn = selectedNotificationOffer?.offerStatus === "WITHDRAWN"

  // The offer's own status has no notion of "counter offer" — a COUNTERED
  // offer falling back to PENDING just means whatever counter was active is
  // no longer active. That's true whether the talent withdrew it, it timed
  // out, or the client declined it (declined is excluded above the same way
  // as the primary-offer case). Disambiguating withdrawn vs. expired needs
  // an extra signal.
  const liveCounterOfferGone =
    selectedNotificationOffer?.offerStatus === "PENDING" &&
    selectedNotificationOfferEventVariant === "counter-offer-details"
  const newestNotificationForOpenOffer = useMemo(() => {
    if (!liveCounterOfferGone || !selectedNotificationOffer) return undefined
    return offerNotificationMessages
      .filter((item) => item.contractId === selectedNotificationOffer.contractId)
      .sort(
        (left, right) =>
          new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
      )
      .at(-1)
  }, [liveCounterOfferGone, offerNotificationMessages, selectedNotificationOffer])
  // Disambiguation source: the refreshed notification list, not the Ably
  // payload — offers.service.ts/counter-offers.service.ts publish the exact
  // same { offer: { status: 'PENDING' }, counterOffer: null } shape for
  // counter withdrawn, counter declined, and counter expired alike (verified
  // against counter-offers.service.ts's decline/withdraw and
  // expiry.processor.ts's expireCounterOffers — all three restore the parent
  // offer to PENDING the same way), so the live payload alone cannot tell
  // withdrawn from expired. offer.counter_expired and offer.counter_withdrawn
  // notification events already exist as first-class strings in this file
  // (see selectedNotificationOfferEventVariant above), so if the backend
  // ever creates one for this offer, use it. In production, no producer in
  // offer-service or notification-service currently emits a notification for
  // either event (confirmed: no OFFER_EXCHANGE consumer in notification-service
  // and no notification client in offer-service) — so newestNotificationForOpenOffer
  // will not exist for real traffic, and this falls through to the withdrawn
  // copy every time, per instruction, until a backend producer is added.
  const liveCounterResolvedExpired =
    liveCounterOfferGone &&
    newestNotificationForOpenOffer?.event === "offer.counter_expired"
  const liveCounterWithdrawn = liveCounterOfferGone && !liveCounterResolvedExpired
  const liveOfferExpired =
    selectedNotificationOffer?.offerStatus === "EXPIRED" ||
    liveCounterResolvedExpired
  // Applies even outside the "event" step (AC-42.04 point 4): if the viewer
  // is mid Accept/Decline/Counter when the offer goes terminal, the submit
  // action must disable and show this text rather than ripping them out of
  // the sub-flow. Copy matches offer-flow-dialog.tsx's existing terminal
  // notice for "expired" so there's no third string for the same state.
  const liveTerminalNotice = liveOfferWithdrawn
    ? "This offer has been withdrawn."
    : liveCounterWithdrawn
      ? "This counter offer has been withdrawn."
      : liveOfferExpired
        ? "This offer has expired."
        : undefined

  const selectedNotificationOfferVariant: OfferFlowDialogVariant =
    notificationOfferStep === "accept"
      ? notificationAcceptanceMessage.trim() && notificationTermsAccepted
        ? "accept-offer-ready"
        : "accept-offer-empty"
      : notificationOfferStep === "accepted"
        ? "offer-accepted"
        : notificationOfferStep === "decline"
          ? notificationDeclineMessage.trim() ||
            notificationDeclineReason.trim()
            ? "decline-offer-ready"
            : "decline-offer-empty"
          : notificationOfferStep === "declined"
            ? "offer-declined"
            : notificationOfferStep === "history"
              ? "offer-details-history"
              : notificationOfferStep === "previous"
                ? "offer-details"
                : selectedNotificationOfferEventVariant

  const openNotificationOffer = (item: OfferNotificationMessageData) => {
    setSelectedNotificationOffer(item)
    setNotificationOfferStep("event")
    setNotificationAcceptanceMessage("")
    setNotificationTermsAccepted(false)
    setNotificationDeclineMessage("")
    setNotificationDeclineReason("")
    setShowOfferUpdatedBanner(false)
  }

  const selectedNotificationOfferData = useMemo<OfferDialogData | null>(() => {
    if (!selectedNotificationOffer) return null
    return {
      senderDisplayName: selectedNotificationOffer.senderDisplayName,
      senderUsername: selectedNotificationOffer.senderUsername,
      senderAvatarSrc: selectedNotificationOffer.senderAvatarSrc,
      offerType: selectedNotificationOffer.offerType,
      receivedLabel: format(
        parseISO(selectedNotificationOffer.createdAt),
        "MMM d, yyyy"
      ),
      offerTitle: selectedNotificationOffer.offerTitle,
      offerRate: selectedNotificationOffer.offerRate,
      originalOfferRate: selectedNotificationOffer.originalOfferRate,
      role: selectedNotificationOffer.role,
      duration: selectedNotificationOffer.duration,
      schedule: selectedNotificationOffer.schedule,
      startDate: selectedNotificationOffer.startDate,
      expiresLabel: selectedNotificationOffer.expiresLabel,
      message:
        selectedNotificationOffer.counterOfferMessage ||
        (selectedNotificationOffer.event.includes("counter")
          ? "I would like to increase the hourly rate if it’s ok."
          : undefined),
      statusDateLabel: format(
        parseISO(selectedNotificationOffer.createdAt),
        "MMM d, yyyy"
      ),
    }
  }, [selectedNotificationOffer])
  const selectedTalentOfferExpiredOverThirtyDays = (() => {
    if (!selectedNotificationOfferData?.expiresLabel) return false
    const expiredAt = new Date(selectedNotificationOfferData.expiresLabel)
    if (Number.isNaN(expiredAt.getTime())) return false
    return Date.now() - expiredAt.getTime() > 30 * 24 * 60 * 60 * 1000
  })()
  const counterTermChanges = {
    rate:
      Boolean(selectedNotificationOffer?.originalOfferRate) &&
      selectedNotificationOffer?.offerRate !==
        selectedNotificationOffer?.originalOfferRate,
    duration:
      Boolean(selectedNotificationOffer?.originalDuration) &&
      selectedNotificationOffer?.duration !==
        selectedNotificationOffer?.originalDuration,
    schedule:
      Boolean(selectedNotificationOffer?.originalSchedule) &&
      selectedNotificationOffer?.schedule !==
        selectedNotificationOffer?.originalSchedule,
    startDate:
      Boolean(selectedNotificationOffer?.originalStartDate) &&
      selectedNotificationOffer?.startDate !==
        selectedNotificationOffer?.originalStartDate,
  }

  useEffect(() => {
    if (
      !acceptedOfferCard ||
      acceptedOfferToastRef.current === acceptedOfferCard.contractId
    ) {
      return
    }

    acceptedOfferToastRef.current = acceptedOfferCard.contractId
    toast({
      title: "Offer Accepted",
      description: "Your contract is now active.",
    })
  }, [acceptedOfferCard])

  useEffect(() => {
    if (
      !counterOfferCard ||
      submittedCounterOfferRef.current === counterOfferCard.contractId
    ) {
      return
    }

    submittedCounterOfferRef.current = counterOfferCard.contractId
    toast({
      title: "Counter Offer Submitted",
      description: "Sent to the client. We'll notify you when they respond.",
    })
  }, [counterOfferCard])

  useEffect(() => {
    if (
      !declinedOfferCard ||
      declinedOfferToastRef.current === declinedOfferCard.contractId
    ) {
      return
    }

    declinedOfferToastRef.current = declinedOfferCard.contractId
    setLocallyDeclinedTalentOffers((contractIds) =>
      contractIds.includes(declinedOfferCard.contractId)
        ? contractIds
        : [...contractIds, declinedOfferCard.contractId]
    )
    toast({
      title: "Offer Declined",
      description: "This offer is now closed.",
    })
    requestAnimationFrame(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    })
  }, [declinedOfferCard])
  const declinedOfferSenderName =
    declinedOfferCard?.senderDisplayName || "Laura"
  const declinedOfferSenderUsernameValue =
    declinedOfferCard?.senderUsername || "lauradesign21"
  const declinedOfferSenderUsername = declinedOfferSenderUsernameValue.startsWith(
    "@"
  )
    ? declinedOfferSenderUsernameValue
    : `@${declinedOfferSenderUsernameValue}`
  const declinedOfferSenderInitial =
    declinedOfferSenderName.slice(0, 1) ||
    declinedOfferSenderUsername.replace(/^@/, "").slice(0, 1) ||
    "L"
  const declinedDisplayLabel =
    declinedOfferCard?.declinedLabel || declinedOfferCard?.receivedLabel || ""
  const askNowMessage = declinedOfferCard
    ? `Hi ${declinedOfferSenderName}! I wanted to check in and see if the ${declinedOfferCard.role} role for the project ${declinedOfferCard.offerTitle} is still available. If so, I’m still interested.`
    : ""
  const [selectedTab, setSelectedTab] = useState<"Messages" | "Pinned">(
    "Messages"
  )
  const [pinnedMsgs, setPinnedMsgs] = useState<Message[]>([])
  const pinnedFetchRef = useRef<AbortController | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [rejectedFiles, setRejectedFiles] = useState<RejectedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const uploadAbortFlagsRef = useRef<Map<File, { aborted: boolean }>>(new Map())
  const recentlyAbortedMessageIdsRef = useRef<Set<string>>(new Set())
  const pendingIncomingRef = useRef<Message[]>([])
  const pendingIncomingRafRef = useRef<number | null>(null)
  const pendingEditsRef = useRef<Map<string, Partial<Message>>>(new Map())
  const pendingSendsRef = useRef<
    Map<string, { threadId: string; content: string; replyToId?: string }>
  >(new Map())
  const [isSending, setIsSending] = useState(false)
  const [forwardOpen, setForwardOpen] = useState(false)
  const [forwardTarget, setForwardTarget] = useState<Message | null>(null)
  const [keyReady, setKeyReady] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEditDeleteConfirm, setShowEditDeleteConfirm] = useState(false)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  // Thread-level state is source-of-truth from the server (selectedConversation)
  // which is kept up-to-date by the user:{userId} Ably subscription in left-sidebar.
  const threadPinned = !!(selectedConversation as any)?.isPinned
  const threadArchived = !!(selectedConversation as any)?.isArchived
  const threadSpam = !!(selectedConversation as any)?.isSpam
  const threadUnread = !!(selectedConversation as any)?.markedUnread
  const threadStarred = !!(selectedConversation as any)?.isStarred
  const threadActions = useThreadActions(jwtToken)

  const handleToggleStar = useCallback(
    (next: boolean) => {
      if (!selectedConversation) return
      const prev = selectedConversation
      setSelectedConversation?.({ ...(prev as any), isStarred: next })
      onPatchConversation?.(prev.id, { isStarred: next })
      ;(next
        ? threadActions.star(prev.id)
        : threadActions.unstar(prev.id)
      ).catch((err) => {
        console.error("star toggle failed", err)
        setSelectedConversation?.(prev)
        onPatchConversation?.(prev.id, { isStarred: !next })
      })
    },
    [
      selectedConversation,
      setSelectedConversation,
      onPatchConversation,
      threadActions,
    ]
  )

  const handleOpenForward = useCallback((msg: Message) => {
    setForwardTarget(msg)
    setForwardOpen(true)
  }, [])

  const pushUndoToast = useCallback((title: string, onUndo?: () => void) => {
    toast({
      title,
      variant: "success",
      action: onUndo ? (
        <ToastAction
          altText="Undo"
          className="h-auto p-0 border-0 bg-transparent text-success-500 underline hover:no-underline focus:outline-none text-sm font-semibold"
          onClick={onUndo}
        >
          Undo
        </ToastAction>
      ) : undefined,
    })
  }, [])

  const [currentUser, setCurrentUser] =
    useState<ReturnType<typeof getCurrentUser>>(null)
  useEffect(() => {
    const base = getCurrentUser()
    if (base && currentUserProfile?.username) {
      setCurrentUser({ ...base, username: currentUserProfile.username })
    } else {
      setCurrentUser(base)
    }
  }, [currentUserProfile])

  const handleEmojiSelect = useCallback((emoji: DataEmoji) => {
    const emojiChar = String.fromCodePoint(
      ...emoji[EmojiProperties.unified]
        .split("-")
        .map((hex) => parseInt(hex, 16))
    )
    setTextareaValue((prev) => (prev || "") + emojiChar)
    userTypedRef.current = true
    lastTypedAtRef.current = Date.now()
  }, [])

  const renderOfferMessageHoverActions = (
    messageText = "",
    senderId = currentUser?.id ?? ""
  ) => (
    <div className="absolute right-3 top-2 z-10 inline-flex items-center gap-x-0.5 rounded-full bg-primary-25 opacity-0 transition duration-300 group-hover:opacity-100 group-focus-within:opacity-100 [&+*]:pr-24">
      <button
        type="button"
        aria-label="Reply to message"
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-primary-50 hover:text-dark-blue-400 focus-visible:outline-none"
        onClick={() => {
          setReplyingTo({
            id: `offer-event:${senderId}:${messageText}`,
            threadId: selectedConversation?.id ?? "",
            senderId,
            content: messageText,
            createdAt: new Date().toISOString(),
            messageType: "text",
            status: "sent",
          } as Message)
          requestAnimationFrame(() => composerRef.current?.focus())
        }}
      >
        <CornerUpLeft className="size-4" />
      </button>
      <EmojiPicker
        side="top"
        align="end"
        onEmojiSelect={handleEmojiSelect}
      >
        <button
          type="button"
          aria-label="React to message"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-primary-50 hover:text-dark-blue-400 focus-visible:outline-none"
        >
          <Smile className="size-4" />
        </button>
      </EmojiPicker>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="More message options"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-primary-50 hover:text-dark-blue-400 focus-visible:outline-none"
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="end" className="min-w-0 w-auto">
          <DropdownMenuItem
            onSelect={() => navigator.clipboard.writeText(messageText)}
          >
            Copy message
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  const handleGifSelect = async (gif: TenorGif) => {
    if (!selectedConversation) return
    const url = gif.media?.[0]?.gif?.url
    if (!url) return
    try {
      const saved = await send(selectedConversation.id, url, undefined, "gif")
      const msg = (saved as any).data ?? saved
      let displayContent = msg.content
      try {
        const key = loadKey(selectedConversation.id)
        if (key && msg.ciphertext) {
          displayContent = await decryptAES(msg.ciphertext, key)
        }
      } catch {
        // no key cached
      }
      setLocalMsgs((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, { ...msg, content: displayContent ?? url }]
      })
      sendTyping(false)
    } catch (err) {
      console.error("Send GIF failed", err)
    }
  }

  // Reset per-conversation state when switching conversations,
  // then restore any persisted draft for this thread (Doc 05 EC-3.3).
  useEffect(() => {
    setReplyingTo(null)
    setEditingMessage(null)
    setTextareaValue("")
    setSelectedFiles([])
    setRejectedFiles([])
    setUploadModalMode(null)
    userTypedRef.current = false

    const tid = selectedConversation?.id
    const uid = currentUser?.id
    if (!tid || !uid) return
    let cancelled = false
    loadDraft(tid, uid).then((draft) => {
      if (cancelled || !draft) return
      // If user already typed something between switch and load, don't clobber.
      setTextareaValue((cur) => (cur ? cur : draft))
    })
    return () => {
      cancelled = true
    }
  }, [selectedConversation?.id, currentUser?.id])

  // Debounced draft save — fires 400ms after the user stops typing.
  useEffect(() => {
    const tid = selectedConversation?.id
    const uid = currentUser?.id
    if (!tid || !uid) return
    if (!userTypedRef.current) return
    const handle = setTimeout(() => {
      saveDraft(tid, uid, textareaValue).catch(() => undefined)
    }, 400)
    return () => clearTimeout(handle)
  }, [textareaValue, selectedConversation?.id, currentUser?.id])

  useEffect(() => {
    const tid = selectedConversation?.id
    const uid = currentUser?.id
    if (!tid || !uid) return
    return subscribeMessagingEvents((evt) => {
      if (evt.type !== "draft") return
      if (evt.threadId !== tid || evt.userId !== uid) return
      if (Date.now() - lastTypedAtRef.current < 1000) return
      setTextareaValue(evt.text)
    })
  }, [selectedConversation?.id, currentUser?.id])

  // Auto mark-read when opening a conversation
  useEffect(() => {
    if (!selectedConversation || !jwtToken) return
    if (selectedConversation.isOfferNotificationThread) return
    const threadId = selectedConversation.id
    threadActions.markRead(threadId).catch(() => {})
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("inbox:thread-read", { detail: { threadId } })
      )
    }
  }, [selectedConversation?.id, jwtToken])

  // 1) unwrap the AES key once per conversation
  useEffect(() => {
    setKeyReady(false)
    setKeyError(null)
    if (selectedConversation?.isOfferNotificationThread) {
      setKeyReady(true)
      return
    }
    if (!selectedConversation || !privateKey) return
    const ac = new AbortController()
    const convId = selectedConversation.id
    ;(async () => {
      const isGroupParam = selectedConversation.isGroup
      const fetchAndUnwrap = async () => {
        const { encryptedKey } = await apiFetch<{ encryptedKey: string }>(
          `/api/messaging/conversations/${convId}/key?isGroup=${isGroupParam}`,
          {
            headers: { Authorization: `Bearer ${jwtToken}` },
            signal: ac.signal,
          }
        )
        if (ac.signal.aborted) return false

        const privatePem = await exportPrivateKey(privateKey)
        const rawBuf = await decryptWithPrivateKey(encryptedKey, privatePem)
        if (ac.signal.aborted) return false

        const arr = new Uint8Array(rawBuf)
        const b64 = btoa(String.fromCharCode(...arr))
        saveKey(convId, b64)
        setKeyReady(true)
        return true
      }

      try {
        await fetchAndUnwrap()
      } catch (firstErr: any) {
        if (firstErr?.name === "AbortError") return
        // The recovery below only helps when our wrapped key is stale. If the
        // server says its own key material is unusable (409/422) no client-side
        // rewrap can fix it, and the DELETE would discard a wrapped key the
        // server is unable to reissue. Report it instead of churning.
        if (
          firstErr instanceof ApiError &&
          (firstErr.status === 409 || firstErr.status === 422)
        ) {
          if (!ac.signal.aborted) {
            setKeyReady(false)
            setKeyError(describeKeyFailure(firstErr))
          }
          return
        }
        // The wrapped key doesn't match our private key — either a stale wrap
        // from before a key rotation, or messaging-service holds a public key
        // that no longer matches our private key. Re-publish our LOCAL public
        // key first so the server rewraps conversation keys to the keypair we
        // actually hold, then delete this thread's wrapped key and refetch so
        // it is re-wrapped fresh.
        try {
          await republishPublicKey(getCurrentUser()?.id)
        } catch (republishErr) {
          console.warn(
            "Public-key re-publish before key retry failed",
            republishErr
          )
        }
        try {
          await apiFetch(`/api/messaging/conversations/${convId}/key`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${jwtToken}` },
            signal: ac.signal,
          })
          if (ac.signal.aborted) return
          await fetchAndUnwrap()
        } catch (retryErr: any) {
          if (retryErr?.name === "AbortError") return
          console.error(
            "Failed to unwrap conversation key after retry",
            retryErr
          )
          if (!ac.signal.aborted) {
            setKeyReady(false)
            setKeyError(describeKeyFailure(retryErr))
          }
        }
      }
    })()
    return () => ac.abort()
  }, [
    selectedConversation?.id,
    selectedConversation?.isGroup,
    privateKey,
    jwtToken,
  ])

  //below logic to add new user to a group chat //need to add button for it once user-service can be called to add users
  const handleAddUser = async (userId: string) => {
    if (!selectedConversation) {
      console.error("No conversation selected")
      return
    }
    try {
      await addParticipantToGroup(selectedConversation.id, userId)
    } catch (err) {
      console.error("Failed to add user:", err)
    }
  }

  const addFiles = (files: File[]) => {
    if (files.length === 0) return
    const valid: File[] = []
    const rejected: RejectedFile[] = []
    for (const f of files) {
      const error = validateFile(f)
      if (error) {
        rejected.push({
          id: `${f.name}-${f.size}-${f.lastModified}-${Math.random()}`,
          name: f.name,
          size: f.size,
          error,
        })
      } else {
        valid.push(f)
      }
    }
    if (valid.length) setSelectedFiles((prev) => [...prev, ...valid])
    if (rejected.length) setRejectedFiles((prev) => [...prev, ...rejected])
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      addFiles(files)
      event.target.value = ""
    }
  }

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => {
      const file = prev[index]
      if (file) {
        const record = uploadAbortFlagsRef.current.get(file)
        if (record) record.aborted = true
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const removeRejectedFile = (id: string) => {
    setRejectedFiles((prev) => prev.filter((r) => r.id !== id))
  }

  const [cloudFetching, setCloudFetching] = useState<{
    provider: "google-drive" | "dropbox" | "onedrive"
    count: number
  } | null>(null)
  const [onedriveDialogOpen, setOnedriveDialogOpen] = useState(false)

  const handleCloudPick = async (
    provider: "google-drive" | "dropbox" | "onedrive"
  ) => {
    // OneDrive uses a custom Dialog component instead of a popup picker —
    // Microsoft's consumer picker can't be embedded reliably.
    if (provider === "onedrive") {
      setOnedriveDialogOpen(true)
      return
    }
    try {
      const picker =
        provider === "google-drive" ? openGoogleDrivePicker : openDropboxChooser
      const files = await picker((count) =>
        setCloudFetching({ provider, count })
      )
      if (files.length > 0) {
        addFiles(files)
      }
    } catch (err) {
      console.error(`Cloud picker (${provider}) failed:`, err)
    } finally {
      setCloudFetching(null)
    }
  }

  const providerLabel = (p: "google-drive" | "dropbox" | "onedrive") =>
    p === "google-drive"
      ? "Google Drive"
      : p === "dropbox"
        ? "Dropbox"
        : "OneDrive"

  // Format file size helper
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // 1) measure for sticky container
  const [bottomRef, { height }] = useMeasure<HTMLDivElement>()

  // 2) fetch & decrypt messages
  const {
    messages: fetchedMsgs,
    loading: messagesLoading,
    loadingOlder,
    hasMore,
    loadOlder,
  } = useMessages(
    selectedConversation && !selectedConversation.isOfferNotificationThread
      ? selectedConversation.id
      : "",
    jwtToken,
    keyReady
  )
  const isSwitching = !keyError && (messagesLoading || !keyReady)

  // 2.2) Ably presence for this thread (online status + typing)
  // Per-thread presence: typing indicators only. The "isOnline" check used
  // to come from this hook too, but per-thread presence can't show whether
  // a user is online unless they're in the same thread channel right now —
  // which broke the avatar dot in 99% of cases. Online status now comes from
  // the global presence:online channel via useOnlineUsers().
  const {
    members: presentMembers,
    sendTyping,
    typingUserIds,
  } = useAblyPresence(selectedConversation?.id ?? "")
  const { isOnline } = useOnlineUsers()
  const handleAskNow = useCallback(() => {
    if (!askNowMessage || counterpartDeleted) return

    setDeclinedOfferDetailsOpen(false)
    setSelectedTab("Messages")
    setTextareaValue(askNowMessage)
    lastTypedAtRef.current = Date.now()
    userTypedRef.current = true
    sendTyping(true)
    requestAnimationFrame(() => {
      composerRef.current?.focus()
    })
  }, [askNowMessage, counterpartDeleted, sendTyping])

  // 2.1) local messages state for optimistic updates
  const [localMsgs, setLocalMsgs] = useState<Message[]>([])
  const preLoadOlderHeightRef = useRef<{
    scrollHeight: number
    scrollTop: number
  } | null>(null)
  useEffect(() => {
    if (!fetchedMsgs) return
    const convId = selectedConversation?.id
    if (
      fetchedMsgs.length > 0 &&
      (fetchedMsgs[0] as any).threadId !== undefined &&
      (fetchedMsgs[0] as any).threadId !== convId
    ) {
      setLocalMsgs([])
      return
    }
    setLocalMsgs((prev) => {
      const fetchedIds = new Set(fetchedMsgs.map((m) => m.id))
      const localOnly = prev.filter(
        (m) =>
          !fetchedIds.has(m.id) &&
          ((m as any).threadId === undefined || (m as any).threadId === convId)
      )
      return [...fetchedMsgs, ...localOnly]
    })
  }, [fetchedMsgs, selectedConversation?.id])

  const isNearBottomRef = useRef(true)
  useEffect(() => {
    const viewport = messagesScrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement | null
    if (!viewport) return
    const onScroll = () => {
      const distanceFromBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
      isNearBottomRef.current = distanceFromBottom < 120
      if (viewport.scrollTop < 120 && hasMore && !loadingOlder) {
        preLoadOlderHeightRef.current = {
          scrollHeight: viewport.scrollHeight,
          scrollTop: viewport.scrollTop,
        }
        loadOlder()
      }
    }
    viewport.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => viewport.removeEventListener("scroll", onScroll)
  }, [hasMore, loadingOlder, loadOlder])

  useIsomorphicLayoutEffect(() => {
    if (!preLoadOlderHeightRef.current) return
    if (loadingOlder) return
    const viewport = messagesScrollRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement | null
    if (!viewport) {
      preLoadOlderHeightRef.current = null
      return
    }
    const { scrollHeight: prevHeight, scrollTop: prevTop } =
      preLoadOlderHeightRef.current
    const delta = viewport.scrollHeight - prevHeight
    if (delta > 0) viewport.scrollTop = prevTop + delta
    preLoadOlderHeightRef.current = null
  }, [loadingOlder, localMsgs.length])

  // Hoist decrypted messages up so the sidebar can search over them
  // client-side. Required because backend search only matches plaintext
  // `content`, which is always null under E2EE.
  useEffect(() => {
    if (!selectedConversation) return
    onMessagesLoaded?.(selectedConversation.id, localMsgs)
  }, [localMsgs, selectedConversation?.id, onMessagesLoaded])

  // Scroll-to-and-flash a specific message when the sidebar opens a
  // search result. Waits until that message is actually in the rendered
  // list (it may arrive after a thread-switch's history fetch). Per
  // Doc 05 EC-8.2: if the message is missing after history load, toast
  // "Message no longer available" and clear the highlight.
  useEffect(() => {
    if (!highlightMessageId) return

    if (localMsgs.some((m) => m.id === highlightMessageId)) {
      const id = requestAnimationFrame(() => {
        const el = document.querySelector(
          `[data-message-id="${highlightMessageId}"]`
        ) as HTMLElement | null
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" })
          el.classList.add("inbox-highlight-flash")
          window.setTimeout(() => {
            el.classList.remove("inbox-highlight-flash")
          }, 2200)
        }
        onHighlightConsumed?.()
      })
      return () => cancelAnimationFrame(id)
    }

    const timeout = window.setTimeout(() => {
      toast({
        title: "Message no longer available",
        variant: "destructive",
      })
      onHighlightConsumed?.()
    }, 3000)
    return () => window.clearTimeout(timeout)
  }, [highlightMessageId, localMsgs, onHighlightConsumed])

  // 2.3) Read-receipts: react to message:read broadcasts on user:{me}.
  // Backend publishes when any reader PATCHes /v1/messages/:id/read, so the
  // sender learns their own message has been seen. Patches local state only.
  useUserChannel({
    onMessageRead: ({ messageId }) => {
      setLocalMsgs((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, status: "read" } : m))
      )
    },
  })

  // 2.4) Mark incoming messages as read when the thread is open.
  // Fires for each unread inbound message; backend's markRead is idempotent
  // and publishes message:read on the sender's user channel on success.
  const readSentRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!selectedConversation || !currentUser || !jwtToken) return
    const unread = localMsgs.filter(
      (m) =>
        m.senderId !== currentUser.id &&
        m.status !== "read" &&
        !readSentRef.current.has(m.id)
    )
    if (unread.length === 0) return
    for (const m of unread) {
      readSentRef.current.add(m.id)
      apiFetch(`/v1/messages/${m.id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${jwtToken}` },
      }).catch((err) => {
        console.error("markRead failed", err)
        readSentRef.current.delete(m.id)
      })
    }
  }, [localMsgs, selectedConversation?.id, currentUser?.id, jwtToken])

  // Reset the read-sent guard when switching threads.
  useEffect(() => {
    readSentRef.current = new Set()
  }, [selectedConversation?.id])

  const displayedMessages = (
    selectedTab === "Messages" ? localMsgs : pinnedMsgs
  ).filter((m) => {
    if (!m.isDeleted && !(m as any).deleted) return true
    const deletedAt = (m as any).deletedAt as number | undefined
    if (
      m.senderId === currentUser?.id &&
      deletedAt &&
      Date.now() - deletedAt < 30000
    ) {
      return true
    }
    return false
  })
  const isSeededOfferConversation = offerNotificationMessages.some(
    (item) =>
      item.seeded &&
      (item.actorId === receiverUser?.id ||
        item.senderUsername.replace(/^@/, "").toLowerCase() ===
          (receiverUser?.username ?? "").replace(/^@/, "").toLowerCase())
  )
  const visibleDisplayedMessages =
    isSeededOfferConversation &&
    selectedConversation?.id.startsWith("offer-notifications-")
      ? []
      : displayedMessages
  const localMessageById = useMemo(
    () => new Map(localMsgs.map((m) => [m.id, m])),
    [localMsgs]
  )

  // 3) subscribe to Ably for real-time incoming
  // subscribe to Ably for real-time updates

  const channelName = selectedConversation?.id || ""

  // 1) memoize your incoming‐message handler so it stays the same function reference:
  const handleIncoming = useCallback(
    async (incoming: {
      id: string
      ciphertext: string | null
      senderId: string
      threadId: string
      createdAt: string
      updatedAt: string
      attachments?: Message["attachments"]
      pinned?: boolean
      deleted?: boolean
      forwardedFromId?: string
      quotedCiphertext?: string | null
    }) => {
      if (recentlyAbortedMessageIdsRef.current.has(incoming.id)) {
        recentlyAbortedMessageIdsRef.current.delete(incoming.id)
        return
      }
      const convId = incoming.threadId
      let key: Uint8Array | null = null
      try {
        key = loadKey(convId)
      } catch {
        // no cached key
      }
      if (!key) {
        console.error("No AES key for", convId)
        return
      }
      let plain = ""
      if (incoming.ciphertext) {
        try {
          plain = await decryptAES(incoming.ciphertext, key)
        } catch (err) {
          console.error("Failed to decrypt incoming:", err)
          return
        }
      }
      let quotedPlain: string | null = null
      if (incoming.quotedCiphertext) {
        try {
          quotedPlain = await decryptAES(incoming.quotedCiphertext, key)
        } catch (err) {
          console.error("Failed to decrypt quoted content:", err)
          quotedPlain = UNDECRYPTABLE_PLACEHOLDER
        }
      }
      const prepared: Message = {
        ...incoming,
        content: plain,
        quotedContent: quotedPlain,
        isRead: false,
        isPinned: incoming.pinned ?? false,
        isDeleted: incoming.deleted ?? false,
      } as Message
      pendingIncomingRef.current.push(prepared)
      if (pendingIncomingRafRef.current == null) {
        pendingIncomingRafRef.current = requestAnimationFrame(() => {
          const batch = pendingIncomingRef.current
          pendingIncomingRef.current = []
          pendingIncomingRafRef.current = null
          if (batch.length === 0) return
          setLocalMsgs((prev) => {
            let next = prev
            let changed = false
            for (const m of batch) {
              const pendingEdit = pendingEditsRef.current.get(m.id)
              const incoming = pendingEdit ? { ...m, ...pendingEdit } : m
              if (pendingEdit) pendingEditsRef.current.delete(m.id)
              if (next.some((existing) => existing.id === incoming.id)) continue
              const tempIdx = next.findIndex(
                (existing) =>
                  typeof existing.id === "string" &&
                  existing.id.startsWith("tmp-") &&
                  existing.senderId === incoming.senderId &&
                  (existing.status === "sending" ||
                    existing.status === "optimistic-offline") &&
                  (existing.content ?? "") === (m.content ?? "")
              )
              if (tempIdx !== -1) {
                next = next.map((existing, i) =>
                  i === tempIdx ? incoming : existing
                )
                changed = true
                continue
              }
              next = [...next, incoming]
              changed = true
            }
            return changed ? next : prev
          })
        })
      }
      onIndexNewMessage?.({
        id: incoming.id,
        threadId: incoming.threadId,
        senderId: incoming.senderId,
        content: plain ?? "",
        createdAt: incoming.createdAt,
        attachments: incoming.attachments,
      })
    },
    [setLocalMsgs, onIndexNewMessage]
  )

  useEffect(() => {
    return () => {
      if (pendingIncomingRafRef.current != null) {
        cancelAnimationFrame(pendingIncomingRafRef.current)
        pendingIncomingRafRef.current = null
      }
    }
  }, [])

  //pin/unpin,  delete, undo delete
  const updateMessage = useCallback(
    (messageId: string, updates: Partial<Message>) => {
      setLocalMsgs((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, ...updates } : m))
      )
    },
    []
  )

  const handleLocalDelete = useCallback(
    (messageId: string) => {
      updateMessage(messageId, {
        isDeleted: true,
        deletedAt: Date.now(),
      } as any)
      setTimeout(() => {
        setLocalMsgs((prev) => prev.map((m) => m))
      }, 30000)
    },
    [updateMessage]
  )

  const handleLocalRestore = useCallback(
    (messageId: string) => {
      updateMessage(messageId, {
        isDeleted: false,
        deletedAt: undefined,
      } as any)
    },
    [updateMessage]
  )

  // Ably incoming edit: decrypt + patch local state
  const handleIncomingEdit = useCallback(
    async (incoming: {
      id: string
      ciphertext?: string
      senderId: string
      threadId: string
      edited?: boolean
    }) => {
      let plain = ""
      try {
        const key = loadKey(incoming.threadId)
        if (key && incoming.ciphertext) {
          plain = await decryptAES(incoming.ciphertext, key)
        }
      } catch (err) {
        console.error("Failed to decrypt edited message:", err)
        plain = UNDECRYPTABLE_PLACEHOLDER
      }
      const patch: Partial<Message> = {
        content: plain,
        ciphertext: incoming.ciphertext,
        edited: true,
      }
      setLocalMsgs((prev) => {
        if (prev.some((m) => m.id === incoming.id)) {
          return prev.map((m) =>
            m.id === incoming.id ? { ...m, ...patch } : m
          )
        }
        pendingEditsRef.current.set(incoming.id, patch)
        return prev
      })
    },
    []
  )

  useAblyChannel(
    channelName,
    handleIncoming,
    ({ messageId, isPinned }) => updateMessage(messageId, { isPinned }),
    (messageId) => updateMessage(messageId, { isDeleted: true }),
    (messageId) => updateMessage(messageId, { isDeleted: false }),
    handleIncomingEdit,
    ({ messageId, reactions }) =>
      setLocalMsgs((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, reactions: reactions as any } : m
        )
      )
  )

  const handleToggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!jwtToken) return
      // Optimistic toggle — Ably broadcast will reconcile.
      const me = currentUser?.id
      if (me) {
        setLocalMsgs((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m
            const current = m.reactions ?? []
            const idx = current.findIndex(
              (r) => r.userId === me && r.emoji === emoji
            )
            const next =
              idx >= 0
                ? current.filter((_, i) => i !== idx)
                : [
                    ...current,
                    { userId: me, emoji, createdAt: new Date().toISOString() },
                  ]
            return { ...m, reactions: next }
          })
        )
      }
      try {
        await apiFetch(`/v1/messages/${messageId}/reactions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${jwtToken}` },
          body: { emoji },
        })
      } catch (err) {
        console.error("toggleReaction failed", err)
      }
    },
    [jwtToken, currentUser?.id]
  )

  // 3) send message hook

  const send = useSendMessage(
    jwtToken,
    privateKey,
    selectedConversation?.isGroup
  )
  const editMsg = useEditMessage(jwtToken)
  const uploadFile = useFileUpload(
    jwtToken,
    privateKey,
    selectedConversation?.isGroup
  )

  const attemptOptimisticSend = useCallback(
    async (tempId: string) => {
      const params = pendingSendsRef.current.get(tempId)
      if (!params) return
      setLocalMsgs((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "sending" } : m))
      )
      try {
        const saved = await send(
          params.threadId,
          params.content,
          params.replyToId
        )
        const msg = (saved as any).data ?? saved
        let displayContent = msg.content
        try {
          const key = loadKey(params.threadId)
          if (key && msg.ciphertext) {
            displayContent = await decryptAES(msg.ciphertext, key)
          }
        } catch {
          /* plaintext */
        }
        pendingSendsRef.current.delete(tempId)
        setLocalMsgs((prev) => {
          const echoAlreadyIn = prev.some((m) => m.id === msg.id)
          if (echoAlreadyIn) {
            return prev.filter((m) => m.id !== tempId)
          }
          return prev.map((m) =>
            m.id === tempId ? { ...msg, content: displayContent } : m
          )
        })
        onIndexNewMessage?.({
          id: msg.id,
          threadId: params.threadId,
          senderId: msg.senderId,
          content: displayContent ?? "",
          createdAt: msg.createdAt,
          attachments: msg.attachments,
        })
      } catch (error) {
        console.error("Message send failed", error)
        setLocalMsgs((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, status: "failed-send" } : m
          )
        )
      }
    },
    [send, onIndexNewMessage]
  )

  const retryOptimistic = useCallback(
    (tempId: string) => {
      void attemptOptimisticSend(tempId)
    },
    [attemptOptimisticSend]
  )

  const discardOptimistic = useCallback((tempId: string) => {
    pendingSendsRef.current.delete(tempId)
    setLocalMsgs((prev) => prev.filter((m) => m.id !== tempId))
  }, [])

  useEffect(() => {
    const onOnline = () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return
      const ids = Array.from(pendingSendsRef.current.keys())
      for (const id of ids) {
        void attemptOptimisticSend(id)
      }
    }
    window.addEventListener("online", onOnline)
    return () => window.removeEventListener("online", onOnline)
  }, [attemptOptimisticSend])

  const appendUploadedMessage = useCallback(
    async (result: UploadedAttachmentResult) => {
      if (!selectedConversation) return

      let displayContent = result.message.content ?? ""
      try {
        const key = loadKey(selectedConversation.id)
        if (key && result.message.ciphertext) {
          displayContent = await decryptAES(result.message.ciphertext, key)
        }
      } catch (err) {
        console.error("Failed to decrypt uploaded attachment caption:", err)
        if (result.message.ciphertext) {
          displayContent = UNDECRYPTABLE_PLACEHOLDER
        }
      }

      setLocalMsgs((prev) => {
        if (prev.some((m) => m.id === result.message.id)) return prev
        return [
          ...prev,
          {
            ...result.message,
            threadId:
              result.message.threadId ??
              result.message.conversationId ??
              selectedConversation.id,
            content: displayContent,
            messageType: result.message.messageType ?? "file",
            attachments: result.message.attachments?.length
              ? result.message.attachments
              : [result.attachment],
          },
        ]
      })
      onIndexNewMessage?.({
        id: result.message.id,
        threadId: selectedConversation.id,
        senderId: result.message.senderId,
        content: displayContent ?? "",
        createdAt: result.message.createdAt,
        attachments: result.message.attachments?.length
          ? result.message.attachments
          : [result.attachment],
      })
    },
    [selectedConversation?.id]
  )

  // 4) scroll to bottom on new messages
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastBottomIdRef = useRef<string | null>(null)
  useEffect(() => {
    const last = localMsgs[localMsgs.length - 1]
    const currentLastId = last?.id ?? null
    if (!currentLastId || currentLastId === lastBottomIdRef.current) return
    const isOwn = last?.senderId === currentUser?.id
    const wasFirstLoad = lastBottomIdRef.current === null
    lastBottomIdRef.current = currentLastId
    if (wasFirstLoad || isOwn || isNearBottomRef.current) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [localMsgs])

  // 5) load receiver's profile
  useEffect(() => {
    if (!selectedConversation) return
    const currentUser = getCurrentUser()
    if (!currentUser) {
      console.error("No logged-in user found")
      return
    }
    const otherId = selectedConversation.participantIds?.find(
      (id) => id !== currentUser.id
    )
    if (!otherId) return

    setCounterpartDeleted(false)
    const deletedPlaceholder = {
      id: otherId,
      email: "",
      username: undefined,
      firstName: null,
      lastName: null,
      avatarUrl: null,
    } as unknown as User
    apiFetch<User>(`/users/${otherId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${jwtToken}` },
    })
      .then((u) => {
        const isInactive =
          !!(u as { deletedAt?: unknown })?.deletedAt ||
          (u as { isActive?: boolean })?.isActive === false
        if (isInactive) {
          setCounterpartDeleted(true)
          setReceiverUser(deletedPlaceholder)
        } else {
          setReceiverUser(u)
        }
      })
      .catch((err) => {
        const status = err?.status ?? err?.response?.status
        if (
          status === 404 ||
          (typeof err?.message === "string" && err.message.includes("404"))
        ) {
          setCounterpartDeleted(true)
          setReceiverUser(deletedPlaceholder)
        } else {
          console.error(err)
        }
      })
  }, [selectedConversation?.id])

  // 6) send handler
  const handleSendMessage = async () => {
    if (!selectedConversation) return
    if (isSending) return
    const hasFiles = selectedFiles.length > 0
    const hasText = textareaValue.trim().length > 0
    if (!hasText && !hasFiles) return

    setIsSending(true)
    try {
      if (hasFiles) {
        const caption = textareaValue.trim()
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i]
          const abortRecord = { aborted: false }
          uploadAbortFlagsRef.current.set(file, abortRecord)
          try {
            const uploaded = await uploadFile(
              selectedConversation.id,
              file,
              i === 0 ? caption : undefined
            )
            if (abortRecord.aborted) {
              const abortedId = uploaded.message.id
              recentlyAbortedMessageIdsRef.current.add(abortedId)
              setTimeout(
                () => recentlyAbortedMessageIdsRef.current.delete(abortedId),
                30_000
              )
              apiFetch(`/v1/messages/${abortedId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${jwtToken}` },
              }).catch(() => undefined)
            } else {
              await appendUploadedMessage(uploaded)
            }
          } finally {
            uploadAbortFlagsRef.current.delete(file)
          }
        }
        setSelectedFiles([])
        setRejectedFiles([])
        setTextareaValue("")
        sendTyping(false)
        setReplyingTo(null)
        if (currentUser?.id) {
          clearDraft(selectedConversation.id, currentUser.id).catch(
            () => undefined
          )
        }
        return
      }

      if (!currentUser?.id) return
      const content = textareaValue.trim()
      // Offer/event cards are notification-backed rather than persisted chat
      // messages. They can still show the normal reply context in the composer,
      // but their synthetic IDs must not be sent as message foreign keys.
      const replyToId = replyingTo?.id.startsWith("offer-event:")
        ? undefined
        : replyingTo?.id
      const tempId = `tmp-${
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`
      }`
      const isOnline =
        typeof navigator === "undefined" ? true : navigator.onLine
      const nowIso = new Date().toISOString()
      const optimistic = {
        id: tempId,
        threadId: selectedConversation.id,
        senderId: currentUser.id,
        content,
        ciphertext: null,
        createdAt: nowIso,
        updatedAt: nowIso,
        isRead: false,
        status: isOnline ? "sending" : "optimistic-offline",
        replyToMessageId: replyToId,
      } as Message
      setLocalMsgs((prev) => [...prev, optimistic])
      pendingSendsRef.current.set(tempId, {
        threadId: selectedConversation.id,
        content,
        replyToId,
      })

      setTextareaValue("")
      sendTyping(false)
      setReplyingTo(null)
      if (currentUser?.id) {
        clearDraft(selectedConversation.id, currentUser.id).catch(
          () => undefined
        )
      }

      if (!isOnline) {
        return
      }

      try {
        const saved = await send(selectedConversation.id, content, replyToId)
        const msg = (saved as any).data ?? saved
        let displayContent = msg.content
        try {
          const key = loadKey(selectedConversation.id)
          if (key && msg.ciphertext) {
            displayContent = await decryptAES(msg.ciphertext, key)
          }
        } catch {
          // already plaintext
        }
        pendingSendsRef.current.delete(tempId)
        setLocalMsgs((prev) => {
          const echoAlreadyIn = prev.some((m) => m.id === msg.id)
          if (echoAlreadyIn) {
            return prev.filter((m) => m.id !== tempId)
          }
          return prev.map((m) =>
            m.id === tempId ? { ...msg, content: displayContent } : m
          )
        })
        onIndexNewMessage?.({
          id: msg.id,
          threadId: selectedConversation.id,
          senderId: msg.senderId,
          content: displayContent ?? "",
          createdAt: msg.createdAt,
          attachments: msg.attachments,
        })
      } catch (err) {
        console.error("Send failed", err)
        setLocalMsgs((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, status: "failed-send" } : m
          )
        )
      }
    } catch (err) {
      console.error("Send failed", err)
    } finally {
      setIsSending(false)
    }
  }

  // Edit flow: enter edit mode, pre-fill composer
  const handleStartEdit = useCallback((msg: Message) => {
    setEditingMessage(msg)
    setTextareaValue(msg.content || "")
    setReplyingTo(null)
    // focus + move caret to end on next tick (after textarea gets the new value)
    requestAnimationFrame(() => {
      const el = composerRef.current
      if (el) {
        el.focus()
        const len = el.value.length
        el.setSelectionRange(len, len)
      }
    })
  }, [])

  const handleCancelEdit = () => {
    setEditingMessage(null)
    setTextareaValue("")
  }

  const handleSaveEdit = async () => {
    if (!editingMessage || !selectedConversation) return
    const newContent = textareaValue.trim()
    if (!newContent) {
      setShowEditDeleteConfirm(true)
      return
    }
    if (newContent === (editingMessage.content || "").trim()) {
      // no change — just exit edit mode
      handleCancelEdit()
      return
    }

    const messageId = editingMessage.id
    const prevContent = editingMessage.content
    // Optimistic update
    updateMessage(messageId, { content: newContent, edited: true })
    const editingSnapshot = editingMessage
    setEditingMessage(null)
    setTextareaValue("")

    try {
      await editMsg(messageId, selectedConversation.id, newContent)
    } catch (err) {
      console.error("Edit failed", err)
      // Rollback
      updateMessage(messageId, {
        content: prevContent,
        edited: !!editingSnapshot.edited,
      })
    }
  }

  const handleConfirmEditDelete = async () => {
    if (!editingMessage) return
    const messageId = editingMessage.id
    setShowEditDeleteConfirm(false)
    handleLocalDelete(messageId)
    setEditingMessage(null)
    setTextareaValue("")
    try {
      await apiFetch(`/v1/messages/${messageId}`, {
        method: "DELETE",
        headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {},
      })
    } catch (err) {
      console.error("Delete from edit failed", err)
      handleLocalRestore(messageId)
    }
  }

  // Updated handleSendMessage to handle both text and files
  //     const handleSendMessage = async () => {
  //     if (!selectedConversation) return

  //     // Check if we have either text or files to send
  //     const hasText = textareaValue.trim()
  //     const hasFiles = selectedFiles.length > 0

  //     if (!hasText && !hasFiles) return

  //     setIsUploading(true)
  //     console.log('> handleSendMessage – sending:', { hasText, hasFiles, filesCount: selectedFiles.length })

  //     try {
  //         // Case 1: Only text message (existing logic)
  //         if (hasText && !hasFiles) {
  //             const saved = await send(selectedConversation.id, textareaValue.trim())
  //             console.log('Text message sent:', saved.message, saved.data)

  //             // Decrypt and add to local state (existing logic)
  //             const key = loadKey(selectedConversation.id)
  //             const plain = await decryptAES(saved.data.ciphertext, key)

  //             setLocalMsgs(prev => [
  //                 ...prev,
  //                 {
  //                     ...saved.data,
  //                     content: plain
  //                 }
  //             ])
  //         }

  //         // Case 2: Files (with optional text)
  //         if (hasFiles) {
  //             // Upload each file
  //             console.log('Uploading files:', selectedFiles.map(f => f.name))
  //             console.log('Textarea value:', textareaValue.trim())
  //             console.log('Conversation ID:', selectedConversation.id)
  //             const uploadPromises = selectedFiles.map(file =>
  //                 uploadFile(selectedConversation.id, file, hasText ? textareaValue.trim() : undefined)
  //             )

  //             const uploadResults = await Promise.all(uploadPromises)
  //             console.log('Files uploaded:', uploadResults)

  //             // Add file messages to local state
  //             for (const result of uploadResults) {
  //                  // Decrypt and add to local state (existing logic)
  //             const key = loadKey(selectedConversation.id)
  //             const plain = await decryptAES(result.message.ciphertext, key)
  //                 setLocalMsgs(prev => [
  //                     ...prev,
  //                     {
  //                         ...result.message,
  //                         content: plain, // For file messages, content = ciphertext (which might be empty or the optional text)
  //                         // Add attachment data for rendering
  //                         fileUrl: result.attachment.fileUrl,
  //                         fileName: result.attachment.fileName,
  //                         fileType: result.attachment.fileType,
  //                         fileSize: result.attachment.fileSize
  //                     }
  //                 ])
  //             }

  //             // Clear selected files
  //             setSelectedFiles([])
  //         }

  //         // Clear text input
  //         setTextareaValue('')

  //     } catch (err) {
  //         console.error('Send failed', err)
  //         // You might want to show an error toast here
  //     } finally {
  //         setIsUploading(false)
  //     }
  // }

  // pinned messages or normal messages logic:

  const handleToggleChange = async (value: string) => {
    const tab = value as "Messages" | "Pinned"
    setSelectedTab(tab)

    if (tab === "Pinned") {
      if (!selectedConversation) return
      pinnedFetchRef.current?.abort()
      const ac = new AbortController()
      pinnedFetchRef.current = ac
      const convId = selectedConversation.id
      setPinnedMsgs([])
      try {
        const { messages: allMsgs } = await apiFetch<{
          messages: Message[]
        }>(`/v1/messages/thread/${convId}?all=true`, {
          headers: { Authorization: `Bearer ${jwtToken}` },
          signal: ac.signal,
        })
        if (ac.signal.aborted) return
        const pinned = allMsgs.filter((m) => m.pinned || m.isPinned)

        let key: Uint8Array | null = null
        try {
          key = loadKey(convId)
        } catch {
          /* no key */
        }
        const decrypted = await Promise.all(
          pinned.map(async (m) => {
            // Backend column is `pinned`; Bubble reads `isPinned`. Normalize.
            const normalized = {
              ...m,
              isPinned: (m as any).isPinned ?? (m as any).pinned ?? false,
            }
            if (!m.ciphertext) return normalized
            if (!key)
              return { ...normalized, content: UNDECRYPTABLE_PLACEHOLDER }
            try {
              return {
                ...normalized,
                content: await decryptAES(m.ciphertext, key),
              }
            } catch {
              return { ...normalized, content: UNDECRYPTABLE_PLACEHOLDER }
            }
          })
        )
        if (ac.signal.aborted) return
        setPinnedMsgs(decrypted)
      } catch (err: any) {
        if (err?.name === "AbortError") return
        console.error("Failed to fetch pinned messages", err)
      }
    }
  }

  // starring a conversation
  // const handleToggleStar = async () => {
  //   if (!selectedConversation) return;

  //   try {
  //     console.log("> handleToggleStar for:", selectedConversation.id);

  //      // 1) Call your API using apiFetch
  //     const { success } = await apiFetch<{ success: boolean }>(
  //       `/api/messaging/conversations/${selectedConversation.id}/star`,
  //       {
  //         method: "POST", // or POST if your backend uses POST
  //         headers: {
  //           Authorization: `Bearer ${jwtToken}`, // use your token state
  //         },
  //       }
  //     );

  //     // 2) Optimistically update local UI state
  //     if (success) {
  //       setIsStarred((prev) => !prev);
  //     }

  //     console.log("Toggle star success:", success);

  //   } catch (err) {
  //     console.error("Toggle star failed", err);
  //   }
  // };

  // const handleToggleStar = async (convId: string) => {
  //   try {
  //     const { success } = await apiFetch<{ success: boolean }>(
  //       `/api/messaging/conversations/${convId}/star`,
  //       {
  //         method: "POST",
  //         headers: { Authorization: `Bearer ${jwtToken}` },
  //       }
  //     );

  //     if (success) {
  //       setConversations((prev) =>
  //         prev.map((conv) =>
  //           conv.id === convId
  //             ? { ...conv, isStarred: !conv.isStarred }
  //             : conv
  //         )
  //       );
  //     }
  //   } catch (err) {
  //     console.error("Toggle star failed", err);
  //   }
  // };

  const selectedOfferParticipantId =
    selectedConversation && currentUser
      ? selectedConversation.participantIds.find((id) => id !== currentUser.id)
      : undefined
  const latestSelectedOfferNotificationId = offerNotificationMessages
    .filter((item) => item.actorId === selectedOfferParticipantId)
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() -
        new Date(right.createdAt).getTime()
    )
    .at(-1)?.id
  useEffect(() => {
    if (!latestSelectedOfferNotificationId) return
    const frame = requestAnimationFrame(() =>
      scrollRef.current?.scrollIntoView({ block: "end" })
    )
    return () => cancelAnimationFrame(frame)
  }, [latestSelectedOfferNotificationId, selectedConversation?.id])

  if (!currentUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400">
        <Spinner size={28} strokeWidth={3} />
      </div>
    )
  }

  if (!selectedConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
        <Mail05 className="size-10 stroke-[1.5]" />
        <p className="text-sm font-medium">
          Select a conversation to start messaging
        </p>
      </div>
    )
  }

  if (!receiverUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400">
        <Spinner size={28} strokeWidth={3} />
        <p className="text-sm">Loading conversation...</p>
      </div>
    )
  }

  // First-name-only display (per design)
  const fullName = selectedConversation?.isGroup
    ? (selectedConversation.group?.name ?? "Unnamed Group")
    : counterpartDeleted
      ? "Account no longer available"
      : receiverUser.firstName?.trim() ||
        receiverUser.username ||
        "Unknown User"

  const matchingConversationOfferNotifications = offerNotificationMessages
    .filter(
      (item) =>
        item.actorId === receiverUser.id ||
        item.senderUsername.replace(/^@/, "").toLowerCase() ===
          (receiverUser.username ?? "").replace(/^@/, "").toLowerCase()
    )
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() -
        new Date(right.createdAt).getTime()
    )
  const latestSeededTalentOffer = [...matchingConversationOfferNotifications]
    .filter((item) => item.seeded && !item.clientPerspective)
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    )
    .at(-1)
  const conversationOfferNotifications =
    latestSeededTalentOffer === undefined
      ? matchingConversationOfferNotifications
      : matchingConversationOfferNotifications.filter(
          (item) =>
            !item.seeded ||
            item.clientPerspective ||
            item.id === latestSeededTalentOffer.id
        )
  const conversationOfferContractIds = new Set(
    conversationOfferNotifications.map((item) => item.contractId)
  )
  // PMCM-392 AC-40.03/40.06: acceptedOfferCard is frozen into sessionStorage
  // at accept time, before contracts-service could possibly have created
  // anything — there is no real contractId to write there. Looked up here
  // instead, from the same live, already-refetched list selectedNotificationOffer
  // reads, matched on the shared offer id (acceptedOfferCard.contractId is
  // that same misnomer). Picks up a real id automatically once one exists,
  // with no new polling.
  const acceptedOfferCardRealContractId = acceptedOfferCard
    ? conversationOfferNotifications.find(
        (item) => item.contractId === acceptedOfferCard.contractId
      )?.realContractId
    : undefined
  const seededTalentFollowOnId = [...conversationOfferNotifications]
    .reverse()
    .find(
      (item) =>
        item.seeded &&
        !item.clientPerspective &&
        (item.event.includes("accepted") ||
          item.event.includes("declined") ||
          item.event === "offer.countered" ||
          item.event === "offer.counter_edited" ||
          item.event.includes("withdrawn") ||
          item.event === "offer.expired" ||
          item.event === "offer.counter_expired")
    )?.id
  const counterExpiredFollowOnId = [...conversationOfferNotifications]
    .reverse()
    .find(
      (item) =>
        !item.clientPerspective && item.event === "offer.counter_expired"
    )?.id
  const participantJobTitle =
    receiverUser.recentJobTitle ||
    (typeof receiverUser.jobTitles?.[0] === "string"
      ? receiverUser.jobTitles[0]
      : (
          receiverUser.jobTitles?.[0] as unknown as
            { jobTitle?: string } | undefined
        )?.jobTitle) ||
    conversationOfferNotifications[0]?.role

  const openClientContractPage = (item: OfferNotificationMessageData) => {
    router.push(
      `/active-project/${encodeURIComponent(item.contractId)}?title=${encodeURIComponent(item.offerTitle)}&group=${encodeURIComponent("My Contracts")}&tab=contract`
    )
  }

  const openTalentContractPage = (item: OfferNotificationMessageData) => {
    router.push(
      `/active-project/${encodeURIComponent(item.contractId)}?title=${encodeURIComponent(item.offerTitle)}&group=${encodeURIComponent("My Contracts")}&tab=contract&perspective=talent`
    )
  }

  const openClientResendOfferFlow = (item: OfferNotificationMessageData) => {
    setSelectedNotificationOffer(null)
    requestAnimationFrame(() => {
      window.dispatchEvent(
        new CustomEvent("inbox:open-resend-offer", {
          detail: {
            offerId: item.contractId,
            offerTitle: item.offerTitle,
            jobListingId: item.jobListingId,
            talentId: item.actorId,
            contractType: item.offerType,
            startDate: item.startDate,
          },
        })
      )
    })
  }

  return (
    <div className="flex-auto relative min-w-0 h-full flex flex-col">
      {/* Header */}
      <div className="px-8 shrink-0 border-b flex items-center justify-between border-gray-200 py-6 bg-white z-10">
        <div className="inline-flex items-center gap-x-3">
          {/* <Avatar className="size-[43px]" size="md" isOnline>
                        <AvatarImage src={receiverUser.avatarUrl || '/default.png'} alt={receiverUser.username ?? ''} />
                        <AvatarFallback>{receiverUser.username?.[0] ?? ''}</AvatarFallback>
                    </Avatar> */}
          <Avatar
            className="size-[43px]"
            size="md"
            isOnline={
              selectedConversation?.isGroup
                ? presentMembers.some((m) => m.clientId !== currentUser?.id)
                : isOnline(receiverUser.id)
            }
          >
            <AvatarImage
              src={
                selectedConversation?.isGroup
                  ? "/group-default.png"
                  : receiverUser.avatarUrl || "/default.png"
              }
              alt={
                selectedConversation?.isGroup
                  ? selectedConversation?.group?.name || "Group"
                  : (receiverUser.username ?? "")
              }
            />
            <AvatarFallback>
              {selectedConversation?.isGroup
                ? (selectedConversation?.group?.name?.[0] ?? "G")
                : (
                    receiverUser.firstName?.trim() ||
                    receiverUser.username ||
                    "U"
                  )
                    .charAt(0)
                    .toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col gap-y-1">
            <div className="inline-flex items-center gap-x-1">
              <span className="text-lg font-semibold text-dark-blue-400">
                {fullName}
              </span>
              {!selectedConversation?.isGroup && receiverUser.username && (
                <span className="text-base font-normal leading-[19px] text-dark-blue-400">
                  @{receiverUser.username}
                </span>
              )}
            </div>
            <div className="inline-flex items-center gap-x-2">
              <span className="text-sm text-dark-blue-400">
                {selectedConversation?.isGroup
                  ? (() => {
                      const others = presentMembers.filter(
                        (m) => m.clientId !== currentUser?.id
                      ).length
                      return others > 0
                        ? `${others} active now`
                        : "No one active"
                    })()
                  : isOnline(receiverUser.id)
                    ? "Active now"
                    : "Offline"}
              </span>
              {participantJobTitle ? (
                <>
                  <span className="inline-block h-4 w-px bg-gray-300" />
                  <span className="text-sm leading-[17px] text-dark-blue-400">
                    {participantJobTitle}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-x-6">
          <ToggleGroupRoot
            className="bg-gray-50"
            value={selectedTab ? [selectedTab] : undefined}
            onValueChange={(details: { value: string[] }) => {
              const val = details.value?.[0]
              if (val === "Messages" || val === "Pinned") {
                handleToggleChange(val)
              }
            }}
          >
            {/* Local shadow override: primitive's arbitrary-value shadow is
                malformed (Tailwind drops it); patching the primitive would
                regress ~20 other pages where the no-shadow is established. */}
            <ToggleGroupItem
              value="Messages"
              className="data-[state=on]:shadow-sm"
            >
              Messages
            </ToggleGroupItem>
            <ToggleGroupItem
              value="Pinned"
              className="data-[state=on]:shadow-sm"
            >
              Pinned
              {(() => {
                const count = localMsgs.filter(
                  (m) => m.pinned || m.isPinned
                ).length
                return count > 0 ? (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-semibold bg-gray-200 text-gray-800 rounded-full">
                    {count}
                  </span>
                ) : null
              })()}
            </ToggleGroupItem>
          </ToggleGroupRoot>

          <div className="flex items-center gap-x-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconButton
                    visual="gray"
                    variant="ghost"
                    size="lg"
                    className="rounded-full"
                    onClick={onToggleRightSidebar}
                  >
                    <Info className="size-[22px]" />
                  </IconButton>
                </TooltipTrigger>
                <TooltipContent>Profile Info</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-pressed={threadStarred}
                    className="size-11 flex items-center justify-center focus-visible:outline-none"
                    onClick={() => handleToggleStar(!threadStarred)}
                  >
                    <Star
                      className={cn(
                        "size-6 transition-colors duration-300 ease-out",
                        threadStarred
                          ? "text-warning-300 fill-warning-300"
                          : "text-dark-blue-400/50 fill-transparent hover:text-dark-blue-400"
                      )}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {threadStarred ? "Remove from Favorites" : "Add to Favorites"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DropdownMenu modal={false}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <IconButton
                        className="rounded-full text-gray-500"
                        visual="gray"
                        variant="ghost"
                        size="lg"
                      >
                        <MoreHorizontal className="size-[22px]" />
                      </IconButton>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>More Options</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent align="end" side="bottom">
                <DropdownMenuItem onSelect={onToggleRightSidebar}>
                  <Info className="size-4" /> Profile Info
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    handleToggleStar(!threadStarred)
                  }}
                >
                  <Star className="size-4" />
                  {threadStarred ? "Unmark Favorite" : "Mark Favorite"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    if (!selectedConversation) return
                    const id = selectedConversation.id
                    const goingUnread = !threadUnread
                    ;(goingUnread
                      ? threadActions.markUnread(id)
                      : threadActions.markRead(id)
                    )
                      .then(() =>
                        pushUndoToast(
                          goingUnread
                            ? "Message marked as unread"
                            : "Message marked as read",
                          () =>
                            (goingUnread
                              ? threadActions.markRead(id)
                              : threadActions.markUnread(id)
                            ).catch(() => {})
                        )
                      )
                      .catch((err) =>
                        console.error("mark unread/read failed", err)
                      )
                  }}
                >
                  <Mail05 className="size-4" />{" "}
                  {threadUnread ? "Mark as Read" : "Mark Unread"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    if (!selectedConversation) return
                    const id = selectedConversation.id
                    const next = !threadPinned
                    ;(next ? threadActions.pin(id) : threadActions.unpin(id))
                      .then(() =>
                        pushUndoToast(
                          next ? "Message Pinned" : "Message Unpinned",
                          () =>
                            (next
                              ? threadActions.unpin(id)
                              : threadActions.pin(id)
                            ).catch(() => {})
                        )
                      )
                      .catch((err) => console.error("pin toggle failed", err))
                  }}
                >
                  <Pin02 className="size-4" />
                  {threadPinned ? "Unpin Chat" : "Pin Chat"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    if (!selectedConversation) return
                    const id = selectedConversation.id
                    const goingArchived = !threadArchived
                    ;(goingArchived
                      ? threadActions.archive(id)
                      : threadActions.unarchive(id)
                    )
                      .then(() =>
                        pushUndoToast(
                          goingArchived
                            ? "Message Archived"
                            : "Message Restored",
                          () =>
                            (goingArchived
                              ? threadActions.unarchive(id)
                              : threadActions.archive(id)
                            ).catch(() => {})
                        )
                      )
                      .catch((err) =>
                        console.error("archive toggle failed", err)
                      )
                  }}
                >
                  <Archive className="size-4" />{" "}
                  {threadArchived ? "Unarchive" : "Archive"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault()
                    if (!selectedConversation) return
                    const id = selectedConversation.id
                    const goingSpam = !threadSpam
                    ;(goingSpam
                      ? threadActions.spam(id)
                      : threadActions.unspam(id)
                    )
                      .then(() =>
                        pushUndoToast(
                          goingSpam
                            ? "Message moved to Spam"
                            : "Message moved to Inbox",
                          () =>
                            (goingSpam
                              ? threadActions.unspam(id)
                              : threadActions.spam(id)
                            ).catch(() => {})
                        )
                      )
                      .catch((err) => console.error("spam toggle failed", err))
                  }}
                >
                  <AlertTriangle className="size-4" />{" "}
                  {threadSpam ? "Move to Inbox" : "Move to Spam"}
                </DropdownMenuItem>
                {!selectedConversation?.isGroup && (
                  <DropdownMenuItem
                    className="text-error-500"
                    onSelect={(e) => {
                      e.preventDefault()
                      setShowBlockConfirm(true)
                    }}
                  >
                    <AlertTriangle className="size-4" /> Block / Report
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-error-500"
                  onSelect={(e) => {
                    e.preventDefault()
                    setShowDeleteConfirm(true)
                  }}
                >
                  <Trash2 className="size-4" /> Delete Chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog
              open={showDeleteConfirm}
              onOpenChange={setShowDeleteConfirm}
            >
              <DialogContent className="max-w-[348px] p-7 rounded-xl">
                <DialogTitle>Delete this chat?</DialogTitle>
                <DialogDescription className="mt-2">
                  This chat will be moved to Trash. You can restore it later
                  from the Trash filter.
                </DialogDescription>
                <div className="mt-8 grid grid-cols-2 gap-x-3">
                  <DialogClose asChild>
                    <Button visual="gray" variant="outlined">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    onClick={() => {
                      if (!selectedConversation) return
                      const id = selectedConversation.id
                      threadActions
                        .trash(id)
                        .then(() =>
                          pushUndoToast("Chat Deleted", () =>
                            threadActions.untrash(id).catch(() => {})
                          )
                        )
                        .catch((err) => console.error("trash failed", err))
                      setShowDeleteConfirm(false)
                    }}
                  >
                    Yes, Delete
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog
              open={showEditDeleteConfirm}
              onOpenChange={setShowEditDeleteConfirm}
            >
              <DialogContent className="max-w-[348px] p-7 rounded-xl">
                <DialogTitle>Delete this message?</DialogTitle>
                <DialogDescription className="mt-2">
                  Saving an empty message will delete it for everyone.
                </DialogDescription>
                <div className="mt-8 grid grid-cols-2 gap-x-3">
                  <DialogClose asChild>
                    <Button visual="gray" variant="outlined">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button onClick={handleConfirmEditDelete}>Yes, Delete</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Message list */}
      <div
        className="flex-1 min-h-0 min-w-0"
        style={{ ...({ "--h": toPxIfNumber(height) } as any) }}
      >
        <ScrollArea
          ref={messagesScrollRef}
          className="h-full"
          viewportClassName="h-full"
          scrollBar={<ScrollBar className="w-4 p-1" />}
        >
          <div className="p-8 grid gap-y-6">
            {hasMore && (
              <div className="flex items-center justify-center py-3 text-gray-400">
                {loadingOlder ? (
                  <Spinner size={20} strokeWidth={3} />
                ) : (
                  <span className="text-xs">Scroll up for older messages</span>
                )}
              </div>
            )}
            {isSwitching && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
                <Spinner size={24} strokeWidth={3} />
                <p className="text-sm">Loading messages...</p>
              </div>
            )}
            {!isSwitching && keyError && (
              <div className="flex flex-col items-center justify-center py-20 text-error-500 gap-2">
                <p className="text-sm font-medium">{keyError}</p>
              </div>
            )}
            {!isSwitching &&
              visibleDisplayedMessages.length === 0 &&
              !(
                selectedTab === "Messages" &&
                (acceptedOfferCard ||
                  counterOfferCard ||
                  declinedOfferCard ||
                  conversationOfferNotifications.length > 0)
              ) && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
                  <Send className="size-8 stroke-[1.5]" />
                  <p className="text-sm">No messages yet. Say hello!</p>
                </div>
              )}
            {!isSwitching &&
              visibleDisplayedMessages.map((m, i) => {
                const prev = i > 0 ? visibleDisplayedMessages[i - 1] : null
                const showDate =
                  !prev ||
                  !isSameDay(parseISO(m.createdAt), parseISO(prev.createdAt))
                return (
                  <React.Fragment key={m.id ?? i}>
                    {showDate && (
                      <DateSeparator
                        label={formatDateSeparator(m.createdAt)}
                        className="order-last"
                      />
                    )}
                    <div
                      data-message-id={m.id}
                      className={`order-last flex rounded-lg ${
                        m.senderId === currentUser.id
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      {m.senderId === currentUser.id ? (
                        <div className="flex flex-col items-end gap-y-1">
                          <Bubble
                            message={m}
                            currentUser={currentUser}
                            participantUsername={receiverUser.username ?? ""}
                            participantName={fullName}
                            onForward={handleOpenForward}
                            onReply={setReplyingTo}
                            onEdit={handleStartEdit}
                            onLocalDelete={handleLocalDelete}
                            onLocalRestore={handleLocalRestore}
                            onToggleReaction={handleToggleReaction}
                            replyToMessage={
                              m.replyToMessageId
                                ? (localMessageById.get(m.replyToMessageId) ??
                                  null)
                                : null
                            }
                          />
                          {m.status === "optimistic-offline" && (
                            <div className="flex items-center gap-x-2 text-xs text-amber-600">
                              <span>
                                Will send when you&apos;re back online
                              </span>
                              <button
                                type="button"
                                className="text-gray-500 hover:text-gray-700 hover:underline"
                                onClick={() => discardOptimistic(m.id)}
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                          {m.status === "failed-send" && (
                            <div className="flex items-center gap-x-2 text-xs text-error-600">
                              <span>Failed to send</span>
                              <button
                                type="button"
                                className="font-semibold text-primary-500 hover:underline"
                                onClick={() => retryOptimistic(m.id)}
                              >
                                Retry
                              </button>
                              <button
                                type="button"
                                className="text-gray-500 hover:text-gray-700 hover:underline"
                                onClick={() => discardOptimistic(m.id)}
                              >
                                Discard
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <YourBubble
                          message={m}
                          currentUser={currentUser}
                          onForward={handleOpenForward}
                          onReply={setReplyingTo}
                          onToggleReaction={handleToggleReaction}
                          replyToMessage={
                            m.replyToMessageId
                              ? (localMessageById.get(m.replyToMessageId) ??
                                null)
                              : null
                          }
                          participantName={fullName}
                          participantUsername={receiverUser.username ?? ""}
                          participantAvatarUrl={
                            receiverUser.avatarUrl ?? undefined
                          }
                        />
                      )}
                    </div>
                  </React.Fragment>
                )
              })}
            {!isSwitching &&
              selectedTab === "Messages" &&
              conversationOfferNotifications.map((item, index) => {
                const acceptedInCurrentTalentFlow =
                  !item.clientPerspective &&
                  acceptedOfferCard?.contractId === item.contractId
                const counteredInCurrentTalentFlow =
                  !item.clientPerspective &&
                  counterOfferCard?.contractId === item.contractId
                // Offer card reverts to "Pending" after reload: this card
                // used to fall straight back to `item.event` — the fixed
                // event type of whichever notification happened to be
                // first created for this offer, never updated afterward —
                // the instant none of the ephemeral same-session overlays
                // above were set (i.e. on every reload). `item.offerStatus`
                // is the live status from the same getOffer() refetch this
                // page already runs on every load (PMCM-393 AC-42, see its
                // definition above) and was simply never consulted here.
                // Undefined still means "no live signal" (seeded fixtures,
                // or the lookup failed) and correctly falls through to the
                // old event-based behavior in that case.
                const liveStatusEvent =
                  item.offerStatus === "ACCEPTED"
                    ? "offer.accepted"
                    : item.offerStatus === "DECLINED"
                      ? "offer.declined"
                      : item.offerStatus === "WITHDRAWN"
                        ? "offer.withdrawn"
                        : item.offerStatus === "EXPIRED"
                          ? "offer.expired"
                          : item.offerStatus === "COUNTERED"
                            ? "offer.countered"
                            : undefined
                const effectiveEvent =
                  counteredInCurrentTalentFlow
                    ? "offer.countered"
                    : acceptedInCurrentTalentFlow
                    ? "offer.accepted"
                    : !item.clientPerspective &&
                        locallyDeclinedTalentOffers.includes(item.contractId)
                    ? "offer.declined"
                    : liveStatusEvent ?? item.event
                const state = OFFER_EVENT_STATE[effectiveEvent]
                const isTalentOffer = !item.clientPerspective
                const isAcceptedOffer = effectiveEvent.includes("accepted")
                const isCounterDeclinedOffer =
                  effectiveEvent === "offer.counter_declined"
                const isDeclinedOffer =
                  effectiveEvent.includes("declined") &&
                  !isCounterDeclinedOffer
                const isWithdrawnOffer = effectiveEvent.includes("withdrawn")
                const isExpiredOffer =
                  effectiveEvent === "offer.expired" ||
                  effectiveEvent === "offer.counter_expired"
                const isCounterExpiredOffer =
                  effectiveEvent === "offer.counter_expired"
                const showOriginalAsCountered =
                  item.clientPerspective &&
                  effectiveEvent === "offer.counter_accepted"
                const isPendingOffer = effectiveEvent.includes("expiring_soon")
                const isCounteredOffer =
                  effectiveEvent === "offer.countered" ||
                  effectiveEvent === "offer.counter_edited"
                const isClientSentTalentCounter =
                  isTalentOffer &&
                  isCounteredOffer &&
                  item.counterOfferFromClient === true
                const isWithdrawnTalentCounter =
                  isCounteredOffer &&
                  withdrawnTalentCounterOfferMessage?.id === item.id
                const isActiveTalentOffer = isTalentOffer && !state
                const showTalentOfferAction =
                  isTalentOffer &&
                  (isActiveTalentOffer ||
                    isAcceptedOffer ||
                    isExpiredOffer ||
                    isClientSentTalentCounter ||
                    isDeclinedOffer ||
                    // BTB-291/PMCM-367 AC-13.02: isActiveTalentOffer is
                    // `!state`, and OFFER_EVENT_STATE maps
                    // offer.expiring_soon to a real (Badge-worthy) state —
                    // so a PENDING offer nearing expiry fell through every
                    // branch here and lost its CTA, even though it's still
                    // fully actionable. isPendingOffer (already computed
                    // above) is exactly that "expiring but not terminal"
                    // case; QA's jobListingId theory didn't hold up — see
                    // hasJobListing above, which is a separate, real bug in
                    // the modal's View Job link, not this gate.
                    isPendingOffer ||
                    (isWithdrawnOffer &&
                      !item.event.includes("counter_withdrawn")))
                // PMCM-367 AC-13.05: only the superseded original drops its
                // CTA. A client-sent counter is also isCounteredOffer, but it
                // is the live offer the talent responds to, so it keeps
                // View Offer. The client's counter_declined/counter_withdrawn
                // cards stay CTA-less as before — the counter card carries
                // those actions (AC-13.09).
                const hideOfferCardAction =
                  (isCounteredOffer && !isClientSentTalentCounter) ||
                  (item.clientPerspective === true &&
                    (item.event.includes("counter_declined") ||
                      item.event.includes("counter_withdrawn")))
                const talentOfferDescription = isAcceptedOffer
                  ? `Starts on ${item.startDate}.`
                  : isDeclinedOffer
                    ? "This offer is now closed."
                    : isCounteredOffer
                      ? isClientSentTalentCounter
                        ? `This offer expires ${item.expiresLabel}.`
                        : "This offer was replaced by new terms."
                      : isCounterDeclinedOffer
                        ? `This offer expires ${item.expiresLabel}.`
                      : isWithdrawnOffer
                        ? "This offer was withdrawn."
                        : isExpiredOffer
                          ? `This offer expired on ${item.expiresLabel}.`
                          : isPendingOffer
                            ? `This offer expires ${item.expiresLabel}.`
                            : `This offer expires ${item.expiresLabel}.`
                const mutedTerms =
                  isMutedOfferEvent(effectiveEvent) &&
                  !(isTalentOffer && isCounterDeclinedOffer) &&
                  !(
                    item.clientPerspective &&
                    (item.event === "offer.countered" ||
                      item.event === "offer.counter_edited")
                  )
                const rateMatch = item.offerRate.match(/^(\$)([\d,.]+)(.*)$/)
                const previousCreatedAt =
                  index > 0
                    ? conversationOfferNotifications[index - 1]?.createdAt
                    : visibleDisplayedMessages[
                        visibleDisplayedMessages.length - 1
                      ]?.createdAt
                const showDate =
                  !previousCreatedAt ||
                  !isSameDay(
                    parseISO(item.createdAt),
                    parseISO(previousCreatedAt)
                  )
                const clientResponseAction = item.event.includes("accepted")
                  ? "accepted your offer"
                  : item.event.includes("declined")
                    ? "declined your offer"
                    : item.event.includes("counter")
                      ? item.event.includes("edited") ||
                        item.event.includes("expired")
                        ? "sent a counter offer"
                        : "sent you a counter offer"
                      : item.event.includes("withdrawn")
                        ? "withdrew the offer"
                        : item.event.includes("expiring")
                          ? "has an offer expiring soon"
                          : item.event.includes("expired")
                            ? "has an expired offer"
                            : OFFER_EVENT_ACTION[item.event] || item.title
                const clientResponseTitle = item.event.includes("accepted")
                  ? "Offer Accepted!"
                  : item.event.includes("declined")
                    ? "Offer Declined"
                    : item.event.includes("counter")
                      ? item.event.includes("edited")
                        ? "Counter Offer Submitted (Edited)"
                        : "Counter Offer Submitted"
                      : item.event.includes("withdrawn")
                        ? "Offer Withdrawn"
                        : item.event.includes("expired")
                          ? "Offer Expired"
                          : item.title
                if (
                  item.clientPerspective &&
                  item.event === "offer.counter_expired" &&
                  item.singleMessageOnly
                ) {
                  return (
                    <React.Fragment key={item.id}>
                      {showDate ? (
                        <DateSeparator
                          label={formatDateSeparator(item.createdAt)}
                        />
                      ) : null}
                      <div className="flex w-full items-end gap-2">
                        <Avatar className="size-10 shrink-0" size="md" isOnline>
                          <AvatarImage
                            src={item.senderAvatarSrc}
                            alt={item.senderDisplayName}
                          />
                          <AvatarFallback>
                            {item.senderDisplayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex w-[449px] max-w-[calc(100%-48px)] flex-col items-start gap-2">
                          <article className="group relative flex w-full flex-col items-start gap-4 rounded-xl rounded-bl-none bg-primary-25 px-5 pb-5 pt-2.5">
                            {renderOfferMessageHoverActions(
                              item.body,
                              item.clientPerspective
                                ? currentUser?.id
                                : item.actorId
                            )}
                            <div className="text-sm leading-[17px] text-dark-blue-400">
                              <span className="font-bold">
                                {item.senderDisplayName}
                              </span>{" "}
                              <span className="text-xs font-normal leading-[15px]">
                                @{item.senderUsername.replace(/^@/, "")} {" "}
                              </span>
                              <span className="font-semibold">
                                sent a counter offer
                              </span>
                            </div>
                            <p className="text-sm leading-5 text-dark-blue-400">
                              {item.counterOfferMessage ||
                                "I would like to increase the hourly rate if it’s ok."}
                            </p>
                            <Card className="flex w-full flex-col items-start gap-4 rounded-xl px-6 py-4 shadow-none hover:border-gray-200 hover:ring-0">
                              <div className="flex w-full items-center justify-between gap-3">
                                <h3 className="text-sm font-bold leading-[17px] text-dark-blue-400">
                                  Counter Offer Submitted
                                </h3>
                                <Badge variant="rounded" visual="gray" size="sm">
                                  Offer Expired
                                </Badge>
                              </div>
                              <p className="text-xs font-medium leading-[15px] text-dark-blue-400">
                                {item.offerTitle}
                              </p>
                              <div className="flex items-center gap-2">
                                <Badge variant="rounded" visual="gray" size="sm">
                                  {item.offerType}
                                </Badge>
                                <span className="text-[10px] leading-4 text-gray-500">
                                  This offer expired {item.expiresLabel}.
                                </span>
                              </div>
                              <Button
                                className="h-5 w-fit p-0 text-xs font-semibold leading-5 no-underline hover:no-underline"
                                size="sm"
                                variant="link"
                                visual="primary"
                              onClick={() => {
                                openNotificationOffer(item)
                                setNotificationOfferStep("expired-counter")
                              }}
                              >
                                View Details
                              </Button>
                            </Card>
                          </article>
                          <span className="text-[11px] leading-[15px] text-gray-500">
                            Sent {format(parseISO(item.createdAt), "h:mm a")}
                          </span>
                        </div>
                      </div>
                    </React.Fragment>
                  )
                }
                return (
                  <React.Fragment key={item.id}>
                    {showDate ? (
                      <DateSeparator
                        label={formatDateSeparator(item.createdAt)}
                      />
                    ) : null}
                    {isClientSentTalentCounter ? (
                      <div className="flex w-full justify-end">
                        <article className="group relative flex w-[388px] max-w-[calc(100%-48px)] flex-col items-start gap-2 rounded-xl rounded-br-none bg-primary-25 p-5">
                          {renderOfferMessageHoverActions(
                            item.body,
                            item.clientPerspective ? currentUser?.id : item.actorId
                          )}
                          <div className="text-sm leading-[17px] text-dark-blue-400">
                            <span className="font-bold">You</span>{" "}
                            {currentUser.username ? (
                              <span className="text-xs font-normal">
                                @{currentUser.username.replace(/^@/, "")} {" "}
                              </span>
                            ) : null}
                            <span className="font-semibold">sent a counter offer</span>
                          </div>
                          <p className="text-sm leading-[17px] text-dark-blue-400">
                            I would like to increase the hourly rate if it’s ok.
                          </p>
                          <Card className="mt-2 flex w-full flex-col items-start rounded-lg p-4 shadow-none hover:border-gray-200 hover:ring-0">
                            <h3 className="text-sm font-bold leading-[17px] text-dark-blue-400">
                              Counter Offer Submitted
                            </h3>
                            <p className="mt-4 text-xs font-medium leading-[15px] text-dark-blue-400">
                              {item.offerTitle}
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <Badge variant="rounded" visual="gray" size="sm">
                                {item.offerType}
                              </Badge>
                              <span className="text-[10px] leading-4 text-gray-500">
                                This counter offer was superseded by another counteroffer.
                              </span>
                            </div>
                            <Button
                              className="mt-3 h-5 w-fit p-0 text-xs font-semibold leading-5 text-gray-500 no-underline hover:no-underline"
                              size="sm"
                              variant="link"
                              visual="gray"
                              onClick={() => {
                                openNotificationOffer(item)
                                setNotificationOfferStep("history")
                              }}
                            >
                              View Offer History
                            </Button>
                          </Card>
                          <span className="self-end text-[11px] leading-[15px] text-gray-500">
                            Sent {format(parseISO(item.createdAt), "h:mm a")}
                          </span>
                        </article>
                      </div>
                    ) : null}
                    <div className="flex w-full items-start gap-2">
                      <div
                        className={cn(
                          "flex h-[271px] shrink-0 items-end",
                          item.clientPerspective && "hidden"
                        )}
                      >
                        <Avatar className="size-10" size="md" isOnline>
                          <AvatarImage
                            src={item.senderAvatarSrc}
                            alt={item.senderDisplayName}
                          />
                          <AvatarFallback>
                            {item.senderDisplayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>

                      <div
                        className={cn(
                          "flex min-w-0 flex-1 flex-col gap-2",
                          item.clientPerspective ? "items-end" : "items-start"
                        )}
                      >
                        <article
                          className={cn(
                            "group relative flex w-full flex-col items-start gap-4 rounded-xl bg-primary-25 px-5 pb-5 pt-2.5",
                            item.clientPerspective
                              ? "h-[256px] rounded-br-none"
                              : "h-[248px] rounded-bl-none"
                          )}
                        >
                          {renderOfferMessageHoverActions(
                            item.body,
                            item.clientPerspective ? currentUser?.id : item.actorId
                          )}
                          <div className="flex h-[70px] w-full flex-col gap-2">
                            <div className="text-sm leading-[17px] text-dark-blue-400">
                              <span className="font-bold">
                                {item.clientPerspective
                                  ? "You"
                                  : item.senderDisplayName}
                              </span>{" "}
                              {(item.clientPerspective
                                ? currentUser.username
                                : item.senderUsername) ? (
                                <span className="text-xs font-normal leading-[15px]">
                                  @{String(
                                    item.clientPerspective
                                      ? currentUser.username
                                      : item.senderUsername
                                  ).replace(/^@/, "")}{" "}
                                </span>
                              ) : null}
                              <span className="font-semibold">
                                {isClientSentTalentCounter
                                  ? "sent a counter offer"
                                  : item.clientPerspective
                                  ? "sent an offer"
                                  : item.seeded
                                    ? "sent an offer"
                                    : OFFER_EVENT_ACTION[item.event] || item.title}
                              </span>
                            </div>

                            <p className="h-[34px] w-full text-sm leading-[17px] text-dark-blue-400">
                              {item.clientPerspective
                                ? offerInvitationMessage(item.role)
                                : isClientSentTalentCounter
                                  ? item.counterOfferMessage ||
                                    "I would like to propose updated terms for this offer."
                                : item.seeded
                                  ? offerInvitationMessage(item.role)
                                  : item.body}
                            </p>
                          </div>

                          <Card className="flex h-[132px] w-full flex-col items-stretch gap-4 rounded-xl border-primary-50 px-6 py-4 shadow-none hover:border-primary-50 hover:ring-0">
                            <div className="flex h-[46px] items-start justify-between gap-9">
                              <div
                                className={cn(
                                  "min-w-0",
                                  item.clientPerspective &&
                                    (item.event.includes("declined") ||
                                      item.event.includes("withdrawn")) &&
                                    "flex-1"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <p className="truncate text-sm font-semibold leading-6 text-dark-blue-400">
                                    {item.offerTitle}
                                  </p>
                                  {state && !isClientSentTalentCounter ? (
                                    <Badge
                                      visual={
                                        isTalentOffer && isCounterDeclinedOffer
                                          ? "warning"
                                          : showOriginalAsCountered
                                            ? "gray"
                                          : state.visual
                                      }
                                      size="sm"
                                      className={cn(
                                        "h-[18px] px-1.5 text-[10px] leading-[18px]",
                                        item.clientPerspective &&
                                          (item.event.includes("declined") ||
                                            item.event.includes("withdrawn")) &&
                                          "ml-auto"
                                      )}
                                    >
                                      {isTalentOffer && isCounterDeclinedOffer
                                        ? "Offer Pending"
                                        : showOriginalAsCountered
                                          ? "Offer Countered"
                                        : state.label}
                                    </Badge>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="rounded"
                                    visual="gray"
                                    size="sm"
                                  >
                                    {item.offerType}
                                  </Badge>
                                  <span className="text-[10px] leading-4 text-gray-500">
                                    {isTalentOffer
                                      ? talentOfferDescription
                                      : item.clientPerspective &&
                                          item.event.includes("declined")
                                        ? "This offer is now closed."
                                        : item.clientPerspective &&
                                            item.event.includes("withdrawn")
                                          ? "This offer was withdrawn."
                                          : isCounteredOffer
                                            ? "This offer was replaced by new terms."
                                            : isExpiredOffer
                                              ? `This offer expired on ${item.expiresLabel}.`
                                              : `This offer expires ${item.expiresLabel}.`}
                                  </span>
                                </div>
                              </div>
                              {!hideOfferCardAction &&
                              (!isTalentOffer || showTalentOfferAction) ? (
                                <Button
                                  size="sm"
                                  variant={
                                    isTalentOffer && isExpiredOffer
                                      ? "link"
                                      : isTalentOffer && isAcceptedOffer
                                        ? "outlined"
                                        : item.clientPerspective &&
                                            (item.event.includes("accepted") ||
                                              item.event.includes("counter") ||
                                              item.event.includes("expired"))
                                          ? "outlined"
                                          : undefined
                                  }
                                  visual={
                                    isTalentOffer && isExpiredOffer
                                      ? "primary"
                                      : isTalentOffer && isAcceptedOffer
                                        ? "gray"
                                        : item.clientPerspective &&
                                            (item.event.includes("accepted") ||
                                              item.event.includes("counter") ||
                                              item.event.includes("expired"))
                                          ? "gray"
                                          : undefined
                                  }
                                  className={cn(
                                    isTalentOffer &&
                                      isExpiredOffer &&
                                      "h-5 w-fit p-0 text-xs font-semibold leading-5 no-underline hover:no-underline"
                                  )}
                                  onClick={() => {
                                    if (isTalentOffer && isAcceptedOffer) {
                                      openTalentContractPage(item)
                                      return
                                    }
                                    if (isTalentOffer && isExpiredOffer) {
                                      openNotificationOffer({
                                        ...item,
                                        event: "offer.expired",
                                        clientPerspective: false,
                                      })
                                      setNotificationOfferStep("event")
                                      return
                                    }
                                    if (
                                      item.clientPerspective &&
                                      item.event.includes("accepted")
                                    ) {
                                      openClientContractPage(item)
                                      return
                                    }
                                    openNotificationOffer(item)
                                    // PMCM-367: the talent's closed states open
                                    // their read-only views, the same steps the
                                    // seeded follow-on card uses. "declined"
                                    // also covers an offer declined this session,
                                    // whose item.event is still the pre-decline
                                    // one. A withdrawn offer stays on "event" for
                                    // the "This offer was withdrawn" dialog —
                                    // "previous" would show Accept/Decline on it.
                                    if (isTalentOffer && isDeclinedOffer) {
                                      setNotificationOfferStep("declined")
                                      return
                                    }
                                    if (
                                      isTalentOffer &&
                                      item.event === "offer.withdrawn"
                                    ) {
                                      return
                                    }
                                    if (
                                      item.clientPerspective &&
                                      (item.event === "offer.countered" ||
                                        item.event === "offer.counter_edited")
                                    ) {
                                      setNotificationOfferStep("previous")
                                      return
                                    }
                                    if (
                                      item.event.includes("withdrawn") &&
                                      !item.clientPerspective
                                    ) {
                                      setNotificationOfferStep("previous")
                                    }
                                  }}
                                >
                                  {isTalentOffer && isExpiredOffer
                                    ? "View Details"
                                    : isTalentOffer && isAcceptedOffer
                                      ? "View Contract"
                                      : isTalentOffer && isDeclinedOffer
                                      ? "View Details"
                                      : item.event.includes("accepted")
                                      ? "View Contract"
                                      : item.event.includes("counter_withdrawn")
                                        ? "View Active Offer"
                                        : item.event.includes("withdrawn")
                                          ? "View Details"
                                          : item.event.includes("declined") ||
                                              item.event.includes("expired")
                                            ? "View Details"
                                            : "View Offer"}
                                </Button>
                              ) : null}
                            </div>

                            <div className="h-px w-full shrink-0 bg-gray-100" />
                            <div
                              className={cn(
                                "flex h-[22px] w-full items-center justify-between gap-4 text-xs leading-[15px] text-gray-500",
                                mutedTerms && "opacity-40"
                              )}
                            >
                              <div className="flex w-[129px] items-center justify-center gap-1.5 whitespace-nowrap">
                                <span className="flex items-center gap-0.5">
                                  <DollarSign className="size-3 shrink-0 text-primary-400" />
                                  <span>Offer Rate</span>
                                </span>
                                <span className="flex items-end text-dark-blue-400">
                                  {rateMatch ? (
                                    <>
                                      <span
                                        className="text-base font-medium leading-[18px]"
                                      >
                                        {rateMatch[1]}
                                      </span>
                                      <span
                                        className="text-base font-semibold leading-[18px]"
                                      >
                                        {rateMatch[2]}
                                      </span>
                                      <span
                                        className="text-xs font-light leading-[17px]"
                                      >
                                        {rateMatch[3]}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="font-semibold">
                                      {item.offerRate}
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="h-[22px] w-px shrink-0 bg-gray-200" />
                              <div
                                className="flex w-[120px] min-w-0 items-center justify-center gap-1.5 whitespace-nowrap"
                              >
                                <span className="flex shrink-0 items-center gap-1">
                                  <UserIcon className="size-3 shrink-0 text-primary-400" />
                                  <span>Role</span>
                                </span>
                                <span
                                  className="min-w-0 truncate font-semibold text-dark-blue-400"
                                  title={item.role}
                                >
                                  {item.role}
                                </span>
                              </div>
                              <div className="h-[22px] w-px shrink-0 bg-gray-200" />
                              <div className="flex w-[127px] items-center justify-center gap-1.5 whitespace-nowrap">
                                <span className="flex items-center gap-1">
                                  <Calendar className="size-3 shrink-0 text-primary-400" />
                                  <span>Duration</span>
                                </span>
                                <span className="font-semibold text-dark-blue-400">
                                  {item.duration}
                                </span>
                              </div>
                              <div className="h-[22px] w-px shrink-0 bg-gray-200" />
                              <div className="flex w-[130px] items-center justify-center gap-1.5 whitespace-nowrap">
                                <span className="flex items-center gap-1">
                                  <Clock className="size-3 shrink-0 text-primary-400" />
                                  <span>Schedule</span>
                                </span>
                                <span className="font-semibold text-dark-blue-400">
                                  {item.schedule}
                                </span>
                              </div>
                            </div>
                          </Card>
                        </article>
                        <span className="text-[11px] leading-[15px] text-gray-500">
                          Sent {format(parseISO(item.createdAt), "h:mm a")}
                        </span>
                        {isTalentOffer &&
                        item.seeded &&
                        item.id === seededTalentFollowOnId &&
                        (isAcceptedOffer ||
                          isDeclinedOffer ||
                          isCounteredOffer ||
                          isCounterDeclinedOffer ||
                          isWithdrawnOffer ||
                          isExpiredOffer) &&
                        declinedOfferCard?.contractId !== item.contractId ? (
                          <div className="mt-4 flex w-full justify-end">
                            <article className="group relative flex w-[449px] max-w-[calc(100%-48px)] flex-col items-start gap-2 rounded-xl rounded-br-none bg-primary-25 p-5">
                              {renderOfferMessageHoverActions(
                                item.body,
                                item.clientPerspective
                                  ? currentUser?.id
                                  : item.actorId
                              )}
                              <div className="text-sm leading-[17px] text-dark-blue-400">
                                <span className="font-bold">
                                  {isAcceptedOffer ||
                                  isDeclinedOffer ||
                                  isCounteredOffer ||
                                  isCounterDeclinedOffer ||
                                  isCounterExpiredOffer
                                    ? "You"
                                    : item.senderDisplayName}
                                </span>{" "}
                                {(isAcceptedOffer ||
                                isDeclinedOffer ||
                                isCounteredOffer ||
                                isCounterDeclinedOffer ||
                                isCounterExpiredOffer
                                  ? currentUser.username
                                  : item.senderUsername) ? (
                                  <span className="text-xs font-normal">
                                    @
                                    {String(
                                      isAcceptedOffer ||
                                      isDeclinedOffer ||
                                      isCounteredOffer ||
                                      isCounterDeclinedOffer ||
                                      isCounterExpiredOffer
                                        ? currentUser.username
                                        : item.senderUsername
                                    ).replace(/^@/, "")}{" "}
                                  </span>
                                ) : null}
                                <span className="font-semibold">
                                  {isAcceptedOffer
                                    ? "accepted the offer"
                                    : isDeclinedOffer
                                      ? "declined the offer"
                                      : isCounteredOffer
                                        ? "sent a counter offer"
                                        : isCounterDeclinedOffer
                                          ? "sent a counter offer"
                                        : isCounterExpiredOffer
                                          ? "sent a counteroffer"
                                        : isWithdrawnOffer
                                          ? "withdrew the offer"
                                          : "has an expired offer"}
                                </span>
                              </div>

                              {isDeclinedOffer ||
                              isCounteredOffer ||
                              isCounterDeclinedOffer ||
                              isCounterExpiredOffer ? (
                                <p className="text-sm leading-5 text-dark-blue-400">
                                  {isCounteredOffer ||
                                  isCounterDeclinedOffer ||
                                  isCounterExpiredOffer
                                    ? item.counterOfferMessage ||
                                      "I would like to increase the hourly rate if it’s ok."
                                    : "Thanks, unfortunately I can’t take this on right now."}
                                </p>
                              ) : null}

                              <Card className="mt-2 flex w-full flex-col items-start rounded-lg p-4 shadow-none hover:border-gray-200 hover:ring-0">
                                <div className="flex w-full items-center justify-between gap-3">
                                  <h3 className="text-sm font-bold leading-[17px] text-dark-blue-400">
                                    {isAcceptedOffer
                                      ? "Offer Accepted!"
                                      : isDeclinedOffer
                                        ? "Offer Declined"
                                        : isCounteredOffer
                                          ? "Counter Offer Submitted"
                                          : isCounterDeclinedOffer
                                            ? "Counter Offer Submitted"
                                          : isCounterExpiredOffer
                                            ? "Counter Offer Submitted"
                                          : isWithdrawnOffer
                                            ? "Offer Withdrawn"
                                            : "Offer Expired"}
                                  </h3>
                                  {isAcceptedOffer ? (
                                    <Badge visual="success" size="sm">
                                      Offer Accepted
                                    </Badge>
                                  ) : isCounterExpiredOffer ? (
                                    <Badge visual="gray" size="sm">
                                      Offer Expired
                                    </Badge>
                                  ) : null}
                                </div>
                                <p className="mt-4 text-xs font-medium leading-[15px] text-dark-blue-400">
                                  {item.offerTitle}
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                  <Badge variant="rounded" visual="gray" size="sm">
                                    {item.offerType}
                                  </Badge>
                                  <span className="text-[10px] leading-4 text-gray-500">
                                    {isAcceptedOffer
                                      ? `Starts on ${item.startDate}.`
                                      : isDeclinedOffer
                                        ? "This offer is now closed."
                                        : isCounteredOffer
                                          ? isWithdrawnTalentCounter
                                            ? "This counteroffer was withdrawn."
                                            : "This counteroffer expires Aug 02, 2025."
                                          : isCounterDeclinedOffer
                                            ? "These changes weren’t accepted."
                                          : isCounterExpiredOffer
                                            ? `This offer expired ${item.expiresLabel}.`
                                          : isWithdrawnOffer
                                            ? "This offer was withdrawn."
                                            : `This offer expired on ${item.expiresLabel}.`}
                                  </span>
                                </div>
                                <Button
                                  className="mt-3 h-5 w-fit p-0 text-xs font-semibold leading-5 no-underline hover:no-underline"
                                  size="sm"
                                  variant="link"
                                  visual="primary"
                                  onClick={() => {
                                    if (isAcceptedOffer) {
                                      openTalentContractPage(item)
                                      return
                                    }
                                    if (isExpiredOffer) {
                                      openNotificationOffer({
                                        ...item,
                                        event: "offer.expired",
                                        clientPerspective: false,
                                      })
                                      setNotificationOfferStep("event")
                                      return
                                    }
                                    openNotificationOffer(item)
                                    if (isDeclinedOffer) {
                                      setNotificationOfferStep("declined")
                                    } else if (isCounterDeclinedOffer) {
                                      setNotificationOfferStep("history")
                                    } else if (isCounteredOffer) {
                                      setNotificationOfferStep(
                                        isWithdrawnTalentCounter
                                          ? "history"
                                          : "sent-counter"
                                      )
                                    } else if (isWithdrawnOffer) {
                                      setNotificationOfferStep("event")
                                    }
                                  }}
                                >
                                  {isAcceptedOffer
                                    ? "View Contract"
                                    : isCounterDeclinedOffer
                                      ? "View Offer History"
                                    : isWithdrawnTalentCounter
                                      ? "View Offer History"
                                    : isWithdrawnOffer
                                      ? "View Details"
                                      : "View Details"}
                                </Button>
                              </Card>
                            </article>
                          </div>
                        ) : null}
                        {isTalentOffer &&
                        item.seeded &&
                        item.id === seededTalentFollowOnId &&
                        isCounterDeclinedOffer ? (
                          <div className="mt-4 flex w-full items-end gap-2 self-start">
                            <Avatar className="size-10 shrink-0" size="md" isOnline>
                              <AvatarImage
                                src={item.senderAvatarSrc}
                                alt={item.senderDisplayName}
                              />
                              <AvatarFallback>
                                {item.senderDisplayName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex min-w-0 flex-col items-start gap-2">
                              <article className="group relative flex w-[449px] max-w-[calc(100%-48px)] flex-col items-start gap-2 rounded-xl rounded-bl-none bg-primary-25 p-5">
                                {renderOfferMessageHoverActions(
                                  item.body,
                                  item.clientPerspective
                                    ? currentUser?.id
                                    : item.actorId
                                )}
                                <div className="text-sm leading-[17px] text-dark-blue-400">
                                  <span className="font-bold">
                                    {item.senderDisplayName}
                                  </span>{" "}
                                  <span className="text-xs font-normal">
                                    @{item.senderUsername.replace(/^@/, "")} {" "}
                                  </span>
                                  <span className="font-semibold">
                                    declined the counter offer
                                  </span>
                                </div>
                                <Card className="mt-2 flex w-full flex-col items-start rounded-lg p-4 shadow-none hover:border-gray-200 hover:ring-0">
                                  <h3 className="text-sm font-bold leading-[17px] text-dark-blue-400">
                                    Counter Offer Declined
                                  </h3>
                                  <p className="mt-4 text-xs font-medium leading-[15px] text-dark-blue-400">
                                    {item.offerTitle}
                                  </p>
                                  <div className="mt-2 flex items-center gap-2">
                                    <Badge variant="rounded" visual="gray" size="sm">
                                      {item.offerType}
                                    </Badge>
                                    <span className="text-[10px] leading-4 text-gray-500">
                                      These changes weren’t accepted.
                                    </span>
                                  </div>
                                  <Button
                                    className="mt-3 h-5 w-fit p-0 text-xs font-semibold leading-5 no-underline hover:no-underline"
                                    size="sm"
                                    variant="link"
                                    visual="primary"
                                    onClick={() => {
                                      openNotificationOffer(item)
                                      setNotificationOfferStep("history")
                                    }}
                                  >
                                    View Offer History
                                  </Button>
                                </Card>
                              </article>
                              <span className="text-[11px] leading-[15px] text-gray-500">
                                Sent {format(parseISO(item.createdAt), "h:mm a")}
                              </span>
                            </div>
                          </div>
                        ) : null}
                        {isTalentOffer &&
                        item.id === counterExpiredFollowOnId &&
                        isCounterExpiredOffer &&
                        !dismissedExpiredOfferActions.includes(item.id) ? (
                          <div className="mt-4 flex w-full items-end self-start">
                            <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
                              <article className="group relative flex w-full flex-col items-start gap-3 rounded-xl rounded-bl-none bg-primary-25 p-5">
                                {renderOfferMessageHoverActions(
                                  item.body,
                                  item.clientPerspective
                                    ? currentUser?.id
                                    : item.actorId
                                )}
                                <div className="flex w-full items-center gap-2 text-sm leading-[17px] text-dark-blue-400">
                                  <span className="font-bold">{item.senderDisplayName}</span>
                                  <span className="text-xs font-normal">
                                    @{item.senderUsername.replace(/^@/, "")}
                                  </span>
                                  <Badge variant="rounded" visual="primary" size="sm" className="ml-auto">
                                    {item.offerType}
                                  </Badge>
                                  <span className="text-[10px] leading-4 text-gray-500">
                                    This counteroffer expired {item.expiresLabel}.
                                  </span>
                                </div>
                                <p className="text-sm leading-5 text-dark-blue-400">
                                  Hi, I missed your counteroffer for the project{" "}
                                  <span className="font-semibold">{item.offerTitle}</span>.
                                  If you’re still available, can you resend it?
                                </p>
                                <div className="flex h-9 items-center overflow-hidden rounded-md border border-gray-200 bg-white">
                                  <Button
                                    variant="ghost"
                                    visual="primary"
                                    size="sm"
                                    className="rounded-none border-r border-gray-200"
                                    onClick={() => {
                                      openNotificationOffer(item)
                                      setNotificationOfferStep("resend-counter")
                                    }}
                                  >
                                    Resend Counteroffer
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    visual="primary"
                                    size="sm"
                                    className="rounded-none"
                                    onClick={() =>
                                      setDismissedExpiredOfferActions((current) =>
                                        current.includes(item.id)
                                          ? current
                                          : [...current, item.id]
                                      )
                                    }
                                  >
                                    Decline
                                  </Button>
                                </div>
                              </article>
                              <span className="text-[11px] leading-[15px] text-gray-500">
                                Sent {format(parseISO(item.createdAt), "h:mm a")}
                              </span>
                            </div>
                          </div>
                        ) : null}
                        {item.clientPerspective &&
                        item.event.includes("expired") ? (
                          <div className="mt-4 flex w-full items-end gap-2 self-start">
                            <Avatar className="size-10 shrink-0" size="md" isOnline>
                              <AvatarImage
                                src={item.senderAvatarSrc}
                                alt={item.senderDisplayName}
                              />
                              <AvatarFallback>
                                {item.senderDisplayName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
                              <article className="group relative flex w-full flex-col items-start gap-3 rounded-xl rounded-bl-none bg-primary-25 p-5">
                                {renderOfferMessageHoverActions(
                                  item.body,
                                  item.clientPerspective
                                    ? currentUser?.id
                                    : item.actorId
                                )}
                                <div className="flex w-full items-center gap-2 text-sm leading-[17px] text-dark-blue-400">
                                  <span className="font-bold">
                                    {item.senderDisplayName}
                                  </span>
                                  <span className="text-xs font-normal">
                                    @{item.senderUsername.replace(/^@/, "")}
                                  </span>
                                  <Badge
                                    variant="rounded"
                                    visual="primary"
                                    size="sm"
                                    className="ml-auto"
                                  >
                                    {item.offerType}
                                  </Badge>
                                  <span className="text-[10px] leading-4 text-gray-500">
                                    This offer expired on {item.expiresLabel}.
                                  </span>
                                </div>
                                <p className="text-sm leading-5 text-dark-blue-400">
                                  {item.extensionRequestVariant ? (
                                    <>
                                      Can you extend the offer for the project{" "}
                                      <span className="font-semibold">
                                        {item.offerTitle}
                                      </span>
                                      ? I’m still interested.
                                    </>
                                  ) : (
                                    <>
                                      Hi{" "}
                                      {item.recipientFirstName ||
                                        currentUserProfile?.firstName ||
                                        currentUserProfile?.displayName ||
                                        "there"}
                                      ! I wanted to check in and see if the{" "}
                                      {item.role} role for the project{" "}
                                      <span className="font-semibold">
                                        {item.offerTitle}
                                      </span>
                                      {" "}is still available. If so, I’m still interested.
                                    </>
                                  )}
                                </p>
                                {!dismissedExpiredOfferActions.includes(item.id) ? (
                                  <div className="flex h-9 items-center overflow-hidden rounded-md border border-gray-200 bg-white">
                                    {item.extensionRequestVariant ? (
                                      <>
                                        <Button
                                          variant="link"
                                          visual="primary"
                                          size="sm"
                                          className="h-9 rounded-none border-r border-gray-200 px-4 no-underline hover:no-underline"
                                          onClick={() => {
                                            openNotificationOffer(item)
                                            setNotificationOfferStep("resend-summary")
                                          }}
                                        >
                                          Extend Offer
                                        </Button>
                                        <Button
                                          variant="link"
                                          visual="primary"
                                          size="sm"
                                          className="h-9 rounded-none border-r border-gray-200 px-4 no-underline hover:no-underline"
                                          onClick={() => {
                                            openNotificationOffer(item)
                                            setNotificationOfferStep("edit-expired")
                                          }}
                                        >
                                          Edit Offer
                                        </Button>
                                      </>
                                    ) : (
                                      <Button
                                        variant="link"
                                        visual="primary"
                                        size="sm"
                                        className="h-9 rounded-none border-r border-gray-200 px-4 no-underline hover:no-underline"
                                        onClick={() => {
                                          openNotificationOffer(item)
                                          setNotificationOfferStep("resend-edit")
                                        }}
                                      >
                                        Edit &amp; Resend Offer
                                      </Button>
                                    )}
                                    <Button
                                      variant="link"
                                      visual="primary"
                                      size="sm"
                                      className="h-9 rounded-none px-4 no-underline hover:no-underline"
                                      onClick={() => {
                                        setDismissedExpiredOfferActions((ids) => [
                                          ...ids,
                                          item.id,
                                        ])
                                        if (!item.extensionRequestVariant) return
                                        setSelectedTab("Messages")
                                        setTextareaValue(
                                          "Thanks for checking in. Unfortunately, I’m not able to extend the offer right now."
                                        )
                                        lastTypedAtRef.current = Date.now()
                                        userTypedRef.current = true
                                        sendTyping(true)
                                        requestAnimationFrame(() =>
                                          composerRef.current?.focus()
                                        )
                                      }}
                                    >
                                      Decline
                                    </Button>
                                  </div>
                                ) : null}
                              </article>
                              <span className="text-[11px] leading-[15px] text-gray-500">
                                Sent {format(parseISO(item.createdAt), "h:mm a")}
                              </span>
                            </div>
                          </div>
                        ) : null}
                        {item.clientPerspective &&
                        !item.event.includes("expired") ? (
                          <div className="mt-4 flex w-full items-end gap-2 self-start">
                            <Avatar className="size-10 shrink-0" size="md" isOnline>
                              <AvatarImage
                                src={item.senderAvatarSrc}
                                alt={item.senderDisplayName}
                              />
                              <AvatarFallback>
                                {item.senderDisplayName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div
                              className={cn(
                                "flex max-w-[calc(100%-48px)] flex-col items-start gap-2",
                                item.event.includes("withdrawn")
                                  ? "w-[361px]"
                                  : item.event.includes("declined")
                                    ? "w-[402px]"
                                    : "w-[449px]"
                              )}
                            >
                              <article
                                className={cn(
                                  "group relative flex w-full flex-col items-start rounded-xl rounded-bl-none bg-primary-25 px-5 pb-5 pt-2.5",
                                  item.event.includes("withdrawn")
                                    ? "h-[218px] gap-4"
                                    : item.event.includes("declined")
                                      ? "h-[243px] gap-4"
                                    : item.event.includes("accepted")
                                      ? "h-[251px] gap-6"
                                      : "gap-4"
                                )}
                              >
                                {renderOfferMessageHoverActions(
                                  item.body,
                                  item.clientPerspective
                                    ? currentUser?.id
                                    : item.actorId
                                )}
                                <div
                                  className={cn(
                                    "flex w-full flex-col items-start",
                                    item.event.includes("withdrawn")
                                      ? "h-[28px] justify-end"
                                      : item.event.includes("declined")
                                        ? "h-[53px] gap-2"
                                      : item.event.includes("accepted")
                                        ? "h-[53px] gap-2"
                                        : "gap-4"
                                  )}
                                >
                                  {item.event.includes("declined") ? (
                                    <div className="flex w-full items-start">
                                      <div className="flex items-center gap-2 text-sm leading-[17px] text-dark-blue-400">
                                        <span className="flex items-center gap-2">
                                          <span className="whitespace-nowrap font-bold">
                                            {item.senderDisplayName}
                                          </span>
                                          {item.senderUsername ? (
                                            <span className="whitespace-nowrap text-xs font-normal leading-[15px]">
                                              @{item.senderUsername.replace(/^@/, "")}
                                            </span>
                                          ) : null}
                                        </span>
                                        <span className="whitespace-nowrap font-semibold">
                                          {clientResponseAction}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-sm leading-[17px] text-dark-blue-400">
                                      <span className="font-bold">
                                        {item.senderDisplayName}
                                      </span>{" "}
                                      {item.senderUsername ? (
                                        <span className="text-xs font-normal leading-[15px]">
                                          @{item.senderUsername.replace(/^@/, "")}{" "}
                                        </span>
                                      ) : null}
                                      <span className="font-semibold">
                                        {clientResponseAction}
                                      </span>
                                    </div>
                                  )}
                                  {!item.event.includes("withdrawn") ? (
                                    <p
                                      className={cn(
                                        "text-sm text-dark-blue-400",
                                        item.event.includes("declined")
                                          ? "leading-[17px]"
                                          : "leading-5"
                                      )}
                                    >
                                      {item.event.includes("accepted")
                                        ? "Excited to get started!"
                                        : item.event.includes("declined")
                                          ? "Thanks, unfortunately I can’t take this on right now."
                                        : item.event.includes("counter")
                                          ? item.counterOfferMessage ||
                                            "I would like to increase the hourly rate if it’s ok."
                                        : item.body}
                                    </p>
                                  ) : null}
                                </div>
                            <Card
                              className={cn(
                                "flex w-full flex-col items-start gap-4 rounded-xl px-6 py-4 shadow-none hover:border-gray-200 hover:ring-0",
                                item.event.includes("withdrawn")
                                  ? "h-[144px] gap-4 border-primary-50 hover:border-primary-50"
                                  : item.event.includes("declined")
                                    ? "h-[144px] border-primary-50 hover:border-primary-50"
                                  : item.event.includes("accepted") &&
                                    "h-[144px] border-primary-50 hover:border-primary-50"
                              )}
                            >
                              <div className="flex w-full items-center justify-between gap-3">
                                <h3 className="text-sm font-bold leading-[17px] text-dark-blue-400">
                                  {clientResponseTitle}
                                </h3>
                                {item.event.includes("counter") &&
                                item.event.includes("expired") ? (
                                  <Badge variant="rounded" visual="gray" size="sm">
                                    Offer Expired
                                  </Badge>
                                ) : null}
                              </div>
                              <div
                                className={cn(
                                  "flex flex-col items-start",
                                  "gap-2"
                                )}
                              >
                                <p className="text-xs font-medium leading-[15px] text-dark-blue-400">
                                  {item.offerTitle}
                                </p>
                                <div className="flex items-center gap-2">
                                  <Badge variant="rounded" visual="gray" size="sm">
                                    {item.offerType}
                                  </Badge>
                                  <span className="text-[10px] leading-4 text-gray-500">
                                    {item.event.includes("counter") &&
                                    item.event.includes("withdrawn")
                                      ? "This counteroffer was withdrawn."
                                      : item.event.includes("withdrawn")
                                        ? "This offer was withdrawn."
                                      : item.event.includes("accepted")
                                      ? `Starts on ${item.startDate}.`
                                      : item.event.includes("declined")
                                        ? "This offer is now closed."
                                      : item.event.includes("expired")
                                        ? `This offer expired ${item.expiresLabel}.`
                                        : `This offer expires ${item.expiresLabel}.`}
                                  </span>
                                </div>
                              </div>
                              <Button
                                className={cn(
                                  (item.event.includes("accepted") ||
                                    item.event.includes("declined") ||
                                    item.event.includes("counter") ||
                                    item.event.includes("withdrawn") ||
                                    item.event.includes("expired")) &&
                                    "h-5 w-fit p-0 text-xs font-semibold leading-5 text-primary-500 no-underline hover:no-underline"
                                )}
                                size="sm"
                                variant={
                                  item.event.includes("accepted") ||
                                  item.event.includes("declined") ||
                                  item.event.includes("counter") ||
                                  item.event.includes("withdrawn") ||
                                  item.event.includes("expired")
                                    ? "link"
                                    : undefined
                                }
                                onClick={() => {
                                  if (item.event.includes("accepted")) {
                                    openClientContractPage(item)
                                    return
                                  }
                                  openNotificationOffer(item)
                                  if (
                                    item.event.includes("counter") &&
                                    item.event.includes("withdrawn")
                                  ) {
                                    setNotificationOfferStep("history")
                                  }
                                }}
                              >
                                {item.event.includes("accepted")
                                  ? "View Contract"
                                  : item.event.includes("counter") &&
                                      item.event.includes("withdrawn")
                                    ? "View Offer History"
                                  : item.event.includes("counter") &&
                                      item.event.includes("edited")
                                    ? "View Counter Offer"
                                  : item.event.includes("withdrawn")
                                    ? "View Details"
                                    : item.event.includes("declined") ||
                                        item.event.includes("counter") ||
                                        item.event.includes("expired")
                                      ? "View Details"
                                      : "View Offer"}
                              </Button>
                            </Card>
                              </article>
                              <span className="text-[11px] leading-[15px] text-gray-500">
                                Sent {format(parseISO(item.createdAt), "h:mm a")}
                              </span>
                            </div>
                          </div>
                        ) : null}
                        {item.clientPerspective &&
                        item.event.includes("counter") &&
                        item.event.includes("withdrawn") ? (
                          <div className="mt-4 flex w-full items-end gap-2 self-start">
                            <Avatar className="size-10 shrink-0" size="md" isOnline>
                              <AvatarImage
                                src={item.senderAvatarSrc}
                                alt={item.senderDisplayName}
                              />
                              <AvatarFallback>
                                {item.senderDisplayName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex w-[449px] max-w-[calc(100%-48px)] flex-col items-start gap-2">
                              <article className="group relative flex w-full flex-col items-start gap-2 rounded-xl rounded-bl-none bg-primary-25 p-5">
                                {renderOfferMessageHoverActions(
                                  item.body,
                                  item.clientPerspective
                                    ? currentUser?.id
                                    : item.actorId
                                )}
                                <div className="text-sm leading-[17px] text-dark-blue-400">
                                  <span className="font-bold">
                                    {item.senderDisplayName}
                                  </span>{" "}
                                  {item.senderUsername ? (
                                    <span className="text-xs font-normal leading-[15px]">
                                      @{item.senderUsername.replace(/^@/, "")}{" "}
                                    </span>
                                  ) : null}
                                  <span className="font-semibold">
                                    withdrew the counter offer
                                  </span>
                                </div>
                                <Card className="mt-2 flex w-full flex-col items-start rounded-lg p-4 shadow-none hover:border-gray-200 hover:ring-0">
                                  <h3 className="text-sm font-bold leading-[17px] text-dark-blue-400">
                                    Counter Offer Withdrawn
                                  </h3>
                                  <p className="mt-4 text-xs font-medium leading-[15px] text-dark-blue-400">
                                    {item.offerTitle}
                                  </p>
                                  <div className="mt-2 flex items-center gap-2">
                                    <Badge variant="rounded" visual="gray" size="sm">
                                      {item.offerType}
                                    </Badge>
                                    <span className="text-[10px] leading-4 text-gray-500">
                                      The active offer expires {item.expiresLabel}.
                                    </span>
                                  </div>
                                  <Button
                                    className="mt-3 h-5 w-fit p-0 text-xs font-semibold leading-5 no-underline hover:no-underline"
                                    size="sm"
                                    variant="link"
                                    visual="primary"
                                    onClick={() => {
                                      openNotificationOffer(item)
                                      setNotificationOfferStep("previous")
                                    }}
                                  >
                                    View Active Offer
                                  </Button>
                                </Card>
                              </article>
                              <span className="text-[11px] leading-[15px] text-gray-500">
                                Sent {format(parseISO(item.createdAt), "h:mm a")}
                              </span>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </React.Fragment>
                )
              })}
            {!isSwitching &&
              selectedTab === "Messages" &&
              withdrawnTalentCounterOfferMessage &&
              conversationOfferNotifications.some(
                (item) => item.id === withdrawnTalentCounterOfferMessage.id
              ) && (
                <div className="order-last flex justify-end rounded-lg">
                  <article className="group relative flex w-[349px] max-w-[calc(100%-60px)] flex-col items-start gap-4 rounded-xl rounded-br-none bg-primary-25 p-5">
                    {renderOfferMessageHoverActions("Withdrew the counter offer")}
                    <div className="text-sm leading-[17px] text-dark-blue-400">
                      <span className="font-bold">You</span>{" "}
                      {currentUser.username ? (
                        <span className="text-xs font-normal">
                          @{currentUser.username.replace(/^@/, "")}{" "}
                        </span>
                      ) : null}
                      <span className="font-semibold">
                        withdrew the counter offer
                      </span>
                    </div>

                    <Card className="flex w-full flex-col items-start rounded-lg p-4 shadow-none hover:border-gray-200 hover:ring-0">
                      <h3 className="text-sm font-bold leading-[17px] text-dark-blue-400">
                        Counter Offer Withdrawn
                      </h3>
                      <p className="mt-4 text-xs font-medium leading-[15px] text-dark-blue-400">
                        {withdrawnTalentCounterOfferMessage.offerTitle}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="rounded" visual="gray" size="sm">
                          {withdrawnTalentCounterOfferMessage.offerType}
                        </Badge>
                        <span className="text-[10px] leading-4 text-gray-500">
                          The active offer expires Aug 02, 2025.
                        </span>
                      </div>
                      <Button
                        className="mt-3 h-5 w-fit p-0 text-xs font-semibold leading-5 no-underline hover:no-underline"
                        variant="link"
                        visual="primary"
                        onClick={() => {
                          const activeOffer =
                            offerNotificationMessages.find(
                              (item) =>
                                item.contractId ===
                                  withdrawnTalentCounterOfferMessage.contractId &&
                                !item.event.includes("counter") &&
                                !item.event.includes("withdrawn")
                            ) || {
                              ...withdrawnTalentCounterOfferMessage,
                              event: "contract.offer.received",
                              withdrawnByViewer: false,
                            }
                          openNotificationOffer(activeOffer)
                          setNotificationOfferStep("event")
                        }}
                      >
                        View Active Offer
                      </Button>
                    </Card>
                  </article>
                </div>
              )}
            {!isSwitching &&
              selectedTab === "Messages" &&
              withdrawnClientOfferMessage &&
              conversationOfferNotifications.some(
                (item) => item.id === withdrawnClientOfferMessage.id
              ) && (
                <div className="flex justify-end rounded-lg">
                  <article className="group relative flex h-[218px] w-[361px] max-w-[calc(100%-60px)] flex-col items-start gap-4 rounded-xl rounded-br-none bg-primary-25 px-5 pb-5 pt-2.5">
                    {renderOfferMessageHoverActions("Withdrew the offer")}
                    <div className="flex h-7 items-end text-sm leading-[17px] text-dark-blue-400">
                      <span className="flex items-center gap-[3px]">
                        <span className="flex items-center gap-0.5">
                          <span className="font-bold">You</span>
                          {currentUser.username ? (
                            <span className="text-xs font-normal leading-[15px]">
                              @{currentUser.username.replace(/^@/, "")}
                            </span>
                          ) : null}
                        </span>
                        <span className="font-semibold">withdrew the offer</span>
                      </span>
                    </div>

                    <Card className="flex h-[144px] w-full flex-col items-start gap-4 rounded-xl border-primary-50 px-6 py-4 shadow-none hover:border-primary-50 hover:ring-0">
                      <h3 className="text-sm font-bold leading-[17px] text-dark-blue-400">
                        Offer Withdrawn
                      </h3>
                      <div className="flex flex-col items-start gap-2">
                        <p className="text-xs font-medium leading-[15px] text-dark-blue-400">
                          {withdrawnClientOfferMessage.offerTitle}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="rounded" visual="gray" size="sm">
                            {withdrawnClientOfferMessage.offerType}
                          </Badge>
                          <span className="text-[10px] leading-4 text-gray-500">
                            This offer was withdrawn.
                          </span>
                        </div>
                      </div>
                      <Button
                        className="h-5 w-fit p-0 text-xs font-semibold leading-5 text-primary-500 no-underline hover:no-underline"
                        variant="link"
                        visual="primary"
                        onClick={() =>
                          openNotificationOffer(withdrawnClientOfferMessage)
                        }
                      >
                        View Details
                      </Button>
                    </Card>
                  </article>
                </div>
              )}
            {!isSwitching &&
              selectedTab === "Messages" &&
              acceptedCounterOfferMessage &&
              conversationOfferNotifications.some(
                (item) => item.id === acceptedCounterOfferMessage.id
              ) && (
                <div className="order-last flex w-full justify-end rounded-lg">
                  <article className="group relative flex w-full flex-col items-start gap-3 rounded-xl bg-primary-25 p-5">
                    {renderOfferMessageHoverActions("Accepted the counter offer")}
                    <div className="text-sm leading-[17px] text-dark-blue-400">
                      <span className="font-bold">You</span>{" "}
                      {currentUser.username ? (
                        <span className="text-xs font-normal">
                          @{currentUser.username.replace(/^@/, "")} {" "}
                        </span>
                      ) : null}
                      <span className="font-semibold">
                        accepted the counter offer
                      </span>
                    </div>

                    {acceptedCounterOfferBody ? (
                      <p className="text-sm leading-5 text-dark-blue-400">
                        {acceptedCounterOfferBody}
                      </p>
                    ) : null}

                    <Card className="flex h-[132px] w-full flex-col items-stretch gap-4 rounded-xl border-primary-50 px-6 py-4 shadow-none hover:border-primary-50 hover:ring-0">
                      <div className="flex h-[46px] items-start justify-between gap-6">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <h3 className="truncate text-sm font-semibold leading-6 text-dark-blue-400">
                              {acceptedCounterOfferMessage.offerTitle}
                            </h3>
                            <Badge visual="success" size="sm">
                              Offer Accepted
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="rounded" visual="gray" size="sm">
                              {acceptedCounterOfferMessage.offerType}
                            </Badge>
                            <span className="text-[10px] leading-4 text-gray-500">
                              This offer expires {acceptedCounterOfferMessage.expiresLabel}.
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          onClick={() =>
                            openClientContractPage(acceptedCounterOfferMessage)
                          }
                        >
                          View Offer
                        </Button>
                      </div>

                      <div className="h-px w-full shrink-0 bg-gray-100" />
                      <div className="flex h-[22px] w-full items-center justify-between gap-3 text-xs leading-[15px] text-gray-500">
                        <span className="flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap"><DollarSign className="size-3 shrink-0 text-primary-400" />Offer Rate <strong className="text-base text-dark-blue-400">{acceptedCounterOfferMessage.offerRate}</strong></span>
                        <div className="h-[22px] w-px shrink-0 bg-gray-200" />
                        <span className="flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap"><UserIcon className="size-3 shrink-0 text-primary-400" /><span className="shrink-0">Role</span> <strong className="min-w-0 truncate text-dark-blue-400" title={acceptedCounterOfferMessage.role}>{acceptedCounterOfferMessage.role}</strong></span>
                        <div className="h-[22px] w-px shrink-0 bg-gray-200" />
                        <span className="flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap"><Calendar className="size-3 shrink-0 text-primary-400" />Duration <strong className="text-dark-blue-400">{acceptedCounterOfferMessage.duration}</strong></span>
                        <div className="h-[22px] w-px shrink-0 bg-gray-200" />
                        <span className="flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap"><Clock className="size-3 shrink-0 text-primary-400" />Schedule <strong className="text-dark-blue-400">{acceptedCounterOfferMessage.schedule}</strong></span>
                      </div>
                    </Card>
                  </article>
                </div>
              )}
            {!isSwitching &&
              selectedTab === "Messages" &&
              declinedCounterOfferMessage &&
              conversationOfferNotifications.some(
                (item) => item.id === declinedCounterOfferMessage.id
              ) && (
                <div className="order-last flex justify-end rounded-lg">
                  <article className="group relative flex w-[449px] max-w-[calc(100%-60px)] flex-col items-start gap-4 rounded-xl bg-primary-25 p-5">
                    {renderOfferMessageHoverActions("Declined the counter offer")}
                    <div className="text-sm leading-[17px] text-dark-blue-400">
                      <span className="font-bold">You</span>{" "}
                      {currentUser.username ? (
                        <span className="text-xs font-normal">
                          @{currentUser.username.replace(/^@/, "")} {" "}
                        </span>
                      ) : null}
                      <span className="font-semibold">
                        declined the counter offer
                      </span>
                    </div>

                    <Card className="flex w-full flex-col items-start rounded-lg p-5 shadow-none hover:border-gray-200 hover:ring-0">
                      <h3 className="text-base font-bold leading-5 text-dark-blue-400">
                        Counter Offer Declined
                      </h3>
                      <p className="mt-5 text-sm font-medium leading-[17px] text-dark-blue-400">
                        {declinedCounterOfferMessage.offerTitle}
                      </p>
                      <div className="mt-3 flex items-center gap-3">
                        <Badge variant="rounded" visual="gray" size="sm">
                          {declinedCounterOfferMessage.offerType}
                        </Badge>
                        <span className="text-xs leading-4 text-gray-500">
                          These changes weren’t accepted.
                        </span>
                      </div>
                      <Button
                        className="mt-5 h-5 w-fit p-0 text-xs font-semibold leading-5 text-gray-500 no-underline hover:no-underline"
                        variant="link"
                        visual="gray"
                        onClick={() => {
                          openNotificationOffer(declinedCounterOfferMessage)
                          setNotificationOfferStep("history")
                        }}
                      >
                        View Offer History
                      </Button>
                    </Card>
                  </article>
                </div>
              )}
            {!isSwitching &&
              selectedTab === "Messages" &&
              sentClientOfferMessages
                .filter((sentOffer) =>
                  conversationOfferNotifications.some(
                    (item) => item.id === sentOffer.id
                  )
                )
                .map((sentOffer, index) => (
                  <div
                    key={`${sentOffer.id}-${sentOffer.event}-${index}`}
                    className="flex justify-end rounded-lg"
                  >
                    <article className="group relative flex h-[256px] w-full flex-col items-start gap-4 rounded-xl rounded-br-none bg-primary-25 px-5 pb-5 pt-2.5">
                      {renderOfferMessageHoverActions(sentOffer.body)}
                      <div className="flex h-[70px] w-full flex-col gap-2">
                        <div className="text-sm leading-[17px] text-dark-blue-400">
                          <span className="font-bold">
                            {currentUserProfile?.firstName ||
                              currentUserProfile?.displayName ||
                              "You"}
                          </span>{" "}
                          {currentUser.username ? (
                            <span className="text-xs font-normal">
                              @{currentUser.username.replace(/^@/, "")} {" "}
                            </span>
                          ) : null}
                          <span className="font-semibold">sent an offer</span>
                        </div>
                        <p className="text-sm leading-[17px] text-dark-blue-400">
                          {sentOffer.counterOfferMessage ||
                            `I am resending you my offer for ${sentOffer.offerTitle} as our ${sentOffer.role} if you are still interested.`}
                        </p>
                      </div>

                      <Card className="flex h-[132px] w-full flex-col items-stretch gap-4 rounded-xl border-primary-50 px-6 py-4 shadow-none hover:border-primary-50 hover:ring-0">
                        <div className="flex h-[46px] items-start justify-between gap-6">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold leading-6 text-dark-blue-400">
                              {sentOffer.offerTitle}
                            </h3>
                            <div className="flex items-center gap-2">
                              <Badge variant="rounded" visual="gray" size="sm">
                                {sentOffer.offerType}
                              </Badge>
                              <span className="text-[10px] leading-4 text-gray-500">
                                This offer expires {sentOffer.expiresLabel}.
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="outlined"
                            visual="gray"
                            size="sm"
                            onClick={() => {
                              openNotificationOffer(sentOffer)
                              setNotificationOfferStep("previous")
                            }}
                          >
                            View Offer
                          </Button>
                        </div>

                        <div className="h-px w-full shrink-0 bg-gray-100" />
                        <div className="flex h-[22px] w-full items-center justify-between gap-3 text-xs leading-[15px] text-gray-500">
                          <span className="flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap"><DollarSign className="size-3 shrink-0 text-primary-400" />Offer Rate <strong className="text-base text-dark-blue-400">{sentOffer.offerRate}</strong></span>
                          <div className="h-[22px] w-px shrink-0 bg-gray-200" />
                          <span className="flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap"><UserIcon className="size-3 shrink-0 text-primary-400" /><span className="shrink-0">Role</span> <strong className="min-w-0 truncate text-dark-blue-400" title={sentOffer.role}>{sentOffer.role}</strong></span>
                          <div className="h-[22px] w-px shrink-0 bg-gray-200" />
                          <span className="flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap"><Calendar className="size-3 shrink-0 text-primary-400" />Duration <strong className="text-dark-blue-400">{sentOffer.duration}</strong></span>
                          <div className="h-[22px] w-px shrink-0 bg-gray-200" />
                          <span className="flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap"><Clock className="size-3 shrink-0 text-primary-400" />Schedule <strong className="text-dark-blue-400">{sentOffer.schedule}</strong></span>
                        </div>
                      </Card>
                    </article>
                  </div>
                ))}
            {!isSwitching &&
              selectedTab === "Messages" &&
              acceptedOfferCard &&
              conversationOfferContractIds.has(acceptedOfferCard.contractId) && (
                <div className="order-last flex justify-end rounded-lg">
                  <article className="group relative flex max-w-[calc(100%-60px)] flex-col items-start gap-y-2 rounded-xl bg-primary-500/[.04] p-5 md:max-w-[640px]">
                    {renderOfferMessageHoverActions("Accepted the offer")}
                    <div className="text-sm leading-[16.94px] text-dark-blue-400">
                      <span className="font-bold">Me</span>{" "}
                      {currentUser.username ? (
                        <span>@{currentUser.username} </span>
                      ) : null}
                      <span className="font-semibold">
                        accepted the offer
                      </span>
                    </div>

                    <p className="text-sm leading-[20px] text-dark-blue-400">
                      {acceptedOfferCard.acceptanceMessage ||
                        "Excited to get started!"}
                    </p>

                    <Card className="mt-4 w-full min-w-[320px] flex-col items-stretch justify-start rounded-lg p-5 shadow-none hover:border-gray-200 hover:ring-0">
                      <h3 className="text-base font-bold leading-[19.36px] text-dark-blue-400">
                        {acceptedOfferCard.startDate.startsWith("Starts")
                          ? `Offer Accepted — ${acceptedOfferCard.startDate}`
                          : `Offer Accepted — Starts on ${formatAcceptedHeadlineDate(acceptedOfferCard.startDate)}`}
                      </h3>
                      <p className="mt-5 text-sm font-medium leading-[16.94px] text-dark-blue-400">
                        {acceptedOfferCard.offerTitle}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <Badge variant="rounded" visual="gray" size="sm">
                          {acceptedOfferCard.offerType}
                        </Badge>
                      </div>
                      {acceptedOfferCardRealContractId ? (
                        <Button
                          variant="link"
                          visual="primary"
                          size="sm"
                          className="mt-4 h-5 w-fit p-0 text-xs font-semibold leading-5 no-underline hover:no-underline"
                          onClick={() =>
                            router.push(
                              `/active-project/${encodeURIComponent(
                                acceptedOfferCardRealContractId
                              )}?title=${encodeURIComponent(acceptedOfferCard.offerTitle)}&group=${encodeURIComponent("My Contracts")}&tab=contract&perspective=talent`
                            )
                          }
                        >
                          View Contract
                        </Button>
                      ) : (
                        <span className="mt-4 block text-xs leading-[14.52px] text-gray-500">
                          Contract being prepared...
                        </span>
                      )}
                    </Card>
                  </article>
                </div>
              )}
            {!isSwitching &&
            selectedTab === "Messages" &&
            counterOfferCard &&
            conversationOfferContractIds.has(counterOfferCard.contractId) && (
              <div
                className={cn(
                  "flex justify-end rounded-lg",
                  withdrawnTalentCounterOfferMessage?.contractId !==
                    counterOfferCard.contractId && "order-last"
                )}
              >
                <article className="group relative flex max-w-[calc(100%-60px)] flex-col items-start gap-y-2 rounded-xl bg-primary-500/[.04] p-5 md:max-w-[640px]">
                  {renderOfferMessageHoverActions("Declined the offer")}
                  <div className="text-sm leading-[16.94px] text-dark-blue-400">
                    <span className="font-bold">You</span>{" "}
                    {currentUser.username ? (
                      <span>@{currentUser.username} </span>
                    ) : null}
                    <span className="font-semibold">sent a counter offer</span>
                  </div>

                  {counterOfferCard.message ? (
                    <p className="text-sm leading-[20px] text-dark-blue-400">
                      {counterOfferCard.message}
                    </p>
                  ) : null}

                  <Card className="mt-4 w-full min-w-[320px] flex-col items-stretch justify-start rounded-lg p-5 shadow-none hover:border-gray-200 hover:ring-0">
                    <h3 className="text-base font-bold leading-[19.36px] text-dark-blue-400">
                      Counter Offer Submitted
                    </h3>
                    <p className="mt-5 text-sm font-medium leading-[16.94px] text-dark-blue-400">
                      {counterOfferCard.offerTitle}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <Badge variant="rounded" visual="gray" size="sm">
                        {counterOfferCard.offerType}
                      </Badge>
                      <span className="text-xs leading-[14.52px] text-gray-500">
                        {withdrawnTalentCounterOfferMessage?.contractId ===
                        counterOfferCard.contractId
                          ? "This counter offer was withdrawn."
                          : `This counteroffer expires ${counterOfferCard.expiresLabel}.`}
                      </span>
                    </div>
                    <Button
                      className="mt-4 h-5 w-fit p-0 text-xs font-semibold leading-5 no-underline hover:no-underline"
                      variant="link"
                      visual="primary"
                      onClick={() => {
                        const relatedOffer = offerNotificationMessages.find(
                          (item) =>
                            item.contractId === counterOfferCard.contractId
                        )
                        if (!relatedOffer) return
                        openNotificationOffer(relatedOffer)
                        setNotificationOfferStep(
                          withdrawnTalentCounterOfferMessage?.contractId ===
                            counterOfferCard.contractId
                            ? "history"
                            : "sent-counter"
                        )
                      }}
                    >
                      {withdrawnTalentCounterOfferMessage?.contractId ===
                      counterOfferCard.contractId
                        ? "View Offer History"
                        : "View Details"}
                    </Button>
                  </Card>
                </article>
              </div>
            )}
            {!isSwitching &&
              selectedTab === "Messages" &&
              declinedOfferCard &&
              conversationOfferContractIds.has(declinedOfferCard.contractId) && (
                <div className="flex justify-end rounded-lg">
                  <article className="group relative flex h-[243px] w-[402px] max-w-[calc(100%-60px)] flex-col items-start gap-4 rounded-xl rounded-br-none bg-primary-25 px-5 pb-5 pt-2.5">
                    {renderOfferMessageHoverActions("Sent a counter offer")}
                    <div className="flex h-[53px] w-full flex-col items-start gap-2">
                      <div className="flex items-start text-sm leading-[17px] text-dark-blue-400">
                        <span className="flex items-center gap-2">
                          <span className="flex items-center gap-2">
                            <span className="font-bold">You</span>
                            {currentUser.username ? (
                              <span className="text-xs font-normal leading-[15px]">
                                @{currentUser.username.replace(/^@/, "")}
                              </span>
                            ) : null}
                          </span>
                          <span className="font-semibold">
                            declined the offer
                          </span>
                        </span>
                      </div>
                      <p className="text-sm leading-[17px] text-dark-blue-400">
                        {declinedOfferCard.declineMessage || "No reason given"}
                      </p>
                    </div>

                    <Card className="flex h-[144px] w-full flex-col items-start gap-4 rounded-xl border-primary-50 px-6 py-4 shadow-none hover:border-primary-50 hover:ring-0">
                      <h3 className="text-sm font-semibold leading-[17px] text-dark-blue-400">
                        Offer Declined
                      </h3>
                      <div className="flex flex-col items-start gap-2">
                        <p className="text-xs font-medium leading-[15px] text-dark-blue-400">
                          {declinedOfferCard.offerTitle}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="rounded" visual="gray" size="sm">
                            {declinedOfferCard.offerType}
                          </Badge>
                          <span className="text-[10px] font-medium leading-4 text-gray-500">
                            This offer is now closed.
                          </span>
                        </div>
                      </div>
                      <Button
                        className="h-5 w-fit p-0 text-xs font-semibold leading-5 text-primary-500 no-underline hover:no-underline"
                        variant="link"
                        size="sm"
                        onClick={() => setDeclinedOfferDetailsOpen(true)}
                      >
                        View Details
                      </Button>
                    </Card>
                  </article>
                </div>
              )}
            <div ref={scrollRef} className="order-last" />
          </div>
        </ScrollArea>
      </div>

      {/* Composer */}
      <div
        className="bg-white shrink-0 border-t border-gray-200"
        ref={bottomRef}
      >
        {typingUserIds.length > 0 && (
          <div className="px-4 pt-2 pb-1 flex items-center gap-x-2">
            <span
              className="inline-flex items-center gap-x-0.5"
              aria-hidden="true"
            >
              <span className="size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
              <span className="size-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
              <span className="size-1.5 rounded-full bg-gray-400 animate-bounce" />
            </span>
            <span className="text-xs italic text-gray-500">
              {(() => {
                const displayName =
                  typingUserIds.length === 1 &&
                  receiverUser &&
                  typingUserIds[0] === receiverUser.id
                    ? receiverUser.firstName?.trim() ||
                      receiverUser.username ||
                      "Someone"
                    : typingUserIds.length === 1
                      ? "Someone"
                      : `${typingUserIds.length} people`
                return `${displayName} ${typingUserIds.length === 1 ? "is" : "are"} typing…`
              })()}
            </span>
          </div>
        )}
        {replyingTo && !editingMessage && (
          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary-600">
                Replying to{" "}
                {replyingTo.senderId === currentUser?.id
                  ? "yourself"
                  : receiverUser?.firstName ||
                    receiverUser?.username ||
                    "Unknown"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {replyingTo.content || "Encrypted message"}
              </p>
            </div>
            <IconButton
              visual="gray"
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={() => setReplyingTo(null)}
            >
              <X className="size-4" />
            </IconButton>
          </div>
        )}

        {editingMessage && (
          <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <p className="text-xs font-semibold text-primary-600">
              Editing Message...
            </p>
            <IconButton
              visual="gray"
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={handleCancelEdit}
            >
              <X className="size-4" />
            </IconButton>
          </div>
        )}

        <Dialog
          open={uploadModalMode !== null}
          onOpenChange={(o) => setUploadModalMode(o ? uploadModalMode : null)}
        >
          <DialogContent className="max-w-[467px] p-4">
            <h3 className="text-xs font-semibold text-gray-900">
              {uploadModalMode === "image" ? "Upload Image" : "Upload Files"}
            </h3>
            <DialogClose asChild>
              <IconButton
                visual="gray"
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 rounded-full"
              >
                <X className="size-4" />
              </IconButton>
            </DialogClose>
            <div
              className="mt-4 flex flex-col items-center justify-center gap-y-1 rounded-md border-2 border-dashed border-gray-200 bg-gray-50 py-6 text-center text-xs text-gray-500"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const files = Array.from(e.dataTransfer.files || [])
                if (files.length > 0) {
                  addFiles(files)
                }
              }}
            >
              <UploadCloud className="size-6 text-gray-400" />
              <p>
                Drag and drop or{" "}
                <button
                  type="button"
                  className="font-semibold text-primary-600 hover:underline"
                  onClick={() =>
                    document
                      .getElementById(
                        uploadModalMode === "image"
                          ? "image-file-input"
                          : "desktop-file-input"
                      )
                      ?.click()
                  }
                >
                  Choose a File
                </button>
              </p>
            </div>

            <div className="mt-3 flex flex-col gap-y-2 max-h-[260px] overflow-y-auto">
              {selectedFiles.map((f, i) => {
                const sizeLabel =
                  f.size < 1024
                    ? `${f.size} B`
                    : f.size < 1024 * 1024
                      ? `${(f.size / 1024).toFixed(1)} KB`
                      : `${(f.size / (1024 * 1024)).toFixed(1)} MB`
                return (
                  <div
                    key={`modal-${f.name}-${i}`}
                    className="flex items-center gap-x-3 rounded-md border border-gray-200 bg-white px-3 py-2"
                  >
                    <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-500">
                      <File className="size-4" />
                    </div>
                    <div className="min-w-0 flex-auto">
                      <p className="truncate text-xs font-semibold text-gray-900">
                        {f.name}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {sizeLabel}
                        {isUploading ? " • uploading…" : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 text-xs font-semibold text-gray-500 hover:text-gray-700"
                      onClick={() => removeSelectedFile(i)}
                    >
                      Remove
                    </button>
                  </div>
                )
              })}
              {rejectedFiles.map((r) => {
                const sizeLabel =
                  r.size < 1024
                    ? `${r.size} B`
                    : r.size < 1024 * 1024
                      ? `${(r.size / 1024).toFixed(1)} KB`
                      : `${(r.size / (1024 * 1024)).toFixed(1)} MB`
                return (
                  <div
                    key={`modal-rejected-${r.id}`}
                    className="flex items-center gap-x-3 rounded-md border border-error-300 bg-error-25 px-3 py-2"
                  >
                    <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-error-50 text-error-500">
                      <AlertTriangle className="size-4" />
                    </div>
                    <div className="min-w-0 flex-auto">
                      <p className="truncate text-xs font-semibold text-gray-900">
                        {r.name}
                      </p>
                      <p className="text-[11px] text-error-600">
                        {sizeLabel} • {r.error}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 text-xs font-semibold text-gray-500 hover:text-gray-700"
                      onClick={() => removeRejectedFile(r.id)}
                    >
                      Remove
                    </button>
                  </div>
                )
              })}
              {rejectedFiles.map((r) => {
                const sizeLabel =
                  r.size < 1024
                    ? `${r.size} B`
                    : r.size < 1024 * 1024
                      ? `${(r.size / 1024).toFixed(1)} KB`
                      : `${(r.size / (1024 * 1024)).toFixed(1)} MB`
                return (
                  <div
                    key={`modal-rejected-${r.id}`}
                    className="flex items-center gap-x-3 rounded-md border border-error-300 bg-error-25 px-3 py-2"
                  >
                    <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-error-50 text-error-500">
                      <AlertTriangle className="size-4" />
                    </div>
                    <div className="min-w-0 flex-auto">
                      <p className="truncate text-xs font-semibold text-gray-900">
                        {r.name}
                      </p>
                      <p className="text-[11px] text-error-600">
                        {sizeLabel} • {r.error}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 text-xs font-semibold text-gray-500 hover:text-gray-700"
                      onClick={() => removeRejectedFile(r.id)}
                    >
                      Remove
                    </button>
                  </div>
                )
              })}
            </div>
            <p className="mt-2 text-[11px] text-gray-500">
              {uploadModalMode === "image"
                ? "Supported formats: PNG, JPG, GIF, SVG. Max 50 MB per file."
                : "Supported formats: PDF, DOC, JPG, PNG, MP4. Max 50 MB per file."}
            </p>
            <div className="mt-8 grid grid-cols-2 gap-x-3">
              <Button
                visual="gray"
                variant="outlined"
                onClick={() => setUploadModalMode(null)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                visual="primary"
                variant="filled"
                disabled={
                  !selectedFiles.length || !selectedConversation || isUploading
                }
                onClick={async () => {
                  if (!selectedConversation || !selectedFiles.length) return
                  setIsUploading(true)
                  try {
                    for (const file of selectedFiles) {
                      const abortRecord = { aborted: false }
                      uploadAbortFlagsRef.current.set(file, abortRecord)
                      try {
                        const uploaded = await uploadFile(
                          selectedConversation.id,
                          file,
                          undefined
                        )
                        if (abortRecord.aborted) {
                          const abortedId = uploaded.message.id
                          recentlyAbortedMessageIdsRef.current.add(abortedId)
                          setTimeout(
                            () =>
                              recentlyAbortedMessageIdsRef.current.delete(
                                abortedId
                              ),
                            30_000
                          )
                          apiFetch(`/v1/messages/${abortedId}`, {
                            method: "DELETE",
                            headers: { Authorization: `Bearer ${jwtToken}` },
                          }).catch(() => undefined)
                        } else {
                          await appendUploadedMessage(uploaded)
                        }
                      } finally {
                        uploadAbortFlagsRef.current.delete(file)
                      }
                    }
                    setSelectedFiles([])
                    setRejectedFiles([])
                    setUploadModalMode(null)
                  } catch (err: any) {
                    console.error("Attachment upload failed:", err)
                  } finally {
                    setIsUploading(false)
                  }
                }}
              >
                {isUploading ? <Spinner size={16} strokeWidth={3} /> : "Send"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {cloudFetching && (
          <div className="px-3 pt-2 flex flex-col gap-y-2">
            {Array.from({ length: cloudFetching.count }).map((_, i) => (
              <div
                key={`cloud-pending-${i}`}
                className="flex items-center gap-x-3 rounded-md border border-gray-200 bg-white px-3 py-2"
              >
                <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-500">
                  <Spinner size={16} strokeWidth={3} />
                </div>
                <div className="min-w-0 flex-auto">
                  <p className="truncate text-xs font-semibold text-gray-900">
                    Fetching from {providerLabel(cloudFetching.provider)}…
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {cloudFetching.count > 1
                      ? `File ${i + 1} of ${cloudFetching.count}`
                      : "Downloading file"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {(selectedFiles.length > 0 || rejectedFiles.length > 0) && (
          <div className="px-3 pt-2 flex flex-col gap-y-2">
            {selectedFiles.map((f, i) => {
              const sizeLabel =
                f.size < 1024
                  ? `${f.size} B`
                  : f.size < 1024 * 1024
                    ? `${(f.size / 1024).toFixed(1)} KB`
                    : `${(f.size / (1024 * 1024)).toFixed(1)} MB`
              return (
                <div
                  key={`${f.name}-${i}`}
                  className="flex items-center gap-x-3 rounded-md border border-gray-200 bg-white px-3 py-2"
                >
                  <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-500">
                    <File className="size-4" />
                  </div>
                  <div className="min-w-0 flex-auto">
                    <p className="truncate text-xs font-semibold text-gray-900">
                      {f.name}
                    </p>
                    <p className="text-[11px] text-gray-500">{sizeLabel}</p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-xs font-semibold text-gray-500 hover:text-gray-700"
                    onClick={() => removeSelectedFile(i)}
                  >
                    Remove
                  </button>
                </div>
              )
            })}
            {rejectedFiles.map((r) => {
              const sizeLabel =
                r.size < 1024
                  ? `${r.size} B`
                  : r.size < 1024 * 1024
                    ? `${(r.size / 1024).toFixed(1)} KB`
                    : `${(r.size / (1024 * 1024)).toFixed(1)} MB`
              return (
                <div
                  key={`rejected-${r.id}`}
                  className="flex items-center gap-x-3 rounded-md border border-error-300 bg-error-25 px-3 py-2"
                >
                  <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-error-50 text-error-500">
                    <AlertTriangle className="size-4" />
                  </div>
                  <div className="min-w-0 flex-auto">
                    <p className="truncate text-xs font-semibold text-gray-900">
                      {r.name}
                    </p>
                    <p className="text-[11px] text-error-600">
                      {sizeLabel} • {r.error}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 text-xs font-semibold text-gray-500 hover:text-gray-700"
                    onClick={() => removeRejectedFile(r.id)}
                  >
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <div className="p-3 flex min-h-[68px] items-end gap-x-3">
          {/* Emoji + File + Upload */}
          <div className="flex items-center gap-x-1">
            <EmojiPicker
              onEmojiSelect={handleEmojiSelect}
              onGifSelect={handleGifSelect}
            >
              <IconButton
                visual="gray"
                variant="ghost"
                size="lg"
                className="rounded-full"
              >
                <Smile className="size-[22px]" />
              </IconButton>
            </EmojiPicker>

            <IconButton
              visual="gray"
              variant="ghost"
              size="lg"
              className="rounded-full"
              onClick={() => setUploadModalMode("image")}
            >
              <Image03 className="size-[22px]" />
            </IconButton>
            {/* // Updated attachment dropdown with file input */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton
                  visual="gray"
                  variant="ghost"
                  size="lg"
                  className="rounded-full"
                >
                  <Attachment01 className="size-[22px]" />
                </IconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[212px]">
                <DropdownMenuItem onClick={() => setUploadModalMode("file")}>
                  <UploadCloud className="size-6" /> Upload from Desktop
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCloudPick("dropbox")}>
                  <DropboxBrand className="size-6" /> Upload via Dropbox
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleCloudPick("google-drive")}
                >
                  <GoogleDrive1Brand className="size-6" /> Upload via Google
                  Drive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCloudPick("onedrive")}>
                  <MsOnedriveBrand className="size-6" /> Upload via OneDrive
                </DropdownMenuItem>
                <DropdownMenuArrow className="fill-white" />
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Hidden file inputs */}
            <input
              id="desktop-file-input"
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.svg,.zip,.mp4,.mov"
              multiple
            />
            <input
              id="image-file-input"
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*"
              multiple
            />
          </div>

          {/* Text area + send - Updated */}
          <InputGroup className="flex-auto w-[calc(100%-164px)]">
            <Textarea
              ref={composerRef}
              placeholder={
                counterpartDeleted
                  ? "You can no longer reply"
                  : editingMessage
                    ? "Edit message..."
                    : selectedFiles.length > 0
                      ? "Add a message (optional)..."
                      : "Send message..."
              }
              disabled={counterpartDeleted}
              className={`w-full h-9 min-h-9 max-h-9 resize-none overflow-y-auto py-1.5 leading-5 ${
                editingMessage
                  ? "pr-[120px] ring-1 ring-primary-500 border-primary-500 focus:ring-primary-500 focus:border-primary-500"
                  : "pr-11"
              }`}
              rows={1}
              value={textareaValue}
              onChange={(e) => {
                setTextareaValue(e.target.value)
                lastTypedAtRef.current = Date.now()
                userTypedRef.current = true
                if (e.target.value.length > 0) sendTyping(true)
                else sendTyping(false)
              }}
              onBlur={() => sendTyping(false)}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData("text")
                if (!pasted) return
                const target = e.currentTarget
                const selStart = target.selectionStart ?? textareaValue.length
                const selEnd = target.selectionEnd ?? textareaValue.length
                const projected =
                  textareaValue.slice(0, selStart) +
                  pasted +
                  textareaValue.slice(selEnd)
                if (projected.length <= COMPOSER_MAX_CHARS) return
                e.preventDefault()
                const room =
                  COMPOSER_MAX_CHARS -
                  (textareaValue.length - (selEnd - selStart))
                const truncated = pasted.slice(0, Math.max(0, room))
                const next =
                  textareaValue.slice(0, selStart) +
                  truncated +
                  textareaValue.slice(selEnd)
                setTextareaValue(next)
                userTypedRef.current = true
                lastTypedAtRef.current = Date.now()
                toast({
                  title: `Pasted content was truncated to ${COMPOSER_MAX_CHARS.toLocaleString()} characters`,
                })
              }}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return
                if (editingMessage) {
                  if (e.key === "Escape") {
                    e.preventDefault()
                    handleCancelEdit()
                  } else if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSaveEdit()
                  }
                  return
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
            />
            <InputRightElement
              className={
                editingMessage
                  ? "!w-[120px] justify-end items-end pb-2"
                  : "items-end pb-2"
              }
            >
              {editingMessage ? (
                <div className="flex items-center gap-x-3 pr-3">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-xs font-medium text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <span className="h-3 w-px bg-gray-300" aria-hidden />
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={
                      !keyReady ||
                      !!keyError ||
                      textareaValue.trim() ===
                        (editingMessage.content || "").trim()
                    }
                    className="text-xs font-semibold text-primary-500 hover:text-primary-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      className={`text-gray-500 hover:text-primary-500 disabled:text-gray-400 ${
                        isUploading || isSending ? "animate-pulse" : ""
                      }`}
                      onClick={handleSendMessage}
                      disabled={
                        (!textareaValue.trim() && selectedFiles.length === 0) ||
                        isUploading ||
                        isSending ||
                        !keyReady ||
                        !!keyError ||
                        counterpartDeleted
                      }
                    >
                      {isUploading || isSending ? (
                        <Spinner size={18} strokeWidth={3} />
                      ) : (
                        <Send className="size-[18px]" />
                      )}
                    </TooltipTrigger>
                    <TooltipContent>
                      {isUploading
                        ? "Uploading..."
                        : selectedFiles.length > 0
                          ? "Send files"
                          : textareaValue
                            ? "Send message"
                            : "Type a message or select files"}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </InputRightElement>
          </InputGroup>
        </div>
      </div>

      <ForwardMessageDialog
        open={forwardOpen}
        onOpenChange={setForwardOpen}
        message={forwardTarget}
        currentUserId={currentUser.id}
        currentUserProfile={currentUserProfile}
        receiverUser={receiverUser}
        privateKey={privateKey}
      />

      <BlockReportDialog
        open={showBlockConfirm}
        onOpenChange={setShowBlockConfirm}
        targetUserId={
          selectedConversation && currentUser?.id
            ? (getOtherParticipantId(selectedConversation, currentUser.id) ??
              null)
            : null
        }
        targetDisplayName={
          (selectedConversation as any)?.participantName ||
          (selectedConversation as any)?.participantUsername
        }
        contextThreadId={selectedConversation?.id ?? null}
      />

      {declinedOfferCard ? (
        <Dialog
          open={declinedOfferDetailsOpen}
          onOpenChange={setDeclinedOfferDetailsOpen}
        >
          <DialogContent
            variant="unanimated"
            className="pointer-events-none inset-0 flex max-w-none items-center justify-center bg-transparent p-0 shadow-none"
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) {
                setDeclinedOfferDetailsOpen(false)
              }
            }}
          >
            <div className="pointer-events-auto flex w-[480px] flex-col overflow-hidden rounded-xl bg-white shadow-xl transition-[height,width] duration-1000 ease-out [interpolate-size:allow-keywords]">
              <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-gray-100 px-6 py-3">
                <DialogTitle className="text-[18px] font-semibold leading-7 text-dark-blue-400">
                  You declined this offer
                </DialogTitle>

                <DialogClose asChild>
                  <IconButton variant="ghost" visual="gray" size="md">
                    <X className="size-5" />
                  </IconButton>
                </DialogClose>
              </div>

              <ScrollArea
                className="h-[496px] flex-1"
                scrollBar={<ScrollBar className="w-4 px-1" />}
              >
                <div className="space-y-6 px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <Badge variant="rounded" visual="gray" size="sm">
                          {declinedOfferCard.offerType}
                        </Badge>
                        {declinedDisplayLabel ? (
                          <span className="text-sm leading-5 text-gray-500">
                            Declined on {declinedDisplayLabel}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 text-[18px] font-semibold leading-7 text-dark-blue-400">
                        {declinedOfferCard.offerTitle}
                      </div>

                      <div className="mt-2 flex items-center gap-1.5 text-sm leading-5 text-dark-blue-400">
                        <span>Offer from</span>
                        <Avatar size="xs">
                          <AvatarImage
                            src={declinedOfferCard.senderAvatarSrc}
                            alt={declinedOfferSenderName}
                          />
                          <AvatarFallback>
                            {declinedOfferSenderInitial}
                          </AvatarFallback>
                        </Avatar>
                        <span>{declinedOfferSenderName}</span>{" "}
                        <span className="text-primary-500">
                          {declinedOfferSenderUsername}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="outlined"
                      visual="gray"
                      leftIcon={<MessageSquare className="size-4" />}
                      onClick={() => setDeclinedOfferDetailsOpen(false)}
                    >
                      Message
                    </Button>
                  </div>

                  <div className="space-y-4 border-y border-gray-100 py-6">
                    <div className="grid grid-cols-[170px_1fr] gap-4">
                      <span className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                        Offer Rate
                      </span>
                      <span className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                        {declinedOfferCard.offerRate}
                      </span>
                    </div>

                    <div className="grid grid-cols-[170px_1fr] gap-4">
                      <span className="text-[15px] leading-7 text-gray-500">
                        Role
                      </span>
                      <span className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                        {declinedOfferCard.role}
                      </span>
                    </div>

                    <div className="grid grid-cols-[170px_1fr] gap-4">
                      <span className="text-[15px] leading-7 text-gray-500">
                        Contract Duration
                      </span>
                      <span className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                        {declinedOfferCard.duration}
                      </span>
                    </div>

                    <div className="grid grid-cols-[170px_1fr] gap-4">
                      <span className="text-[15px] leading-7 text-gray-500">
                        Work Schedule
                      </span>
                      <span className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                        {declinedOfferCard.schedule}
                      </span>
                    </div>

                    <div className="grid grid-cols-[170px_1fr] gap-4">
                      <span className="text-[15px] leading-7 text-gray-500">
                        Start Date
                      </span>
                      <span className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                        {declinedOfferCard.startDate}
                      </span>
                    </div>
                  </div>

                  {declinedOfferCard.declineReason ? (
                    <div className="rounded-lg bg-gray-50 p-4">
                      <div className="text-sm font-medium leading-6 text-dark-blue-400">
                        Reason
                      </div>
                      <p className="mt-1 text-sm leading-6 text-dark-blue-400">
                        {declinedOfferCard.declineReason}
                      </p>
                    </div>
                  ) : null}
                </div>
              </ScrollArea>

              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-100 px-6 py-4">
                <div className="flex items-start gap-2 text-sm leading-5 text-gray-400">
                  <Info className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Want to revisit this? Ask the client to see if the role is
                    still open.
                  </span>
                </div>
                <Button
                  variant="outlined"
                  visual="gray"
                  disabled={counterpartDeleted}
                  onClick={handleAskNow}
                >
                  Ask Now
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {selectedNotificationOfferData &&
      showTalentWithdrawnNotificationOffer ? (
        <Dialog
          open={selectedNotificationOffer !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedNotificationOffer(null)
          }}
        >
          <DialogContent
            variant="unanimated"
            className="pointer-events-none inset-0 flex max-w-none items-center justify-center bg-transparent p-0 shadow-none"
          >
            <div className="pointer-events-auto flex h-[500px] w-[480px] flex-col overflow-hidden rounded-xl bg-white shadow-xl">
              <div className="flex h-[60px] items-center justify-between border-b border-gray-200 px-6 py-3">
                <DialogTitle className="text-[18px] font-bold leading-[22px] text-dark-blue-400">
                  This offer was withdrawn
                </DialogTitle>
                <DialogClose asChild>
                  <IconButton variant="ghost" visual="gray" size="md">
                    <X className="size-5" />
                  </IconButton>
                </DialogClose>
              </div>

              <div className="flex flex-1 flex-col gap-4 p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="rounded" visual="gray" size="sm">
                        {selectedNotificationOfferData.offerType}
                      </Badge>
                      <span className="text-sm font-medium leading-[18px] text-gray-400">
                        Withdrawn on {selectedNotificationOfferData.expiresLabel}
                      </span>
                    </div>
                    <div className="truncate text-base font-medium leading-6 text-dark-blue-400">
                      {selectedNotificationOfferData.offerTitle}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-medium leading-[22px] text-dark-blue-400">
                      <span>Offer from</span>
                      <Avatar size="xs" className="size-[18px] border border-gray-200">
                        <AvatarImage
                          src={selectedNotificationOfferData.senderAvatarSrc}
                          alt={selectedNotificationOfferData.senderDisplayName}
                        />
                        <AvatarFallback>
                          {selectedNotificationOfferData.senderDisplayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{selectedNotificationOfferData.senderDisplayName.split(/\s+/)[0]}</span>
                      <span className="text-primary-500">
                        {selectedNotificationOfferData.senderUsername.startsWith("@")
                          ? selectedNotificationOfferData.senderUsername
                          : `@${selectedNotificationOfferData.senderUsername}`}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outlined"
                    visual="gray"
                    size="sm"
                    className="w-[104px] px-2"
                    leftIcon={<MessageSquare className="size-4" />}
                    onClick={() => setSelectedNotificationOffer(null)}
                  >
                    Message
                  </Button>
                </div>

                <div className="grid grid-cols-[162px_1fr] gap-6 border-y border-gray-100 py-5">
                  <div className="space-y-3 text-sm leading-[22px] text-gray-500">
                    <div className="font-semibold text-dark-blue-400">Offer Rate</div>
                    <div>Role</div>
                    <div>Contract Duration</div>
                    <div>Work Schedule</div>
                    <div>Start Date</div>
                  </div>
                  <div className="space-y-3 text-sm font-medium leading-[22px] text-dark-blue-400">
                    <div className="font-semibold">{selectedNotificationOfferData.offerRate}</div>
                    <div>{selectedNotificationOfferData.role}</div>
                    <div>{selectedNotificationOfferData.duration}</div>
                    <div className="flex items-center gap-1">
                      <span>{selectedNotificationOfferData.schedule}</span>
                      {selectedNotificationOfferData.schedule === "Full Time" ? (
                        <span className="text-xs font-normal">over 30 hrs/week</span>
                      ) : selectedNotificationOfferData.schedule === "Part Time" ? (
                        <span className="text-xs font-normal">up to 30 hrs/week</span>
                      ) : null}
                    </div>
                    <div>{selectedNotificationOfferData.startDate}</div>
                  </div>
                </div>

                <div className="h-[84px] rounded-lg bg-gray-50 p-4">
                  <div className="text-sm font-medium leading-6 text-dark-blue-400">Message</div>
                  <div className="text-sm leading-6 text-gray-400">
                    {selectedNotificationOffer.withdrawalMessage || "No message was sent."}
                  </div>
                </div>
              </div>

              <div className="flex h-[60px] items-center justify-between gap-3 border-t border-gray-200 px-6 py-3">
                <div className="flex items-start gap-2 text-xs leading-[18px] text-gray-500">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  <span>Want to revisit this? Ask the client to see if the role is still available.</span>
                </div>
                <Button
                  variant="outlined"
                  visual="gray"
                  size="sm"
                  onClick={() => {
                    setSelectedNotificationOffer(null)
                    setSelectedTab("Messages")
                    setTextareaValue(
                      `Hi ${selectedNotificationOfferData.senderDisplayName.split(/\s+/)[0]}! I wanted to check in and see if the ${selectedNotificationOfferData.role} role for the project ${selectedNotificationOfferData.offerTitle} is still available. If so, I’m still interested.`
                    )
                    lastTypedAtRef.current = Date.now()
                    userTypedRef.current = true
                    sendTyping(true)
                    requestAnimationFrame(() => composerRef.current?.focus())
                  }}
                >
                  Ask Now
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {selectedNotificationOfferData &&
      showTalentExpiredNotificationOffer ? (
        <Dialog
          open={selectedNotificationOffer !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedNotificationOffer(null)
          }}
        >
          <DialogContent
            variant="unanimated"
            className="pointer-events-none inset-0 flex max-w-none items-center justify-center bg-transparent p-0 shadow-none"
          >
            <div className="pointer-events-auto flex h-[500px] w-[480px] flex-col overflow-hidden rounded-xl bg-white shadow-xl">
              <div className="flex h-[60px] items-center justify-between border-b border-gray-200 px-6 py-3">
                <DialogTitle className="text-[18px] font-bold leading-[22px] text-dark-blue-400">
                  This Offer Expired
                </DialogTitle>
                <DialogClose asChild>
                  <IconButton variant="ghost" visual="gray" size="md">
                    <X className="size-5" />
                  </IconButton>
                </DialogClose>
              </div>

              <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="rounded" visual="gray" size="sm">
                        {selectedNotificationOfferData.offerType}
                      </Badge>
                      <span className="text-sm font-medium leading-[18px] text-gray-400">
                        Expired on {selectedNotificationOfferData.expiresLabel}
                      </span>
                    </div>
                    <div className="truncate text-base font-medium leading-6 text-dark-blue-400">
                      {selectedNotificationOfferData.offerTitle}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-medium leading-[22px] text-dark-blue-400">
                      <span>Offer from</span>
                      <Avatar size="xs" className="size-[18px] border border-gray-200">
                        <AvatarImage
                          src={selectedNotificationOfferData.senderAvatarSrc}
                          alt={selectedNotificationOfferData.senderDisplayName}
                        />
                        <AvatarFallback>
                          {selectedNotificationOfferData.senderDisplayName
                            .charAt(0)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>
                        {selectedNotificationOfferData.senderDisplayName.split(
                          /\s+/
                        )[0]}
                      </span>
                      <span className="text-primary-500">
                        {selectedNotificationOfferData.senderUsername.startsWith(
                          "@"
                        )
                          ? selectedNotificationOfferData.senderUsername
                          : `@${selectedNotificationOfferData.senderUsername}`}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outlined"
                    visual="gray"
                    size="sm"
                    className="w-[104px] px-2"
                    leftIcon={<MessageSquare className="size-4" />}
                    onClick={() => setSelectedNotificationOffer(null)}
                  >
                    Message
                  </Button>
                </div>

                <div className="grid grid-cols-[162px_1fr] gap-6 border-y border-gray-100 py-6">
                  <div className="space-y-4 text-sm leading-[22px] text-gray-500">
                    <div className="font-semibold text-dark-blue-400">
                      Offer Rate
                    </div>
                    <div>Role</div>
                    <div>Contract Duration</div>
                    <div>Work Schedule</div>
                    <div>Start Date</div>
                  </div>
                  <div className="space-y-4 text-sm font-medium leading-[22px] text-dark-blue-400">
                    <div className="font-semibold">
                      {selectedNotificationOfferData.offerRate.endsWith("/hr")
                        ? selectedNotificationOfferData.offerRate
                        : `${selectedNotificationOfferData.offerRate}/hr`}
                    </div>
                    <div>{selectedNotificationOfferData.role}</div>
                    <div>{selectedNotificationOfferData.duration}</div>
                    <div className="flex items-center gap-1">
                      <span>
                        {selectedNotificationOfferData.schedule.startsWith(
                          "Full Time"
                        )
                          ? "Full Time"
                          : selectedNotificationOfferData.schedule.startsWith(
                                "Part Time"
                              )
                            ? "Part Time"
                            : "Custom"}
                      </span>
                      {selectedNotificationOfferData.schedule.startsWith(
                        "Full Time"
                      ) ? (
                        <span className="text-xs font-normal">
                          over 30 hrs/week
                        </span>
                      ) : selectedNotificationOfferData.schedule.startsWith(
                          "Part Time"
                        ) ? (
                        <span className="text-xs font-normal">
                          up to 30 hrs/week
                        </span>
                      ) : selectedNotificationOffer?.scheduleDetail ? (
                        <span className="text-xs font-normal">
                          {selectedNotificationOffer.scheduleDetail}
                        </span>
                      ) : null}
                    </div>
                    <div>{selectedNotificationOfferData.startDate}</div>
                  </div>
                </div>
              </div>

              <div className="flex h-[60px] items-center justify-between gap-3 border-t border-gray-200 px-6 py-3">
                <div className="flex items-start gap-2 text-xs leading-[18px] text-gray-500">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    {selectedTalentOfferExpiredOverThirtyDays
                      ? "Want to revisit this? Ask the client to see if the role is still available."
                      : "Want to revisit this? You can ask the client to extend the offer."}
                  </span>
                </div>
                <Button
                  variant="outlined"
                  visual="gray"
                  size="sm"
                  onClick={() => {
                    setSelectedNotificationOffer(null)
                    setSelectedTab("Messages")
                    setTextareaValue(
                      selectedTalentOfferExpiredOverThirtyDays
                        ? `Hi ${selectedNotificationOfferData.senderDisplayName.split(/\s+/)[0]}! I wanted to check in and see if the ${selectedNotificationOfferData.role} role for the project ${selectedNotificationOfferData.offerTitle} is still available. If so, I’m still interested.`
                        : `Hi ${selectedNotificationOfferData.senderDisplayName.split(/\s+/)[0]}! Can you extend the offer for the project ${selectedNotificationOfferData.offerTitle}? I’m still interested.`
                    )
                    lastTypedAtRef.current = Date.now()
                    userTypedRef.current = true
                    sendTyping(true)
                    requestAnimationFrame(() => composerRef.current?.focus())
                  }}
                >
                  {selectedTalentOfferExpiredOverThirtyDays
                    ? "Ask Now"
                    : "Request Extension"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {selectedNotificationOfferData &&
      notificationOfferStep !== "counter" &&
      notificationOfferStep !== "edit" &&
      notificationOfferStep !== "edit-expired" &&
      notificationOfferStep !== "resend-edit" &&
      notificationOfferStep !== "history" &&
      notificationOfferStep !== "withdraw-confirm" &&
      notificationOfferStep !== "resend" &&
      notificationOfferStep !== "resend-summary" &&
      notificationOfferStep !== "sent-counter" &&
      notificationOfferStep !== "expired-counter" &&
      notificationOfferStep !== "resend-counter" &&
      !showClientTerminalNotificationOffer &&
      !showTalentExpiredNotificationOffer &&
      !showTalentWithdrawnNotificationOffer &&
      notificationOfferStep !== "previous" ? (
        <OfferFlowDialog
          open={selectedNotificationOffer !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedNotificationOffer(null)
          }}
          variant={selectedNotificationOfferVariant}
          data={selectedNotificationOfferData}
          clientPerspective={selectedNotificationOffer?.clientPerspective === true}
          acceptanceMessage={notificationAcceptanceMessage}
          termsAccepted={notificationTermsAccepted}
          declineMessage={notificationDeclineMessage}
          selectedDeclineReason={notificationDeclineReason}
          acceptLoading={acceptingOffer || acceptingCounterOffer}
          declineLoading={decliningOffer || decliningCounterOffer}
          declinedByViewer={
            notificationOfferStep === "declined" ||
            (selectedNotificationOffer?.event !== "offer.declined" &&
              selectedNotificationOffer?.event !== "offer.counter_declined")
          }
          liveWithdrawn={notificationOfferStep === "event" && liveOfferWithdrawn}
          liveCounterWithdrawn={
            notificationOfferStep === "event" && liveCounterWithdrawn
          }
          liveExpired={notificationOfferStep === "event" && liveOfferExpired}
          talentAskNowLabel={
            selectedTalentOfferExpiredOverThirtyDays
              ? "Ask Now"
              : "Request Extension"
          }
          onTalentRecoveryAction={() => {
            if (!selectedNotificationOffer || !selectedNotificationOfferData) return
            setSelectedTab("Messages")
            setTextareaValue(
              selectedTalentOfferExpiredOverThirtyDays
                ? `Hi ${selectedNotificationOfferData.senderDisplayName.split(/\s+/)[0]}! I wanted to check in and see if the ${selectedNotificationOfferData.role} role for the project ${selectedNotificationOfferData.offerTitle} is still available. If so, I’m still interested.`
                : `Hi ${selectedNotificationOfferData.senderDisplayName.split(/\s+/)[0]}! Can you extend the offer for the project ${selectedNotificationOfferData.offerTitle}? I’m still interested.`
            )
            lastTypedAtRef.current = Date.now()
            userTypedRef.current = true
            sendTyping(true)
            requestAnimationFrame(() => composerRef.current?.focus())
            setSelectedNotificationOffer(null)
          }}
          onLiveExpiredEditOffer={() => setNotificationOfferStep("edit-expired")}
          onLiveExpiredResendOffer={() => {
            setNotificationResendMessage("")
            setNotificationOfferStep("resend")
          }}
          showUpdatedBanner={showOfferUpdatedBanner}
          showReconnecting={showOfferChannelReconnecting}
          offline={!isNetworkOnline}
          liveTerminalNotice={liveTerminalNotice}
          contractId={selectedNotificationOffer?.realContractId}
          onViewContract={() => {
            if (!selectedNotificationOffer?.realContractId || !selectedNotificationOfferData) {
              return
            }
            const realContractId = selectedNotificationOffer.realContractId
            setSelectedNotificationOffer(null)
            router.push(
              `/active-project/${encodeURIComponent(realContractId)}?title=${encodeURIComponent(selectedNotificationOfferData.offerTitle)}&group=${encodeURIComponent("My Contracts")}&tab=contract`
            )
          }}
          onAcceptanceMessageChange={setNotificationAcceptanceMessage}
          onTermsAcceptedChange={setNotificationTermsAccepted}
          onDeclineMessageChange={setNotificationDeclineMessage}
          onDeclineReasonChange={setNotificationDeclineReason}
          onAccept={async () => {
            // BTB-365: talent accepting the client's original (never
            // countered) offer. Previously local-only — sessionStorage +
            // a URL param, no API call, so the offer stayed PENDING
            // server-side regardless of what this screen showed. Same
            // id-read-at-click-time/double-submit-guard/modal-stays-open
            // shape as the already-fixed decline/withdraw/edit handlers
            // below.
            if (
              notificationOfferStep === "accept" &&
              selectedNotificationOffer &&
              selectedNotificationOfferData &&
              !selectedNotificationOffer.clientPerspective &&
              !selectedNotificationOffer.event.includes("counter")
            ) {
              if (acceptingOffer) return

              const contractId = selectedNotificationOffer.contractId
              const acceptanceMessage =
                notificationAcceptanceMessage.trim() ||
                "Excited to get started!"

              setAcceptingOffer(true)
              try {
                await acceptOffer(contractId, { message: acceptanceMessage })
                onOfferUpdateRequested?.()
                pollForAcceptedContract(onOfferUpdateRequested)

                if (typeof window !== "undefined") {
                  sessionStorage.setItem(
                    `inbox_offer_accepted:${contractId}`,
                    JSON.stringify({
                      status: "accepted",
                      contractId,
                      offerTitle: selectedNotificationOfferData.offerTitle,
                      offerType: selectedNotificationOfferData.offerType,
                      offerRate: selectedNotificationOfferData.offerRate,
                      role: selectedNotificationOfferData.role,
                      duration: selectedNotificationOfferData.duration,
                      schedule: selectedNotificationOfferData.schedule,
                      startDate: selectedNotificationOfferData.startDate,
                      acceptanceMessage,
                    })
                  )

                  const url = new URL(window.location.href)
                  url.searchParams.set("offerStatus", "accepted")
                  url.searchParams.set("contractId", contractId)
                  router.replace(`${url.pathname}${url.search}${url.hash}`)
                }

                setSelectedNotificationOffer(null)
                setNotificationOfferStep("event")
                setNotificationAcceptanceMessage("")
                setNotificationTermsAccepted(false)
              } catch (error) {
                console.error("Offer accept failed", error)
                toast({
                  variant: "destructive",
                  title: "Couldn't accept the offer",
                  description: getAcceptFailureMessage(
                    error,
                    "Please try again."
                  ),
                })
                // Modal stays open on failure, matching decline/withdraw/
                // edit's failure paths.
              } finally {
                setAcceptingOffer(false)
              }
              return
            }
            // BTB-365: client accepting the talent's counter-offer.
            // Previously local-state-only (setAcceptedCounterOfferMessage),
            // never called acceptCounterOffer — the counter stayed PENDING
            // server-side no matter what this screen showed.
            if (
              notificationOfferStep === "accept" &&
              selectedNotificationOffer?.clientPerspective &&
              selectedNotificationOffer.event.includes("counter")
            ) {
              if (acceptingCounterOffer) return

              const counterOfferId =
                selectedNotificationOffer.latestCounterOfferId
              if (!counterOfferId) {
                toast({
                  variant: "destructive",
                  title: "Couldn't accept the counter offer",
                  description: "Please try again.",
                })
                return
              }

              setAcceptingCounterOffer(true)
              try {
                await acceptCounterOffer(
                  selectedNotificationOffer.contractId,
                  counterOfferId
                )
                onOfferUpdateRequested?.()
                pollForAcceptedContract(onOfferUpdateRequested)
                // selectedNotificationOfferData.offerRate/duration/schedule/
                // startDate already reflect THIS counter's own terms
                // (BTB-366's fix in page.tsx), so no separate "use the
                // accept response's terms" step is needed here.
                setAcceptedCounterOfferMessage(selectedNotificationOffer)
                setAcceptedCounterOfferBody(
                  notificationAcceptanceMessage.trim()
                )
                setSelectedNotificationOffer(null)
                setNotificationOfferStep("event")
                setNotificationAcceptanceMessage("")
                setNotificationTermsAccepted(false)
              } catch (error) {
                console.error("Counter offer accept failed", error)
                toast({
                  variant: "destructive",
                  title: "Couldn't accept the counter offer",
                  description: getAcceptFailureMessage(
                    error,
                    "Please try again."
                  ),
                })
              } finally {
                setAcceptingCounterOffer(false)
              }
              return
            }
            // BTB-365: talent accepting the CLIENT's counter-offer — the
            // one scenario that didn't even fake-persist locally before
            // this fix (it fell through to the generic step-flip fallback
            // below, which just flipped the dialog to "accepted" with no
            // action at all). Same acceptCounterOffer() call as the branch
            // above, the other direction.
            if (
              notificationOfferStep === "accept" &&
              selectedNotificationOffer &&
              !selectedNotificationOffer.clientPerspective &&
              selectedNotificationOffer.event.includes("counter")
            ) {
              if (acceptingCounterOffer) return

              const counterOfferId =
                selectedNotificationOffer.latestCounterOfferId
              if (!counterOfferId) {
                toast({
                  variant: "destructive",
                  title: "Couldn't accept the counter offer",
                  description: "Please try again.",
                })
                return
              }

              setAcceptingCounterOffer(true)
              try {
                await acceptCounterOffer(
                  selectedNotificationOffer.contractId,
                  counterOfferId
                )
                onOfferUpdateRequested?.()
                pollForAcceptedContract(onOfferUpdateRequested)
                setSelectedNotificationOffer(null)
                setNotificationOfferStep("event")
                setNotificationAcceptanceMessage("")
                setNotificationTermsAccepted(false)
              } catch (error) {
                console.error("Counter offer accept failed", error)
                toast({
                  variant: "destructive",
                  title: "Couldn't accept the counter offer",
                  description: getAcceptFailureMessage(
                    error,
                    "Please try again."
                  ),
                })
              } finally {
                setAcceptingCounterOffer(false)
              }
              return
            }
            setNotificationOfferStep((step) =>
              step === "accept" ? "accepted" : "accept"
            )
          }}
          onDecline={async () => {
            if (
              notificationOfferStep === "decline" &&
              selectedNotificationOffer &&
              selectedNotificationOfferData &&
              !selectedNotificationOffer.clientPerspective &&
              !selectedNotificationOffer.event.includes("counter")
            ) {
              if (decliningOffer) return

              const contractId = selectedNotificationOffer.contractId
              const trimmedReason = notificationDeclineReason.trim()
              const trimmedMessage = notificationDeclineMessage.trim()
              // QA retest follow-up: this used to send a sentence the
              // talent never typed ("Thanks, unfortunately I can't take
              // this on right now.") whenever they left the free-text box
              // empty, attributing invented words to them. DeclineOfferDto
              // has one free-text `reason` field (required) plus an
              // optional structured `chip` — the chip buttons hand back a
              // human label ("Budget doesn’t work"), never the enum value,
              // so DECLINE_CHIP_BY_REASON does that conversion. `reason` is
              // still never sent empty: typed text wins, else the selected
              // chip's own label is a real reason too, else a neutral
              // "No reason given" — never a fabricated sentence.
              const declineMessage =
                trimmedMessage || trimmedReason || "No reason given"
              const reason = declineMessage
              const chip = trimmedReason
                ? DECLINE_CHIP_BY_REASON[trimmedReason]
                : undefined

              setDecliningOffer(true)
              try {
                await declineOffer(contractId, { reason, chip })
                // BTB-287: fire the refetch explicitly, same reasoning as
                // the withdraw/edit handlers — the backend's Ably publish
                // is not awaited, and the channel tears down as soon as
                // selectedNotificationOffer is nulled below, so waiting on
                // the offer.updated event would reliably lose that race.
                onOfferUpdateRequested?.()

                const declinedAt = new Date().toISOString()

                setLocallyDeclinedTalentOffers((contractIds) =>
                  contractIds.includes(contractId)
                    ? contractIds
                    : [...contractIds, contractId]
                )

                if (typeof window !== "undefined") {
                  sessionStorage.setItem(
                    `inbox_offer_declined:${contractId}`,
                    JSON.stringify({
                      status: "declined",
                      contractId,
                      offerTitle: selectedNotificationOfferData.offerTitle,
                      offerType: selectedNotificationOfferData.offerType,
                      receivedLabel: selectedNotificationOfferData.receivedLabel,
                      declinedAt,
                      declinedLabel: format(parseISO(declinedAt), "MMM d, yyyy"),
                      offerRate: selectedNotificationOfferData.offerRate,
                      role: selectedNotificationOfferData.role,
                      duration: selectedNotificationOfferData.duration,
                      schedule: selectedNotificationOfferData.schedule,
                      startDate: selectedNotificationOfferData.startDate,
                      senderDisplayName:
                        selectedNotificationOfferData.senderDisplayName,
                      senderUsername:
                        selectedNotificationOfferData.senderUsername,
                      senderAvatarSrc:
                        selectedNotificationOfferData.senderAvatarSrc,
                      declineMessage,
                      declineReason: reason,
                    })
                  )

                  const url = new URL(window.location.href)
                  url.searchParams.set("offerStatus", "declined")
                  url.searchParams.set("contractId", contractId)
                  router.replace(`${url.pathname}${url.search}${url.hash}`)
                }

                setSelectedNotificationOffer(null)
                setNotificationOfferStep("event")
                setNotificationDeclineMessage("")
                setNotificationDeclineReason("")
              } catch (error) {
                console.error("Offer decline failed", error)
                toast({
                  variant: "destructive",
                  title: "Couldn't decline the offer",
                  description: "Please try again.",
                })
                // Modal stays open on failure — no state change that would
                // close it or advance the step, matching the withdraw/edit
                // handlers' failure paths.
              } finally {
                setDecliningOffer(false)
              }
              return
            }
            if (
              notificationOfferStep === "decline" &&
              selectedNotificationOffer?.clientPerspective &&
              selectedNotificationOffer.event.includes("counter")
            ) {
              // BTB-287 follow-up: this branch used to just stash the
              // notification into local state and render a fake "Declined"
              // card — it never called the backend at all, so the talent's
              // counter stayed PENDING server-side no matter what the
              // client's screen showed. Same id source, same reason/chip
              // mapping, and the same try/catch/toast shape as the
              // already-fixed base-offer decline branch above.
              if (decliningCounterOffer) return

              const counterOfferId =
                selectedNotificationOffer.latestCounterOfferId
              if (!counterOfferId) {
                toast({
                  variant: "destructive",
                  title: "Couldn't decline the counter offer",
                  description: "Please try again.",
                })
                return
              }

              const trimmedReason = notificationDeclineReason.trim()
              const trimmedMessage = notificationDeclineMessage.trim()
              // Same fix as the base-offer decline branch above: never send
              // a sentence the client didn't type. Typed text wins, else
              // the selected chip's own label, else a neutral fallback.
              const declineMessage =
                trimmedMessage || trimmedReason || "No reason given"
              const chip = trimmedReason
                ? DECLINE_CHIP_BY_REASON[trimmedReason]
                : undefined

              setDecliningCounterOffer(true)
              try {
                await declineCounterOffer(
                  selectedNotificationOffer.contractId,
                  counterOfferId,
                  { reason: declineMessage, chip }
                )
                // Same reasoning as the withdraw/edit/decline handlers
                // above — the backend's Ably publish isn't awaited, and
                // the channel tears down once selectedNotificationOffer is
                // nulled below, so waiting on offer.updated would
                // reliably lose that race.
                onOfferUpdateRequested?.()
                setDeclinedCounterOfferMessage(selectedNotificationOffer)
                setSelectedNotificationOffer(null)
                setNotificationOfferStep("event")
                setNotificationDeclineMessage("")
                setNotificationDeclineReason("")
              } catch (error) {
                console.error("Counter offer decline failed", error)
                toast({
                  variant: "destructive",
                  title: "Couldn't decline the counter offer",
                  description: "Please try again.",
                })
                // Modal stays open on failure, matching the other
                // handlers' failure paths above.
              } finally {
                setDecliningCounterOffer(false)
              }
              return
            }
            setNotificationOfferStep((step) =>
              step === "decline" ? "declined" : "decline"
            )
          }}
          onCounterOffer={() => setNotificationOfferStep("counter")}
          onCancelAccept={() => setNotificationOfferStep("event")}
          onCancelDecline={() => setNotificationOfferStep("event")}
          onPreviousOffer={() => setNotificationOfferStep("previous")}
          onOfferHistory={() => setNotificationOfferStep("history")}
          onBack={() => setNotificationOfferStep("event")}
          onResend={() => setNotificationOfferStep("previous")}
          onEditTerms={() => setNotificationOfferStep("counter")}
          // BTB-291: offerJobHref() always returns a non-empty
          // /job-details/... string even with no real jobListingId, so
          // onViewJob's own `if (!href) return` never catches that case —
          // hide the link instead of letting it navigate to a broken URL.
          hasJobListing={Boolean(selectedNotificationOffer?.jobListingId)}
          onViewJob={() => {
            const href = selectedNotificationOffer?.viewJobHref
            if (!href) return
            router.push(href)
            setSelectedNotificationOffer(null)
          }}
          onMessage={() => {
            const firstName =
              selectedNotificationOfferData.senderDisplayName.split(/\s+/)[0]
            setSelectedNotificationOffer(null)
            setSelectedTab("Messages")
            setTextareaValue(
              `Hi ${firstName}! I wanted to check in and see if the ${selectedNotificationOfferData.role} role for the project ${selectedNotificationOfferData.offerTitle} is still available. If so, I’m still interested.`
            )
            lastTypedAtRef.current = Date.now()
            userTypedRef.current = true
            sendTyping(true)
            requestAnimationFrame(() => composerRef.current?.focus())
          }}
        />
      ) : null}

      {selectedNotificationOfferData &&
      (notificationOfferStep === "sent-counter" ||
        notificationOfferStep === "expired-counter") ? (
        <Dialog
          open={selectedNotificationOffer !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedNotificationOffer(null)
          }}
        >
          <DialogContent
            variant="unanimated"
            className="pointer-events-none inset-0 flex max-w-none items-center justify-center bg-transparent p-0 shadow-none"
          >
            <div
              className={cn(
                "pointer-events-auto flex w-[480px] flex-col overflow-hidden rounded-xl bg-white shadow-xl",
                notificationOfferStep === "expired-counter"
                  ? "h-[603px]"
                  : "h-[665px]"
              )}
            >
              <div className="flex h-[60px] items-center justify-between border-b border-gray-200 px-3">
                <DialogTitle className="pl-3 text-[18px] font-bold leading-[22px] text-dark-blue-400">
                  {notificationOfferStep === "expired-counter"
                    ? "Counter offer from"
                    : "Counter offer sent to"}{" "}
                  <span className="text-primary-500">
                    {selectedNotificationOfferData.senderUsername.startsWith("@")
                      ? selectedNotificationOfferData.senderUsername
                      : `@${selectedNotificationOfferData.senderUsername}`}
                  </span>
                </DialogTitle>
                <DialogClose asChild>
                  <IconButton variant="ghost" visual="gray" size="md">
                    <X className="size-5" />
                  </IconButton>
                </DialogClose>
              </div>

              <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="rounded" visual="gray" size="sm">
                        {selectedNotificationOfferData.offerType}
                      </Badge>
                      <span className="text-sm font-medium text-gray-400">
                        {notificationOfferStep === "expired-counter"
                          ? `Expired on ${selectedNotificationOfferData.expiresLabel}`
                          : `Sent on ${selectedNotificationOfferData.receivedLabel}`}
                      </span>
                    </div>
                    <div className="truncate text-base font-medium leading-6 text-dark-blue-400">
                      {selectedNotificationOfferData.offerTitle}
                    </div>
                    <Button
                      variant="link"
                      visual="primary"
                      className="h-5 gap-2 p-0 text-xs"
                      leftIcon={<Briefcase className="size-[15px]" />}
                      onClick={() => {
                        const href = selectedNotificationOffer?.viewJobHref
                        if (!href) return
                        router.push(href)
                        setSelectedNotificationOffer(null)
                      }}
                    >
                      View Job
                    </Button>
                  </div>
                  <Button
                    variant="outlined"
                    visual="gray"
                    size="sm"
                    className="w-[104px] px-2"
                    leftIcon={<MessageSquare className="size-4" />}
                    onClick={() => setSelectedNotificationOffer(null)}
                  >
                    Message
                  </Button>
                </div>

                <div className="grid grid-cols-[162px_1fr] gap-6 border-y border-gray-100 py-6">
                  <div className="space-y-4 text-sm leading-[22px] text-gray-500">
                    <div className="font-semibold text-dark-blue-400">Rate</div>
                    <div>Role</div>
                    <div>Contract Duration</div>
                    <div>Work Schedule</div>
                    <div>Start Date</div>
                  </div>
                  <div className="space-y-4 text-sm font-medium leading-[22px] text-dark-blue-400">
                    <div className="flex items-center gap-1.5 font-bold">
                      {counterTermChanges.rate ? (
                        <ArrowRight className="size-3.5 shrink-0 text-success-400" />
                      ) : null}
                      <span>
                        {selectedNotificationOfferData.offerRate.endsWith("/hr")
                          ? selectedNotificationOfferData.offerRate
                          : `${selectedNotificationOfferData.offerRate}/hr`}
                      </span>
                      {counterTermChanges.rate ? (
                        <span className="text-xs font-medium text-gray-400">
                        {`(was ${
                          (selectedNotificationOfferData.originalOfferRate || "$45/hr").endsWith(
                            "/hr"
                          )
                            ? selectedNotificationOfferData.originalOfferRate || "$45/hr"
                            : `${selectedNotificationOfferData.originalOfferRate}/hr`
                        })`}
                        </span>
                      ) : null}
                    </div>
                    <div>{selectedNotificationOfferData.role}</div>
                    <div className="flex items-center gap-1.5">
                      {counterTermChanges.duration ? (
                        <ArrowRight className="size-3.5 shrink-0 text-success-400" />
                      ) : null}
                      <span>{selectedNotificationOfferData.duration}</span>
                      {counterTermChanges.duration ? (
                        <span className="text-xs font-medium text-gray-400">
                          (was {selectedNotificationOffer?.originalDuration})
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      {counterTermChanges.schedule ? (
                        <ArrowRight className="size-3.5 shrink-0 text-success-400" />
                      ) : null}
                      <span>
                        {selectedNotificationOfferData.schedule.startsWith(
                          "Full Time"
                        )
                          ? "Full Time"
                          : selectedNotificationOfferData.schedule.startsWith(
                                "Part Time"
                              )
                            ? "Part Time"
                            : "Custom"}
                      </span>
                      {selectedNotificationOfferData.schedule.startsWith(
                        "Full Time"
                      ) ? (
                        <span className="text-xs font-normal leading-[18px]">
                          over 30 hrs/week
                        </span>
                      ) : selectedNotificationOfferData.schedule.startsWith(
                          "Part Time"
                        ) ? (
                        <span className="text-xs font-normal leading-[18px]">
                          up to 30 hrs/week
                        </span>
                      ) : null}
                      {counterTermChanges.schedule ? (
                        <span className="text-xs font-medium text-gray-400">
                          (was {selectedNotificationOffer?.originalSchedule})
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {counterTermChanges.startDate ? (
                        <ArrowRight className="size-3.5 shrink-0 text-success-400" />
                      ) : null}
                      <span>{selectedNotificationOfferData.startDate}</span>
                      {counterTermChanges.startDate ? (
                        <span className="text-xs font-medium text-gray-400">
                          {/* BTB-285: originalStartDate can be a raw ISO
                          string (seeded/notification metadata never
                          reformats it, unlike startDate above) — reuse the
                          same display-time reformatter already in this
                          file rather than rendering it unparsed. */}
                          (was{" "}
                          {formatAcceptedHeadlineDate(
                            selectedNotificationOffer?.originalStartDate ?? ""
                          )}
                          )
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="text-sm font-medium leading-6 text-dark-blue-400">
                    Message
                  </div>
                  <p className="mt-1 text-sm leading-5 text-dark-blue-400">
                    {selectedNotificationOfferData.message ||
                      "I would like to increase the hourly rate if it’s ok."}
                  </p>
                </div>

                {notificationOfferStep !== "expired-counter" ? (
                  <div className="flex items-start gap-1 text-xs font-medium leading-[19px] text-gray-400">
                    <Info className="mt-0.5 size-3.5 shrink-0" />
                    <span>
                      This counteroffer expires {selectedNotificationOfferData.expiresLabel}.
                      You can edit or withdraw it anytime before then.
                    </span>
                  </div>
                ) : null}
              </div>

              <div
                className={cn(
                  "flex h-[60px] items-center gap-3 border-t border-gray-200 p-3",
                  notificationOfferStep === "expired-counter"
                    ? "justify-between"
                    : "justify-end"
                )}
              >
                {notificationOfferStep === "expired-counter" ? (
                  <>
                    <div className="flex flex-1 items-start gap-2 text-xs font-medium leading-[15px] text-gray-500">
                      <Info className="size-3.5 shrink-0" />
                      <span>
                        Want to revisit this? Ask the talent to see if they are
                        still interested in this role.
                      </span>
                    </div>
                    <Button
                      variant="outlined"
                      visual="gray"
                      size="sm"
                      onClick={() => {
                        setSelectedNotificationOffer(null)
                        setSelectedTab("Messages")
                        setTextareaValue(
                          `Hi, I missed your counteroffer for the project ${selectedNotificationOfferData.offerTitle}. If you’re still available, can you resend it?`
                        )
                        lastTypedAtRef.current = Date.now()
                        userTypedRef.current = true
                        sendTyping(true)
                        requestAnimationFrame(() => composerRef.current?.focus())
                      }}
                    >
                      Ask Now
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outlined"
                      visual="gray"
                      size="sm"
                      onClick={() => setNotificationOfferStep("withdraw-confirm")}
                    >
                      Withdraw Counter Offer
                    </Button>
                    <Button
                      variant="outlined"
                      visual="gray"
                      size="sm"
                      onClick={() => setNotificationOfferStep("edit")}
                    >
                      Edit Counter Offer
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {selectedNotificationOfferData &&
      notificationOfferStep === "resend-counter" ? (
        <Dialog
          open={selectedNotificationOffer !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedNotificationOffer(null)
          }}
        >
          <DialogContent
            variant="unanimated"
            className="pointer-events-none inset-0 flex max-w-none items-center justify-center bg-transparent p-0 shadow-none"
          >
            <div className="pointer-events-auto flex h-[575px] w-[480px] flex-col overflow-hidden rounded-xl bg-white shadow-xl">
              <div className="flex h-[60px] items-center justify-between border-b border-gray-200 px-6 py-3">
                <DialogTitle className="text-[18px] font-bold leading-[22px] text-dark-blue-400">
                  Resend counteroffer to{" "}
                  <span className="text-primary-500">
                    {selectedNotificationOfferData.senderUsername.startsWith("@")
                      ? selectedNotificationOfferData.senderUsername
                      : `@${selectedNotificationOfferData.senderUsername}`}
                  </span>
                </DialogTitle>
                <DialogClose asChild>
                  <IconButton variant="ghost" visual="gray" size="md">
                    <X className="size-5" />
                  </IconButton>
                </DialogClose>
              </div>

              <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="rounded" visual="gray" size="sm">
                        {selectedNotificationOfferData.offerType}
                      </Badge>
                      <span className="text-sm font-medium leading-[18px] text-gray-400">
                        Expires on {selectedNotificationOfferData.expiresLabel}
                      </span>
                    </div>
                    <div className="truncate text-base font-medium leading-6 text-dark-blue-400">
                      {selectedNotificationOfferData.offerTitle}
                    </div>
                  </div>
                  <Button
                    variant="outlined"
                    visual="gray"
                    size="sm"
                    leftIcon={<MessageSquare className="size-4" />}
                    onClick={() => setSelectedNotificationOffer(null)}
                  >
                    Message
                  </Button>
                </div>

                <div className="grid grid-cols-[162px_1fr] gap-6 border-y border-gray-100 py-6">
                  <div className="space-y-4 text-sm leading-[22px] text-gray-500">
                    <div className="font-semibold text-dark-blue-400">Rate</div>
                    <div>Role</div>
                    <div>Contract Duration</div>
                    <div>Work Schedule</div>
                    <div>Start Date</div>
                  </div>
                  <div className="space-y-4 text-sm font-medium leading-[22px] text-dark-blue-400">
                    <div className="flex items-center gap-1.5 font-bold">
                      {counterTermChanges.rate ? (
                        <ArrowRight className="size-3.5 shrink-0 text-success-400" />
                      ) : null}
                      <span>{selectedNotificationOfferData.offerRate}</span>
                      {counterTermChanges.rate ? (
                        <span className="text-xs font-medium text-gray-400">
                          (was {selectedNotificationOfferData.originalOfferRate})
                        </span>
                      ) : null}
                    </div>
                    <div>{selectedNotificationOfferData.role}</div>
                    <div className="flex items-center gap-1.5">
                      {counterTermChanges.duration ? (
                        <ArrowRight className="size-3.5 shrink-0 text-success-400" />
                      ) : null}
                      <span>{selectedNotificationOfferData.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {counterTermChanges.schedule ? (
                        <ArrowRight className="size-3.5 shrink-0 text-success-400" />
                      ) : null}
                      <span>{selectedNotificationOfferData.schedule}</span>
                      {selectedNotificationOfferData.schedule === "Full Time" ? (
                        <span className="text-xs font-normal">over 30 hrs/week</span>
                      ) : selectedNotificationOfferData.schedule === "Part Time" ? (
                        <span className="text-xs font-normal">up to 30 hrs/week</span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {counterTermChanges.startDate ? (
                        <ArrowRight className="size-3.5 shrink-0 text-success-400" />
                      ) : null}
                      <span>{selectedNotificationOfferData.startDate}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="text-sm font-medium leading-6 text-dark-blue-400">Message</div>
                  <p className="mt-1 text-sm leading-5 text-dark-blue-400">
                    {selectedNotificationOfferData.message ||
                      "I would like to increase the hourly rate if it’s ok."}
                  </p>
                </div>
              </div>

              <div className="flex h-[60px] items-center justify-end gap-3 border-t border-gray-200 px-6 py-3">
                <Button
                  variant="ghost"
                  visual="primary"
                  size="sm"
                  onClick={() => setSelectedNotificationOffer(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (selectedNotificationOffer) {
                      setDismissedExpiredOfferActions((current) =>
                        current.includes(selectedNotificationOffer.id)
                          ? current
                          : [...current, selectedNotificationOffer.id]
                      )
                    }
                    toast({
                      title: "Counteroffer resent",
                      description: "Your counteroffer was sent to the client.",
                    })
                    setSelectedNotificationOffer(null)
                  }}
                >
                  Resend Counteroffer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {selectedNotificationOfferData && notificationOfferStep === "history" ? (
        <OfferHistoryDialog
          open={selectedNotificationOffer !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedNotificationOffer(null)
          }}
          items={[
            {
              id: "offer",
              actorName: selectedNotificationOfferData.senderDisplayName,
              actorAvatarSrc: selectedNotificationOfferData.senderAvatarSrc,
              title: `${selectedNotificationOfferData.senderDisplayName} sent an offer`,
              timestampLabel: "Last week at 3:14 PM",
              rateLabel: selectedNotificationOfferData.offerRate,
            },
            {
              id: "counter",
              actorName: "You",
              title: "You sent a counteroffer",
              timestampLabel: "Yesterday at 1:36 PM",
              rateLabel: selectedNotificationOfferData.offerRate,
              role: selectedNotificationOfferData.role,
              duration: selectedNotificationOfferData.duration,
              schedule: selectedNotificationOfferData.schedule,
              startDate: selectedNotificationOfferData.startDate,
            },
            {
              id: "declined",
              actorName: selectedNotificationOfferData.senderDisplayName,
              actorAvatarSrc: selectedNotificationOfferData.senderAvatarSrc,
              title: `${selectedNotificationOfferData.senderDisplayName} declined the counter offer`,
              timestampLabel: "Yesterday at 3:30 PM",
              rateLabel: selectedNotificationOfferData.offerRate,
            },
            {
              id: "accepted",
              actorName: "You",
              title: "You accepted the offer",
              timestampLabel: "Today at 5:00 PM",
              rateLabel: selectedNotificationOfferData.offerRate,
            },
          ]}
          onCtaClick={() => {
            if (!selectedNotificationOffer) return
            const contractId = selectedNotificationOffer.contractId
            setSelectedNotificationOffer(null)
            router.push(
              `/active-project/${encodeURIComponent(contractId)}?title=${encodeURIComponent(selectedNotificationOfferData.offerTitle)}&group=${encodeURIComponent("My Contracts")}&tab=contract`
            )
          }}
        />
      ) : null}

      {selectedNotificationOfferData && showClientTerminalNotificationOffer ? (
        <Dialog
          open={selectedNotificationOffer !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedNotificationOffer(null)
          }}
        >
          <DialogContent
            variant="unanimated"
            className="pointer-events-none inset-0 flex max-w-none items-center justify-center bg-transparent p-0 shadow-none"
          >
            <div className={`pointer-events-auto flex w-[480px] flex-col overflow-hidden rounded-xl bg-white shadow-xl ${selectedNotificationOfferIsClientWithdrawn || selectedNotificationOfferIsClientDeclined ? "h-[608px]" : "h-[500px]"}`}>
              <div className="flex h-[60px] items-center border-b border-gray-200 p-3">
                <DialogTitle className="flex-1 pl-3 text-[18px] font-bold leading-[22px] text-dark-blue-400">
                  {selectedNotificationOfferIsClientDeclined
                    ? "Your offer was declined"
                    : selectedNotificationOfferIsClientWithdrawn
                    ? "You withdrew this offer"
                    : selectedNotificationOfferIsClientExpired
                      ? "This Offer Expired"
                      : `Offer Accepted — Starts on ${formatAcceptedHeadlineDate(selectedNotificationOfferData.startDate)}`}
                </DialogTitle>
                <DialogClose asChild>
                  <IconButton variant="ghost" visual="gray" size="md">
                    <X className="size-5" />
                  </IconButton>
                </DialogClose>
              </div>
              <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex h-[84px] items-start gap-6">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="rounded" visual="gray" size="sm">
                        {selectedNotificationOfferData.offerType}
                      </Badge>
                      <span className="text-sm font-medium leading-[18px] text-gray-400">
                        {selectedNotificationOfferIsClientDeclined ? "Declined" : selectedNotificationOfferIsClientWithdrawn ? "Withdrawn" : "Expired"} on {selectedNotificationOfferData.expiresLabel}
                      </span>
                    </div>
                    <div className="text-[16px] font-medium leading-6 text-dark-blue-400">
                      {selectedNotificationOfferData.offerTitle}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-medium leading-[22px] text-dark-blue-400">
                      <span>Sent to</span>
                      <Avatar size="xs">
                        <AvatarImage src={selectedNotificationOfferData.senderAvatarSrc} alt={selectedNotificationOfferData.senderDisplayName} />
                        <AvatarFallback>{selectedNotificationOfferData.senderDisplayName.slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <span>{selectedNotificationOfferData.senderDisplayName}</span>
                      <span className="text-primary-500">{selectedNotificationOfferData.senderUsername}</span>
                    </div>
                  </div>
                  <Button
                    variant="outlined"
                    visual="gray"
                    size="sm"
                    leftIcon={<MessageSquare className="size-[15px]" />}
                    onClick={() => setSelectedNotificationOffer(null)}
                  >
                    Message
                  </Button>
                </div>
                <div className="border-t border-gray-100" />
                <div className="grid h-44 grid-cols-[162px_1fr] gap-6">
                  <div className="space-y-4">
                    <div className="text-[15px] font-semibold leading-6 text-dark-blue-400">Offer Rate</div>
                    <div className="text-sm leading-[22px] text-gray-500">Role</div>
                    <div className="text-sm leading-[22px] text-gray-500">Contract Duration</div>
                    <div className="text-sm leading-[22px] text-gray-500">Work Schedule</div>
                    <div className="text-sm leading-[22px] text-gray-500">Start Date</div>
                  </div>
                  <div className="space-y-4">
                    <div className="text-[16px] font-semibold leading-[18px] text-dark-blue-400">{selectedNotificationOfferData.offerRate}</div>
                    <div className="text-sm font-medium leading-[18px] text-dark-blue-400">{selectedNotificationOfferData.role}</div>
                    <div className="text-sm font-medium leading-[18px] text-dark-blue-400">{selectedNotificationOfferData.duration}</div>
                    <div className="flex items-center gap-1 text-dark-blue-400">
                      <span className="text-sm font-medium leading-[18px]">{selectedNotificationOfferData.schedule}</span>
                      {selectedNotificationOfferData.schedule === "Full Time" ? <span className="text-xs leading-[18px]">over 30 hrs/week</span> : selectedNotificationOfferData.schedule === "Part Time" ? <span className="text-xs leading-[18px]">up to 30 hrs/week</span> : null}
                    </div>
                    <div className="text-sm font-medium leading-[18px] text-dark-blue-400">{selectedNotificationOfferData.startDate}</div>
                  </div>
                </div>
                <div className="border-t border-gray-100" />
                {selectedNotificationOfferIsClientWithdrawn ? (
                  <div className="h-[84px] rounded-lg bg-gray-50 p-4">
                    <div className="text-sm font-medium leading-6 text-dark-blue-400">Message</div>
                    <div className="text-sm leading-6 text-gray-400">
                      {selectedNotificationOffer.withdrawalMessage || "No message was sent."}
                    </div>
                  </div>
                ) : null}
                {selectedNotificationOfferIsClientDeclined ? (
                  <div className="min-h-[84px] rounded-lg bg-gray-50 p-4">
                    <div className="text-sm font-medium leading-6 text-dark-blue-400">Reason</div>
                    <div className="text-sm leading-6 text-dark-blue-400">
                      {selectedNotificationOffer.declineReason || "The project timing does not align."}
                    </div>
                  </div>
                ) : null}
                <div className="flex h-9 items-center gap-6">
                  <div className="flex flex-1 items-start gap-2 text-xs font-medium leading-[15px] text-gray-500">
                    <Info className="size-3.5 shrink-0" />
                    {selectedNotificationOfferIsClientExpired &&
                    reopenedExpiredOfferIds.includes(selectedNotificationOffer.id) ? (
                      <span>This offer was reopened 2 days ago</span>
                    ) : selectedNotificationOfferIsClientWithdrawn || selectedNotificationOfferIsClientExpired || selectedNotificationOfferIsClientDeclined ? (
                      <span>You can resend this offer or edit the terms before sending.</span>
                    ) : (
                      <span>
                        This offer was {selectedNotificationOfferIsClientExpired ? "reopened" : "accepted"}{" "}
                        {formatNotificationTime(selectedNotificationOffer.createdAt)}
                      </span>
                    )}
                  </div>
                  {selectedNotificationOfferIsClientExpired &&
                  reopenedExpiredOfferIds.includes(selectedNotificationOffer.id) ? (
                    <Button
                      variant="outlined"
                      visual="gray"
                      size="sm"
                      onClick={() => {
                        const currentOffer = [...sentClientOfferMessages]
                          .reverse()
                          .find(
                            (offer) =>
                              offer.id === selectedNotificationOffer.id
                          )
                        if (!currentOffer) return
                        openNotificationOffer(currentOffer)
                        setNotificationOfferStep("previous")
                      }}
                    >
                      View Current Offer
                    </Button>
                  ) : selectedNotificationOfferIsClientWithdrawn || selectedNotificationOfferIsClientExpired || selectedNotificationOfferIsClientDeclined ? (
                    <div className="flex items-center gap-3">
                      <Button variant="outlined" visual="gray" size="sm" onClick={() => setNotificationOfferStep("edit-expired")}>Edit Offer</Button>
                      <Button
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        onClick={() => {
                          if (selectedNotificationOfferIsClientDeclined) {
                            openClientResendOfferFlow(selectedNotificationOffer)
                            return
                          }
                          setNotificationResendMessage("")
                          setNotificationOfferStep("resend")
                        }}
                      >
                        Resend Offer
                      </Button>
                    </div>
                  ) : selectedNotificationOffer.realContractId ? (
                    <Button
                      variant="outlined"
                      visual="gray"
                      size="sm"
                      onClick={() => {
                        const realContractId = selectedNotificationOffer.realContractId
                        if (!realContractId) return
                        setSelectedNotificationOffer(null)
                        router.push(
                          `/active-project/${encodeURIComponent(realContractId)}?title=${encodeURIComponent(selectedNotificationOfferData.offerTitle)}&group=${encodeURIComponent("My Contracts")}&tab=contract`
                        )
                      }}
                    >
                      View Contract
                    </Button>
                  ) : (
                    <span className="text-xs font-medium leading-[15px] text-gray-500">
                      Contract being prepared...
                    </span>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {selectedNotificationOfferData &&
      notificationOfferStep === "previous" ? (
        <Dialog
          open={selectedNotificationOffer !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedNotificationOffer(null)
          }}
        >
          <DialogContent
            variant="unanimated"
            className="pointer-events-none inset-0 flex max-w-none items-center justify-center bg-transparent p-0 shadow-none"
          >
            <div className="pointer-events-auto flex h-[537px] w-[480px] flex-col overflow-hidden rounded-xl bg-white shadow-xl">
              <div className="flex h-[60px] items-center border-b border-gray-200 p-3">
                {!selectedNotificationOffer?.clientPerspective ? (
                  <IconButton
                    variant="ghost"
                    visual="gray"
                    size="md"
                    onClick={() => setNotificationOfferStep("sent-counter")}
                  >
                    <ArrowLeft className="size-5" />
                  </IconButton>
                ) : null}
                <div className="flex h-9 flex-1 items-center pl-3">
                  <DialogTitle className="text-[18px] font-bold leading-[22px] text-dark-blue-400">
                    {selectedNotificationOffer?.clientPerspective
                      ? "Offer to"
                      : "Offer from"}{" "}
                    <span className="text-primary-500">
                      {selectedNotificationOfferData.senderUsername}
                    </span>
                  </DialogTitle>
                </div>
                <DialogClose asChild>
                  <IconButton variant="ghost" visual="gray" size="md">
                    <X className="size-5" />
                  </IconButton>
                </DialogClose>
              </div>

              <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex h-[78px] flex-col justify-center gap-2">
                  <div className="flex h-[50px] items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="rounded" visual="gray" size="sm">
                          {selectedNotificationOfferData.offerType}
                        </Badge>
                        <span className="text-sm font-medium leading-[18px] text-gray-400">
                          Sent on {selectedNotificationOfferData.receivedLabel}
                        </span>
                      </div>
                      <div className="text-[16px] font-medium leading-6 text-dark-blue-400">
                        {selectedNotificationOfferData.offerTitle}
                      </div>
                    </div>
                    {selectedNotificationOffer?.clientPerspective ? (
                      <Button
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        className="w-[104px] px-2"
                        leftIcon={<MessageSquare className="size-[15px]" />}
                        onClick={() => setSelectedNotificationOffer(null)}
                      >
                        Message
                      </Button>
                    ) : (
                      <Button
                        variant="link"
                        visual="gray"
                        size="sm"
                        className="h-5 w-fit p-0 text-xs no-underline hover:no-underline"
                        leftIcon={<Repeat className="size-[15px]" />}
                        onClick={() => setNotificationOfferStep("history")}
                      >
                        Offer History
                      </Button>
                    )}
                  </div>
                  <Button
                    variant="link"
                    visual="primary"
                    size="sm"
                    className="self-start"
                    leftIcon={<Briefcase className="size-[15px]" />}
                    onClick={() => {
                      const href = selectedNotificationOffer?.viewJobHref
                      if (!href) return
                      router.push(href)
                      setSelectedNotificationOffer(null)
                    }}
                  >
                    View Job
                  </Button>
                </div>

                <div className="border-t border-gray-100" />

                <div className="grid h-44 grid-cols-[162px_1fr] gap-6">
                  <div className="space-y-4">
                    <div className="text-[15px] font-semibold leading-6 text-dark-blue-500">
                      Offer Rate
                    </div>
                    <div className="text-sm leading-[22px] text-gray-500">Role</div>
                    <div className="text-sm leading-[22px] text-gray-500">Contract Duration</div>
                    <div className="text-sm leading-[22px] text-gray-500">Work Schedule</div>
                    <div className="text-sm leading-[22px] text-gray-500">Start Date</div>
                  </div>
                  <div className="space-y-4">
                    <div className="text-[16px] font-semibold leading-[18px] text-dark-blue-500">
                      {selectedNotificationOfferData.offerRate}
                    </div>
                    <div className="text-sm font-medium leading-[18px] text-dark-blue-500">
                      {selectedNotificationOfferData.role}
                    </div>
                    <div className="text-sm font-medium leading-[18px] text-dark-blue-500">
                      {selectedNotificationOfferData.duration}
                    </div>
                    <div className="flex items-center gap-1 text-dark-blue-500">
                      <span className="text-sm font-medium leading-[18px]">
                        {selectedNotificationOfferData.schedule}
                      </span>
                      {selectedNotificationOfferData.schedule === "Full Time" ? (
                        <span className="text-xs leading-[18px]">over 30 hrs/week</span>
                      ) : selectedNotificationOfferData.schedule === "Part Time" ? (
                        <span className="text-xs leading-[18px]">up to 30 hrs/week</span>
                      ) : null}
                    </div>
                    <div className="text-sm font-medium leading-[18px] text-dark-blue-500">
                      {selectedNotificationOfferData.startDate}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100" />

                <div className="mt-auto flex w-full flex-col gap-3">
                  <span className="text-xs font-medium leading-[19px] text-gray-400">
                    This offer expires {selectedNotificationOfferData.expiresLabel}
                  </span>
                  <div className="flex h-9 justify-end gap-3">
                    {selectedNotificationOffer?.clientPerspective ? (
                      <>
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          onClick={() => {
                            setNotificationWithdrawalMessage("")
                            setNotificationOfferStep("withdraw-confirm")
                          }}
                        >
                          Withdraw Offer
                        </Button>
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          onClick={() => setNotificationOfferStep("edit-expired")}
                        >
                          Edit Offer
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          onClick={() => setNotificationOfferStep("decline")}
                        >
                          Decline Offer
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setNotificationOfferStep("accept")}
                        >
                          Accept Offer
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {selectedNotificationOfferData &&
      notificationOfferStep === "resend-summary" ? (
        <Dialog
          open={selectedNotificationOffer !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedNotificationOffer(null)
          }}
        >
          <DialogContent
            variant="unanimated"
            className="pointer-events-none inset-0 flex max-w-none items-center justify-center bg-transparent p-0 shadow-none"
          >
            <div className="pointer-events-auto flex h-[551px] w-[480px] flex-col overflow-hidden rounded-xl bg-white shadow-xl">
              <div className="flex h-[68px] items-center border-b border-gray-200 px-3 py-3">
                <div className="flex-1 pl-3">
                  <DialogTitle className="text-[18px] font-bold leading-[22px] text-dark-blue-400">
                    Resend your offer
                  </DialogTitle>
                  <p className="text-sm leading-[22px] text-gray-500">
                    Resending creates a new offer.
                  </p>
                </div>
                <DialogClose asChild>
                  <IconButton variant="ghost" visual="gray" size="sm">
                    <X className="size-5" />
                  </IconButton>
                </DialogClose>
              </div>

              <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="rounded" visual="gray" size="sm">
                        {selectedNotificationOfferData.offerType}
                      </Badge>
                      <span className="text-sm font-medium leading-[18px] text-gray-400">
                        Expired on {selectedNotificationOfferData.receivedLabel}
                      </span>
                    </div>
                    <div className="text-[16px] font-medium leading-6 text-dark-blue-400">
                      {selectedNotificationOfferData.offerTitle}
                    </div>
                  </div>
                  <Button
                    variant="outlined"
                    visual="gray"
                    size="sm"
                    leftIcon={<MessageSquare className="size-[15px]" />}
                    onClick={() => setSelectedNotificationOffer(null)}
                  >
                    Message
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <Avatar size="md">
                    <AvatarImage
                      src={selectedNotificationOfferData.senderAvatarSrc}
                      alt={selectedNotificationOfferData.senderDisplayName}
                    />
                    <AvatarFallback>
                      {selectedNotificationOfferData.senderDisplayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-semibold text-dark-blue-400">
                      {selectedNotificationOfferData.role}
                    </div>
                    <div className="text-xs text-gray-500">10 years of experience</div>
                    <div className="text-[10px] text-gray-400">Jersey City, NJ, United States</div>
                  </div>
                </div>

                <div className="h-px bg-gray-100" />
                <div className="grid grid-cols-[162px_1fr] gap-x-6 gap-y-4">
                  <span className="text-sm font-semibold text-dark-blue-400">Offer Rate</span><strong className="text-sm text-dark-blue-400">{selectedNotificationOfferData.offerRate}</strong>
                  <span className="text-sm text-gray-500">Role</span><strong className="text-sm text-dark-blue-400">{selectedNotificationOfferData.role}</strong>
                  <span className="text-sm text-gray-500">Contract Duration</span><strong className="text-sm text-dark-blue-400">{selectedNotificationOfferData.duration}</strong>
                  <span className="text-sm text-gray-500">Work Schedule</span><strong className="text-sm text-dark-blue-400">{selectedNotificationOfferData.schedule}</strong>
                  <span className="text-sm text-gray-500">Start Date</span><strong className="text-sm text-dark-blue-400">{selectedNotificationOfferData.startDate}</strong>
                </div>

                <div className="mt-auto flex h-9 items-center justify-end gap-3 border-t border-gray-100 pt-4">
                  <Button
                    variant="ghost"
                    visual="gray"
                    size="sm"
                    className="mr-auto"
                    onClick={() => setSelectedNotificationOffer(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outlined"
                    visual="gray"
                    size="sm"
                    onClick={() => setNotificationOfferStep("edit-expired")}
                  >
                    Edit Offer
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setNotificationResendMessage("")
                      setNotificationOfferStep("resend")
                    }}
                  >
                    Resend Offer
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {selectedNotificationOfferData && notificationOfferStep === "resend" ? (
        <Dialog
          open={selectedNotificationOffer !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedNotificationOffer(null)
          }}
        >
          <DialogContent
            variant="unanimated"
            className="pointer-events-none inset-0 flex max-w-none items-center justify-center bg-transparent p-0 shadow-none"
          >
            <div className="pointer-events-auto flex h-[500px] w-[480px] flex-col overflow-hidden rounded-xl bg-white shadow-xl">
              <div className="flex h-[52px] items-center border-b border-gray-200 px-6 py-3">
                <DialogTitle className="flex-1 text-base font-semibold leading-7 text-dark-blue-400">
                  Resend this offer?
                </DialogTitle>
                <DialogClose asChild>
                  <IconButton variant="ghost" visual="gray" size="sm">
                    <X className="size-4" />
                  </IconButton>
                </DialogClose>
              </div>

              <div className="flex flex-1 flex-col gap-6 p-6">
                <p className="text-sm font-medium leading-6 text-dark-blue-400">
                  This will resend the offer with the same terms.
                </p>

                <div className="flex flex-col gap-2">
                  <label className="text-sm leading-5 text-gray-500">
                    Message to talent (optional)
                  </label>
                  <Textarea
                    className="h-[167px] resize-none"
                    placeholder="Add a short note..."
                    maxLength={500}
                    value={notificationResendMessage}
                    onChange={(event) =>
                      setNotificationResendMessage(event.target.value)
                    }
                  />
                  <span className="text-right text-[10px] font-medium leading-4 text-gray-400">
                    {notificationResendMessage.length}/500
                  </span>
                </div>

                <div className="mt-auto flex h-9 items-center gap-4">
                  <Button
                    variant="link"
                    visual="gray"
                    size="sm"
                    className="mr-auto"
                    leftIcon={<ArrowLeft className="size-4" />}
                    onClick={() =>
                      setNotificationOfferStep(
                        selectedNotificationOfferIsClientExpired
                          ? "resend-summary"
                          : "event"
                      )
                    }
                  >
                    View Terms
                  </Button>
                  <Button
                    variant="ghost"
                    visual="primary"
                    size="sm"
                    onClick={() =>
                      setNotificationOfferStep(
                        selectedNotificationOfferIsClientExpired
                          ? "resend-summary"
                          : "event"
                      )
                    }
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!selectedNotificationOffer) return
                      setSentClientOfferMessages((messages) => [
                        ...messages,
                        {
                          ...selectedNotificationOffer,
                          event: "offer.resent",
                          counterOfferMessage:
                            notificationResendMessage.trim() || undefined,
                        },
                      ])
                      setReopenedExpiredOfferIds((ids) =>
                        ids.includes(selectedNotificationOffer.id)
                          ? ids
                          : [...ids, selectedNotificationOffer.id]
                      )
                      setSelectedNotificationOffer(null)
                      setNotificationOfferStep("event")
                    }}
                  >
                    Resend Offer
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {selectedNotificationOfferData &&
      notificationOfferStep === "withdraw-confirm" ? (
        <Dialog
          open={selectedNotificationOffer !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedNotificationOffer(null)
          }}
        >
          <DialogContent
            variant="unanimated"
            className="pointer-events-none inset-0 flex max-w-none items-center justify-center bg-transparent p-0 shadow-none"
          >
            <div className="pointer-events-auto flex h-[414px] w-[480px] flex-col overflow-hidden rounded-xl bg-white shadow-xl">
              <div className="flex h-[52px] items-start border-b border-gray-200 px-6 py-3">
                <DialogTitle className="flex-1 text-base font-semibold leading-7 text-dark-blue-400">
                  {selectedNotificationOfferIsTalentCounter
                    ? "Withdraw this counter offer?"
                    : "Withdraw this offer?"}
                </DialogTitle>
                <DialogClose asChild>
                  <IconButton variant="ghost" visual="gray" size="sm">
                    <X className="size-4" />
                  </IconButton>
                </DialogClose>
              </div>

              <div className="flex h-[362px] flex-col gap-6 p-6">
                <p className="text-sm font-medium leading-6 text-dark-blue-400">
                  This will cancel the offer and notify the recipient.
                </p>

                <div className="flex flex-col gap-2">
                  <label className="text-[13px] leading-[15px] text-gray-500">
                    {selectedNotificationOfferIsTalentCounter
                      ? "Message to client (optional)"
                      : "Message to talent (optional)"}
                  </label>
                  <Textarea
                    className="h-[163px] resize-none"
                    placeholder="Add a short note..."
                    maxLength={500}
                    value={notificationWithdrawalMessage}
                    onChange={(event) =>
                      setNotificationWithdrawalMessage(event.target.value)
                    }
                  />
                  <span className="text-right text-[10px] font-medium leading-4 text-gray-400">
                    {notificationWithdrawalMessage.length}/500
                  </span>
                </div>

                <div className="flex h-9 justify-end gap-4">
                  <Button
                    variant="ghost"
                    visual="gray"
                    size="sm"
                    disabled={withdrawingCounterOffer || withdrawingOffer}
                    onClick={() =>
                      setNotificationOfferStep(
                        selectedNotificationOfferIsTalentCounter
                          ? "sent-counter"
                          : "previous"
                      )
                    }
                  >
                    Cancel
                  </Button>
                  <Button
                    visual="error"
                    size="sm"
                    loading={withdrawingCounterOffer || withdrawingOffer}
                    disabled={
                      selectedNotificationOfferIsTalentCounter &&
                      !selectedNotificationOffer?.latestCounterOfferId
                    }
                    onClick={async () => {
                      if (!selectedNotificationOffer) return
                      if (selectedNotificationOfferIsTalentCounter) {
                        const counterOfferId =
                          selectedNotificationOffer.latestCounterOfferId
                        if (!counterOfferId) return
                        const trimmedMessage =
                          notificationWithdrawalMessage.trim()
                        setWithdrawingCounterOffer(true)
                        try {
                          await withdrawCounterOffer(
                            selectedNotificationOffer.contractId,
                            counterOfferId,
                            trimmedMessage
                              ? { message: trimmedMessage }
                              : undefined
                          )
                          // PMCM-376: fire the refetch explicitly — the
                          // backend's Ably publish is not awaited, and the
                          // channel tears down as soon as
                          // selectedNotificationOffer is nulled below, so
                          // waiting on the offer.updated event would
                          // reliably lose that race.
                          onOfferUpdateRequested?.()
                          setWithdrawnClientOfferMessage(null)
                          setWithdrawnTalentCounterOfferMessage({
                            ...selectedNotificationOffer,
                            event: "offer.counter_withdrawn",
                            withdrawnByViewer: true,
                            withdrawalMessage: trimmedMessage,
                          })
                          setSelectedNotificationOffer(null)
                          setNotificationOfferStep("event")
                          setNotificationWithdrawalMessage("")
                        } catch (error) {
                          console.error(
                            "Counter offer withdrawal failed",
                            error
                          )
                          toast({
                            variant: "destructive",
                            title: "Couldn't withdraw the counter offer",
                            description: "Please try again.",
                          })
                        } finally {
                          setWithdrawingCounterOffer(false)
                        }
                        return
                      }
                      const trimmedOfferMessage =
                        notificationWithdrawalMessage.trim()
                      setWithdrawingOffer(true)
                      try {
                        await withdrawOffer(
                          selectedNotificationOffer.contractId,
                          trimmedOfferMessage
                            ? { message: trimmedOfferMessage }
                            : undefined
                        )
                        // PMCM-379: fire the refetch explicitly — the
                        // backend's Ably publish in OffersService.withdraw()
                        // is also not awaited, and the channel tears down as
                        // soon as selectedNotificationOffer is nulled below,
                        // so waiting on the offer.updated event would
                        // reliably lose that race — same reasoning as the
                        // counter-offer branch above.
                        onOfferUpdateRequested?.()
                        setWithdrawnClientOfferMessage({
                          ...selectedNotificationOffer,
                          event: "offer.withdrawn",
                          withdrawnByViewer: true,
                          withdrawalMessage: trimmedOfferMessage,
                        })
                        setSelectedNotificationOffer(null)
                        setNotificationOfferStep("event")
                        setNotificationWithdrawalMessage("")
                      } catch (error) {
                        console.error("Offer withdrawal failed", error)
                        toast({
                          variant: "destructive",
                          title: "Couldn't withdraw the offer",
                          description: "Please try again.",
                        })
                      } finally {
                        setWithdrawingOffer(false)
                      }
                    }}
                  >
                    {selectedNotificationOfferIsTalentCounter
                      ? "Withdraw Counter Offer"
                      : "Withdraw Offer"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      {selectedNotificationOfferData &&
      (notificationOfferStep === "counter" ||
        notificationOfferStep === "edit" ||
        notificationOfferStep === "edit-expired" ||
        notificationOfferStep === "resend-edit") ? (
        <CounterOfferDialog
          open={selectedNotificationOffer !== null}
          onOpenChange={(open) => {
            if (!open) {
              setShowClientPreviousStartDate(false)
              setSelectedNotificationOffer(null)
            }
          }}
          variant="default"
          mode={
            notificationOfferStep === "counter" ||
            (notificationOfferStep === "edit" &&
              selectedNotificationOffer?.event.includes("counter"))
              ? "counter"
              : "edit"
          }
          initialReview={false}
          reviewTitle={
            notificationOfferStep === "edit" &&
            selectedNotificationOffer?.event.includes("counter")
              ? "Review Your Counter Offer"
              : notificationOfferStep === "edit-expired"
              ? "Review your offer"
              : undefined
          }
          editTitle={
            notificationOfferStep === "edit" &&
            selectedNotificationOffer?.event.includes("counter")
              ? "Edit Your Counter Offer"
              : notificationOfferStep === "resend-edit"
              ? `Resend your offer to ${selectedNotificationOfferData.senderUsername.startsWith("@") ? selectedNotificationOfferData.senderUsername : `@${selectedNotificationOfferData.senderUsername}`}`
              : notificationOfferStep === "edit-expired"
                ? `Edit your offer to ${selectedNotificationOfferData.senderUsername.startsWith("@") ? selectedNotificationOfferData.senderUsername : `@${selectedNotificationOfferData.senderUsername}`}`
              : undefined
          }
          editSubtitle={
            notificationOfferStep === "edit" &&
            selectedNotificationOffer?.event.includes("counter")
              ? "Update the terms of your counter offer."
              : notificationOfferStep === "resend-edit"
              ? "Confirm the details before sending."
              : notificationOfferStep === "edit-expired"
              ? "Propose new terms that work for you."
              : undefined
          }
          reviewButtonLabel={
            notificationOfferStep === "edit" &&
            selectedNotificationOffer?.event.includes("counter")
              ? "Review Counteroffer"
              : notificationOfferStep === "edit-expired" ||
            notificationOfferStep === "resend-edit"
              ? "Review Offer"
              : undefined
          }
          data={selectedNotificationOfferData}
          // PMCM-393 AC-42.04 point 4: only the "counter" sub-flow (composing
          // a new counter against a still-live offer) needs this — "edit"/
          // "edit-expired"/"resend-edit" are themselves the recovery/edit
          // flows for an already-terminal offer, so showing the same notice
          // there would contradict the screen the viewer is already on.
          submitDisabled={
            submittingCounterOffer ||
            editingCounterOffer ||
            (notificationOfferStep === "counter" && Boolean(liveTerminalNotice))
          }
          terminalNotice={
            notificationOfferStep === "counter" ? liveTerminalNotice : undefined
          }
          onCancel={() => {
            setShowClientPreviousStartDate(false)
            setNotificationOfferStep(
              notificationOfferStep === "counter"
                ? "previous"
                : notificationOfferStep === "edit"
                ? selectedNotificationOffer?.event.includes("counter")
                  ? "sent-counter"
                  : "previous"
                : "event"
            )
          }}
          onEdit={() => {
            setShowClientPreviousStartDate(false)
            if (notificationOfferStep === "resend-edit") {
              setNotificationOfferStep("edit-expired")
            }
          }}
          onReview={() =>
            setShowClientPreviousStartDate(
              selectedNotificationOffer?.clientPerspective === true &&
                (notificationOfferStep === "edit-expired" ||
                  notificationOfferStep === "resend-edit")
            )
          }
          onSubmit={async (counterOffer) => {
            if (!selectedNotificationOffer) return
            setShowClientPreviousStartDate(false)

            if (
              notificationOfferStep === "edit" &&
              selectedNotificationOffer.event.includes("counter")
            ) {
              // BTB-285: same id source as the withdraw handler above
              // (latestCounterOfferId) — gate exactly as withdraw does
              // rather than sending an undefined id to the PATCH.
              const counterOfferId =
                selectedNotificationOffer.latestCounterOfferId
              if (!counterOfferId) {
                // Withdraw disables its own button when the id is missing;
                // this Submit is shared with the create and edit-offer
                // flows, so say nothing was saved rather than do nothing.
                toast({
                  variant: "destructive",
                  title: "Couldn't save the counter offer",
                  description: "Please try again.",
                })
                return
              }
              if (editingCounterOffer) return

              // BTB-285: same parsing shape as the new-counter submission
              // below (rate/durationMonths/workSchedule/parsedStartDate) —
              // this branch was never sending any of it to the backend.
              const rate = Number(
                counterOffer.offerRate.replace(/[^\d]/g, "")
              )
              const durationMonths =
                counterOffer.duration === "Ongoing"
                  ? 12
                  : Number(counterOffer.duration.match(/\d+/)?.[0] ?? 0) *
                    (counterOffer.duration.toLowerCase().includes("year")
                      ? 12
                      : 1)
              const scheduleHours = Number(
                counterOffer.schedule.match(/\d+/)?.[0] ?? 0
              )
              const workSchedule = counterOffer.schedule.startsWith(
                "Full Time"
              )
                ? { type: "FULL_TIME" as const }
                : counterOffer.schedule.startsWith("Part Time")
                  ? { type: "PART_TIME" as const }
                  : {
                      type: "CUSTOM" as const,
                      hoursPerWeek: Math.min(
                        168,
                        Math.max(1, scheduleHours > 0 ? scheduleHours * 5 : 40)
                      ),
                    }
              const parsedStartDate = new Date(
                counterOffer.startDate.replace(/(\d+)(st|nd|rd|th)/i, "$1")
              )

              if (
                !Number.isFinite(rate) ||
                rate <= 0 ||
                !Number.isFinite(durationMonths) ||
                durationMonths <= 0 ||
                Number.isNaN(parsedStartDate.getTime())
              ) {
                toast({
                  variant: "destructive",
                  title: "Check the counteroffer terms",
                  description:
                    "Rate, duration, schedule, and start date are required.",
                })
                return
              }

              setEditingCounterOffer(true)
              try {
                await editCounterOffer(
                  selectedNotificationOffer.contractId,
                  counterOfferId,
                  {
                    rate,
                    currencyCode: "USD",
                    durationMonths,
                    workSchedule,
                    startDate: `${parsedStartDate.getFullYear()}-${String(
                      parsedStartDate.getMonth() + 1
                    ).padStart(2, "0")}-${String(
                      parsedStartDate.getDate()
                    ).padStart(2, "0")}`,
                    message: counterOffer.message.trim() || undefined,
                  }
                )
                // BTB-285: fire the refetch explicitly, same reasoning as
                // the withdraw handler above — the backend's Ably publish
                // is not awaited, and the channel tears down once this
                // step moves off "edit" below, so waiting on the
                // offer.updated event would reliably lose that race.
                onOfferUpdateRequested?.()
                setSelectedNotificationOffer({
                  ...selectedNotificationOffer,
                  originalOfferRate:
                    selectedNotificationOffer.originalOfferRate ||
                    selectedNotificationOffer.offerRate,
                  originalDuration:
                    selectedNotificationOffer.originalDuration ||
                    selectedNotificationOffer.duration,
                  originalSchedule:
                    selectedNotificationOffer.originalSchedule ||
                    selectedNotificationOffer.schedule,
                  originalStartDate:
                    selectedNotificationOffer.originalStartDate ||
                    selectedNotificationOffer.startDate,
                  offerRate: counterOffer.offerRate,
                  duration: counterOffer.duration,
                  schedule: counterOffer.schedule,
                  startDate: counterOffer.startDate,
                  counterOfferMessage: counterOffer.message || undefined,
                })
                setNotificationOfferStep("sent-counter")
                // BTB-285: only fires after the PATCH resolves — this used
                // to run unconditionally, which is why QA saw success on a
                // save that never happened.
                toast({
                  title: "Counter Offer Updated",
                  description: "Your revised counteroffer is ready.",
                })
              } catch (error) {
                console.error("Counter offer edit failed", error)
                toast({
                  variant: "destructive",
                  title: "Couldn't save the counter offer",
                  description: "Please try again.",
                })
                // Modal stays open on failure — no state change that would
                // close it or advance the step, matching the withdraw
                // handler's failure path above.
              } finally {
                setEditingCounterOffer(false)
              }
              return
            }

            if (
              notificationOfferStep === "edit" ||
              notificationOfferStep === "edit-expired" ||
              notificationOfferStep === "resend-edit"
            ) {
              setSentClientOfferMessages((messages) => [
                ...messages,
                {
                  ...selectedNotificationOffer,
                  event: "offer.edited",
                  offerRate: counterOffer.offerRate,
                  duration: counterOffer.duration,
                  schedule: counterOffer.schedule,
                  startDate: counterOffer.startDate,
                  counterOfferMessage: counterOffer.message || undefined,
                },
              ])
              if (
                (notificationOfferStep === "edit-expired" ||
                  notificationOfferStep === "resend-edit") &&
                selectedNotificationOffer.event.includes("expired")
              ) {
                setReopenedExpiredOfferIds((ids) =>
                  ids.includes(selectedNotificationOffer.id)
                    ? ids
                    : [...ids, selectedNotificationOffer.id]
                )
              }
              setSelectedNotificationOffer(null)
              setNotificationOfferStep("event")
              return
            }

            if (submittingCounterOffer) return

            const rate = Number(counterOffer.offerRate.replace(/[^\d]/g, ""))
            const durationMonths = counterOffer.duration === "Ongoing"
              ? 12
              : Number(counterOffer.duration.match(/\d+/)?.[0] ?? 0) *
                (counterOffer.duration.toLowerCase().includes("year") ? 12 : 1)
            const scheduleHours = Number(
              counterOffer.schedule.match(/\d+/)?.[0] ?? 0
            )
            const workSchedule = counterOffer.schedule.startsWith("Full Time")
              ? { type: "FULL_TIME" as const }
              : counterOffer.schedule.startsWith("Part Time")
                ? { type: "PART_TIME" as const }
                : {
                    type: "CUSTOM" as const,
                    hoursPerWeek: Math.min(
                      168,
                      Math.max(1, scheduleHours > 0 ? scheduleHours * 5 : 40)
                    ),
                  }
            const parsedStartDate = new Date(
              counterOffer.startDate.replace(/(\d+)(st|nd|rd|th)/i, "$1")
            )

            if (
              !Number.isFinite(rate) ||
              rate <= 0 ||
              !Number.isFinite(durationMonths) ||
              durationMonths <= 0 ||
              Number.isNaN(parsedStartDate.getTime())
            ) {
              toast({
                variant: "destructive",
                title: "Check the counteroffer terms",
                description: "Rate, duration, schedule, and start date are required.",
              })
              return
            }

            setSubmittingCounterOffer(true)
            const offerId = selectedNotificationOffer.contractId
            const completeCounterOfferSubmission = (
              counterOfferId?: string
            ) => {
              if (typeof window !== "undefined") {
                sessionStorage.setItem(
                  `${COUNTER_OFFER_STORAGE_PREFIX}:${offerId}`,
                  JSON.stringify({
                    status: "submitted",
                    contractId: offerId,
                    counterOfferId,
                    offerTitle: selectedNotificationOffer.offerTitle,
                    offerType: selectedNotificationOffer.offerType,
                    expiresLabel: selectedNotificationOffer.expiresLabel,
                    ...counterOffer,
                  })
                )
              }

              setSelectedNotificationOffer(null)
              setNotificationOfferStep("event")
              router.replace(
                `/inbox?offerStatus=counter-submitted&contractId=${encodeURIComponent(offerId)}`
              )
            }

            try {
              const result = await createCounterOffer(
                offerId,
                {
                  rate,
                  currencyCode: "USD",
                  durationMonths,
                  workSchedule,
                  startDate: `${parsedStartDate.getFullYear()}-${String(
                    parsedStartDate.getMonth() + 1
                  ).padStart(2, "0")}-${String(
                    parsedStartDate.getDate()
                  ).padStart(2, "0")}`,
                  message: counterOffer.message.trim() || undefined,
                }
              )
              completeCounterOfferSubmission(result.counterOffer.id)
            } catch (error) {
              console.error("Counteroffer submission failed", error)
              completeCounterOfferSubmission()
            } finally {
              setSubmittingCounterOffer(false)
            }
          }}
        />
      ) : null}

      <OneDrivePickerDialog
        open={onedriveDialogOpen}
        onOpenChange={setOnedriveDialogOpen}
        onPicked={(count) => setCloudFetching({ provider: "onedrive", count })}
        onConfirm={(files) => {
          setCloudFetching(null)
          if (files.length > 0) {
            addFiles(files)
          }
        }}
      />
    </div>
  )
}
