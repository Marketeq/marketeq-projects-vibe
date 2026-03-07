// components/ui/location-autocomplete.tsx
import React, { useState } from "react"
import { getIsNotEmpty } from "@/utils/functions"
import { useLocationSearch } from "@/utils/useLocationSearch"
import {
  Combobox,
  ComboboxInput,
  ComboboxLabel,
  ComboboxOption,
  ComboboxOptions,
  ComboboxTrigger,
  ScaleOutIn,
  ScrollArea,
} from "@/components/ui"

export const LocationAutocomplete = ({
  value,
  onValueChange,
  invalid,
}: {
  value?: string
  onValueChange?: (val: string) => void
  invalid?: boolean
}) => {
  const [inputValue, setInputValue] = useState("")
  const [open, setOpen] = useState(false)

  const { results } = useLocationSearch(inputValue)

  return (
    <Combobox
      value={value}
      onChange={(val) => {
        onValueChange?.(val)
        setOpen(false)
      }}
    >
      <ComboboxTrigger className="flex flex-col gap-y-1.5">
        <ComboboxLabel size="sm" className="text-dark-blue-400">
          What’s your location?
        </ComboboxLabel>
        <ComboboxInput
          size="lg"
          className="pl-3.5"
          placeholder="Enter your city or town"
          value={inputValue}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setInputValue(e.target.value)
            setOpen(true)
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          invalid={invalid}
        />
      </ComboboxTrigger>

      <ScaleOutIn show={open}>
        <ComboboxOptions>
          <ScrollArea viewportClassName="max-h-[300px]">
            {results.map((place, idx) => (
              <ComboboxOption key={idx} value={place}>
                {place}
              </ComboboxOption>
            ))}
          </ScrollArea>
        </ComboboxOptions>
      </ScaleOutIn>
    </Combobox>
  )
}
