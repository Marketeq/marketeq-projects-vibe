"use client"

import React, { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ChevronDown, ChevronRight, X } from "@blend-metrics/icons"
import {
  Badge,
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuCheckItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui"
import { useFilters, useFilterArray } from "./filters-context"
import { useCategoryTree, type CategoryTreeNode } from "./use-category-tree"
import {
  CategorySkeleton,
  CategoryErrorState,
  CategoryUnavailable,
} from "./category-filter-states"

// Walk a taxonomy node and collect its own display name + every descendant's
// display name. Indexed records store only a single (typically leaf-level)
// category NAME in their category attribute, so picking a parent like "Data
// Science" must OR the whole subtree of names into the filter for matches
// filed under any descendant to show up.
function collectSubtreeNames(node: CategoryTreeNode): string[] {
  const names: string[] = [node.name]
  const walk = (nodes?: CategoryTreeNode[]) => {
    if (!Array.isArray(nodes)) return
    for (const child of nodes) {
      if (child.name) names.push(child.name)
      if (child.children?.length) walk(child.children)
    }
  }
  walk(node.children)
  return names
}

/**
 * Hierarchical category picker: dropdown drill-down (L1 → L2 → L3) with
 * selections rendered as removable chips. Used for the real category
 * taxonomy (project_category, service_category, teams' category) — flat,
 * static option lists (Industry, Project Type, …) use the local `Category`
 * component in sidebar.tsx instead.
 */
export function CategoryDropdownChips({
  filterKey,
  title = "Category",
  placeholder = "Select Category",
  footerLinkLabel,
  footerLinkHref,
}: {
  filterKey: string
  title?: string
  placeholder?: string
  footerLinkLabel?: string
  footerLinkHref?: string
}) {
  const [open, setOpen] = useState(false)
  const [path, setPath] = useState<CategoryTreeNode[]>([])
  const { toggleValue, clearKey } = useFilters()
  const selected = useFilterArray(filterKey)
  const { data: tree, isLoading, isError, refetch } = useCategoryTree()

  const currentLevel = path.length > 0 ? (path[path.length - 1].children ?? []) : (tree ?? [])
  const breadcrumbs = path.map((node) => node.name)
  const goToBreadcrumb = (index: number) => setPath((prev) => prev.slice(0, index))
  const hasCachedTree = Array.isArray(tree) && tree.length > 0

  if (isError && !hasCachedTree) {
    return (
      <div className="py-5 space-y-3">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">{title}</span>
        <CategoryUnavailable label={placeholder} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-y-[15px] py-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">{title}</span>

        {selected.length > 0 && (
          <Button
            className="text-[11px] leading-6 opacity-50 hover:opacity-100"
            variant="link"
            onClick={() => {
              clearKey(filterKey)
              setPath([])
            }}
            visual="gray"
          >
            Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <CategorySkeleton />
      ) : (
        <>
          {isError && <CategoryErrorState onRetry={() => refetch()} />}

          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                className="bg-white font-normal justify-between text-gray-500 px-3 py-2"
                size="md"
                variant="outlined"
                visual="gray"
              >
                {placeholder}
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-[335px] lg:min-w-[210px]">
              {path.length > 0 && (
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    setPath((prev) => prev.slice(0, -1))
                  }}
                >
                  <ArrowLeft className="size-4 text-gray-400" />
                  Back
                </DropdownMenuItem>
              )}

              {currentLevel.map((node) => {
                const hasChildren = Boolean(node.children?.length)

                if (hasChildren) {
                  const subtreeNames = collectSubtreeNames(node)
                  // Passive indicator only — checked when the user has picked
                  // any subcategory inside this branch. Clicking the row just
                  // drills into the branch; it never selects the whole subtree
                  // (that's what produced the "every chip selected" bug). The
                  // user picks a single main category and then checks the
                  // individual subcategories they actually want.
                  const hasSelectedDescendant = subtreeNames
                    .slice(1)
                    .some((n) => selected.includes(n))
                  return (
                    <DropdownMenuItem
                      key={node.uuid}
                      onSelect={(event) => {
                        event.preventDefault()
                        setPath((prev) => [...prev, node])
                      }}
                    >
                      <Checkbox
                        checked={hasSelectedDescendant}
                        disabled
                        className="pointer-events-none opacity-100"
                      />
                      {node.name}
                      <ChevronRight className="ml-auto size-4 text-gray-400" />
                    </DropdownMenuItem>
                  )
                }

                return (
                  <DropdownMenuCheckItem
                    checked={selected.includes(node.name)}
                    onCheckedChange={() => toggleValue(filterKey, node.name)}
                    key={node.uuid}
                  >
                    {node.name}
                  </DropdownMenuCheckItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}

      {breadcrumbs.length > 0 && (
        <div className="flex flex-col items-start gap-y-[15px]">
          {breadcrumbs.map((breadcrumb, index) => (
            <Button
              key={`${breadcrumb}-${index}`}
              visual="gray"
              variant="link"
              onClick={() => goToBreadcrumb(index)}
            >
              <ArrowLeft className="size-[15px]" />
              {breadcrumb}
            </Button>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {selected.map((option, index) => (
            <Badge visual="primary" key={index}>
              {option}
              <button
                className="focus-visible:outline-none"
                onClick={() => toggleValue(filterKey, option)}
              >
                <X className="size-3 opacity-50 hover:opacity-100" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {footerLinkLabel &&
        (footerLinkHref ? (
          <Button
            asChild
            className="self-start h-6 w-fit min-w-[111px] justify-center items-center gap-2 p-0 underline decoration-current/30 underline-offset-2 hover:decoration-current"
            visual="gray"
            variant="link"
          >
            <Link href={footerLinkHref}>{footerLinkLabel}</Link>
          </Button>
        ) : (
          <Button
            className="self-start h-6 w-fit min-w-[111px] justify-center items-center gap-2 p-0 underline decoration-current/30 underline-offset-2 hover:decoration-current"
            visual="gray"
            variant="link"
          >
            {footerLinkLabel}
          </Button>
        ))}
    </div>
  )
}
