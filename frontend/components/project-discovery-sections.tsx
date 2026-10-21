"use client"

import * as React from "react"
import { Check } from "@blend-metrics/icons"
import * as RadixTabs from "@radix-ui/react-tabs"
import { cn } from "@/utils/functions"
import { getPublicApiUrl } from "@/lib/runtime-urls"
import { useAuth } from "@/contexts/auth"
import { getGuestRecentlyViewed } from "@/lib/guest-recently-viewed"
import { projectDetailsUrl } from "@/src/lib/listing-urls"
import { ListingCard } from "@/components/listing-card"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import {
  Badge,
  Button,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  Favorite,
  FavoriteRoot,
  Tabs,
  TabsContent,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

const titleCase = (s: string): string =>
  s.replace(/\b\w/g, (c) => c.toUpperCase())

const Shimmer = ({ className }: { className?: string }) => (
  <div className={cn("relative bg-gray-100 rounded overflow-hidden", className)}>
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
  </div>
)

const SkeletonCards = () => (
  <div className="mt-6 flex gap-x-5">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="flex-1 min-w-0 space-y-3">
        <Shimmer className="h-[190px] w-full rounded-lg" />
        <Shimmer className="h-4 w-3/4" />
        <Shimmer className="h-3 w-full" />
        <Shimmer className="h-3 w-1/2" />
        <div className="flex items-center gap-x-2 pt-1">
          <Shimmer className="h-8 w-8 rounded-full" />
          <Shimmer className="h-8 w-8 rounded-full" />
          <Shimmer className="h-8 w-8 rounded-full" />
        </div>
      </div>
    ))}
  </div>
)

const SkeletonColumns = () => (
  <div className="mt-5 py-5 flex items-start justify-between">
    {Array.from({ length: 4 }).map((_, ci) => (
      <div key={ci} className="flex flex-col gap-y-3 items-start w-[22%]">
        <Shimmer className="h-5 w-32 mb-1" />
        {Array.from({ length: 9 }).map((_, i) => (
          <Shimmer key={i} className="h-4 w-28" />
        ))}
      </div>
    ))}
  </div>
)

const SKELETON_TAG_WIDTHS = [
  "w-20", "w-28", "w-16", "w-32", "w-24", "w-24", "w-16", "w-28", "w-20",
  "w-24", "w-28", "w-16", "w-24", "w-20", "w-28", "w-20", "w-24", "w-16",
]

const SkeletonTags = () => (
  <div className="mt-6 flex flex-wrap gap-3">
    {SKELETON_TAG_WIDTHS.map((w, i) => (
      <Shimmer key={i} className={cn("h-8 rounded-full", w)} />
    ))}
  </div>
)

const SkeletonHeader = () => (
  <div className="space-y-2">
    <Shimmer className="h-8 w-64" />
    <Shimmer className="h-5 w-[420px] max-w-full" />
  </div>
)

const SkeletonTitle = ({ className }: { className?: string }) => (
  <Shimmer className={cn("h-8 w-64", className)} />
)

const SkeletonTabs = () => (
  <div className="mt-5 flex items-center gap-x-3">
    <Shimmer className="h-9 w-[150px] rounded-full" />
    <Shimmer className="h-9 w-[120px] rounded-full" />
  </div>
)

const SkeletonRecentlyViewed = () => (
  <div className="mt-[50px] py-[35px]">
    <Shimmer className="h-6 w-44" />
    <div className="mt-[29px] grid grid-cols-3 gap-x-[42px] gap-y-10">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-x-6">
          <Shimmer className="size-[100px] shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2 pr-[45.54px]">
            <Shimmer className="h-4 w-full" />
            <Shimmer className="h-4 w-2/3" />
            <Shimmer className="mt-3 h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  </div>
)

const listingCollaborators = (item: any): string[] => {
  const candidates =
    item?.teamAvatars ??
    item?.teamMembers ??
    item?.collaborators ??
    item?.assignedUsers ??
    item?.providers ??
    []
  if (!Array.isArray(candidates)) return []
  return candidates
    .map((member: any) =>
      typeof member === "string"
        ? member
        : member?.avatarUrl ??
          member?.avatar_url ??
          member?.avatar ??
          member?.photo ??
          member?.image ??
          member?.profileImageUrl
    )
    .filter((avatarUrl: any): avatarUrl is string => Boolean(avatarUrl))
    .slice(0, 4)
}

export function ProjectDiscoverySections({ project }: { project: any }) {
  const { user } = useAuth()
  const [data, setData] = React.useState<any>(project)
  const [recommendedProjects, setRecommendedProjects] = React.useState<any[]>(
    []
  )
  const [recentlyViewed, setRecentlyViewed] = React.useState<any[]>([])
  const [relatedSearches, setRelatedSearches] = React.useState<string[]>([])
  const [similarReady, setSimilarReady] = React.useState<boolean>(
    Array.isArray(project?.similarProjects)
  )
  const [recommendedReady, setRecommendedReady] = React.useState(false)
  const [relatedTermsReady, setRelatedTermsReady] = React.useState(false)
  const [recentlyViewedReady, setRecentlyViewedReady] = React.useState(false)
  const cloudRef = React.useRef<HTMLDivElement>(null)
  const [cloudMaxH, setCloudMaxH] = React.useState<number | undefined>(undefined)

  React.useEffect(() => {
    setData((prev: any) =>
      prev && prev.id === project?.id ? { ...prev, ...project } : project
    )
  }, [project])

  React.useEffect(() => {
    if (!project?.slug) return
    if (Array.isArray(project?.similarProjects)) return
    if (project?.listingType === "service") return
    const apiBase = getPublicApiUrl() || "http://localhost:4000"
    let cancelled = false
    fetch(`${apiBase}/v1/projects/slug/${project.slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((enriched) => {
        if (!cancelled && enriched)
          setData((prev: any) => ({ ...prev, ...enriched }))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [project?.slug, project?.similarProjects])

  React.useEffect(() => {
    if (!project?.id) return
    const apiBase = getPublicApiUrl() || "http://localhost:4000"

    fetch(`${apiBase}/v1/projects/${project.id}/related-searches`)
      .then((r) => (r.ok ? r.json() : []))
      .then((x) => setRelatedSearches(Array.isArray(x) ? x : []))
      .catch(() => {})

    setRelatedTermsReady(false)
    fetch(`${apiBase}/v1/projects/${project.id}/related-terms`)
      .then((r) => (r.ok ? r.json() : null))
      .then((rt) => {
        if (rt) setData((prev: any) => ({ ...prev, ...rt }))
      })
      .catch(() => {})
      .finally(() => setRelatedTermsReady(true))

    if (!Array.isArray(project?.similarProjects)) {
      setSimilarReady(false)
      fetch(`${apiBase}/v1/projects/${project.id}/similar`)
        .then((r) => (r.ok ? r.json() : null))
        .then((sp) => {
          if (Array.isArray(sp))
            setData((prev: any) => ({ ...prev, similarProjects: sp }))
        })
        .catch(() => {})
        .finally(() => setSimilarReady(true))
    } else {
      setSimilarReady(true)
    }

    setRecommendedReady(false)
    fetch(`${apiBase}/v1/recently-viewed/recommended`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((x) => setRecommendedProjects(Array.isArray(x) ? x : []))
      .catch(() => {})
      .finally(() => setRecommendedReady(true))

    // PMCM-402/X2: GET /v1/recently-viewed is JwtAuthGuard'd — a signed-out
    // visitor's history lives in localStorage only (written by
    // project-details' view-tracking effect), so read it from there
    // instead of hitting an endpoint that would just 401.
    setRecentlyViewedReady(false)
    if (!user?.id) {
      setRecentlyViewed(getGuestRecentlyViewed())
      setRecentlyViewedReady(true)
    } else {
      fetch(`${apiBase}/v1/recently-viewed`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : []))
        .then((x) => setRecentlyViewed(Array.isArray(x) ? x : []))
        .catch(() => {})
        .finally(() => setRecentlyViewedReady(true))
    }
  }, [project?.id, user?.id])

  const relatedCloud = React.useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    const curatedTags = (data?.relatedSearchTags as string[]) ?? []
    for (const t of [...relatedSearches, ...curatedTags]) {
      if (out.length >= 80) break
      const key = (t ?? "").toLowerCase().trim()
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(t)
    }
    return out
  }, [relatedSearches, data?.relatedSearchTags])

  React.useLayoutEffect(() => {
    const el = cloudRef.current
    if (!el) return
    const measure = () => {
      const kids = Array.from(el.children) as HTMLElement[]
      if (kids.length === 0) {
        setCloudMaxH(undefined)
        return
      }
      const base = el.getBoundingClientRect().top
      const rowTops: number[] = []
      for (const k of kids) {
        const top = Math.round(k.getBoundingClientRect().top - base)
        if (!rowTops.some((r) => Math.abs(r - top) < 2)) rowTops.push(top)
      }
      rowTops.sort((a, b) => a - b)
      if (rowTops.length <= 5) {
        setCloudMaxH(undefined)
        return
      }
      const rowHeight = kids[0].getBoundingClientRect().height
      setCloudMaxH(rowTops[4] + rowHeight)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [relatedCloud])

  return (
    <>
      {/* Similar Projects — full-width section */}
      <div className="-mx-5 px-5 md:-mx-10 md:px-10 lg:-mx-[100px] lg:px-[100px] pt-[100px] pb-[50px] bg-gray-50 border-t border-gray-200">
        <div>
          <div className="space-y-6">
            <Carousel className="w-full" opts={{ align: "start" }}>
              <div className="flex items-end justify-between">
                {!similarReady ? (
                  <SkeletonHeader />
                ) : (
                  <div className="space-y-2">
                    <h1 className="text-[28px] leading-none text-dark-blue-400 font-bold">
                      Similar Projects
                    </h1>

                    <p className="text-lg font-light text-dark-blue-400 leading-none">
                      Users who have viewed this project have also expressed
                      interest in these as well
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-x-3">
                  <Button
                    variant="link"
                    visual="gray"
                    size="lg"
                    className="underline"
                    asChild
                  >
                    <NextLink
                      href={
                        data?.category
                          ? `/search?q=${encodeURIComponent(data.category)}`
                          : "/search"
                      }
                    >
                      View More
                    </NextLink>
                  </Button>

                  {(data?.similarProjects ?? []).length > 0 && (
                    <div className="flex items-center gap-x-2">
                      <CarouselPrevious
                        className="static translate-y-0 size-8 border-gray-300 bg-white text-gray-500 hover:ring-1 hover:ring-dark-blue-400 hover:text-dark-blue-400 disabled:opacity-40 transition duration-300"
                        indicatorClassName="size-5"
                      />
                      <CarouselNext
                        className="static translate-y-0 size-8 border-gray-300 bg-white text-gray-500 hover:ring-1 hover:ring-dark-blue-400 hover:text-dark-blue-400 disabled:opacity-40 transition duration-300"
                        indicatorClassName="size-5"
                      />
                    </div>
                  )}
                </div>
              </div>

              {!similarReady ? (
                <SkeletonCards />
              ) : (data?.similarProjects ?? []).length > 0 ? (
                <CarouselContent className="-ml-5 mt-6">
                  {(data?.similarProjects ?? []).map((sp: any) => (
                    <CarouselItem key={sp.id} className="basis-1/4 pl-5">
                      <ListingCard
                        kind="project"
                        id={String(sp.id ?? "")}
                        title={sp.title}
                        description={sp.shortDescription}
                        mediaUrl={sp.thumbnail || "/dashboard.png"}
                        duration={
                          sp.duration ? `Starting from ${sp.duration}` : ""
                        }
                        rating={
                          Number(sp.rating || sp.averageRating) || undefined
                        }
                        reviewCount={sp.reviewCount}
                        budget={sp.budget != null ? String(sp.budget) : ""}
                        href={
                          sp.slug ? projectDetailsUrl(sp.slug, sp.id) : undefined
                        }
                        collaborators={listingCollaborators(sp)}
                        favoriteSlot={
                          <FavoriteRoot>
                            {({ pressed }) => (
                              <TooltipProvider delayDuration={75}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-block">
                                      <Favorite />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {pressed ? (
                                      <span className="inline-flex items-center gap-x-1">
                                        <Check className="size-[15px] shrink-0 text-green-500" />
                                        Saved
                                      </span>
                                    ) : (
                                      "Save to favorites"
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </FavoriteRoot>
                        }
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              ) : (
                <p className="text-sm text-gray-500 py-4 mt-6">
                  No similar projects found.
                </p>
              )}
            </Carousel>
          </div>

          {/* Recommended Projects */}
          {!recommendedReady ? (
            <div className="space-y-6 mt-[50px]">
              <SkeletonHeader />
              <SkeletonCards />
            </div>
          ) : recommendedProjects.length > 0 ? (
            <div className="space-y-6 mt-[50px]">
              <Carousel className="w-full" opts={{ align: "start" }}>
                <div className="flex items-end justify-between">
                  <div className="space-y-2">
                    <h1 className="text-[28px] leading-none text-dark-blue-400 font-bold">
                      Recommended Projects
                    </h1>

                    <p className="text-lg font-light text-dark-blue-400 leading-none">
                      These projects are recommended based on your recent
                      searches and browsing history
                    </p>
                  </div>

                  <div className="flex items-center gap-x-3">
                    <Button
                      variant="link"
                      visual="gray"
                      size="lg"
                      className="underline"
                      asChild
                    >
                      <NextLink
                        href={
                          data?.category
                            ? `/search?q=${encodeURIComponent(data.category)}`
                            : "/search"
                        }
                      >
                        View More
                      </NextLink>
                    </Button>

                    <div className="flex items-center gap-x-2">
                      <CarouselPrevious
                        className="static translate-y-0 size-8 border-gray-300 bg-white text-gray-500 hover:ring-1 hover:ring-dark-blue-400 hover:text-dark-blue-400 disabled:opacity-40 transition duration-300"
                        indicatorClassName="size-5"
                      />
                      <CarouselNext
                        className="static translate-y-0 size-8 border-gray-300 bg-white text-gray-500 hover:ring-1 hover:ring-dark-blue-400 hover:text-dark-blue-400 disabled:opacity-40 transition duration-300"
                        indicatorClassName="size-5"
                      />
                    </div>
                  </div>
                </div>

                <CarouselContent className="-ml-5 mt-6">
                  {recommendedProjects.map((rp: any) => (
                    <CarouselItem key={rp.id} className="basis-1/4 pl-5">
                      <ListingCard
                        kind="project"
                        id={String(rp.id ?? "")}
                        title={rp.title}
                        description={rp.shortDescription}
                        mediaUrl={rp.thumbnail || "/dashboard.png"}
                        duration={
                          rp.duration ? `Starting from ${rp.duration}` : ""
                        }
                        rating={
                          Number(rp.rating || rp.averageRating) || undefined
                        }
                        reviewCount={rp.reviewCount}
                        budget={rp.budget != null ? String(rp.budget) : ""}
                        href={
                          rp.slug ? projectDetailsUrl(rp.slug, rp.id) : undefined
                        }
                        collaborators={listingCollaborators(rp)}
                        favoriteSlot={
                          <FavoriteRoot>
                            {({ pressed }) => (
                              <TooltipProvider delayDuration={75}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-block">
                                      <Favorite />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {pressed ? (
                                      <span className="inline-flex items-center gap-x-1">
                                        <Check className="size-[15px] shrink-0 text-green-500" />
                                        Saved
                                      </span>
                                    ) : (
                                      "Save to favorites"
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </FavoriteRoot>
                        }
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </div>
          ) : null}

          {/* More Ways to Explore */}
          <div className="mt-[50px]">
            {!relatedTermsReady ? (
              <SkeletonTitle />
            ) : (
              <h1 className="text-[28px] font-bold leading-none text-dark-blue-400">
                More Ways to Explore
              </h1>
            )}

            <Tabs className="mt-5" defaultValue="Related Categories">
              {!relatedTermsReady ? (
                <SkeletonTabs />
              ) : (
                <RadixTabs.List className="flex items-center gap-x-3">
                  <TabsTrigger
                    variant="unstyled"
                    className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                    value="Related Categories"
                    showUnderline={false}
                  >
                    Related Categories
                  </TabsTrigger>
                  <TabsTrigger
                    variant="unstyled"
                    className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                    value="Related Skills"
                    showUnderline={false}
                  >
                    Related Skills
                  </TabsTrigger>
                </RadixTabs.List>
              )}

              <TabsContent value="Related Categories">
                {!relatedTermsReady ? (
                  <SkeletonColumns />
                ) : (
                <div className="mt-5 py-5 flex items-start justify-between">
                  {(() => {
                    const groups = (
                      data?.relatedCategoryGroups ?? []
                    ).filter(
                      (g: any) =>
                        g?.name &&
                        Array.isArray(g?.items) &&
                        g.items.length > 0
                    )
                    if (groups.length > 0) {
                      return groups.slice(0, 4).map((g: any, ci: number) => (
                        <div
                          key={ci}
                          className="flex flex-col gap-y-3 items-start"
                        >
                          <h2 className="text-lg leading-none font-bold text-dark-blue-400">
                            {titleCase(g.name)}
                          </h2>
                          {g.items
                            .slice(0, 9)
                            .map((cat: string, i: number) => (
                              <Button
                                key={i}
                                variant="link"
                                className="text-dark-blue-400"
                                asChild
                              >
                                <NextLink
                                  href={`/search?q=${encodeURIComponent(cat)}`}
                                >
                                  {titleCase(cat)}
                                </NextLink>
                              </Button>
                            ))}
                        </div>
                      ))
                    }

                    const cats = data?.relatedCategories ?? []
                    const allCats = [...(data?.categories ?? []), ...cats]
                    const unique = Array.from(new Set(allCats)).filter(Boolean)
                    const colSize = Math.min(
                      Math.max(Math.ceil(unique.length / 4), 2),
                      9
                    )
                    const columns = [0, 1, 2, 3].map((i) =>
                      unique.slice(i * colSize, (i + 1) * colSize)
                    )
                    const headers = [
                      data?.category ?? "Categories",
                      ...(data?.subcategories?.slice(0, 3) ?? [
                        "Subcategories",
                        "Related",
                        "More",
                      ]),
                    ]
                    return columns.map((col, ci) => (
                      <div
                        key={ci}
                        className="flex flex-col gap-y-3 items-start"
                      >
                        <h2 className="text-lg leading-none font-bold text-dark-blue-400">
                          {titleCase(headers[ci] ?? "Categories")}
                        </h2>
                        {col.map((cat: string, i: number) => (
                          <Button
                            key={i}
                            variant="link"
                            className="text-dark-blue-400"
                            asChild
                          >
                            <NextLink
                              href={`/search?q=${encodeURIComponent(cat)}`}
                            >
                              {titleCase(cat)}
                            </NextLink>
                          </Button>
                        ))}
                      </div>
                    ))
                  })()}
                </div>
                )}
              </TabsContent>

              <TabsContent value="Related Skills">
                {!relatedTermsReady ? (
                  <SkeletonColumns />
                ) : (
                <div className="mt-5 py-5 flex items-start justify-between">
                  {(() => {
                    const groups = (data?.relatedSkillGroups ?? []).filter(
                      (g: any) =>
                        g?.name &&
                        Array.isArray(g?.items) &&
                        g.items.length > 0
                    )
                    if (groups.length > 0) {
                      return groups.slice(0, 4).map((g: any, ci: number) => (
                        <div
                          key={ci}
                          className="flex flex-col gap-y-3 items-start"
                        >
                          <h2 className="text-lg leading-none font-bold text-dark-blue-400">
                            {titleCase(g.name)}
                          </h2>
                          {g.items
                            .slice(0, 9)
                            .map((skill: string, i: number) => (
                              <Button
                                key={i}
                                variant="link"
                                className="text-dark-blue-400"
                                asChild
                              >
                                <NextLink
                                  href={`/search?q=${encodeURIComponent(
                                    skill
                                  )}`}
                                >
                                  {titleCase(skill)}
                                </NextLink>
                              </Button>
                            ))}
                        </div>
                      ))
                    }

                    const skills = data?.relatedSkills ?? []
                    const allSkills = [
                      ...(data?.skills ?? []),
                      ...(data?.programmingLanguages ?? []),
                      ...(data?.developmentTech ?? []),
                      ...skills,
                    ]
                    const unique = Array.from(new Set(allSkills)).filter(Boolean)
                    const colSize = Math.min(
                      Math.max(Math.ceil(unique.length / 4), 2),
                      9
                    )
                    const columns = [0, 1, 2, 3].map((i) =>
                      unique.slice(i * colSize, (i + 1) * colSize)
                    )
                    const headers = ["Skills", "Technologies", "Tools", "More"]
                    return columns.map((col, ci) => (
                      <div
                        key={ci}
                        className="flex flex-col gap-y-3 items-start"
                      >
                        <h2 className="text-lg leading-none font-bold text-dark-blue-400">
                          {titleCase(headers[ci])}
                        </h2>
                        {col.map((skill: string, i: number) => (
                          <Button
                            key={i}
                            variant="link"
                            className="text-dark-blue-400"
                            asChild
                          >
                            <NextLink
                              href={`/search?q=${encodeURIComponent(skill)}`}
                            >
                              {titleCase(skill)}
                            </NextLink>
                          </Button>
                        ))}
                      </div>
                    ))
                  })()}
                </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Related Searches */}
          <div className="mt-[50px]">
            {!relatedTermsReady ? (
              <SkeletonTitle />
            ) : (
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Related Searches
              </h1>
            )}

            {!relatedTermsReady ? (
              <SkeletonTags />
            ) : (
            <div
              ref={cloudRef}
              className="mt-6 flex flex-wrap gap-3"
              style={
                cloudMaxH
                  ? { maxHeight: cloudMaxH, overflow: "hidden" }
                  : undefined
              }
            >
              {relatedCloud.map((label, i) => (
                <NextLink
                  key={i}
                  href={`/search?q=${encodeURIComponent(label)}`}
                >
                  <Badge
                    className="h-auto py-[4.6px] px-[13.81px] border-[1.5px] border-gray-300 cursor-pointer transition duration-300 hover:border-gray-400 hover:bg-gray-200"
                    visual="gray"
                    size="lg"
                  >
                    {label}
                  </Badge>
                </NextLink>
              ))}
            </div>
            )}
          </div>
        </div>

        {/* Recently Viewed */}
        {!recentlyViewedReady ? (
          <SkeletonRecentlyViewed />
        ) : recentlyViewed.length > 0 ? (
          <div className="mt-[50px] py-[35px]">
            <div className="flex items-center justify-between">
              <h1 className="text-[24px] leading-none text-dark-blue-400 font-bold">
                Recently Viewed
              </h1>

              <Button variant="link" visual="gray" asChild>
                <NextLink href="/browser-history">View All</NextLink>
              </Button>
            </div>

            <div className="mt-[29px] grid grid-cols-3 gap-x-[42px] gap-y-10">
              {recentlyViewed.map((rv: any) => (
                <NextLink key={rv.id} href={`/project-details/${rv.slug}`}>
                  <article className="flex items-start gap-x-6">
                    <div className="relative size-[100px] overflow-hidden rounded-lg shrink-0">
                      <NextImage
                        className="object-cover"
                        src={rv.thumbnail || "/dashboard.png"}
                        alt={rv.title}
                        sizes="25vw"
                        fill
                      />
                    </div>

                    <div className="pr-[45.54px]">
                      <h1 className="cursor-pointer hover:underline transition duration-300 text-base font-bold leading-snug line-clamp-2 text-dark-blue-400">
                        {rv.title}
                      </h1>

                      {rv.shortDescription && (
                        <p className="mt-2 text-sm font-light text-dark-blue-400 line-clamp-2">
                          {rv.shortDescription}
                        </p>
                      )}

                      <div className="mt-3 flex items-center gap-x-3">
                        {rv.budget != null && (
                          <span className="text-sm font-medium leading-none text-dark-blue-400">
                            Starting at ${Number(rv.budget).toLocaleString()}
                          </span>
                        )}

                        {rv.budget != null && rv.duration && (
                          <span className="inline-block shrink-0 rounded-full size-1 bg-gray-300" />
                        )}

                        {rv.duration && (
                          <span className="text-sm font-medium leading-none text-dark-blue-400">
                            {rv.duration}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                </NextLink>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
