import React, { useState } from "react"
import { Check1, ChevronDown, SearchMd } from "@blend-metrics/icons"
import { Meta } from "@storybook/react"
import {
  DropdownCommand,
  DropdownCommandEmpty,
  DropdownCommandGroup,
  DropdownCommandInput,
  DropdownCommandItem,
  DropdownPopover,
  DropdownPopoverContent,
  DropdownPopoverTrigger,
  InputGroup,
  InputLeftElement,
} from "@/components/ui"

const meta: Meta = {
  title: "Dropdown",
}

export default meta

const frameworks = [
  {
    value: "next.js",
    label: "Next.js",
  },
  {
    value: "sveltekit",
    label: "SvelteKit",
  },
  {
    value: "nuxt.js",
    label: "Nuxt.js",
  },
  {
    value: "remix",
    label: "Remix",
  },
  {
    value: "astro",
    label: "Astro",
  },
]

export const Default = () => {
  const [selected, setSelected] = useState<{ value: string; label: string }>()

  return (
    <DropdownPopover selected={selected} onSelectedChange={setSelected}>
      <DropdownPopoverTrigger>
        {selected ? (
          selected.label
        ) : (
          <span className="text-gray-400">Select a tag</span>
        )}
        <ChevronDown className="ml-auto h-5 w-5 text-gray-500" />
      </DropdownPopoverTrigger>
      <DropdownPopoverContent>
        <DropdownCommand className="overflow-hidden">
          <InputGroup>
            <InputLeftElement className="w-8">
              <SearchMd className="h-[15] w-[15] text-gray-500" />
            </InputLeftElement>
            <DropdownCommandInput placeholder="Search..." className="pl-8" />
          </InputGroup>

          <DropdownCommandEmpty className="text-sm text-gray-900">
            No framework found.
          </DropdownCommandEmpty>
          <DropdownCommandGroup>
            {frameworks.map((framework) => (
              <DropdownCommandItem key={framework.value} itemValue={framework}>
                {framework.label}
                <Check1 className="ml-auto text-primary-500 opacity-0 group-data-[state=selected]:opacity-100" />
              </DropdownCommandItem>
            ))}
          </DropdownCommandGroup>
        </DropdownCommand>
      </DropdownPopoverContent>
    </DropdownPopover>
  )
}

export const Multiple = () => {
  const [selected, setSelected] = useState<{ label: string; value: string }[]>(
    []
  )

  return (
    <DropdownPopover
      selected={selected}
      onSelectedChange={setSelected}
      multiple
    >
      <DropdownPopoverTrigger>
        <span className="text-gray-400">Select a tag</span>
        <ChevronDown className="ml-auto h-5 w-5 text-gray-500" />
      </DropdownPopoverTrigger>
      <DropdownPopoverContent>
        <DropdownCommand className="overflow-hidden">
          <InputGroup>
            <InputLeftElement className="w-8">
              <SearchMd className="h-[15] w-[15] text-gray-500" />
            </InputLeftElement>
            <DropdownCommandInput placeholder="Search..." className="pl-8" />
          </InputGroup>

          <DropdownCommandEmpty className="text-sm text-gray-900">
            No framework found.
          </DropdownCommandEmpty>
          <DropdownCommandGroup>
            {frameworks.map((framework) => (
              <DropdownCommandItem key={framework.value} itemValue={framework}>
                {framework.label}
                <Check1 className="ml-auto text-primary-500 opacity-0 group-data-[state=selected]:opacity-100" />
              </DropdownCommandItem>
            ))}
          </DropdownCommandGroup>
        </DropdownCommand>
      </DropdownPopoverContent>
    </DropdownPopover>
  )
}
