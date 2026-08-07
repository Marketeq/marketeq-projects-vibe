"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { HOT_KEYS } from "@/utils/constants"
import { cn, getFirstItem, getIsNotEmpty } from "@/utils/functions"
import {
  ArrowLeft,
  ArrowUp,
  Building02,
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
  MarkerPin02,
  Plus,
  Sliders02,
  Sliders04,
  Star,
  Tag,
  Users,
  X,
  X2,
} from "@blend-metrics/icons"
import { useToggle } from "react-use"
import {
  ToggleGroup,
  ToggleGroupItem,
  ToggleGroupRoot,
} from "@/components/ui/toggle-group"
import { Grid, List, SortAs } from "@/components/icons"
import { Logo4 } from "@/components/icons/logo-4"
import { SearchCard } from "@/components/search-card"
import { SearchCardLandscape } from "@/components/search-card-landscape"
import {
  Badge,
  Button,
  Checkbox,
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  ComboboxPrimitive,
  ComboboxTrigger,
  Dialog,
  DialogClose,
  DialogContent,
  DropdownMenu,
  DropdownMenuCheckItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Favorite,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightAddon,
  InputRightElement,
  Label,
  RadioGroup,
  RadioGroupItem,
  ScaleOutIn,
  ScrollArea,
  ScrollBar,
  Toggle,
  inputVariants,
} from "@/components/ui"
import type { CategoryTreeNode } from "@/service/http/category"
import { useFilters, useFilterArray, useFilterString } from "./filters-context"
import { useCategoryTree } from "./use-category-tree"
import {
  useFilterValueNames,
  useNumericBuckets,
  type FilterValueField,
  type FilterValueScope,
  type NumericBucketField,
  type NumericBucketScope,
} from "./use-filter-values"
import { CategoryDropdownChips } from "./category-dropdown-chips"
import { CategoryDrilldownFilter } from "./category-drilldown-filter"
import { DROPDOWN_MAX_HEIGHT } from "./dropdown-height"
import { COUNTRIES, canonicalCountry } from "./countries"

/** Used by the Projects sidebar. Services hides its Team Size filter — see SidebarServices. */
const TEAM_SIZE_OPTIONS = [
  "1 - 2 members",
  "2 - 5 members",
  "5 - 10 members",
  "10 - 15 members",
  "15 - 20 members",
  "20 + members",
]

const Budget = ({
  title = "Budget",
  filterKeyMin = "budget_min",
  filterKeyMax = "budget_max",
}: {
  title?: string
  filterKeyMin?: string
  filterKeyMax?: string
}) => {
  const { setFilter } = useFilters()
  const minRate = useFilterString(filterKeyMin)
  const maxRate = useFilterString(filterKeyMax)
  const onMinRateInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const {
      target: { value },
    } = event
    setFilter(filterKeyMin, value.replace(/\D/g, ""))
  }
  const onMaxRateInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const {
      target: { value },
    } = event
    setFilter(filterKeyMax, value.replace(/\D/g, ""))
  }
  const onMinRateInputPaste = (
    event: React.ClipboardEvent<HTMLInputElement>
  ) => {
    event.preventDefault()
    const pastedText = event.clipboardData.getData("text")
    const digitsOnly = pastedText.replace(/\D/g, "")
    setFilter(filterKeyMin, minRate + digitsOnly)
  }
  const onMaxRateInputPaste = (
    event: React.ClipboardEvent<HTMLInputElement>
  ) => {
    event.preventDefault()
    const pastedText = event.clipboardData.getData("text")
    const digitsOnly = pastedText.replace(/\D/g, "")
    setFilter(filterKeyMax, maxRate + digitsOnly)
  }
  const reset = () => {
    setFilter(filterKeyMin, undefined)
    setFilter(filterKeyMax, undefined)
  }
  const hasValues = Boolean(minRate || maxRate)
  return (
    <div className="py-5 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          {title}
        </h1>

        {hasValues && (
          <Button
            className="text-[11px] leading-6 opacity-50 hover:opacity-100"
            variant="link"
            onClick={reset}
            visual="gray"
          >
            Clear
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-3">
        <div className="flex flex-col gap-y-1.5">
          <InputGroup>
            <Input
              id={filterKeyMin}
              type="text"
              className="pl-10 h-10 w-full"
              value={minRate}
              onChange={onMinRateInputChange}
              onPaste={onMinRateInputPaste}
            />
            <InputLeftElement className="w-10">
              <DollarSign className="text-gray-500 size-4" />
            </InputLeftElement>
          </InputGroup>

          <Label className="text-gray-500" htmlFor={filterKeyMin} size="sm">
            Min
          </Label>
        </div>
        <div className="flex flex-col gap-y-1.5">
          <InputGroup>
            <Input
              id={filterKeyMax}
              type="text"
              className="pl-10 h-10 w-full"
              value={maxRate}
              onChange={onMaxRateInputChange}
              onPaste={onMaxRateInputPaste}
            />
            <InputLeftElement className="w-10">
              <DollarSign className="text-gray-500 size-4" />
            </InputLeftElement>
          </InputGroup>

          <Label className="text-gray-500" htmlFor={filterKeyMax} size="sm">
            Max
          </Label>
        </div>
      </div>
    </div>
  )
}

/**
 * Fallback industries for the sidebars that have no listing scope to derive
 * them from (Talent, Teams, Jobs). Projects and Services pass `scope` instead
 * and get the industries their published listings actually carry.
 */
const FALLBACK_INDUSTRIES = [
  "Fintech",
  "Real Estate",
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
]

/**
 * Industry filter. Pass `scope` to derive the options from that entity's
 * published listings (see useFilterValues) instead of a hardcoded list — the
 * options then track what publishers actually entered, and every one of them
 * has at least one listing behind it. Without `scope` the static fallback is
 * used, so the sidebars not covered here keep their current behaviour.
 */
const Industry = ({
  title = "Industry",
  placeholder = "Select Industry",
  options,
  filterKey = "industries",
  scope,
}: {
  title?: string
  placeholder?: string
  options?: string[]
  filterKey?: string
  scope?: FilterValueScope
}) => {
  // Always called; the query is disabled unless `scope` is set.
  const { names: derived, isLoading } = useFilterValueNames(scope, "industries")

  // An explicit `options` prop still wins — Jobs passes its own curated list.
  const resolved = options ?? (scope ? derived : FALLBACK_INDUSTRIES)

  if (scope && options === undefined) {
    if (isLoading) return <FilterSkeleton title={title} />
    // Nothing published carries an industry yet (or the request failed) —
    // an empty dropdown is worse than no section at all.
    if (!resolved.length) return null
  }

  return (
    <Category
      title={title}
      placeholder={placeholder}
      options={resolved}
      filterKey={filterKey}
      breadcrumbs={[]}
    />
  )
}

const Category = ({
  title = "Category",
  placeholder = "Select Category",
  options,
  filterKey = "project_category",
  breadcrumbs,
  footerLinkLabel,
  footerLinkHref,
}: {
  title?: string
  placeholder?: string
  options?: string[]
  filterKey?: string
  breadcrumbs?: string[]
  footerLinkLabel?: string
  footerLinkHref?: string
}) => {
  const [open, setOpen] = useState(false)
  const { setFilter, toggleValue, clearKey } = useFilters()
  const selected = useFilterArray(filterKey)

  // Hierarchical mode (real L1 → L2 → L3 taxonomy fetched from
  // category-service) is the default — callers that need a flat
  // single-level list (Industry, Project Type, Job Type) opt out by
  // passing `options` explicitly.
  const isHierarchical = options === undefined
  const { data: tree, isLoading, isError } = useCategoryTree(isHierarchical)
  const flatOptions = options ?? []
  const staticBreadcrumbs = breadcrumbs ?? []

  // Drill-down path for hierarchical mode: e.g. [Development, Web Development]
  const [path, setPath] = useState<CategoryTreeNode[]>([])

  // Walk a taxonomy node and collect its own display name + every
  // descendant's display name. Indexed records store only a single
  // (typically leaf-level) category NAME in their `project_category` /
  // `category` attribute (see algolia-service sync.service.ts →
  // `project_category: listing.category`, which copies the first
  // `categories[].value` from the CMS — a display name, not a slug, and
  // never the ancestor path). So for a parent pick like "Data Science" to
  // actually match projects filed under "Machine Learning" /
  // "Data Engineering" / etc., the frontend must OR the whole subtree of
  // names into the filter. Both backends (Algolia pushArrayFilter and the
  // DB fallback's scalarInAny) already handle a multi-value OR.
  const collectSubtreeNames = (node: CategoryTreeNode): string[] => {
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

  // Toggle a parent node's entire subtree of names on/off as a single
  // unit: if any of its descendants is already selected we treat the
  // parent as "on" and turn the whole group off; otherwise we add the
  // full subtree. This mirrors how a leaf checkbox uses `toggleValue`,
  // but for a branch.
  const toggleParentSubtree = (node: CategoryTreeNode) => {
    const subtreeNames = collectSubtreeNames(node)
    const alreadyOn = subtreeNames.some((n) => selected.includes(n))
    if (alreadyOn) {
      // Remove every name in the subtree that's currently selected.
      setFilter(
        filterKey,
        selected.filter((n) => !subtreeNames.includes(n))
      )
    } else {
      // Union the subtree names into whatever's already selected so a
      // user can combine branches (e.g. Data Science + Design).
      setFilter(
        filterKey,
        Array.from(new Set([...selected, ...subtreeNames]))
      )
    }
  }

  const currentLevel = isHierarchical
    ? path.length > 0
      ? path[path.length - 1].children ?? []
      : tree ?? []
    : []

  const enabledOptions = isHierarchical
    ? selected
    : flatOptions.filter((item) => selected.includes(item))

  const disableOption = (key: string) => toggleValue(filterKey, key)

  const activeBreadcrumbs = isHierarchical ? path.map((node) => node.name) : staticBreadcrumbs

  // Clicking a breadcrumb steps back to just before that level, letting the
  // user pick a different branch from there (e.g. clicking "Web Development"
  // in Development > Web Development > API Integration drops back to
  // Development's children).
  const goToBreadcrumb = (index: number) => {
    if (isHierarchical) {
      setPath((prev) => prev.slice(0, index))
    } else {
      toggleValue(filterKey, staticBreadcrumbs[index])
    }
  }

  return (
    <div className="flex flex-col gap-y-[15px] py-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          {title}
        </span>

        {enabledOptions.length > 0 && (
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
        <DropdownMenuContent className={cn("min-w-[335px] lg:min-w-[210px]", DROPDOWN_MAX_HEIGHT, "overflow-auto")}>
          {isHierarchical && isLoading && (
            <div className="px-3 py-2.5 text-[13px] text-gray-400">
              Loading categories…
            </div>
          )}

          {isHierarchical && isError && (
            <div className="px-3 py-2.5 text-[13px] text-error-500">
              Couldn&apos;t load categories.
            </div>
          )}

          {isHierarchical && path.length > 0 && (
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

          {isHierarchical
            ? currentLevel.map((node) => {
                const hasChildren = Boolean(node.children?.length)

                if (hasChildren) {
                  const subtreeNames = collectSubtreeNames(node)
                  const subtreeOn = subtreeNames.some((n) => selected.includes(n))
                  return (
                    <DropdownMenuItem
                      key={node.uuid}
                      onSelect={(event) => {
                        event.preventDefault()
                        // Selecting a parent category immediately
                        // filters by its entire subtree of names (so
                        // projects filed under any descendant match)
                        // AND drills into its children so the user can
                        // refine further if they want. See
                        // `toggleParentSubtree` for why we OR the whole
                        // subtree instead of just the parent name.
                        toggleParentSubtree(node)
                        setPath((prev) => [...prev, node])
                      }}
                    >
                      <Checkbox
                        checked={subtreeOn}
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
                    onCheckedChange={() => {
                      toggleValue(filterKey, node.name)
                      setOpen(false)
                    }}
                    key={node.uuid}
                  >
                    {node.name}
                  </DropdownMenuCheckItem>
                )
              })
            : flatOptions.map((item, index) => (
                <DropdownMenuCheckItem
                  checked={selected.includes(item)}
                  onCheckedChange={() => {
                    toggleValue(filterKey, item)
                    setOpen(false)
                  }}
                  key={index}
                >
                  {item}
                </DropdownMenuCheckItem>
              ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {activeBreadcrumbs.length > 0 && (
        <div className="flex flex-col items-start gap-y-[15px]">
          {activeBreadcrumbs.map((breadcrumb, index) => (
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

      {enabledOptions.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {enabledOptions.map((option, index) => (
            <Badge visual="primary" key={index}>
              {option}
              <button
                className="focus-visible:outline-none"
                onClick={() => disableOption(option)}
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

/**
 * Fallback skill suggestions for the controls with no listing scope to derive
 * them from (Talent, Teams, Jobs, and the Skills-shaped Location/Language
 * pickers). Projects and Services pass `scope` instead and get the skills
 * their published listings actually carry.
 */
const skills = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "HTML",
  "CSS",
  "Git",
  "REST APIs",
  "GraphQL",
  "SQL",
  "NoSQL",
  "Docker",
  "Kubernetes",
  "AWS",
  "Azure",
  "Google Cloud",
  "Agile Methodologies",
  "Test-Driven Development (TDD)",
  "CI/CD",
  "Machine Learning",
  "Data Analysis",
  "UI/UX Design",
  "Version Control",
  "Web Security",
]

/**
 * Chip-input filter with type-ahead suggestions. Pass `scope` to derive the
 * suggestions from that entity's real records (see useFilterValues) instead of
 * a hardcoded list, so every suggestion has at least one record behind it.
 * Without `scope` the static fallback is used, keeping the other sidebars —
 * and the Location/Language pickers that reuse this control with their own
 * `suggestions` — unchanged.
 *
 * `field` says which derived field to read, so the same control backs both
 * Skills and the Talent sidebar's Job Title. It only matters alongside
 * `scope`; the pair has to be one the backend has a source for (see
 * FILTER_VALUE_SOURCES) or the request 400s.
 *
 * Free typing still adds whatever the user enters, which is deliberate: the
 * no-dead-option guarantee covers the suggestions offered, not a search the
 * user types by hand. `canonicalize` opts a control out of that, for the
 * Location pickers, whose vocabulary is closed (see LocationFilter).
 */
const Skills = ({
  title = "Skills",
  placeholder = "Add skills by keyword",
  suggestions,
  filterKey = "skills",
  scope,
  field = "skills",
  limit,
  canonicalize,
  icon: AddonIcon = Plus,
}: {
  title?: string
  placeholder?: string
  suggestions?: string[]
  filterKey?: string
  scope?: FilterValueScope
  /** Which derived filter field `scope` should read. Ignored without `scope`. */
  field?: FilterValueField
  /**
   * How many derived values to ask for. Omit to take the backend's per-field
   * default — override only when that default was tuned for a differently
   * shaped control (the `tags` default suits a short checkbox list, not this
   * combobox).
   */
  limit?: number
  /**
   * Maps what the user typed to the one spelling the filter matches, or "" if
   * it isn't a value this control accepts at all — in which case typing it
   * adds nothing. Omit to keep free typing.
   */
  canonicalize?: (value: string) => string
  /** Trailing add-button glyph — the Talent sidebar gives each chip input its own. */
  icon?: React.ComponentType<{ className?: string }>
}) => {
  const [inputValue, setInputValue] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const { setFilter, clearKey } = useFilters()
  // Always called; the query is disabled unless `scope` is set. An explicit
  // `suggestions` prop still wins, for the callers passing a curated list.
  const { names: derivedSuggestions } = useFilterValueNames(scope, field, limit)
  const resolvedSuggestions = suggestions ?? (scope ? derivedSuggestions : skills)
  const values = useFilterArray(filterKey)
  // Headless UI's `multiple` Combobox keeps its options panel open after a
  // pick (so several rows can be ticked in a row) and this version exposes no
  // imperative "close" call — even blurring the input gets undone, since
  // Headless UI re-focuses it as part of its own click handling. Tracking our
  // own "just picked a row" flag and using it to skip rendering the panel is
  // what actually makes the click close it; typing (or refocusing) clears the
  // flag so the panel comes back for the next search.
  const [justPicked, setJustPicked] = useState(false)

  const resetInputValue = () => setInputValue("")
  const reset = () => {
    clearKey(filterKey)
    setSelected([])
  }
  const addValue = () => {
    if (!inputValue) return

    // A closed-vocabulary control drops anything outside it rather than
    // filtering on a value that can never match; the input keeps the text so
    // the user can correct it.
    const value = canonicalize ? canonicalize(inputValue) : inputValue
    if (!value) return

    if (!values.includes(value)) {
      setFilter(filterKey, [...values, value])
    }
    resetInputValue()
  }
  const removeValue = (index: number) => {
    const tag = values[index]

    setFilter(
      filterKey,
      values.filter((_, i) => i !== index)
    )
    setSelected((prev) => prev.filter((value) => value !== tag))
  }

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const {
      target: { value },
    } = event
    setJustPicked(false)
    setInputValue(value)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const { key } = event
    if (key === HOT_KEYS.ENTER) addValue()
  }

  const filteredSkills = resolvedSuggestions.filter((skill) =>
    skill.toLowerCase().includes(inputValue.toLowerCase())
  )

  const onComboboxChange = (next: string[]) => {
    setSelected(next)
    const additions = next.filter((value) => !values.includes(value))
    if (additions.length) setFilter(filterKey, [...values, ...additions])
    setJustPicked(true)
  }

  return (
    <div className="space-y-3 py-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          {title}
        </span>

        {getIsNotEmpty(values) && (
          <Button
            className="text-[11px] leading-6 opacity-50 hover:opacity-100"
            variant="link"
            onClick={reset}
            visual="gray"
          >
            Clear
          </Button>
        )}
      </div>

      <Combobox
        className="w-full"
        value={selected}
        onChange={onComboboxChange}
        multiple
      >
        <InputGroup>
          <ComboboxPrimitive.Input
            placeholder={placeholder}
            className={cn(
              inputVariants({
                className: "h-10 text-xs rounded-r-none leading-6 font-normal",
              })
            )}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onClick={() => setJustPicked(false)}
            value={inputValue}
          />
          <InputRightAddon className="rounded-l-none size-10 bg-gray-100">
            <button
              className="focus-visible:outline-none"
              onClick={addValue}
              aria-label={`Add ${title.toLowerCase()}`}
            >
              <AddonIcon className="size-4" />
            </button>
          </InputRightAddon>
        </InputGroup>
        {!justPicked && (
          <ScaleOutIn afterLeave={() => setInputValue("")}>
            <ComboboxOptions>
              <ScrollArea viewportClassName={DROPDOWN_MAX_HEIGHT}>
                {filteredSkills.map((skill, index) => (
                  <ComboboxOption key={index} value={skill}>
                    {skill}
                  </ComboboxOption>
                ))}
              </ScrollArea>
            </ComboboxOptions>
          </ScaleOutIn>
        )}
      </Combobox>

      <div className="flex flex-wrap gap-3">
        {values.map((value, index) => (
          <Badge visual="primary" key={index}>
            {value}
            <button
              className="focus-visible:outline-none"
              onClick={() => removeValue(index)}
            >
              <X2 className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  )
}

const additionalTags = [
  "Software Development",
  "Artificial Intelligence",
  "Cybersecurity",
  "Cloud Computing",
  "Blockchain",
  "Data Science",
  "Internet of Things (IoT)",
  "Pharmaceuticals",
  "Biotechnology",
  "Medical Devices",
  "Telemedicine",
  "Health Insurance",
  "Hospitals",
  "Wellness & Fitness",
  "Banking",
  "Investment Management",
  "Financial Technology",
]

const AdditionalTags = ({
  filterKey = "additional_tags",
}: {
  filterKey?: string
}) => {
  return (
    <Skills
      title="Additional Tags"
      placeholder="Enter Job Title"
      suggestions={additionalTags}
      filterKey={filterKey}
    />
  )
}

/**
 * Dynamic Tags filter — same checkbox-list UI as CheckboxGroup, but the
 * options are the tags this entity's published listings actually carry,
 * ranked by how many listings use each one and cut to the backend's per-field
 * default (see useFilterValues / GET /search/filter-values).
 *
 * Two consequences worth keeping:
 *
 *  - Nothing here is maintained by hand. A tag appears because someone
 *    published a listing with it, and drops off when it stops being one of
 *    the most used, so the filter tracks the catalogue on its own.
 *  - `scope` is required, not optional. Projects and Services rank their own
 *    listings separately, so each sidebar offers its own tags (tags used by
 *    both legitimately appear in both). It also means every option has at
 *    least one listing behind it, so ticking one on its own can't return
 *    zero results.
 */
const TagsFilter = ({
  scope,
  filterKey = "tags",
}: {
  scope: FilterValueScope
  filterKey?: string
}) => {
  const { names: options, isLoading } = useFilterValueNames(scope, "tags")

  if (isLoading) return <FilterSkeleton title="Tags" />

  // No published listing of this entity carries a tag yet (or the request
  // failed) — an empty Tags heading with nothing under it is worse than no
  // section at all.
  if (!options.length) return null

  return <CheckboxGroup title="Tags" filterKey={filterKey} options={options} />
}

/** Shimmer rows shown while a derived filter's options are loading. */
const FilterSkeleton = ({ title }: { title: string }) => (
  <div className="space-y-5 py-5">
    <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
      {title}
    </span>
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-4 w-full animate-pulse rounded bg-gray-100" />
      ))}
    </div>
  </div>
)

const ProjectType = ({ filterKey = "project_type" }: { filterKey?: string }) => (
  <Category
    title="Project Type"
    placeholder="Select Project Type"
    options={["Mobile app", "Web app", "Desktop app", "API", "Watch app", "TV app"]}
    filterKey={filterKey}
    breadcrumbs={[]}
  />
)

/* ─── Reusable checkbox group ─────────────────────────────────────────── */

const CheckboxGroup = ({
  title,
  options,
  filterKey,
}: {
  title: string
  options: string[]
  filterKey: string
}) => {
  const { toggleValue, clearKey } = useFilters()
  const selected = useFilterArray(filterKey)

  const hasSelections = selected.length > 0

  return (
    <div className="space-y-5 py-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          {title}
        </span>

        {hasSelections && (
          <Button
            className="text-[11px] leading-6 opacity-50 hover:opacity-100"
            variant="link"
            onClick={() => clearKey(filterKey)}
            visual="gray"
          >
            Clear
          </Button>
        )}
      </div>
      <div className="space-y-3">
        {options.map((opt) => {
          const id = `${filterKey}-${opt}`.toLowerCase().replace(/[^a-z0-9]+/g, "-")
          return (
            <div key={id} className="flex items-center gap-x-3.5">
              <Checkbox
                id={id}
                checked={selected.includes(opt)}
                onCheckedChange={() => toggleValue(filterKey, opt)}
              />
              <Label
                htmlFor={id}
                className="font-normal text-[#667085]"
                size="sm"
              >
                {opt}
              </Label>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Numeric bucket group ────────────────────────────────────────────── */

type NumericBucket = {
  label: string
  /** Inclusive lower bound; omitted for an "any" option that clears the filter. */
  min?: number
  /** Inclusive upper bound; omitted for open-ended buckets like "50 + projects". */
  max?: number
}

/**
 * Checkbox list whose options stand for numeric ranges rather than literal
 * values — Projects Completed, Average Rating and Client Success Rate all
 * read as buckets in the UI but have to reach the backend as plain numeric
 * bounds (`projects_completed_min/max`, `rating_min`, …).
 *
 * Ticking several buckets reads as "any of these", so the bounds widen to
 * cover all of them: the lowest `min` wins, and the upper bound only survives
 * if every selected bucket has one — pairing "25 - 50" with "50 + projects"
 * has to stay open-ended rather than capping at 50. An option with no `min`
 * ("Any rating") is the explicit opt-out and clears the filter entirely.
 *
 * Selection lives in the filter state itself, keyed by `selectionKey`, so it
 * survives re-renders and the section's Clear button — the numeric bounds
 * alone can't be reversed back into which boxes were ticked.
 *
 * Pass `scope` to read the rungs from the backend instead of listing them in
 * `buckets` (see useNumericBuckets), so the ladder is declared in one place
 * next to the attribute it filters on rather than duplicated here. The section
 * always renders every rung — it's a fixed part of the sidebar's design — and
 * `buckets` is the ladder shown until the request lands, so it never flashes
 * empty. `buckets` alone stays the static path for the sections with no
 * backend source yet.
 */
const NumericBucketGroup = ({
  title,
  buckets,
  minKey,
  maxKey,
  selectionKey,
  scope,
  field,
}: {
  title: string
  /** The rungs to show. With `scope`, these are the ones shown until the backend's arrive. */
  buckets?: NumericBucket[]
  minKey: string
  maxKey?: string
  selectionKey: string
  /** Derive the rungs from this entity's records rather than from `buckets`. */
  scope?: NumericBucketScope
  /** Which numeric field `scope` should read. Required with `scope`. */
  field?: NumericBucketField
}) => {
  const { setFilter, clearKey } = useFilters()
  const selected = useFilterArray(selectionKey)
  // Always called; the query is disabled unless `scope` is set.
  const { data: derivedBuckets } = useNumericBuckets(
    scope,
    field ?? "client_success_rate"
  )
  // The backend's ladder wins once it arrives; `buckets` covers the gap before
  // that and an outright failure, so the section never renders headless.
  const resolvedBuckets: NumericBucket[] = derivedBuckets?.length
    ? derivedBuckets
    : (buckets ?? [])

  const apply = (labels: string[]) => {
    const picked = resolvedBuckets.filter((bucket) =>
      labels.includes(bucket.label)
    )
    const bounded = picked.filter((bucket) => bucket.min !== undefined)

    if (!bounded.length) {
      setFilter(minKey, undefined)
      if (maxKey) setFilter(maxKey, undefined)
      return
    }

    setFilter(minKey, Math.min(...bounded.map((bucket) => bucket.min as number)))

    if (!maxKey) return
    const everyBucketCapped = bounded.every((bucket) => bucket.max !== undefined)
    setFilter(
      maxKey,
      everyBucketCapped
        ? Math.max(...bounded.map((bucket) => bucket.max as number))
        : undefined
    )
  }

  const toggle = (label: string) => {
    const next = selected.includes(label)
      ? selected.filter((item) => item !== label)
      : [...selected, label]
    setFilter(selectionKey, next.length ? next : undefined)
    apply(next)
  }

  const reset = () => {
    clearKey(selectionKey)
    apply([])
  }

  return (
    <div className="space-y-5 py-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          {title}
        </span>

        {selected.length > 0 && (
          <Button
            className="text-[11px] leading-6 opacity-50 hover:opacity-100"
            variant="link"
            onClick={reset}
            visual="gray"
          >
            Clear
          </Button>
        )}
      </div>
      <div className="space-y-3">
        {resolvedBuckets.map((bucket) => {
          const id = `${selectionKey}-${bucket.label}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
          return (
            <div key={id} className="flex items-center gap-x-3.5">
              <Checkbox
                id={id}
                checked={selected.includes(bucket.label)}
                onCheckedChange={() => toggle(bucket.label)}
              />
              <Label
                htmlFor={id}
                className="font-normal text-[#667085]"
                size="sm"
              >
                {bucket.label}
              </Label>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Hourly Rate ─────────────────────────────────────────────────────── */

const HourlyRate = ({
  filterKeyMin = "hourly_rate_min",
  filterKeyMax = "hourly_rate_max",
}: {
  filterKeyMin?: string
  filterKeyMax?: string
}) => {
  const { setFilter } = useFilters()
  const minRate = useFilterString(filterKeyMin)
  const maxRate = useFilterString(filterKeyMax)
  return (
    <div className="py-5 space-y-5">
      <h1 className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
        Hourly Rate
      </h1>
      <div className="grid grid-cols-2 gap-x-3">
        <div className="flex flex-col gap-y-1.5">
          <InputGroup>
            <Input
              id={filterKeyMin}
              type="text"
              className="pl-10 h-10 w-full"
              value={minRate}
              onChange={(e) =>
                setFilter(filterKeyMin, e.target.value.replace(/\D/g, ""))
              }
            />
            <InputLeftElement className="w-10">
              <DollarSign className="text-gray-500 size-4" />
            </InputLeftElement>
          </InputGroup>
          <Label className="text-gray-500" htmlFor={filterKeyMin} size="sm">
            Min /hr
          </Label>
        </div>
        <div className="flex flex-col gap-y-1.5">
          <InputGroup>
            <Input
              id={filterKeyMax}
              type="text"
              className="pl-10 h-10 w-full"
              value={maxRate}
              onChange={(e) =>
                setFilter(filterKeyMax, e.target.value.replace(/\D/g, ""))
              }
            />
            <InputLeftElement className="w-10">
              <DollarSign className="text-gray-500 size-4" />
            </InputLeftElement>
          </InputGroup>
          <Label className="text-gray-500" htmlFor={filterKeyMax} size="sm">
            Max /hr
          </Label>
        </div>
      </div>
    </div>
  )
}

/* ─── Monthly Budget (Services) ───────────────────────────────────────── */

const MonthlyBudget = ({
  filterKeyMin = "price_min",
  filterKeyMax = "price_max",
}: {
  filterKeyMin?: string
  filterKeyMax?: string
}) => {
  const { setFilter } = useFilters()
  const minRate = useFilterString(filterKeyMin)
  const maxRate = useFilterString(filterKeyMax)
  return (
    <div className="py-5 space-y-5">
      <h1 className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
        Monthly Budget
      </h1>
      <div className="grid grid-cols-2 gap-x-3">
        <div className="flex flex-col gap-y-1.5">
          <InputGroup>
            <Input
              id={filterKeyMin}
              type="text"
              className="pl-10 h-10 w-full"
              value={minRate}
              onChange={(e) =>
                setFilter(filterKeyMin, e.target.value.replace(/\D/g, ""))
              }
            />
            <InputLeftElement className="w-10">
              <DollarSign className="text-gray-500 size-4" />
            </InputLeftElement>
          </InputGroup>
          <Label className="text-gray-500" htmlFor={filterKeyMin} size="sm">
            Min /month
          </Label>
        </div>
        <div className="flex flex-col gap-y-1.5">
          <InputGroup>
            <Input
              id={filterKeyMax}
              type="text"
              className="pl-10 h-10 w-full"
              value={maxRate}
              onChange={(e) =>
                setFilter(filterKeyMax, e.target.value.replace(/\D/g, ""))
              }
            />
            <InputLeftElement className="w-10">
              <DollarSign className="text-gray-500 size-4" />
            </InputLeftElement>
          </InputGroup>
          <Label className="text-gray-500" htmlFor={filterKeyMax} size="sm">
            Max /month
          </Label>
        </div>
      </div>
    </div>
  )
}

/* ─── Location filter (countries only) ───────────────────────────────── */

/**
 * The one Location control every sidebar uses.
 *
 * Countries only — no cities, no free text. Focusing the input shows all
 * countries alphabetically (COUNTRIES is the whole list, and an empty query
 * matches every entry), typing narrows that list, and anything that isn't a
 * country is refused rather than sent as a filter value nothing can match.
 * Multiple countries can be selected; they OR together like every other chip
 * filter.
 */
const LocationFilter = ({
  label = "Location",
  placeholder = "Add country",
  filterKey = "location",
}: {
  label?: string
  placeholder?: string
  filterKey?: string
}) => (
  <Skills
    title={label}
    placeholder={placeholder}
    filterKey={filterKey}
    suggestions={COUNTRIES}
    canonicalize={canonicalCountry}
    icon={MarkerPin02}
  />
)

const DropdownFacetSection = ({
  title,
  placeholder,
  options,
  initialSelected = [],
}: {
  title: string
  placeholder: string
  options: string[]
  initialSelected?: string[]
}) => {
  const [open, setOpen] = useState(false)
  const [selections, setSelections] = useState<Record<string, boolean>>(
    Object.fromEntries(
      options.map((option) => [option, initialSelected.includes(option)])
    )
  )

  const enabledOptions = Object.keys(selections).filter(
    (option) => selections[option]
  )

  const reset = () => {
    setSelections(Object.fromEntries(options.map((option) => [option, false])))
  }

  const disableOption = (option: string) => {
    setSelections((prev) => ({ ...prev, [option]: false }))
  }

  return (
    <div className="flex flex-col gap-y-3 py-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          {title}
        </span>

        {enabledOptions.length > 0 && (
          <Button
            className="text-[11px] leading-6 opacity-50 hover:opacity-100"
            variant="link"
            onClick={reset}
            visual="gray"
          >
            Clear
          </Button>
        )}
      </div>

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
          {options.map((option) => (
            <DropdownMenuCheckItem
              checked={selections[option]}
              onCheckedChange={(checked) => {
                setSelections((prev) => ({ ...prev, [option]: checked }))
                setOpen(false)
              }}
              key={option}
            >
              {option}
            </DropdownMenuCheckItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {enabledOptions.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {enabledOptions.map((option) => (
            <Badge visual="primary" key={option}>
              {option}
              <button
                className="focus-visible:outline-none"
                onClick={() => disableOption(option)}
              >
                <X className="size-3 opacity-50 hover:opacity-100" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

const TagInputSection = ({
  title,
  placeholder,
  suggestions,
  initialValues = [],
}: {
  title: string
  placeholder: string
  suggestions: string[]
  initialValues?: string[]
}) => {
  const [inputValue, setInputValue] = useState("")
  const [values, setValues] = useState<string[]>(initialValues)
  const [selected, setSelected] = useState<string[]>([])

  const filteredOptions = suggestions.filter((option) =>
    option.toLowerCase().includes(inputValue.toLowerCase())
  )

  useEffect(() => {
    setValues((prevValues) => {
      const nextValues = selected.filter((value) => !prevValues.includes(value))
      return [...prevValues, ...nextValues]
    })
  }, [selected])

  const addValue = () => {
    if (!inputValue.trim()) return

    setValues((prev) =>
      prev.includes(inputValue.trim()) ? prev : [...prev, inputValue.trim()]
    )
    setInputValue("")
  }

  const removeValue = (target: string) => {
    setValues((prev) => prev.filter((value) => value !== target))
    setSelected((prev) => prev.filter((value) => value !== target))
  }

  const reset = () => {
    setValues([])
    setSelected([])
    setInputValue("")
  }

  return (
    <div className="space-y-3 py-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          {title}
        </span>

        {values.length > 0 && (
          <Button
            className="text-[11px] leading-6 opacity-50 hover:opacity-100"
            variant="link"
            onClick={reset}
            visual="gray"
          >
            Clear
          </Button>
        )}
      </div>

      <Combobox
        className="w-full"
        value={selected}
        onChange={setSelected}
        multiple
      >
        <InputGroup>
          <ComboboxPrimitive.Input
            placeholder={placeholder}
            className={cn(
              inputVariants({
                className: "h-10 text-xs rounded-r-none leading-6 font-normal",
              })
            )}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === HOT_KEYS.ENTER) addValue()
            }}
            value={inputValue}
          />
          <InputRightAddon className="rounded-l-none size-10 bg-gray-100">
            <button className="focus-visible:outline-none" onClick={addValue}>
              <Plus className="size-4" />
            </button>
          </InputRightAddon>
        </InputGroup>
        <ScaleOutIn afterLeave={() => setInputValue("")}>
          <ComboboxOptions>
            <ScrollArea viewportClassName={DROPDOWN_MAX_HEIGHT}>
              {filteredOptions.map((option) => (
                <ComboboxOption key={option} value={option}>
                  {option}
                </ComboboxOption>
              ))}
            </ScrollArea>
          </ComboboxOptions>
        </ScaleOutIn>
      </Combobox>

      <div className="flex flex-wrap gap-3">
        {values.map((value) => (
          <Badge visual="primary" key={value}>
            {value}
            <button
              className="focus-visible:outline-none"
              onClick={() => removeValue(value)}
            >
              <X2 className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  )
}

const CurrencyRangeSection = ({ title }: { title: string }) => {
  const [minValue, setMinValue] = useState("5")
  const [maxValue, setMaxValue] = useState("5")

  return (
    <div className="py-5 space-y-5">
      <h1 className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
        {title}
      </h1>

      <div className="grid grid-cols-2 gap-x-3">
        <div className="flex flex-col gap-y-1.5">
          <InputGroup>
            <Input
              id={`${title}-min`}
              type="text"
              className="pl-10 h-10 w-full"
              value={minValue}
              onChange={(event) =>
                setMinValue(event.target.value.replace(/\D/g, ""))
              }
            />
            <InputLeftElement className="w-10">
              <DollarSign className="text-gray-500 size-4" />
            </InputLeftElement>
          </InputGroup>

          <Label className="text-gray-500" htmlFor={`${title}-min`} size="sm">
            Min
          </Label>
        </div>

        <div className="flex flex-col gap-y-1.5">
          <InputGroup>
            <Input
              id={`${title}-max`}
              type="text"
              className="pl-10 h-10 w-full"
              value={maxValue}
              onChange={(event) =>
                setMaxValue(event.target.value.replace(/\D/g, ""))
              }
            />
            <InputLeftElement className="w-10">
              <DollarSign className="text-gray-500 size-4" />
            </InputLeftElement>
          </InputGroup>

          <Label className="text-gray-500" htmlFor={`${title}-max`} size="sm">
            Max
          </Label>
        </div>
      </div>
    </div>
  )
}

const RadioSection = ({
  title,
  options,
  defaultValue = "",
  filterKey,
}: {
  title: string
  options: string[]
  defaultValue?: string
  filterKey: string
}) => {
  const { setFilter } = useFilters()
  const stored = useFilterString(filterKey)
  const value = stored || defaultValue

  return (
    <div className="space-y-5 py-5">
      <div className="flex items-center justify-between">
        <span className="text-sm leading-[16.94px] text-dark-blue-400 font-bold">
          {title}
        </span>
      </div>

      <RadioGroup
        value={value}
        onValueChange={(next) => setFilter(filterKey, next)}
        className="gap-y-3"
      >
        {options.map((option) => {
          const id = `${title}-${option}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")

          return (
            <div key={id} className="flex items-center gap-x-3.5">
              <RadioGroupItem id={id} value={option} />
              <Label
                htmlFor={id}
                className="font-normal text-[#667085]"
                size="sm"
              >
                {option}
              </Label>
            </div>
          )
        })}
      </RadioGroup>
    </div>
  )
}

export const Sidebar = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "flex-none divide-y lg:block hidden divide-gray-200 w-[210px]",
        className
      )}
    >
      <CategoryDrilldownFilter
        filterKey="project_category"
        subcategoryFilterKey="project_subcategory"
        scope="projects"
        footerLinkLabel="View All Categories"
        footerLinkHref="/c/_browse/projects"
      />
      <TagsFilter scope="projects" filterKey="tags" />

      <ProjectType filterKey="project_type" />
      <Industry scope="projects" filterKey="industries" />
      <Budget filterKeyMin="budget_min" filterKeyMax="budget_max" />
      <Skills scope="projects" filterKey="skills" />
      <AdditionalTags filterKey="additional_tags" />

      <CheckboxGroup
        title="Project Length"
        filterKey="project_duration_range"
        options={[
          "1 - 3 months",
          "3 - 6 months",
          "6 - 12 months",
          "12 - 18 months",
          "18 - 24 months",
          "24 + months",
        ]}
      />

      <CheckboxGroup
        title="Team Size"
        filterKey="team_size_range"
        options={TEAM_SIZE_OPTIONS}
      />
    </div>
  )
}

/* ─── Projects sidebar (alias of default) ─────────────────────────────── */

export const SidebarProjects = Sidebar

/* ─── Services sidebar ────────────────────────────────────────────────── */

export const SidebarServices = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "flex-none divide-y lg:block hidden divide-gray-200 w-[210px]",
        className
      )}
    >
      <CategoryDrilldownFilter
        filterKey="service_category"
        subcategoryFilterKey="service_subcategory"
        scope="services"
        footerLinkLabel="View All Categories"
        footerLinkHref="/c/_browse/services"
      />
      <TagsFilter scope="services" filterKey="tags" />
      <CheckboxGroup
        title="Service Type"
        filterKey="pricing_model"
        options={[
          "One-time project",
          "Ongoing subscription",
          "Consultation",
          "Managed service",
        ]}
      />
      <Industry scope="services" filterKey="industries" />
      <MonthlyBudget filterKeyMin="price_min" filterKeyMax="price_max" />
      <Skills scope="services" filterKey="skills" />
      {/* Team Size is hidden on Services until its filtering behaviour is
          fixed; the filter key stays wired up elsewhere, only the control is
          removed from this sidebar. */}
      {/* <CheckboxGroup
        title="Team Size"
        filterKey="team_size_range"
        options={TEAM_SIZE_OPTIONS}
      /> */}
    </div>
  )
}

/* ─── Talent sidebar ──────────────────────────────────────────────────── */

export const SidebarTalent = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "flex-none divide-y lg:block hidden divide-gray-200 w-[210px]",
        className
      )}
    >
      {/* Talent categories live on the profile rather than on a listing, but
          they prune the taxonomy the same way — `scope` narrows the tree to
          the names profiles are actually filed under, so this sidebar offers
          its own categories rather than the marketplace-wide set that
          Projects and Services draw from, and every branch has talent behind
          it. Category and subcategory picks stay separate filter keys; the
          backend matches each across the record's `categories` AND
          `subcategories`, since talent splits its names over the two by
          breadth, not by which level of the control chose them. */}
      <CategoryDrilldownFilter
        filterKey="category"
        subcategoryFilterKey="subcategory"
        scope="talent"
        footerLinkLabel="View All Categories"
        footerLinkHref="/c/_browse/talent"
      />
      {/* Suggestions are the headlines active profiles actually carry, ranked
          by how many hold each, rather than a hand-maintained list — so every
          one returns at least one talent. Typing a title that nobody holds
          still searches for it; only the offered list is guaranteed. */}
      <Skills
        title="Job Title"
        placeholder="Enter Job Title"
        filterKey="job_title"
        scope="talent"
        field="job_title"
      />
      <Skills
        title="Industry Knowledge"
        placeholder="Enter Industry"
        filterKey="industries"
        icon={Building02}
        scope="talent"
        field="industries"
      />
      <HourlyRate filterKeyMin="hourly_rate_min" filterKeyMax="hourly_rate_max" />
      {/* Derived from the skills profiles actually list, ranked by how many
          hold each — `field` defaults to "skills". Without `scope` this fell
          back to the generic hardcoded web-dev list, 23 of whose 25 entries
          matched no talent at all. */}
      <Skills filterKey="skills" scope="talent" />
      {/* Countries only, the full list alphabetically — unlike the other
          controls here this one is NOT derived from the records, because a
          country nobody is in yet is still a legitimate search, and a picker
          whose contents shift with the catalogue is not one a user can learn.
          The backend matches a country name against a profile's ISO `country`
          (see search-service config/countries.ts). */}
      <LocationFilter filterKey="location" />
      {/* `limit` overrides the backend's `tags` default of 7, which is sized
          for the Projects/Services checkbox list rather than this combobox.
          NOTE: the values behind this are stale duplicates of each profile's
          skills — talent-profile-sync now emits `tags: []`, so this list
          empties as profiles re-sync. See FILTER_VALUE_SOURCES.talent.tags. */}
      <Skills
        title="Tags"
        placeholder="Add tag(s)"
        filterKey="tags"
        icon={Tag}
        scope="talent"
        field="tags"
        limit={100}
      />

      {/* Buckets match the labels computeExperienceLevel already produces in
          user-service; the backend ranges over the numeric years_of_experience
          rather than matching these strings, so the two can't drift. */}
      <CheckboxGroup
        title="Experience Level"
        filterKey="experience_level"
        options={[
          "Junior (1 - 3 years)",
          "Middle (3 - 5 years)",
          "Senior (5 - 7 years)",
          "Lead (7 - 10 years)",
          "Super Senior (10 + years)",
          "Custom Range",
        ]}
      />

      <NumericBucketGroup
        title="Projects Completed"
        selectionKey="projects_completed_buckets"
        minKey="projects_completed_min"
        maxKey="projects_completed_max"
        buckets={[
          { label: "1 - 10", min: 1, max: 10 },
          { label: "10 - 25", min: 10, max: 25 },
          { label: "25 - 50", min: 25, max: 50 },
          { label: "50 + projects", min: 50 },
        ]}
      />

      <NumericBucketGroup
        title="Average Rating"
        selectionKey="rating_buckets"
        minKey="rating_min"
        buckets={[
          { label: "5.0", min: 5 },
          { label: "4.5 & above", min: 4.5 },
          { label: "4.0 & above", min: 4 },
          { label: "Any rating" },
        ]}
      />

      {/* Client Success Rate and Availability are hidden for now.
          Rungs come from the backend (NUMERIC_BUCKET_SOURCES), which declares
          them next to the attribute they filter on and counts each against the
          index. The list below is the same ladder, shown until that request
          lands so the section never renders empty.
      <NumericBucketGroup
        title="Client Success Rate"
        selectionKey="client_success_rate_buckets"
        minKey="client_success_rate_min"
        scope="talent"
        field="client_success_rate"
        buckets={[
          { label: "95% +", min: 95 },
          { label: "90% +", min: 90 },
          { label: "80% +", min: 80 },
          { label: "Any" },
        ]}
      />

          A talent profile has no start-date or notice-period field, so these
          buckets are resolved against weekly capacity in search-service (see
          AVAILABILITY_MIN_HOURS) rather than a literal availability date.
      <CheckboxGroup
        title="Availability"
        filterKey="availability"
        options={[
          "Available now",
          "Available within 1 week",
          "Available within 1 month",
        ]}
      />
      */}

      <Skills
        title="Languages"
        placeholder="Add language(s)"
        filterKey="languages"
        scope="talent"
        field="languages"
      />
    </div>
  )
}

/* ─── Teams sidebar (brand new — derived from team landing page) ───── */

export const SidebarTeams = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "flex-none divide-y lg:block hidden divide-gray-200 w-[210px]",
        className
      )}
    >
      <CategoryDropdownChips
        filterKey="category"
        title="Category"
        footerLinkLabel="View All Categories"
        footerLinkHref="/c/_browse/teams"
      />
      <CheckboxGroup
        title="Team Size"
        filterKey="team_size_range"
        options={[
          "2 - 5 members",
          "5 - 10 members",
          "10 - 15 members",
          "15 - 20 members",
          "20+ members",
        ]}
      />
      <Industry filterKey="industries" />
      <HourlyRate filterKeyMin="hourly_rate_min" filterKeyMax="hourly_rate_max" />
      <CheckboxGroup
        title="Avg Years of Experience"
        filterKey="tags"
        options={["1 - 3 years", "3 - 5 years", "5 - 10 years", "10+ years"]}
      />
      <LocationFilter label="Location" filterKey="location" />
      <Skills filterKey="skills" />
      <CheckboxGroup
        title="Previous Client Tier"
        filterKey="tags"
        options={["Fortune 500", "Enterprise", "Mid-market", "Startup"]}
      />
      <CheckboxGroup
        title="Availability"
        filterKey="availability"
        options={[
          "Available now",
          "Within 2 weeks",
          "Within 1 month",
          "Booked 1+ month out",
        ]}
      />
    </div>
  )
}

export const SidebarJobs = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "flex-none divide-y lg:block hidden divide-gray-200 w-[210px]",
        className
      )}
    >
      <RadioSection
        title="Date Posted"
        defaultValue="Any time"
        filterKey="date_posted"
        options={["Any time", "Past 24 hours", "Past week", "Past month"]}
      />
      <Category
        title="Category"
        placeholder="Select Category"
        options={["Mobile Wallet", "Payment App", "FinTech", "SaaS"]}
        filterKey="project_category"
        breadcrumbs={[]}
        footerLinkLabel="View All Categories"
      />
      <Category
        title="Job Type"
        placeholder="Select Job Type"
        options={["Mobile App", "Desktop App", "Web App", "API"]}
        filterKey="project_type"
        breadcrumbs={[]}
      />
      <CheckboxGroup
        title="NDA Required"
        filterKey="tags"
        options={["NDA Required", "Payment Verified"]}
      />
      <CheckboxGroup
        title="Experience Level"
        filterKey="experience_level"
        options={[
          "Junior (0 - 3 years)",
          "Middle (3 - 5 years)",
          "Senior (5 - 7 years)",
          "Lead (7 - 10 years)",
          "Super Senior (10+ years)",
          "Custom Range",
        ]}
      />
      <Budget
        title="Earnings Opportunity"
        filterKeyMin="budget_min"
        filterKeyMax="budget_max"
      />
      <Skills title="Skills" placeholder="Add skills by keyword" filterKey="skills" />
      <LocationFilter
        label="Client Location"
        placeholder="Add country"
        filterKey="location"
      />
      <RadioSection
        title="Work Schedule"
        defaultValue="Show All"
        filterKey="work_schedule"
        options={["Show All", "Full-Time", "Part-Time", "Custom Range"]}
      />
      <CheckboxGroup
        title="Project Length"
        filterKey="project_duration_range"
        options={[
          "1 - 3 months",
          "3 - 6 months",
          "6 - 12 months",
          "12 - 18 months",
          "18 - 24 months",
          "24 + months",
        ]}
      />
      <Industry
        title="Industry"
        placeholder="Select Industry"
        options={["Real Estate", "FinTech", "Healthcare", "Education"]}
        filterKey="industries"
      />
      <Skills
        title="Languages"
        placeholder="Add language"
        filterKey="languages"
        suggestions={["English", "Spanish", "Portuguese", "German", "French"]}
      />
    </div>
  )
}

/* ─── Category dispatcher ─────────────────────────────────────────────── */

export type SidebarCategory =
  | "projects"
  | "services"
  | "talent"
  | "teams"
  | "jobs"
  | "all"

export const CategorySidebar = ({
  category,
  className,
}: {
  category: SidebarCategory
  className?: string
}) => {
  switch (category) {
    case "services":
      return <SidebarServices className={className} />
    case "talent":
      return <SidebarTalent className={className} />
    case "teams":
      return <SidebarTeams className={className} />
    case "jobs":
      return <SidebarJobs className={className} />
    case "projects":
    case "all":
    default:
      return <SidebarProjects className={className} />
  }
}
