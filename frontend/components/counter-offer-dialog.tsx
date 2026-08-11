"use client"

import * as React from "react"
import { parse } from "date-fns"
import { X } from "@blend-metrics/icons"
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

const createInitialState = (
  variant: CounterOfferDialogVariant,
  message?: string
): CounterOfferState => {
  const baseState: CounterOfferState = {
    rateValue: "$45/hr",
    rateSelection: "logo-design",
    durationValue: "4 months",
    durationSelection: "custom-duration",
    durationUnit: "Months",
    scheduleSelection: "full-time",
    scheduleValue: "Full Time",
    startDateValue: parse("February 5th, 2026", "MMMM do, yyyy", new Date()),
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
        durationValue: "4 Months",
        rateSelection: "custom-rate",
        rateSelectOpen: true,
      }
    case "custom-rate":
      return {
        ...baseState,
        durationValue: "4 Months",
        rateValue: "",
        showCustomRateInput: true,
      }
    case "duration-dropdown-custom":
      return {
        ...baseState,
        durationValue: "4 Months",
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
        durationValue: "4 Months",
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
}: CounterOfferDialogProps) {
  const [state, setState] = React.useState<CounterOfferState>(() =>
    createInitialState(variant, message)
  )

  React.useEffect(() => {
    setState(createInitialState(variant, message))
  }, [message, variant])

  const updateState = React.useCallback(
    (updater: (previous: CounterOfferState) => CounterOfferState) => {
      setState((previous) => updater(previous))
    },
    []
  )

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
        <div className="pointer-events-auto w-[520px] overflow-hidden rounded-[20px] bg-white shadow-xl transition-[height,width] duration-1000 ease-out [interpolate-size:allow-keywords]">
          <div className="flex h-[68px] items-start justify-between border-b border-gray-100 px-6 py-3">
            <div className="space-y-0.5">
              <DialogTitle className="text-[18px] font-semibold leading-7 text-dark-blue-400">
                Make a Counter Offer
              </DialogTitle>
              <p className="text-[15px] leading-6 text-gray-500">
                Propose new terms that work for you.
              </p>
            </div>

            <DialogClose asChild>
              <IconButton variant="ghost" visual="gray" size="md">
                <X className="size-5" />
              </IconButton>
            </DialogClose>
          </div>

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
                              rateValue: "$45/hr",
                              rateSelection: "logo-design",
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
                              durationValue: "4 months",
                              durationSelection: "custom-duration",
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
                            scheduleSelection: "full-time",
                            scheduleValue: "Full Time",
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
              <Button disabled={submitDisabled} onClick={onReview}>
                Review Counter Offer
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
