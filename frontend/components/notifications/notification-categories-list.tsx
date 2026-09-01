"use client"

import { useState } from "react"
import type {
  CatalogCategory,
  CategoryPref,
} from "@/service/http/notifications"
import {
  ChevronDown,
  DotsHorizontal,
  RefreshCcw01,
  SearchMd,
} from "@blend-metrics/icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui"
import { resolveIcon, summarizeChannels } from "./shared"

interface Props {
  catalog: CatalogCategory[]
  getCategoryState: (categoryId: string) => CategoryPref
  onSelect: (categoryId: string) => void
  onRequestReset: () => void
}

export default function NotificationCategoriesList({
  catalog,
  getCategoryState,
  onSelect,
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
          Notification categories
        </h3>
        <div className="flex items-center gap-3">
          <div className="relative w-[220px]">
            <SearchMd className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-[5px] border border-gray-300 bg-white pl-9 pr-3 text-sm text-dark-blue-400 shadow-xs placeholder:text-gray-500 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-50 transition-colors"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-center size-6 rounded-[5px] bg-white text-gray-500 hover:bg-gray-100 transition-colors"
                aria-label="More options"
              >
                <DotsHorizontal className="size-5" />
              </button>
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
          const Icon = resolveIcon(category.icon)
          return (
            <button
              key={category.id}
              onClick={() => onSelect(category.id)}
              className="flex h-[68px] w-full items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-[0px_1px_4px_rgba(0,0,0,0.03)] hover:bg-gray-50 transition-colors"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border-[1.5px] border-gray-200">
                <Icon className="size-5 text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-dark-blue-400 truncate">
                  {category.title}
                </p>
                <p className="text-xs leading-[15px] text-gray-500">
                  {summarizeChannels(state.channels)}
                </p>
              </div>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[5px]"><ChevronDown className="size-5 -rotate-90 text-gray-500" /></span>
            </button>
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
