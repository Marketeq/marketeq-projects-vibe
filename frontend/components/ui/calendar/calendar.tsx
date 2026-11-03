"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { useControllableState } from "@/utils/hooks"
import { ChevronLeft, ChevronRight } from "@blend-metrics/icons"
import { CalendarDate, parseDate } from "@internationalized/date"
import { RadioGroup, RadioGroupItem } from "@radix-ui/react-radio-group"
import { SelectTrigger } from "@radix-ui/react-select"
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isToday,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns"
import {
  Button as AriaButton,
  Calendar as AriaCalendar,
  CalendarCell as AriaCalendarCell,
  RangeCalendar as AriaRangeCalendar,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  Heading,
} from "react-aria-components"
import {
  Button,
  IconButton,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui"

const CalendarCell = ({
  date,
  ...props
}: React.ComponentProps<typeof AriaCalendarCell>) => {
  const isSameAsToday = isToday(new Date(date.toString()))
  const dataAttr = isSameAsToday ? { "data-today": true } : {}

  return <AriaCalendarCell {...dataAttr} date={date} {...props} />
}

function Calendar({
  value,
  onValueChange,
  focusedValue,
  onFocusedValueChange,
  className,
  minValue,
}: {
  value?: Date
  onValueChange?: (value: Date) => void
  focusedValue?: Date
  onFocusedValueChange?: (value: Date) => void
  className?: string
  // Optional and additive — existing callers that don't pass it are
  // unaffected. Forwarded to AriaCalendar's own minValue, which both
  // visually disables and blocks selection of anything before it (not a
  // CSS-only fake-disable that would still be clickable).
  minValue?: Date
}) {
  const [date, setDate] = React.useState<string>(() =>
    value ? format(value, "LLL d, yyyy") : format(new Date(), "LLL d, yyyy")
  )
  const [focusedValueState, setFocusedValueState] = useControllableState<
    Date | undefined
  >({
    value: focusedValue,
    onChange: (value) => {
      if (value) {
        onFocusedValueChange?.(value)
      }
    },
    shouldUpdate: (prev, next) => {
      if (!prev && !next) return false
      if (!prev || !next) return true
      return (
        prev.getFullYear() !== next.getFullYear() ||
        prev.getMonth() !== next.getMonth() ||
        prev.getDate() !== next.getDate()
      )
    },
  })
  const [state, setState] = useControllableState<Date | undefined>({
    value,
    onChange: (value) => {
      if (value) {
        onValueChange?.(value)
        setDate(format(value, "LLL d, yyyy"))
      }
    },
    // No defaultValue: an unselected calendar must have no selection, only
    // today's distinct `data-today` highlight (gray, not the primary
    // "selected" fill). Defaulting this to `new Date()` made AriaCalendar
    // treat today as already selected before any click, so a click on
    // today's cell was a same-value no-op — shouldUpdate below rejected it
    // (prev === next) and onValueChange never fired, leaving the field
    // empty. Picking any other date first, then today again, worked only
    // because prev then differed from next.
    shouldUpdate: (prev, next) => {
      if (!prev && !next) return false
      if (!prev || !next) return true
      return (
        prev.getFullYear() !== next.getFullYear() ||
        prev.getMonth() !== next.getMonth() ||
        prev.getDate() !== next.getDate()
      )
    },
  })

  const onSelectChange = (value: string) => {
    const today = new Date()

    switch (value) {
      case "today":
        setState(today)
        setFocusedValueState(today)
        break

      case "yesterday":
        const date = subDays(today, 1)
        setState(date)
        setFocusedValueState(date)
        break

      case "this week":
        setFocusedValueState(startOfWeek(today))
        break

      case "last week":
        setFocusedValueState(startOfWeek(subWeeks(today, 1)))
        break

      case "this month":
        setFocusedValueState(startOfMonth(today))
        break

      case "last month":
        setFocusedValueState(startOfMonth(subMonths(today, 1)))
        break

      case "this year":
        setFocusedValueState(startOfYear(today))
        break

      case "last year":
        setFocusedValueState(startOfYear(subYears(today, 1)))
        break

      case "all time":
        setFocusedValueState(today)
        break
    }
  }

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { target } = event
    const { value } = target
    setDate(value)

    const parsedDate = parse(value, "LLL d, yyyy", new Date())
    if (isValid(parsedDate)) {
      setState(parsedDate)
      setFocusedValueState(parsedDate)
    }
  }

  const onFocusChange = (value: CalendarDate) => {
    const date = new Date(value.year, value.month - 1, value.day)
    setFocusedValueState(date)
  }

  const handleChange = (value: CalendarDate) => {
    const date = new Date(value.year, value.month - 1, value.day)
    setState(date)
  }

  return (
    <AriaCalendar
      focusedValue={
        focusedValueState
          ? parseDate(format(focusedValueState, "yyyy-MM-dd"))
          : undefined
      }
      value={state ? parseDate(format(state, "yyyy-MM-dd")) : undefined}
      minValue={minValue ? parseDate(format(minValue, "yyyy-MM-dd")) : undefined}
      onFocusChange={onFocusChange}
      onChange={handleChange}
      className={cn(
        "border w-[330px] rounded-lg border-gray-100 bg-white shadow-xl py-5 px-6",
        className
      )}
    >
      <header className="flex justify-between items-center">
        <IconButton
          className="rounded-lg"
          visual="gray"
          variant="ghost"
          asChild
        >
          <AriaButton slot="previous">
            <ChevronLeft className="h-5 text-gray-500 w-5" />
          </AriaButton>
        </IconButton>
        <Heading className="text-base leading-6 text-gray-700 font-semibold" />
        <IconButton
          className="rounded-lg"
          visual="gray"
          variant="ghost"
          asChild
        >
          <AriaButton slot="next">
            <ChevronRight className="h-5 text-gray-500 w-5" />
          </AriaButton>
        </IconButton>
      </header>

      <div className="flex mt-3 items-center gap-x-3">
        <Input className="h-10 flex-grow" value={date} onChange={onChange} />
        <Select defaultValue="today" onValueChange={onSelectChange}>
          <SelectTrigger className="h-10 whitespace-nowrap inline-flex items-center justify-center text-gray-700 text-sm font-semibold rounded-[5px] py-2.5 px-4 border focus-visible:outline-none border-gray-300 shadow-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              className="text-sm pl-4 text-gray-700 font-medium hover:bg-gray-100 focus:text-gray-700"
              value="today"
            >
              Today
            </SelectItem>
            <SelectItem
              className="text-sm pl-4 text-gray-700 font-medium hover:bg-gray-100 focus:text-gray-700"
              value="yesterday"
            >
              Yesterday
            </SelectItem>
            <SelectItem
              className="text-sm pl-4 text-gray-700 font-medium hover:bg-gray-100 focus:text-gray-700"
              value="this week"
            >
              This week
            </SelectItem>
            <SelectItem
              className="text-sm pl-4 text-gray-700 font-medium hover:bg-gray-100 focus:text-gray-700"
              value="last week"
            >
              Last week
            </SelectItem>
            <SelectItem
              className="text-sm pl-4 text-gray-700 font-medium hover:bg-gray-100 focus:text-gray-700"
              value="this month"
            >
              This month
            </SelectItem>
            <SelectItem
              className="text-sm pl-4 text-gray-700 font-medium hover:bg-gray-100 focus:text-gray-700"
              value="last month"
            >
              Last month
            </SelectItem>
            <SelectItem
              className="text-sm pl-4 text-gray-700 font-medium hover:bg-gray-100 focus:text-gray-700"
              value="this year"
            >
              This year
            </SelectItem>
            <SelectItem
              className="text-sm pl-4 text-gray-700 font-medium hover:bg-gray-100 focus:text-gray-700"
              value="last year"
            >
              Last year
            </SelectItem>
            <SelectItem
              className="text-sm pl-4 text-gray-700 font-medium hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 focus:text-gray-700"
              value="all time"
            >
              All time
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <CalendarGrid className="mt-3">
        <CalendarGridHeader className=" [&_th]:p-0">
          {(day) => (
            <CalendarHeaderCell className="h-10 w-10 p-0 text-sm font-medium text-gray-700">
              {day}
            </CalendarHeaderCell>
          )}
        </CalendarGridHeader>
        <CalendarGridBody className="mt-1 [&_td]:p-0">
          {(date) => (
            <CalendarCell
              className="h-10 w-10 rounded-full p-0 transition-colors duration-150 ease-out focus-visible:outline-none data-[focus-visible]:outline-none inline-flex data-[hovered]:bg-gray-50 data-[outside-month]:text-gray-500 data-[disabled]:text-gray-500 data-[disabled]:bg-transparent items-center justify-center data-[selected]:bg-primary-500 data-[selected]:data-[hovered]:bg-primary-600 data-[selected]:text-white data-[selected]:data-[disabled]:bg-gray-50 data-[selected]:data-[disabled]:text-gray-500 text-sm text-gray-700 data-[today]:bg-gray-100 data-[today]:data-[selected]:bg-primary-500 data-[today]:data-[selected]:data-[hovered]:bg-primary-600 data-[today]:data-[hovered]:bg-gray-50"
              date={date}
            />
          )}
        </CalendarGridBody>
      </CalendarGrid>
    </AriaCalendar>
  )
}

export interface RangeValue<T = Date> {
  start: T
  end: T
}

function calendarDateToLocalDate(date: CalendarDate) {
  return new Date(date.year, date.month - 1, date.day)
}

function rangeDayKey(range?: RangeValue) {
  if (!range?.start || !range?.end || !isValid(range.start) || !isValid(range.end)) {
    return ""
  }
  return `${format(range.start, "yyyy-MM-dd")}|${format(range.end, "yyyy-MM-dd")}`
}

const convertToRangeValue = (
  options?: RangeValue
): RangeValue<CalendarDate> | undefined => {
  if (!options) return

  return {
    start: parseDate(format(options.start, "yyyy-MM-dd")),
    end: parseDate(format(options.end, "yyyy-MM-dd")),
  }
}

const RangeCalendar = ({
  onFocusedValueChange,
  focusedValue,
  value,
  onValueChange,
  className,
}: {
  onFocusedValueChange?: (value: Date) => void
  focusedValue?: Date
  value?: RangeValue
  onValueChange?: (value: RangeValue) => void
  className?: string
}) => {
  // Store callbacks in refs so AriaRangeCalendar always sees the same function identity.
  // A new identity causes react-aria to re-fire onChange → infinite "Maximum update depth" loop.
  const onValueChangeRef = React.useRef(onValueChange)
  onValueChangeRef.current = onValueChange
  const onFocusedValueChangeRef = React.useRef(onFocusedValueChange)
  onFocusedValueChangeRef.current = onFocusedValueChange

  const onChange = React.useCallback(
    (value: RangeValue<CalendarDate> | null) => {
      if (!value) return
      onValueChangeRef.current?.({
        start: calendarDateToLocalDate(value.start),
        end: calendarDateToLocalDate(value.end),
      })
    },
    []
  )

  const onFocusChange = React.useCallback((value: CalendarDate) => {
    onFocusedValueChangeRef.current?.(calendarDateToLocalDate(value))
  }, [])

  // Memoize so AriaRangeCalendar receives stable object references when dates haven't changed.
  // Recreating CalendarDate objects every render triggers react-aria's internal effects every
  // render → setState every render → "Maximum update depth exceeded".
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const calendarValue = React.useMemo(
    () => convertToRangeValue(value),
    [value?.start?.getTime(), value?.end?.getTime()]
  )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const calendarFocusedValue = React.useMemo(
    () =>
      focusedValue ? parseDate(format(focusedValue, "yyyy-MM-dd")) : undefined,
    [focusedValue?.getTime()]
  )

  return (
    <AriaRangeCalendar
      focusedValue={calendarFocusedValue}
      value={calendarValue}
      onFocusChange={onFocusChange}
      onChange={onChange}
      className={cn("w-[328px] py-5 px-6", className)}
    >
      <header className="flex justify-between items-center">
        <IconButton
          className="rounded-lg"
          visual="gray"
          variant="ghost"
          asChild
        >
          <AriaButton slot="previous">
            <ChevronLeft className="h-5 text-gray-500 w-5" />
          </AriaButton>
        </IconButton>
        <Heading className="text-base leading-6 text-gray-700 font-semibold" />
        <IconButton
          className="rounded-lg"
          visual="gray"
          variant="ghost"
          asChild
        >
          <AriaButton slot="next">
            <ChevronRight className="h-5 text-gray-500 w-5" />
          </AriaButton>
        </IconButton>
      </header>

      <CalendarGrid className="mt-3 border-separate border-spacing-y-1">
        <CalendarGridHeader className="[&_th]:p-0">
          {(day) => (
            <CalendarHeaderCell className="h-10 w-10 p-0 text-sm font-medium text-gray-700">
              {day}
            </CalendarHeaderCell>
          )}
        </CalendarGridHeader>
        <CalendarGridBody className="mt-1 [&_td]:p-0">
          {(date) => (
            <CalendarCell
              className="h-10 w-10 rounded-full transition-all duration-150 ease-out data-[selected]:bg-gray-50 data-[selected]:data-[today]:bg-gray-50 data-[selected]:rounded-none data-[selected]:data-[selection-start]:rounded-full data-[selected]:data-[selection-end]:rounded-full focus-visible:outline-none data-[focus-visible]:outline-none inline-flex data-[hovered]:bg-gray-50 data-[outside-month]:text-gray-500 data-[disabled]:text-gray-500 data-[disabled]:bg-transparent items-center justify-center data-[selected]:data-[selection-start]:bg-primary-500 data-[selected]:data-[selection-end]:bg-primary-500 data-[selected]:data-[hovered]:data-[selection-start]:bg-primary-600 data-[selected]:data-[hovered]:data-[selection-end]:bg-primary-600 data-[selected]:data-[selection-start]:text-white data-[selected]:data-[selection-end]:text-white text-sm text-gray-700 data-[today]:bg-gray-100 data-[hovered]:font-medium data-[today]:data-[selected]:data-[selection-start]:bg-primary-500 data-[today]:data-[selected]:data-[hovered]:data-[selection-start]:bg-primary-600 data-[today]:data-[selected]:data-[selection-end]:bg-primary-500 data-[today]:data-[selected]:data-[hovered]:data-[selection-end]:bg-primary-600"
              date={date}
            />
          )}
        </CalendarGridBody>
      </CalendarGrid>
    </AriaRangeCalendar>
  )
}

const RANGE_CELL_CLASS =
  "h-10 w-10 rounded-full transition-all duration-150 ease-out data-[selected]:bg-gray-50 data-[selected]:data-[today]:bg-gray-50 data-[selected]:rounded-none data-[selected]:data-[selection-start]:rounded-full data-[selected]:data-[selection-end]:rounded-full focus-visible:outline-none data-[focus-visible]:outline-none inline-flex data-[hovered]:bg-gray-50 data-[outside-month]:text-gray-500 data-[disabled]:text-gray-500 data-[disabled]:bg-transparent items-center justify-center data-[selected]:data-[selection-start]:bg-primary-500 data-[selected]:data-[selection-end]:bg-primary-500 data-[selected]:data-[hovered]:data-[selection-start]:bg-primary-600 data-[selected]:data-[hovered]:data-[selection-end]:bg-primary-600 data-[selected]:data-[selection-start]:text-white data-[selected]:data-[selection-end]:text-white text-sm text-gray-700 data-[today]:bg-gray-100 data-[hovered]:font-medium data-[today]:data-[selected]:data-[selection-start]:bg-primary-500 data-[today]:data-[selected]:data-[hovered]:data-[selection-start]:bg-primary-600 data-[today]:data-[selected]:data-[selection-end]:bg-primary-500 data-[today]:data-[selected]:data-[hovered]:data-[selection-end]:bg-primary-600"

const DualCalendar = ({
  left,
  focusedValue,
  onFocusedValueChange,
  value,
  onValueChange,
  onCancel,
  onApply,
}: {
  left?: () => React.ReactNode
  focusedValue?: Date
  onFocusedValueChange?: (value: Date) => void
  value?: RangeValue
  onValueChange?: (value: RangeValue) => void
  onCancel?: () => void
  onApply?: (value: RangeValue | undefined) => void
}) => {
  const [date, setDate] = React.useState<{
    start: string
    end: string
  }>({
    start: "",
    end: "",
  })
  // Plain useState — not useControllableState. Using useControllableState with a
  // `value` prop (controlled mode) puts `value` in useCallbackRef deps, causing setState
  // to get a new identity on every parent re-render, which makes AriaRangeCalendar
  // re-fire onChange, creating an infinite loop.
  const [state, setState] = React.useState<RangeValue | undefined>(value)

  React.useEffect(() => {
    const nextKey = rangeDayKey(value)
    setState((prev) => (rangeDayKey(prev) === nextKey ? prev : value))
    setDate({
      start:
        value?.start && isValid(value.start)
          ? format(value.start, "LLL d, yyyy")
          : "",
      end:
        value?.end && isValid(value.end)
          ? format(value.end, "LLL d, yyyy")
          : "",
    })
  }, [rangeDayKey(value)])

  const onValueChangeRef = React.useRef(onValueChange)
  onValueChangeRef.current = onValueChange
  const stateRef = React.useRef(state)
  stateRef.current = state

  const handleSelectionChange = React.useCallback((newValue: RangeValue) => {
    const nextKey = rangeDayKey(newValue)
    if (rangeDayKey(stateRef.current) === nextKey) return
    setState(newValue)
    setDate({
      end: format(newValue.end, "LLL d, yyyy"),
      start: format(newValue.start, "LLL d, yyyy"),
    })
    onValueChangeRef.current?.(newValue)
  }, [])

  // Single AriaRangeCalendar with visibleDuration={{ months: 2 }} — react-aria manages
  // focus internally (uncontrolled). Changing `value` auto-navigates the calendar to show
  // the range, so sidebar presets work without controlling focusedValue.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const calendarValue = React.useMemo(
    () => (state ? convertToRangeValue(state) : undefined),
    [state?.start?.getTime(), state?.end?.getTime()]
  )

  const handleAriaChange = React.useCallback(
    (val: RangeValue<CalendarDate> | null) => {
      if (!val) return
      handleSelectionChange({
        start: calendarDateToLocalDate(val.start),
        end: calendarDateToLocalDate(val.end),
      })
    },
    [handleSelectionChange]
  )

  const onStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { target } = event
    const { value } = target
    setDate((prev) => ({
      ...prev,
      start: value,
    }))

    const parsedEndDate = parse(date.end, "LLL d, yyyy", new Date())
    if (!isValid(parsedEndDate)) return

    const parsedStartDate = parse(value, "LLL d, yyyy", new Date())
    if (isValid(parsedStartDate)) {
      handleSelectionChange({
        start: parsedStartDate,
        end: parsedEndDate,
      })
    }
  }

  const onEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const parsedStartDate = parse(date.start, "LLL d, yyyy", new Date())
    if (!isValid(parsedStartDate)) return

    const { target } = event
    const { value } = target

    setDate((prev) => ({
      ...prev,
      end: value,
    }))

    const parsedEndDate = parse(value, "LLL d, yyyy", new Date())
    if (isValid(parsedEndDate)) {
      handleSelectionChange({
        start: parsedStartDate,
        end: parsedEndDate,
      })
    }
  }

  return (
    <div className="shadow-xl h-[464px] inline-flex border bg-white rounded-lg">
      {left?.()}
      <div className="flex-none flex flex-col">
        <AriaRangeCalendar
          visibleDuration={{ months: 2 }}
          value={calendarValue}
          onChange={handleAriaChange}
          className="flex-1"
        >
          <header className="flex justify-between items-center px-6 pt-5">
            <IconButton
              className="rounded-lg"
              visual="gray"
              variant="ghost"
              asChild
            >
              <AriaButton slot="previous">
                <ChevronLeft className="h-5 text-gray-500 w-5" />
              </AriaButton>
            </IconButton>
            <Heading className="text-base leading-6 text-gray-700 font-semibold" />
            <IconButton
              className="rounded-lg"
              visual="gray"
              variant="ghost"
              asChild
            >
              <AriaButton slot="next">
                <ChevronRight className="h-5 text-gray-500 w-5" />
              </AriaButton>
            </IconButton>
          </header>

          <div className="flex">
            <div className="w-[328px] px-6 pb-5">
              <CalendarGrid className="mt-3 border-separate border-spacing-y-1">
                <CalendarGridHeader className="[&_th]:p-0">
                  {(day) => (
                    <CalendarHeaderCell className="h-10 w-10 p-0 text-sm font-medium text-gray-700">
                      {day}
                    </CalendarHeaderCell>
                  )}
                </CalendarGridHeader>
                <CalendarGridBody className="mt-1 [&_td]:p-0">
                  {(date) => (
                    <CalendarCell className={RANGE_CELL_CLASS} date={date} />
                  )}
                </CalendarGridBody>
              </CalendarGrid>
            </div>
            <div className="w-[328px] px-6 pb-5 border-l border-gray-200">
              <CalendarGrid offset={{ months: 1 }} className="mt-3 border-separate border-spacing-y-1">
                <CalendarGridHeader className="[&_th]:p-0">
                  {(day) => (
                    <CalendarHeaderCell className="h-10 w-10 p-0 text-sm font-medium text-gray-700">
                      {day}
                    </CalendarHeaderCell>
                  )}
                </CalendarGridHeader>
                <CalendarGridBody className="mt-1 [&_td]:p-0">
                  {(date) => (
                    <CalendarCell className={RANGE_CELL_CLASS} date={date} />
                  )}
                </CalendarGridBody>
              </CalendarGrid>
            </div>
          </div>
        </AriaRangeCalendar>

        <div className="border-t flex items-center justify-between px-4 h-[72px] border-gray-200">
          <div className="inline-flex items-center gap-x-3">
            <Input
              className="h-10 text-gray-900 w-[136px]"
              value={date.start}
              onChange={onStartDateChange}
            />
            <span className="inline-block text-base text-gray-500">–</span>
            <Input
              className="h-10 text-gray-900 w-[136px]"
              value={date.end}
              onChange={onEndDateChange}
            />
          </div>

          <div className="inline-flex items-center gap-x-3">
            <Button
              type="button"
              size="md"
              variant="outlined"
              visual="gray"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button type="button" size="md" onClick={() => onApply?.(state)}>
              Apply
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const Sidebar = ({
  value,
  onValueChange,
}: {
  value?: string
  onValueChange?: (value: string) => void
}) => {
  return (
    <RadioGroup
      value={value}
      onValueChange={onValueChange}
      className="py-3 flex flex-col flex-none w-[192px] border-r border-gray-200 px-4"
    >
      <RadioGroupItem
        value="today"
        className="focus:outline-none rounded-md flex items-center py-2.5 text-sm data-[state=checked]:bg-gray-50 hover:bg-gray-100 font-medium text-gray-700 px-4"
      >
        Today
      </RadioGroupItem>
      <RadioGroupItem
        value="yesterday"
        className="focus:outline-none rounded-md flex items-center py-2.5 text-sm data-[state=checked]:bg-gray-50 hover:bg-gray-100 font-medium text-gray-700 px-4"
      >
        Yesterday
      </RadioGroupItem>
      <RadioGroupItem
        value="this week"
        className="focus:outline-none rounded-md flex items-center py-2.5 text-sm data-[state=checked]:bg-gray-50 hover:bg-gray-100 font-medium text-gray-700 px-4"
      >
        This week
      </RadioGroupItem>
      <RadioGroupItem
        value="last week"
        className="focus:outline-none rounded-md flex items-center py-2.5 text-sm data-[state=checked]:bg-gray-50 hover:bg-gray-100 font-medium text-gray-700 px-4"
      >
        Last week
      </RadioGroupItem>
      <RadioGroupItem
        value="this month"
        className="focus:outline-none rounded-md flex items-center py-2.5 text-sm data-[state=checked]:bg-gray-50 hover:bg-gray-100 font-medium text-gray-700 px-4"
      >
        This month
      </RadioGroupItem>
      <RadioGroupItem
        value="last month"
        className="focus:outline-none rounded-md flex items-center py-2.5 text-sm data-[state=checked]:bg-gray-50 hover:bg-gray-100 font-medium text-gray-700 px-4"
      >
        Last month
      </RadioGroupItem>
      <RadioGroupItem
        value="this year"
        className="focus:outline-none rounded-md flex items-center py-2.5 text-sm data-[state=checked]:bg-gray-50 hover:bg-gray-100 font-medium text-gray-700 px-4"
      >
        This year
      </RadioGroupItem>
      <RadioGroupItem
        value="last year"
        className="focus:outline-none rounded-md flex items-center py-2.5 text-sm data-[state=checked]:bg-gray-50 hover:bg-gray-100 font-medium text-gray-700 px-4"
      >
        Last year
      </RadioGroupItem>
      <RadioGroupItem
        value="all time"
        className="focus:outline-none rounded-md flex items-center py-2.5 text-sm data-[state=checked]:bg-gray-50 hover:bg-gray-100 font-medium text-gray-700 px-4"
      >
        All time
      </RadioGroupItem>
      <RadioGroupItem
        value="custom range"
        className="focus:outline-none rounded-md flex items-center py-2.5 text-sm data-[state=checked]:bg-gray-50 hover:bg-gray-100 font-medium text-gray-700 px-4"
      >
        Custom range
      </RadioGroupItem>
    </RadioGroup>
  )
}

function startOfLocalDay(d: Date) {
  const next = new Date(d)
  next.setHours(0, 0, 0, 0)
  return next
}

function rangeForSidebarPreset(preset: string): RangeValue | undefined {
  const today = startOfLocalDay(new Date())
  switch (preset) {
    case "today":
      return { start: today, end: today }
    case "yesterday": {
      const y = subDays(today, 1)
      return { start: y, end: y }
    }
    case "this week":
      return { start: startOfWeek(today), end: today }
    case "last week": {
      const last = subWeeks(today, 1)
      return { start: startOfWeek(last), end: endOfWeek(last) }
    }
    case "this month":
      return { start: startOfMonth(today), end: today }
    case "last month": {
      const last = subMonths(today, 1)
      return { start: startOfMonth(last), end: endOfMonth(last) }
    }
    case "this year":
      return { start: startOfYear(today), end: today }
    case "last year": {
      const last = subYears(today, 1)
      return { start: startOfYear(last), end: endOfYear(last) }
    }
    default:
      return undefined
  }
}

const DoubleCalendar = ({
  value,
  onValueChange,
  focusedValue,
  onFocusedValueChange,
  preset,
  onPresetChange,
  onCancel,
  onApply,
}: {
  value?: RangeValue
  onValueChange?: (value: RangeValue) => void
  focusedValue?: Date
  onFocusedValueChange?: (value: Date | undefined) => void
  preset?: string
  onPresetChange?: (value: string) => void
  onCancel?: () => void
  onApply?: (value: RangeValue | undefined, preset: string) => void
}) => {
  const [focusedValueState, setFocusedValueState] = useControllableState<
    Date | undefined
  >({
    value: focusedValue,
    onChange: onFocusedValueChange,
  })
  const [presetState, setPresetState] = React.useState(preset ?? "all time")
  const [rangeState, setRangeState] = React.useState<RangeValue | undefined>(
    value ?? rangeForSidebarPreset(preset ?? "all time")
  )

  const handlePreset = (next: string) => {
    setPresetState(next)
    onPresetChange?.(next)
    if (next === "custom range") return
    const computed = rangeForSidebarPreset(next)
    setRangeState(computed)
    if (computed) {
      onValueChange?.(computed)
      setFocusedValueState(computed.start)
    }
  }

  const handleRange = (next: RangeValue) => {
    setRangeState((prev) => {
      if (rangeDayKey(prev) === rangeDayKey(next)) return prev
      setPresetState("custom range")
      onPresetChange?.("custom range")
      onValueChange?.(next)
      return next
    })
  }

  return (
    <DualCalendar
      focusedValue={focusedValueState}
      onFocusedValueChange={setFocusedValueState}
      value={rangeState}
      onValueChange={handleRange}
      onCancel={onCancel}
      onApply={() =>
        onApply?.(
          presetState === "all time" ? undefined : rangeState,
          presetState
        )
      }
      left={() => (
        <Sidebar value={presetState} onValueChange={handlePreset} />
      )}
    />
  )
}

const DateRangeCalendar = ({
  onFocusedValueChange,
  focusedValue,
  value,
  onValueChange,
  className,
}: {
  onFocusedValueChange?: (value: Date) => void
  focusedValue?: Date
  value?: RangeValue
  onValueChange?: (value: RangeValue) => void
  className?: string
}) => {
  const [date, setDate] = React.useState<{
    start: string
    end: string
  }>({
    start: "",
    end: "",
  })
  const [focusedValueState, setFocusedValueState] = useControllableState<
    Date | undefined
  >({
    value: focusedValue,
    onChange: (value) => {
      if (value) {
        onFocusedValueChange?.(value)
      }
    },
  })
  const [state, setState] = useControllableState<RangeValue | undefined>({
    value,
    onChange: (value) => {
      if (value) {
        onValueChange?.(value)
        setDate({
          end: format(value.end, "LLL d, yyyy"),
          start: format(value.start, "LLL d, yyyy"),
        })
      }
    },
  })

  const onFocusChange = (value: CalendarDate) => {
    const date = new Date(value.toString())
    setFocusedValueState(date)
  }

  const onChange = (value: RangeValue<CalendarDate> | null) => {
    if (!value) return

    const rangeValue = {
      start: new Date(value.start.toString()),
      end: new Date(value.end.toString()),
    }
    setState(rangeValue)
  }

  const onStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { target } = event
    const { value } = target
    setDate((prev) => ({
      ...prev,
      start: value,
    }))

    const parsedEndDate = parse(date.end, "LLL d, yyyy", new Date())
    if (!isValid(parsedEndDate)) return

    const parsedStartDate = parse(value, "LLL d, yyyy", new Date())
    if (isValid(parsedStartDate)) {
      const nextState = {
        start: parsedStartDate,
        end: parsedEndDate,
      }
      setState(nextState)
      setFocusedValueState(nextState.start)
    }
  }

  const onEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const parsedStartDate = parse(date.start, "LLL d, yyyy", new Date())
    if (!isValid(parsedStartDate)) return

    const { target } = event
    const { value } = target

    setDate((prev) => ({
      ...prev,
      end: value,
    }))

    const parsedEndDate = parse(value, "LLL d, yyyy", new Date())
    if (isValid(parsedEndDate)) {
      const nextState = {
        start: parsedStartDate,
        end: parsedEndDate,
      }
      setState(nextState)
      setFocusedValueState(nextState.end)
    }
  }

  return (
    <div className="shadow-lg inline-block bg-white rounded-lg">
      <AriaRangeCalendar
        focusedValue={
          focusedValueState
            ? parseDate(format(focusedValueState, "yyyy-MM-dd"))
            : undefined
        }
        value={convertToRangeValue(state)}
        onFocusChange={onFocusChange}
        onChange={onChange}
        className={cn("w-[328px] py-5 px-6", className)}
      >
        <header className="flex justify-between items-center">
          <IconButton
            className="rounded-lg"
            visual="gray"
            variant="ghost"
            asChild
          >
            <AriaButton slot="previous">
              <ChevronLeft className="h-5 text-gray-500 w-5" />
            </AriaButton>
          </IconButton>
          <Heading className="text-base leading-6 text-gray-700 font-semibold" />
          <IconButton
            className="rounded-lg"
            visual="gray"
            variant="ghost"
            asChild
          >
            <AriaButton slot="next">
              <ChevronRight className="h-5 text-gray-500 w-5" />
            </AriaButton>
          </IconButton>
        </header>

        <div className="mt-3 flex items-center gap-x-2">
          <Input
            className="h-10 flex-grow"
            value={date.start}
            onChange={onStartDateChange}
            defaultValue="Jan, 9 2020"
          />
          <span className="text-base flex-none text-gray-500">–</span>
          <Input
            className="h-10 flex-grow"
            value={date.end}
            onChange={onEndDateChange}
            defaultValue="Jan, 9 2020"
          />
        </div>

        <CalendarGrid className="mt-3 border-separate border-spacing-y-1">
          <CalendarGridHeader className="[&_th]:p-0">
            {(day) => (
              <CalendarHeaderCell className="h-10 w-10 p-0 text-sm font-medium text-gray-700">
                {day}
              </CalendarHeaderCell>
            )}
          </CalendarGridHeader>
          <CalendarGridBody className="mt-1 [&_td]:p-0">
            {(date) => (
              <CalendarCell
                className="h-10 w-10 rounded-full transition-all duration-150 ease-out data-[selected]:bg-gray-50 data-[selected]:rounded-none data-[selected]:data-[selection-start]:rounded-full data-[selected]:data-[selection-end]:rounded-full focus-visible:outline-none data-[focus-visible]:outline-none inline-flex data-[hovered]:bg-gray-50 data-[outside-month]:text-gray-500 data-[disabled]:text-gray-500 data-[disabled]:bg-transparent items-center justify-center data-[selected]:data-[selection-start]:bg-primary-500 data-[selected]:data-[selection-end]:bg-primary-500 data-[selected]:data-[hovered]:data-[selection-start]:bg-primary-600 data-[selected]:data-[hovered]:data-[selection-end]:bg-primary-600 data-[selected]:data-[selection-start]:text-white data-[selected]:data-[selection-end]:text-white text-sm text-gray-700 data-[today]:bg-gray-100 data-[hovered]:font-medium data-[today]:data-[selected]:data-[selection-start]:bg-primary-500 data-[today]:data-[selected]:data-[hovered]:data-[selection-start]:bg-primary-600 data-[today]:data-[selected]:data-[selection-end]:bg-primary-500 data-[today]:data-[selected]:data-[hovered]:data-[selection-end]:bg-primary-600"
                date={date}
              />
            )}
          </CalendarGridBody>
        </CalendarGrid>
      </AriaRangeCalendar>

      <div className="border-t gap-x-3 grid-cols-2 grid p-4">
        <Button variant="outlined" visual="gray" size="md">
          Cancel
        </Button>
        <Button size="md">Apply</Button>
      </div>
    </div>
  )
}

export {
  Calendar,
  RangeCalendar,
  DualCalendar,
  DoubleCalendar,
  DateRangeCalendar,
}
