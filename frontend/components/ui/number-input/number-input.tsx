"use client"

import * as React from "react"
import { cn, toString } from "@/utils/functions"
import { ChevronDown, ChevronUp } from "@blend-metrics/icons"
import * as numberInput from "@zag-js/number-input"
import { normalizeProps, useMachine } from "@zag-js/react"
import { WithoutRef } from "@/types/react"
import { Input, InputRightElement } from "../input"
import { InputGroup } from "../input-group"

export function NumberInput({
  onValueChange,
  value,
  header,
  max,
  min,
  placeholder,
  groupClassName,
  className,
}: {
  onValueChange?: (value: number) => void
  value?: number
  header?: (
    props: WithoutRef<
      React.DetailedHTMLProps<
        React.LabelHTMLAttributes<HTMLLabelElement>,
        HTMLLabelElement
      >
    >
  ) => React.ReactNode
  min?: number
  max?: number
  placeholder?: string
  groupClassName?: string
  className?: string
}) {
  const service = useMachine(numberInput.machine, {
    id: React.useId(),
    min,
    max,
    value: toString(value),
    onValueChange: (details) => {
      const { valueAsNumber } = details
      onValueChange?.(valueAsNumber)
    },
  })

  const api = numberInput.connect(service, normalizeProps)

  return (
    <>
      {header?.(api.getLabelProps())}
      <InputGroup className={groupClassName} {...api.getRootProps()}>
        <Input
          className={cn("pr-7", className)}
          placeholder={placeholder}
          {...api.getInputProps()}
        />
        <InputRightElement className="inset-y-0.5 w-7 flex-col justify-between">
          <button
            className="flex-none rounded-sm bg-gray-100 px-1.5 py-1 focus-visible:outline-none"
            {...api.getDecrementTriggerProps()}
          >
            <ChevronDown className="h-2.5 w-2.5 text-gray-500" />
          </button>
          <button
            className="flex-none rounded-sm bg-gray-100 px-1.5 py-1 focus-visible:outline-none"
            {...api.getIncrementTriggerProps()}
          >
            <ChevronUp className="h-2.5 w-2.5 text-gray-500" />
          </button>
        </InputRightElement>
      </InputGroup>
    </>
  )
}
