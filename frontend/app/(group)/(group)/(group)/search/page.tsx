"use client"

import React, { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  SearchAPI,
  SearchCategory as SearchCategoryType,
  SearchHit,
  SearchResponse,
  isGroupedResponse,
} from "@/service/http/search"
import { HOT_KEYS } from "@/utils/constants"
import { cn, getFirstItem, getIsNotEmpty, keys } from "@/utils/functions"
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
import { useToggle } from "react-use"
import { Keys } from "@/types/core"
import {
  ToggleGroup,
  ToggleGroupItem,
  ToggleGroupRoot,
} from "@/components/ui/toggle-group"
import { Grid, List, SortAs } from "@/components/icons"
import { Logo4 } from "@/components/icons/logo-4"
import { SearchCard } from "@/components/search-card"
import { SearchCardLandscape } from "@/components/search-card-landscape"
import { ListingCard, ListingCardProps } from "@/components/listing-card"
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
  inputVariants,
} from "@/components/ui"
import { Sidebar } from "./sidebar"

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
 * Convert a raw Algolia hit into ListingCard props for the given entity kind.
 * The master ListingCard dispatches to the correct visual treatment (project,
 * service, talent, or team). This mapper is intentionally forgiving because
 * hit field names vary across indexes.
 */
function hitToListingCardProps(
  hit: SearchHit,
  kind: "project" | "service" | "talent" | "team"
): ListingCardProps {
  const id = String(hit.objectID ?? hit.id ?? "")

  if (kind === "project" || kind === "service") {
    return {
      kind,
      id,
      title: getHitTitle(hit),
      description: hit.description || hit.overview || hit.headline || "",
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
      rating: typeof hit.rating === "number" ? hit.rating : 4.9,
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
      favoriteSlot: (
        <FavoriteRoot>
          <Favorite />
        </FavoriteRoot>
      ),
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
      photo: hit.photo || hit.avatar_url || hit.image,
      rate: hit.hourly_rate
        ? `$${hit.hourly_rate}/hr`
        : hit.rate_range || "$85 - $120/hr",
      experience:
        hit.years_of_experience != null
          ? `${hit.years_of_experience} years of experience`
          : hit.experience,
      country: hit.country || hit.location,
      localTime: hit.local_time,
      rating: typeof hit.rating === "number" ? hit.rating : undefined,
      projects:
        typeof hit.projects_count === "number"
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
    favoriteSlot: (
      <FavoriteRoot>
        <Favorite />
      </FavoriteRoot>
    ),
  }
}

/**
 * Minimal placeholder record used when the backend returns no hits — keeps
 * the grid populated with the correct card shape for the active entity so
 * users see what the search page will look like once data flows.
 */
function placeholderHit(
  kind: "project" | "service" | "talent" | "team",
  i: number
): SearchHit {
  if (kind === "talent") {
    return {
      objectID: `placeholder-${kind}-${i}`,
      name: "Anika",
      username: "BlueberryBelle",
      handle: "BlueberryBelle",
      role: "Database Administrator",
      hourly_rate: "85 - $120",
      years_of_experience: 9,
      country: "United States",
      local_time: "7:39am local time",
      rating: 4.2,
      projects_count: 11,
      all_stars: true,
      skills: ["UX Research", "Web Design", "Content Design", "Frontend Development"],
    }
  }
  if (kind === "team") {
    return {
      objectID: `placeholder-${kind}-${i}`,
      team_name: "Team Name",
      handle: "Tech_Sential",
      team_type: "Development team",
      average_years_of_experience: 10,
      rate_range: "$85 - $120",
      locations: ["UK", "USA", "Brazil", "Philippines"],
      rating: 4.9,
      projects_count: 16,
      skills: ["iOS", "E-commerce", "Mobile Application", "Small Business", "Software Development"],
    }
  }
  return {
    objectID: `placeholder-${kind}-${i}`,
    project_title: "The Ultimate Mobile App Experience",
    service_title: "The Ultimate Mobile App Experience",
    description:
      "Brief Description of the project. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.",
    budget_range: kind === "service" ? "$5,000/month" : "$50,000 budget",
    timeline: kind === "project" ? "Starting from 12 weeks" : undefined,
    rating: 4.9,
    review_count: 5,
  }
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <Search />
    </Suspense>
  )
}

function Search() {
  const [value, setValue] = useState([GRID_LAYOUT])
  const [isOpen, toggleIsOpen] = useToggle(false)

  // Ensure the search page always loads scrolled to the very top, regardless
  // of where the user was scrolled on the previous page.
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" })
    }
  }, [])

  // Read search params so clicks from "Popular Searches" etc. reflect in the page.
  const searchParams = useSearchParams()
  const skillParam = searchParams?.get("skill") ?? ""
  // Fall back to the skill query when no explicit `q` is provided so that
  // /search?skill=Docker renders "Docker" as the displayed search term
  // instead of the hardcoded "Swift Development" placeholder.
  const query =
    searchParams?.get("q") ?? (skillParam ? skillParam : "Swift Development")
  const categorySlug = searchParams?.get("category") ?? ""
  const categoryLabel = categorySlug
    ? categorySlug
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    : ""

  // ── Phase 4: live results from backend search service ─────────────────
  // Calls GET /search?q=...&category=... and renders the hits when the
  // backend returns any. Falls back to mock SearchCard blocks on error or
  // empty result so the design is always preserved.
  const [searchHits, setSearchHits] = useState<SearchHit[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [totalHits, setTotalHits] = useState<number | null>(null)

  // Map the top-nav listing-type category ("projects"/"services"/"teams"/"talent")
  // onto the backend SearchCategory enum. Anything else falls through to "all".
  const backendCategory: SearchCategoryType = useMemo(() => {
    const known: SearchCategoryType[] = ["talent", "teams", "projects", "services"]
    return (known.includes(categorySlug as SearchCategoryType)
      ? categorySlug
      : "all") as SearchCategoryType
  }, [categorySlug])

  useEffect(() => {
    let cancelled = false
    const skills = searchParams?.get("skill") ?? undefined
    const location = searchParams?.get("location") ?? undefined
    const industry = searchParams?.get("industry") ?? undefined

    setIsLoading(true)
    SearchAPI.search({
      q: query,
      category: backendCategory,
      limit: 20,
      page: 0,
      skills,
      location,
      industry,
    })
      .then((res) => {
        if (cancelled) return
        const data: SearchResponse = res.data as SearchResponse
        if (isGroupedResponse(data)) {
          // Flatten grouped response into a single hit list for display
          const merged: SearchHit[] = [
            ...(data.talent?.hits ?? []),
            ...(data.teams?.hits ?? []),
            ...(data.projects?.hits ?? []),
            ...(data.services?.hits ?? []),
          ]
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
        // Silent fallback — the mock cards will render instead.
        setSearchHits([])
        setTotalHits(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [query, backendCategory, searchParams])

  const resultsCount = totalHits ?? 147

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

  // Build the list that will actually be rendered — real hits when available,
  // placeholders of the same kind otherwise so the grid isn't empty.
  const rendered: SearchHit[] =
    searchHits.length > 0
      ? searchHits
      : Array.from({ length: 8 }).map((_, i) => placeholderHit(cardKind, i))

  return (
    <>
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
            <Sidebar className="block w-full px-5" />
          </ScrollArea>
          <div className="h-12 absolute border-t border-gray-200 bg-white bottom-0 inset-x-0 flex items-center justify-between pl-3.5 p-1">
            <Button
              className="opacity-50 hover:opacity-100"
              variant="link"
              visual="gray"
            >
              Clear Filters
            </Button>

            <Button variant="outlined" visual="gray">
              Show 42 results
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
        <Sidebar />

        <div className="flex-auto">
          {/* Contextual search banner — appears directly above the results count. */}
          <div className="mb-5 rounded-lg overflow-hidden">
            <img
              src="/search-banner-swift.png"
              alt="Swift Development"
              className="w-full h-auto block"
            />
          </div>

          <div className="hidden lg:inline-flex items-center gap-x-3">
            <h1 className="text-base leading-[19.36px] font-light text-dark-blue-400">
              <span className="font-bold">{resultsCount}</span> Results for{" "}
              <span className="font-bold">“{query}”</span>
              {categoryLabel && (
                <>
                  {" "}
                  in{" "}
                  <span className="font-bold">{categoryLabel}</span>
                </>
              )}
            </h1>

            <Button
              className="opacity-50 hover:opacity-100"
              variant="link"
              visual="gray"
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
                >
                  Clear Filters
                </Button>
              </div>
              <ToggleGroup.Root
                defaultValue={["featured"]}
                className="flex items-center shrink-0 gap-x-2 lg:contents"
              >
                <ToggleGroup.Item value="featured" asChild>
                  <Button
                    className="group xs:max-lg:text-xs xs:max-lg:leading-5 xs:max-lg:h-[34px] xs:max-lg:px-3 data-[focus]:bg-white data-[focus]:hover:bg-white data-[focus]:opacity-100 data-[state=on]:bg-white data-[state=on]:hover:bg-white data-[state=on]:opacity-100 opacity-50"
                    visual="gray"
                    variant="outlined"
                  >
                    Featured
                  </Button>
                </ToggleGroup.Item>
                <ToggleGroup.Item value="best-match" asChild>
                  <Button
                    className="group xs:max-lg:text-xs xs:max-lg:leading-5 xs:max-lg:h-[34px] xs:max-lg:px-3 data-[focus]:bg-white data-[focus]:hover:bg-white data-[focus]:opacity-100 data-[state=on]:bg-white data-[state=on]:hover:bg-white data-[state=on]:opacity-100 opacity-50"
                    visual="gray"
                    variant="outlined"
                  >
                    Best Match
                  </Button>
                </ToggleGroup.Item>
                <ToggleGroup.Item value="top-rated" asChild>
                  <Button
                    className="group xs:max-lg:text-xs xs:max-lg:leading-5 xs:max-lg:h-[34px] xs:max-lg:px-3 data-[focus]:bg-white data-[focus]:hover:bg-white data-[focus]:opacity-100 data-[state=on]:bg-white data-[state=on]:hover:bg-white data-[state=on]:opacity-100 opacity-50"
                    visual="gray"
                    variant="outlined"
                  >
                    Top Rated
                  </Button>
                </ToggleGroup.Item>
                <ToggleGroup.Item value="most-recent" asChild>
                  <Button
                    className="group xs:max-lg:text-xs xs:max-lg:leading-5 xs:max-lg:h-[34px] xs:max-lg:px-3 data-[focus]:bg-white data-[focus]:hover:bg-white data-[focus]:opacity-100 data-[state=on]:bg-white data-[state=on]:hover:bg-white data-[state=on]:opacity-100 opacity-50"
                    visual="gray"
                    variant="outlined"
                  >
                    <ArrowUp className="group-data-[focus]:inline-block group-data-[state=on]:inline-block hidden size-[15px] text-gray-500" />
                    Most Recent
                  </Button>
                </ToggleGroup.Item>
              </ToggleGroup.Root>
            </div>

            <div className="lg:contents mt-5 md:mt-6 xs:max-md:px-5 md:max-lg:px-6 flex justify-between items-end">
              <h1 className="text-xs leading-[19.36px] lg:hidden font-light text-dark-blue-400">
                <span className="font-semibold">{resultsCount}</span> Results for{" "}
                <span className="font-semibold">“{query}”</span>
                {categoryLabel && (
                  <>
                    {" "}
                    in{" "}
                    <span className="font-semibold">{categoryLabel}</span>
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
                      <DropdownMenuCheckItem>Option 1</DropdownMenuCheckItem>
                      <DropdownMenuCheckItem>Option 2</DropdownMenuCheckItem>
                      <DropdownMenuCheckItem>Option 3</DropdownMenuCheckItem>
                      <DropdownMenuCheckItem>Option 4</DropdownMenuCheckItem>
                      <DropdownMenuCheckItem>Option 5</DropdownMenuCheckItem>
                      <DropdownMenuCheckItem>Option 6</DropdownMenuCheckItem>
                      <DropdownMenuCheckItem>Option 7</DropdownMenuCheckItem>
                      <DropdownMenuCheckItem>Option 8</DropdownMenuCheckItem>
                      <DropdownMenuCheckItem>Option 9</DropdownMenuCheckItem>
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>

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
              </div>
            </div>
          </div>

          <div className="mt-3 lg:mt-5 xs:max-md:px-5 md:max-lg:px-6 pt-3 lg:pt-5 border-t border-gray-200">
            <div className="flex md:flex-row flex-col gap-y-5 items-start md:items-center justify-between">
              <div className="flex gap-y-1 md:flex-row flex-col md:items-center gap-x-3">
                <span className="inline-block text-xs lg:text-sm text-gray-500 leading-[14.52px] lg:leading-[16.94px] font-medium">
                  Skills related to this category
                </span>

                <div className="inline-flex items-center gap-x-2 flex-wrap lg:gap-x-1">
                  <Button
                    className="xs:max-lg:text-xs xs:max-lg:leading-5 opacity-50 hover:opacity-100"
                    visual="gray"
                    variant="link"
                  >
                    Graphic Design,
                  </Button>
                  <Button
                    className="xs:max-lg:text-xs xs:max-lg:leading-5 opacity-50 hover:opacity-100"
                    visual="gray"
                    variant="link"
                  >
                    UX Prototyping,
                  </Button>
                  <Button
                    className="xs:max-lg:text-xs xs:max-lg:leading-5 opacity-50 hover:opacity-100"
                    visual="gray"
                    variant="link"
                  >
                    Adobe Illustrator,
                  </Button>
                  <Button
                    className="xs:max-lg:text-xs xs:max-lg:leading-5 opacity-50 hover:opacity-100"
                    visual="gray"
                    variant="link"
                  >
                    UX Research
                  </Button>
                </div>
              </div>

              <Button
                className="xs:max-lg:text-xs xs:max-lg:leading-5 xs:max-lg:gap-x-2"
                variant="link"
              >
                <ArrowLeft className="size-[15px]" />
                Back to Categories
              </Button>
            </div>
          </div>

          <div className="mt-5 xs:max-md:pb-5 md:max-lg:pb-6 lg:mt-8 xs:max-md:px-3.5 md:max-lg:px-6">
            {getFirstItem(value) === GRID_LAYOUT ? (
              <div
                className={cn(
                  "grid gap-[15px] lg:gap-5",
                  cardKind === "talent" || cardKind === "team"
                    ? "md:grid-cols-3 lg:grid-cols-4"
                    : "md:grid-cols-2 lg:grid-cols-3"
                )}
              >
                {rendered.map((hit) => (
                  <ListingCard
                    key={String(hit.objectID)}
                    {...(hitToListingCardProps(hit, cardKind) as ListingCardProps)}
                  />
                ))}
              </div>
            ) : (
              <div className="grid gap-y-[15px] lg:gap-y-5">
                {rendered.map((hit) => (
                  <ListingCard
                    key={String(hit.objectID)}
                    {...(hitToListingCardProps(hit, cardKind) as ListingCardProps)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
