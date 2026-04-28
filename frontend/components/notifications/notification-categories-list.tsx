"use client"

import { useState } from "react"
import { ChevronDown, DotsHorizontal, RefreshCcw01, SearchMd } from "@blend-metrics/icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui"
import type { CatalogCategory, CategoryPref } from "@/service/http/notifications"
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
    c.title.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between gap-3 p-5">
        <h3 className="text-base font-semibold text-dark-blue-400">
          Notification categories
        </h3>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <SearchMd className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 rounded-lg pl-9 pr-3 py-2 text-sm text-dark-blue-400 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-primary-100 border border-transparent focus:border-primary-200 transition-colors"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-center size-9 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 transition-colors"
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

      <div className="px-5 pb-5 space-y-2">
        {visible.map((category) => {
          const state = getCategoryState(category.id)
          const Icon = resolveIcon(category.icon)
          return (
            <button
              key={category.id}
              onClick={() => onSelect(category.id)}
              className="flex items-center gap-3 w-full bg-gray-50 hover:bg-gray-100 rounded-lg p-2 text-left transition-colors"
            >
              <div className="flex items-center justify-center size-9 rounded-lg bg-[#333951] shrink-0">
                <Icon className="size-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-dark-blue-400 truncate">
                  {category.title}
                </p>
                <p className="text-xs text-gray-400">
                  {summarizeChannels(state.channels)}
                </p>
              </div>
              <ChevronDown className="size-5 text-gray-400 -rotate-90 shrink-0" />
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
