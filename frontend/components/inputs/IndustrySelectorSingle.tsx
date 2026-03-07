import React, { useEffect, useState } from "react"
import industries from "@/public/mock/industries.json"
import { useControllableState } from "@/utils/hooks"
import {
  categoryCheck,
  formatCheck,
  profanityCheck,
  spellCheck,
  submitTextToModerationQueue,
} from "@/utils/jobTitleValidation"
import Fuse from "fuse.js"
import {
  Badge,
  Combobox,
  ComboboxInput,
  ComboboxLabel,
  ComboboxOption,
  ComboboxOptions,
  ComboboxTrigger,
  ScaleOutIn,
  ScrollArea,
} from "@/components/ui"

interface Props {
  value?: string
  onValueChange?: (val: string) => void
  invalid?: boolean
}

const defaultIndustryLabels = industries.map((industry) => industry.label)

export const IndustrySelectorSingle = ({
  value,
  onValueChange,
  invalid,
}: Props) => {
  const [inputValue, setInputValue] = useState("")
  const [open, setOpen] = useState(false)

  const [selected, setSelected] = useControllableState<string>({
    defaultValue: "",
    value,
    onChange: onValueChange,
  })

  const [industryLabels, setIndustryLabels] = useState<string[]>([])

  useEffect(() => {
    const loadIndustries = async () => {
      try {
        const res = await fetch(
          "http://localhost:3000/talent/autocomplete?type=industry"
        )
        const data = await res.json()
        const dynamic = data.map((entry: any) => entry.value)
        const combined = Array.from(
          new Set([...defaultIndustryLabels, ...dynamic])
        ).sort((a, b) => a.localeCompare(b))
        setIndustryLabels(combined)
      } catch (err) {
        console.error("❌ Failed to load industries:", err)
        setIndustryLabels(defaultIndustryLabels)
      }
    }

    loadIndustries()
  }, [])

  const fuse = new Fuse(industryLabels, {
    includeScore: true,
    threshold: 0.3,
  })

  const filtered = inputValue
    ? fuse
        .search(inputValue)
        .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
        .map((r) => r.item)
    : industryLabels

  return (
    <div className="space-y-3">
      <Combobox value={selected} onChange={setSelected}>
        <ComboboxTrigger className="flex flex-col gap-y-1.5 w-full">
          <ComboboxLabel size="sm" className="text-dark-blue-400">
            What&apos;s your Industry?
          </ComboboxLabel>
          <ComboboxInput
            size="lg"
            className="h-[48px] w-full px-3.5 text-base rounded-md border border-gray-300 focus:ring-1 focus:ring-primary-500 focus:outline-none"
            placeholder="Enter your industry (e.g. Technology, Healthcare, Retail)"
            value={inputValue}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setInputValue(e.target.value)
              setOpen(true)
            }}
            onKeyDown={async (e) => {
              if (e.key === "Tab" || e.key === "Enter") {
                if (!industryLabels.includes(inputValue)) {
                  const isValid =
                    (await spellCheck(inputValue)) &&
                    profanityCheck(inputValue) &&
                    formatCheck(inputValue) &&
                    categoryCheck(inputValue)

                  if (isValid) {
                    console.log("🚀 Submitting industry:", inputValue)
                    await submitTextToModerationQueue(inputValue, "industry")
                  } else {
                    console.warn("❌ Rejected industry:", inputValue)
                  }
                }
              }
            }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            invalid={invalid}
          />
        </ComboboxTrigger>

        <ScaleOutIn show={open} afterLeave={() => setInputValue("")}>
          <ComboboxOptions>
            <ScrollArea viewportClassName="max-h-[304px]">
              {filtered.map((industry, index) => (
                <ComboboxOption key={index} value={industry}>
                  {industry}
                </ComboboxOption>
              ))}
            </ScrollArea>
          </ComboboxOptions>
        </ScaleOutIn>
      </Combobox>

      {selected && (
        <div className="flex flex-wrap gap-3">
          <Badge visual="primary">
            {selected}
            <button
              className="focus-visible:outline-none"
              onClick={() => setSelected("")}
              type="button"
            >
              ×
            </button>
          </Badge>
        </div>
      )}
    </div>
  )
}
