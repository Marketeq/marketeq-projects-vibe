"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { useControllableState } from "@/utils/hooks"
import { ChevronLeft, ChevronRight } from "@blend-metrics/icons"
import { CalendarDate, parseDate } from "@internationalized/date"
import { RadioGroup, RadioGroupItem } from "@radix-ui/react-radio-group"
import { SelectTrigger } from "@radix-ui/react-select"
import {
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
}: {
  value?: Date
  onValueChange?: (value: Date) => void
  focusedValue?: Date
  onFocusedValueChange?: (value: Date) => void
  className?: string
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
  })
  const [state, setState] = useControllableState<Date | undefined>({
    value,
    onChange: (value) => {
      if (value) {
        onValueChange?.(value)
        setDate(format(value, "LLL d, yyyy"))
      }
    },
    defaultValue: new Date(),
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
    const date = new Date(value.toString())
    setFocusedValueState(date)
  }

  const handleChange = (value: CalendarDate) => {
    const date = new Date(value.toString())
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
              className="h-10 w-10 rounded-full p-0 focus-visible:outline-none data-[focus-visible]:outline-none inline-flex data-[hovered]:bg-gray-50 data-[outside-month]:text-gray-500 data-[disabled]:text-gray-500 data-[disabled]:bg-transparent items-center justify-center data-[selected]:bg-primary-500 data-[selected]:data-[hovered]:bg-primary-600 data-[selected]:text-white data-[selected]:data-[disabled]:bg-gray-50 data-[selected]:data-[disabled]:text-gray-500 text-sm text-gray-700 data-[today]:bg-gray-100 data-[today]:data-[selected]:bg-primary-500 data-[today]:data-[selected]:data-[hovered]:bg-primary-600 data-[today]:data-[hovered]:bg-gray-50"
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
      }
    },
  })

  const onFocusChange = (value: CalendarDate) => {
    const date = new Date(value.toString())
    setFocusedValueState(date)
  }

  const onChange = (value: RangeValue<CalendarDate> | null) => {
    if (!value) return

    const date = {
      start: new Date(value.start.toString()),
      end: new Date(value.end.toString()),
    }
    setState(date)
  }

  return (
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
              className="h-10 w-10 rounded-full data-[selected]:bg-gray-50 data-[selected]:data-[today]:bg-gray-50 data-[selected]:rounded-none data-[selected]:data-[selection-start]:rounded-full data-[selected]:data-[selection-end]:rounded-full focus-visible:outline-none data-[focus-visible]:outline-none inline-flex data-[hovered]:bg-gray-50 data-[outside-month]:text-gray-500 data-[disabled]:text-gray-500 data-[disabled]:bg-transparent items-center justify-center data-[selected]:data-[selection-start]:bg-primary-500 data-[selected]:data-[selection-end]:bg-primary-500 data-[selected]:data-[hovered]:data-[selection-start]:bg-primary-600 data-[selected]:data-[hovered]:data-[selection-end]:bg-primary-600 data-[selected]:data-[selection-start]:text-white data-[selected]:data-[selection-end]:text-white text-sm text-gray-700 data-[today]:bg-gray-100 data-[hovered]:font-medium data-[today]:data-[selected]:data-[selection-start]:bg-primary-500 data-[today]:data-[selected]:data-[hovered]:data-[selection-start]:bg-primary-600 data-[today]:data-[selected]:data-[selection-end]:bg-primary-500 data-[today]:data-[selected]:data-[hovered]:data-[selection-end]:bg-primary-600"
              date={date}
            />
          )}
        </CalendarGridBody>
      </CalendarGrid>
    </AriaRangeCalendar>
  )
}

const DualCalendar = ({
  left,
  focusedValue,
  onFocusedValueChange,
  value,
  onValueChange,
}: {
  left?: () => React.ReactNode
  focusedValue?: Date
  onFocusedValueChange?: (value: Date) => void
  value?: RangeValue
  onValueChange?: (value: RangeValue) => void
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
    <div className="shadow-xl h-[464px] inline-flex border bg-white rounded-lg">
      {left?.()}
      <div className="flex-none">
        <div className="flex h-[392px]">
          <RangeCalendar
            value={state}
            onValueChange={setState}
            focusedValue={focusedValueState}
            onFocusedValueChange={setFocusedValueState}
            className="border-r border-gray-200"
          />
          <RangeCalendar />
        </div>

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
            <Button size="md" variant="outlined" visual="gray">
              Cancel
            </Button>
            <Button size="md">Apply</Button>
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
    </RadioGroup>
  )
}

const DoubleCalendar = ({
  value,
  onValueChange,
  focusedValue,
  onFocusedValueChange,
}: {
  value?: RangeValue
  onValueChange?: (value: RangeValue) => void
  focusedValue?: Date
  onFocusedValueChange?: () => void
}) => {
  const [focusedValueState, setFocusedValueState] = useControllableState<
    Date | undefined
  >({
    value: focusedValue,
    onChange: onFocusedValueChange,
  })

  const handleChange = (value: string) => {
    const today = new Date()
    switch (value) {
      case "today":
        setFocusedValueState(today)
        break

      case "yesterday":
        setFocusedValueState(subDays(today, 1))
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

  return (
    <DualCalendar
      focusedValue={focusedValueState}
      onFocusedValueChange={setFocusedValueState}
      value={value}
      onValueChange={onValueChange}
      left={() => <Sidebar onValueChange={handleChange} />}
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
                className="h-10 w-10 rounded-full data-[selected]:bg-gray-50 data-[selected]:rounded-none data-[selected]:data-[selection-start]:rounded-full data-[selected]:data-[selection-end]:rounded-full focus-visible:outline-none data-[focus-visible]:outline-none inline-flex data-[hovered]:bg-gray-50 data-[outside-month]:text-gray-500 data-[disabled]:text-gray-500 data-[disabled]:bg-transparent items-center justify-center data-[selected]:data-[selection-start]:bg-primary-500 data-[selected]:data-[selection-end]:bg-primary-500 data-[selected]:data-[hovered]:data-[selection-start]:bg-primary-600 data-[selected]:data-[hovered]:data-[selection-end]:bg-primary-600 data-[selected]:data-[selection-start]:text-white data-[selected]:data-[selection-end]:text-white text-sm text-gray-700 data-[today]:bg-gray-100 data-[hovered]:font-medium data-[today]:data-[selected]:data-[selection-start]:bg-primary-500 data-[today]:data-[selected]:data-[hovered]:data-[selection-start]:bg-primary-600 data-[today]:data-[selected]:data-[selection-end]:bg-primary-500 data-[today]:data-[selected]:data-[hovered]:data-[selection-end]:bg-primary-600"
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
