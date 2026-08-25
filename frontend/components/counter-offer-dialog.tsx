"use client"

import * as React from "react"
import { ArrowRight, Info, X } from "@blend-metrics/icons"
import type { OfferDialogData } from "@/components/offer-dialog.types"
import {
  Button,
  DatePicker,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  IconButton,
  Input,
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
  onMessageChange?: (value: string) => void
  onCancel?: () => void
  onReview?: () => void
  onSubmit?: (data: CounterOfferSubmissionData) => void
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
const SCHEDULE_OPTIONS = [
  { value: "full-time", label: "Full Time" },
  { value: "part-time", label: "Part Time" },
  { value: "custom", label: "Custom" },
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

const getInitialRateSelection = (offerRate: string): RateValue => {
  return (
    RATE_OPTIONS.find((option) => option.rate === offerRate)?.value ??
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
  const rateSelection = getInitialRateSelection(data.offerRate)
  const durationSelection = getInitialDurationSelection(data.duration)
  const scheduleSelection = getInitialScheduleSelection(data.schedule)

  const baseState: CounterOfferState = {
    rateValue: data.offerRate,
    rateSelection,
    durationValue: data.duration,
    durationSelection,
    durationUnit: "Months",
    scheduleSelection,
    scheduleValue: data.schedule,
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
  onMessageChange,
  onCancel,
  onReview,
  onSubmit,
}: CounterOfferDialogProps) {
  const [state, setState] = React.useState<CounterOfferState>(() =>
    createInitialState(variant, data, message)
  )
  const [showReview, setShowReview] = React.useState(false)

  React.useEffect(() => {
    setState(createInitialState(variant, data, message))
    setShowReview(false)
  }, [data, message, variant])

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
    state.rateValue.trim() !== data.offerRate.trim() ||
    state.durationValue.trim() !== data.duration.trim() ||
    state.scheduleValue.trim() !== data.schedule.trim() ||
    !isSameCalendarDate(state.startDateValue, initialStartDateValue) ||
    state.messageValue.trim().length > 0
  const reviewStartDate =
    formatReviewDate(state.startDateValue) || data.startDate
  const reviewMessage = state.messageValue.trim()

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
              : "pointer-events-auto w-[520px] overflow-hidden rounded-[20px] bg-white shadow-xl transition-[height,width] duration-1000 ease-out [interpolate-size:allow-keywords]"
          }
        >
          <div className="flex h-[68px] shrink-0 items-start justify-between border-b border-gray-100 px-6 py-3">
            <div className="space-y-0.5">
              <DialogTitle className="text-[18px] font-semibold leading-7 text-dark-blue-400">
                {showReview
                  ? "Review Your Counter Offer"
                  : "Make a Counter Offer"}
              </DialogTitle>
              <p className="text-[15px] leading-6 text-gray-500">
                {showReview
                  ? "Confirm the details before sending to the client."
                  : "Propose new terms that work for you."}
              </p>
            </div>

            <DialogClose asChild>
              <IconButton variant="ghost" visual="gray" size="md">
                <X className="size-5" />
              </IconButton>
            </DialogClose>
          </div>

          {showReview ? (
            <>
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="space-y-5 border-b border-gray-100 pb-6">
                  <div className="grid grid-cols-[156px_1fr] items-start gap-x-3">
                    <div className="text-[15px] font-semibold leading-7 text-gray-500">
                      Offer Rate
                    </div>
                    <div className="flex items-center gap-2 text-[15px] font-semibold leading-7 text-dark-blue-400">
                      <ArrowRight className="size-4 text-success-500" />
                      <span>{state.rateValue}</span>
                      <span className="font-normal text-gray-400">
                        (was {data.offerRate})
                      </span>
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
                    By submitting, you agree to work under these terms if the
                    client accepts your offer.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-between border-t border-gray-100 px-6 py-4">
                <Button variant="outlined" visual="gray" onClick={onCancel}>
                  Previous Offer
                </Button>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    visual="primary"
                    onClick={() => setShowReview(false)}
                  >
                    Edit Counter Offer
                  </Button>
                  <Button
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
                    Submit Counter Offer
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-8 px-6 py-6">
              <div className="space-y-4 border-b border-gray-100 pb-6">
                <div className="grid grid-cols-[156px_1fr] items-start gap-x-3">
                  <div className="pt-2">
                    <div className="text-[15px] leading-7 text-gray-500">
                      Offer Rate
                    </div>
                    <div className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                      {data.offerRate}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {state.showCustomRateInput ? (
                      <>
                        <Input
                          autoFocus
                          placeholder="Enter rate"
                          value={state.rateValue}
                          onChange={(event) =>
                            updateState((previous) => ({
                              ...previous,
                              rateValue: event.target.value,
                            }))
                          }
                        />
                        <div className="flex justify-end">
                          <Button
                            variant="link"
                            visual="gray"
                            onClick={() =>
                              updateState((previous) => ({
                                ...previous,
                                showCustomRateInput: false,
                                rateValue: data.offerRate,
                                rateSelection: getInitialRateSelection(
                                  data.offerRate
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
                        <SelectTrigger className="w-full text-left text-[15px] leading-7 text-dark-blue-400">
                          {state.rateValue}
                        </SelectTrigger>
                        <SelectContent>
                          {RATE_OPTIONS.slice(0, 3).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <span className="flex w-full items-center justify-between gap-4">
                                <span>{option.label}</span>
                                <span className="font-semibold text-dark-blue-400">
                                  {option.rate}
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                          <SelectSeparator />
                          <SelectItem value="custom-rate">
                            {RATE_OPTIONS[3].label}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-[156px_1fr] items-start gap-x-3">
                  <div className="pt-2">
                    <div className="text-[15px] leading-7 text-gray-500">
                      Contract Duration
                    </div>
                    <div className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                      {data.duration}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {state.showCustomDurationInput ? (
                      <>
                        <div className="grid grid-cols-[1fr_110px] gap-3">
                          <Input
                            autoFocus
                            placeholder="Enter duration"
                            value={state.durationValue}
                            onChange={(event) =>
                              updateState((previous) => ({
                                ...previous,
                                durationValue: event.target.value,
                              }))
                            }
                          />
                          <Select
                            value={state.durationUnit}
                            onValueChange={(value) =>
                              updateState((previous) => ({
                                ...previous,
                                durationUnit: value as DurationUnit,
                              }))
                            }
                          >
                            <SelectTrigger className="text-left text-[15px] leading-7 text-dark-blue-400">
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
                        <SelectTrigger className="w-full text-left text-[15px] leading-7 text-dark-blue-400">
                          {state.durationValue}
                        </SelectTrigger>
                        <SelectContent>
                          {DURATION_OPTIONS.slice(0, 6).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                          <SelectSeparator />
                          <SelectItem value="custom-duration">
                            {DURATION_OPTIONS[6].label}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-[156px_1fr] items-start gap-x-3">
                  <div className="pt-2">
                    <div className="text-[15px] leading-7 text-gray-500">
                      Work Schedule
                    </div>
                    <div className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                      {data.schedule}
                    </div>
                  </div>

                  {state.showCustomScheduleInput ? (
                    <div className="space-y-2">
                      <Input
                        autoFocus
                        placeholder="Enter schedule"
                        value={state.scheduleValue}
                        onChange={(event) =>
                          updateState((previous) => ({
                            ...previous,
                            scheduleValue: event.target.value,
                          }))
                        }
                      />
                      <div className="flex justify-end">
                        <Button
                          variant="link"
                          visual="gray"
                          onClick={() =>
                            updateState((previous) => ({
                              ...previous,
                              showCustomScheduleInput: false,
                              scheduleSelection: getInitialScheduleSelection(
                                data.schedule
                              ),
                              scheduleValue: data.schedule,
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
                      <SelectTrigger className="w-full text-left text-[15px] leading-7 text-dark-blue-400">
                        {state.scheduleValue}
                      </SelectTrigger>
                      <SelectContent>
                        {SCHEDULE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="grid grid-cols-[156px_1fr] items-start gap-x-3">
                  <div className="pt-2">
                    <div className="text-[15px] leading-7 text-gray-500">
                      Start Date
                    </div>
                    <div className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                      {data.startDate}
                    </div>
                  </div>

                  <DatePicker
                    value={state.startDateValue}
                    onValueChange={(value) =>
                      updateState((previous) => ({
                        ...previous,
                        startDateValue: value,
                      }))
                    }
                    placeholder="Select a date"
                    indicator={null}
                    inputClassName="w-full justify-start px-[14px] text-left text-[15px] font-normal leading-7 text-gray-500"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-[15px] font-semibold leading-7 text-dark-blue-400">
                  Add a message (optional)
                </div>

                <div className="space-y-2">
                  <Textarea
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
                  <div className="text-right text-sm leading-5 text-gray-400">
                    {state.messageValue.length}/500
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button variant="ghost" visual="gray" onClick={onCancel}>
                  Cancel
                </Button>
                <Button
                  disabled={submitDisabled || !isDirty}
                  onClick={handleReview}
                >
                  Review Counter Offer
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
