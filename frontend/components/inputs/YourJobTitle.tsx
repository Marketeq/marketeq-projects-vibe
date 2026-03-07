import React, { useEffect, useState } from "react"
import jobTitles from "@/public/mock/job_titles.json"
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

// Static fallback

interface Props {
  value?: string
  onValueChange?: (val: string) => void
  invalid?: boolean
}

const defaultJobTitleLabels = jobTitles.map((title) => title.label)

export const YourJobTitle = ({ value, onValueChange, invalid }: Props) => {
  const [inputValue, setInputValue] = useState("")
  const [open, setOpen] = useState(false)

  const [selected, setSelected] = useControllableState<string>({
    defaultValue: "",
    value,
    onChange: onValueChange,
  })

  const [jobTitleLabels, setJobTitleLabels] = useState<string[]>([])

  useEffect(() => {
    const loadJobTitles = async () => {
      try {
        const res = await fetch(
          "http://localhost:3002/talent/autocomplete?type=job-title"
        )
        const data = await res.json()
        const dynamic = data.map((entry: any) => entry.value)
        const combined = Array.from(
          new Set([...defaultJobTitleLabels, ...dynamic])
        ).sort((a, b) => a.localeCompare(b))
        setJobTitleLabels(combined)
      } catch (err) {
        console.error("❌ Failed to load job titles:", err)
        setJobTitleLabels(defaultJobTitleLabels)
      }
    }

    loadJobTitles()
  }, [])

  const fuse = new Fuse(jobTitleLabels, {
    includeScore: true,
    threshold: 0.3,
  })

  const filtered = inputValue
    ? fuse
        .search(inputValue)
        .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
        .map((r) => r.item)
    : jobTitleLabels

  return (
    <div className="space-y-3">
      <Combobox value={selected} onChange={setSelected}>
        <ComboboxTrigger className="flex flex-col gap-y-1.5 w-full">
          <ComboboxLabel size="sm" className="text-dark-blue-400">
            What’s your role?
          </ComboboxLabel>
          <ComboboxInput
            size="lg"
            className="pl-3.5 h-[48px] w-full text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Enter your team or company name"
            value={inputValue}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setInputValue(e.target.value)
              setOpen(true)
            }}
            onKeyDown={async (e) => {
              if (e.key === "Tab" || e.key === "Enter") {
                if (!jobTitleLabels.includes(inputValue)) {
                  const isValid =
                    (await spellCheck(inputValue)) &&
                    profanityCheck(inputValue) &&
                    formatCheck(inputValue) &&
                    categoryCheck(inputValue)

                  if (isValid) {
                    console.log("🚀 Submitting job title:", inputValue)
                    await submitTextToModerationQueue(inputValue, "job-title")
                  } else {
                    console.warn("❌ Rejected job title:", inputValue)
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
              {filtered.map((title, index) => (
                <ComboboxOption key={index} value={title}>
                  {title}
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
