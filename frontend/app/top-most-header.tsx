"use client"

import React, { useState } from "react"
import { createPortal } from "react-dom"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { useAutocomplete } from "@/libs/autocomplete"
import { UserAPI } from "@/service/http/user"
import { ROLE } from "@/types/user"
import { cn } from "@/utils/functions"
import {
  BarChart2,
  Bell,
  ChevronDown,
  CoinStack,
  FileCheck02,
  LayoutGrid02,
  LifeBuoy,
  List,
  LogOut,
  Monitor,
  Plus,
  Repeat,
  SearchMd,
  Settings,
  Star,
  User,
  Users,
  X,
} from "@blend-metrics/icons"
import { Campaigns, Logo3, Project, Talent } from "@/components/icons"
import { InviteWindowTrigger } from "@/components/invite-window"
import NextLink from "@/components/next-link"
import { ThreeHorizontalLines } from "@/components/three-horizontal-lines"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  ComboboxTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScaleOutIn,
  ScrollArea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui"
import { ScrollBar } from "@/components/ui"

const Notifications = () => {
  const router = useRouter()
  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton
          className="rounded-full"
          size="md"
          variant="ghost"
          visual="gray"
        >
          <Bell className="size-[18px]" />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent
        className="w-[370px] bg-white border border-gray-100 rounded-lg shadow-[0px_12px_16px_-4px_rgba(16,24,40,.08)]"
        align="end"
      >
        <Tabs defaultValue="Notifications">
          <TabsList className="w-full">
            <TabsTrigger value="Notifications">
              Notifications
              <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gray-100 text-[10px] leading-[18px] text-gray-500 group-data-[state=active]:bg-primary-50 group-data-[state=active]:text-primary-500">
                5
              </span>
            </TabsTrigger>
            <TabsTrigger value="Messages">
              Messages
              <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gray-100 text-[10px] leading-[18px] text-gray-500 group-data-[state=active]:bg-primary-50 group-data-[state=active]:text-primary-500">
                2
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="Notifications">
            <div className="py-3 border-b border-gray-100 flex flex-col gap-y-1">
              <ScrollArea
                className="h-[328px]"
                scrollBar={<ScrollBar className="w-4 px-1" />}
              >
                <div className="px-2">
                  <article className="cursor-pointer hover:bg-gray-100 rounded-lg flex py-2.5 px-3 items-start gap-x-2">
                    <Avatar size="md">
                      <AvatarImage src="/man.jpg" alt="Man" />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>

                    <div className="flex-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-sm leading-[16.94px] font-semibold text-dark-blue-400">
                          @Cam43
                        </span>

                        <span className="text-xs leading-[14.06px] text-[#585C65]">
                          Just now
                        </span>
                      </div>

                      <div className="mt-1">
                        <span className="text-sm leading-[16.94px] text-gray-700 font-light">
                          Uploaded final file for project{" "}
                          <span className="font-semibold">Video Editing</span>
                        </span>
                      </div>
                    </div>
                  </article>
                  <article className="cursor-pointer hover:bg-gray-100 flex rounded-lg py-2.5 px-3 items-start gap-x-2">
                    <Avatar size="md">
                      <AvatarImage src="/man.jpg" alt="Man" />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>

                    <div className="flex-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-sm leading-[16.94px] font-semibold text-dark-blue-400">
                          @Cam43
                        </span>

                        <span className="text-xs leading-[14.06px] text-[#585C65]">
                          Just now
                        </span>
                      </div>

                      <div className="mt-1">
                        <span className="text-sm leading-[16.94px] text-gray-700 font-light">
                          Uploaded final file for project{" "}
                          <span className="font-semibold">Video Editing</span>
                        </span>
                      </div>
                    </div>
                  </article>
                  <article className="cursor-pointer hover:bg-gray-100 flex rounded-lg py-2.5 px-3 items-start gap-x-2">
                    <Avatar size="md">
                      <AvatarImage src="/man.jpg" alt="Man" />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>

                    <div className="flex-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-sm leading-[16.94px] font-semibold text-dark-blue-400">
                          @Cam43
                        </span>

                        <span className="text-xs leading-[14.06px] text-[#585C65]">
                          Just now
                        </span>
                      </div>

                      <div className="mt-1">
                        <span className="text-sm leading-[16.94px] text-gray-700 font-light">
                          Uploaded final file for project{" "}
                          <span className="font-semibold">Video Editing</span>
                        </span>
                      </div>
                    </div>
                  </article>
                  <article className="cursor-pointer hover:bg-gray-100 flex rounded-lg py-2.5 px-3 items-start gap-x-2">
                    <Avatar size="md">
                      <AvatarImage src="/man.jpg" alt="Man" />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>

                    <div className="flex-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-sm leading-[16.94px] font-semibold text-dark-blue-400">
                          @Cam43
                        </span>

                        <span className="text-xs leading-[14.06px] text-[#585C65]">
                          Just now
                        </span>
                      </div>

                      <div className="mt-1">
                        <span className="text-sm leading-[16.94px] text-gray-700 font-light">
                          Uploaded final file for project{" "}
                          <span className="font-semibold">Video Editing</span>
                        </span>
                      </div>
                    </div>
                  </article>
                  <article className="cursor-pointer hover:bg-gray-100 flex rounded-lg py-2.5 px-3 items-start gap-x-2">
                    <Avatar size="md">
                      <AvatarImage src="/man.jpg" alt="Man" />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>

                    <div className="flex-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-sm leading-[16.94px] font-semibold text-dark-blue-400">
                          @Cam43
                        </span>

                        <span className="text-xs leading-[14.06px] text-[#585C65]">
                          Just now
                        </span>
                      </div>

                      <div className="mt-1">
                        <span className="text-sm leading-[16.94px] text-gray-700 font-light">
                          Uploaded final file for project{" "}
                          <span className="font-semibold">Video Editing</span>
                        </span>
                      </div>
                    </div>
                  </article>
                  <article className="cursor-pointer hover:bg-gray-100 flex rounded-lg py-2.5 px-3 items-start gap-x-2">
                    <Avatar size="md">
                      <AvatarImage src="/man.jpg" alt="Man" />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>

                    <div className="flex-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-sm leading-[16.94px] font-semibold text-dark-blue-400">
                          @Cam43
                        </span>

                        <span className="text-xs leading-[14.06px] text-[#585C65]">
                          Just now
                        </span>
                      </div>

                      <div className="mt-1">
                        <span className="text-sm leading-[16.94px] text-gray-700 font-light">
                          Uploaded final file for project{" "}
                          <span className="font-semibold">Video Editing</span>
                        </span>
                      </div>
                    </div>
                  </article>
                </div>
              </ScrollArea>
            </div>

            <div className="py-3.5 grid">
              <button className="focus-visible:outline-none text-[13px] leading-[13.3px] text-gray-500 hover:underline font-medium" onClick={() => router.push("/notifications")}>
                View All
              </button>
            </div>
          </TabsContent>
          <TabsContent value="Messages">
            <div className="py-3 border-b border-gray-100 flex flex-col gap-y-1">
              <ScrollArea
                className="h-[328px]"
                scrollBar={<ScrollBar className="w-4 px-1" />}
              >
                <div className="px-2">
                  <article className="px-3 py-2.5 cursor-pointer flex gap-x-2 items-start hover:bg-gray-100 rounded-lg">
                    <Avatar size="md" isOnline>
                      <AvatarImage src="/man.jpg" alt="Man" />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>
                    <div className="flex-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-sm leading-[16.94px] font-semibold text-dark-blue-400">
                          @Cam43
                        </span>

                        <span className="text-xs leading-[14.06px] text-[#585C65]">
                          Just now
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="text-sm line-clamp-2 leading-[16.94px] text-gray-700">
                          Ad reprehenderit deserunt in qui ut esse magna ipsum
                          fugiat qui aliqua aliquip amet pariatur enim sit
                          ullamco velit eiusmod ut velit magna
                        </span>
                      </div>
                    </div>
                  </article>
                  <article className="px-3 py-2.5 cursor-pointer flex gap-x-2 items-start hover:bg-gray-100 rounded-lg">
                    <Avatar size="md" isOnline>
                      <AvatarImage src="/man.jpg" alt="Man" />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>
                    <div className="flex-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-sm leading-[16.94px] font-semibold text-dark-blue-400">
                          @Cam43
                        </span>

                        <span className="text-xs leading-[14.06px] text-[#585C65]">
                          Just now
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="text-sm line-clamp-2 leading-[16.94px] text-gray-700">
                          Ad reprehenderit deserunt in qui ut esse magna ipsum
                          fugiat qui aliqua aliquip amet pariatur enim sit
                          ullamco velit eiusmod ut velit magna
                        </span>
                      </div>
                    </div>
                  </article>
                  <article className="px-3 py-2.5 cursor-pointer flex gap-x-2 items-start hover:bg-gray-100 rounded-lg">
                    <Avatar size="md" isOnline>
                      <AvatarImage src="/man.jpg" alt="Man" />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>
                    <div className="flex-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-sm leading-[16.94px] font-semibold text-dark-blue-400">
                          @Cam43
                        </span>

                        <span className="text-xs leading-[14.06px] text-[#585C65]">
                          Just now
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="text-sm line-clamp-2 leading-[16.94px] text-gray-700">
                          Ad reprehenderit deserunt in qui ut esse magna ipsum
                          fugiat qui aliqua aliquip amet pariatur enim sit
                          ullamco velit eiusmod ut velit magna
                        </span>
                      </div>
                    </div>
                  </article>
                  <article className="px-3 py-2.5 cursor-pointer flex gap-x-2 items-start hover:bg-gray-100 rounded-lg">
                    <Avatar size="md" isOnline>
                      <AvatarImage src="/man.jpg" alt="Man" />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>
                    <div className="flex-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-sm leading-[16.94px] font-semibold text-dark-blue-400">
                          @Cam43
                        </span>

                        <span className="text-xs leading-[14.06px] text-[#585C65]">
                          Just now
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="text-sm line-clamp-2 leading-[16.94px] text-gray-700">
                          Ad reprehenderit deserunt in qui ut esse magna ipsum
                          fugiat qui aliqua aliquip amet pariatur enim sit
                          ullamco velit eiusmod ut velit magna
                        </span>
                      </div>
                    </div>
                  </article>
                  <article className="px-3 py-2.5 cursor-pointer flex gap-x-2 items-start hover:bg-gray-100 rounded-lg">
                    <Avatar size="md" isOnline>
                      <AvatarImage src="/man.jpg" alt="Man" />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>
                    <div className="flex-auto">
                      <div className="flex items-center justify-between">
                        <span className="text-sm leading-[16.94px] font-semibold text-dark-blue-400">
                          @Cam43
                        </span>

                        <span className="text-xs leading-[14.06px] text-[#585C65]">
                          Just now
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="text-sm line-clamp-2 leading-[16.94px] text-gray-700">
                          Ad reprehenderit deserunt in qui ut esse magna ipsum
                          fugiat qui aliqua aliquip amet pariatur enim sit
                          ullamco velit eiusmod ut velit magna
                        </span>
                      </div>
                    </div>
                  </article>
                </div>
              </ScrollArea>
            </div>
            <div className="py-3.5 grid">
              <button className="focus-visible:outline-none text-[13px] leading-[13.3px] text-gray-500 hover:underline font-medium" onClick={() => router.push("/inbox")}>
                View All
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}

const options = [
  {
    value: "$1,540",
    currencyCode: "USD",
  },
  {
    value: "$1,440",
    currencyCode: "USD",
  },
  {
    value: "$1,340",
    currencyCode: "USD",
  },
  {
    value: "$1,240",
    currencyCode: "USD",
  },
]

const [{ value: defaultValue }] = options

// Fixed "Browse ..." suggestions shown in the empty-state dropdown.
// `route` marks these as navigation targets — the Combobox onChange handler
// routes to `route` instead of treating `value` as a search term.
//
// Routes point at the dedicated L1 browse pages restored from
// `archive/backup_old_structure/level-1/` into the app routing tree.
const fixedSuggestions: Array<{
  id: number
  icon: React.JSXElementConstructor<any>
  value: string
  route: string
}> = [
  { id: 1, icon: Talent, value: "Browse Talent", route: "/talent" },
  { id: 2, icon: Project, value: "Browse Projects", route: "/projects" },
  { id: 3, icon: Campaigns, value: "Browse Services", route: "/services" },
  { id: 4, icon: Users, value: "Browse Teams", route: "/teams" },
  { id: 5, icon: SearchMd, value: "Find Jobs", route: "/find-jobs" },
]

const suggestions = [
  { id: 1, value: "UX Architect" },
  { id: 2, value: "Bulma developer" },
  { id: 3, value: "React" },
  { id: 4, value: "Golang framework" },
  { id: 5, value: "Mobile applications" },
  { id: 6, value: "Magento development" },
]

const listingTypes = ["Projects", "Services", "Teams", "Talent"]

const SearchBar = () => {
  const router = useRouter()
  const pathname = usePathname()
  const [state, setState] = useState<string>()
  const [selected, setSelected] = React.useState<{
    id: number
    value: string
    icon?: React.JSXElementConstructor<any>
  }>()
  const [query, setQuery] = React.useState("")
  // Nonce used as `key` on the Combobox wrapper. Incrementing it forces
  // Headless UI to unmount/remount, which reliably resets its internal open
  // state. Used to force-close the dropdown after a search submit even when
  // the keyword hasn't changed (router.push to same URL is a no-op).
  const [resetNonce, setResetNonce] = React.useState(0)
  // Ref to the hidden ComboboxButton so we can click-through from the input
  // and explicitly open the dropdown on focus/click (industry standard).
  const openButtonRef = React.useRef<HTMLButtonElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Industry-standard behavior (Amazon/Upwork/Fiverr):
  //  • On /search → show the active query term in the bar (from ?q=)
  //  • On any other route → clear the bar so the next search starts fresh
  const searchParamsHook = useSearchParams()
  React.useEffect(() => {
    if (pathname?.startsWith("/search")) {
      const qParam = searchParamsHook?.get("q") ?? ""
      setQuery(qParam)
      // Mirror into `selected` so Headless UI's displayValue renders the term
      setSelected(qParam ? { id: -1, value: qParam } : undefined)
    } else {
      setQuery("")
      setSelected(undefined)
    }
  }, [pathname, searchParamsHook])

  // Imperative flag set while submitting a search, so `onFocus` knows not
  // to re-open the combobox during the final blur/navigation step.
  const submittingRef = React.useRef(false)

  const closeDropdown = () => {
    // Force-close by remounting the Combobox via a key change. This is the
    // only reliable way to close when the search URL doesn't change (e.g.
    // user hits Enter with the same keyword — router.push is a no-op, so
    // effect-based closes never fire). The remount also resets Headless
    // UI's internal focus/active-index state.
    submittingRef.current = true
    inputRef.current?.blur()
    setResetNonce((n) => n + 1)
    // Release the re-open guard flag after React flushes the remount.
    setTimeout(() => {
      submittingRef.current = false
    }, 300)
  }

  const submitSearch = (term: string) => {
    const trimmed = term.trim()
    if (!trimmed) return
    const params = new URLSearchParams()
    params.set("q", trimmed)
    if (state) params.set("category", state.toLowerCase())
    closeDropdown()
    router.push(`/search?${params.toString()}`)
  }

  const searchPlaceholder = (() => {
    switch (state) {
      case "Projects": return "Search by skills or project type"
      case "Services": return "Search by skills or service type"
      case "Teams": return "Search by skills or team type"
      case "Talent": return "Search by skills or expertise"
      default: return "Search by skills or keyword"
    }
  })()

  // Live autocomplete from backend — debounced at 250ms, hits
  // /autocomplete/{type}. Falls back to /public/mock/{type}.json on error.
  // Type depends on the category selector: Talent/Projects → job_titles,
  // Teams/Services → skills, default (All) → skills.
  const autocompleteType = (() => {
    switch (state) {
      case "Talent":
      case "Projects":
        return "job_titles"
      case "Teams":
      case "Services":
        return "skills"
      default:
        return "skills"
    }
  })()

  const { suggestions: liveSuggestions } = useAutocomplete(
    autocompleteType,
    query
  )

  const filteredSuggestions = React.useMemo(() => {
    if (Array.isArray(liveSuggestions) && liveSuggestions.length > 0) {
      return liveSuggestions.slice(0, 10).map((s: any, i: number) => ({
        id: typeof s?.id === "number" ? s.id : i + 1000,
        value: s?.label ?? s?.value ?? String(s),
      }))
    }
    // Static fallback: preserves the previous UX when the API is unreachable
    return query === ""
      ? suggestions
      : suggestions.filter((industry) =>
          industry.value
            .toLowerCase()
            .replace(/\s+/g, "")
            .includes(query.toLowerCase().replace(/\s+/g, ""))
        )
  }, [liveSuggestions, query])

  const reset = () => setQuery("")

  return (
    <Combobox
      key={resetNonce}
      className="group/root w-auto flex-auto"
      value={selected}
      onChange={(value: { id: number; value: string; icon?: React.JSXElementConstructor<any>; route?: string }) => {
        if (!value) return
        // Fixed "Browse ..." items have a route — navigate instead of searching.
        if (value.route) {
          closeDropdown()
          setSelected(undefined)
          router.push(value.route)
          return
        }
        if (value.value) {
          submitSearch(value.value)
          // Do NOT persist the selected object — pathname effect will reset
          // on the next route, and we want the bar to show the term via the
          // pathname-synced query instead.
          setSelected(undefined)
        }
      }}
    >
      {({ open }) => (
      <>
      {/* Amazon-style page overlay: when the search combobox is open, dim
          the rest of the page so focus is entirely on the search. Rendered
          via portal to document.body so it escapes the header's stacking
          context, allowing z-40 to sit cleanly below the z-50 sticky nav. */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/40 z-40 pointer-events-none animate-in fade-in duration-150"
            aria-hidden="true"
          />,
          document.body
        )}
      <ComboboxTrigger className="relative z-50 flex h-[34px] lg:h-10 rounded-[5px] items-center gap-x-3 border border-gray-300 bg-white ui-open:rounded-b-none py-[7px] lg:py-2 pl-2.5 pr-3 lg:px-3">
        <div className="flex items-center gap-x-2 flex-auto">
          <SearchMd className="size-4 shrink-0 text-gray-400" />
          <ComboboxInput
            ref={inputRef}
            placeholder={searchPlaceholder}
            className="p-0 border-0 text-xs leading-5 h-auto rounded-none hover:ring-0 hover:border-gray-300 focus:ring-0 focus:border-gray-300 ui-open:rounded-b-none"
            size="lg"
            displayValue={(value: {
              id: number
              value: string
              icon?: React.JSXElementConstructor<any>
            }) => value?.value ?? ""}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => {
              // Open the dropdown the moment the user focuses the input
              // (industry-standard behavior — Amazon, Upwork, Fiverr all do this).
              // Guard against double-firing: only click the hidden trigger if
              // the options aren't already open, otherwise we'd toggle it shut.
              // Also skip if we're in the middle of submitting a search, so
              // the dropdown doesn't reopen right as it's closing.
              if (submittingRef.current) return
              const btn = openButtonRef.current
              if (btn && btn.getAttribute("aria-expanded") !== "true") {
                btn.click()
              }
            }}
            onKeyDownCapture={(e: React.KeyboardEvent<HTMLInputElement>) => {
              // Capture-phase so we intercept Enter before Headless UI's own
              // keydown handler tries to "select the highlighted option"
              // (which would otherwise swallow the event when nothing is
              // highlighted, or submit the wrong term if something is).
              if (e.key === "Enter") {
                e.preventDefault()
                e.stopPropagation()
                submitSearch(query)
              } else if (e.key === "Escape") {
                // Standard: Escape clears the input without submitting
                setQuery("")
                setSelected(undefined)
              }
            }}
          />
          {/* Hidden trigger — gives clicking/focusing the input the ability
              to open the Headless UI Combobox popover. */}
          <ComboboxButton
            ref={openButtonRef}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>
        <span className="w-px h-4 shrink-0 inline-block bg-gray-200" />
        <Listbox className="w-auto" value={state} onChange={setState}>
          <ListboxButton
            className="p-0 border-0 text-[11px] leading-[16.67px] lg:text-sm lg:leading-5 font-semibold gap-x-[6.67px] lg:gap-x-1.5 w-auto h-auto rounded-none hover:ring-0 focus:ring-0"
            placeholder="View All"
            iconClassName="size-[12.5px]"
          />
          <ListboxOptions className="w-max -right-3 left-auto mt-3.5">
            {listingTypes.map((type) => (
              <ListboxOption key={type} value={type}>
                {type}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Listbox>
      </ComboboxTrigger>
      <ScaleOutIn afterLeave={reset}>
        <ComboboxOptions className="px-0 mt-0 space-y-0 border border-gray-300 border-t-0 rounded-t-none bg-white">
          {query === "" ? (
            <>
              {/* Empty state: fixed "Browse ..." suggestions + Recent Searches */}
              <div className="p-3">
                {fixedSuggestions.map((fixedSuggestion) => (
                  <ComboboxOption
                    key={fixedSuggestion.id}
                    value={fixedSuggestion}
                    className="text-xs flex items-center gap-x-3 leading-[13.3px] text-gray-400"
                  >
                    <fixedSuggestion.icon className="size-5" />
                    {fixedSuggestion.value}
                  </ComboboxOption>
                ))}
              </div>

              <div className="space-y-1 p-3 border-t border-gray-100">
                <div className="px-3 flex items-center justify-between">
                  <h1 className="text-[13px] leading-6 font-semibold text-dark-blue-400">
                    Recent Searches
                  </h1>

                  <Button
                    className="opacity-50 hover:opacity-100"
                    variant="link"
                    visual="gray"
                  >
                    Clear Search History
                  </Button>
                </div>
                <ScrollArea viewportClassName="max-h-[360px]">
                  {suggestions.map((suggestion) => (
                    <ComboboxOption key={suggestion.id} value={suggestion}>
                      {suggestion.value}
                    </ComboboxOption>
                  ))}
                </ScrollArea>
              </div>
            </>
          ) : (
            /* Typing state: live autocomplete matches only */
            <div className="p-3">
              <ScrollArea viewportClassName="max-h-[360px]">
                {filteredSuggestions.length > 0 ? (
                  filteredSuggestions.map((suggestion) => (
                    <ComboboxOption key={suggestion.id} value={suggestion}>
                      {suggestion.value}
                    </ComboboxOption>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-gray-400">
                    No matches
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </ComboboxOptions>
      </ScaleOutIn>
      </>
      )}
    </Combobox>
  )
}

const PATHNAMES = ["/talent-dashboard", "/client-dashboard", "/talent-profile"]

// Pages that have a secondary nav bar below the primary nav — shadow should only appear on the secondary nav, not the primary
const HAS_SECONDARY_NAV = ["/", "/talent-profile", "/my-team", "/favorite-projects", "/favorite-talent", "/browser-history", "/search", "/talent-search", "/projects", "/services", "/teams", "/talent", "/find-jobs"]

const ONBOARDING = "/onboarding"

export const TopMostHeader = ({ showShadow = true }: { showShadow?: boolean }) => {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [secondaryNavHidden, setSecondaryNavHidden] = React.useState(false)

  const router = useRouter()
  const { logoutHandler, user, setUser } = useAuth()

  const hasSecondaryNav = HAS_SECONDARY_NAV.includes(pathname) || pathname.startsWith("/c/") || pathname.startsWith("/project-details/")

  // Listen for secondary nav visibility changes
  React.useEffect(() => {
    if (!hasSecondaryNav) return
    const observer = new MutationObserver(() => {
      const val = document.documentElement.dataset.secondaryNav
      setSecondaryNavHidden(val === "hidden")
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-secondary-nav"] })
    return () => observer.disconnect()
  }, [hasSecondaryNav])

  if (pathname.startsWith(ONBOARDING)) {
    return null
  }

  // Show shadow: always on pages without secondary nav, or when secondary nav is hidden (scrolled away)
  const showNavShadow = !hasSecondaryNav || secondaryNavHidden

  return (
    <div
      className={cn(
        "px-3.5 md:px-6 lg:px-[50px] bg-white flex flex-col xs:max-md:pt-1 xs:max-md:pb-3.5 sticky top-0 z-50",
        showNavShadow
          ? "shadow-[0px_1px_3px_0px_rgba(16,24,40,.1)]"
          : "shadow-[0px_1px_3px_0px_rgba(16,24,40,.1)] md:shadow-none",
        PATHNAMES.includes(pathname) && "md:max-lg:pb-2.5"
      )}
    >
      <div className="flex items-center justify-between md:gap-x-3 lg:gap-x-[50px] md:pt-2 md:pb-1 lg:py-3">
        <NextLink className="focus-visible:outline-none" href="/">
          <Logo3 className="h-[14.25px] w-[97px] lg:w-[128px] lg:h-[18.81px]" />
        </NextLink>

        <div className="flex flex-auto gap-x-3 xs:max-lg:ml-3 xs:max-md:hidden">
          <SearchBar />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="gap-x-2 xs:max-lg:h-[34px] xs:max-lg:px-[12.6px] xs:max-lg:py-[7.2px] bg-white"
                visual="gray"
                variant="outlined"
                size="md"
              >
                <span className="inline-flex items-center gap-x-[7.2px] lg:gap-x-1 text-[12.6px] leading-5 lg:text-base lg:leading-6 font-light">
                  <span className="font-semibold">$ 1,540</span> USD
                </span>
                <ChevronDown className="text-gray-500 size-[13.5px] lg:size-[15px]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[174px]">
              <DropdownMenuItem onSelect={() => router.push("/add-funds")}>
                <Plus className="size-4" /> Add Funds
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push("/transfer-funds")}>
                <Repeat className="size-4" /> Transfer Funds
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center">
          <div className="flex items-center gap-x-1">
            <InviteWindowTrigger asChild>
              <IconButton
                className="rounded-full"
                size="md"
                variant="ghost"
                visual="gray"
              >
                <Plus className="size-[18px]" />
              </IconButton>
            </InviteWindowTrigger>
            <Notifications />
            <IconButton
              className="rounded-full lg:hidden"
              size="md"
              variant="ghost"
              visual="gray"
            >
              <ThreeHorizontalLines className="text-dark-blue-400" />
            </IconButton>
          </div>

          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger className="hidden lg:inline-flex items-center gap-x-2 px-3 py-1.5 rounded-[8px] hover:bg-gray-100 focus-visible:outline-none">
              <div className="inline-flex items-center gap-x-2">
                <Avatar>
                  <AvatarImage
                    src={user?.avatarUrl ?? ""}
                    alt={user?.firstName ?? "User"}
                  />
                  <AvatarFallback suppressHydrationWarning>
                    {user?.firstName?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold leading-[15px] text-gray-700" suppressHydrationWarning>
                    {`${user?.firstName || ""} ${user?.lastName || ""}`.trim()}
                  </span>
                  <span className="text-[9px] leading-[14px] text-gray-500" suppressHydrationWarning>
                    {user?.email}
                  </span>
                </div>
              </div>

              <ChevronDown className="size-4 shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[278px]">
              <DropdownMenuLabel className="font-normal" size="md">
                <div className="flex flex-col gap-y-2">
                  <div className="flex flex-col">
                    <span className="text-xs leading-5 text-gray-700">
                      User ID: 2459749
                    </span>
                    <span className="text-[13px] leading-5 text-primary-500" suppressHydrationWarning>
                      {user?.email}
                    </span>
                  </div>

                  <Button className="w-full" onClick={() => { setMenuOpen(false); router.push(user?.accountType === "TALENT" ? "/talent-dashboard" : "/client-dashboard") }}>My Account</Button>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => { setMenuOpen(false); router.push("/talent-profile") }}>
                <User className="size-4" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { setMenuOpen(false); router.push(user?.accountType === "TALENT" ? "/talent-dashboard" : "/client-dashboard") }}>
                <LayoutGrid02 className="size-4" />
                My Dashboard
              </DropdownMenuItem>
              {user?.accountType === "TALENT" && (
                <DropdownMenuItem onSelect={() => { setMenuOpen(false); router.push("/my-listings") }}>
                  <List className="size-4" />
                  My Listings
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => { setMenuOpen(false); router.push("/my-contracts") }}>
                <FileCheck02 className="size-4" />
                My Contracts
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { setMenuOpen(false); router.push("/my-team") }}>
                <Users className="size-4" />
                My Team
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { setMenuOpen(false); router.push("/favorites") }}>
                <Star className="size-4" />
                My Favorites
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { setMenuOpen(false); router.push("/billing") }}>
                <CoinStack className="size-4" />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { setMenuOpen(false); router.push("/settings") }}>
                <Settings className="size-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={async () => {
                setMenuOpen(false)
                const newType = user?.accountType === "TALENT" ? "client" : "talent"
                const newDashboard = newType === "client" ? "/client-dashboard" : "/talent-dashboard"
                // Optimistically update local user so the dropdown label flips immediately,
                // even if the backend doesn't accept the userType change.
                setUser((prev) => prev ? { ...prev, userType: newType, accountType: newType === "talent" ? ROLE.TALENT : ROLE.CLIENT } : prev)
                if (user?.id) {
                  UserAPI.updateProfile(user.id, { userType: newType }).catch(() => {})
                }
                router.push(newDashboard)
              }}>
                <Repeat className="size-4" />
                {user?.accountType === "TALENT" ? "Switch to Client" : "Switch to Talent"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="grid grid-cols-2 gap-x-[9px]">
                <DropdownMenuItem>
                  <LifeBuoy className="size-4" />
                  Help Center
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => logoutHandler()}>
                  <LogOut className="size-4" />
                  Log out
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="md:hidden">
        <SearchBar />
      </div>
    </div>
  )
}
