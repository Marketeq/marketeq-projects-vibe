"use client"

import React, { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CategoryAPI, type CategoryTreeNode } from "@/service/http/category"
import {
  SearchAPI,
  SearchCategory as SearchCategoryType,
  SearchHit,
  SearchResponse,
  isGroupedResponse,
} from "@/service/http/search"
import {
  useCategoryPageL1,
  useCategoryPageL2,
  useCategoryPageL3,
} from "@/src/features/category-pages/hook"
import { HOT_KEYS } from "@/utils/constants"
import { cn, getFirstItem, getIsNotEmpty, keys } from "@/utils/functions"
import { useDebounce } from "@/utils/hooks"
import {
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
  Plus,
  Sliders02,
  Sliders04,
  Star,
  Tag,
  Users,
  X,
  X2,
} from "@blend-metrics/icons"
import { useQuery } from "@tanstack/react-query"
import { useToggle } from "react-use"
import { Keys } from "@/types/core"
import {
  ToggleGroup,
  ToggleGroupItem,
  ToggleGroupRoot,
} from "@/components/ui/toggle-group"
import { Grid, List, SortAs } from "@/components/icons"
import { Logo4 } from "@/components/icons/logo-4"
import { ListingCard, ListingCardProps } from "@/components/listing-card"
import { SearchCard } from "@/components/search-card"
import { SearchCardLandscape } from "@/components/search-card-landscape"
import {
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
  DropdownMenuTrigger,
  Favorite,
  FavoriteRoot,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightAddon,
  InputRightElement,
  Label,
  ScaleOutIn,
  ScrollArea,
  ScrollBar,
  Toggle,
  buttonVariants,
  inputVariants,
} from "@/components/ui"
import {
  FiltersProvider,
  buildSearchFiltersPayload,
  useFilterArray,
  useFilterString,
  useFilters,
} from "./filters-context"
import {
  Sidebar,
  SidebarJobs,
  SidebarServices,
  SidebarTalent,
  SidebarTeams,
} from "./sidebar"
import { SortSelection, getSortOptions } from "./sort-options"

const GRID_LAYOUT = "GRID"
const LIST_LAYOUT = "LIST"

/**
 * Extract a human-friendly title from a raw Algolia hit. The field used
 * depends on which index the hit came from — talent/teams have `name`,
 * projects have `project_title`, services have `service_title`.
 */
function getHitTitle(hit: SearchHit): string {
  return (
    hit.project_title ||
    hit.service_title ||
    hit.team_name ||
    hit.name ||
    hit.title ||
    hit.job_title ||
    "Untitled"
  )
}

// The "all" (grouped) response comes back as four independently-sorted
// blocks — talent, teams, projects, services — one Algolia query per index.
// Concatenating them in a fixed block order preserves each block's own
// order but not the sort across the merged list (e.g. a 5-star project can
// land after an unrated team, since it's just appended after the whole
// teams block). Re-sort the merged list by the same field so the flattened
// view actually reads in sorted order. Missing values sort last regardless
// of direction, matching how Algolia ranks records missing the attribute.
function getSortValue(hit: SearchHit, field: string): number | null {
  const raw = hit[field]
  if (raw === undefined || raw === null || raw === "") return null
  if (typeof raw === "number") return raw
  const asNumber = Number(raw)
  if (!Number.isNaN(asNumber)) return asNumber
  const asDate = Date.parse(raw)
  return Number.isNaN(asDate) ? null : asDate
}

function sortMergedHits(
  hits: SearchHit[],
  selection?: SortSelection
): SearchHit[] {
  if (!selection) return hits
  const { field, direction } = selection
  return [...hits].sort((a, b) => {
    const va = getSortValue(a, field)
    const vb = getSortValue(b, field)
    if (va === null && vb === null) return 0
    if (va === null) return 1
    if (vb === null) return -1
    return direction === "asc" ? va - vb : vb - va
  })
}

function getHitSubtitle(hit: SearchHit): string {
  return (
    hit.description ||
    hit.headline ||
    hit.about_me ||
    hit.overview ||
    (Array.isArray(hit.skills) ? hit.skills.slice(0, 3).join(", ") : "") ||
    ""
  )
}

function getHitMeta(hit: SearchHit): string {
  if (hit.budget_range) return `Budget: ${hit.budget_range}`
  if (hit.price_range) return `Price: ${hit.price_range}`
  if (hit.hourly_rate) return `$${hit.hourly_rate}/hr`
  if (hit.timeline) return hit.timeline
  if (hit.location) return hit.location
  return ""
}

/**
 * "US" → "United States". Talent profiles store an ISO country code but the
 * card shows the full name. Intl does the mapping, so there's no country table
 * to maintain; anything Intl doesn't recognise (or a value already stored as a
 * full name) passes through unchanged.
 */
function countryDisplayName(code?: string | null): string | undefined {
  if (!code) return undefined
  if (code.length !== 2) return code
  try {
    return (
      new Intl.DisplayNames(["en"], { type: "region" }).of(
        code.toUpperCase()
      ) ?? code
    )
  } catch {
    return code
  }
}

/**
 * Current wall-clock time where the talent is, e.g. "7:39am local time".
 * Derived from the indexed IANA zone rather than stored, so it stays correct
 * as the day moves and across DST.
 */
function localTimeIn(timezone?: string | null): string | undefined {
  if (!timezone) return undefined
  try {
    const time = new Date()
      .toLocaleTimeString("en-US", {
        timeZone: timezone,
        hour: "numeric",
        minute: "2-digit",
      })
      .replace(
        /\s?([AP])M$/i,
        (_, meridiem: string) => meridiem.toLowerCase() + "m"
      )
    return `${time} local time`
  } catch {
    // Unknown/invalid zone — show the country alone rather than crash.
    return undefined
  }
}

/**
 * Convert a raw Algolia hit into ListingCard props for the given entity kind.
 * The master ListingCard dispatches to the correct visual treatment (project,
 * service, talent, or team). This mapper is intentionally forgiving because
 * hit field names vary across indexes.
 */
function hitToListingCardProps(
  hit: SearchHit,
  kind: "project" | "service" | "talent" | "team",
  cardVariant: "default" | "job" | "job-grid" = "default"
): ListingCardProps {
  const id = String(hit.objectID ?? hit.id ?? "")

  if (kind === "project" || kind === "service") {
    const isJobPlaceholder =
      (cardVariant === "job" || cardVariant === "job-grid") &&
      String(hit.objectID ?? hit.id ?? "").startsWith("placeholder-")

    return {
      kind,
      id,
      title: isJobPlaceholder
        ? cardVariant === "job-grid"
          ? "The Ultimate Mobile App Experience"
          : "Corporate Dashboard Project"
        : getHitTitle(hit),
      description: isJobPlaceholder
        ? cardVariant === "job-grid"
          ? "Brief Description of the project. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt."
          : "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum."
        : hit.description || hit.overview || hit.headline || "",
      mediaUrl: hit.image || hit.cover_image || hit.media_url || undefined,
      budget:
        kind === "service"
          ? hit.monthly_price
            ? `$${hit.monthly_price}/month`
            : hit.price_range
              ? `${hit.price_range}/month`
              : hit.budget_range || "$5,000/month"
          : hit.budget_range || hit.budget || "$50,000 budget",
      duration: hit.timeline || hit.duration || hit.project_duration,
      rating: typeof hit.rating === "number" ? hit.rating : undefined,
      reviewCount:
        typeof hit.review_count === "number"
          ? hit.review_count
          : typeof hit.nb_reviews === "number"
            ? hit.nb_reviews
            : 5,
      collaborators: Array.isArray(hit.collaborators)
        ? hit.collaborators
        : Array.isArray(hit.team_avatars)
          ? hit.team_avatars
          : undefined,
      badge: kind === "service" ? "Service" : undefined,
      favoriteSlot: <FavoriteRoot>{() => <Favorite />}</FavoriteRoot>,
      cardVariant,
    }
  }

  if (kind === "talent") {
    return {
      kind,
      id,
      username: String(hit.username || hit.handle || id),
      name: hit.name || hit.full_name,
      handle: hit.handle || (hit.username ? `@${hit.username}` : undefined),
      role: hit.role || hit.job_title || hit.title,
      // `|| undefined` throughout: the index stores absent values as null, and
      // a null passed as a prop is a real value — it defeats both default
      // parameters and `{field && ...}` guards on the card, which is how a
      // bare "(7:30pm local time)" with no country ended up rendering.
      photo: hit.photo || hit.avatar_url || hit.image || undefined,
      rate: hit.hourly_rate
        ? `$${hit.hourly_rate}/hr`
        : hit.rate_range || undefined,
      experience:
        hit.years_of_experience != null
          ? `${hit.years_of_experience} years of experience`
          : hit.experience || undefined,
      country: countryDisplayName(hit.country) || hit.location || undefined,
      localTime: localTimeIn(hit.timezone),
      rating: typeof hit.rating === "number" ? hit.rating : undefined,
      projects:
        typeof hit.projects_completed === "number"
          ? hit.projects_completed
          : typeof hit.projects_count === "number"
            ? hit.projects_count
            : typeof hit.project_count === "number"
              ? hit.project_count
              : undefined,
      allStars: Boolean(hit.all_stars ?? hit.is_all_star),
      skills: Array.isArray(hit.skills) ? hit.skills : undefined,
    }
  }

  // team
  return {
    kind: "team",
    id,
    name: hit.team_name || hit.name || "Team Name",
    handle: hit.handle ? `@${String(hit.handle).replace(/^@/, "")}` : undefined,
    tagline: hit.tagline || hit.team_type || "Development team",
    experience:
      hit.average_years_of_experience != null
        ? `Average ${hit.average_years_of_experience} years of experience`
        : hit.experience,
    rate: hit.rate_range
      ? `${hit.rate_range}/hr`
      : hit.hourly_rate
        ? `$${hit.hourly_rate}/hr`
        : "$85 - $120/hr",
    locations: Array.isArray(hit.locations)
      ? hit.locations.join(", ")
      : hit.location,
    rating: typeof hit.rating === "number" ? hit.rating : undefined,
    projectCount:
      typeof hit.projects_count === "number"
        ? hit.projects_count
        : typeof hit.project_count === "number"
          ? hit.project_count
          : undefined,
    skills: Array.isArray(hit.skills) ? hit.skills : undefined,
    memberAvatars: Array.isArray(hit.member_avatars)
      ? hit.member_avatars
      : Array.isArray(hit.team_avatars)
        ? hit.team_avatars
        : undefined,
    previousClientLogos: Array.isArray(hit.previous_client_logos)
      ? hit.previous_client_logos
      : Array.isArray(hit.client_logos)
        ? hit.client_logos
        : undefined,
    favoriteSlot: <FavoriteRoot>{() => <Favorite />}</FavoriteRoot>,
  }
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <Search />
    </Suspense>
  )
}

type SearchProps = {
  defaultCategory?: string
  defaultQuery?: string
  forcedSidebarCategory?: SearchCategoryType | "all" | "jobs"
}

export function SearchPageContent({
  defaultCategory = "",
  defaultQuery = "Swift Development",
  forcedSidebarCategory,
}: SearchProps) {
  return (
    <Suspense fallback={null}>
      <Search
        defaultCategory={defaultCategory}
        defaultQuery={defaultQuery}
        forcedSidebarCategory={forcedSidebarCategory}
      />
    </Suspense>
  )
}

function Search(props: SearchProps) {
  return (
    <FiltersProvider>
      <SearchInner {...props} />
    </FiltersProvider>
  )
}

function SearchInner({
  defaultCategory = "",
  defaultQuery = "Swift Development",
  forcedSidebarCategory,
}: SearchProps) {
  const [value, setValue] = useState([
    forcedSidebarCategory === "jobs" ? LIST_LAYOUT : GRID_LAYOUT,
  ])
  const [isOpen, toggleIsOpen] = useToggle(false)
  const { filters, clearAll } = useFilters()
  const debouncedFilters = useDebounce(filters, 350)

  // Ensure the search page always loads scrolled to the very top, regardless
  // of where the user was scrolled on the previous page.
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" })
    }
  }, [])

  // Read search params so clicks from "Popular Searches" etc. reflect in the page.
  const router = useRouter()
  const searchParams = useSearchParams()
  const skillParam = searchParams?.get("skill") ?? ""
  // Fall back to the skill query when no explicit `q` is provided so that
  // /search?skill=Docker renders "Docker" as the displayed search term
  // instead of the hardcoded "Swift Development" placeholder.
  const query =
    searchParams?.get("q") ?? (skillParam ? skillParam : defaultQuery)
  const categorySlug = searchParams?.get("category") ?? defaultCategory
  // Only show "Back to Categories" when we actually navigated here from a
  // category screen (so router.back() lands somewhere meaningful), not on
  // direct loads/refreshes/shares of a /search?...&category=... URL.
  const [cameFromCategory, setCameFromCategory] = useState(false)
  useEffect(() => {
    if (typeof document === "undefined") return
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null
      setCameFromCategory(
        !!referrer &&
          referrer.origin === window.location.origin &&
          /^\/c(\/|$)/.test(referrer.pathname)
      )
    } catch {
      setCameFromCategory(false)
    }
  }, [])
  const categoryLabel = categorySlug
    ? categorySlug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : ""

  // ── Live results from backend search service ────────────────────────────
  // Calls GET /search?q=...&category=... and renders real hits, a real
  // "no results" state, or a real error state — no fake placeholder data.
  const [searchHits, setSearchHits] = useState<SearchHit[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [totalHits, setTotalHits] = useState<number | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  // Map the top-nav listing-type category ("projects"/"services"/"teams"/"talent")
  // onto the backend SearchCategory enum. Anything else falls through to "all".
  const backendCategory: SearchCategoryType = useMemo(() => {
    const known: SearchCategoryType[] = [
      "talent",
      "teams",
      "projects",
      "services",
    ]
    return (
      known.includes(categorySlug as SearchCategoryType) ? categorySlug : "all"
    ) as SearchCategoryType
  }, [categorySlug])

  // "Skills related to this category" pills — fetched live from the
  // category-pages service (same endpoint the /c/[...category] page uses).
  // The category a user is actually browsing can come from two different
  // places: the URL's ?category= (kind-only values like "projects"/"services"
  // never match a real taxonomy slug, but a deep link from a /c/... page
  // will), or the sidebar's hierarchical Category picker, which stores the
  // selected category's *name* (not slug) in FiltersContext under a
  // kind-specific key. The sidebar selection should win once made, since
  // it's the more specific, actively-chosen category.
  const categoryFilterKey =
    backendCategory === "services"
      ? "service_category"
      : backendCategory === "teams"
        ? "category"
        : backendCategory === "talent"
          ? ""
          : "project_category"
  // Holds the sidebar-selected category values. The hierarchical `<Category>`
  // picker in the sidebar writes the taxonomy node's display NAME (e.g.
  // "Data Science"), which matches what indexed records store in their
  // `project_category`/category column (see algolia-service sync.service.ts
  // and listings project-sync.service.ts — both copy the category name
  // verbatim from the CMS CategorySelectField, whose option value is the
  // category name, not its slug).
  const selectedCategoryNames = useFilterArray(categoryFilterKey)

  const categoryTreeQuery = useQuery({
    queryKey: ["category-tree"],
    queryFn: async () => {
      const response = await CategoryAPI.getTree()
      return Array.isArray(response?.data)
        ? (response.data as CategoryTreeNode[])
        : []
    },
    enabled: selectedCategoryNames.length > 0,
    staleTime: 5 * 60 * 1000,
  })

  // Full slug path (root → selected node), not just the leaf slug — the
  // category-pages API has separate L1/L2/L3 endpoints keyed by depth
  // (/category-pages/:l1, /:l1/:l2, /:l1/:l2/:l3), and an L2/L3 slug queried
  // against the L1-only endpoint 404s (the backend requires parentId IS NULL
  // for an L1 lookup). Most sidebar selections are subcategories, not root
  // categories, so this path has to preserve depth to actually resolve.
  const firstSelectedCategoryPath = useMemo(() => {
    if (selectedCategoryNames.length === 0 || !categoryTreeQuery.data)
      return null

    const findPath = (
      nodes: CategoryTreeNode[],
      path: string[]
    ): string[] | null => {
      for (const node of nodes) {
        const nextPath = [...path, node.slug]
        if (node.name === selectedCategoryNames[0]) return nextPath
        if (node.children?.length) {
          const found = findPath(node.children, nextPath)
          if (found) return found
        }
      }
      return null
    }

    return findPath(categoryTreeQuery.data, [])
  }, [selectedCategoryNames, categoryTreeQuery.data])

  // Falls back to the URL's ?category= as an L1-only slug — deep links from
  // /c/... pages only ever pass the L1 slug (see top-most-header.tsx and
  // /c/[[...category]]/page.tsx), so a single segment is always correct here.
  const effectiveSlugPath =
    firstSelectedCategoryPath ?? (categorySlug ? [categorySlug] : null)

  // All three hooks are called unconditionally (rules of hooks) — only the
  // one matching the resolved path's actual depth is enabled.
  const categoryPageL1Query = useCategoryPageL1(
    effectiveSlugPath?.[0] ?? "",
    undefined,
    { enabled: effectiveSlugPath?.length === 1 }
  )
  const categoryPageL2Query = useCategoryPageL2(
    effectiveSlugPath?.[0] ?? "",
    effectiveSlugPath?.[1] ?? "",
    undefined,
    { enabled: effectiveSlugPath?.length === 2 }
  )
  const categoryPageL3Query = useCategoryPageL3(
    effectiveSlugPath?.[0] ?? "",
    effectiveSlugPath?.[1] ?? "",
    effectiveSlugPath?.[2] ?? "",
    undefined,
    { enabled: effectiveSlugPath?.length === 3 }
  )
  const categoryPageQuery =
    effectiveSlugPath?.length === 3
      ? categoryPageL3Query
      : effectiveSlugPath?.length === 2
        ? categoryPageL2Query
        : categoryPageL1Query
  // Skills related to the current search term take precedence — we derive
  // them from the live search hits (already fetched above, where each hit is
  // a term match and carries a `skills` array), so the pills always reflect
  // what the user actually typed in the search box. Only when there's no
  // real search term do we fall back to the category-pages service's
  // `relatedSkills` (the same source /c/[...category] uses), so a category-
  // only browse still surfaces meaningful skill pills.
  const hasSearchTerm = Boolean(query && query.trim() && query !== defaultQuery)
  const categoryRelatedSkills = useMemo(() => {
    const skills = categoryPageQuery.data?.suggestions?.relatedSkills
    if (!Array.isArray(skills)) return []
    return skills
      .map((skill: any) => (typeof skill === "string" ? skill : skill?.name))
      .filter((name: any): name is string => Boolean(name))
  }, [categoryPageQuery.data])
  const relatedSkills = useMemo(() => {
    if (hasSearchTerm) {
      // Collect skills from term-matched hits, preserve first-seen order, and
      // cap the count so the pill row stays scannable.
      const seen = new Set<string>()
      const collected: string[] = []
      for (const hit of searchHits) {
        const hitSkills: unknown = (hit as Record<string, unknown>)?.skills
        if (!Array.isArray(hitSkills)) continue
        for (const s of hitSkills) {
          const name =
            typeof s === "string" ? s : (s as Record<string, unknown>)?.name
          if (typeof name !== "string" || !name || seen.has(name)) continue
          seen.add(name)
          collected.push(name)
          if (collected.length >= 5) return collected
        }
      }
      return collected
    }
    return categoryRelatedSkills
  }, [hasSearchTerm, searchHits, categoryRelatedSkills])

  const handleSkillClick = (skillName: string) => {
    const params = new URLSearchParams(searchParams?.toString())
    // Replace the search term with the clicked skill so the search bar
    // reflects exactly what was clicked, and the related-skills pills
    // re-derive from hits matching the new term (not the previous one).
    params.set("q", skillName)
    params.delete("skill")
    router.push(`/search?${params.toString()}`)
  }

  const sidebarFilters = useMemo(
    () => buildSearchFiltersPayload(debouncedFilters),
    [debouncedFilters]
  )

  // ── Sort state ────────────────────────────────────────────────────────
  const [sortId, setSortId] = useState("featured")
  const sortOptions = useMemo(
    () => getSortOptions(backendCategory),
    [backendCategory]
  )
  const activeSort = useMemo(
    () => sortOptions.find((o) => o.id === sortId) ?? sortOptions[0],
    [sortOptions, sortId]
  )

  // Quick-sort pill row shows only the category-agnostic options (Featured,
  // Best Match, etc.). Both budget/rate directions live in the dropdown and
  // surface as a removable chip when selected, since their labels change per
  // category.
  const quickSortOptions = useMemo(
    () =>
      sortOptions.filter((o) => o.id !== "rate-asc" && o.id !== "rate-desc"),
    [sortOptions]
  )
  const activePriceSort = useMemo(
    () =>
      sortId === "rate-asc" || sortId === "rate-desc"
        ? sortOptions.find((o) => o.id === sortId)
        : undefined,
    [sortOptions, sortId]
  )

  // If the current selection no longer exists in the option list (e.g. the
  // category changed to "all", which hides the price-like options), reset
  // back to the default rather than silently keeping a stale selection.
  useEffect(() => {
    if (!sortOptions.some((o) => o.id === sortId)) setSortId("featured")
  }, [sortOptions, sortId])

  useEffect(() => {
    let cancelled = false
    const skills = searchParams?.get("skill") ?? undefined
    const location = searchParams?.get("location") ?? undefined
    const industry = searchParams?.get("industry") ?? undefined

    setIsLoading(true)
    setSearchError(null)
    SearchAPI.search({
      q: query,
      category: backendCategory,
      limit: 20,
      page: 0,
      skills,
      location,
      industry,
      filters: sidebarFilters,
      sortBy: activeSort.selection?.field,
      sortOrder: activeSort.selection?.direction,
    })
      .then((res) => {
        if (cancelled) return
        const data: SearchResponse = res.data as SearchResponse
        if (isGroupedResponse(data)) {
          // Flatten grouped response into a single hit list for display, then
          // re-sort across the merge — see sortMergedHits for why the naive
          // per-block concatenation isn't already in sorted order.
          const merged: SearchHit[] = sortMergedHits(
            [
              ...(data.talent?.hits ?? []),
              ...(data.teams?.hits ?? []),
              ...(data.projects?.hits ?? []),
              ...(data.services?.hits ?? []),
            ],
            activeSort.selection
          )
          const total =
            (data.talent?.nbHits ?? 0) +
            (data.teams?.nbHits ?? 0) +
            (data.projects?.nbHits ?? 0) +
            (data.services?.nbHits ?? 0)
          setSearchHits(merged)
          setTotalHits(total)
        } else {
          setSearchHits(data.hits ?? [])
          setTotalHits(data.nbHits ?? null)
        }
      })
      .catch(() => {
        if (cancelled) return
        setSearchHits([])
        setTotalHits(null)
        setSearchError(
          "Something went wrong loading results. Please try again."
        )
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [
    query,
    backendCategory,
    searchParams,
    retryKey,
    sidebarFilters,
    activeSort,
  ])

  const resultsCount = totalHits ?? 0

  // Resolve the card kind for the current category. "all" and unknown
  // fall back to "project" so a generic /search URL still renders something
  // sensible. Teams/talent need their dedicated card treatments.
  const cardKind: "project" | "service" | "talent" | "team" = useMemo(() => {
    switch (backendCategory) {
      case "talent":
        return "talent"
      case "teams":
        return "team"
      case "services":
        return "service"
      case "projects":
      case "all":
      default:
        return "project"
    }
  }, [backendCategory])

  // Render the correct sidebar variant for the active category
  const renderSidebar = (sidebarClassName?: string) => {
    switch (forcedSidebarCategory ?? backendCategory) {
      case "jobs":
        return <SidebarJobs className={sidebarClassName} />
      case "services":
        return <SidebarServices className={sidebarClassName} />
      case "talent":
        return <SidebarTalent className={sidebarClassName} />
      case "teams":
        return <SidebarTeams className={sidebarClassName} />
      case "projects":
      case "all":
      default:
        return <Sidebar className={sidebarClassName} />
    }
  }

  const hasResults = !isLoading && !searchError && searchHits.length > 0
  const isEmpty = !isLoading && !searchError && searchHits.length === 0

  // Jobs uses the same search surface, but the result card itself follows a
  // dedicated landscape treatment instead of the project/service tile.
  const listingCardVariant =
    forcedSidebarCategory === "jobs" &&
    (cardKind === "project" || cardKind === "service")
      ? getFirstItem(value) === GRID_LAYOUT
        ? "job-grid"
        : "job"
      : "default"

  return (
    <div className="overflow-x-hidden">
      <Dialog open={isOpen} onOpenChange={toggleIsOpen}>
        <DialogContent
          variant="unanimated"
          className="py-[68px] px-0 bg-[#F9FAFB] rounded-none data-[state=open]:duration-150 data-[state=closed]:duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right-1/2 data-[state=closed]:slide-out-to-right-1/2 right-0 inset-y-0 w-full md:w-[375px]"
        >
          <div className="h-12 absolute top-0 border-b border-gray-200 inset-x-0 flex items-center bg-white justify-between pl-3.5 p-1">
            <span className="text-xs leading-5 font-semibold text-dark-blue-400">
              Filters
            </span>
            <DialogClose asChild>
              <IconButton variant="ghost" visual="gray">
                <X className="size-[18px]" />
              </IconButton>
            </DialogClose>
          </div>
          <ScrollArea
            className="h-full"
            scrollBar={<ScrollBar className="w-4 p-1" />}
          >
            {renderSidebar("block w-full px-5")}
          </ScrollArea>
          <div className="h-12 absolute border-t border-gray-200 bg-white bottom-0 inset-x-0 flex items-center justify-between pl-3.5 p-1">
            <Button
              className="opacity-50 hover:opacity-100"
              variant="link"
              visual="gray"
              onClick={clearAll}
            >
              Clear Filters
            </Button>

            <Button
              variant="outlined"
              visual="gray"
              onClick={() => toggleIsOpen(false)}
            >
              Show {resultsCount} results
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Top dark-blue promo banner — hidden (commented out) and replaced by
          a contextual banner rendered directly above the results count.
          Preserved here so it can be restored easily if needed. */}
      {/*
      <div className="p-10 lg:py-5 flex items-center md:flex-row gap-y-10 flex-col justify-between lg:px-[250px] bg-dark-blue-800">
        <div className="flex xs:max-md:items-center lg:items-center lg:flex-row flex-col lg:gap-y-5 lg:gap-x-[37px]">
          <Logo4 className="shrink-0 xs:max-lg:w-[262.31px]" />

          <div className="flex flex-col">
            <h1 className="text-[22px] leading-[26.63px] font-bold text-white md:text-left text-center">
              Your team. on the same page.
            </h1>
            <p className="text-base leading-[19.36px] font-light text-white md:text-left text-center">
              Machine learning makes it possible like never before!
            </p>
          </div>
        </div>

        <Button className="bg-white hover:text-white text-dark-blue-400">
          Learn More
          <ChevronRight className="size-[15px]" />
        </Button>
      </div>
      */}

      <div className="lg:p-[50px] lg:flex gap-x-[50px]">
        {renderSidebar()}

        <div className="flex-auto">
          {/* Contextual search banner hidden for now. Keep this block in place so
              we can restore it later without changing the surrounding layout. */}
          {/*
          <div className="mb-5 rounded-lg overflow-hidden">
            <img
              src="/search-banner-swift.png"
              alt="Swift Development"
              className="w-full h-auto block"
            />
          </div>
          */}

          <div className="hidden lg:inline-flex items-center gap-x-3">
            <h1 className="text-base leading-[19.36px] font-light text-dark-blue-400">
              <span className="font-bold">{resultsCount}</span> Results for{" "}
              <span className="font-bold">“{query}”</span>
              {categoryLabel && (
                <>
                  {" "}
                  in <span className="font-bold">{categoryLabel}</span>
                </>
              )}
            </h1>

            <Button
              className="opacity-50 hover:opacity-100"
              variant="link"
              visual="gray"
              onClick={clearAll}
            >
              Clear Filters
            </Button>
          </div>

          <div className="contents lg:flex items-center mt-3 justify-between">
            <div className="flex overflow-x-auto scrollbar-none xs:max-lg:border-b border-gray-200 items-center gap-x-6 lg:gap-x-3 xs:max-lg:p-2 xs:max-lg:bg-white xs:max-lg:shadow-[0px_0.83px_3.33px_0px_theme(colors.black/0.03)]">
              <div className="flex shrink-0 items-center lg:hidden gap-x-3">
                <Button
                  className="xs:max-lg:text-xs xs:max-lg:leading-[16.67px] xs:max-lg:h-[34px] xs:max-lg:px-3"
                  variant="outlined"
                  visual="gray"
                  onClick={toggleIsOpen}
                >
                  <Sliders04 className="size-[12.5px]" />
                  Filter
                </Button>

                <Button
                  className="opacity-50 hover:opacity-100 xs:max-lg:text-[11px] xs:max-lg:leading-6"
                  variant="link"
                  visual="gray"
                  onClick={clearAll}
                >
                  Clear Filters
                </Button>
              </div>
              <ToggleGroup.Root
                value={[sortId]}
                onValueChange={(details) => {
                  // Clicking the already-selected pill deselects it (empty
                  // value array) — fall back to "featured" (the sentinel for
                  // "no sort override") rather than leaving the stale sortId
                  // in place, which would keep the pill rendered as active.
                  const next = details.value[details.value.length - 1]
                  setSortId(next ?? "featured")
                }}
                className="flex items-center shrink-0 gap-x-2 lg:contents"
              >
                {quickSortOptions.map((option) => (
                  <ToggleGroup.Item key={option.id} value={option.id} asChild>
                    <Button
                      className="group xs:max-lg:text-xs xs:max-lg:leading-5 xs:max-lg:h-[34px] xs:max-lg:px-3 data-[state=on]:bg-white data-[state=on]:hover:bg-white data-[state=on]:opacity-100 opacity-50"
                      visual="gray"
                      variant="outlined"
                    >
                      {option.id === "most-recent" && (
                        <ArrowUp className="group-data-[state=on]:inline-block hidden size-[15px] text-gray-500" />
                      )}
                      {option.label}
                    </Button>
                  </ToggleGroup.Item>
                ))}
              </ToggleGroup.Root>

              {activePriceSort && (
                <div
                  className={cn(
                    buttonVariants({ visual: "gray", variant: "outlined" }),
                    "group xs:max-lg:text-xs xs:max-lg:leading-5 xs:max-lg:h-[34px] xs:max-lg:px-3 bg-white opacity-100 shrink-0"
                  )}
                >
                  {activePriceSort.label}
                  <button
                    className="focus-visible:outline-none"
                    onClick={() => setSortId("featured")}
                  >
                    <X className="size-3 opacity-50 hover:opacity-100" />
                  </button>
                </div>
              )}
            </div>

            <div className="lg:contents mt-5 md:mt-6 xs:max-md:px-5 md:max-lg:px-6 flex justify-between items-end">
              <h1 className="text-xs leading-[19.36px] lg:hidden font-light text-dark-blue-400">
                <span className="font-semibold">{resultsCount}</span> Results
                for <span className="font-semibold">“{query}”</span>
                {categoryLabel && (
                  <>
                    {" "}
                    in <span className="font-semibold">{categoryLabel}</span>
                  </>
                )}
              </h1>

              <div className="flex items-center gap-x-6 lg:p-[11.5px]">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="focus-visible:outline-none">
                      <SortAs className="size-6 text-gray-500" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <ScrollArea
                      viewportClassName="max-h-[250px]"
                      scrollBar={<ScrollBar className="w-4 p-1" />}
                    >
                      {sortOptions.map((option) => (
                        <DropdownMenuCheckItem
                          key={option.id}
                          checked={sortId === option.id}
                          onCheckedChange={() => setSortId(option.id)}
                        >
                          {option.label}
                        </DropdownMenuCheckItem>
                      ))}
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* List/Grid view toggle — temporarily hidden
                <ToggleGroupRoot
                  value={value}
                  onValueChange={(details) => setValue(details.value)}
                >
                  <ToggleGroupItem value={GRID_LAYOUT}>
                    <Grid className="size-4 lg:size-6" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value={LIST_LAYOUT}>
                    <List className="size-4 lg:size-6" />
                  </ToggleGroupItem>
                </ToggleGroupRoot>
                */}
              </div>
            </div>
          </div>

          <div className="mt-3 lg:mt-5 xs:max-md:px-5 md:max-lg:px-6 pt-3 lg:pt-5 border-t border-gray-200">
            <div className="flex md:flex-row flex-col gap-y-5 items-start md:items-center justify-between">
              {relatedSkills.length > 0 && (
                <div className="flex gap-y-1 md:flex-row flex-col md:items-center gap-x-3">
                  <span className="inline-block text-xs lg:text-sm text-gray-500 leading-[14.52px] lg:leading-[16.94px] font-medium">
                    Skills related to this search term
                  </span>

                  <div className="inline-flex items-center gap-x-2 flex-wrap lg:gap-x-1">
                    {relatedSkills.map((skill, idx) => (
                      <Button
                        key={skill}
                        className="xs:max-lg:text-xs xs:max-lg:leading-5 opacity-50 hover:opacity-100"
                        visual="gray"
                        variant="link"
                        onClick={() => handleSkillClick(skill)}
                      >
                        {skill}
                        {idx < relatedSkills.length - 1 ? "," : ""}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {cameFromCategory && (
                <Button
                  className="xs:max-lg:text-xs xs:max-lg:leading-5 xs:max-lg:gap-x-2"
                  variant="link"
                  onClick={() => router.back()}
                >
                  <ArrowLeft className="size-[15px]" />
                  Back to Categories
                </Button>
              )}
            </div>
          </div>

          <div className="mt-5 xs:max-md:pb-5 md:max-lg:pb-6 lg:mt-8 xs:max-md:px-3.5 md:max-lg:px-6">
            {isLoading && (
              <div
                className={cn(
                  "grid gap-[15px] lg:gap-5 animate-pulse",
                  cardKind === "talent" || cardKind === "team"
                    ? "md:grid-cols-3 lg:grid-cols-4"
                    : "md:grid-cols-2 lg:grid-cols-3"
                )}
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-64 rounded-lg bg-gray-100 border border-gray-200"
                  />
                ))}
              </div>
            )}

            {!isLoading && searchError && (
              <div className="flex flex-col items-center justify-center gap-y-3 py-16 text-center">
                <p className="text-sm text-dark-blue-400">{searchError}</p>
                <Button
                  variant="outlined"
                  visual="gray"
                  onClick={() => setRetryKey((k) => k + 1)}
                >
                  Try Again
                </Button>
              </div>
            )}

            {isEmpty && (
              <div className="flex flex-col items-center justify-center gap-y-2 py-16 text-center">
                <p className="text-sm font-semibold text-dark-blue-400">
                  No results for “{query}”
                </p>
                <p className="text-sm text-gray-500">
                  Try a different search term or category.
                </p>
              </div>
            )}

            {hasResults &&
              (getFirstItem(value) === GRID_LAYOUT ? (
                <div
                  className={cn(
                    "grid gap-[15px] lg:gap-5",
                    listingCardVariant === "job"
                      ? "grid-cols-1 md:grid-cols-1 lg:grid-cols-1"
                      : "",
                    cardKind === "talent" || cardKind === "team"
                      ? "md:grid-cols-3 lg:grid-cols-4"
                      : "md:grid-cols-2 lg:grid-cols-3"
                  )}
                >
                  {searchHits.map((hit) => (
                    <ListingCard
                      key={String(hit.objectID)}
                      {...(hitToListingCardProps(
                        hit,
                        cardKind,
                        listingCardVariant
                      ) as ListingCardProps)}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid gap-y-[15px] lg:gap-y-5">
                  {searchHits.map((hit) => (
                    <ListingCard
                      key={String(hit.objectID)}
                      {...(hitToListingCardProps(
                        hit,
                        cardKind,
                        listingCardVariant
                      ) as ListingCardProps)}
                    />
                  ))}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
