"use client"

import * as React from "react"
import { preventDefault } from "@/utils/dom-utils"
import { cn } from "@/utils/functions"
import { useControllableState, useToggle } from "@/utils/hooks"
import { CalendarPlus01 } from "@blend-metrics/icons"
import { format } from "date-fns"
import {
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui"

const DatePicker = ({
  value,
  onValueChange,
  placeholder,
  inputClassName,
  indicator = <CalendarPlus01 className="h-5 w-5 text-gray-700" />,
}: {
  value?: Date
  onValueChange?: (value: Date) => void
  placeholder?: string
  inputClassName?: string
  indicator?: React.ReactNode
}) => {
  const [date, setDate] = useControllableState({
    value,
    onChange: onValueChange,
  })
  const [state, setState] = React.useState<Date>(new Date())
  const [isOpen, { toggle, off }] = useToggle()

  const onApply = () => {
    if (state) {
      setDate(state)
    }
    off()
  }

  return (
    <Popover open={isOpen} onOpenChange={toggle}>
      <PopoverTrigger asChild>
        <Button
          className={cn(
            "gap-x-2 text-gray-700 items-center inline-flex",
            inputClassName
          )}
          size="md"
          variant="outlined"
          visual="gray"
        >
          {indicator}
          {date ? (
            format(date, "LLL d, yyyy")
          ) : (
            <span className="text-gray-500">
              {placeholder ? placeholder : "Select a date"}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[330px] shadow-xl border border-gray-100 bg-white"
        onOpenAutoFocus={preventDefault}
      >
        <Calendar
          className="shadow-none border-none"
          value={state}
          onValueChange={setState}
        />
        <div className="grid grid-cols-2 gap-x-3 border-t border-gray-200 p-4">
          <Button variant="outlined" visual="gray" onClick={off}>
            Cancel
          </Button>
          <Button onClick={onApply}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
