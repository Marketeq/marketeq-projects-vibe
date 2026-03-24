"use client"

import React, { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import {
  useCategoryPageL1,
  useCategoryPageL2,
  useCategoryPageL3,
} from "@/src/features/category-pages/hook"
import { type BlockItem } from "@/src/lib/api/category-pages"
import {
  addFavorite,
  findFavoriteByItemId,
  getAllFavorites,
  removeFavorite,
} from "@/src/lib/api/favorites"
import { buildProjectUrl } from "@/src/lib/urlHelpers"
import { parseCategoryParams } from "@/src/lib/urlHelpers"
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home03,
  Mail,
  Star,
} from "@blend-metrics/icons"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs"
import { Money } from "@/components/money"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Badge,
  Button,
  Favorite,
  FavoriteRoot,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  ScrollArea,
  ScrollBar,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"

// ── Static category taxonomy (will be replaced by CMS data later) ──

interface SubcategoryData {
  name: string
  slug: string
  description: string
}

interface CategoryMeta {
  name: string
  slug: string
  description: string
  heroImage: string
  subcategories: SubcategoryData[]
}

const CATEGORY_TAXONOMY: Record<string, CategoryMeta> = {
  research: {
    name: "Research",
    slug: "research",
    description: "Discover research projects, meet expert analysts, and find the insights you need to succeed.",
    heroImage: "/coding.png",
    subcategories: [
      { name: "Market Research", slug: "market-research", description: "Consumer insights, competitive analysis, and market sizing." },
      { name: "User Research", slug: "user-research", description: "Usability testing, interviews, and persona development." },
      { name: "Academic Research", slug: "academic-research", description: "Literature reviews, white papers, and scholarly analysis." },
      { name: "Data Analysis", slug: "data-analysis", description: "Statistical analysis, data visualization, and reporting." },
      { name: "Competitive Intelligence", slug: "competitive-intelligence", description: "Competitor tracking, benchmarking, and strategic insights." },
    ],
  },
  "software-development": {
    name: "Software Development",
    slug: "software-development",
    description: "Discover exciting projects, meet talented teams, and find the skills you need to succeed.",
    heroImage: "/coding.png",
    subcategories: [
      { name: "Front-end Development", slug: "front-end-development", description: "Create the interface that users interact with directly." },
      { name: "Back-end Development", slug: "back-end-development", description: "Build the server logic, APIs, and databases." },
      { name: "Mobile Development", slug: "mobile-development", description: "Native and cross-platform mobile applications." },
      { name: "DevOps & Cloud", slug: "devops-cloud", description: "Infrastructure, CI/CD, and cloud deployment." },
      { name: "Blockchain", slug: "blockchain", description: "Smart contracts, DeFi, and Web3 development." },
    ],
  },
  "design-creative": {
    name: "Design & Creative",
    slug: "design-creative",
    description: "Find creative talent for branding, UI/UX, illustration, and visual storytelling.",
    heroImage: "/coding.png",
    subcategories: [
      { name: "UI/UX Design", slug: "ui-ux-design", description: "User interface and experience design for web and mobile." },
      { name: "Graphic Design", slug: "graphic-design", description: "Visual branding, print design, and marketing materials." },
      { name: "Illustration", slug: "illustration", description: "Custom illustrations, icons, and digital art." },
      { name: "Motion Design", slug: "motion-design", description: "Animations, motion graphics, and video effects." },
      { name: "Brand Identity", slug: "brand-identity", description: "Logo design, brand guidelines, and visual systems." },
    ],
  },
  marketing: {
    name: "Marketing",
    slug: "marketing",
    description: "Grow your brand with expert marketers, strategists, and campaign specialists.",
    heroImage: "/coding.png",
    subcategories: [
      { name: "Digital Marketing", slug: "digital-marketing", description: "SEO, SEM, social media, and online advertising." },
      { name: "Content Marketing", slug: "content-marketing", description: "Blog posts, whitepapers, and content strategy." },
      { name: "Email Marketing", slug: "email-marketing", description: "Campaigns, automation, and newsletter strategy." },
      { name: "Social Media", slug: "social-media", description: "Social strategy, community management, and growth." },
      { name: "Analytics & SEO", slug: "analytics-seo", description: "Performance tracking, keyword research, and optimization." },
    ],
  },
  "data-analytics": {
    name: "Data & Analytics",
    slug: "data-analytics",
    description: "Turn data into decisions with expert analysts, engineers, and data scientists.",
    heroImage: "/coding.png",
    subcategories: [
      { name: "Data Engineering", slug: "data-engineering", description: "Pipelines, ETL, and data infrastructure." },
      { name: "Data Science", slug: "data-science", description: "Machine learning, modeling, and predictive analytics." },
      { name: "Business Intelligence", slug: "business-intelligence", description: "Dashboards, reporting, and KPI tracking." },
      { name: "Data Visualization", slug: "data-visualization", description: "Charts, infographics, and interactive dashboards." },
      { name: "Big Data", slug: "big-data", description: "Large-scale data processing and distributed systems." },
    ],
  },
  writing: {
    name: "Writing & Content",
    slug: "writing",
    description: "Find skilled writers for copywriting, technical documentation, and creative content.",
    heroImage: "/coding.png",
    subcategories: [
      { name: "Copywriting", slug: "copywriting", description: "Marketing copy, ad copy, and persuasive writing." },
      { name: "Technical Writing", slug: "technical-writing", description: "Documentation, API guides, and knowledge bases." },
      { name: "Creative Writing", slug: "creative-writing", description: "Storytelling, scripts, and editorial content." },
      { name: "Translation", slug: "translation", description: "Localization, multilingual content, and transcription." },
      { name: "Editing & Proofreading", slug: "editing-proofreading", description: "Quality assurance for written content." },
    ],
  },
  "business-consulting": {
    name: "Business & Consulting",
    slug: "business-consulting",
    description: "Strategic advice, project management, and operational expertise for your business.",
    heroImage: "/coding.png",
    subcategories: [
      { name: "Strategy Consulting", slug: "strategy-consulting", description: "Business strategy, go-to-market, and growth planning." },
      { name: "Project Management", slug: "project-management", description: "Agile, Scrum, and project delivery." },
      { name: "Financial Consulting", slug: "financial-consulting", description: "Financial modeling, budgeting, and forecasting." },
      { name: "HR & Recruiting", slug: "hr-recruiting", description: "Talent acquisition, org design, and people ops." },
      { name: "Legal & Compliance", slug: "legal-compliance", description: "Contracts, regulatory compliance, and legal ops." },
    ],
  },
}

/** Convert a slug like "software-development" to title case "Software Development" */
function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/** Look up category metadata — falls back to generating from slug */
function getCategoryMeta(slug: string): CategoryMeta {
  if (CATEGORY_TAXONOMY[slug]) return CATEGORY_TAXONOMY[slug]
  return {
    name: slugToTitle(slug),
    slug,
    description: `Discover exciting projects, meet talented teams, and find the skills you need to succeed.`,
    heroImage: "/coding.png",
    subcategories: [],
  }
}

// Interface for project items
interface ProjectItem extends BlockItem {
  featured?: boolean
  createdAt?: string
  updatedAt?: string
  rating?: number
  reviewCount?: number
  reviews?: number
  coverImage?: string
  summary?: string
  role?: string
  scopeTotal?: {
    timeline?: string
    budget?: number | string
  }
}

export default function Projects() {
  const params = useParams()
  const category = params.category as string[]
  const [favoritedItems, setFavoritedItems] = useState<Set<string>>(new Set())
  const lastSegment = category?.[category.length - 1]
  const isProjectsPage = lastSegment === "projects"
  const actualCategory = isProjectsPage ? category.slice(0, -1) : category

  const categoryPath = useMemo(() => {
    try {
      return parseCategoryParams({ category: actualCategory })
    } catch (err) {
      return null
    }
  }, [actualCategory])

  // State management
  const [allProjects, setAllProjects] = useState<ProjectItem[]>([])
  const [displayedProjects, setDisplayedProjects] = useState<ProjectItem[]>([])
  const [activeTab, setActiveTab] = useState("Featured")

  // ✅ Extract l1, l2, l3
  const l1 = categoryPath?.l1
  const l2 = categoryPath?.l2
  const l3 = categoryPath?.l3

  // Resolve category metadata from the static taxonomy
  const l1Meta = useMemo(() => getCategoryMeta(l1 ?? ""), [l1])
  const l2Meta = useMemo(() => l2 ? (l1Meta.subcategories.find((s) => s.slug === l2) ?? { name: slugToTitle(l2), slug: l2, description: "" }) : null, [l1Meta, l2])
  const l3Meta = useMemo(() => l3 ? { name: slugToTitle(l3), slug: l3, description: "" } : null, [l3])

  // The "current" category is the deepest level
  const currentName = l3Meta?.name ?? l2Meta?.name ?? l1Meta.name
  const currentDescription = (l2Meta && "description" in l2Meta ? l2Meta.description : null) ?? l1Meta.description

  // Call hooks unconditionally to satisfy React rules
  const l1Query = useCategoryPageL1(
    l1 ?? "",
    { kind: "projects" },
    { enabled: !!l1 && !l2 && !l3 }
  )
  const l2Query = useCategoryPageL2(
    l1 ?? "",
    l2 ?? "",
    { kind: "projects" },
    { enabled: !!l1 && !!l2 && !l3 }
  )
  const l3Query = useCategoryPageL3(
    l1 ?? "",
    l2 ?? "",
    l3 ?? "",
    { kind: "projects" },
    { enabled: !!l1 && !!l2 && !!l3 }
  )

  const activeQuery = l3
    ? l3Query
    : l2
      ? l2Query
      : l1
        ? l1Query
        : { data: null, isLoading: false }
  const { data: pageData, isLoading } = activeQuery as {
    data: any
    isLoading: boolean
  }

  // Subcategories: prefer API data, fall back to static taxonomy
  const subcategories = useMemo(() => {
    if (pageData?.children && pageData.children.length > 0) return pageData.children
    if (!l2 && !l3) return l1Meta.subcategories.map((s) => ({ ...s, uuid: s.slug }))
    return []
  }, [pageData?.children, l1Meta.subcategories, l2, l3])

  // Use actualCategory for categorySlugPath fallback
  const categorySlugPath =
    pageData?.breadcrumbs?.map((b: any) => b.slug) || actualCategory || []

  // Extract projects when data changes
  useEffect(() => {
    if (pageData?.blocks) {
      const allItems: any[] = []
      pageData.blocks.forEach((block: any) => {
        if (block.entity === "projects" && block.items) {
          allItems.push(...block.items)
        }
      })

      setAllProjects(allItems)
      setDisplayedProjects(allItems)
    }
  }, [pageData])

  // Sort projects when tab changes
  useEffect(() => {
    if (allProjects.length === 0) return

    let sorted = [...allProjects]

    switch (activeTab) {
      case "Featured":
        sorted = sorted.sort((a: any, b: any) => {
          if (a.featured && !b.featured) return -1
          if (!a.featured && b.featured) return 1
          return 0
        })
        break

      case "Newest":
        sorted = sorted.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || 0).getTime()
          const dateB = new Date(b.createdAt || 0).getTime()
          return dateB - dateA
        })
        break

      case "Most Popular":
        sorted = sorted.sort((a: any, b: any) => {
          const reviewsA = a.reviewCount || a.reviews || 0
          const reviewsB = b.reviewCount || b.reviews || 0
          return reviewsB - reviewsA
        })
        break

      case "Trending":
        sorted = sorted.sort((a: any, b: any) => {
          const dateA = new Date(a.updatedAt || 0).getTime()
          const dateB = new Date(b.updatedAt || 0).getTime()
          return dateB - dateA
        })
        break

      case "Top-Rated":
        sorted = sorted.sort((a: any, b: any) => {
          const ratingA = a.rating || 0
          const ratingB = b.rating || 0
          return ratingB - ratingA
        })
        break
    }

    setDisplayedProjects(sorted)
  }, [activeTab, allProjects])

  // Load favorites on page mount
  useEffect(() => {
    async function loadFavorites() {
      console.log("📥 Loading favorites from database...")
      const favorites = await getAllFavorites()
      const itemIds = new Set(favorites.map((fav) => fav.itemId))
      setFavoritedItems(itemIds)
      console.log("✅ Loaded favorites:", Array.from(itemIds))
    }

    loadFavorites()
  }, []) // Empty dependency array = run once on mount

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="py-[50px]">
        <div className="max-w-[1440px] mx-auto px-[50px]">
          <div className="relative rounded-lg overflow-hidden h-[227px]">
            <NextImage
              src={l1Meta.heroImage}
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-black/60" />
            <div className="absolute inset-0 p-6">
              {/* Dynamic breadcrumbs */}
              <div className="flex items-center gap-x-2">
                <NextLink href="/">
                  <Home03 className="size-[18px] text-white opacity-60" />
                </NextLink>
                <span className="text-xs leading-6 font-semibold text-white opacity-60">/</span>
                <NextLink href={`/c/${l1Meta.slug}`} className="text-xs leading-6 font-semibold text-white opacity-60 hover:opacity-100 transition-opacity">
                  {l1Meta.name}
                </NextLink>
                {l2Meta && (
                  <>
                    <span className="text-xs leading-6 font-semibold text-white opacity-60">/</span>
                    <NextLink href={`/c/${l1Meta.slug}/${l2Meta.slug}`} className="text-xs leading-6 font-semibold text-white opacity-60 hover:opacity-100 transition-opacity">
                      {l2Meta.name}
                    </NextLink>
                  </>
                )}
                {l3Meta && (
                  <>
                    <span className="text-xs leading-6 font-semibold text-white opacity-60">/</span>
                    <span className="text-xs leading-6 font-semibold text-white">
                      {l3Meta.name}
                    </span>
                  </>
                )}
              </div>

              <div className="mt-[50px] px-[50px]">
                <h1 className="text-[36px] font-bold leading-none text-white">
                  {currentName}
                </h1>
                <p className="text-xl mt-3 leading-none text-white">
                  {currentDescription}
                </p>
              </div>
            </div>
          </div>

          {/* ✅ UPDATED: Dynamic subcategories section */}
          <div className="mt-[50px]">
            <div className="flex items-center justify-between">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Explore {currentName}
              </h1>

              <div className="flex items-center gap-x-3">
                <IconButton
                  className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                  visual="gray"
                  variant="outlined"
                >
                  <ChevronLeft className="size-[18px]" />
                </IconButton>
                <IconButton
                  className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                  visual="gray"
                  variant="outlined"
                  data-state="active"
                >
                  <ChevronRight className="size-[18px]" />
                </IconButton>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-5 gap-[15px]">
              {subcategories.length > 0 ? (
                subcategories.map((subcat: any) => (
                  <NextLink
                    key={subcat.uuid ?? subcat.slug}
                    href={`/c/${[l1Meta.slug, l2Meta?.slug, subcat.slug].filter(Boolean).join("/")}`}
                    className="border border-gray-200 bg-white rounded-lg p-5 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] hover:ring-1 hover:ring-gray-200 cursor-pointer hover:shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] transition duration-300"
                  >
                    <article>
                      <div className="size-[35px] rounded-lg bg-gray-200" />

                      <div className="mt-5">
                        <h1 className="text-base leading-none font-semibold text-dark-blue-400 transition duration-300">
                          {subcat.name}
                        </h1>
                        <p className="text-[13px] leading-none font-light text-dark-blue-400 mt-1">
                          {subcat.description || `Explore ${subcat.name} category`}
                        </p>
                      </div>
                    </article>
                  </NextLink>
                ))
              ) : (
                <div className="col-span-5 text-center py-8 text-gray-500">
                  No subcategories available
                </div>
              )}
            </div>
          </div>

          {/* MAIN SECTION - Top Software Development Projects */}
          <div className="mt-[50px]">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Recommended in {currentName}
              </h1>
              <div className="mt-6 flex justify-between items-center">
                <TabsList className="flex items-center gap-x-3">
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Featured">Featured</TabsTrigger>
                  </Badge>
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Newest">Newest</TabsTrigger>
                  </Badge>
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Most Popular">Most Popular</TabsTrigger>
                  </Badge>
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Trending">Trending</TabsTrigger>
                  </Badge>
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Top-Rated">Top-Rated</TabsTrigger>
                  </Badge>
                </TabsList>

                <NextLink href="../../level-3/projects">
                  <Button
                    variant="link"
                    visual="gray"
                    size="lg"
                    className="underline"
                  >
                    Explore More Projects
                  </Button>
                </NextLink>
              </div>

              <div className="mt-6">
                <TabsContent
                  className="gap-5 grid grid-cols-4"
                  value={activeTab}
                >
                  {isLoading ? (
                    Array(8)
                      .fill(0)
                      .map((_, index) => (
                        <article
                          key={index}
                          className="p-5 bg-white border rounded-lg animate-pulse"
                        >
                          <div className="h-[169px] bg-gray-200 rounded-[6px]"></div>
                          <div className="mt-3 h-4 bg-gray-200 rounded"></div>
                          <div className="mt-3 h-3 bg-gray-200 rounded"></div>
                        </article>
                      ))
                  ) : displayedProjects.length > 0 ? (
                    displayedProjects.slice(0, 8).map((project) => (
                      <article
                        key={project.id}
                        className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] flex flex-col"
                      >
                        {/* Image */}
                        <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                          <NextImage
                            className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                            src={
                              project.coverImage ||
                              project.thumbnail ||
                              "/dashboard.png"
                            }
                            alt={project.title || "Project"}
                            fill
                            sizes="33vw"
                          />
                        </div>

                        {/* Title and Rating */}
                        <div className="mt-3 flex items-start gap-x-3">
                          <NextLink
                            href={buildProjectUrl(
                              categorySlugPath,
                              project.slug,
                              project.id
                            )}
                            className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                          >
                            {project.title}
                          </NextLink>

                          {/* Only show rating if reviews exist */}
                          {project.rating && (project.reviewCount ?? 0) > 0 && (
                            <div className="inline-flex items-center gap-x-1">
                              <Star className="size-[15px] text-primary-500 fill-primary-500" />
                              <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                {project.rating}{" "}
                                <span className="font-extralight">
                                  ({project.reviewCount})
                                </span>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Description - 3 lines truncated */}
                        <p className="mt-3 text-sm leading-[1.4] font-extralight text-dark-blue-400 line-clamp-3">
                          {project.summary ||
                            project.description ||
                            "No description available"}
                        </p>

                        {/* Timeline and Budget from scopeTotal */}
                        <div className="mt-[14.5px] flex flex-col gap-y-3">
                          <div className="flex items-center gap-x-[6.4px]">
                            <Clock className="size-[18px] shrink-0 text-primary-500" />
                            <span className="font-medium text-sm leading-none text-dark-blue-400">
                              Starting from{" "}
                              {project.scopeTotal?.timeline || "12 weeks"}
                            </span>
                          </div>

                          <div className="flex items-center gap-x-[6.4px]">
                            <Money className="size-[18px] shrink-0 text-primary-500" />
                            <span className="font-medium text-sm leading-none text-dark-blue-400">
                              $
                              {project.scopeTotal?.budget ||
                                project.price ||
                                "50,000"}{" "}
                              budget
                            </span>
                          </div>
                        </div>

                        {/* Pinned to bottom with mt-auto */}
                        <div className="mt-auto pt-5 flex items-end justify-between">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AvatarGroup
                                  max={5}
                                  size="sm"
                                  excess
                                  excessClassName="border-gray-300 text-gray-500"
                                >
                                  {Array(3)
                                    .fill(0)
                                    .map((_, i) => (
                                      <Avatar
                                        key={i}
                                        size="sm"
                                        className="border-2 border-white hover:ring-0 active:ring-0"
                                      >
                                        <AvatarImage
                                          src="/woman.jpg"
                                          alt="Team member"
                                        />
                                        <AvatarFallback>U</AvatarFallback>
                                      </Avatar>
                                    ))}
                                </AvatarGroup>
                              </TooltipTrigger>
                              <TooltipContent
                                className="p-0 max-w-[262px]"
                                size="md"
                              >
                                <ScrollArea
                                  className="h-[192px] p-3"
                                  scrollBar={
                                    <ScrollBar
                                      className="w-4 p-1"
                                      thumbClassName="bg-white/20"
                                    />
                                  }
                                >
                                  <div className="space-y-3 pr-5">
                                    {Array(4)
                                      .fill(0)
                                      .map((_, i) => (
                                        <div
                                          key={i}
                                          className="flex items-center gap-x-[18px]"
                                        >
                                          <div className="flex items-center gap-x-2 flex-auto">
                                            <Avatar>
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Team member"
                                              />
                                              <AvatarFallback>U</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col flex-auto">
                                              <div className="flex items-center gap-x-0.5">
                                                <span className="text-xs leading-5 font-semibold text-white">
                                                  Sevil
                                                </span>
                                                <span className="text-[10px] leading-none font-light text-white">
                                                  @designsuperstar23
                                                </span>
                                              </div>
                                              <span className="text-[10px] font-light text-white">
                                                Full-stack Developer
                                              </span>
                                            </div>
                                          </div>
                                          <span className="text-sm font-semibold text-white leading-5">
                                            $75{" "}
                                            <span className="text-[10px] font-light leading-5">
                                              /hr
                                            </span>
                                          </span>
                                        </div>
                                      ))}
                                  </div>
                                </ScrollArea>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <FavoriteRoot
                            value={favoritedItems.has(String(project.id))}
                            onValueChange={async (pressed) => {
                              if (pressed) {
                                // ✅ Update UI immediately (optimistic update)
                                setFavoritedItems((prev) => {
                                  const next = new Set(prev)
                                  next.add(String(project.id))
                                  return next
                                })

                                // Then save to database
                                const result = await addFavorite({
                                  type: "project",
                                  itemId: String(project.id),
                                })

                                if (result) {
                                  console.log("✅ Added to favorites:", result)
                                } else {
                                  // ❌ Rollback if failed
                                  setFavoritedItems((prev) => {
                                    const next = new Set(prev)
                                    next.delete(String(project.id))
                                    return next
                                  })
                                  console.error("❌ Failed to add favorite")
                                }
                              } else {
                                // ✅ Update UI immediately (optimistic update)
                                setFavoritedItems((prev) => {
                                  const next = new Set(prev)
                                  next.delete(String(project.id))
                                  return next
                                })

                                // Then remove from database
                                const favorite = await findFavoriteByItemId(
                                  String(project.id)
                                )

                                if (favorite) {
                                  const success = await removeFavorite(
                                    favorite.id
                                  )

                                  if (!success) {
                                    // ❌ Rollback if failed
                                    setFavoritedItems((prev) => {
                                      const next = new Set(prev)
                                      next.add(String(project.id))
                                      return next
                                    })
                                    console.error(
                                      "❌ Failed to remove favorite"
                                    )
                                  } else {
                                    console.log("✅ Removed from favorites")
                                  }
                                }
                              }
                            }}
                          >
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
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="col-span-4 text-center py-12">
                      <p className="text-dark-blue-400">No projects found</p>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <div className="mt-[50px]">
            <Tabs defaultValue="Project Type">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Narrow Your Project Search
              </h1>
              <div className="mt-6 flex justify-between items-center">
                <TabsList className="flex items-center gap-x-3">
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Project Type">Project Type</TabsTrigger>
                  </Badge>
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Industry">Industry</TabsTrigger>
                  </Badge>
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Budget">Budget</TabsTrigger>
                  </Badge>
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Project Length">
                      Project Length
                    </TabsTrigger>
                  </Badge>
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500"
                    asChild
                  >
                    <TabsTrigger value="Team Size">Team Size</TabsTrigger>
                  </Badge>
                </TabsList>

                <Button size="lg" variant="link" visual="gray">
                  Advanced Filters
                  <ArrowRight className="size-[15px]" />
                </Button>
              </div>

              <div className="mt-6">
                <TabsContent
                  className="grid grid-cols-5 gap-[15px]"
                  value="Project Type"
                >
                  <article className="h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                    Agriculture
                  </article>
                  <article className="h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                    Oil & Gas
                  </article>
                  <article className="h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                    Manufacturing
                  </article>
                  <article className="h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                    Construction
                  </article>
                  <article className="h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                    Utilities
                  </article>
                  <article className="h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                    Retail & Wholesale
                  </article>
                  <article className="h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                    Transportation
                  </article>
                  <article className="h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                    Finance & Banking
                  </article>
                  <article className="h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                    Real Estate
                  </article>
                  <article className="h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                    Healthcare
                  </article>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <div className="mt-[50px]">
            <div className="flex items-center justify-between">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Browse by Skills
              </h1>

              <div className="flex items-center gap-x-3">
                <IconButton
                  className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                  visual="gray"
                  variant="outlined"
                >
                  <ChevronLeft className="size-[18px]" />
                </IconButton>
                <IconButton
                  className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                  visual="gray"
                  variant="outlined"
                  data-state="active"
                >
                  <ChevronRight className="size-[18px]" />
                </IconButton>
              </div>
            </div>

            <div className="mt-6 flex items-center flex-wrap gap-3">
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700"
              >
                Project Length
              </Badge>
              <Badge
                variant="circular"
                visual="gray"
                size="lg"
                className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700"
              >
                Project Length
              </Badge>
            </div>
          </div>

          <div className="relative overflow-hidden h-[298px] mt-[50px] p-[50px] rounded-lg">
            <NextImage
              className="object-cover"
              src="/vr-4.png"
              sizes="100vw"
              fill
            />
            <div className="absolute inset-0 bg-black/40 p-[50px]">
              <div className="max-w-[595px]">
                <h1 className="text-white text-4xl font-bold leading-none">
                  The Future is Web3
                </h1>

                <p className="text-xl mt-2 font-light leading-none text-white">
                  Find talented developers and exciting projects in the
                  decentralized space.
                </p>

                <Button
                  className="rounded-full bg-white text-dark-blue-400 mt-[50px]"
                  size="lg"
                >
                  Explore more <ArrowRight className="size-[15px]" />
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-[50px]">
            <Tabs defaultValue="Back-End Development">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Recommended {currentName} Projects
              </h1>
              <div className="mt-6 flex justify-between items-center">
                <TabsList className="flex items-center gap-x-3">
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Back-End Development">
                      Back-End Development
                    </TabsTrigger>
                  </Badge>
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Blockchain">Blockchain</TabsTrigger>
                  </Badge>
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Data Structure & Algorithms">
                      Data Structure & Algorithms
                    </TabsTrigger>
                  </Badge>
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Cloud Computing">
                      Cloud Computing
                    </TabsTrigger>
                  </Badge>
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Front-End Development">
                      Front-End Development
                    </TabsTrigger>
                  </Badge>
                </TabsList>

                <div className="flex items-center gap-x-3">
                  <IconButton
                    className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                    visual="gray"
                    variant="outlined"
                  >
                    <ChevronLeft className="size-[18px]" />
                  </IconButton>
                  <IconButton
                    className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                    visual="gray"
                    variant="outlined"
                    data-state="active"
                  >
                    <ChevronRight className="size-[18px]" />
                  </IconButton>
                </div>
              </div>

              <div className="mt-6">
                <TabsContent
                  value="Back-End Development"
                  className="gap-5 grid grid-cols-4"
                >
                  <article className="py-[50px] bg-warning-600 flex flex-col items-start justify-end px-6">
                    <h1 className="text-[28px] font-bold leading-none text-white">
                      Back-End Development Projects
                    </h1>
                    <p className="mt-3 text-lg font-light leading-none text-white">
                      Discover high-quality back-end development projects ready
                      to launch.
                    </p>
                    <Button
                      className="rounded-full bg-white text-warning-700 mt-8"
                      size="lg"
                    >
                      Explore more <ArrowRight className="size-[15px]" />
                    </Button>
                  </article>
                  {Array(3)
                    .fill(0)
                    .map((_, index) => (
                      <article
                        key={index}
                        className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] flex flex-col"
                      >
                        <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                          <NextImage
                            className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                            src="/dashboard.png"
                            alt="Dashboard"
                            fill
                            sizes="33vw"
                          />
                        </div>

                        <div className="mt-3 flex items-start gap-x-3">
                          <NextLink
                            href="#"
                            className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                          >
                            The Ultimate Mobile App Experience
                          </NextLink>

                          <div className="inline-flex items-center gap-x-1">
                            <Star className="size-[15px] text-primary-500 fill-primary-500" />
                            <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                              4.9 <span className="font-extralight">(5)</span>
                            </span>
                          </div>
                        </div>

                        <p className="mt-3 text-sm leading-[1.4] font-extralight text-dark-blue-400 line-clamp-3">
                          Brief Description of the project. Lorem ipsum dolor
                          sit amet, consectetur adipiscing elit, sed do eiusmod
                          tempor incididunt.
                        </p>

                        <div className="mt-[14.5px] flex flex-col gap-y-3">
                          <div className="flex items-center gap-x-[6.4px]">
                            <Clock className="size-[18px] shrink-0 text-primary-500" />

                            <span className="font-medium text-sm leading-none text-dark-blue-400">
                              Starting from 12 weeks
                            </span>
                          </div>

                          <div className="flex items-center gap-x-[6.4px]">
                            <Money className="size-[18px] shrink-0 text-primary-500" />

                            <span className="font-medium text-sm leading-none text-dark-blue-400">
                              $50,000 budget
                            </span>
                          </div>
                        </div>

                        <div className="mt-auto pt-5 flex items-end justify-between">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AvatarGroup
                                  max={5}
                                  size="sm"
                                  excess
                                  excessClassName="border-gray-300 text-gray-500"
                                >
                                  <Avatar
                                    size="sm"
                                    className="border-2 border-white hover:ring-0 active:ring-0"
                                  >
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar
                                    size="sm"
                                    className="border-2 border-white hover:ring-0 active:ring-0"
                                  >
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar
                                    size="sm"
                                    className="border-2 border-white hover:ring-0 active:ring-0"
                                  >
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar
                                    size="sm"
                                    className="border-2 border-white hover:ring-0 active:ring-0"
                                  >
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar
                                    size="sm"
                                    className="border-2 border-white hover:ring-0 active:ring-0"
                                  >
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar
                                    size="sm"
                                    className="border-2 border-white hover:ring-0 active:ring-0"
                                  >
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                </AvatarGroup>
                              </TooltipTrigger>

                              <TooltipContent
                                className="p-0 max-w-[262px]"
                                size="md"
                              >
                                <ScrollArea
                                  className="h-[192px] p-3"
                                  scrollBar={
                                    <ScrollBar
                                      className="w-4 p-1"
                                      thumbClassName="bg-white/20"
                                    />
                                  }
                                >
                                  <div className="space-y-3 pr-5">
                                    <div className="flex items-center gap-x-[18px]">
                                      <div className="flex items-center gap-x-2 flex-auto">
                                        <Avatar>
                                          <AvatarImage
                                            src="/woman.jpg"
                                            alt="Woman"
                                          />
                                          <AvatarFallback>W</AvatarFallback>
                                        </Avatar>

                                        <div className="flex flex-col flex-auto">
                                          <div className="flex items-center gap-x-0.5">
                                            <span className="text-xs leading-5 font-semibold text-white">
                                              Sevil
                                            </span>
                                            <span className="text-[10px] leading-none font-light text-white">
                                              @designsuperstar23
                                            </span>
                                          </div>
                                          <span className="text-[10px] font-light text-white">
                                            Full-stack Developer
                                          </span>
                                        </div>
                                      </div>

                                      <span className="text-sm font-semibold text-white leading-5">
                                        $75{" "}
                                        <span className="text-[10px] font-light leading-5">
                                          /hr
                                        </span>
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-x-[18px]">
                                      <div className="flex items-center gap-x-2 flex-auto">
                                        <Avatar>
                                          <AvatarImage
                                            src="/woman.jpg"
                                            alt="Woman"
                                          />
                                          <AvatarFallback>W</AvatarFallback>
                                        </Avatar>

                                        <div className="flex flex-col flex-auto">
                                          <div className="flex items-center gap-x-0.5">
                                            <span className="text-xs leading-5 font-semibold text-white">
                                              Sevil
                                            </span>
                                            <span className="text-[10px] leading-none font-light text-white">
                                              @designsuperstar23
                                            </span>
                                          </div>
                                          <span className="text-[10px] font-light text-white">
                                            Full-stack Developer
                                          </span>
                                        </div>
                                      </div>

                                      <span className="text-sm font-semibold text-white leading-5">
                                        $75{" "}
                                        <span className="text-[10px] font-light leading-5">
                                          /hr
                                        </span>
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-x-[18px]">
                                      <div className="flex items-center gap-x-2 flex-auto">
                                        <Avatar>
                                          <AvatarImage
                                            src="/woman.jpg"
                                            alt="Woman"
                                          />
                                          <AvatarFallback>W</AvatarFallback>
                                        </Avatar>

                                        <div className="flex flex-col flex-auto">
                                          <div className="flex items-center gap-x-0.5">
                                            <span className="text-xs leading-5 font-semibold text-white">
                                              Sevil
                                            </span>
                                            <span className="text-[10px] leading-none font-light text-white">
                                              @designsuperstar23
                                            </span>
                                          </div>
                                          <span className="text-[10px] font-light text-white">
                                            Full-stack Developer
                                          </span>
                                        </div>
                                      </div>

                                      <span className="text-sm font-semibold text-white leading-5">
                                        $75{" "}
                                        <span className="text-[10px] font-light leading-5">
                                          /hr
                                        </span>
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-x-[18px]">
                                      <div className="flex items-center gap-x-2 flex-auto">
                                        <Avatar>
                                          <AvatarImage
                                            src="/woman.jpg"
                                            alt="Woman"
                                          />
                                          <AvatarFallback>W</AvatarFallback>
                                        </Avatar>

                                        <div className="flex flex-col flex-auto">
                                          <div className="flex items-center gap-x-0.5">
                                            <span className="text-xs leading-5 font-semibold text-white">
                                              Sevil
                                            </span>
                                            <span className="text-[10px] leading-none font-light text-white">
                                              @designsuperstar23
                                            </span>
                                          </div>
                                          <span className="text-[10px] font-light text-white">
                                            Full-stack Developer
                                          </span>
                                        </div>
                                      </div>

                                      <span className="text-sm font-semibold text-white leading-5">
                                        $75{" "}
                                        <span className="text-[10px] font-light leading-5">
                                          /hr
                                        </span>
                                      </span>
                                    </div>
                                  </div>
                                </ScrollArea>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

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
                        </div>
                      </article>
                    ))}
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <div className="mt-[50px]">
            <div className="flex items-center justify-between">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Browse by Technology
              </h1>

              <Button size="lg" variant="link" visual="gray">
                View All technologies <ArrowRight className="size-[15px]" />
              </Button>
            </div>

            <div className="gap-[15px] mt-6 grid grid-cols-6">
              <article className="h-[80px] flex flex-col items-center gap-y-0.5 px-[20px] bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] justify-center rounded-lg border-gray-200">
                <div className="size-8 bg-gray-100 shrink-0" />
                <h1 className="text-xs font-medium leading-none text-dark-blue-400">
                  Dreamweaver
                </h1>
              </article>
              <article className="h-[80px] flex flex-col items-center gap-y-0.5 px-[20px] bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] justify-center rounded-lg border-gray-200">
                <div className="size-8 bg-gray-100 shrink-0" />
                <h1 className="text-xs font-medium leading-none text-dark-blue-400">
                  Dreamweaver
                </h1>
              </article>
              <article className="h-[80px] flex flex-col items-center gap-y-0.5 px-[20px] bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] justify-center rounded-lg border-gray-200">
                <div className="size-8 bg-gray-100 shrink-0" />
                <h1 className="text-xs font-medium leading-none text-dark-blue-400">
                  Dreamweaver
                </h1>
              </article>
              <article className="h-[80px] flex flex-col items-center gap-y-0.5 px-[20px] bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] justify-center rounded-lg border-gray-200">
                <div className="size-8 bg-gray-100 shrink-0" />
                <h1 className="text-xs font-medium leading-none text-dark-blue-400">
                  Dreamweaver
                </h1>
              </article>
              <article className="h-[80px] flex flex-col items-center gap-y-0.5 px-[20px] bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] justify-center rounded-lg border-gray-200">
                <div className="size-8 bg-gray-100 shrink-0" />
                <h1 className="text-xs font-medium leading-none text-dark-blue-400">
                  Dreamweaver
                </h1>
              </article>
              <article className="h-[80px] flex flex-col items-center gap-y-0.5 px-[20px] bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] justify-center rounded-lg border-gray-200">
                <div className="size-8 bg-gray-100 shrink-0" />
                <h1 className="text-xs font-medium leading-none text-dark-blue-400">
                  Dreamweaver
                </h1>
              </article>
              <article className="h-[80px] flex flex-col items-center gap-y-0.5 px-[20px] bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] justify-center rounded-lg border-gray-200">
                <div className="size-8 bg-gray-100 shrink-0" />
                <h1 className="text-xs font-medium leading-none text-dark-blue-400">
                  Dreamweaver
                </h1>
              </article>
              <article className="h-[80px] flex flex-col items-center gap-y-0.5 px-[20px] bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] justify-center rounded-lg border-gray-200">
                <div className="size-8 bg-gray-100 shrink-0" />
                <h1 className="text-xs font-medium leading-none text-dark-blue-400">
                  Dreamweaver
                </h1>
              </article>
            </div>
          </div>

          <div className="mt-[50px]">
            <div className="flex justify-between items-center">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Guides Related to {currentName}
              </h1>

              <Button size="lg" variant="link" visual="gray">
                Visit the Blog <ArrowRight className="size-[15px]" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-x-8 mt-6">
              <div className="flex flex-col gap-y-8">
                <article className="flex gap-x-6">
                  <div className="relative w-[238px] overflow-hidden rounded-lg shrink-0">
                    <NextImage
                      className="object-cover"
                      sizes="25vw"
                      fill
                      src="/artificial-hand.jpeg"
                    />
                  </div>
                  <div className="py-3">
                    <span className="text-xs font-medium leading-none text-dark-blue-400">
                      Software Testing
                    </span>
                    <h1 className="mt-2 text-lg font-bold leading-none text-dark-blue-400">
                      The Art of Software Testing: A Comprehensive Guide
                    </h1>
                    <p className="mt-2 text-sm leading-none font-light text-dark-blue-400">
                      A few sentences about the content of the article. A few
                      sentences about the content of the article. A few
                      sentences about the content of the article. A few
                      sentences about the content of the article.
                    </p>
                    <p className="mt-2 text-sm font-medium leading-none text-dark-blue-400">
                      10 min read
                    </p>

                    <Button
                      className="text-dark-blue-400 mt-3"
                      size="md"
                      variant="link"
                      visual="gray"
                    >
                      Read more <ArrowRight className="size-[15px]" />
                    </Button>
                  </div>
                </article>
                <article className="flex gap-x-6">
                  <div className="relative w-[238px] overflow-hidden rounded-lg shrink-0">
                    <NextImage
                      className="object-cover"
                      sizes="25vw"
                      fill
                      src="/artificial-hand.jpeg"
                    />
                  </div>
                  <div className="py-3">
                    <span className="text-xs font-medium leading-none text-dark-blue-400">
                      Software Testing
                    </span>
                    <h1 className="mt-2 text-lg font-bold leading-none text-dark-blue-400">
                      The Art of Software Testing: A Comprehensive Guide
                    </h1>
                    <p className="mt-2 text-sm leading-none font-light text-dark-blue-400">
                      A few sentences about the content of the article. A few
                      sentences about the content of the article. A few
                      sentences about the content of the article. A few
                      sentences about the content of the article.
                    </p>
                    <p className="mt-2 text-sm font-medium leading-none text-dark-blue-400">
                      10 min read
                    </p>

                    <Button
                      className="text-dark-blue-400 mt-3"
                      size="md"
                      variant="link"
                      visual="gray"
                    >
                      Read more <ArrowRight className="size-[15px]" />
                    </Button>
                  </div>
                </article>
              </div>
              <div className="rounded-lg overflow-hidden relative">
                <NextImage
                  className="object-cover"
                  src="/artificial-hand.jpeg"
                  sizes="50vw"
                  fill
                />
                <div className="p-[50px] absolute inset-0 flex flex-col justify-end">
                  <div className="p-8 rounded-lg bg-white">
                    <span className="text-xs font-medium leading-none text-dark-blue-400">
                      Software Testing
                    </span>
                    <h1 className="mt-2 text-lg font-bold leading-none text-dark-blue-400">
                      The Art of Software Testing: A Comprehensive Guide
                    </h1>
                    <p className="mt-2 text-sm leading-none font-light text-dark-blue-400">
                      A few sentences about the content of the article. A few
                      sentences about the content of the article. A few
                      sentences about the content of the article. A few
                      sentences about the content of the article.
                    </p>
                    <p className="mt-2 text-sm font-medium leading-none text-dark-blue-400">
                      10 min read
                    </p>

                    <Button
                      className="text-dark-blue-400 mt-3"
                      size="md"
                      variant="link"
                      visual="gray"
                    >
                      Read more <ArrowRight className="size-[15px]" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-[50px] bg-white border-t border-gray-200">
        <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
          More Ways to Explore
        </h1>
        <div className="mt-6">
          <div className="flex items-center gap-x-3">
            <Badge
              variant="circular"
              visual="gray"
              size="lg"
              className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500"
            >
              Related Categories
            </Badge>
            <Badge
              variant="circular"
              visual="gray"
              size="lg"
              className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500"
            >
              Related Searches
            </Badge>
            <Badge
              variant="circular"
              visual="gray"
              size="lg"
              className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500"
            >
              Trending Searches
            </Badge>
          </div>
        </div>

        <div className="mt-8 flex justify-between">
          {Array(4)
            .fill(0)
            .map((_, index) => (
              <div key={index} className="flex flex-col gap-y-3">
                <span className="text-lg font-bold leading-none text-dark-blue-400">
                  Blockchain
                </span>

                <Button size="lg" variant="link" className="text-dark-blue-400">
                  Lorem lipsum
                </Button>
                <Button size="lg" variant="link" className="text-dark-blue-400">
                  Lorem lipsum
                </Button>
                <Button size="lg" variant="link" className="text-dark-blue-400">
                  Lorem lipsum
                </Button>
                <Button size="lg" variant="link" className="text-dark-blue-400">
                  Lorem lipsum
                </Button>
                <Button size="lg" variant="link" className="text-dark-blue-400">
                  Lorem lipsum
                </Button>
                <Button size="lg" variant="link" className="text-dark-blue-400">
                  Lorem lipsum
                </Button>
                <Button size="lg" variant="link" className="text-dark-blue-400">
                  Lorem lipsum
                </Button>
                <Button size="lg" variant="link" className="text-dark-blue-400">
                  Lorem lipsum
                </Button>
                <Button size="lg" variant="link" className="text-dark-blue-400">
                  Lorem lipsum
                </Button>
              </div>
            ))}
        </div>
      </div>

      <div className="p-[50px] bg-primary-25">
        <h1 className="text-[28px] text-center text-dark-blue-400 leading-none font-semibold">
          Stay Up to Date with Marketeq
        </h1>
        <p className="text-base text-center leading-5 mt-5 font-light text-dark-blue-400">
          Subscribe to our newsletter and get the latest updates.
        </p>

        <div className="mt-5 max-w-[506px] mx-auto">
          <div className="flex items-enter gap-x-3">
            <InputGroup fieldHeight={48} className="flex-auto">
              <Input
                className="h-12"
                type="email"
                placeholder="Email Address"
              />
              <InputLeftElement>
                <Mail className="text-gray-500 size-5" />
              </InputLeftElement>
            </InputGroup>
            <Button size="xl">Subscribe</Button>
          </div>

          <div className="mt-3 max-w-[346px] text-xs leading-[19px] text-center mx-auto">
            You may unsubscribe at any time. By signing up, you agree to
            Marketeq&apos;s <span className="underline">Privacy Policy</span>{" "}
            and <span className="underline">Terms of Use</span>.
          </div>
        </div>
      </div>
    </div>
  )
}
