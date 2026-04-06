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
import { ensureDevAuth } from "@/src/lib/api/dev-login"
import { buildProjectUrl, buildServiceUrl } from "@/src/lib/urlHelpers"
import { parseCategoryParams } from "@/src/lib/urlHelpers"
import { fromLength } from "@/utils/functions"
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home03,
  Mail,
  MarkerPin02,
  Star,
  Star01,
  Stars02,
} from "@blend-metrics/icons"
import { TabsList, TabsTrigger } from "@radix-ui/react-tabs"
import { Tabs, TabsContent } from "@/components/ui"
import { SwiperSlide } from "swiper/react"
import { Money } from "@/components/money"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import {
  SwiperContent,
  SwiperNextTrigger,
  SwiperPrevTrigger,
  SwiperRoot,
} from "@/components/swiper"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Badge,
  Button,
  DisclosureContent,
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
      { name: "Clinical Research", slug: "clinical-research", description: "Clinical trials, pharma research, and regulatory compliance." },
      { name: "Consumer Research", slug: "consumer-research", description: "Behavioral analysis, focus groups, and consumer sentiment." },
      { name: "Data Analysis", slug: "data-analysis", description: "Statistical analysis, data visualization, and reporting." },
      { name: "Competitive Intelligence", slug: "competitive-intelligence", description: "Competitor tracking, benchmarking, and strategic insights." },
      { name: "Survey Research", slug: "survey-research", description: "Survey design, distribution, response analysis, and insights." },
      { name: "Qualitative Research", slug: "qualitative-research", description: "In-depth interviews, focus groups, and ethnographic studies." },
      { name: "Sentiment Analysis", slug: "sentiment-analysis", description: "Brand monitoring, social listening, and NLP-powered analysis." },
      { name: "Industry Analysis", slug: "industry-analysis", description: "Industry benchmarking, KPI analysis, and market positioning." },
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
  design: {
    name: "Design",
    slug: "design",
    description: "Find world-class designers for branding, product, web, UX, illustration, and everything in between.",
    heroImage: "/coding.png",
    subcategories: [
      { name: "UI/UX Design", slug: "ui-ux-design", description: "User interface and experience design for web and mobile." },
      { name: "Web Design", slug: "web-design", description: "Landing pages, marketing sites, and full website design." },
      { name: "Product Design", slug: "product-design", description: "End-to-end digital product design and design systems." },
      { name: "Graphic Design", slug: "graphic-design", description: "Visual branding, print design, and marketing materials." },
      { name: "Brand Identity", slug: "brand-identity", description: "Logo design, brand guidelines, and visual systems." },
      { name: "Illustration", slug: "illustration", description: "Custom illustrations, icons, and digital art." },
      { name: "Motion Design", slug: "motion-design", description: "Animations, motion graphics, and video effects." },
      { name: "3D Design", slug: "3d-design", description: "3D modeling, rendering, and immersive visuals." },
      { name: "Packaging Design", slug: "packaging-design", description: "Product packaging, labels, and unboxing experiences." },
      { name: "Presentation Design", slug: "presentation-design", description: "Pitch decks, keynote slides, and investor presentations." },
      { name: "Print Design", slug: "print-design", description: "Brochures, posters, magazines, and print collateral." },
      { name: "Design Systems", slug: "design-systems", description: "Component libraries, tokens, and scalable UI foundations." },
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
  const [listingsProjects, setListingsProjects] = useState<any[]>([])
  const [listingsServices, setListingsServices] = useState<any[]>([])
  const [talentUsers, setTalentUsers] = useState<any[]>([])

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

  // Sort projects by featured status
  useEffect(() => {
    if (allProjects.length === 0) return
    const sorted = [...allProjects].sort((a: any, b: any) => {
      if (a.featured && !b.featured) return -1
      if (!a.featured && b.featured) return 1
      return 0
    })
    setDisplayedProjects(sorted)
  }, [allProjects])

  // Load favorites on page mount (ensure dev auth first)
  useEffect(() => {
    async function loadFavorites() {
      await ensureDevAuth()
      const favorites = await getAllFavorites()
      const itemIds = new Set(favorites.map((fav) => fav.itemId))
      setFavoritedItems(itemIds)
    }

    loadFavorites()
  }, [])

  // Helper to toggle favorites on any card
  const handleFavoriteToggle = async (itemId: string, type: "project" | "service" | "team" | "talent", newPressed: boolean) => {
    // Optimistic update — toggle immediately, persist in background
    if (newPressed) {
      setFavoritedItems((prev) => { const next = new Set(prev); next.add(itemId); return next })
      await addFavorite({ type, itemId })
    } else {
      setFavoritedItems((prev) => { const next = new Set(prev); next.delete(itemId); return next })
      const fav = await findFavoriteByItemId(itemId)
      if (fav) await removeFavorite(fav.id)
    }
  }

  // Fetch real projects and services from listings-service via gateway
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
  useEffect(() => {
    async function fetchListings() {
      try {
        const [projRes, svcRes] = await Promise.all([
          fetch(`${apiBase}/v1/projects`).catch(() => null),
          fetch(`${apiBase}/v1/services`).catch(() => null),
        ])
        if (projRes?.ok) {
          const projects = await projRes.json()
          const filtered = l1
            ? projects.filter((p: any) => p.category === l1)
            : projects
          setListingsProjects(filtered.length > 0 ? filtered : projects)
        }
        if (svcRes?.ok) {
          const services = await svcRes.json()
          const filtered = l1
            ? services.filter((s: any) => s.category === l1)
            : services
          setListingsServices(filtered.length > 0 ? filtered : services)
        }
        // Fetch talent users for avatar display
        const usersRes = await fetch(`${apiBase}/v1/users`).catch(() => null)
        if (usersRes?.ok) {
          const users = await usersRes.json()
          const talent = users.filter((u: any) => u.userType === "talent" && u.avatarUrl)
          setTalentUsers(talent.length > 0 ? talent : users.slice(0, 10))
        }
      } catch {
        // Services unavailable — cards will use placeholder data
      }
    }

    fetchListings()
  }, [l1])

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
                  className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                  visual="gray"
                  variant="outlined"
                >
                  <ChevronLeft className="size-[18px]" />
                </IconButton>
                <IconButton
                  className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                  visual="gray"
                  variant="outlined"
                  data-state="active"
                >
                  <ChevronRight className="size-[18px]" />
                </IconButton>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
              <div className={`grid gap-[15px] ${l2 ? "grid-rows-1" : "grid-rows-2"} grid-flow-col`} style={{ gridAutoColumns: "calc((100% - 60px) / 5)" }}>
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
                  <div className="text-center py-8 text-gray-500 w-full">
                    No subcategories available
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recommended in {Category} — Swiper carousel with entity tabs */}
          <div className="mt-[50px]">
            <Tabs defaultValue="Projects">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Recommended in {currentName}
              </h1>
              <SwiperRoot>
                <div className="mt-6 flex justify-between items-center">
                  <TabsList className="flex items-center gap-x-3">
                    {["Projects", "Services", "Teams", "Talent"].map((tab) => (
                      <Badge
                        key={tab}
                        variant="circular"
                        visual="gray"
                        size="lg"
                        className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                        asChild
                      >
                        <TabsTrigger value={tab}>{tab}</TabsTrigger>
                      </Badge>
                    ))}
                  </TabsList>

                  <div className="flex items-center gap-x-3">
                    <SwiperPrevTrigger asChild>
                      <IconButton
                        className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                        visual="gray"
                        variant="outlined"
                      >
                        <ChevronLeft className="size-[18px]" />
                      </IconButton>
                    </SwiperPrevTrigger>
                    <SwiperNextTrigger asChild>
                      <IconButton
                        className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                        visual="gray"
                        variant="outlined"
                      >
                        <ChevronRight className="size-[18px]" />
                      </IconButton>
                    </SwiperNextTrigger>
                  </div>
                </div>

                <div className="mt-6">
                  <TabsContent className="gap-5 flex items-center" value="Projects">
                    <SwiperContent slidesPerView="auto" spaceBetween={20}>
                      {(listingsProjects.length > 0
                        ? listingsProjects.slice(0, 8)
                        : displayedProjects.length > 0
                          ? displayedProjects.slice(0, 6)
                          : fromLength(6)
                      ).map((item: any, idx: number) => {
                        const project = (listingsProjects.length > 0 || displayedProjects.length > 0) ? item : null
                        const key = project?.id ?? idx
                        return (
                          <SwiperSlide className="w-[355px]" key={key}>
                            <NextLink href={project ? buildProjectUrl(l1Meta.slug, project.slug, project.id) : `/c/${l1Meta.slug}/projects`} className="block focus-visible:outline-none">
                            <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                              <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border cursor-pointer border-black/15">
                                <NextImage
                                  className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                  src={project?.mediaUrls?.[0] || project?.coverImage || project?.thumbnail || "/dashboard.png"}
                                  alt={project?.title || "Project"}
                                  fill
                                  sizes="33vw"
                                />
                              </div>

                              <div className="mt-3 flex items-start gap-x-3">
                                <span className="font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline">
                                  {project?.title || "The Ultimate Mobile App Experience"}
                                </span>
                                <div className="inline-flex items-center gap-x-1">
                                  <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                  <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                    {project?.rating || "4.9"}{" "}
                                    <span className="font-extralight">({project?.reviewCount || 5})</span>
                                  </span>
                                </div>
                              </div>

                              <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400 line-clamp-2">
                                {project?.summary || project?.description?.slice(0, 120) || "Brief Description of the project. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt."}
                              </p>

                              <div className="mt-[14.5px] flex flex-col gap-y-3">
                                <div className="flex items-center gap-x-[6.4px]">
                                  <Clock className="size-[18px] shrink-0 text-primary-500" />
                                  <span className="font-medium text-sm leading-none text-dark-blue-400">
                                    Starting from {project?.duration || "12 weeks"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-x-[6.4px]">
                                  <Money className="size-[18px] shrink-0 text-primary-500" />
                                  <span className="font-medium text-sm leading-none text-dark-blue-400">
                                    ${project?.budget ? Number(project.budget).toLocaleString() : project?.scopeTotal?.budget || "50,000"} budget
                                  </span>
                                </div>
                              </div>

                              <div className="mt-5 flex items-end justify-between">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AvatarGroup max={5} size="sm" excess excessClassName="border-gray-300 text-gray-500">
                                        {fromLength(6).map((k) => (
                                          <Avatar key={k} size="sm" className="border-2 border-white hover:ring-0 active:ring-0">
                                            <AvatarImage src="/woman.jpg" alt="Woman" />
                                            <AvatarFallback>W</AvatarFallback>
                                          </Avatar>
                                        ))}
                                      </AvatarGroup>
                                    </TooltipTrigger>
                                    <TooltipContent className="p-0 max-w-[262px]" size="md">
                                      <ScrollArea className="h-[192px] p-3" scrollBar={<ScrollBar className="w-4 p-1" thumbClassName="bg-white/20" />}>
                                        <div className="space-y-3 pr-5">
                                          {fromLength(4).map((k) => (
                                            <div key={k} className="flex items-center gap-x-[18px]">
                                              <div className="flex items-center gap-x-2 flex-auto">
                                                <Avatar>
                                                  <AvatarImage src="/woman.jpg" alt="Woman" />
                                                  <AvatarFallback>W</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col flex-auto">
                                                  <div className="flex items-center gap-x-0.5">
                                                    <span className="text-xs leading-5 font-semibold text-white">Sevil</span>
                                                    <span className="text-[10px] leading-none font-light text-white">@designsuperstar23</span>
                                                  </div>
                                                  <span className="text-[10px] font-light text-white">Full-stack Developer</span>
                                                </div>
                                              </div>
                                              <span className="text-sm font-semibold text-white leading-5">$75 <span className="text-[10px] font-light leading-5">/hr</span></span>
                                            </div>
                                          ))}
                                        </div>
                                      </ScrollArea>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <FavoriteRoot
                                  value={project ? favoritedItems.has(String(project.id)) : false}
                                  onValueChange={project ? async (pressed) => {
                                    if (pressed) {
                                      setFavoritedItems((prev) => { const next = new Set(prev); next.add(String(project.id)); return next })
                                      const result = await addFavorite({ type: "project", itemId: String(project.id) })
                                      if (!result) setFavoritedItems((prev) => { const next = new Set(prev); next.delete(String(project.id)); return next })
                                    } else {
                                      setFavoritedItems((prev) => { const next = new Set(prev); next.delete(String(project.id)); return next })
                                      const fav = await findFavoriteByItemId(String(project.id))
                                      if (fav) { const ok = await removeFavorite(fav.id); if (!ok) setFavoritedItems((prev) => { const next = new Set(prev); next.add(String(project.id)); return next }) }
                                    }
                                  } : undefined}
                                >
                                  {({ pressed }) => (
                                    <TooltipProvider delayDuration={75}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="inline-block"><Favorite /></span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {pressed ? (<span className="inline-flex items-center gap-x-1"><Check className="size-[15px] shrink-0 text-green-500" />Saved</span>) : "Save to favorites"}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </FavoriteRoot>
                              </div>
                            </article>
                            </NextLink>
                          </SwiperSlide>
                        )
                      })}
                    </SwiperContent>
                  </TabsContent>

                  <TabsContent className="gap-5 flex items-center" value="Services">
                    <SwiperContent slidesPerView="auto" spaceBetween={20}>
                      {(listingsServices.length > 0
                        ? listingsServices.slice(0, 8)
                        : fromLength(8)
                      ).map((item: any, idx: number) => {
                        const service = listingsServices.length > 0 ? item : null
                        const key = service?.id ?? idx
                        return (
                        <SwiperSlide className="w-[355px]" key={key}>
                          <NextLink href={service ? buildServiceUrl(l1Meta.slug, service.slug, service.id) : `/c/${l1Meta.slug}/services`} className="block focus-visible:outline-none">
                          <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                            <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15 cursor-pointer">
                              <NextImage className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]" src={service?.mediaUrls?.[0] || "/dashboard.png"} alt={service?.title || "Service"} fill sizes="33vw" />
                            </div>
                            <div className="mt-3 flex items-start gap-x-3">
                              <span className="font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline">{service?.title || `Professional ${currentName} Service`}</span>
                              <div className="inline-flex items-center gap-x-1">
                                <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">4.9 <span className="font-extralight">(5)</span></span>
                              </div>
                            </div>
                            <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400 line-clamp-2">{service?.description?.slice(0, 120) || `Professional service offering for ${currentName}. Expert team ready to deliver results.`}</p>
                            <div className="mt-[14.5px] flex flex-col gap-y-3">
                              <div className="flex items-center gap-x-[6.4px]"><Clock className="size-[18px] shrink-0 text-primary-500" /><span className="font-medium text-sm leading-none text-dark-blue-400">{service?.deliveryTime || "Monthly"}</span></div>
                              <div className="flex items-center gap-x-[6.4px]"><Money className="size-[18px] shrink-0 text-primary-500" /><span className="font-medium text-sm leading-none text-dark-blue-400">${service?.priceMin ? `${Number(service.priceMin).toLocaleString()} - $${Number(service.priceMax).toLocaleString()}` : "5,000 - $15,000"}/month</span></div>
                            </div>
                            <div className="mt-5 flex items-end justify-between">
                              <AvatarGroup max={5} size="sm" excess excessClassName="border-gray-300 text-gray-500">
                                {(talentUsers.length > 0 ? talentUsers.slice(0, 4) : fromLength(4)).map((u: any, k: number) => (<Avatar key={u?.id ?? k} size="sm" className="border-2 border-white hover:ring-0 active:ring-0"><AvatarImage src={u?.avatarUrl || "/woman.jpg"} alt={u?.firstName || "Team"} /><AvatarFallback>{u?.firstName?.[0] || "T"}</AvatarFallback></Avatar>))}
                              </AvatarGroup>
                              {service && <FavoriteRoot value={favoritedItems.has(String(service.id))} onValueChange={(pressed) => handleFavoriteToggle(String(service.id), "service", pressed)}>{({ pressed }) => (<TooltipProvider delayDuration={75}><Tooltip><TooltipTrigger asChild><span className="inline-block"><Favorite /></span></TooltipTrigger><TooltipContent>{pressed ? (<span className="inline-flex items-center gap-x-1"><Check className="size-[15px] shrink-0 text-green-500" />Saved</span>) : "Save to favorites"}</TooltipContent></Tooltip></TooltipProvider>)}</FavoriteRoot>}
                            </div>
                          </article>
                          </NextLink>
                        </SwiperSlide>
                        )
                      })}
                    </SwiperContent>
                  </TabsContent>

                  <TabsContent className="gap-5 flex items-center" value="Teams">
                    <SwiperContent slidesPerView="auto" spaceBetween={20}>
                      {fromLength(8).map((key) => (
                        <SwiperSlide className="w-[355px]" key={key}>
                          <article className="p-5 border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] rounded-lg bg-white">
                            <div className="flex items-start justify-between">
                              <AvatarGroup max={3} size="md" excess excessClassName="border-gray-300 text-gray-500">
                                {fromLength(6).map((k) => (<Avatar key={k} size="md" className="border-2 border-white hover:ring-0 active:ring-0"><AvatarImage src="/woman.jpg" alt="Team member" /><AvatarFallback>T</AvatarFallback></Avatar>))}
                              </AvatarGroup>
                              <FavoriteRoot>{({ pressed }) => (<TooltipProvider delayDuration={75}><Tooltip><TooltipTrigger asChild><span className="inline-block"><Favorite /></span></TooltipTrigger><TooltipContent>{pressed ? (<span className="inline-flex items-center gap-x-1"><Check className="size-[15px] shrink-0 text-green-500" />Saved</span>) : "Save to favorites"}</TooltipContent></Tooltip></TooltipProvider>)}</FavoriteRoot>
                            </div>
                            <div className="mt-5 flex items-center">
                              <span className="text-sm font-bold text-dark-blue-400 leading-none">$85 - $120</span>
                              <span className="text-[10px] text-dark-blue-400 leading-none font-light">/hr</span>
                            </div>
                            <div className="mt-5">
                              <h1 className="text-base leading-none text-dark-blue-400 font-bold">Team Name <span className="font-light text-gray-500">@Tech Sentinel</span></h1>
                              <h3 className="mt-0.5 text-xs font-medium text-dark-blue-400 leading-none">{currentName} team</h3>
                              <p className="mt-2 text-[11px] font-light leading-none text-dark-blue-400">Average 10 years of experience</p>
                              <div className="mt-3.5 flex items-center gap-x-1">
                                <MarkerPin02 className="size-3 text-gray-500" />
                                <span className="leading-4 text-[10px] font-medium text-gray-500">UK, USA, Brazil, Philippines, more...</span>
                              </div>
                              <div className="mt-3.5 flex items-center gap-x-2">
                                <div className="flex items-center gap-x-2">
                                  <div className="flex items-center gap-x-[5px] py-[3px] px-1.5 rounded-[3.03px] bg-gray-50 shadow-[0px_0.57px_1.14px_0px_rgba(16,24,40,.05)]">
                                    <div className="flex items-center gap-x-[3px]">
                                      {fromLength(5).map((k) => (<Star key={k} className="size-3 text-primary-500 fill-primary-500 shrink-0" />))}
                                    </div>
                                  </div>
                                  <span className="text-xs font-semibold leading-none text-dark-blue-400">4.7</span>
                                </div>
                                <span className="text-xs font-semibold leading-none text-dark-blue-400">2 Projects</span>
                              </div>
                              <div className="mt-5 flex gap-2 flex-wrap">
                                <Badge className="bg-transparent" visual="gray">React</Badge>
                                <Badge className="bg-transparent" visual="gray">Node.js</Badge>
                                <Badge className="bg-transparent" visual="gray">AWS</Badge>
                              </div>
                            </div>
                          </article>
                        </SwiperSlide>
                      ))}
                    </SwiperContent>
                  </TabsContent>

                  <TabsContent className="gap-5 flex items-center" value="Talent">
                    <SwiperContent slidesPerView="auto" spaceBetween={20}>
                      {(talentUsers.length > 0 ? talentUsers.slice(0, 8) : fromLength(8)).map((item: any, idx: number) => {
                        const u = talentUsers.length > 0 ? item : null
                        return (
                        <SwiperSlide className="w-[355px]" key={u?.id ?? idx}>
                          <article className="bg-white border rounded-[6px] border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                            <div className="p-5">
                              <div className="relative">
                                <NextLink href={u?.username ? `/talent-profile?username=${u.username}` : "#"}>
                                  <div className="relative h-[140px] overflow-hidden rounded-[6px] group cursor-pointer">
                                    <NextImage src={u?.avatarUrl || "/man.jpg"} sizes="25vw" fill className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]" />
                                  </div>
                                </NextLink>
                                <div className="flex items-center absolute px-2.5 pt-2.5 justify-between top-0 inset-x-0">
                                  {idx % 5 === 0 && (
                                  <div className="font-bold rounded-[5px] py-0.5 px-1.5 bg-black/[.57] inline-flex items-center gap-x-1 text-white text-[10px]">
                                    <Stars02 /> All Stars
                                  </div>
                                  )}
                                  {idx % 5 !== 0 && <div />}
                                  <FavoriteRoot>{({ pressed }) => (<TooltipProvider delayDuration={75}><Tooltip><TooltipTrigger asChild><span className="inline-block"><Favorite /></span></TooltipTrigger><TooltipContent>{pressed ? (<span className="inline-flex items-center gap-x-1"><Check className="size-[15px] shrink-0 text-green-500" />Saved</span>) : "Save to favorites"}</TooltipContent></Tooltip></TooltipProvider>)}</FavoriteRoot>
                                </div>
                                <div className="absolute grid rounded-full shrink-0 border-[2.53px] bg-white size-[29.53px] -left-[7px] -bottom-1 border-white">
                                  <div className="bg-success-500 flex items-center justify-center rounded-full text-white">
                                    <Check className="size-[13.97px]" />
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3">
                                <h1 className="text-sm font-bold leading-none text-dark-blue-400">
                                  {u?.rateMin ? `$${u.rateMin}` : "$85"} - {u?.rateMax ? `$${u.rateMax}` : "$120"}
                                  <span className="text-[10px] leading-none font-light">/hr</span>
                                </h1>
                                <NextLink href={u?.username ? `/talent-profile?username=${u.username}` : "#"} className="text-sm mt-3 font-bold leading-none text-dark-blue-400 hover:underline block transition-colors duration-300">
                                  {u?.firstName || "Ngozi"}{" "}
                                  <span className="text-[12px] text-gray-500 leading-none font-light">@{u?.username || "BlueberryBelle"}</span>
                                </NextLink>
                                <h2 className="text-[12px] text-dark-blue-400 leading-none font-medium mt-0.5">{u?.jobTitles?.[0]?.jobTitle || u?.role || "Marketing Technologist"}</h2>
                                <p className="text-[11px] text-dark-blue-400 leading-none font-light mt-2">5 years of experience</p>
                                <div className="flex items-center text-gray-500 gap-x-1 mt-3.5">
                                  <MarkerPin02 className="size-3" />
                                  <p className="text-[10px] leading-5 font-semibold">
                                    {u?.location || "Australia"}{" "}
                                    <span className="font-light">(7:30pm local time)</span>
                                  </p>
                                </div>
                                <div className="mt-3.5 flex items-center gap-x-2">
                                  <div className="flex items-center gap-x-2">
                                    <div className="flex items-center gap-x-[5px] py-[3px] px-1.5 rounded-[3.03px] bg-gray-50 shadow-[0px_0.57px_1.14px_0px_rgba(16,24,40,.05)]">
                                      <div className="flex items-center gap-x-[3px]">
                                        {fromLength(5).map((k) => (<Star key={k} className="size-3 text-primary-500 fill-primary-500 shrink-0" />))}
                                      </div>
                                      <span className="text-xs font-semibold leading-none text-dark-blue-400">4.7</span>
                                    </div>
                                  </div>
                                  <span className="text-xs font-semibold leading-none text-dark-blue-400">2 Projects</span>
                                </div>
                              </div>
                            </div>
                            <div className="relative p-3 border-t border-gray-200 bg-[#122A4B]/[.02] h-[92px] overflow-hidden">
                              <div className="flex flex-wrap gap-2 content-start h-full">
                                {(() => { const defaults = [{name:"AR/VR Design"},{name:"UX Research"},{name:"Prototyping"},{name:"Figma"},{name:"User Testing"},{name:"Wireframing"},{name:"Adobe XD"},{name:"Sketch"},{name:"InVision"},{name:"Miro"},{name:"Design Systems"},{name:"Interaction Design"}]; const real = u?.skills && u.skills.length > 0 ? u.skills : []; const padded = real.length >= 12 ? real.slice(0, 12) : [...real, ...defaults.filter(d => !real.some((r: any) => r.name === d.name)).slice(0, 12 - real.length)]; return padded; })().map((s: any, si: number) => (
                                  <NextLink key={si} href={`/search?skill=${encodeURIComponent(s.name)}`} className="text-gray-500/60 hover:text-gray-500 text-[12px] font-semibold hover:underline transition-colors duration-300">{s.name}</NextLink>
                                ))}
                              </div>
                              <NextLink href={u?.username ? `/talent-profile?username=${u.username}#skills` : "#"} className="absolute right-3 bottom-3 text-[12px] font-bold text-gray-500 hover:underline transition-colors duration-300 bg-[#122A4B]/[.02]">More...</NextLink>
                            </div>
                          </article>
                        </SwiperSlide>
                        )
                      })}
                    </SwiperContent>
                  </TabsContent>
                </div>
              </SwiperRoot>
            </Tabs>
          </div>

          {/* Top-Rated {Category} Projects — Swiper with subcategory tabs */}
          <div className="mt-[50px]">
            <Tabs defaultValue={subcategories[0]?.name || "All"}>
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Top-Rated {currentName} Projects
              </h1>
              <SwiperRoot>
                <div className="mt-6 flex justify-between items-center">
                  <TabsList className="flex items-center gap-x-3">
                    {(subcategories.length > 0 ? subcategories.slice(0, 5) : [{ name: "All" }]).map((sub: any) => (
                      <Badge
                        key={sub.name}
                        variant="circular"
                        visual="gray"
                        size="lg"
                        className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                        asChild
                      >
                        <TabsTrigger value={sub.name}>{sub.name}</TabsTrigger>
                      </Badge>
                    ))}
                  </TabsList>
                  <div className="flex items-center gap-x-3">
                    <SwiperPrevTrigger asChild>
                      <IconButton className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400" visual="gray" variant="outlined">
                        <ChevronLeft className="size-[18px]" />
                      </IconButton>
                    </SwiperPrevTrigger>
                    <SwiperNextTrigger asChild>
                      <IconButton className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400" visual="gray" variant="outlined">
                        <ChevronRight className="size-[18px]" />
                      </IconButton>
                    </SwiperNextTrigger>
                  </div>
                </div>

                <div className="mt-6">
                  <TabsContent value={subcategories[0]?.name || "All"}>
                    <SwiperContent slidesPerView="auto" spaceBetween={20}>
                      <SwiperSlide className="w-[355px] h-auto">
                        <article className="py-[50px] h-full rounded-lg bg-warning-600 flex flex-col items-start justify-end px-6">
                          <h1 className="text-[28px] font-bold leading-none text-white">
                            {subcategories[0]?.name || currentName} Projects
                          </h1>
                          <p className="mt-3 text-lg font-light leading-none text-white">
                            Discover high-quality {(subcategories[0]?.name || currentName).toLowerCase()} projects ready to launch.
                          </p>
                          <Button className="rounded-full duration-300 hover:gap-x-3.5 transition-[column-gap] bg-white hover:text-warning-800 hover:bg-white text-warning-700 mt-8" size="lg">
                            Explore More <ArrowRight className="size-[15px]" />
                          </Button>
                        </article>
                      </SwiperSlide>
                      {(listingsProjects.length > 0 ? listingsProjects.slice(0, 8) : fromLength(8)).map((item: any, idx: number) => {
                        const project = listingsProjects.length > 0 ? item : null
                        return (
                        <SwiperSlide key={project?.id ?? idx} className="w-[355px]">
                          <NextLink href={project ? buildProjectUrl(l1Meta.slug, project.slug, project.id) : `/c/${l1Meta.slug}/projects`} className="block focus-visible:outline-none">
                          <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                            <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15 cursor-pointer">
                              <NextImage className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]" src={project?.mediaUrls?.[0] || "/dashboard.png"} alt={project?.title || "Dashboard"} fill sizes="33vw" />
                            </div>
                            <div className="mt-3 flex items-start gap-x-3">
                              <span className="font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline">{project?.title || "The Ultimate Mobile App Experience"}</span>
                              <div className="inline-flex items-center gap-x-1">
                                <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">4.9 <span className="font-extralight">(5)</span></span>
                              </div>
                            </div>
                            <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">{project?.description?.slice(0, 140) || "Brief Description of the project. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt."}</p>
                            <div className="mt-[14.5px] flex flex-col gap-y-3">
                              <div className="flex items-center gap-x-[6.4px]"><Clock className="size-[18px] shrink-0 text-primary-500" /><span className="font-medium text-sm leading-none text-dark-blue-400">Starting from {project?.duration || "12 weeks"}</span></div>
                              <div className="flex items-center gap-x-[6.4px]"><Money className="size-[18px] shrink-0 text-primary-500" /><span className="font-medium text-sm leading-none text-dark-blue-400">${project?.budget ? Number(project.budget).toLocaleString() : "50,000"} budget</span></div>
                            </div>
                            <div className="mt-5 flex items-end justify-between">
                              <AvatarGroup max={5} size="sm" excess excessClassName="border-gray-300 text-gray-500">
                                {(talentUsers.length > 0 ? talentUsers.slice(0, 6) : fromLength(6)).map((u: any, k: number) => (<Avatar key={u?.id ?? k} size="sm" className="border-2 border-white hover:ring-0 active:ring-0"><AvatarImage src={u?.avatarUrl || "/woman.jpg"} alt={u?.firstName || "Team"} /><AvatarFallback>{u?.firstName?.[0] || "T"}</AvatarFallback></Avatar>))}
                              </AvatarGroup>
                              <FavoriteRoot>{({ pressed }) => (<TooltipProvider delayDuration={75}><Tooltip><TooltipTrigger asChild><span className="inline-block"><Favorite /></span></TooltipTrigger><TooltipContent>{pressed ? (<span className="inline-flex items-center gap-x-1"><Check className="size-[15px] shrink-0 text-green-500" />Saved</span>) : "Save to favorites"}</TooltipContent></Tooltip></TooltipProvider>)}</FavoriteRoot>
                            </div>
                          </article>
                          </NextLink>
                        </SwiperSlide>
                        )
                      })}
                    </SwiperContent>
                  </TabsContent>
                </div>
              </SwiperRoot>
            </Tabs>
          </div>

          {/* {Category} Teams — Swiper carousel with filter tabs */}
          <div className="mt-[50px]">
            <Tabs defaultValue="Featured">
              <h1 className="text-[28px] leading-none text-dark-blue-400 font-bold">
                {currentName} Teams
              </h1>
              <SwiperRoot>
                <div className="mt-6 flex justify-between items-center">
                  <TabsList className="flex items-center gap-x-3">
                    {["Featured", "Newest", "Most Popular", "Trending", "Top-Rated"].map((tab) => (
                      <Badge
                        key={tab}
                        variant="circular"
                        visual="gray"
                        size="lg"
                        className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                        asChild
                      >
                        <TabsTrigger value={tab}>{tab}</TabsTrigger>
                      </Badge>
                    ))}
                  </TabsList>
                  <div className="flex items-center gap-x-8">
                    <Button variant="link" visual="gray" size="lg" className="underline">Explore More Teams</Button>
                    <div className="flex items-center gap-x-3">
                      <SwiperPrevTrigger asChild><IconButton className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400" visual="gray" variant="outlined"><ChevronLeft className="size-[18px]" /></IconButton></SwiperPrevTrigger>
                      <SwiperNextTrigger asChild><IconButton className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400" visual="gray" variant="outlined"><ChevronRight className="size-[18px]" /></IconButton></SwiperNextTrigger>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <TabsContent value="Featured">
                    <SwiperContent slidesPerView="auto" spaceBetween={20}>
                      {fromLength(8).map((key) => (
                        <SwiperSlide className="w-[355px]" key={key}>
                          <article className="p-5 border border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] rounded-lg bg-white">
                            <div className="flex items-start justify-between">
                              <AvatarGroup max={3} size="md" excess excessClassName="border-gray-300 text-gray-500">
                                {fromLength(6).map((k) => (<Avatar key={k} size="md" className="border-2 border-white hover:ring-0 active:ring-0"><AvatarImage src="/woman.jpg" alt="Woman" /><AvatarFallback>W</AvatarFallback></Avatar>))}
                              </AvatarGroup>
                              <FavoriteRoot>{({ pressed }) => (<TooltipProvider delayDuration={75}><Tooltip><TooltipTrigger asChild><span className="inline-block"><Favorite /></span></TooltipTrigger><TooltipContent>{pressed ? (<span className="inline-flex items-center gap-x-1"><Check className="size-[15px] shrink-0 text-green-500" />Saved</span>) : "Save to favorites"}</TooltipContent></Tooltip></TooltipProvider>)}</FavoriteRoot>
                            </div>
                            <div className="mt-5 flex items-center">
                              <span className="text-sm font-bold text-dark-blue-400 leading-none">$85 - $120</span>
                              <span className="text-[10px] text-dark-blue-400 leading-none font-light">/hr</span>
                            </div>
                            <div className="mt-5">
                              <h1 className="text-base leading-none text-dark-blue-400 font-bold">Team Name <span className="font-light text-gray-500">@Tech Sentinel</span></h1>
                              <h3 className="mt-0.5 text-xs font-medium text-dark-blue-400 leading-none">{currentName} team</h3>
                              <p className="mt-2 text-[11px] font-light leading-none text-dark-blue-400">Average 10 years of experience</p>
                              <div className="mt-3.5 flex items-center gap-x-1">
                                <MarkerPin02 className="size-3 text-gray-500" />
                                <span className="leading-4 text-[10px] font-medium text-gray-500">UK, USA, Brazil, Philippines, more...</span>
                              </div>
                              <div className="mt-3.5 flex items-center gap-x-2">
                                <div className="flex items-center gap-x-2">
                                  <div className="flex items-center gap-x-[5px] py-[3px] px-1.5 rounded-[3.03px] bg-gray-50 shadow-[0px_0.57px_1.14px_0px_rgba(16,24,40,.05)]">
                                    <div className="flex items-center gap-x-[3px]">
                                      {fromLength(5).map((k) => (<Star key={k} className="size-3 text-primary-500 fill-primary-500 shrink-0" />))}
                                    </div>
                                  </div>
                                  <span className="text-xs font-semibold leading-none text-dark-blue-400">4.7</span>
                                </div>
                                <span className="text-xs font-semibold leading-none text-dark-blue-400">2 Projects</span>
                              </div>
                              <div className="mt-5 flex gap-2 flex-wrap">
                                <Badge className="bg-transparent" visual="gray">React</Badge>
                                <Badge className="bg-transparent" visual="gray">Node.js</Badge>
                                <Badge className="bg-transparent" visual="gray">AWS</Badge>
                              </div>
                            </div>
                          </article>
                        </SwiperSlide>
                      ))}
                    </SwiperContent>
                  </TabsContent>
                </div>
              </SwiperRoot>
            </Tabs>
          </div>

          {/* Popular Searches */}
          <div className="mt-[50px]">
            <div className="flex items-center justify-between">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">Popular Searches</h1>
              <div className="flex items-center gap-x-3">
                <IconButton className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400" visual="gray" variant="outlined"><ChevronLeft className="size-[18px]" /></IconButton>
                <IconButton className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 data-[state=active]:opacity-100" visual="gray" variant="outlined" data-state="active"><ChevronRight className="size-[18px]" /></IconButton>
              </div>
            </div>
            <div className="mt-6 flex items-center flex-wrap gap-3">
              {["API Development", "Cloud Migration", "Data Pipeline", "Machine Learning", "Mobile App", "Web Application", "Microservices", "DevOps", "UI/UX Design", "Database Optimization"].map((term) => (
                <Badge key={term} variant="circular" visual="gray" size="lg" className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 transition duration-300 cursor-pointer">
                  {term}
                </Badge>
              ))}
            </div>
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
                  {["Agriculture", "Oil & Gas", "Manufacturing", "Construction", "Utilities", "Retail & Wholesale", "Transportation", "Finance & Banking", "Real Estate", "Healthcare"].map((industry) => (
                    <article key={industry} className="cursor-pointer transition duration-300 h-[62px] bg-white text-lg leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] text-center hover:ring-1 hover:ring-gray-300 hover:border-gray-300">
                      {industry}
                    </article>
                  ))}
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
                  className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                  visual="gray"
                  variant="outlined"
                >
                  <ChevronLeft className="size-[18px]" />
                </IconButton>
                <IconButton
                  className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                  visual="gray"
                  variant="outlined"
                  data-state="active"
                >
                  <ChevronRight className="size-[18px]" />
                </IconButton>
              </div>
            </div>

            <div className="mt-6 flex items-center flex-wrap gap-3">
              {["JavaScript", "Python", "React", "Node.js", "TypeScript", "AWS", "Docker", "Kubernetes", "GraphQL", "PostgreSQL", "MongoDB"].map((skill) => (
                <Badge
                  key={skill}
                  variant="circular"
                  visual="gray"
                  size="lg"
                  className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 transition duration-300 cursor-pointer"
                >
                  {skill}
                </Badge>
              ))}
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

          {/* Browse by Type — grid with Projects/Services tabs */}
          <div className="mt-[50px]">
            <Tabs defaultValue="Projects">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Browse by Type
              </h1>
              <div className="mt-6 flex justify-between items-center">
                <TabsList className="flex items-center gap-x-3">
                  {["Projects", "Services"].map((tab) => (
                    <Badge
                      key={tab}
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value={tab}>{tab}</TabsTrigger>
                    </Badge>
                  ))}
                </TabsList>
                <div className="flex items-center gap-x-3">
                  <IconButton className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400" visual="gray" variant="outlined"><ChevronLeft className="size-[18px]" /></IconButton>
                  <IconButton className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 data-[state=active]:opacity-100" visual="gray" variant="outlined" data-state="active"><ChevronRight className="size-[18px]" /></IconButton>
                </div>
              </div>
              <div className="mt-6">
                <TabsContent className="grid grid-cols-5 gap-[15px]" value="Projects">
                  {(listingsProjects.length > 0
                    ? listingsProjects.slice(0, 10).map((p: any) => ({ name: p.title, project: p }))
                    : ["Infrastructure as Code", "API Development", "Cloud Migration", "CI/CD Pipeline", "Database Design", "Microservices", "Containerization", "Serverless", "Monitoring", "Security Audit"].map((name) => ({ name, project: null }))
                  ).map(({ name, project }: any, i: number) => (
                    <NextLink
                      key={project?.id ?? name ?? i}
                      href={project ? buildProjectUrl(l1Meta.slug, project.slug, project.id) : `/c/${l1Meta.slug}/projects`}
                      className="focus-visible:outline-none"
                    >
                      <article className="p-5 rounded-lg bg-white border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] hover:ring-1 hover:ring-gray-300 transition duration-300 cursor-pointer h-full">
                        <div className="size-[35px] bg-gray-200 rounded-lg" />
                        <div className="mt-5">
                          <span className="text-[10px] leading-none font-medium text-dark-blue-400">{project?.category || currentName}</span>
                          <h1 className="mt-1 text-base leading-none font-semibold text-dark-blue-400 line-clamp-2">{name}</h1>
                        </div>
                        <div className="mt-3 flex flex-col gap-y-2">
                          <div className="flex items-center gap-x-[6.4px]"><Clock className="size-[18px] shrink-0 text-primary-500" /><span className="font-medium text-sm leading-none text-dark-blue-400">Starting from {project?.duration || "12 weeks"}</span></div>
                          <div className="flex items-center gap-x-[6.4px]"><Money className="size-[18px] shrink-0 text-primary-500" /><span className="font-medium text-sm leading-none text-dark-blue-400">${project?.budget ? Number(project.budget).toLocaleString() : "50,000"} budget</span></div>
                        </div>
                      </article>
                    </NextLink>
                  ))}
                </TabsContent>
                <TabsContent className="grid grid-cols-5 gap-[15px]" value="Services">
                  {(listingsServices.length > 0
                    ? listingsServices.slice(0, 10).map((s: any) => ({ name: s.title, service: s }))
                    : ["Brand Strategy", "Logo Design", "Web Design", "Mobile UI", "Design System", "Illustration", "Motion Graphics", "Print Design", "Packaging", "UX Audit"].map((name) => ({ name, service: null }))
                  ).map(({ name, service }: any, i: number) => (
                    <NextLink
                      key={service?.id ?? name ?? i}
                      href={service ? buildServiceUrl(l1Meta.slug, service.slug, service.id) : `/c/${l1Meta.slug}/services`}
                      className="focus-visible:outline-none"
                    >
                      <article className="p-5 rounded-lg bg-white border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] hover:ring-1 hover:ring-gray-300 transition duration-300 cursor-pointer h-full">
                        <div className="size-[35px] bg-gray-200 rounded-lg" />
                        <div className="mt-5">
                          <span className="text-[10px] leading-none font-medium text-dark-blue-400">{service?.category || currentName}</span>
                          <h1 className="mt-1 text-base leading-none font-semibold text-dark-blue-400 line-clamp-2">{name}</h1>
                        </div>
                        <div className="mt-3 flex flex-col gap-y-2">
                          <div className="flex items-center gap-x-[6.4px]"><Clock className="size-[18px] shrink-0 text-primary-500" /><span className="font-medium text-sm leading-none text-dark-blue-400">{service?.deliveryTime || "Monthly"}</span></div>
                          <div className="flex items-center gap-x-[6.4px]"><Money className="size-[18px] shrink-0 text-primary-500" /><span className="font-medium text-sm leading-none text-dark-blue-400">${service?.priceMin ? `${Number(service.priceMin).toLocaleString()} - $${Number(service.priceMax).toLocaleString()}` : "5,000 - $15,000"}/month</span></div>
                        </div>
                      </article>
                    </NextLink>
                  ))}
                </TabsContent>
              </div>
            </Tabs>
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
                    className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                    visual="gray"
                    variant="outlined"
                  >
                    <ChevronLeft className="size-[18px]" />
                  </IconButton>
                  <IconButton
                    className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
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
                  {(listingsProjects.length > 0 ? listingsProjects.slice(0, 3) : Array(3).fill(0)).map((itemOrZero: any, index: number) => {
                    const project = listingsProjects.length > 0 ? itemOrZero : null
                    return (
                      <NextLink
                        key={project?.id ?? index}
                        href={project ? buildProjectUrl(l1Meta.slug, project.slug, project.id) : `/c/${l1Meta.slug}/projects`}
                        className="focus-visible:outline-none"
                      >
                      <article
                        className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] flex flex-col h-full cursor-pointer hover:ring-1 hover:ring-gray-300 transition duration-300"
                      >
                        <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                          <NextImage
                            className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                            src={project?.mediaUrls?.[0] || "/dashboard.png"}
                            alt={project?.title || "Dashboard"}
                            fill
                            sizes="33vw"
                          />
                        </div>

                        <div className="mt-3 flex items-start gap-x-3">
                          <span
                            className="font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                          >
                            {project?.title || "The Ultimate Mobile App Experience"}
                          </span>

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
                      </NextLink>
                    )
                  })}
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Top {Category} Projects — Swiper with filter tabs */}
          <div className="mt-[50px]">
            <Tabs defaultValue="Featured">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Top {currentName} Projects
              </h1>
              <SwiperRoot>
                <div className="mt-6 flex justify-between items-center">
                  <TabsList className="flex items-center gap-x-3">
                    {["Featured", "Newest", "Most Popular", "Trending", "Top-Rated"].map((tab) => (
                      <Badge key={tab} variant="circular" visual="gray" size="lg" className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400" asChild>
                        <TabsTrigger value={tab}>{tab}</TabsTrigger>
                      </Badge>
                    ))}
                  </TabsList>
                  <div className="flex items-center gap-x-8">
                    <Button variant="link" visual="gray" size="lg" className="underline">Explore More Projects</Button>
                    <div className="flex items-center gap-x-3">
                      <SwiperPrevTrigger asChild><IconButton className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400" visual="gray" variant="outlined"><ChevronLeft className="size-[18px]" /></IconButton></SwiperPrevTrigger>
                      <SwiperNextTrigger asChild><IconButton className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400" visual="gray" variant="outlined"><ChevronRight className="size-[18px]" /></IconButton></SwiperNextTrigger>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <TabsContent value="Featured">
                    <SwiperContent slidesPerView="auto" spaceBetween={20}>
                      {(listingsProjects.length > 0 ? listingsProjects.slice(0, 8) : fromLength(8)).map((item: any, idx: number) => {
                        const project = listingsProjects.length > 0 ? item : null
                        return (
                        <SwiperSlide className="w-[355px]" key={project?.id ?? idx}>
                          <NextLink href={project ? buildProjectUrl(l1Meta.slug, project.slug, project.id) : `/c/${l1Meta.slug}/projects`} className="block focus-visible:outline-none">
                          <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                            <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15 cursor-pointer">
                              <NextImage className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]" src={project?.mediaUrls?.[0] || "/dashboard.png"} alt={project?.title || "Dashboard"} fill sizes="33vw" />
                            </div>
                            <div className="mt-3 flex items-start gap-x-3">
                              <span className="font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline">{project?.title || "The Ultimate Mobile App Experience"}</span>
                              <div className="inline-flex items-center gap-x-1"><Star className="size-[15px] text-primary-500 fill-primary-500" /><span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">4.9 <span className="font-extralight">(5)</span></span></div>
                            </div>
                            <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400 line-clamp-2">{project?.description?.slice(0, 120) || "Brief Description of the project. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt."}</p>
                            <div className="mt-[14.5px] flex flex-col gap-y-3">
                              <div className="flex items-center gap-x-[6.4px]"><Clock className="size-[18px] shrink-0 text-primary-500" /><span className="font-medium text-sm leading-none text-dark-blue-400">Starting from {project?.duration || "12 weeks"}</span></div>
                              <div className="flex items-center gap-x-[6.4px]"><Money className="size-[18px] shrink-0 text-primary-500" /><span className="font-medium text-sm leading-none text-dark-blue-400">${project?.budget ? Number(project.budget).toLocaleString() : "50,000"} budget</span></div>
                            </div>
                            <div className="mt-5 flex items-end justify-between">
                              <AvatarGroup max={5} size="sm" excess excessClassName="border-gray-300 text-gray-500">
                                {(talentUsers.length > 0 ? talentUsers.slice(0, 6) : fromLength(6)).map((u: any, k: number) => (<Avatar key={u?.id ?? k} size="sm" className="border-2 border-white hover:ring-0 active:ring-0"><AvatarImage src={u?.avatarUrl || "/woman.jpg"} alt={u?.firstName || "Team"} /><AvatarFallback>{u?.firstName?.[0] || "T"}</AvatarFallback></Avatar>))}
                              </AvatarGroup>
                              {project && <FavoriteRoot value={favoritedItems.has(String(project.id))} onValueChange={(pressed) => handleFavoriteToggle(String(project.id), "project", pressed)}>{({ pressed }) => (<TooltipProvider delayDuration={75}><Tooltip><TooltipTrigger asChild><span className="inline-block"><Favorite /></span></TooltipTrigger><TooltipContent>{pressed ? (<span className="inline-flex items-center gap-x-1"><Check className="size-[15px] shrink-0 text-green-500" />Saved</span>) : "Save to favorites"}</TooltipContent></Tooltip></TooltipProvider>)}</FavoriteRoot>}
                            </div>
                          </article>
                          </NextLink>
                        </SwiperSlide>
                        )
                      })}
                    </SwiperContent>
                  </TabsContent>
                </div>
              </SwiperRoot>
            </Tabs>
          </div>

          {/* Top {Category} Services — Swiper with filter tabs */}
          <div className="mt-[50px]">
            <Tabs defaultValue="Featured">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Top {currentName} Services
              </h1>
              <SwiperRoot>
                <div className="mt-6 flex justify-between items-center">
                  <TabsList className="flex items-center gap-x-3">
                    {["Featured", "Newest", "Most Popular", "Trending", "Top-Rated"].map((tab) => (
                      <Badge key={tab} variant="circular" visual="gray" size="lg" className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400" asChild>
                        <TabsTrigger value={tab}>{tab}</TabsTrigger>
                      </Badge>
                    ))}
                  </TabsList>
                  <div className="flex items-center gap-x-8">
                    <Button variant="link" visual="gray" size="lg" className="underline">Explore More Services</Button>
                    <div className="flex items-center gap-x-3">
                      <SwiperPrevTrigger asChild><IconButton className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400" visual="gray" variant="outlined"><ChevronLeft className="size-[18px]" /></IconButton></SwiperPrevTrigger>
                      <SwiperNextTrigger asChild><IconButton className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400" visual="gray" variant="outlined"><ChevronRight className="size-[18px]" /></IconButton></SwiperNextTrigger>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <TabsContent value="Featured">
                    <SwiperContent slidesPerView="auto" spaceBetween={20}>
                      {(listingsServices.length > 0 ? listingsServices.slice(0, 8) : fromLength(8)).map((item: any, idx: number) => {
                        const service = listingsServices.length > 0 ? item : null
                        return (
                        <SwiperSlide className="w-[355px]" key={service?.id ?? idx}>
                          <NextLink href={service ? buildServiceUrl(l1Meta.slug, service.slug, service.id) : `/c/${l1Meta.slug}/services`} className="block focus-visible:outline-none">
                          <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                            <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15 cursor-pointer">
                              <NextImage className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]" src={service?.mediaUrls?.[0] || "/dashboard.png"} alt={service?.title || "Service"} fill sizes="33vw" />
                            </div>
                            <div className="mt-3 flex items-start gap-x-3">
                              <span className="font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline">{service?.title || `Professional ${currentName} Service`}</span>
                              <div className="inline-flex items-center gap-x-1"><Star className="size-[15px] text-primary-500 fill-primary-500" /><span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">4.9 <span className="font-extralight">(5)</span></span></div>
                            </div>
                            <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400 line-clamp-2">{service?.description?.slice(0, 120) || `Professional service offering for ${currentName}. Expert team ready to deliver results.`}</p>
                            <div className="mt-[14.5px] flex flex-col gap-y-3">
                              <div className="flex items-center gap-x-[6.4px]"><Clock className="size-[18px] shrink-0 text-primary-500" /><span className="font-medium text-sm leading-none text-dark-blue-400">{service?.deliveryTime || "Monthly"}</span></div>
                              <div className="flex items-center gap-x-[6.4px]"><Money className="size-[18px] shrink-0 text-primary-500" /><span className="font-medium text-sm leading-none text-dark-blue-400">${service?.priceMin ? `${Number(service.priceMin).toLocaleString()} - $${Number(service.priceMax).toLocaleString()}` : "5,000 - $15,000"}/month</span></div>
                            </div>
                            <div className="mt-5 flex items-end justify-between">
                              <AvatarGroup max={5} size="sm" excess excessClassName="border-gray-300 text-gray-500">
                                {(talentUsers.length > 0 ? talentUsers.slice(0, 6) : fromLength(6)).map((u: any, k: number) => (<Avatar key={u?.id ?? k} size="sm" className="border-2 border-white hover:ring-0 active:ring-0"><AvatarImage src={u?.avatarUrl || "/woman.jpg"} alt={u?.firstName || "Team"} /><AvatarFallback>{u?.firstName?.[0] || "T"}</AvatarFallback></Avatar>))}
                              </AvatarGroup>
                              {service && <FavoriteRoot value={favoritedItems.has(String(service.id))} onValueChange={(pressed) => handleFavoriteToggle(String(service.id), "service", pressed)}>{({ pressed }) => (<TooltipProvider delayDuration={75}><Tooltip><TooltipTrigger asChild><span className="inline-block"><Favorite /></span></TooltipTrigger><TooltipContent>{pressed ? (<span className="inline-flex items-center gap-x-1"><Check className="size-[15px] shrink-0 text-green-500" />Saved</span>) : "Save to favorites"}</TooltipContent></Tooltip></TooltipProvider>)}</FavoriteRoot>}
                            </div>
                          </article>
                          </NextLink>
                        </SwiperSlide>
                        )
                      })}
                    </SwiperContent>
                  </TabsContent>
                </div>
              </SwiperRoot>
            </Tabs>
          </div>

          {/* {Category} All Stars — talent Swiper with filter tabs */}
          <div className="mt-[50px]">
            <Tabs defaultValue="Featured">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                {currentName} All Stars
              </h1>
              <SwiperRoot>
                <div className="mt-6 flex justify-between items-center">
                  <TabsList className="flex items-center gap-x-3">
                    {["Featured", "Newest", "Most Popular", "Trending", "Top-Rated"].map((tab) => (
                      <Badge key={tab} variant="circular" visual="gray" size="lg" className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400" asChild>
                        <TabsTrigger value={tab}>{tab}</TabsTrigger>
                      </Badge>
                    ))}
                  </TabsList>
                  <div className="flex items-center gap-x-8">
                    <Button variant="link" visual="gray" size="lg" className="underline">Explore More Talent</Button>
                    <div className="flex items-center gap-x-3">
                      <SwiperPrevTrigger asChild><IconButton className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400" visual="gray" variant="outlined"><ChevronLeft className="size-[18px]" /></IconButton></SwiperPrevTrigger>
                      <SwiperNextTrigger asChild><IconButton className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400" visual="gray" variant="outlined"><ChevronRight className="size-[18px]" /></IconButton></SwiperNextTrigger>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <TabsContent value="Featured">
                    <SwiperContent slidesPerView="auto" spaceBetween={20}>
                      {fromLength(8).map((key) => (
                        <SwiperSlide className="w-[355px]" key={key}>
                          <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                            <div className="flex items-center gap-x-3">
                              <Avatar size="lg"><AvatarImage src="/woman.jpg" alt="Talent" /><AvatarFallback>T</AvatarFallback></Avatar>
                              <div>
                                <h3 className="text-base font-bold text-dark-blue-400">Expert Freelancer</h3>
                                <p className="text-xs font-light text-dark-blue-400">{currentName} Specialist</p>
                              </div>
                            </div>
                            <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">Experienced {currentName} professional with 8+ years of hands-on experience.</p>
                            <div className="mt-3 flex items-center gap-x-2">
                              <div className="flex items-center gap-x-[5px] py-[3px] px-1.5 rounded-[3.03px] bg-gray-50 shadow-[0px_0.57px_1.14px_0px_rgba(16,24,40,.05)]">
                                <div className="flex items-center gap-x-[3px]">
                                  {fromLength(5).map((k) => (<Star key={k} className="size-3 text-primary-500 fill-primary-500 shrink-0" />))}
                                </div>
                              </div>
                              <span className="text-xs font-semibold text-dark-blue-400">4.9</span>
                              <span className="text-xs font-semibold text-dark-blue-400">12 Projects</span>
                            </div>
                            <div className="mt-3 flex gap-2 flex-wrap">
                              <Badge className="bg-transparent" visual="gray">React</Badge>
                              <Badge className="bg-transparent" visual="gray">TypeScript</Badge>
                              <Badge className="bg-transparent" visual="gray">Node.js</Badge>
                            </div>
                            <div className="mt-5 flex items-end justify-between">
                              <span className="text-sm font-bold text-dark-blue-400">$75 <span className="text-[10px] font-light">/hr</span></span>
                              <FavoriteRoot>{({ pressed }) => (<TooltipProvider delayDuration={75}><Tooltip><TooltipTrigger asChild><span className="inline-block"><Favorite /></span></TooltipTrigger><TooltipContent>{pressed ? (<span className="inline-flex items-center gap-x-1"><Check className="size-[15px] shrink-0 text-green-500" />Saved</span>) : "Save to favorites"}</TooltipContent></Tooltip></TooltipProvider>)}</FavoriteRoot>
                            </div>
                          </article>
                        </SwiperSlide>
                      ))}
                    </SwiperContent>
                  </TabsContent>
                </div>
              </SwiperRoot>
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
              {["React", "Vue.js", "Angular", "Next.js", "Django", "Rails", "Flutter", "Swift", "Node.js", "PostgreSQL", "Docker", "Kubernetes"].map((tech) => (
                <article key={tech} className="h-[80px] flex flex-col items-center gap-y-0.5 px-[20px] bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] justify-center rounded-lg border-gray-200 cursor-pointer hover:ring-1 hover:ring-gray-200 transition duration-300">
                  <div className="size-8 bg-gray-100 shrink-0 rounded" />
                  <h1 className="text-xs font-medium leading-none text-dark-blue-400">{tech}</h1>
                </article>
              ))}
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
