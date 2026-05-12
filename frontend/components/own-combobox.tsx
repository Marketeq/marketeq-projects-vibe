"use client"

import * as React from "react"
import { cn } from "@/utils/functions"
import { useControllableState, useDeferredValue } from "@/utils/hooks"
import { Check, ChevronDown, SearchMd } from "@blend-metrics/icons"
import { type DialogProps } from "@radix-ui/react-dialog"
import axios from "axios"
import { Command as CommandPrimitive } from "cmdk"
import { useAsync } from "react-use"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-lg bg-white text-popover-foreground",
      className
    )}
    {...props}
  />
))
Command.displayName = CommandPrimitive.displayName

export const CommandDialog = ({ children, ...props }: DialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}

export const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input> & {
    containerClassName?: string
  }
>(({ className, containerClassName, ...props }, ref) => (
  <div
    className={cn(
      "flex items-center border-b border-gray-200 pl-3 px-2.5",
      containerClassName
    )}
    cmdk-input-wrapper=""
  >
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-lg bg-transparent focus:ring-0 p-0 border-0 text-sm focus-visible:outline-none outline-none text-gray-900 placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
    <SearchMd className="size-4 shrink-0 text-gray-400" />
  </div>
))

CommandInput.displayName = CommandPrimitive.Input.displayName

export const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn(
      "max-h-[232px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-rounded-full overflow-x-hidden",
      className
    )}
    {...props}
  />
))

CommandList.displayName = CommandPrimitive.List.displayName

export const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-6 text-center text-sm"
    {...props}
  />
))

CommandEmpty.displayName = CommandPrimitive.Empty.displayName

export const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden pt-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
      className
    )}
    {...props}
  />
))

CommandGroup.displayName = CommandPrimitive.Group.displayName

export const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 h-px bg-border", className)}
    {...props}
  />
))
CommandSeparator.displayName = CommandPrimitive.Separator.displayName

export const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative gap-x-2 flex cursor-pointer text-gray-500 transition duration-300 hover:text-gray-900 hover:bg-gray-50 select-none items-center px-3 py-2.5 text-[13px] font-medium leading-[13.25px] focus-visible:outline-none outline-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
      className
    )}
    {...props}
  />
))

CommandItem.displayName = CommandPrimitive.Item.displayName

export const CommandShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}
CommandShortcut.displayName = "CommandShortcut"

export function OwnCombobox({
  placeholder,
  onValueChange,
  options,
  value,
  searchValue,
  onSearchValueChange,
  emptyMessage,
  triggerClassName,
}: {
  placeholder?: string
  options?: string[]
  value?: string
  onValueChange?: (value: string) => void
  searchValue?: string
  onSearchValueChange?: (value: string) => void
  emptyMessage?: string
  triggerClassName?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [state, setState] = useControllableState({
    value,
    onChange: onValueChange,
  })
  const [internalSearchValue, setInternalSearchValue] = React.useState("")
  const resolvedSearchValue =
    typeof searchValue === "string" ? searchValue : internalSearchValue
  const handleSearchValueChange = React.useCallback(
    (nextValue: string) => {
      if (typeof onSearchValueChange === "function") {
        onSearchValueChange(nextValue)
        return
      }
      setInternalSearchValue(nextValue)
    },
    [onSearchValueChange]
  )

  React.useEffect(() => {
    if (!open) {
      handleSearchValueChange("")
    }
  }, [open, handleSearchValueChange])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "focus-visible:outline-none transition duration-300 border border-transparent hover:border-gray-300 h-7 px-[8px] rounded-[5px] border-dashed hover:bg-gray-100 shrink-0 text-sm leading-[16.94px] text-gray-600 truncate whitespace-nowrap",
            triggerClassName
          )}
        >
          <span className="block truncate">
            {state ? options?.find((option) => option === state) : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[202px] pb-2 px-0 pt-0 z-50 bg-white border-gray-100 rounded-lg border shadow-[0px_12px_16px_-4px_rgba(16,24,40,.08)]">
        <Command>
          <CommandInput
            placeholder="Search"
            className="h-9"
            value={resolvedSearchValue}
            onValueChange={handleSearchValueChange}
          />
          <CommandList>
            <CommandEmpty>{emptyMessage ?? "No results found."}</CommandEmpty>
            <CommandGroup>
              {options?.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={(currentValue) => {
                    setState(currentValue)
                    setOpen(false)
                  }}
                >
                  <span className="inline-block flex-grow truncate">
                    {option}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

const instance = axios.create({
  baseURL: "https://restcountries.com/v3.1",
})

const getCountries = async <TData,>(url: string) => {
  const { data } = await instance.get<TData>(url)
  return data
}

export interface Country {
  flags: Flags
  name: Name
  cca2: string
}

export interface Flags {
  png: string
  svg: string
  alt: string
}

/** Primary flag source — flagcdn.com with exact dimensions */
function getFlagUrl(country: Country): string {
  const code = country.cca2?.toLowerCase()
  if (code) return `https://flagcdn.com/36x27/${code}.png`
  return country.flags.svg
}

export interface Name {
  common: string
  official: string
  nativeName: { [key: string]: NativeName }
}

export interface NativeName {
  official: string
  common: string
}

// Top freelance markets — pinned at the top of the dropdown.
// Order: US first, then by freelance platform volume.
const POPULAR_COUNTRIES = [
  'United States',
  'United Kingdom',
  'Canada',
  'India',
  'Germany',
  'Australia',
  'Brazil',
  'Philippines',
  'Ukraine',
  'Poland',
]

const popularSet = new Set(POPULAR_COUNTRIES)

// Cache fetched countries so we don't re-fetch on every mount.
export let countriesCache: Country[] | null = null

/** Get flag image URL for a country name (requires countries to be loaded) */
export function getFlagUrlByName(countryName: string): string | null {
  if (!countriesCache) return null
  const country = countriesCache.find(
    (c) => c.name.common.toLowerCase() === countryName.toLowerCase()
  )
  if (!country) return null
  return getFlagUrl(country)
}

function sortCountries(countries: Country[]): { popular: Country[]; rest: Country[] } {
  const popular: Country[] = []
  const rest: Country[] = []

  for (const c of countries) {
    if (popularSet.has(c.name.common)) {
      popular.push(c)
    } else {
      rest.push(c)
    }
  }

  // Sort popular by the predefined order
  popular.sort(
    (a, b) => POPULAR_COUNTRIES.indexOf(a.name.common) - POPULAR_COUNTRIES.indexOf(b.name.common)
  )

  // Sort rest alphabetically
  rest.sort((a, b) => a.name.common.localeCompare(b.name.common))

  return { popular, rest }
}

export const CountriesCombobox = ({
  value,
  onValueChange,
  placeholder,
  triggerClassName,
  defaultValue,
}: {
  value?: string
  onValueChange?: (country: string) => void
  placeholder?: string
  triggerClassName?: string
  defaultValue?: string
}) => {
  const data = useAsync(async () => {
    if (countriesCache) return countriesCache
    const result = await getCountries<Country[]>("/all?fields=id,name,flags,cca2")
    countriesCache = result
    return result
  }, [])

  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [state, setState] = useControllableState({
    value,
    onChange: onValueChange,
    defaultValue,
  })

  React.useEffect(() => {
    if (!open) setSearchQuery("")
  }, [open])

  const selectedCountry = data.value?.find(
    (country) => country.name.common === state
  )

  const sorted = React.useMemo(() => {
    if (!data.value) return { popular: [], rest: [] }
    return sortCountries(data.value)
  }, [data.value])

  const listRef = React.useRef<HTMLDivElement>(null)
  const isSearching = searchQuery.trim().length > 0

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: 0 })
  }, [searchQuery])

  const renderItem = (option: Country) => (
    <CommandItem
      key={option.name.common}
      value={option.name.common}
      onSelect={(currentValue) => {
        setState(currentValue)
        setOpen(false)
      }}
    >
      <span className="inline-flex items-center justify-center w-[18px] h-[14px] shrink-0 rounded-sm overflow-hidden bg-gray-100">
        <img
          className="w-full h-full object-cover"
          src={getFlagUrl(option)}
          alt={option.name.common}
          onError={(e) => {
            const img = e.currentTarget
            if (!img.dataset.fallback) {
              img.dataset.fallback = "1"
              img.src = option.flags.svg
            } else if (img.dataset.fallback === "1") {
              img.dataset.fallback = "2"
              img.src = option.flags.png
            } else {
              img.style.display = "none"
            }
          }}
        />
      </span>
      <span className="inline-block flex-grow truncate">
        {option.name.common}
      </span>
    </CommandItem>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "bg-gray-100 focus-visible:outline-none pr-2 p-[5px] border border-gray-300 border-dashed rounded-[5px] inline-flex items-center gap-x-1.5",
            triggerClassName
          )}
        >
          {selectedCountry ? (
            <span className="inline-flex items-center justify-center w-[18px] h-[14px] shrink-0 rounded-sm overflow-hidden bg-gray-100">
              <img
                className="w-full h-full object-cover"
                src={getFlagUrl(selectedCountry)}
                alt={selectedCountry.name.common}
                onError={(e) => {
                  const img = e.currentTarget
                  if (!img.dataset.fallback) {
                    img.dataset.fallback = "1"
                    img.src = selectedCountry.flags.svg
                  } else if (img.dataset.fallback === "1") {
                    img.dataset.fallback = "2"
                    img.src = selectedCountry.flags.png
                  } else {
                    img.style.display = "none"
                  }
                }}
              />
            </span>
          ) : null}

          <span className="text-xs inline-block truncate max-w-[120px] leading-[18px] font-medium text-gray-700">
            {selectedCountry ? selectedCountry.name.common : placeholder}
          </span>

          <ChevronDown className="group-data-[state=open]:inline-block hidden size-[18px] shrink-0 text-gray-500" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[202px] pb-2 px-0 pt-0 z-50 bg-white border-gray-100 rounded-lg border shadow-[0px_12px_16px_-4px_rgba(16,24,40,.08)]">
        <Command>
          <CommandInput
            placeholder="Search"
            className="h-9"
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList ref={listRef}>
            <CommandEmpty>No country found.</CommandEmpty>
            {isSearching ? (
              <CommandGroup>
                {[...sorted.popular, ...sorted.rest].map(renderItem)}
              </CommandGroup>
            ) : (
              <>
                {sorted.popular.length > 0 && (
                  <CommandGroup heading="Popular">
                    {sorted.popular.map(renderItem)}
                  </CommandGroup>
                )}
                <CommandSeparator />
                <CommandGroup heading="All Countries">
                  {sorted.rest.map(renderItem)}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
