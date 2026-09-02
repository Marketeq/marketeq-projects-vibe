"use client"

/**
 * The My Favorites top section — Figma 13101-74250.
 *
 * One component for both the groups index and a group page, because it is one
 * section: title, then the bordered row of search, tabs, sort, layout toggle
 * and New Group. Only what renders below it differs, so the two screens cannot
 * drift in spacing, padding or behaviour.
 */

import React from "react"
import { SearchMd } from "@blend-metrics/icons"
import { Grid, List } from "@/components/icons"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
import { Button, Input, Tabs, TabsList, TabsTrigger } from "@/components/ui"
import { FAVORITE_TABS, type FavoriteTab } from "@/src/lib/favorites-tabs"

export const GRID_LAYOUT = "GRID"
export const LIST_LAYOUT = "LIST"

export function FavoritesHeader({
  activeTab,
  onTabChange,
  counts,
  showSearch,
  onToggleSearch,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  sortSlot,
  layout,
  onLayoutChange,
  newGroupSlot,
  children,
}: {
  activeTab: string
  onTabChange: (tab: FavoriteTab) => void
  counts: Record<string, number>
  showSearch: boolean
  onToggleSearch: () => void
  searchQuery: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  sortSlot: React.ReactNode
  layout: string[]
  onLayoutChange: (value: string[]) => void
  newGroupSlot: React.ReactNode
  /** Tab panels, when the screen drives its content through Tabs. */
  children?: React.ReactNode
}) {
  return (
    <>
      <h1 className="text-lg font-bold leading-[21.78px] text-dark-blue-400 xs:max-md:mt-6 lg:text-[28px] lg:leading-[33.89px]">
        My Favorites
      </h1>

      <Tabs
        className="mt-7 lg:mt-[19px]"
        value={activeTab}
        onValueChange={(tab) => onTabChange(tab as FavoriteTab)}
      >
        <div className="flex h-[60px] items-end justify-between border-b border-gray-200">
          <div className="inline-flex items-end gap-x-3">
            <Button
              className="text-gray-500"
              variant="ghost"
              visual="gray"
              size="md"
              onClick={onToggleSearch}
            >
              <SearchMd className="size-[18px]" />
            </Button>

            {showSearch && (
              <Input
                className="mb-2.5 h-9 w-[260px] text-sm"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                autoFocus
              />
            )}

            <TabsList
              className={`flex justify-start border-b-0 px-0 ${showSearch ? "hidden" : ""}`}
            >
              {FAVORITE_TABS.map((tab) => {
                const count = counts[tab] ?? 0
                return (
                  <TabsTrigger
                    key={tab}
                    className="xs:max-lg:text-xs xs:max-lg:leading-5"
                    value={tab}
                  >
                    {tab}
                    {count > 0 ? ` (${count})` : ""}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          <div className="hidden items-center gap-x-3 self-start md:flex lg:gap-x-6">
            {sortSlot}

            <ToggleGroupRoot
              value={layout}
              onValueChange={(details) => onLayoutChange(details.value)}
            >
              <ToggleGroupItem value={GRID_LAYOUT}>
                <Grid className="size-4 lg:size-6" />
              </ToggleGroupItem>
              <ToggleGroupItem value={LIST_LAYOUT}>
                <List className="size-4 lg:size-6" />
              </ToggleGroupItem>
            </ToggleGroupRoot>

            {newGroupSlot}
          </div>
        </div>

        {children}
      </Tabs>
    </>
  )
}
