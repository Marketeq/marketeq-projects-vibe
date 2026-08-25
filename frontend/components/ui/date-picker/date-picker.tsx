"use client"

import * as React from "react"
import { preventDefault } from "@/utils/dom-utils"
import { cn } from "@/utils/functions"
import { useControllableState, useToggle } from "@/utils/hooks"
import { Calendar as CalendarLineIcon, ChevronDown } from "@blend-metrics/icons"
import { format } from "date-fns"
import {
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
} from "@/components/ui"

const DatePicker = ({
  value,
  onValueChange,
  placeholder,
  inputClassName,
  indicator = <CalendarLineIcon className="h-5 w-5 text-gray-700" />,
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
  const [isOpen, { toggle, off }] = useToggle()

  const onSelect = (value: Date) => {
    setDate(value)
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
          rightIcon={<ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />}
        >
          <span className="inline-flex items-center gap-x-2">
            {indicator}
            {date ? (
              format(date, "LLL d, yyyy")
            ) : (
              <span className="text-gray-500">
                {placeholder ? placeholder : "Select a date"}
              </span>
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[330px] shadow-xl border border-gray-100 bg-white"
        collisionPadding={16}
        onOpenAutoFocus={preventDefault}
      >
        <ScrollArea
          viewportStyle={{
            maxHeight:
              "var(--radix-popover-content-available-height, var(--radix-popper-available-height))",
          }}
        >
          <Calendar
            className="shadow-none border-none"
            value={date}
            onValueChange={onSelect}
          />
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
