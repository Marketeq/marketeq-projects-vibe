"use client"

import * as React from "react"
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Info,
  X,
} from "@blend-metrics/icons"
import type { OfferDialogData } from "@/components/offer-dialog.types"
import {
  Alert,
  AlertContent,
  AlertIcon,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Calendar,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  IconButton,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  Textarea,
} from "@/components/ui"

export type CounterOfferDialogVariant =
  | "default"
  | "rate-dropdown-custom"
  | "custom-rate"
  | "duration-dropdown-custom"
  | "duration-dropdown-selected"
  | "rate-dropdown-selected"
  | "custom-duration"

interface CounterOfferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant: CounterOfferDialogVariant
  data: OfferDialogData
  message?: string
  submitDisabled?: boolean
  /** PMCM-393 AC-42.04: set while the underlying offer has gone terminal
   * mid-compose — shown next to the submit action, which the caller also
   * disables via submitDisabled. */
  terminalNotice?: string
  onMessageChange?: (value: string) => void
  onCancel?: () => void
  onReview?: () => void
  onEdit?: () => void
  onSubmit?: (data: CounterOfferSubmissionData) => void
  mode?: "counter" | "edit"
  initialReview?: boolean
  reviewTitle?: string
  editTitle?: string
  editSubtitle?: string
  reviewButtonLabel?: string
}

export interface CounterOfferSubmissionData {
  offerRate: string
  duration: string
  schedule: string
  startDate: string
  message: string
}

const RATE_OPTIONS = [
  { value: "logo-design", label: "Logo Design", rate: "$45/hr" },
  { value: "web-development", label: "Web Development", rate: "$70/hr" },
  { value: "ux-ui-design", label: "UX/UI Design", rate: "$85/hr" },
  { value: "custom-rate", label: "Custom Rate", rate: "" },
] as const

const DURATION_OPTIONS = [
  { value: "3-months", label: "3 Months" },
  { value: "6-months", label: "6 Months" },
  { value: "1-year", label: "1 Year" },
  { value: "18-months", label: "18 Months" },
  { value: "2-years", label: "2 Years" },
  { value: "ongoing", label: "Ongoing" },
  { value: "custom-duration", label: "Custom Duration" },
] as const

const CUSTOM_DURATION_UNITS = ["Months", "Years"] as const
const RECOMMENDED_MAX_HOURLY_RATE = 70
// BTB-283: mirrors hire-me-button.tsx's own upper bounds for the same two
// backend fields (offer-service's MAX_RATE / MAX_DURATION_MONTHS).
const MAX_CUSTOM_RATE = 9999
const CUSTOM_DURATION_MAX: Record<DurationUnit, number> = {
  Months: 60,
  Years: 5,
}
const SCHEDULE_OPTIONS = [
  { value: "full-time", label: "Full Time", detail: "over 30 hrs/week" },
  { value: "part-time", label: "Part Time", detail: "up to 30 hrs/week" },
  { value: "custom", label: "Custom Schedule", detail: "" },
] as const

type RateValue = (typeof RATE_OPTIONS)[number]["value"]
type DurationValue = (typeof DURATION_OPTIONS)[number]["value"]
type DurationUnit = (typeof CUSTOM_DURATION_UNITS)[number]
type ScheduleValue = (typeof SCHEDULE_OPTIONS)[number]["value"]

interface CounterOfferState {
  rateValue: string
  rateSelection: RateValue
  durationValue: string
  durationSelection: DurationValue
  durationUnit: DurationUnit
  scheduleSelection: ScheduleValue
  scheduleValue: string
  startDateValue?: Date
  messageValue: string
  rateSelectOpen: boolean
  durationSelectOpen: boolean
  scheduleSelectOpen: boolean
  showCustomRateInput: boolean
  showCustomDurationInput: boolean
  showCustomScheduleInput: boolean
}

const rateMap = new Map(RATE_OPTIONS.map((option) => [option.value, option]))
const durationMap = new Map(
  DURATION_OPTIONS.map((option) => [option.value, option])
)
const scheduleMap = new Map(
  SCHEDULE_OPTIONS.map((option) => [option.value, option])
)

const toDollarRate = (rate: string) => {
  const trimmedRate = rate.trim()

  if (/^\$/.test(trimmedRate)) return trimmedRate
  if (/^[€£¥]/.test(trimmedRate)) return trimmedRate.replace(/^[€£¥]/, "$")

  const amount = trimmedRate.match(/[\d,.]+/)?.[0]
  const suffix = trimmedRate.match(/\/\w+$/)?.[0] ?? "/hr"

  return amount ? `$${amount}${suffix}` : "$45/hr"
}

const getInitialRateSelection = (offerRate: string): RateValue => {
  const dollarRate = toDollarRate(offerRate)

  return (
    RATE_OPTIONS.find((option) => option.rate === dollarRate)?.value ??
    "custom-rate"
  )
}

const getInitialDurationSelection = (duration: string): DurationValue => {
  const normalizedDuration = duration.trim().toLowerCase()
  return (
    DURATION_OPTIONS.find(
      (option) => option.label.toLowerCase() === normalizedDuration
    )?.value ?? "custom-duration"
  )
}

const getInitialScheduleSelection = (schedule: string): ScheduleValue => {
  const normalizedSchedule = schedule.trim().toLowerCase()
  return (
    SCHEDULE_OPTIONS.find((option) =>
      normalizedSchedule.startsWith(option.label.toLowerCase())
    )?.value ?? "custom"
  )
}

const getScheduleDisplayParts = (schedule: string) => {
  const [label, detail] = schedule.split(/\s+(?=over\s)/i, 2)

  return { label, detail }
}

const getRateDisplayParts = (rate: string) => {
  const match = rate.match(/^(\$)([\d,.]+)(.*)$/)

  return match
    ? { currency: match[1], amount: match[2], suffix: match[3] }
    : { currency: "", amount: rate, suffix: "" }
}

const getNumericRate = (rate: string) => {
  const amount = Number(rate.replace(/[^\d.]/g, ""))

  return Number.isFinite(amount) ? amount : 0
}

const formatCustomHourlyRate = (rate: string) => {
  const amount = rate.replace(/[^\d.]/g, "")

  return amount ? `$${amount}/hr` : ""
}

const parseStartDate = (startDate: string) => {
  const normalized = startDate.replace(/(\d+)(st|nd|rd|th)/i, "$1")
  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

const isSameCalendarDate = (left?: Date, right?: Date) => {
  if (!left && !right) return true
  if (!left || !right) return false

  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

const formatReviewDate = (date?: Date) => {
  if (!date) return ""

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const createInitialState = (
  variant: CounterOfferDialogVariant,
  data: OfferDialogData,
  message?: string
): CounterOfferState => {
  const dollarRate = toDollarRate(data.offerRate)
  const rateSelection = getInitialRateSelection(dollarRate)
  const durationSelection = getInitialDurationSelection(data.duration)
  const scheduleSelection = getInitialScheduleSelection(data.schedule)
  const scheduleOption = scheduleMap.get(scheduleSelection)

  const baseState: CounterOfferState = {
    rateValue: dollarRate,
    rateSelection,
    durationValue: data.duration,
    durationSelection,
    durationUnit: "Months",
    scheduleSelection,
    scheduleValue: scheduleOption?.label ?? data.schedule,
    startDateValue: parseStartDate(data.startDate),
    messageValue: message ?? "",
    rateSelectOpen: false,
    durationSelectOpen: false,
    scheduleSelectOpen: false,
    showCustomRateInput: false,
    showCustomDurationInput: false,
    showCustomScheduleInput: false,
  }

  switch (variant) {
    case "rate-dropdown-custom":
      return {
        ...baseState,
        rateSelection: "custom-rate",
        rateSelectOpen: true,
      }
    case "custom-rate":
      return {
        ...baseState,
        rateValue: "",
        showCustomRateInput: true,
      }
    case "duration-dropdown-custom":
      return {
        ...baseState,
        durationSelection: "custom-duration",
        durationSelectOpen: true,
      }
    case "duration-dropdown-selected":
      return {
        ...baseState,
        durationValue: "6 Months",
        durationSelection: "6-months",
        durationSelectOpen: true,
      }
    case "rate-dropdown-selected":
      return {
        ...baseState,
        rateValue: "$70/hr",
        rateSelection: "web-development",
        rateSelectOpen: true,
      }
    case "custom-duration":
      return {
        ...baseState,
        durationValue: "",
        showCustomDurationInput: true,
      }
    default:
      return baseState
  }
}

export function CounterOfferDialog({
  open,
  onOpenChange,
  variant,
  data,
  message,
  submitDisabled = false,
  terminalNotice,
  onMessageChange,
  onCancel,
  onReview,
  onEdit,
  onSubmit,
  mode = "counter",
  initialReview = false,
  reviewTitle,
  editTitle,
  editSubtitle,
  reviewButtonLabel,
}: CounterOfferDialogProps) {
  const [state, setState] = React.useState<CounterOfferState>(() =>
    createInitialState(variant, data, message)
  )
  const [showReview, setShowReview] = React.useState(initialReview)
  const [startDateOpen, setStartDateOpen] = React.useState(false)
  const [projectSelected, setProjectSelected] = React.useState(true)
  const [calendarFocusedValue, setCalendarFocusedValue] = React.useState(
    () => parseStartDate(data.startDate)
  )

  React.useEffect(() => {
    setState(createInitialState(variant, data, message))
    setShowReview(initialReview)
    setStartDateOpen(false)
    setProjectSelected(true)
    setCalendarFocusedValue(parseStartDate(data.startDate))
  }, [data, initialReview, message, variant])

  const updateState = React.useCallback(
    (updater: (previous: CounterOfferState) => CounterOfferState) => {
      setState((previous) => updater(previous))
    },
    []
  )

  const initialStartDateValue = React.useMemo(
    () => parseStartDate(data.startDate),
    [data.startDate]
  )
  const isDirty =
    state.rateValue.trim() !== toDollarRate(data.offerRate) ||
    state.durationValue.trim() !== data.duration.trim() ||
    state.scheduleValue.trim() !== data.schedule.trim() ||
    !isSameCalendarDate(state.startDateValue, initialStartDateValue) ||
    state.messageValue.trim().length > 0
  const reviewStartDate =
    formatReviewDate(state.startDateValue) || data.startDate
  const reviewMessage = state.messageValue.trim()
  const scheduleDisplay = getScheduleDisplayParts(data.schedule)
  const selectedScheduleOption = scheduleMap.get(state.scheduleSelection)
  const activeScheduleLabel =
    selectedScheduleOption?.label || scheduleDisplay.label
  const termRowClassName = "flex items-start gap-2.5"
  const termLabelClassName =
    "flex h-10 w-40 shrink-0 flex-col justify-center"
  const dollarOfferRate = toDollarRate(data.offerRate)
  const isRateChanged = state.rateValue.trim() !== dollarOfferRate
  const rateDisplay = getRateDisplayParts(dollarOfferRate)
  const showHighRateSuggestion =
    state.showCustomRateInput &&
    getNumericRate(state.rateValue) > RECOMMENDED_MAX_HOURLY_RATE
  // BTB-283/AC-18.04: same shape as hire-me-button's isCustomRateIncomplete/
  // isCustomDurationIncomplete — the row being open is the "value is a live
  // custom entry" signal, so an empty or zero value is caught here rather
  // than by isDirty seeing a truthy-but-meaningless string and calling the
  // offer ready to review. getNumericRate already exists in this file
  // (parses the formatted "$95/hr" string), so it's reused rather than a
  // raw Number() on a value that would never parse as a plain number.
  const isCustomRateIncomplete =
    state.showCustomRateInput && !(getNumericRate(state.rateValue) > 0)
  const isCustomDurationIncomplete =
    state.showCustomDurationInput && !(Number(state.durationValue) > 0)
  const isCustomScheduleIncomplete =
    state.showCustomScheduleInput &&
    !(Number(state.scheduleValue.replace(/\D/g, "")) > 0)
  const isResendMode =
    mode === "edit" && Boolean(editTitle?.startsWith("Resend"))

  const handleReview = React.useCallback(() => {
    onReview?.()
    setShowReview(true)
  }, [onReview])

  const handleRateChange = React.useCallback(
    (value: string) => {
      const nextValue = value as RateValue

      if (nextValue === "custom-rate") {
        updateState((previous) => ({
          ...previous,
          rateSelection: nextValue,
          rateSelectOpen: false,
          showCustomRateInput: true,
          rateValue: "",
        }))
        return
      }

      const option = rateMap.get(nextValue)
      updateState((previous) => ({
        ...previous,
        rateSelection: nextValue,
        rateSelectOpen: false,
        showCustomRateInput: false,
        rateValue: option?.rate ?? previous.rateValue,
      }))
    },
    [updateState]
  )

  const handleDurationChange = React.useCallback(
    (value: string) => {
      const nextValue = value as DurationValue

      if (nextValue === "custom-duration") {
        updateState((previous) => ({
          ...previous,
          durationSelection: nextValue,
          durationSelectOpen: false,
          showCustomDurationInput: true,
          durationValue: "",
        }))
        return
      }

      const option = durationMap.get(nextValue)
      updateState((previous) => ({
        ...previous,
        durationSelection: nextValue,
        durationSelectOpen: false,
        showCustomDurationInput: false,
        durationValue: option?.label ?? previous.durationValue,
      }))
    },
    [updateState]
  )

  const handleScheduleChange = React.useCallback(
    (value: string) => {
      const nextValue = value as ScheduleValue

      if (nextValue === "custom") {
        updateState((previous) => ({
          ...previous,
          scheduleSelection: nextValue,
          scheduleSelectOpen: false,
          showCustomScheduleInput: true,
          scheduleValue: "",
        }))
        return
      }

      const option = scheduleMap.get(nextValue)
      updateState((previous) => ({
        ...previous,
        scheduleSelection: nextValue,
        scheduleSelectOpen: false,
        showCustomScheduleInput: false,
        scheduleValue: option?.label ?? previous.scheduleValue,
      }))
    },
    [updateState]
  )

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
            showReview
              ? "pointer-events-auto flex h-[683px] w-[520px] flex-col overflow-hidden rounded-[20px] bg-white shadow-xl transition-[height,width] duration-1000 ease-out [interpolate-size:allow-keywords]"
              : mode === "edit"
                ? "pointer-events-auto flex max-h-[calc(100dvh-24px)] w-[480px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-xl bg-white shadow-xl"
                : "pointer-events-auto w-[480px] overflow-hidden rounded-xl bg-white shadow-xl transition-[height,width] duration-1000 ease-out [interpolate-size:allow-keywords]"
          }
        >
          <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-gray-200 px-3 py-3">
            <div className="pl-3">
              <DialogTitle className="text-[18px] font-bold leading-[22px] text-dark-blue-400">
                {showReview
                  ? mode === "edit"
                    ? reviewTitle || "Review your offer"
                    : "Review Your Counter Offer"
                  : mode === "edit"
                    ? editTitle || "Edit your offer"
                    : "Make a Counter Offer"}
              </DialogTitle>
              <p className="text-sm leading-[22px] text-gray-500">
                {showReview
                  ? mode === "edit"
                    ? "Confirm the details before sending."
                    : "Confirm the details before sending to the client."
                  : mode === "edit"
                    ? editSubtitle || "Update the terms of your offer."
                    : "Propose new terms that work for you."}
              </p>
            </div>

            <DialogClose asChild>
              <IconButton variant="ghost" visual="gray" size="sm">
                <X className="size-5" />
              </IconButton>
            </DialogClose>
          </div>

          {showReview ? (
            <>
              <div className="flex-1 overflow-y-auto px-6 py-6">
                {mode === "edit" ? (
                  <div className="mb-6 space-y-5 border-b border-gray-100 pb-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium leading-[18px] text-dark-blue-400">
                          {data.offerType}
                        </span>
                        <span className="text-sm font-medium leading-[18px] text-gray-400">
                          Offer expires {data.expiresLabel}
                        </span>
                      </div>
                      <p className="text-[16px] font-medium leading-6 text-dark-blue-400">
                        {data.offerTitle}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Avatar className="size-12 shrink-0">
                        <AvatarImage
                          src={data.senderAvatarSrc}
                          alt={data.senderDisplayName}
                        />
                        <AvatarFallback>
                          {data.senderDisplayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 text-dark-blue-400">
                        <p className="text-sm font-semibold leading-[18px]">
                          {data.role}
                        </p>
                        <p className="mt-1 text-xs leading-[15px] text-gray-400">
                          10 years of experience
                        </p>
                        <p className="mt-1 text-[10px] leading-[15px] text-gray-400">
                          Jersey City, NJ, United States
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-5 border-b border-gray-100 pb-6">
                  <div className="grid grid-cols-[156px_1fr] items-start gap-x-3">
                    <div className="text-[15px] font-semibold leading-7 text-gray-500">
                      Offer Rate
                    </div>
                    <div className="flex items-center gap-2 text-[15px] font-semibold leading-7 text-dark-blue-400">
                      {/* The arrow stays in the DOM when the rate is
                          unchanged, only hidden: chats-comp.tsx's client
                          edit/resend review clones this svg as the arrow for
                          its other changed rows. A div, not a span, so its
                          "first span is the rate" read is unaffected. */}
                      <div className={isRateChanged ? "contents" : "hidden"}>
                        <ArrowRight className="size-4 text-success-500" />
                      </div>
                      <span>{state.rateValue}</span>
                      {isRateChanged ? (
                        <span className="font-normal text-gray-400">
                          (was {dollarOfferRate})
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-[156px_1fr] items-start gap-x-3">
                    <div className="text-[15px] leading-7 text-gray-500">
                      Contract Duration
                    </div>
                    <div className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                      {state.durationValue}
                    </div>
                  </div>

                  <div className="grid grid-cols-[156px_1fr] items-start gap-x-3">
                    <div className="text-[15px] leading-7 text-gray-500">
                      Work Schedule
                    </div>
                    <div className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                      {state.scheduleValue}
                    </div>
                  </div>

                  <div className="grid grid-cols-[156px_1fr] items-start gap-x-3">
                    <div className="text-[15px] leading-7 text-gray-500">
                      Start Date
                    </div>
                    <div className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                      {reviewStartDate}
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-lg bg-gray-50 p-4">
                  <div className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                    Message
                  </div>
                  <p className="mt-4 min-h-[110px] whitespace-pre-wrap text-[15px] leading-7 text-dark-blue-400">
                    {reviewMessage}
                  </p>
                </div>

                <div className="mt-6 flex items-start gap-2 text-sm leading-6 text-gray-400">
                  <Info className="mt-1 size-4 shrink-0" />
                  <p>
                    {mode === "edit"
                      ? "By submitting, these updated terms will replace your current offer."
                      : "By submitting, you agree to work under these terms if the client accepts your offer."}
                  </p>
                </div>
              </div>

              {terminalNotice ? (
                <div className="border-t border-gray-100 px-6 pt-4">
                  <Alert className="min-h-[auto] p-4">
                    <AlertIcon className="shrink-0">
                      <Info className="size-5" />
                    </AlertIcon>
                    <AlertContent className="text-sm font-semibold leading-5 text-gray-600">
                      {terminalNotice}
                    </AlertContent>
                  </Alert>
                </div>
              ) : null}
              <div className="flex shrink-0 items-center justify-between border-t border-gray-100 px-6 py-4">
                <Button variant="outlined" visual="gray" onClick={onCancel}>
                  {mode === "edit" ? "View Previous Offer" : "Previous Offer"}
                </Button>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    visual="primary"
                    onClick={() => {
                      setShowReview(false)
                      onEdit?.()
                    }}
                  >
                    {mode === "edit" ? "Edit Offer" : "Edit Counter Offer"}
                  </Button>
                  <Button
                    disabled={submitDisabled}
                    onClick={() =>
                      onSubmit?.({
                        offerRate: state.rateValue,
                        duration: state.durationValue,
                        schedule: state.scheduleValue,
                        startDate: reviewStartDate,
                        message: reviewMessage,
                      })
                    }
                  >
                    {mode === "edit" ? "Send Offer" : "Submit Counter Offer"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div
              className={
                mode === "edit"
                  ? "min-h-0 flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-6"
                  : "flex flex-col gap-6 px-6 py-6"
              }
            >
              {mode === "edit" ? (
                <div className="space-y-5 border-b border-gray-100 pb-6">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-12 shrink-0">
                      <AvatarImage
                        src={data.senderAvatarSrc}
                        alt={data.senderDisplayName}
                      />
                      <AvatarFallback>
                        {data.senderDisplayName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 text-dark-blue-400">
                      <p className="text-sm font-semibold leading-[18px]">
                        {data.role}
                      </p>
                      <p className="mt-1 text-xs leading-[15px] text-gray-400">
                        10 years of experience
                      </p>
                      <p className="mt-1 text-[10px] leading-[15px] text-gray-400">
                        Jersey City, NJ, United States
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {projectSelected ? (
                      <div className="flex h-[58px] w-full items-center justify-between rounded-lg border-2 border-primary-500 bg-white px-5 py-3">
                        <div>
                          <p className="text-xs font-semibold leading-[18px] text-dark-blue-400">
                            {data.offerTitle}
                          </p>
                          <p className="text-xs leading-[18px] text-dark-blue-400">
                            Design Phase
                          </p>
                        </div>
                        <Avatar className="size-6 border-2 border-white">
                          <AvatarImage
                            src={data.senderAvatarSrc}
                            alt={data.senderDisplayName}
                          />
                          <AvatarFallback>
                            {data.senderDisplayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="flex h-[58px] w-full items-center rounded-lg border border-gray-300 bg-white px-5 text-left"
                        onClick={() => setProjectSelected(true)}
                      >
                        <span>
                          <span className="block text-xs font-semibold text-dark-blue-400">
                            {data.offerTitle}
                          </span>
                          <span className="block text-xs text-gray-500">
                            Design Phase
                          </span>
                        </span>
                      </button>
                    )}
                    <Button
                      variant="link"
                      visual="gray"
                      size="sm"
                      className="h-[18px] p-0 text-xs text-dark-blue-400"
                      onClick={() => setProjectSelected((selected) => !selected)}
                    >
                      {projectSelected ? "Change Project" : "Select Project"}
                    </Button>
                  </div>
                </div>
              ) : null}

              {showHighRateSuggestion ? (
                <Alert className="min-h-[72px] p-4">
                  <AlertIcon className="shrink-0">
                    <Info className="size-5" />
                  </AlertIcon>
                  <AlertContent className="text-sm font-semibold leading-5 text-gray-600">
                    The client will be more likely to accept if your
                    counteroffer is closer to $70/hr.
                  </AlertContent>
                </Alert>
              ) : null}

              <div className="space-y-[15px] border-b border-gray-100 pb-6">
                <div className={termRowClassName}>
                  <div className={termLabelClassName}>
                    <div className="text-sm leading-[22px] text-gray-500">
                      Offer Rate
                    </div>
                    <div className="flex h-[18px] items-center text-dark-blue-400">
                      <span className="text-[13px] font-medium leading-[18px]">
                        {rateDisplay.currency}
                      </span>
                      <span className="text-sm font-semibold leading-[18px]">
                        {rateDisplay.amount}
                      </span>
                      <span className="text-[13px] font-semibold leading-[18px]">
                        {rateDisplay.suffix}
                      </span>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    {state.showCustomRateInput ? (
                      <>
                        <Input
                          autoFocus
                          inputMode="decimal"
                          placeholder="Enter rate"
                          value={state.rateValue}
                          onFocus={(event) => {
                            const caretPosition = Math.max(
                              0,
                              event.currentTarget.value.length - 3
                            )
                            event.currentTarget.setSelectionRange(
                              caretPosition,
                              caretPosition
                            )
                          }}
                          onChange={(event) => {
                            const input = event.currentTarget
                            const digitsOnly = input.value.replace(
                              /[^\d.]/g,
                              ""
                            )

                            // BTB-283: bail before formatting/updating state
                            // (and before scheduling the caret reposition
                            // below) so a rejected keystroke leaves the
                            // input exactly as it was — same "test the
                            // candidate, don't commit it" shape as
                            // hire-me-button's customRateValue guard.
                            if (
                              digitsOnly !== "" &&
                              Number(digitsOnly) > MAX_CUSTOM_RATE
                            ) {
                              return
                            }

                            const formattedRate = formatCustomHourlyRate(
                              input.value
                            )

                            updateState((previous) => ({
                              ...previous,
                              rateValue: formattedRate,
                            }))

                            requestAnimationFrame(() => {
                              const caretPosition = Math.max(
                                0,
                                formattedRate.length - 3
                              )
                              input.setSelectionRange(
                                caretPosition,
                                caretPosition
                              )
                            })
                          }}
                        />
                        <div className="flex justify-end">
                          <Button
                            variant="link"
                            visual="gray"
                            onClick={() =>
                              updateState((previous) => ({
                                ...previous,
                                showCustomRateInput: false,
                                rateValue: dollarOfferRate,
                                rateSelection: getInitialRateSelection(
                                  dollarOfferRate
                                ),
                              }))
                            }
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Select
                        open={state.rateSelectOpen}
                        onOpenChange={(nextOpen) =>
                          updateState((previous) => ({
                            ...previous,
                            rateSelectOpen: nextOpen,
                          }))
                        }
                        value={state.rateSelection}
                        onValueChange={handleRateChange}
                      >
                        <SelectTrigger className="w-full text-left text-base font-normal leading-6 text-gray-500 shadow-xs">
                          {state.rateValue}
                        </SelectTrigger>
                        <SelectContent className="w-64 py-0">
                          {RATE_OPTIONS.slice(0, 3).map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                              className="rounded-none py-2.5 pl-3 pr-[38px] text-[13px] font-medium leading-[13px] capitalize text-dark-blue-400 data-[state=checked]:bg-gray-50"
                            >
                              <span className="flex w-full items-center justify-between gap-2">
                                <span className="font-medium">
                                  {option.label}
                                </span>
                                <span className="flex items-center text-dark-blue-400">
                                  <span className="text-[11px] font-normal leading-[18px]">
                                    $
                                  </span>
                                  <span className="text-[13px] font-semibold leading-[18px]">
                                    {option.rate.replace(/[^\d,.]/g, "")}
                                  </span>
                                  <span className="text-[11px] font-normal leading-[18px]">
                                    /hr
                                  </span>
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                          <SelectSeparator className="mx-0 my-0 bg-gray-100 dark:bg-gray-100" />
                          <SelectItem
                            value="custom-rate"
                            className="rounded-none py-2.5 pl-3 pr-[38px] text-[13px] font-medium leading-[13px] capitalize text-gray-500"
                          >
                            {RATE_OPTIONS[3].label}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className={termRowClassName}>
                  <div className={termLabelClassName}>
                    <div className="text-sm leading-[22px] text-gray-500">
                      Contract Duration
                    </div>
                    <div className="text-sm font-medium leading-[18px] text-dark-blue-400">
                      {data.duration}
                    </div>
                  </div>

                  <div
                    className={
                      state.showCustomDurationInput
                        ? "min-w-0 flex-1 space-y-3"
                        : "min-w-0 flex-1 space-y-2"
                    }
                  >
                    {state.showCustomDurationInput ? (
                      <>
                        <div className="flex gap-2">
                          <Input
                            autoFocus
                            className="min-w-0 flex-1 text-base placeholder:text-base"
                            inputMode="numeric"
                            placeholder="Enter duration"
                            value={state.durationValue}
                            onChange={(event) => {
                              const digits = event.target.value.replace(
                                /\D/g,
                                ""
                              )

                              // BTB-283: same "test the candidate, bail
                              // without updating state" shape as
                              // hire-me-button's customDurationValue guard.
                              if (
                                digits !== "" &&
                                Number(digits) >
                                  CUSTOM_DURATION_MAX[state.durationUnit]
                              ) {
                                return
                              }

                              updateState((previous) => ({
                                ...previous,
                                durationValue: digits,
                              }))
                            }}
                          />
                          <Select
                            value={state.durationUnit}
                            onValueChange={(value) => {
                              // BTB-283: same defect reached through a
                              // different path — a value valid under the
                              // old unit can exceed the new one's max with
                              // no keystroke to catch it. Same clamp shape
                              // as hire-me-button's customDurationUnit
                              // onValueChange.
                              const nextUnit = value as DurationUnit
                              const max = CUSTOM_DURATION_MAX[nextUnit]

                              updateState((previous) => ({
                                ...previous,
                                durationUnit: nextUnit,
                                durationValue:
                                  previous.durationValue !== "" &&
                                  Number(previous.durationValue) > max
                                    ? String(max)
                                    : previous.durationValue,
                              }))
                            }}
                          >
                            <SelectTrigger className="w-24 px-3 text-left text-sm font-normal leading-5 text-gray-black shadow-xs">
                              {state.durationUnit}
                            </SelectTrigger>
                            <SelectContent>
                              {CUSTOM_DURATION_UNITS.map((unit) => (
                                <SelectItem key={unit} value={unit}>
                                  {unit}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex">
                          <Button
                            variant="link"
                            visual="gray"
                            className="text-xs leading-5"
                            onClick={() =>
                              updateState((previous) => ({
                                ...previous,
                                showCustomDurationInput: false,
                                durationValue: data.duration,
                                durationSelection: getInitialDurationSelection(
                                  data.duration
                                ),
                              }))
                            }
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    ) : (
                      <Select
                        open={state.durationSelectOpen}
                        onOpenChange={(nextOpen) =>
                          updateState((previous) => ({
                            ...previous,
                            durationSelectOpen: nextOpen,
                          }))
                        }
                        value={state.durationSelection}
                        onValueChange={handleDurationChange}
                      >
                        <SelectTrigger className="w-full text-left text-base font-normal leading-6 text-gray-500 shadow-xs">
                          {state.durationValue}
                        </SelectTrigger>
                        <SelectContent>
                          {DURATION_OPTIONS.slice(0, 6).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                          <SelectItem value="custom-duration">
                            {DURATION_OPTIONS[6].label}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className={termRowClassName}>
                  <div className={termLabelClassName}>
                    <div className="text-sm leading-[22px] text-gray-500">
                      Work Schedule
                    </div>
                    <div className="flex items-center text-dark-blue-400">
                      <span className="text-sm font-medium leading-[18px]">
                        {activeScheduleLabel}
                      </span>
                    </div>
                  </div>

                  {state.showCustomScheduleInput ? (
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex gap-3">
                        <Input
                          autoFocus
                          className="min-w-0 flex-1"
                          inputMode="numeric"
                          placeholder="Enter hours"
                          value={state.scheduleValue.replace(/\D/g, "")}
                          onChange={(event) => {
                            const hours = event.target.value.replace(/\D/g, "")
                            const normalizedHours = hours
                              ? String(Math.min(Number(hours), 24))
                              : ""
                            updateState((previous) => ({
                              ...previous,
                              scheduleValue: normalizedHours
                                ? `${normalizedHours} Per day`
                                : "",
                            }))
                          }}
                        />
                        <Select value="per-day">
                          <SelectTrigger className="w-[109px] text-left text-base font-normal leading-6 text-gray-black shadow-xs">
                            Per day
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="per-day">Per day</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex">
                        <Button
                          variant="link"
                          visual="gray"
                          className="text-xs leading-5"
                          onClick={() =>
                            updateState((previous) => ({
                              ...previous,
                              showCustomScheduleInput: false,
                              scheduleSelection: getInitialScheduleSelection(
                                data.schedule
                              ),
                              scheduleValue:
                                scheduleMap.get(
                                  getInitialScheduleSelection(data.schedule)
                                )?.label ?? data.schedule,
                            }))
                          }
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Select
                      open={state.scheduleSelectOpen}
                      onOpenChange={(nextOpen) =>
                        updateState((previous) => ({
                          ...previous,
                          scheduleSelectOpen: nextOpen,
                        }))
                      }
                      value={state.scheduleSelection}
                      onValueChange={handleScheduleChange}
                    >
                      <SelectTrigger className="w-full flex-1 text-left text-base font-normal leading-6 text-gray-500 shadow-xs">
                        {state.scheduleValue}
                      </SelectTrigger>
                      <SelectContent className="w-64 py-0">
                        {SCHEDULE_OPTIONS.slice(0, 2).map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            className="rounded-none py-2.5 pl-3 pr-[38px] text-[13px] font-medium leading-[13px] capitalize text-dark-blue-400 data-[state=checked]:bg-gray-50"
                          >
                            <span className="flex w-full items-center gap-2">
                              <span className="shrink-0">{option.label}</span>
                              <span className="flex-1 text-xs font-normal leading-[18px]">
                                {option.detail}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                        <SelectItem
                          value="custom"
                          className="rounded-none px-3 py-3 text-[13px] font-medium leading-[13px] capitalize text-gray-500"
                        >
                          {SCHEDULE_OPTIONS[2].label}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className={termRowClassName}>
                  <div className={termLabelClassName}>
                    <div className="text-sm leading-[22px] text-gray-500">
                      Start Date
                    </div>
                    <div className="text-sm font-medium leading-[18px] text-dark-blue-400">
                      {data.startDate}
                    </div>
                  </div>

                  <Popover
                    open={startDateOpen}
                    onOpenChange={setStartDateOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        className="min-w-0 flex-1 justify-between px-[14px] text-left text-base font-normal leading-6 text-gray-500 shadow-xs"
                        size="lg"
                        variant="outlined"
                        visual="gray"
                        rightIcon={
                          <ChevronDown className="size-4 shrink-0 text-gray-500" />
                        }
                      >
                        {formatReviewDate(state.startDateValue) ||
                          "Select a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      className="w-[330px] rounded-lg border border-gray-100 bg-white p-0 shadow-lg"
                    >
                      <div className="pointer-events-none absolute left-7 top-6 z-10 flex items-center gap-1 text-sm font-semibold leading-[22px] text-dark-blue-400">
                        <span>
                          {(calendarFocusedValue ?? state.startDateValue)?.getFullYear()}
                        </span>
                        <ChevronRight className="size-4 text-primary-500" />
                      </div>
                      <div className="pointer-events-none absolute left-3 right-3 top-16 z-10 grid grid-cols-7 text-center text-xs font-semibold uppercase leading-[18px] text-gray-300">
                        <span>SUN</span>
                        <span>MON</span>
                        <span>TUE</span>
                        <span>WED</span>
                        <span>THU</span>
                        <span>FRI</span>
                        <span>SAT</span>
                      </div>
                      <Calendar
                        value={state.startDateValue}
                        minValue={new Date()}
                        focusedValue={calendarFocusedValue}
                        onFocusedValueChange={setCalendarFocusedValue}
                        onValueChange={(value) => {
                          updateState((previous) => ({
                            ...previous,
                            startDateValue: value,
                          }))
                          setStartDateOpen(false)
                        }}
                        className="w-[330px] rounded-lg border-0 bg-white p-3 shadow-none [&>div]:hidden [&>header]:h-10 [&>header>h2]:order-1 [&>header>h2]:mr-auto [&>header>h2]:invisible [&>header>button:first-child]:order-2 [&>header>button:last-child]:order-3 [&_thead]:invisible [&_thead]:h-5 [&_thead_tr]:h-5 [&_thead_th]:h-5 [&_[role=gridcell]]:size-10 [&_[data-outside-month]]:invisible [&_[data-today][data-today]]:bg-transparent [&_[data-today][data-today]]:text-primary-500 [&_[data-selected]]:bg-primary-50 [&_[data-selected]]:text-primary-500"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-sm font-medium leading-6 text-dark-blue-400">
                  Add a message (optional)
                </div>

                <div className="space-y-1">
                  <Textarea
                    className="h-32 text-xs leading-6 text-gray-500 placeholder:opacity-50"
                    placeholder="Add a short note..."
                    rows={7}
                    value={state.messageValue}
                    onChange={(event) => {
                      const nextValue = event.target.value.slice(0, 500)
                      updateState((previous) => ({
                        ...previous,
                        messageValue: nextValue,
                      }))
                      onMessageChange?.(nextValue)
                    }}
                  />
                  <div className="text-right text-[10px] font-medium leading-4 text-gray-400">
                    {state.messageValue.length}/500
                  </div>
                </div>
              </div>

              {terminalNotice ? (
                <Alert className="min-h-[auto] p-4">
                  <AlertIcon className="shrink-0">
                    <Info className="size-5" />
                  </AlertIcon>
                  <AlertContent className="text-sm font-semibold leading-5 text-gray-600">
                    {terminalNotice}
                  </AlertContent>
                </Alert>
              ) : null}

              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="ghost"
                  visual="primary"
                  className="text-xs leading-5"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
                <Button
                  className="text-xs leading-5"
                  disabled={
                    submitDisabled ||
                    !projectSelected ||
                    (!isDirty && !isResendMode) ||
                    isCustomRateIncomplete ||
                    isCustomDurationIncomplete ||
                    isCustomScheduleIncomplete
                  }
                  onClick={handleReview}
                >
                  {mode === "edit"
                    ? reviewButtonLabel || "Review Edit"
                    : "Review Counter Offer"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
