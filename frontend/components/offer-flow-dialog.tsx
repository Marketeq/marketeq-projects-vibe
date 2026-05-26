"use client"

import * as React from "react"
import {
  ArrowLeft,
  Briefcase,
  Info,
  Repeat,
  User,
  X,
} from "@blend-metrics/icons"
import NextLink from "@/components/next-link"
import type { OfferDialogData } from "@/components/offer-dialog.types"
import {
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
  | "offer-details-history"
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
  onAcceptanceMessageChange?: (value: string) => void
  onTermsAcceptedChange?: (value: boolean) => void
  onDeclineMessageChange?: (value: string) => void
  onDeclineReasonChange?: (value: string) => void
  onViewJob?: () => void
  onMessage?: () => void
  onCounterOffer?: () => void
  onDecline?: () => void
  onAccept?: () => void
  onBack?: () => void
  onCancelAccept?: () => void
  onCancelDecline?: () => void
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
  onAcceptanceMessageChange,
  onTermsAcceptedChange,
  onDeclineMessageChange,
  onDeclineReasonChange,
  onViewJob,
  onMessage,
  onCounterOffer,
  onDecline,
  onAccept,
  onBack,
  onCancelAccept,
  onCancelDecline,
}: OfferFlowDialogProps) {
  const isAcceptState =
    variant === "accept-offer-empty" || variant === "accept-offer-ready"
  const isDeclineState =
    variant === "decline-offer-empty" || variant === "decline-offer-ready"
  const isHistoryState = variant === "offer-details-history"
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
        <div className="pointer-events-auto w-[520px] overflow-hidden rounded-[20px] bg-white shadow-xl transition-[height,width] duration-1000 ease-out [interpolate-size:allow-keywords]">
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

                <div className="flex items-center justify-end gap-3">
                  <Button
                    variant="ghost"
                    visual="gray"
                    onClick={onCancelAccept}
                  >
                    Cancel
                  </Button>
                  <Button
                    disabled={!resolvedTermsAccepted || acceptLoading}
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
                      visual="error"
                      disabled={declineLoading}
                      onClick={onDecline}
                    >
                      {declineLoading ? "Declining..." : "Decline Offer"}
                    </Button>
                  </div>
                </div>
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
                    {data.senderDisplayName}{" "}
                    <span className="text-primary-500">
                      {data.senderUsername}
                    </span>
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

                    <Button
                      variant="link"
                      visual="primary"
                      className="mt-3 underline-offset-2 hover:underline"
                      leftIcon={<Briefcase className="size-4" />}
                      onClick={onViewJob}
                    >
                      View Job
                    </Button>
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
                      leftIcon={<User className="size-4" />}
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
                  <p className="text-sm leading-6 text-gray-400">
                    This offer expires {data.expiresLabel}
                  </p>

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
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
