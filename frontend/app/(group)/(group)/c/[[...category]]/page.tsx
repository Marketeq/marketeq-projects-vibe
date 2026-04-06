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
  heroImage?: string
}

/**
 * Build a deterministic hero-banner URL from a category/subcategory slug.
 * Uses Picsum Photos (which sources its archive from Unsplash) so every
 * category and subcategory gets a unique, visually distinct banner that
 * can never 404.
 */
const heroBannerFor = (...segments: string[]): string => {
  const seed = segments.filter(Boolean).join("-") || "marketeq"
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/1600/600`
}

/** Back-compat shim for entries that still pass an explicit Unsplash id. */
const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`

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
    heroImage: unsplash("1532094349884-543bc11b234d"),
    subcategories: [
      { name: "Market Research", slug: "market-research", description: "Consumer insights, competitive analysis, and market sizing.", heroImage: unsplash("1460925895917-afdab827c52f") },
      { name: "User Research", slug: "user-research", description: "Usability testing, interviews, and persona development.", heroImage: unsplash("1522071820081-009f0129c71c") },
      { name: "Academic Research", slug: "academic-research", description: "Literature reviews, white papers, and scholarly analysis.", heroImage: unsplash("1481627834876-b7833e8f5570") },
      { name: "Clinical Research", slug: "clinical-research", description: "Clinical trials, pharma research, and regulatory compliance.", heroImage: unsplash("1579154204601-01588f351e67") },
      { name: "Consumer Research", slug: "consumer-research", description: "Behavioral analysis, focus groups, and consumer sentiment.", heroImage: unsplash("1556761175-5973dc0f32e7") },
      { name: "Data Analysis", slug: "data-analysis", description: "Statistical analysis, data visualization, and reporting.", heroImage: unsplash("1551288049-bebda4e38f71") },
      { name: "Competitive Intelligence", slug: "competitive-intelligence", description: "Competitor tracking, benchmarking, and strategic insights.", heroImage: unsplash("1542744173-8e7e53415bb0") },
      { name: "Survey Research", slug: "survey-research", description: "Survey design, distribution, response analysis, and insights.", heroImage: unsplash("1586281380349-632531db7ed4") },
      { name: "Qualitative Research", slug: "qualitative-research", description: "In-depth interviews, focus groups, and ethnographic studies.", heroImage: unsplash("1543269865-cbf427effbad") },
      { name: "Sentiment Analysis", slug: "sentiment-analysis", description: "Brand monitoring, social listening, and NLP-powered analysis.", heroImage: unsplash("1611162617213-7d7a39e9b1d7") },
      { name: "Industry Analysis", slug: "industry-analysis", description: "Industry benchmarking, KPI analysis, and market positioning.", heroImage: unsplash("1486406146926-c627a92ad1ab") },
    ],
  },
  "software-development": {
    name: "Software Development",
    slug: "software-development",
    description: "Discover exciting projects, meet talented teams, and find the skills you need to succeed.",
    heroImage: unsplash("1461749280684-dccba630e2f6"),
    subcategories: [
      { name: "Front-end Development", slug: "front-end-development", description: "Create the interface that users interact with directly.", heroImage: unsplash("1498050108023-c5249f4df085") },
      { name: "Back-end Development", slug: "back-end-development", description: "Build the server logic, APIs, and databases.", heroImage: unsplash("1558494949-ef010cbdcc31") },
      { name: "Mobile Development", slug: "mobile-development", description: "Native and cross-platform mobile applications.", heroImage: unsplash("1512941937669-90a1b58e7e9c") },
      { name: "DevOps & Cloud", slug: "devops-cloud", description: "Infrastructure, CI/CD, and cloud deployment.", heroImage: unsplash("1518770660439-4636190af475") },
      { name: "Blockchain", slug: "blockchain", description: "Smart contracts, DeFi, and Web3 development.", heroImage: unsplash("1639762681485-074b7f938ba0") },
    ],
  },
  "design-creative": {
    name: "Design & Creative",
    slug: "design-creative",
    description: "Find creative talent for branding, UI/UX, illustration, and visual storytelling.",
    heroImage: unsplash("1558655146-9f40138edfeb"),
    subcategories: [
      { name: "UI/UX Design", slug: "ui-ux-design", description: "User interface and experience design for web and mobile.", heroImage: unsplash("1586717791821-3f44a563fa4c") },
      { name: "Graphic Design", slug: "graphic-design", description: "Visual branding, print design, and marketing materials.", heroImage: unsplash("1626785774573-4b799315345d") },
      { name: "Illustration", slug: "illustration", description: "Custom illustrations, icons, and digital art.", heroImage: unsplash("1513364776144-60967b0f800f") },
      { name: "Motion Design", slug: "motion-design", description: "Animations, motion graphics, and video effects.", heroImage: unsplash("1535016120720-40c646be5580") },
      { name: "Brand Identity", slug: "brand-identity", description: "Logo design, brand guidelines, and visual systems.", heroImage: unsplash("1600775508114-5c30cf911a40") },
    ],
  },
  design: {
    name: "Design",
    slug: "design",
    description: "Find world-class designers for branding, product, web, UX, illustration, and everything in between.",
    heroImage: unsplash("1561070791-2526d30994b8"),
    subcategories: [
      { name: "UI/UX Design", slug: "ui-ux-design", description: "User interface and experience design for web and mobile.", heroImage: unsplash("1586717791821-3f44a563fa4c") },
      { name: "Web Design", slug: "web-design", description: "Landing pages, marketing sites, and full website design.", heroImage: unsplash("1467232004584-a241de8bcf5d") },
      { name: "Product Design", slug: "product-design", description: "End-to-end digital product design and design systems.", heroImage: unsplash("1581291518857-4e27b48ff24e") },
      { name: "Graphic Design", slug: "graphic-design", description: "Visual branding, print design, and marketing materials.", heroImage: unsplash("1626785774573-4b799315345d") },
      { name: "Brand Identity", slug: "brand-identity", description: "Logo design, brand guidelines, and visual systems.", heroImage: unsplash("1600775508114-5c30cf911a40") },
      { name: "Illustration", slug: "illustration", description: "Custom illustrations, icons, and digital art.", heroImage: unsplash("1513364776144-60967b0f800f") },
      { name: "Motion Design", slug: "motion-design", description: "Animations, motion graphics, and video effects.", heroImage: unsplash("1535016120720-40c646be5580") },
      { name: "3D Design", slug: "3d-design", description: "3D modeling, rendering, and immersive visuals.", heroImage: unsplash("1617791160536-598cf32026fb") },
      { name: "Packaging Design", slug: "packaging-design", description: "Product packaging, labels, and unboxing experiences.", heroImage: unsplash("1542736667-069246bdbc6d") },
      { name: "Presentation Design", slug: "presentation-design", description: "Pitch decks, keynote slides, and investor presentations.", heroImage: unsplash("1542744173-8e7e53415bb0") },
      { name: "Print Design", slug: "print-design", description: "Brochures, posters, magazines, and print collateral.", heroImage: unsplash("1504450758481-7338eba7524a") },
      { name: "Design Systems", slug: "design-systems", description: "Component libraries, tokens, and scalable UI foundations.", heroImage: unsplash("1558655146-605d86ed31b3") },
    ],
  },
  marketing: {
    name: "Marketing",
    slug: "marketing",
    description: "Grow your brand with expert marketers, strategists, and campaign specialists.",
    heroImage: unsplash("1557838923-2985c318be48"),
    subcategories: [
      { name: "Digital Marketing", slug: "digital-marketing", description: "SEO, SEM, social media, and online advertising.", heroImage: unsplash("1533750349088-cd871a92f312") },
      { name: "Content Marketing", slug: "content-marketing", description: "Blog posts, whitepapers, and content strategy.", heroImage: unsplash("1486312338219-ce68d2c6f44d") },
      { name: "Email Marketing", slug: "email-marketing", description: "Campaigns, automation, and newsletter strategy.", heroImage: unsplash("1554200876-56c2f25224fa") },
      { name: "Social Media", slug: "social-media", description: "Social strategy, community management, and growth.", heroImage: unsplash("1611162617213-7d7a39e9b1d7") },
      { name: "Analytics & SEO", slug: "analytics-seo", description: "Performance tracking, keyword research, and optimization.", heroImage: unsplash("1460925895917-afdab827c52f") },
    ],
  },
  "data-analytics": {
    name: "Data & Analytics",
    slug: "data-analytics",
    description: "Turn data into decisions with expert analysts, engineers, and data scientists.",
    heroImage: unsplash("1551288049-bebda4e38f71"),
    subcategories: [
      { name: "Data Engineering", slug: "data-engineering", description: "Pipelines, ETL, and data infrastructure.", heroImage: unsplash("1518770660439-4636190af475") },
      { name: "Data Science", slug: "data-science", description: "Machine learning, modeling, and predictive analytics.", heroImage: unsplash("1555949963-ff9fe0c870eb") },
      { name: "Business Intelligence", slug: "business-intelligence", description: "Dashboards, reporting, and KPI tracking.", heroImage: unsplash("1460925895917-afdab827c52f") },
      { name: "Data Visualization", slug: "data-visualization", description: "Charts, infographics, and interactive dashboards.", heroImage: unsplash("1543286386-713bdd548da4") },
      { name: "Big Data", slug: "big-data", description: "Large-scale data processing and distributed systems.", heroImage: unsplash("1506399558188-acca6f8cbf41") },
    ],
  },
  writing: {
    name: "Writing & Content",
    slug: "writing",
    description: "Find skilled writers for copywriting, technical documentation, and creative content.",
    heroImage: unsplash("1455390582262-044cdead277a"),
    subcategories: [
      { name: "Copywriting", slug: "copywriting", description: "Marketing copy, ad copy, and persuasive writing.", heroImage: unsplash("1486312338219-ce68d2c6f44d") },
      { name: "Technical Writing", slug: "technical-writing", description: "Documentation, API guides, and knowledge bases.", heroImage: unsplash("1532619675605-1ede6c2ed2b0") },
      { name: "Creative Writing", slug: "creative-writing", description: "Storytelling, scripts, and editorial content.", heroImage: unsplash("1455390582262-044cdead277a") },
      { name: "Translation", slug: "translation", description: "Localization, multilingual content, and transcription.", heroImage: unsplash("1526385252912-31bb0c3e0d32") },
      { name: "Editing & Proofreading", slug: "editing-proofreading", description: "Quality assurance for written content.", heroImage: unsplash("1455390582262-5dbbe2a9b6c7") },
    ],
  },
  "business-consulting": {
    name: "Business & Consulting",
    slug: "business-consulting",
    description: "Strategic advice, project management, and operational expertise for your business.",
    heroImage: unsplash("1454165804606-c3d57bc86b40"),
    subcategories: [
      { name: "Strategy Consulting", slug: "strategy-consulting", description: "Business strategy, go-to-market, and growth planning.", heroImage: unsplash("1552664730-d307ca884978") },
      { name: "Project Management", slug: "project-management", description: "Agile, Scrum, and project delivery.", heroImage: unsplash("1517245386807-bb43f82c33c4") },
      { name: "Financial Consulting", slug: "financial-consulting", description: "Financial modeling, budgeting, and forecasting.", heroImage: unsplash("1554224155-6726b3ff858f") },
      { name: "HR & Recruiting", slug: "hr-recruiting", description: "Talent acquisition, org design, and people ops.", heroImage: unsplash("1521737604893-d14cc237f11d") },
      { name: "Legal & Compliance", slug: "legal-compliance", description: "Contracts, regulatory compliance, and legal ops.", heroImage: unsplash("1589829085413-56de8ae18c73") },
    ],
  },
}

// ── Technologies per category (logos served via cdn.simpleicons.org) ──
interface TechItem { name: string; slug: string }

const CATEGORY_TECHNOLOGIES: Record<string, TechItem[]> = {
  design: [
    { name: "Figma", slug: "figma" }, { name: "Sketch", slug: "sketch" },
    { name: "Adobe XD", slug: "adobexd" }, { name: "Photoshop", slug: "adobephotoshop" },
    { name: "Illustrator", slug: "adobeillustrator" }, { name: "InDesign", slug: "adobeindesign" },
    { name: "After Effects", slug: "adobeaftereffects" }, { name: "Framer", slug: "framer" },
    { name: "InVision", slug: "invision" }, { name: "Webflow", slug: "webflow" },
    { name: "Blender", slug: "blender" }, { name: "Canva", slug: "canva" },
  ],
  "design-creative": [
    { name: "Figma", slug: "figma" }, { name: "Sketch", slug: "sketch" },
    { name: "Adobe XD", slug: "adobexd" }, { name: "Photoshop", slug: "adobephotoshop" },
    { name: "Illustrator", slug: "adobeillustrator" }, { name: "InDesign", slug: "adobeindesign" },
    { name: "After Effects", slug: "adobeaftereffects" }, { name: "Framer", slug: "framer" },
    { name: "InVision", slug: "invision" }, { name: "Webflow", slug: "webflow" },
    { name: "Blender", slug: "blender" }, { name: "Canva", slug: "canva" },
  ],
  "software-development": [
    { name: "React", slug: "react" }, { name: "Vue.js", slug: "vuedotjs" },
    { name: "Angular", slug: "angular" }, { name: "Next.js", slug: "nextdotjs" },
    { name: "Node.js", slug: "nodedotjs" }, { name: "TypeScript", slug: "typescript" },
    { name: "Python", slug: "python" }, { name: "Go", slug: "go" },
    { name: "Rust", slug: "rust" }, { name: "Docker", slug: "docker" },
    { name: "Kubernetes", slug: "kubernetes" }, { name: "PostgreSQL", slug: "postgresql" },
  ],
  "data-analytics": [
    { name: "Python", slug: "python" }, { name: "R", slug: "r" },
    { name: "Tableau", slug: "tableau" }, { name: "Power BI", slug: "powerbi" },
    { name: "Apache Spark", slug: "apachespark" }, { name: "Snowflake", slug: "snowflake" },
    { name: "Databricks", slug: "databricks" }, { name: "Jupyter", slug: "jupyter" },
    { name: "Pandas", slug: "pandas" }, { name: "TensorFlow", slug: "tensorflow" },
    { name: "PyTorch", slug: "pytorch" }, { name: "PostgreSQL", slug: "postgresql" },
  ],
  marketing: [
    { name: "Google Analytics", slug: "googleanalytics" }, { name: "HubSpot", slug: "hubspot" },
    { name: "Mailchimp", slug: "mailchimp" }, { name: "Google Ads", slug: "googleads" },
    { name: "Meta", slug: "meta" }, { name: "Salesforce", slug: "salesforce" },
    { name: "Semrush", slug: "semrush" }, { name: "Ahrefs", slug: "ahrefs" },
    { name: "Hootsuite", slug: "hootsuite" }, { name: "Zapier", slug: "zapier" },
    { name: "Canva", slug: "canva" }, { name: "Notion", slug: "notion" },
  ],
  writing: [
    { name: "Google Docs", slug: "googledocs" }, { name: "Notion", slug: "notion" },
    { name: "Grammarly", slug: "grammarly" }, { name: "WordPress", slug: "wordpress" },
    { name: "Medium", slug: "medium" }, { name: "Substack", slug: "substack" },
    { name: "Ghost", slug: "ghost" }, { name: "Contentful", slug: "contentful" },
    { name: "Dropbox Paper", slug: "dropbox" }, { name: "Evernote", slug: "evernote" },
    { name: "Obsidian", slug: "obsidian" }, { name: "Scribd", slug: "scribd" },
  ],
  research: [
    { name: "Python", slug: "python" }, { name: "R", slug: "r" },
    { name: "Jupyter", slug: "jupyter" }, { name: "Tableau", slug: "tableau" },
    { name: "Pandas", slug: "pandas" }, { name: "Kaggle", slug: "kaggle" },
    { name: "Google Scholar", slug: "googlescholar" }, { name: "Mendeley", slug: "mendeley" },
    { name: "Zotero", slug: "zotero" }, { name: "Overleaf", slug: "overleaf" },
    { name: "LaTeX", slug: "latex" }, { name: "ORCID", slug: "orcid" },
  ],
  "business-consulting": [
    { name: "Excel", slug: "microsoftexcel" }, { name: "PowerPoint", slug: "microsoftpowerpoint" },
    { name: "Notion", slug: "notion" }, { name: "Salesforce", slug: "salesforce" },
    { name: "HubSpot", slug: "hubspot" }, { name: "Slack", slug: "slack" },
    { name: "Asana", slug: "asana" }, { name: "Trello", slug: "trello" },
    { name: "Jira", slug: "jira" }, { name: "Monday", slug: "mondaydotcom" },
    { name: "Airtable", slug: "airtable" }, { name: "Zoom", slug: "zoom" },
  ],
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
    heroImage: unsplash("1519389950473-47ba0277781c"),
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

  // Subcategories: static taxonomy is the curated source of truth at L1;
  // fall back to API children only when the static taxonomy has no entry for this category.
  const subcategories = useMemo(() => {
    if (!l2 && !l3 && l1Meta.subcategories.length > 0) {
      return l1Meta.subcategories.map((s) => ({ ...s, uuid: s.slug }))
    }
    const apiChildren = (pageData?.children ?? []).filter((c: any) => c && c.name && c.slug)
    if (apiChildren.length > 0) return apiChildren
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
              // Deterministic banner per deepest selected slug — every
              // category and subcategory gets a unique, visually distinct image.
              src={heroBannerFor(l1Meta.slug, l2Meta?.slug ?? "", l3Meta?.slug ?? "")}
              alt={`${currentName} banner`}
              fill
              className="object-cover"
              sizes="100vw"
              priority
              unoptimized
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
                      {fromLength(8).map((idx) => {
                        // Cycle through real listings so every card links to a real project detail page.
                        const project = listingsProjects.length > 0 ? listingsProjects[idx % listingsProjects.length] : null
                        const href = project ? buildProjectUrl(l1Meta.slug, project.slug, project.id) : `/c/${l1Meta.slug}/projects`
                        return (
                        <SwiperSlide key={project?.id ?? idx} className="w-[355px]">
                          <NextLink href={href} className="block focus-visible:outline-none">
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
            <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">Popular Searches</h1>
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
                {/*
                  Each tab corresponds to an Algolia facet on the projects index.
                  Spec: /docs/md/Search Service/ ✅ Finalized Filter Fields table for project search.md
                        /docs/md/Search Service/📄 search-config.ts — Filters Only (projects).md
                  - Project Type    → project_type (string facet)
                  - Industry        → industry (string facet)
                  - Budget          → budget_range (numberRange → budget_min/budget_max)
                  - Project Length  → project_duration_range (enum — exact values)
                  - Team Size       → team_size_range (enum — exact values)
                  Each tile links to /search with the filter pre-applied and scoped to the current category.
                */}
                <TabsContent
                  className="grid grid-cols-5 gap-[15px]"
                  value="Project Type"
                >
                  {["Web App", "Mobile App", "Desktop App", "SaaS Platform", "API / Backend", "E-commerce Store", "Landing Page", "Chrome Extension", "CLI Tool", "Game"].map((projectType) => (
                    <NextLink
                      key={projectType}
                      href={`/search?category=${l1Meta.slug}&project_type=${encodeURIComponent(projectType)}`}
                      className="focus-visible:outline-none"
                    >
                      <article className="cursor-pointer transition duration-300 h-[62px] bg-white text-base leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] text-center hover:ring-1 hover:ring-gray-300 hover:border-gray-300 flex items-center justify-center">
                        {projectType}
                      </article>
                    </NextLink>
                  ))}
                </TabsContent>
                <TabsContent
                  className="grid grid-cols-5 gap-[15px]"
                  value="Industry"
                >
                  {["Agriculture", "Oil & Gas", "Manufacturing", "Construction", "Utilities", "Retail & Wholesale", "Transportation", "Finance & Banking", "Real Estate", "Healthcare"].map((industry) => (
                    <NextLink
                      key={industry}
                      href={`/search?category=${l1Meta.slug}&industry=${encodeURIComponent(industry)}`}
                      className="focus-visible:outline-none"
                    >
                      <article className="cursor-pointer transition duration-300 h-[62px] bg-white text-base leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] text-center hover:ring-1 hover:ring-gray-300 hover:border-gray-300 flex items-center justify-center">
                        {industry}
                      </article>
                    </NextLink>
                  ))}
                </TabsContent>
                <TabsContent
                  className="grid grid-cols-5 gap-[15px]"
                  value="Budget"
                >
                  {[
                    { label: "Under $5k", min: 0, max: 5000 },
                    { label: "$5k – $15k", min: 5000, max: 15000 },
                    { label: "$15k – $50k", min: 15000, max: 50000 },
                    { label: "$50k – $100k", min: 50000, max: 100000 },
                    { label: "$100k – $250k", min: 100000, max: 250000 },
                    { label: "$250k – $500k", min: 250000, max: 500000 },
                    { label: "$500k – $1M", min: 500000, max: 1000000 },
                    { label: "$1M+", min: 1000000, max: null as number | null },
                  ].map((b) => (
                    <NextLink
                      key={b.label}
                      href={`/search?category=${l1Meta.slug}&budget_min=${b.min}${b.max != null ? `&budget_max=${b.max}` : ""}`}
                      className="focus-visible:outline-none"
                    >
                      <article className="cursor-pointer transition duration-300 h-[62px] bg-white text-base leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] text-center hover:ring-1 hover:ring-gray-300 hover:border-gray-300 flex items-center justify-center">
                        {b.label}
                      </article>
                    </NextLink>
                  ))}
                </TabsContent>
                <TabsContent
                  className="grid grid-cols-5 gap-[15px]"
                  value="Project Length"
                >
                  {["1 - 3 months", "3 - 6 months", "6 - 12 months", "12 - 18 months", "18 - 24 months", "24+ months"].map((duration) => (
                    <NextLink
                      key={duration}
                      href={`/search?category=${l1Meta.slug}&project_duration_range=${encodeURIComponent(duration)}`}
                      className="focus-visible:outline-none"
                    >
                      <article className="cursor-pointer transition duration-300 h-[62px] bg-white text-base leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] text-center hover:ring-1 hover:ring-gray-300 hover:border-gray-300 flex items-center justify-center">
                        {duration}
                      </article>
                    </NextLink>
                  ))}
                </TabsContent>
                <TabsContent
                  className="grid grid-cols-5 gap-[15px]"
                  value="Team Size"
                >
                  {["1 - 2 members", "2 - 5 members", "5 - 10 members", "10 - 15 members", "15 - 20 members", "20+ members"].map((size) => (
                    <NextLink
                      key={size}
                      href={`/search?category=${l1Meta.slug}&team_size_range=${encodeURIComponent(size)}`}
                      className="focus-visible:outline-none"
                    >
                      <article className="cursor-pointer transition duration-300 h-[62px] bg-white text-base leading-none font-semibold text-dark-blue-400 rounded-lg p-5 border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] text-center hover:ring-1 hover:ring-gray-300 hover:border-gray-300 flex items-center justify-center">
                        {size}
                      </article>
                    </NextLink>
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
                  {["Infrastructure as Code", "API Development", "Cloud Migration", "CI/CD Pipeline", "Database Design", "Microservices", "Containerization", "Serverless", "Monitoring", "Security Audit"].map((name) => (
                    <article key={name} className="p-5 rounded-lg bg-white border border-gray-200 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
                      <div className="size-[35px] bg-gray-200 rounded-lg" />
                      <div className="mt-5">
                        <span className="text-[10px] leading-none font-medium text-dark-blue-400">DevOps</span>
                        <h1 className="mt-1 text-base leading-none font-semibold text-dark-blue-400">{name}</h1>
                      </div>
                      <div className="mt-3 flex flex-col gap-y-2">
                        <div className="flex items-center gap-x-[6.4px]"><Clock className="size-[18px] shrink-0 text-primary-500" /><span className="font-medium text-sm leading-none text-dark-blue-400">Starting from 12 weeks</span></div>
                        <div className="flex items-center gap-x-[6.4px]"><Money className="size-[18px] shrink-0 text-primary-500" /><span className="font-medium text-sm leading-none text-dark-blue-400">$50,000 budget</span></div>
                      </div>
                    </article>
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
                            href={`/c/${l1Meta.slug}/projects`}
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
              {(CATEGORY_TECHNOLOGIES[l1Meta.slug] ?? CATEGORY_TECHNOLOGIES["software-development"]).map((tech) => (
                <NextLink
                  key={tech.slug}
                  href={`/search?skill=${encodeURIComponent(tech.name)}`}
                  className="focus-visible:outline-none"
                >
                  <article className="h-[80px] flex flex-col items-center justify-center gap-y-1.5 px-[20px] bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] rounded-lg border border-gray-200 cursor-pointer hover:ring-1 hover:ring-gray-300 transition duration-300">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://cdn.simpleicons.org/${tech.slug}`}
                      alt={tech.name}
                      width={28}
                      height={28}
                      className="size-7 shrink-0 object-contain"
                      loading="lazy"
                    />
                    <h1 className="text-xs font-medium leading-none text-dark-blue-400 text-center">{tech.name}</h1>
                  </article>
                </NextLink>
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
