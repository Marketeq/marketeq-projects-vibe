"use client"

import { useState } from "react"
import type {
  CatalogCategory,
  CategoryPref,
  ChannelKey,
} from "@/service/http/notifications"
import {
  BellRinging03,
  ChevronDown,
  DotsHorizontal,
  RefreshCcw01,
  SearchMd,
  XCircle,
} from "@blend-metrics/icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Switch,
} from "@/components/ui"
import { cn } from "@/utils/functions"
import {
  channelIcons,
  channelLabels,
  channelOrder,
  summarizeChannels,
} from "./shared"

interface Props {
  catalog: CatalogCategory[]
  getCategoryState: (categoryId: string) => CategoryPref
  expandedCategory: string | null
  onToggleExpanded: (categoryId: string) => void
  onToggleCategoryMaster: (categoryId: string) => void
  onToggleCategoryChannel: (categoryId: string, channel: ChannelKey) => void
  onRequestReset: () => void
}

export default function NotificationCategoriesList({
  catalog,
  getCategoryState,
  expandedCategory,
  onToggleExpanded,
  onToggleCategoryMaster,
  onToggleCategoryChannel,
  onRequestReset,
}: Props) {
  const [search, setSearch] = useState("")

  const visible = catalog.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-[0px_2px_5px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between gap-3 p-6 pb-3">
        <h3 className="text-base font-semibold text-dark-blue-400">
          Notifications
        </h3>
        <div className="flex items-center gap-3">
          {/* COMPONENTS.md "Search Input Pattern". The width behaviour is
              page-specific per that entry; 220 -> 375 on focus matches the
              transactions and invoices searches. transition-all belongs on the
              group (for width) — never on the Input, where it interpolates
              box-shadow and causes a dark flash. */}
          <InputGroup className="group/search w-[220px] transition-all duration-300 focus-within:w-[375px]">
            <InputLeftElement>
              <SearchMd className="size-4 text-gray-400 transition-colors duration-300 group-hover/search:text-gray-500 group-focus-within/search:!text-primary-500" />
            </InputLeftElement>
            <Input
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9 transition-[border-color] duration-300 hover:border-primary-200 hover:shadow-[0px_0px_0px_4px_#E1EAFF] focus:!ring-0 focus:!shadow-[0px_0px_0px_4px_#E1EAFF]"
            />
            {search && (
              <InputRightElement>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setSearch("")}
                >
                  <XCircle className="size-4 text-gray-500 opacity-50 hover:opacity-100" />
                </button>
              </InputRightElement>
            )}
          </InputGroup>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton
                type="button"
                visual="gray"
                variant="ghost"
                size="sm"
                aria-label="More options"
                className="size-6 rounded-[5px] text-gray-500"
              >
                <DotsHorizontal className="size-5" />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              <DropdownMenuItem onSelect={onRequestReset} className="gap-2">
                <RefreshCcw01 className="size-4 text-gray-500" />
                Reset To Default
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="px-6 pb-6 space-y-2">
        {visible.map((category) => {
          const state = getCategoryState(category.id)
          const isExpanded = expandedCategory === category.id

          return (
            <div
              key={category.id}
              className="flex w-full flex-col rounded-lg border border-gray-200 bg-white shadow-[0px_1px_4px_rgba(0,0,0,0.03)]"
            >
              <button
                type="button"
                onClick={() => onToggleExpanded(category.id)}
                aria-expanded={isExpanded}
                className={cn(
                  "flex h-[72px] w-full items-center gap-3 rounded-lg px-5 text-left transition-colors hover:bg-gray-50",
                  // The divider belongs to the header only while the body is
                  // showing, and the bottom corners square off against it.
                  isExpanded && "rounded-b-none border-b border-gray-200"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm leading-[17px] font-semibold text-dark-blue-400">
                    {category.title}
                  </p>
                  <p className="text-xs leading-[15px] text-gray-500">
                    {summarizeChannels(state.channels)}
                  </p>
                </div>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[5px]">
                  <ChevronDown
                    className={cn(
                      "size-5 text-gray-500 transition-transform duration-200",
                      isExpanded && "rotate-180"
                    )}
                  />
                </span>
              </button>

              {isExpanded && (
                <div className="flex w-full flex-col gap-3 p-5">
                  <p className="w-full text-sm leading-[17px] text-dark-blue-400">
                    Receive notifications about {category.title.toLowerCase()}.
                  </p>

                  <div className="flex h-11 w-full items-center gap-3 py-2">
                    <span className="flex flex-1 items-center gap-2">
                      <BellRinging03 className="size-5 text-gray-400" />
                      <span className="text-sm leading-[17px] font-semibold text-dark-blue-400">
                        Allow notifications
                      </span>
                    </span>
                    <Switch
                      checked={state.enabled}
                      onCheckedChange={() => onToggleCategoryMaster(category.id)}
                      size="sm"
                    />
                  </div>

                  <div className="flex w-full flex-col gap-1">
                    <p className="w-full text-xs leading-[15px] font-semibold text-dark-blue-400">
                      Where do you want to receive notifications for this
                      category?
                    </p>

                    <div className="flex w-full flex-col">
                      {channelOrder.map((channel) => {
                        const ChannelIcon = channelIcons[channel]

                        return (
                          <div
                            key={channel}
                            className="flex h-11 w-full items-center justify-between gap-3 py-2"
                          >
                            <span className="flex items-center gap-2">
                              <ChannelIcon className="size-5 text-gray-400" />
                              <span className="text-sm leading-[17px] font-semibold text-dark-blue-400">
                                {channelLabels[channel]}
                              </span>
                            </span>
                            <Switch
                              checked={state.channels[channel]}
                              disabled={!state.enabled}
                              onCheckedChange={() =>
                                onToggleCategoryChannel(category.id, channel)
                              }
                              size="sm"
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {visible.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">
            No categories match your search.
          </p>
        )}
      </div>
    </div>
  )
}
