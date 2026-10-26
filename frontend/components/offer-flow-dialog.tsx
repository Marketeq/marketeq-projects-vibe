"use client"

import * as React from "react"
import {
  ArrowLeft,
  ArrowUp,
  Briefcase,
  Info,
  MessageSquare,
  Repeat,
  X,
} from "@blend-metrics/icons"
import NextLink from "@/components/next-link"
import { talentProfileUrl } from "@/src/lib/listing-urls"
import type { OfferDialogData } from "@/components/offer-dialog.types"
import {
  Alert,
  AlertContent,
  AlertIcon,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  IconButton,
  Textarea,
} from "@/components/ui"

export type OfferFlowDialogVariant =
  | "offer-details"
  | "counter-offer-details"
  | "offer-details-history"
  | "offer-accepted"
  | "offer-declined"
  | "offer-withdrawn"
  | "offer-expired"
  | "accept-offer-empty"
  | "accept-offer-ready"
  | "decline-offer-empty"
  | "decline-offer-ready"

interface OfferFlowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant: OfferFlowDialogVariant
  data: OfferDialogData
  acceptanceMessage?: string
  termsAccepted?: boolean
  declineMessage?: string
  selectedDeclineReason?: string
  acceptLoading?: boolean
  declineLoading?: boolean
  declinedByViewer?: boolean
  clientPerspective?: boolean
  onAcceptanceMessageChange?: (value: string) => void
  onTermsAcceptedChange?: (value: boolean) => void
  onDeclineMessageChange?: (value: string) => void
  onDeclineReasonChange?: (value: string) => void
  /** BTB-291: hides the View Job link when the offer has no linked job
   * listing — without a real jobListingId onViewJob's own href resolves to
   * a broken /job-details/ URL, not an empty/no-op one, so the caller must
   * say there's nothing to link to rather than this component guessing.
   * Defaults true so every existing caller keeps today's behavior. */
  hasJobListing?: boolean
  onViewJob?: () => void
  onOfferHistory?: () => void
  onPreviousOffer?: () => void
  onMessage?: () => void
  onCounterOffer?: () => void
  onDecline?: () => void
  onAccept?: () => void
  onBack?: () => void
  onCancelAccept?: () => void
  onCancelDecline?: () => void
  onResend?: () => void
  onEditTerms?: () => void
  // PMCM-393 AC-42.02/03/04: live status of the offer/counter this dialog is
  // currently showing, layered on top of `variant` — the dialog's shape
  // stays whatever `variant` already decided, only the action-button row
  // swaps. Distinctly named from onResend/onEditTerms above, which are
  // already wired to different (declined-offer) targets at the call site.
  liveWithdrawn?: boolean
  liveCounterWithdrawn?: boolean
  /** BTB-367: the counter's own live status is DECLINED, not WITHDRAWN —
   * a distinct terminal notice (counter declined, offer restored to
   * PENDING), not a third way to spell "withdrawn." */
  liveCounterDeclined?: boolean
  liveExpired?: boolean
  /** Talent's single recovery button label — stays one button with a
   * switching label, matching the existing hand-rolled expired dialog. */
  talentAskNowLabel?: "Ask Now" | "Request Extension"
  onTalentRecoveryAction?: () => void
  onLiveExpiredEditOffer?: () => void
  onLiveExpiredResendOffer?: () => void
  /** AC-42.05: expiry changed on a still-open offer. */
  showUpdatedBanner?: boolean
  /** AC-42.07: connection dropped after connecting at least once. */
  showReconnecting?: boolean
  /** AC-42.08: disables Accept/Decline/Counter; read-only content unaffected. */
  offline?: boolean
  /** AC-42.04 point 4: offer went terminal while viewer is mid Accept/Decline
   * (isAcceptState/isDeclineState below) — disables the submit action and
   * shows this text instead of pulling them out of the sub-flow. */
  liveTerminalNotice?: string
  /** PMCM-392 AC-40.03/40.06: the real contracts-service contract id, once
   * one exists — a different thing from any offer id. Undefined/null means
   * no contract yet (AC-40.07: an indefinite, honest wait, not a stub). */
  contractId?: string | null
  /** PMCM-392 AC-40.05: caller navigates (existing /active-project/[id]
   * route, unmodified) — this component never does its own routing. */
  onViewContract?: () => void
}

const OFFLINE_NOTICE = "You're offline. Some actions may not be available."

// PMCM-392 AC-40.02: "Monday, Jan 30, 2025" — the weekday variant, matching
// offer-service's own OfferResponse.startDateDisplay spec and the identical
// toLocaleDateString call already in hire-me-button.tsx. This reformats at
// display time only — data.startDate itself (already "Jan 30, 2025", no
// weekday) is untouched everywhere else it renders in this file.
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

const DECLINE_REASONS = [
  "Budget doesn’t work",
  "Start date doesn’t work",
  "Requirements are unclear",
  "Not a fit for my skills",
  "Too busy right now",
  "Need different terms",
]

const INLINE_LINK_CLASS =
  "inline text-primary-500 underline-offset-2 hover:underline"

export function OfferFlowDialog({
  open,
  onOpenChange,
  variant,
  data,
  acceptanceMessage,
  termsAccepted,
  declineMessage,
  selectedDeclineReason,
  acceptLoading = false,
  declineLoading = false,
  declinedByViewer = true,
  clientPerspective = false,
  onAcceptanceMessageChange,
  onTermsAcceptedChange,
  onDeclineMessageChange,
  onDeclineReasonChange,
  hasJobListing = true,
  onViewJob,
  onOfferHistory,
  onPreviousOffer,
  onMessage,
  onCounterOffer,
  onDecline,
  onAccept,
  onBack,
  onCancelAccept,
  onCancelDecline,
  onResend,
  onEditTerms,
  liveWithdrawn = false,
  liveCounterWithdrawn = false,
  liveCounterDeclined = false,
  liveExpired = false,
  talentAskNowLabel = "Ask Now",
  onTalentRecoveryAction,
  onLiveExpiredEditOffer,
  onLiveExpiredResendOffer,
  showUpdatedBanner = false,
  showReconnecting = false,
  offline = false,
  liveTerminalNotice,
  contractId,
  onViewContract,
}: OfferFlowDialogProps) {
  const isAcceptState =
    variant === "accept-offer-empty" || variant === "accept-offer-ready"
  const isDeclineState =
    variant === "decline-offer-empty" || variant === "decline-offer-ready"
  const isHistoryState = variant === "offer-details-history"
  const isPendingDetailsState = variant === "offer-details"
  const isCounterDetailsState = variant === "counter-offer-details"
  const isDeclinedTerminalState = variant === "offer-declined"
  const isWithdrawnTerminalState = variant === "offer-withdrawn"
  const isAcceptedTerminalState = variant === "offer-accepted"
  const isDetailedTerminalState =
    isDeclinedTerminalState || isWithdrawnTerminalState
  const terminalState =
    variant === "offer-accepted"
      ? {
          title: data.startDate
            ? `Offer Accepted — Starts on ${formatAcceptedHeadlineDate(data.startDate)}`
            : "Offer Accepted",
          notice: data.statusDateLabel
            ? `This offer was accepted ${data.statusDateLabel}.`
            : "This offer was accepted.",
        }
      : variant === "offer-declined"
        ? {
            title: declinedByViewer
              ? "You Declined This Offer"
              : "This Offer was Declined",
            notice: data.statusDateLabel
              ? declinedByViewer
                ? `You declined this offer ${data.statusDateLabel}.`
                : `This offer was declined ${data.statusDateLabel}.`
              : declinedByViewer
                ? "You declined this offer."
                : "This offer was declined.",
          }
        : variant === "offer-withdrawn"
          ? {
              title: "This Offer Was Withdrawn",
              notice: data.statusDateLabel
                ? `This offer was withdrawn ${data.statusDateLabel}.`
                : "This offer was withdrawn.",
            }
          : variant === "offer-expired"
            ? {
                title: "This Offer Expired",
                notice: data.statusDateLabel
                  ? `This offer expired ${data.statusDateLabel}.`
                  : "This offer has expired.",
              }
            : null
  const resolvedAcceptanceMessage =
    acceptanceMessage ??
    (variant === "accept-offer-ready" ? "Excited to get started!" : "")
  const resolvedTermsAccepted =
    termsAccepted ?? variant === "accept-offer-ready"
  const resolvedDeclineMessage =
    declineMessage ??
    (variant === "decline-offer-ready" ? "Too busy right now" : "")
  const resolvedDeclineReason =
    selectedDeclineReason ??
    (variant === "decline-offer-ready" ? "Too busy right now" : "")
  const canDecline =
    resolvedDeclineMessage.trim().length > 0 ||
    resolvedDeclineReason.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        variant="unanimated"
        className="pointer-events-none inset-0 flex max-w-none items-center justify-center bg-transparent p-0 shadow-none"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            onOpenChange(false)
          }
        }}
      >
        <div
          className={
            isDeclinedTerminalState
              ? "pointer-events-auto flex h-[608px] w-[480px] flex-col overflow-hidden rounded-xl bg-white shadow-xl"
              : isWithdrawnTerminalState
                ? "pointer-events-auto flex h-[500px] w-[480px] flex-col overflow-hidden rounded-xl bg-white shadow-xl"
              : isCounterDetailsState
                ? "pointer-events-auto flex h-[665px] w-[480px] flex-col overflow-hidden rounded-xl bg-white shadow-xl"
                : isPendingDetailsState
                ? "pointer-events-auto flex h-[537px] w-[480px] flex-col overflow-hidden rounded-xl bg-white shadow-xl"
                : "pointer-events-auto w-[520px] overflow-hidden rounded-[20px] bg-white shadow-xl transition-[height,width] duration-1000 ease-out [interpolate-size:allow-keywords]"
          }
        >
          {isAcceptState ? (
            <>
              <div className="flex h-[60px] items-center justify-between border-b border-gray-100 px-6 py-3">
                <DialogTitle className="text-[18px] font-semibold leading-7 text-dark-blue-400">
                  Accept This Offer
                </DialogTitle>

                <DialogClose asChild>
                  <IconButton variant="ghost" visual="gray" size="md">
                    <X className="size-5" />
                  </IconButton>
                </DialogClose>
              </div>

              <div className="space-y-8 px-6 py-6">
                <div className="space-y-3">
                  <div className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                    Message to client (optional)
                  </div>

                  <div className="space-y-2">
                    <Textarea
                      value={resolvedAcceptanceMessage}
                      onChange={(event) =>
                        onAcceptanceMessageChange?.(
                          event.target.value.slice(0, 500)
                        )
                      }
                      placeholder="Add a short note..."
                      rows={7}
                    />
                    <div className="text-right text-sm leading-5 text-gray-400">
                      {resolvedAcceptanceMessage.length}/500
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                    Agree to terms
                  </div>

                  <label
                    htmlFor="accept-offer-terms"
                    className="flex cursor-pointer items-start gap-3"
                  >
                    <Checkbox
                      id="accept-offer-terms"
                      size="lg"
                      checked={resolvedTermsAccepted}
                      onCheckedChange={(checked) =>
                        onTermsAcceptedChange?.(checked === true)
                      }
                    />
                    <span className="pt-0.5 text-[15px] leading-8 text-gray-700">
                      I agree to Marketeq&apos;s{" "}
                      <NextLink
                        href="/terms"
                        className={INLINE_LINK_CLASS}
                        onClick={(event) => event.stopPropagation()}
                      >
                        Terms of Service
                      </NextLink>
                      ,{" "}
                      <NextLink
                        href="/privacy"
                        className={INLINE_LINK_CLASS}
                        onClick={(event) => event.stopPropagation()}
                      >
                        Privacy Policy
                      </NextLink>
                      ,{" "}
                      <NextLink
                        href="/terms?section=dispute-policy"
                        className={INLINE_LINK_CLASS}
                        onClick={(event) => event.stopPropagation()}
                      >
                        Dispute Policy
                      </NextLink>
                      , and{" "}
                      <NextLink
                        href="/community-guidelines"
                        className={INLINE_LINK_CLASS}
                        onClick={(event) => event.stopPropagation()}
                      >
                        Work Protection Guidelines
                      </NextLink>
                      .
                    </span>
                  </label>

                  <div className="flex items-center gap-2 text-sm leading-6 text-gray-400">
                    <Info className="size-4 shrink-0" />
                    <span>
                      Once you accept, this offer becomes an active contract.
                    </span>
                  </div>
                </div>

                {liveTerminalNotice ? (
                  <Alert className="min-h-[auto] p-4">
                    <AlertIcon className="shrink-0">
                      <Info className="size-5" />
                    </AlertIcon>
                    <AlertContent className="text-sm font-semibold leading-5 text-gray-600">
                      {liveTerminalNotice}
                    </AlertContent>
                  </Alert>
                ) : null}

                <div className="flex items-center justify-end gap-3">
                  <Button
                    variant="ghost"
                    visual="gray"
                    onClick={onCancelAccept}
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={
                      !resolvedTermsAccepted ||
                      acceptLoading ||
                      Boolean(liveTerminalNotice)
                    }
                    onClick={onAccept}
                  >
                    {acceptLoading ? "Accepting..." : "Accept Offer"}
                  </Button>
                </div>
              </div>
            </>
          ) : isDeclineState ? (
            <>
              <div className="flex h-[60px] items-center justify-between border-b border-gray-100 px-6 py-3">
                <DialogTitle className="text-[18px] font-semibold leading-7 text-dark-blue-400">
                  Decline This Offer
                </DialogTitle>

                <DialogClose asChild>
                  <IconButton variant="ghost" visual="gray" size="md">
                    <X className="size-5" />
                  </IconButton>
                </DialogClose>
              </div>

              <div className="space-y-8 px-6 py-6">
                <div className="space-y-3">
                  <p className="text-[15px] leading-7 text-dark-blue-400">
                    Help us understand why you’re declining. If you’re still
                    interested but need different terms, you can make a counter
                    offer.
                  </p>

                  <div className="space-y-2">
                    <Textarea
                      value={resolvedDeclineMessage}
                      onChange={(event) =>
                        onDeclineMessageChange?.(
                          event.target.value.slice(0, 500)
                        )
                      }
                      rows={7}
                    />
                    <div className="text-right text-sm leading-5 text-gray-400">
                      {resolvedDeclineMessage.length}/500
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {DECLINE_REASONS.map((reason) => {
                    const selected = resolvedDeclineReason === reason
                    return (
                      <Button
                        key={reason}
                        variant={selected ? "light" : "outlined"}
                        visual={selected ? "primary" : "gray"}
                        size="sm"
                        className="justify-start"
                        onClick={() => onDeclineReasonChange?.(reason)}
                      >
                        {reason}
                      </Button>
                    )
                  })}
                </div>

                {liveTerminalNotice ? (
                  <Alert className="min-h-[auto] p-4">
                    <AlertIcon className="shrink-0">
                      <Info className="size-5" />
                    </AlertIcon>
                    <AlertContent className="text-sm font-semibold leading-5 text-gray-600">
                      {liveTerminalNotice}
                    </AlertContent>
                  </Alert>
                ) : null}

                <div className="flex items-center justify-between gap-3">
                  <Button
                    variant="ghost"
                    visual="gray"
                    onClick={onCancelDecline}
                  >
                    Cancel
                  </Button>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outlined"
                      visual="gray"
                      onClick={onCounterOffer}
                    >
                      Counter Offer
                    </Button>
                    <Button
                      visual="primary"
                      disabled={
                        !canDecline ||
                        declineLoading ||
                        Boolean(liveTerminalNotice)
                      }
                      onClick={onDecline}
                    >
                      {declineLoading ? "Declining..." : "Decline Offer"}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : isDetailedTerminalState ? (
            <>
              <div className="flex h-[60px] items-center justify-between border-b border-gray-200 p-3">
                <DialogTitle
                  className={`text-[18px] font-bold leading-[22px] capitalize text-dark-blue-400 ${isWithdrawnTerminalState ? "pl-3" : ""}`}
                >
                  {isWithdrawnTerminalState
                    ? "This Offer Was Withdrawn"
                    : declinedByViewer
                      ? "You Declined This Offer"
                      : "This Offer was Declined"}
                </DialogTitle>

                <DialogClose asChild>
                  <IconButton variant="ghost" visual="gray" size="md">
                    <X className="size-5" />
                  </IconButton>
                </DialogClose>
              </div>

              <div className="flex flex-1 flex-col gap-6 overflow-hidden px-6 py-6">
                <div className="flex items-start gap-6">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="rounded" visual="gray" size="sm">
                        {data.offerType}
                      </Badge>
                      <span className="text-sm font-medium leading-[18px] text-gray-400">
                        {isWithdrawnTerminalState
                          ? `Expired on ${data.statusDateLabel || data.receivedLabel}`
                          : `Received on ${data.receivedLabel}`}
                      </span>
                    </div>

                    <div className="text-[16px] font-medium leading-6 text-dark-blue-400">
                      {data.offerTitle}
                    </div>

                    <div className="flex items-center gap-1.5 text-sm font-medium leading-[22px] text-dark-blue-400">
                      <span className="shrink-0 whitespace-nowrap">
                        {isWithdrawnTerminalState
                          ? "Sent to"
                          : declinedByViewer
                            ? "Offer from"
                            : "Sent to"}
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-0.5">
                        <Avatar
                          size="xs"
                          className="h-[18px] w-[18px] border border-gray-200"
                        >
                          <AvatarImage
                            src={data.senderAvatarSrc}
                            alt={data.senderDisplayName}
                          />
                          <AvatarFallback>
                            {data.senderDisplayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-dark-blue-400">
                          {data.senderDisplayName.split(/\s+/)[0]}
                          {/* BTB-369: only the client sees the talent's real
                          username here — link to their profile. The talent
                          side shows the client's handle, which has no public
                          profile page, so it stays plain text. */}
                          {clientPerspective && data.senderUsername ? (
                            <NextLink
                              href={talentProfileUrl(data.senderUsername)}
                              className={INLINE_LINK_CLASS}
                            >
                              {data.senderUsername}
                            </NextLink>
                          ) : (
                            <span className="text-primary-500">
                              {data.senderUsername ||
                                `@${data.senderDisplayName.replace(/\s+/g, "")}`}
                            </span>
                          )}
                        </span>
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outlined"
                    visual="gray"
                    size="sm"
                    className="w-[104px] px-2"
                    leftIcon={<MessageSquare className="h-4 w-4 shrink-0" />}
                    onClick={onMessage}
                  >
                    Message
                  </Button>
                </div>

                <div className="grid grid-cols-[162px_1fr] gap-6 border-y border-gray-100 py-6">
                  <div className="space-y-4">
                    <div className="text-[15px] font-semibold leading-6 text-dark-blue-400">
                      Offer Rate
                    </div>
                    <div className="text-sm leading-[22px] text-gray-500">
                      Role
                    </div>
                    <div className="text-sm leading-[22px] text-gray-500">
                      Contract Duration
                    </div>
                    <div className="text-sm leading-[22px] text-gray-500">
                      Work Schedule
                    </div>
                    <div className="text-sm leading-[22px] text-gray-500">
                      Start Date
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-[16px] font-semibold leading-[18px] text-dark-blue-400">
                      {data.offerRate}
                    </div>
                    <div className="text-sm font-medium leading-[22px] text-dark-blue-400">
                      {data.role}
                    </div>
                    <div className="text-sm font-medium leading-[22px] text-dark-blue-400">
                      {data.duration}
                    </div>
                    <div className="flex items-center gap-1 text-dark-blue-400">
                      <span className="text-sm font-medium leading-[18px]">
                        {data.schedule.startsWith("Full Time")
                          ? "Full Time"
                          : data.schedule.startsWith("Part Time")
                            ? "Part Time"
                            : data.schedule}
                      </span>
                      {data.schedule.startsWith("Full Time") ? (
                        <span className="text-xs font-normal leading-[18px]">
                          over 30 hrs/week
                        </span>
                      ) : data.schedule.startsWith("Part Time") ? (
                        <span className="text-xs font-normal leading-[18px]">
                          up to 30 hrs/week
                        </span>
                      ) : null}
                    </div>
                    <div className="text-sm font-medium leading-[22px] text-dark-blue-400">
                      {data.startDate}
                    </div>
                  </div>
                </div>

                {isWithdrawnTerminalState ? null : (
                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="text-sm font-medium leading-6 text-dark-blue-400">
                      Reason
                    </div>
                    <div className="text-sm leading-6 text-dark-blue-400">
                      {data.statusReason || "No reason was provided."}
                    </div>
                  </div>
                )}
              </div>

              <div
                className={
                  isWithdrawnTerminalState
                    ? "mx-6 flex h-[60px] items-center border-t border-gray-100"
                    : "flex h-[60px] items-center border-t border-gray-200 p-3"
                }
              >
                <div
                  className={
                    isWithdrawnTerminalState
                      ? "flex w-full items-center gap-6"
                      : "relative -top-2 flex w-full items-center gap-6"
                  }
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2 text-xs font-medium leading-[15px] text-gray-500">
                    <Info className="size-3.5 shrink-0" />
                    <span>
                      {isWithdrawnTerminalState
                        ? "You can resend this offer or edit the terms before sending."
                        : declinedByViewer
                          ? "Want to revisit this? Ask the client to see if the role is still open."
                          : "You can resend this offer or edit the terms before sending."}
                    </span>
                  </div>
                  {!isWithdrawnTerminalState && declinedByViewer ? (
                    <Button
                      variant="outlined"
                      visual="gray"
                      size="sm"
                      className="w-20"
                      onClick={onMessage}
                    >
                      Ask Now
                    </Button>
                  ) : (
                    <div className="flex items-center gap-3">
                      {isWithdrawnTerminalState ? (
                        <>
                          <Button
                            variant="outlined"
                            visual="gray"
                            size="sm"
                            className="w-[84px]"
                            onClick={onEditTerms}
                          >
                            Edit Offer
                          </Button>
                          <Button
                            variant="outlined"
                            visual="gray"
                            size="sm"
                            className="w-[105px]"
                            onClick={onResend}
                          >
                            Resend Offer
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outlined"
                            visual="gray"
                            size="sm"
                            className="w-[84px]"
                            onClick={onResend}
                          >
                            Resend
                          </Button>
                          <Button
                            variant="outlined"
                            visual="gray"
                            size="sm"
                            className="w-[105px]"
                            onClick={onEditTerms}
                          >
                            Edit Terms
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : isCounterDetailsState ? (
            <>
              <div className="flex h-[60px] items-center justify-between border-b border-gray-200 p-3">
                <div className="flex items-center gap-2 pl-3">
                  <DialogTitle className="text-[18px] font-bold leading-[22px] text-dark-blue-400">
                    Counter offer from{" "}
                    {/* BTB-369: client view names the talent (real profile,
                    link it); talent view names the client (no public
                    profile, stays plain text). */}
                    {clientPerspective && data.senderUsername ? (
                      <NextLink
                        href={talentProfileUrl(data.senderUsername)}
                        className={INLINE_LINK_CLASS}
                      >
                        {data.senderUsername}
                      </NextLink>
                    ) : (
                      <span className="text-primary-500">
                        {data.senderUsername || `@${data.senderDisplayName.replace(/\s+/g, "")}`}
                      </span>
                    )}
                  </DialogTitle>
                  {showReconnecting ? (
                    <span className="text-xs font-medium text-gray-400">
                      Reconnecting...
                    </span>
                  ) : null}
                </div>

                <DialogClose asChild>
                  <IconButton variant="ghost" visual="gray" size="md">
                    <X className="size-5" />
                  </IconButton>
                </DialogClose>
              </div>

              <div className="flex h-[545px] flex-col gap-6 p-6">
                {offline ? (
                  <Alert className="min-h-[auto] p-4">
                    <AlertIcon className="shrink-0">
                      <Info className="size-5" />
                    </AlertIcon>
                    <AlertContent className="text-sm font-semibold leading-5 text-gray-600">
                      {OFFLINE_NOTICE}
                    </AlertContent>
                  </Alert>
                ) : null}
                <div className="flex h-[82px] items-start gap-6">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="rounded" visual="gray" size="sm">
                        {data.offerType}
                      </Badge>
                      <span className="text-sm font-medium leading-[18px] text-gray-400">
                        Received on {data.receivedLabel}
                      </span>
                    </div>
                    <div className="truncate text-[16px] font-medium leading-6 text-dark-blue-400">
                      {data.offerTitle}
                    </div>
                    {hasJobListing ? (
                      <Button
                        variant="link"
                        visual="primary"
                        className="h-5 gap-2 text-xs"
                        leftIcon={<Briefcase className="size-[15px]" />}
                        onClick={onViewJob}
                      >
                        View Job
                      </Button>
                    ) : null}
                  </div>

                  {/* BTB-368: a pending counter (client view) needs Message
                  AND Offer History together — this used to be an
                  either/or toggle, which is why some entry points showed
                  one and not the other. The talent side keeps just Offer
                  History (unchanged, out of this ticket's scope). */}
                  {clientPerspective ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        className="w-[104px] px-2"
                        leftIcon={<MessageSquare className="size-[15px]" />}
                        onClick={onMessage}
                      >
                        Message
                      </Button>
                      <Button
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        className="w-[104px] px-2"
                        leftIcon={<Repeat className="size-[15px]" />}
                        onClick={onOfferHistory}
                      >
                        Offer History
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outlined"
                      visual="gray"
                      size="sm"
                      className="w-[104px] px-2"
                      leftIcon={<Repeat className="size-[15px]" />}
                      onClick={onOfferHistory}
                    >
                      Offer History
                    </Button>
                  )}
                </div>

                <div className="border-t border-gray-100" />

                <div className="grid h-44 grid-cols-[162px_1fr] gap-6">
                  <div className="space-y-4">
                    <div className="text-[15px] font-semibold leading-6 text-dark-blue-400">Rate</div>
                    <div className="text-sm leading-[22px] text-gray-500">Role</div>
                    <div className="text-sm leading-[22px] text-gray-500">Contract Duration</div>
                    <div className="text-sm leading-[22px] text-gray-500">Work Schedule</div>
                    <div className="text-sm leading-[22px] text-gray-500">Start Date</div>
                  </div>

                  <div className="space-y-4">
                    <div className="relative flex items-center gap-1.5 leading-[18px]">
                      <ArrowUp className="absolute -left-5 size-3.5 text-success-400" />
                      <span className="text-sm font-bold text-dark-blue-400">{data.offerRate}</span>
                      {/* BTB-366: equality-gated, not truthiness-only —
                      page.tsx now always sets originalOfferRate (the real
                      original offer's rate, never notification metadata),
                      so a bare `?` would show "(was $X)" next to an
                      unchanged $X on every offer, not just a genuine
                      counter-proposed change. Matches
                      chats-comp.tsx's own counterTermChanges gate. */}
                      {data.originalOfferRate &&
                      data.originalOfferRate !== data.offerRate ? (
                        <span className="text-xs font-medium text-gray-400">(was {data.originalOfferRate})</span>
                      ) : null}
                    </div>
                    <div className="text-sm font-medium leading-[18px] text-dark-blue-500">{data.role}</div>
                    <div className="text-sm font-medium leading-[18px] text-dark-blue-500">{data.duration}</div>
                    <div className="flex items-center gap-1 text-dark-blue-500">
                      <span className="text-sm font-medium leading-[18px]">
                        {data.schedule.startsWith("Full Time") ? "Full Time" : data.schedule.startsWith("Part Time") ? "Part Time" : data.schedule}
                      </span>
                      {data.schedule.startsWith("Full Time") ? (
                        <span className="text-xs leading-[18px]">over 30 hrs/week</span>
                      ) : data.schedule.startsWith("Part Time") ? (
                        <span className="text-xs leading-[18px]">up to 30 hrs/week</span>
                      ) : null}
                    </div>
                    <div className="text-sm font-medium leading-[18px] text-dark-blue-500">{data.startDate}</div>
                  </div>
                </div>

                <div className="border-t border-gray-100" />

                <div className="h-[81px] rounded-lg bg-gray-50 p-4">
                  <div className="text-sm font-medium leading-6 text-dark-blue-400">Message</div>
                  <div className="truncate text-sm leading-4 text-dark-blue-400">
                    {data.message || "No message was provided."}
                  </div>
                </div>

                <div className="flex h-[38px] items-start gap-1 text-xs font-medium leading-[19px] text-gray-400">
                  <Info className="mt-[3px] size-3.5 shrink-0" />
                  <span>
                    This counteroffer expires {data.expiresLabel}. If you decline, your original offer stays active unless it expires.
                  </span>
                </div>
              </div>

              {liveCounterWithdrawn ? (
                <div className="flex h-[60px] items-center border-t border-gray-200 p-3">
                  <span className="pl-3 text-sm font-medium text-gray-500">
                    This counter offer has been withdrawn.
                  </span>
                </div>
              ) : liveCounterDeclined ? (
                <div className="flex h-[60px] items-center border-t border-gray-200 p-3">
                  <span className="pl-3 text-sm font-medium text-gray-500">
                    This counter offer has been declined.
                  </span>
                </div>
              ) : liveExpired ? (
                <div className="flex h-[60px] items-center gap-3 border-t border-gray-200 p-3">
                  {clientPerspective ? (
                    <div className="flex flex-1 items-center gap-3 pl-3">
                      <Button
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        onClick={onLiveExpiredEditOffer}
                      >
                        Edit Offer
                      </Button>
                      <Button
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        onClick={onLiveExpiredResendOffer}
                      >
                        Resend Offer
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-1 justify-end">
                      <Button
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        onClick={onTalentRecoveryAction}
                      >
                        {talentAskNowLabel}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-[60px] items-center gap-3 border-t border-gray-200 p-3">
                  <Button
                    variant="outlined"
                    visual="gray"
                    size="sm"
                    onClick={clientPerspective ? onCounterOffer : onPreviousOffer}
                  >
                    {clientPerspective ? "Counter Offer" : "Previous Offer"}
                  </Button>
                  <div className="flex flex-1 justify-end gap-3">
                    <Button
                      variant="ghost"
                      visual="gray"
                      size="sm"
                      disabled={declineLoading || offline}
                      onClick={onDecline}
                    >
                      {declineLoading ? "Declining..." : "Decline"}
                    </Button>
                    <Button size="sm" disabled={acceptLoading || offline} onClick={onAccept}>
                      {acceptLoading ? "Accepting..." : "Accept Offer"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : isPendingDetailsState ? (
            <>
              <div className="flex h-[60px] items-center justify-between border-b border-gray-200 p-3">
                <div className="flex items-center gap-2 pl-3">
                  <DialogTitle className="text-[18px] font-bold leading-[22px] text-dark-blue-400">
                    Offer from{" "}
                    {/* BTB-369: this screen is client-only (the talent
                    doesn't get a "counter offer" footer here), so the named
                    party is always the talent — link it when a real
                    username is present. */}
                    {clientPerspective && data.senderUsername ? (
                      <NextLink
                        href={talentProfileUrl(data.senderUsername)}
                        className={INLINE_LINK_CLASS}
                      >
                        {data.senderUsername}
                      </NextLink>
                    ) : (
                      <span className="text-primary-500">
                        {data.senderUsername ||
                          `@${data.senderDisplayName.replace(/\s+/g, "")}`}
                      </span>
                    )}
                  </DialogTitle>
                  {showReconnecting ? (
                    <span className="text-xs font-medium text-gray-400">
                      Reconnecting...
                    </span>
                  ) : null}
                </div>

                <DialogClose asChild>
                  <IconButton variant="ghost" visual="gray" size="md">
                    <X className="size-5" />
                  </IconButton>
                </DialogClose>
              </div>

              <div className="flex flex-1 flex-col gap-6 p-6">
                {offline ? (
                  <Alert className="min-h-[auto] p-4">
                    <AlertIcon className="shrink-0">
                      <Info className="size-5" />
                    </AlertIcon>
                    <AlertContent className="text-sm font-semibold leading-5 text-gray-600">
                      {OFFLINE_NOTICE}
                    </AlertContent>
                  </Alert>
                ) : null}
                {showUpdatedBanner ? (
                  <Alert className="min-h-[auto] p-4">
                    <AlertIcon className="shrink-0">
                      <Info className="size-5" />
                    </AlertIcon>
                    <AlertContent className="text-sm font-semibold leading-5 text-gray-600">
                      This offer has been updated.
                    </AlertContent>
                  </Alert>
                ) : null}
                <div className="h-[78px]">
                  <div className="flex h-[50px] items-start justify-between gap-6">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="rounded" visual="gray" size="sm">
                          {data.offerType}
                        </Badge>
                        <span className="text-sm font-medium leading-[18px] text-gray-400">
                          Received on {data.receivedLabel}
                        </span>
                      </div>
                      <div className="truncate text-[16px] font-medium leading-6 text-dark-blue-400">
                        {data.offerTitle}
                      </div>
                    </div>

                    <Button
                      variant="outlined"
                      visual="gray"
                      size="sm"
                      className="w-[104px] px-3"
                      leftIcon={<MessageSquare className="size-4 shrink-0" />}
                      onClick={onMessage}
                    >
                      Message
                    </Button>
                  </div>

                  {hasJobListing ? (
                    <Button
                      variant="link"
                      visual="primary"
                      className="h-5 gap-2 text-xs"
                      leftIcon={<Briefcase className="size-4" />}
                      onClick={onViewJob}
                    >
                      View Job
                    </Button>
                  ) : null}
                </div>

                <div className="border-t border-gray-100" />

                <div className="grid h-44 grid-cols-[162px_1fr] gap-6">
                  <div className="space-y-4">
                    <div className="text-[15px] font-semibold leading-6 text-dark-blue-500">
                      Offer Rate
                    </div>
                    <div className="text-sm leading-[22px] text-gray-500">
                      Role
                    </div>
                    <div className="text-sm leading-[22px] text-gray-500">
                      Contract Duration
                    </div>
                    <div className="text-sm leading-[22px] text-gray-500">
                      Work Schedule
                    </div>
                    <div className="text-sm leading-[22px] text-gray-500">
                      Start Date
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-[16px] font-semibold leading-[18px] text-dark-blue-500">
                      {data.offerRate}
                    </div>
                    <div className="text-sm font-medium leading-[18px] text-dark-blue-500">
                      {data.role}
                    </div>
                    <div className="text-sm font-medium leading-[18px] text-dark-blue-500">
                      {data.duration}
                    </div>
                    <div className="flex items-center gap-1 text-dark-blue-500">
                      <span className="text-sm font-medium leading-[18px]">
                        {data.schedule.startsWith("Full Time")
                          ? "Full Time"
                          : data.schedule.startsWith("Part Time")
                            ? "Part Time"
                            : data.schedule}
                      </span>
                      {data.schedule.startsWith("Full Time") ? (
                        <span className="text-xs font-normal leading-[18px]">
                          over 30 hrs/week
                        </span>
                      ) : data.schedule.startsWith("Part Time") ? (
                        <span className="text-xs font-normal leading-[18px]">
                          up to 30 hrs/week
                        </span>
                      ) : null}
                    </div>
                    <div className="text-sm font-medium leading-[18px] text-dark-blue-500">
                      {data.startDate}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100" />

                {liveWithdrawn ? (
                  <p className="text-sm font-medium leading-6 text-gray-500">
                    This offer has been withdrawn.
                  </p>
                ) : liveExpired ? (
                  <div className="flex h-9 items-center">
                    {clientPerspective ? (
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          onClick={onLiveExpiredEditOffer}
                        >
                          Edit Offer
                        </Button>
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="sm"
                          onClick={onLiveExpiredResendOffer}
                        >
                          Resend Offer
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        onClick={onTalentRecoveryAction}
                      >
                        {talentAskNowLabel}
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-medium leading-[19px] text-gray-400">
                      This offer expires {data.expiresLabel}
                    </p>

                    <div className="flex h-9 items-start gap-3">
                      <Button
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        className="w-[109px]"
                        onClick={onCounterOffer}
                        disabled={offline}
                      >
                        Counter Offer
                      </Button>
                      <div className="flex flex-1 items-center justify-end gap-3">
                        <Button
                          variant="ghost"
                          visual="gray"
                          size="sm"
                          className="w-[105px]"
                          disabled={declineLoading || offline}
                          onClick={onDecline}
                        >
                          {declineLoading ? "Declining..." : "Decline Offer"}
                        </Button>
                        <Button
                          size="sm"
                          className="w-[103px]"
                          disabled={offline}
                          onClick={onAccept}
                        >
                          Accept Offer
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex h-[60px] items-center justify-between border-b border-gray-100 px-6 py-3">
                <div className="flex items-center gap-2">
                  {isHistoryState ? (
                    <IconButton
                      variant="ghost"
                      visual="gray"
                      size="md"
                      onClick={onBack}
                    >
                      <ArrowLeft className="size-5" />
                    </IconButton>
                  ) : null}

                  <DialogTitle className="text-[18px] font-semibold leading-7 text-dark-blue-400">
                    {terminalState ? (
                      terminalState.title
                    ) : (
                      <>
                        Offer from{" "}
                        {/* BTB-369: Offer History reuses this same title —
                        link the talent's real username, leave the client's
                        (no public profile) as plain text. */}
                        {clientPerspective && data.senderUsername ? (
                          <NextLink
                            href={talentProfileUrl(data.senderUsername)}
                            className={INLINE_LINK_CLASS}
                          >
                            {data.senderUsername}
                          </NextLink>
                        ) : (
                          <span className="text-primary-500">
                            {data.senderUsername}
                          </span>
                        )}
                      </>
                    )}
                  </DialogTitle>
                </div>

                <DialogClose asChild>
                  <IconButton variant="ghost" visual="gray" size="md">
                    <X className="size-5" />
                  </IconButton>
                </DialogClose>
              </div>

              <div className="space-y-8 px-6 py-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <Badge variant="rounded" visual="gray" size="sm">
                        {data.offerType}
                      </Badge>
                      <span className="text-sm leading-5 text-gray-500">
                        Received on {data.receivedLabel}
                      </span>
                    </div>

                    <div className="mt-3 text-[18px] font-semibold leading-7 text-dark-blue-400">
                      {data.offerTitle}
                    </div>

                    {hasJobListing ? (
                      <Button
                        variant="link"
                        visual="primary"
                        className="mt-3 underline-offset-2 hover:underline"
                        leftIcon={<Briefcase className="size-4" />}
                        onClick={onViewJob}
                      >
                        View Job
                      </Button>
                    ) : null}
                  </div>

                  {isHistoryState ? (
                    <div className="inline-flex items-center gap-2 pt-1 text-[15px] leading-7 text-gray-500">
                      <Repeat className="size-4" />
                      <span>Offer History</span>
                    </div>
                  ) : (
                    <Button
                      variant="outlined"
                      visual="gray"
                      leftIcon={<MessageSquare className="size-4" />}
                      onClick={onMessage}
                    >
                      Message
                    </Button>
                  )}
                </div>

                <div className="space-y-4 border-y border-gray-100 py-8">
                  <div className="grid grid-cols-[170px_1fr] gap-4">
                    <span className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                      Offer Rate
                    </span>
                    <span className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                      {data.offerRate}
                    </span>
                  </div>

                  <div className="grid grid-cols-[170px_1fr] gap-4">
                    <span className="text-[15px] leading-7 text-gray-500">
                      Role
                    </span>
                    <span className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                      {data.role}
                    </span>
                  </div>

                  <div className="grid grid-cols-[170px_1fr] gap-4">
                    <span className="text-[15px] leading-7 text-gray-500">
                      Contract Duration
                    </span>
                    <span className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                      {data.duration}
                    </span>
                  </div>

                  <div className="grid grid-cols-[170px_1fr] gap-4">
                    <span className="text-[15px] leading-7 text-gray-500">
                      Work Schedule
                    </span>
                    <span className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                      {data.schedule}
                    </span>
                  </div>

                  <div className="grid grid-cols-[170px_1fr] gap-4">
                    <span className="text-[15px] leading-7 text-gray-500">
                      Start Date
                    </span>
                    <span className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                      {data.startDate}
                    </span>
                  </div>
                </div>

                <div className="space-y-6">
                  {terminalState ? (
                    <div className="space-y-2">
                      <p className="text-sm leading-6 text-gray-400">
                        {terminalState.notice}
                      </p>
                      {data.statusReason ? (
                        <p className="text-sm leading-6 text-gray-400">
                          {data.statusReason}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm leading-6 text-gray-400">
                      This offer expires {data.expiresLabel}
                    </p>
                  )}

                  {isAcceptedTerminalState ? (
                    contractId ? (
                      <Button
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        onClick={onViewContract}
                      >
                        View Contract
                      </Button>
                    ) : (
                      <p className="text-sm leading-6 text-gray-400">
                        Contract being prepared...
                      </p>
                    )
                  ) : terminalState ? null : (
                    <div className="flex items-center justify-between gap-3">
                      {isHistoryState ? null : (
                        <Button
                          variant="outlined"
                          visual="gray"
                          onClick={onCounterOffer}
                        >
                          Counter Offer
                        </Button>
                      )}

                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          visual="gray"
                          disabled={declineLoading}
                          onClick={onDecline}
                        >
                          {declineLoading ? "Declining..." : "Decline Offer"}
                        </Button>
                        <Button onClick={onAccept}>Accept Offer</Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
