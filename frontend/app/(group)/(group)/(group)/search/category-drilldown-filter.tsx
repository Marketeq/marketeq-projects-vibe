"use client"

import React, { useMemo, useState } from "react"
import Link from "next/link"
import { cn } from "@/utils/functions"
import { ArrowLeft, ChevronDown, ChevronRight, X } from "@blend-metrics/icons"
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuCheckItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui"
import {
  CategoryErrorState,
  CategorySkeleton,
  CategoryUnavailable,
} from "./category-filter-states"
import { DROPDOWN_MAX_HEIGHT } from "./dropdown-height"
import { useFilterArray, useFilters } from "./filters-context"
import {
  type CategoryScope,
  type CategoryTreeNode,
  collectSubtreeNames,
  commonAncestorPath,
  findSelectedNodes,
  isDescendantOf,
  normalizeName,
  orphanCategoryNodes,
  pruneTreeToNames,
  useAvailableCategoryNames,
  useCategoryTree,
} from "./use-category-tree"

/**
 * Category filter for the Projects, Services and Talent sidebars: one dropdown
 * that drills down through the taxonomy (L1 → L2 → L3), with the picked branch
 * rendered underneath it.
 *
 * Each level of the selection is shown in a different place:
 *
 *  - L1 (the parent category) names the dropdown trigger, and is single-pick:
 *    it decides which taxonomy branch the whole control is working in.
 *  - Every level below it that still has children of its own is a breadcrumb
 *    with a back arrow — you are *inside* it, and the menu is showing its
 *    children.
 *  - Levels with nothing left to drill into are checkboxes, and any number of
 *    them can be ticked; each one shows up as a chip. So Development >
 *    Mobile Development > React Native + Flutter reads as trigger
 *    "Development", crumb "Mobile Development", chips "React Native" and
 *    "Flutter", and returns listings in either.
 *
 * Ticking a box leaves the menu open so the rest of the level can be picked
 * without reopening it; drilling into a branch still moves the menu down a
 * level. Removing a pick steps back rather than clearing the whole filter:
 * a chip's ✕ drops just that one (the last one falls back to its crumb), a
 * crumb's back arrow falls back to the crumb above it, or to the bare parent
 * category.
 *
 * Both filter keys carry expanded NAME lists (every pick plus its
 * descendants) because listings record only their own leaf category name,
 * not their ancestors — see collectSubtreeNames. The backend AND's the two
 * keys against the same attribute while OR-ing the values within each, so
 * several picks widen the results inside the branch the parent already
 * narrowed to. Which nodes those names stand for is read back out by
 * findSelectedNodes, so the selection survives a remount; the parent's name
 * is always first in its own list, which is what the related-skills lookup
 * in page.tsx reads.
 *
 * Teams keep using CategoryDropdownChips — team records carry a single flat
 * `category` with no subcategory taxonomy to drill into.
 *
 * The taxonomy itself is global (one tree for the whole marketplace), so
 * `scope` narrows it to the categories that entity's own records actually use:
 * Projects offers project categories, Services service categories, Talent the
 * disciplines profiles are filed under, and a category common to several shows
 * up in each. That also means every branch offered here has at least one
 * record behind it, so a selection can't land on an empty result set.
 *
 * How deep the control goes therefore follows the data rather than being fixed
 * per entity: levels with nothing behind them are pruned away, so an entity
 * whose records only reach the second level renders a two-level control and
 * gains the third automatically once a record is filed that deep.
 */
export function CategoryDrilldownFilter({
  filterKey,
  subcategoryFilterKey,
  scope,
  title = "Category",
  placeholder = "Select Category",
  footerLinkLabel,
  footerLinkHref,
}: {
  filterKey: string
  subcategoryFilterKey: string
  /**
   * Entity whose records prune the taxonomy. Optional only so the control
   * still renders (unpruned) for a caller that has no scope to offer — pass
   * it whenever the entity has one, or the dropdown offers every category in
   * the marketplace and most picks return nothing.
   */
  scope?: CategoryScope
  title?: string
  placeholder?: string
  footerLinkLabel?: string
  footerLinkHref?: string
}) {
  const [open, setOpen] = useState(false)
  const { setFilter, clearKey } = useFilters()
  const selectedCategoryNames = useFilterArray(filterKey)
  const selectedSubcategoryNames = useFilterArray(subcategoryFilterKey)
  const {
    data: tree,
    isLoading: isTreeLoading,
    isError,
    refetch,
  } = useCategoryTree()
  const { data: availableNames, isLoading: areNamesLoading } =
    useAvailableCategoryNames(scope)

  // Both queries run in parallel, but the tree is only meaningful once it can
  // be pruned — rendering the unpruned tree first would briefly offer the
  // other entity's categories.
  const isLoading = isTreeLoading || areNamesLoading

  // No names back (endpoint unavailable, or nothing indexed/published yet)
  // leaves the full tree rather than an empty dropdown: showing every
  // category is a much smaller failure than showing none.
  // Orphan categories (names that exist in the DB but not in the taxonomy)
  // are appended as flat pseudo-nodes so publishers aren't forced to file
  // every listing under one of the existing taxonomy branches.
  const topLevel = useMemo(() => {
    const roots = tree ?? []
    if (!availableNames?.length) return roots
    const pruned = pruneTreeToNames(
      roots,
      new Set(availableNames.map(normalizeName))
    )
    const orphans = orphanCategoryNodes(roots, availableNames)
    return [...pruned, ...orphans]
  }, [tree, availableNames])

  const hasCachedTree = topLevel.length > 0

  // The selection is recovered from filter state rather than kept in local
  // state so it survives remounts (mobile drawer, sidebar swap) and stays in
  // sync with a "Clear all" that wipes the filter store.
  const selectedParent = useMemo(
    () =>
      topLevel.find((node) => node.name === selectedCategoryNames[0]) ?? null,
    [topLevel, selectedCategoryNames]
  )

  // Everything picked below the parent. The filter array holds each pick
  // expanded into its whole subtree of names, so the picks themselves — and
  // the levels in between, which were never stored — come back from the tree.
  const picked = useMemo(
    () =>
      selectedParent
        ? findSelectedNodes(
            selectedParent.children ?? [],
            selectedSubcategoryNames
          )
        : [],
    [selectedParent, selectedSubcategoryNames]
  )

  const pickedNames = useMemo(
    () => new Set(picked.map((node) => normalizeName(node.name))),
    [picked]
  )

  // The branch the picks share — the whole path to it when there's only one.
  const refinementPath = useMemo(
    () => commonAncestorPath(selectedParent?.children ?? [], picked),
    [selectedParent, picked]
  )

  // A branch pick reads as "you are inside it", so it stays a breadcrumb
  // rather than becoming a chip — drilling into a category is how you get to
  // its children, and a chip would suggest the drilling was over. Ticked
  // boxes are chips instead. Since branches are single-select and ticking a
  // box drops the ancestor it was ticked under (see togglePick), the two
  // never mix: the selection is either one branch or a set of its leaves.
  const isSingleBranchPick =
    picked.length === 1 && Boolean(picked[0].children?.length)
  const chips = isSingleBranchPick ? [] : picked
  const crumbs = isSingleBranchPick
    ? refinementPath
    : refinementPath.filter(
        (node) => !pickedNames.has(normalizeName(node.name))
      )

  // Where the menu is currently pointing. It follows the selection by
  // default; `browse` only holds the position while the user is stepping
  // back through levels without changing what's filtered, and is tagged with
  // the parent it was taken under so a cleared or swapped parent discards it.
  const [browse, setBrowse] = useState<{
    under: string | null
    nodes: CategoryTreeNode[]
  } | null>(null)

  const selectionPath = useMemo(
    () => (selectedParent ? [selectedParent, ...crumbs] : []),
    [selectedParent, crumbs]
  )
  const browsePath =
    browse && browse.under === (selectedParent?.uuid ?? null)
      ? browse.nodes
      : selectionPath

  const currentLevel =
    browsePath.length > 0
      ? (browsePath[browsePath.length - 1].children ?? [])
      : topLevel
  const atTopLevel = browsePath.length === 0

  /** Pure navigation — moves the menu without touching the filters. */
  const navigateTo = (nodes: CategoryTreeNode[]) =>
    setBrowse({ under: selectedParent?.uuid ?? null, nodes })

  const selectParent = (node: CategoryTreeNode) => {
    // Always a plain select, never a toggle: clicking the already-selected
    // parent should drill back into it, not silently wipe the whole filter.
    // Deselecting is what the Clear button is for.
    if (node.uuid !== selectedParent?.uuid) {
      setFilter(filterKey, collectSubtreeNames(node))
      clearKey(subcategoryFilterKey)
    }
    setBrowse(null)
  }

  /** Writes `nodes` back out as the flat, expanded name list the filter holds. */
  const applyPicks = (nodes: CategoryTreeNode[]) => {
    if (!nodes.length) {
      clearKey(subcategoryFilterKey)
      return
    }
    setFilter(
      subcategoryFilterKey,
      Array.from(new Set(nodes.flatMap(collectSubtreeNames)))
    )
  }

  /**
   * Drills into `node`, making it the only pick. Branches are single-select:
   * the level you are inside is what the checkboxes below belong to, so
   * moving to a different one starts its selection over.
   */
  const selectBranch = (node: CategoryTreeNode) => {
    applyPicks([node])
    setBrowse(null)
  }

  /**
   * Adds or removes `node` from the picks, leaving the menu where it is so
   * the rest of the level can be ticked too.
   *
   * Picks that overlap `node` are dropped first, so the ticked boxes are
   * always exactly what the filter sends. That's what turns the branch you
   * drilled into back into a refinement — ticking React Native inside a
   * picked Mobile Development means React Native, not both, which would
   * quietly widen the results back to the whole branch. The descendant case
   * can't come up while branches stay single-select, but is handled for the
   * same reason.
   */
  const togglePick = (node: CategoryTreeNode) => {
    const isPicked = pickedNames.has(normalizeName(node.name))
    const unrelated = picked.filter(
      (item) =>
        normalizeName(item.name) !== normalizeName(node.name) &&
        !isDescendantOf(node, item) &&
        !isDescendantOf(item, node)
    )
    applyPicks(isPicked ? unrelated : [...unrelated, node])
    // Pin the menu to the level being ticked — it would otherwise follow the
    // selection, and picks spanning two branches share no crumb to follow to.
    setBrowse({ under: selectedParent?.uuid ?? null, nodes: browsePath })
  }

  /**
   * Makes `crumbs[index]` the only pick, dropping everything below it; a
   * negative index leaves just the parent category. This is what a crumb's
   * back arrow runs, and where the last removed chip falls back to.
   */
  const stepBackTo = (index: number) => {
    applyPicks(index >= 0 && crumbs[index] ? [crumbs[index]] : [])
    setBrowse(null)
  }

  /**
   * Drops one chip. The others stay — that's the point of multi-select — but
   * removing the last one falls back to the crumb it sat under rather than
   * clearing the refinement outright, so you stay where you were browsing.
   */
  const removeChip = (node: CategoryTreeNode) => {
    const remaining = chips.filter(
      (item) => normalizeName(item.name) !== normalizeName(node.name)
    )
    if (remaining.length) {
      applyPicks(remaining)
      return
    }
    stepBackTo(crumbs.length - 1)
  }

  const clearAllCategories = () => {
    clearKey(filterKey)
    clearKey(subcategoryFilterKey)
    setBrowse(null)
  }

  if (isError && !hasCachedTree) {
    return (
      <div className="py-5 space-y-3">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          {title}
        </span>
        <CategoryUnavailable label={placeholder} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-y-[15px] py-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          {title}
        </span>

        {selectedParent && (
          <Button
            className="text-[11px] leading-6 opacity-50 hover:opacity-100"
            variant="link"
            onClick={clearAllCategories}
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
                className="bg-white font-normal justify-between text-gray-500 px-3 py-2 text-left"
                size="md"
                variant="outlined"
                visual="gray"
              >
                <span className="truncate">
                  {selectedParent?.name ?? placeholder}
                </span>
                <ChevronDown className="size-4 flex-none" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className={cn(
                "min-w-[335px] lg:min-w-[210px]",
                DROPDOWN_MAX_HEIGHT,
                "overflow-auto"
              )}
            >
              {browsePath.length > 0 && (
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    navigateTo(browsePath.slice(0, -1))
                  }}
                >
                  <ArrowLeft className="size-4 text-gray-400" />
                  Back
                </DropdownMenuItem>
              )}

              {currentLevel.map((node) => {
                const hasChildren = Boolean(node.children?.length)

                // Nothing left to drill into, and we're below the parent
                // level: this is a terminal pick, so it's a checkbox and any
                // number of them can be ticked at once. Branches (and the
                // parent level, which chooses the working branch) stay
                // single-select — see selectBranch.
                if (!atTopLevel && !hasChildren) {
                  const isChecked = pickedNames.has(normalizeName(node.name))
                  return (
                    <DropdownMenuCheckItem
                      key={node.uuid}
                      checked={isChecked}
                      className={cn(
                        isChecked && "text-primary-500 font-medium"
                      )}
                      onSelect={() => {
                        togglePick(node)
                        setOpen(false)
                      }}
                    >
                      <span className="truncate">{node.name}</span>
                    </DropdownMenuCheckItem>
                  )
                }

                const isSelected = atTopLevel
                  ? node.uuid === selectedParent?.uuid
                  : refinementPath.some((item) => item.uuid === node.uuid) ||
                    pickedNames.has(normalizeName(node.name))

                return (
                  <DropdownMenuItem
                    key={node.uuid}
                    className={cn(isSelected && "text-primary-500 font-medium")}
                    // Branches select AND drill in on the same click, so
                    // picking a category never costs an extra step but
                    // refining is still one click away. `preventDefault`
                    // keeps the menu open so the user lands on the children
                    // they just drilled into; a parent category with no
                    // children has nothing to land on, so that one closes.
                    onSelect={(event) => {
                      if (hasChildren) event.preventDefault()
                      if (atTopLevel) selectParent(node)
                      else selectBranch(node)
                    }}
                  >
                    <span className="truncate">{node.name}</span>
                    {hasChildren && (
                      <ChevronRight className="ml-auto size-4 flex-none text-gray-400" />
                    )}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}

      {crumbs.length > 0 && (
        <div className="flex flex-col items-start gap-y-[15px]">
          {crumbs.map((node, index) => (
            <Button
              key={node.uuid}
              visual="gray"
              variant="link"
              // Drops this level and everything under it, leaving the level
              // above it (or the bare parent category) filtering the results.
              onClick={() => stepBackTo(index - 1)}
              aria-label={`Remove ${node.name}`}
            >
              <ArrowLeft className="size-[15px]" />
              {node.name}
            </Button>
          ))}
        </div>
      )}

      {chips.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {chips.map((node) => (
            <Badge key={node.uuid} visual="primary">
              {node.name}
              <button
                className="focus-visible:outline-none"
                onClick={() => removeChip(node)}
                aria-label={`Remove ${node.name}`}
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
