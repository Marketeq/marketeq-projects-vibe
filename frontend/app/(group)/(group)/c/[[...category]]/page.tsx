"use client"

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import {
  useCategoryPageL1,
  useCategoryPageL2,
  useCategoryPageL3,
} from "@/src/features/category-pages/hook"
import { type BlockItem } from "@/src/lib/api/category-pages"
import {
  addFavorite,
  findFavoriteByTypeAndItemId,
  getAllFavorites,
  removeFavorite,
  type FavoriteType,
} from "@/src/lib/api/favorites"
import { type TalentUser, talentToCardProps } from "@/src/lib/api/talent-users"
import {
  projectDetailsUrl,
  serviceDetailsUrl,
} from "@/src/lib/listing-urls"
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
  RefreshCw,
  Star,
} from "@blend-metrics/icons"
import { TabsList, TabsTrigger } from "@radix-ui/react-tabs"
import { SwiperSlide } from "swiper/react"
import { getPublicApiUrl } from "@/lib/runtime-urls"
import {
  SubcategoryIconTile,
  resolveUniqueSubcategoryIcons,
} from "@/lib/subcategory-icon"
import { CategoryBanner } from "@/components/category-banner"
import { ListingCard } from "@/components/listing-card"
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
  Tabs,
  TabsContent,
  contentTransition,
  contentVariants,
} from "@/components/ui"
import { motion } from "framer-motion"
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
  Card,
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
  /** Optional L3 children shown when the user lands on an L2 page. */
  children?: SubcategoryData[]
}

/**
 * Compact helper to build an array of SubcategoryData from plain names.
 * Auto-generates slug + a short description so L2 taxonomies stay terse.
 */
const c = (...names: string[]): SubcategoryData[] =>
  names.map((name) => ({
    name,
    slug: name
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    description: `${name} projects, specialists, and services.`,
  }))

// (subcategory icon resolver moved to @/lib/subcategory-icon)

/** Back-compat shim for entries that still pass an explicit Unsplash id. */
const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`

/**
 * Curated Unsplash photo IDs per L1 category. Every image in the pool is
 * topic-matched to the category (no random nature shots). We pick
 * deterministically from the pool so L2/L3 pages within the same L1 get
 * visually distinct — but still on-theme — banners.
 */
const L1_BANNER_POOL: Record<string, string[]> = {
  research: [
    "1532094349884-543bc11b234d", // science/lab
    "1507668077129-56e32842fceb", // research charts
    "1576086213369-97a306d36557", // lab equipment
    "1581094794329-c8112a89af12", // analysis
  ],
  "software-development": [
    "1461749280684-dccba630e2f6", // code on laptop (Luca Bravo)
    "1555066931-4365d14bab8c", // code screen
    "1517180102446-f3ece451e9d8", // matrix code
    "1542831371-29b0f74f9713", // dev workstation
  ],
  development: [
    "1461749280684-dccba630e2f6",
    "1555066931-4365d14bab8c",
    "1517180102446-f3ece451e9d8",
    "1542831371-29b0f74f9713",
  ],
  "design-creative": [
    "1558655146-9f40138edfeb", // design tools (known-good)
    "1454165804606-c3d57bc86b40", // creative workspace (known-good)
    "1455390582262-044cdead277a", // notebook / sketching (known-good)
    "1558655146-9f40138edfeb", // duplicate — keeps pool size stable
  ],
  design: [
    "1558655146-9f40138edfeb",
    "1454165804606-c3d57bc86b40",
    "1455390582262-044cdead277a",
    "1558655146-9f40138edfeb",
  ],
  marketing: [
    "1557838923-2985c318be48", // marketing analytics
    "1432888622747-4eb9a8efeb07", // charts/marketing
    "1533750516457-a7f992034fec", // marketing planning
    "1460925895917-afdab827c52f", // analytics screens
  ],
  "digital-marketing": [
    "1557838923-2985c318be48",
    "1432888622747-4eb9a8efeb07",
    "1533750516457-a7f992034fec",
    "1460925895917-afdab827c52f",
  ],
  "data-analytics": [
    "1551288049-bebda4e38f71", // laptop charts
    "1460925895917-afdab827c52f", // analytics screens
    "1504868584819-f8e8b4b6d7e3", // dashboards
    "1518186285589-2f7649de83e0", // data visualization
  ],
  writing: [
    "1455390582262-044cdead277a", // notebook writing
    "1486312338219-ce68d2c6f44d", // typewriter
    "1519682577862-22b62b24e493", // writing desk
    "1470225620780-dba8ba36b745", // journal pen
  ],
  "business-consulting": [
    "1454165804606-c3d57bc86b40", // meeting
    "1486406146926-c627a92ad1ab", // boardroom
    "1542744173-8e7e53415bb0", // business charts
    "1551836022-d5d88e9218df", // strategy
  ],
  testing: [
    "1581091226825-a6a2a5aee158", // woman coding QA
    "1454165804606-c3d57bc86b40", // workspace
    "1517180102446-f3ece451e9d8", // code matrix
    "1542831371-29b0f74f9713", // dev
  ],
  security: [
    "1518770660439-4636190af475", // circuit board / tech
    "1555949963-aa79dcee981c", // cybersecurity
    "1563986768609-322da13575f3", // lock security
    "1614064641938-3bbee52942c7", // security code
  ],
  maintenance: [
    "1517245386807-bb43f82c33c4", // ops dashboard
    "1542831371-29b0f74f9713", // dev tools
    "1555066931-4365d14bab8c", // code repair
    "1461749280684-dccba630e2f6", // fixing code
  ],
}

/** Stable, fast string hash (djb2-ish) — used for deterministic pool picks. */
function hashSlug(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/**
 * Build a category-matched hero-banner URL. Picks deterministically from
 * a per-L1 curated Unsplash pool, so every L1/L2/L3 page within the same
 * category shows an on-theme image and sibling subcategories get visually
 * distinct-but-related banners.
 */
const heroBannerFor = (
  l1Slug: string,
  l2Slug: string = "",
  l3Slug: string = ""
): string => {
  const pool = L1_BANNER_POOL[l1Slug]
  if (pool && pool.length > 0) {
    const seed = [l1Slug, l2Slug, l3Slug].filter(Boolean).join("-") || l1Slug
    const idx = hashSlug(seed) % pool.length
    return unsplash(pool[idx])
  }
  // Unknown L1 — fall back to the taxonomy's hero image if any category
  // entry matches, otherwise a neutral, on-brand workspace photo.
  return unsplash("1519389950473-47ba0277781c")
}

interface CategoryMeta {
  name: string
  slug: string
  description: string
  heroImage: string
  subcategories: SubcategoryData[]
}

const marketplaceTabs = [
  "Featured",
  "Newest",
  "Most Popular",
  "Trending",
  "Top-Rated",
  "Best-Sellers",
]

const marketplaceTalentTabs = [
  "Featured",
  "Newest",
  "Most Popular",
  "Trending",
  "Top-Rated",
]

const serviceCardMocks = serviceSeeds

function scopeSeedItems<T extends { categorySlugs?: string[] }>(
  items: T[],
  activeCategorySlugs: string[]
) {
  for (const slug of [...activeCategorySlugs].reverse()) {
    const scoped = items.filter((item) => item.categorySlugs?.includes(slug))
    if (scoped.length > 0) return scoped
  }

  return items
}

const browseSkillMocks = [
  "Python",
  "Android",
  "Java",
  "DevOps",
  "C++",
  "JavaScript",
  "Blockchain",
  "SQL",
  "Data Structures",
  "Algorithms",
  "Market Research",
  "Data Visualization",
  "AWS",
  "Azure",
  "Infrastructure as Code",
]

const topTalentMock = talentSeeds

function TopTalentCard({ talent }: { talent: (typeof topTalentMock)[number] }) {
  const profileHref = `/talent-profile?username=${encodeURIComponent(talent.username)}`

  return (
    <article className="relative flex min-h-[448px] cursor-pointer flex-col overflow-hidden rounded-lg border border-gray-200 bg-white text-dark-blue-400 shadow-[0px_1px_2px_0px_rgba(16,24,40,.04)]">
      <NextLink
        href={profileHref}
        aria-label={`View ${talent.username} profile`}
        className="absolute inset-0 z-[1] rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#306CFE]"
      />
      <div className="relative mx-5 mt-5 h-[150px] overflow-hidden rounded-md bg-gray-100">
        <NextImage
          src={talent.photo}
          alt={`${talent.username} profile`}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
          className={`object-cover ${talent.status === "away" ? "grayscale" : ""}`}
        />
        <div className="absolute left-4 top-4 z-10 inline-flex h-7 items-center gap-1.5 rounded bg-black/55 px-2.5 text-xs font-bold text-white">
          <Star className="size-3.5 fill-none text-white" />
          All Stars
        </div>
        <FavoriteRoot>
          {({ pressed }) => (
            <TooltipProvider delayDuration={75}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="absolute right-4 top-4 z-20 inline-block">
                    <Favorite
                      className="size-7 text-white hover:text-white data-[state=on]:text-[#306CFE]"
                      starClassName="size-7 stroke-[2]"
                    />
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

      <div
        className={`absolute left-5 top-[151px] z-20 flex size-9 items-center justify-center rounded-full border-4 border-white text-white ${
          talent.status === "away" ? "bg-[#FDB022]" : "bg-[#12B76A]"
        }`}
      >
        {talent.status === "away" ? (
          <Clock className="size-4" />
        ) : (
          <Check className="size-4" />
        )}
      </div>

      <div className="px-5 pb-5 pt-4">
        <p className="text-lg font-bold leading-none text-dark-blue-400">
          {talent.rate}
          <span className="text-sm font-medium">/hr</span>
        </p>
        <div className="mt-5">
          <h2 className="text-base font-bold leading-5 text-dark-blue-400">
            {talent.username}{" "}
            <span className="font-normal text-gray-400">{talent.handle}</span>
          </h2>
          <p className="text-base font-bold leading-5 text-dark-blue-400">
            {talent.role}
          </p>
          <p className="mt-3 text-sm leading-5 text-[#66739A]">
            {talent.experience}
          </p>
        </div>

        <div className="mt-5 flex items-center gap-2 text-xs font-semibold leading-4 text-[#667085]">
          <MarkerPin02 className="size-4 text-[#667085]" />
          <span>{talent.location}</span>
        </div>

        <div className="mt-5 flex h-[30px] items-center">
          <div className="flex h-full items-center gap-1 rounded-l bg-[#F8FAFF] px-2">
            {fromLength(5).map((_, idx) => (
              <Star
                key={idx}
                className="size-[15px] fill-[#306CFE] text-[#306CFE]"
              />
            ))}
            <span className="ml-1 text-sm font-bold leading-none text-dark-blue-400">
              {talent.rating}
            </span>
          </div>
          <div className="flex h-full items-center bg-white px-4 text-sm font-bold leading-none text-dark-blue-400">
            {talent.projects}
          </div>
        </div>
      </div>

      <div className="mt-auto border-t border-gray-200 bg-gray-50 px-4 py-4">
        <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs font-bold leading-5 text-gray-400">
          {talent.skills.map((skill, idx) => (
            <span
              key={`${skill}-${idx}`}
              className={skill === "More..." ? "ml-auto text-gray-600" : ""}
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </article>
  )
}

const CATEGORY_TAXONOMY: Record<string, CategoryMeta> = {
  research: {
    name: "Research",
    slug: "research",
    description:
      "Discover research projects, meet expert analysts, and find the insights you need to succeed.",
    heroImage: unsplash("1532094349884-543bc11b234d"),
    subcategories: [
      {
        name: "Market Research",
        slug: "market-research",
        description:
          "Consumer insights, competitive analysis, and market sizing.",
        children: c(
          "Market Sizing",
          "TAM Analysis",
          "Competitor Mapping",
          "Pricing Research",
          "Go-to-Market Research",
          "Brand Awareness Studies",
          "Channel Research"
        ),
      },
      {
        name: "User Research",
        slug: "user-research",
        description: "Usability testing, interviews, and persona development.",
        children: c(
          "Usability Testing",
          "User Interviews",
          "Persona Development",
          "Journey Mapping",
          "Card Sorting",
          "Tree Testing",
          "Diary Studies"
        ),
      },
      {
        name: "Academic Research",
        slug: "academic-research",
        description:
          "Literature reviews, white papers, and scholarly analysis.",
        children: c(
          "Literature Review",
          "Systematic Review",
          "Meta-Analysis",
          "White Papers",
          "Thesis Support",
          "Citation Management",
          "Peer Review"
        ),
      },
      {
        name: "Clinical Research",
        slug: "clinical-research",
        description:
          "Clinical trials, pharma research, and regulatory compliance.",
        children: c(
          "Clinical Trials",
          "Protocol Design",
          "Regulatory Affairs",
          "Biostatistics",
          "Patient Recruitment",
          "Pharmacovigilance",
          "Medical Writing"
        ),
      },
      {
        name: "Consumer Research",
        slug: "consumer-research",
        description:
          "Behavioral analysis, focus groups, and consumer sentiment.",
        children: c(
          "Focus Groups",
          "Behavioral Analysis",
          "Shopper Insights",
          "Ethnography",
          "Panel Research",
          "Customer Segmentation",
          "Conjoint Analysis"
        ),
      },
      {
        name: "Data Analysis",
        slug: "data-analysis",
        description: "Statistical analysis, data visualization, and reporting.",
        children: c(
          "Statistical Modeling",
          "Regression Analysis",
          "Time Series",
          "A/B Test Analysis",
          "Data Cleaning",
          "Exploratory Analysis",
          "Reporting"
        ),
      },
      {
        name: "Competitive Intelligence",
        slug: "competitive-intelligence",
        description:
          "Competitor tracking, benchmarking, and strategic insights.",
        children: c(
          "Benchmarking",
          "SWOT Analysis",
          "Patent Research",
          "Win-Loss Analysis",
          "Pricing Intelligence",
          "Product Teardowns",
          "Feature Comparison"
        ),
      },
      {
        name: "Survey Research",
        slug: "survey-research",
        description:
          "Survey design, distribution, response analysis, and insights.",
        children: c(
          "Survey Design",
          "Questionnaire Writing",
          "Sampling Strategy",
          "Distribution",
          "Response Analysis",
          "NPS Surveys",
          "CSAT Surveys"
        ),
      },
      {
        name: "Qualitative Research",
        slug: "qualitative-research",
        description:
          "In-depth interviews, focus groups, and ethnographic studies.",
        children: c(
          "In-Depth Interviews",
          "Ethnography",
          "Grounded Theory",
          "Content Analysis",
          "Narrative Analysis",
          "Phenomenology",
          "Thematic Coding"
        ),
      },
      {
        name: "Sentiment Analysis",
        slug: "sentiment-analysis",
        description:
          "Brand monitoring, social listening, and NLP-powered analysis.",
        children: c(
          "Social Listening",
          "Brand Monitoring",
          "Review Mining",
          "NLP Models",
          "Emotion Detection",
          "Aspect-Based Sentiment",
          "Trend Detection"
        ),
      },
      {
        name: "Industry Analysis",
        slug: "industry-analysis",
        description:
          "Industry benchmarking, KPI analysis, and market positioning.",
        children: c(
          "Porter's Five Forces",
          "PESTLE Analysis",
          "Value Chain Analysis",
          "Industry Benchmarking",
          "Market Positioning",
          "Trend Forecasting",
          "Vertical Deep Dives"
        ),
      },
    ],
  },
  "software-development": {
    name: "Software Development",
    slug: "software-development",
    description:
      "Discover exciting projects, meet talented teams, and find the skills you need to succeed.",
    heroImage: unsplash("1461749280684-dccba630e2f6"),
    subcategories: [
      {
        name: "Front-end Development",
        slug: "front-end-development",
        description: "Create the interface that users interact with directly.",
        children: c(
          "React",
          "Vue.js",
          "Angular",
          "Next.js",
          "Svelte",
          "TypeScript",
          "CSS & Tailwind",
          "Accessibility"
        ),
      },
      {
        name: "Back-end Development",
        slug: "back-end-development",
        description: "Build the server logic, APIs, and databases.",
        children: c(
          "Node.js",
          "Python & Django",
          "Ruby on Rails",
          "Go",
          "Java & Spring",
          "GraphQL APIs",
          "REST APIs",
          "Database Design"
        ),
      },
      {
        name: "Mobile Development",
        slug: "mobile-development",
        description: "Native and cross-platform mobile applications.",
        children: c(
          "iOS Swift",
          "Android Kotlin",
          "React Native",
          "Flutter",
          "Ionic",
          "Mobile UI Kits",
          "App Store Optimization",
          "Push Notifications"
        ),
      },
      {
        name: "DevOps & Cloud",
        slug: "devops-cloud",
        description: "Infrastructure, CI/CD, and cloud deployment.",
        children: c(
          "AWS",
          "Google Cloud",
          "Azure",
          "Kubernetes",
          "Docker",
          "Terraform",
          "CI/CD Pipelines",
          "Observability"
        ),
      },
      {
        name: "Blockchain",
        slug: "blockchain",
        description: "Smart contracts, DeFi, and Web3 development.",
        children: c(
          "Solidity",
          "Smart Contract Audits",
          "DeFi Protocols",
          "NFT Platforms",
          "Ethereum",
          "Solana",
          "Layer 2",
          "Wallet Integration"
        ),
      },
      {
        name: "QA & Testing",
        slug: "qa-testing",
        description: "Automated testing, QA strategy, and release quality.",
        children: c(
          "Manual QA",
          "Test Automation",
          "Cypress",
          "Playwright",
          "Load Testing",
          "Security Testing",
          "Mobile QA"
        ),
      },
      {
        name: "Game Development",
        slug: "game-development",
        description: "Unity, Unreal, and indie game development.",
        children: c(
          "Unity",
          "Unreal Engine",
          "Godot",
          "Game Design",
          "Mobile Games",
          "Multiplayer Backends",
          "Game Art"
        ),
      },
      {
        name: "AI & Machine Learning",
        slug: "ai-ml",
        description: "LLM apps, fine-tuning, and ML pipelines.",
        children: c(
          "LLM Apps",
          "Prompt Engineering",
          "Fine-Tuning",
          "RAG Systems",
          "MLOps",
          "Computer Vision",
          "Recommendation Systems"
        ),
      },
      {
        name: "Embedded & IoT",
        slug: "embedded-iot",
        description: "Firmware, edge devices, and connected hardware.",
        children: c(
          "Firmware",
          "Arduino",
          "Raspberry Pi",
          "ESP32",
          "Edge AI",
          "IoT Gateways",
          "Protocol Integration"
        ),
      },
      {
        name: "Desktop Development",
        slug: "desktop-development",
        description: "Native and cross-platform desktop apps.",
        children: c(
          "Electron Apps",
          "Tauri",
          ".NET Desktop",
          "macOS Native",
          "Windows Native",
          "Qt",
          "Linux GTK"
        ),
      },
      {
        name: "Security Engineering",
        slug: "security-engineering",
        description: "Pentesting, audits, and secure coding practices.",
        children: c(
          "Penetration Testing",
          "Secure Code Review",
          "Threat Modeling",
          "SOC 2 Prep",
          "Vulnerability Management",
          "Cloud Security",
          "AppSec"
        ),
      },
      {
        name: "API & Integrations",
        slug: "api-integrations",
        description: "Third-party integrations, webhooks, and middleware.",
        children: c(
          "Stripe Integration",
          "Salesforce Integration",
          "Zapier & Make",
          "Webhooks",
          "OAuth Flows",
          "iPaaS",
          "Middleware"
        ),
      },
    ],
  },
  "design-creative": {
    name: "Design & Creative",
    slug: "design-creative",
    description:
      "Find creative talent for branding, UI/UX, illustration, and visual storytelling.",
    heroImage: unsplash("1558655146-9f40138edfeb"),
    subcategories: [
      {
        name: "UI/UX Design",
        slug: "ui-ux-design",
        description: "User interface and experience design for web and mobile.",
        children: c(
          "Wireframing",
          "Prototyping",
          "Interaction Design",
          "Usability Testing",
          "Design Systems",
          "Mobile UX",
          "Web UX"
        ),
      },
      {
        name: "Graphic Design",
        slug: "graphic-design",
        description: "Visual branding, print design, and marketing materials.",
        children: c(
          "Flyers & Posters",
          "Business Cards",
          "Ad Creatives",
          "Infographics",
          "Merch Design",
          "Social Graphics",
          "Brochures"
        ),
      },
      {
        name: "Illustration",
        slug: "illustration",
        description: "Custom illustrations, icons, and digital art.",
        children: c(
          "Editorial Illustration",
          "Character Design",
          "Icon Sets",
          "Digital Painting",
          "Comic Art",
          "Children's Illustration",
          "Technical Illustration"
        ),
      },
      {
        name: "Motion Design",
        slug: "motion-design",
        description: "Animations, motion graphics, and video effects.",
        children: c(
          "Explainer Videos",
          "Logo Animation",
          "Lottie Animations",
          "Kinetic Typography",
          "VFX",
          "Title Sequences",
          "Motion Branding"
        ),
      },
      {
        name: "Brand Identity",
        slug: "brand-identity",
        description: "Logo design, brand guidelines, and visual systems.",
        children: c(
          "Logo Design",
          "Brand Guidelines",
          "Style Guides",
          "Rebranding",
          "Naming",
          "Visual Identity",
          "Brand Strategy"
        ),
      },
      {
        name: "Web Design",
        slug: "web-design",
        description: "Landing pages, marketing sites, and full website design.",
        children: c(
          "Landing Pages",
          "Marketing Sites",
          "E-commerce Design",
          "Portfolio Sites",
          "Webflow Sites",
          "WordPress Themes"
        ),
      },
      {
        name: "Product Design",
        slug: "product-design",
        description: "End-to-end digital product design and design systems.",
        children: c(
          "SaaS Dashboards",
          "Mobile Apps",
          "Admin Panels",
          "Design Systems",
          "Onboarding Flows",
          "Data Visualization"
        ),
      },
      {
        name: "3D & Animation",
        slug: "3d-animation",
        description: "3D modeling, rendering, and animation.",
        children: c(
          "3D Modeling",
          "Product Rendering",
          "Character Animation",
          "Environment Design",
          "AR/VR Assets",
          "Motion Capture"
        ),
      },
      {
        name: "Photography",
        slug: "photography",
        description: "Product, lifestyle, and commercial photography.",
        children: c(
          "Product Photography",
          "Lifestyle Shoots",
          "Headshots",
          "Event Photography",
          "Real Estate",
          "Food Photography",
          "Photo Retouching"
        ),
      },
      {
        name: "Video Production",
        slug: "video-production",
        description: "Shooting, editing, and post-production.",
        children: c(
          "Video Editing",
          "Color Grading",
          "Cinematography",
          "Documentary",
          "Music Videos",
          "Corporate Video",
          "Sound Design"
        ),
      },
      {
        name: "Presentation Design",
        slug: "presentation-design",
        description: "Pitch decks, keynote slides, and investor presentations.",
        children: c(
          "Pitch Decks",
          "Investor Decks",
          "Sales Decks",
          "Keynote Templates",
          "Google Slides",
          "Webinar Slides"
        ),
      },
      {
        name: "Print & Packaging",
        slug: "print-packaging",
        description: "Brochures, labels, and packaging design.",
        children: c(
          "Magazine Layout",
          "Book Design",
          "Box Design",
          "Label Design",
          "Poster Design",
          "Annual Reports"
        ),
      },
    ],
  },
  design: {
    name: "Design",
    slug: "design",
    description:
      "Find world-class designers for branding, product, web, UX, illustration, and everything in between.",
    heroImage: unsplash("1558655146-9f40138edfeb"),
    subcategories: [
      {
        name: "UI/UX Design",
        slug: "ui-ux-design",
        description: "User interface and experience design for web and mobile.",
        children: c(
          "Wireframing",
          "Prototyping",
          "Interaction Design",
          "Usability Testing",
          "Information Architecture",
          "Mobile UX",
          "Web UX",
          "Accessibility"
        ),
      },
      {
        name: "Web Design",
        slug: "web-design",
        description: "Landing pages, marketing sites, and full website design.",
        children: c(
          "Landing Pages",
          "Marketing Sites",
          "E-commerce Design",
          "Portfolio Sites",
          "Blog Design",
          "Webflow Sites",
          "WordPress Themes"
        ),
      },
      {
        name: "Product Design",
        slug: "product-design",
        description: "End-to-end digital product design and design systems.",
        children: c(
          "SaaS Dashboards",
          "Mobile Apps",
          "Admin Panels",
          "Design Systems",
          "Onboarding Flows",
          "Data Visualization",
          "B2B Products"
        ),
      },
      {
        name: "Graphic Design",
        slug: "graphic-design",
        description: "Visual branding, print design, and marketing materials.",
        children: c(
          "Flyers & Posters",
          "Business Cards",
          "Ad Creatives",
          "Infographics",
          "Merch Design",
          "Social Graphics",
          "Brochures"
        ),
      },
      {
        name: "Brand Identity",
        slug: "brand-identity",
        description: "Logo design, brand guidelines, and visual systems.",
        children: c(
          "Logo Design",
          "Brand Guidelines",
          "Style Guides",
          "Rebranding",
          "Naming",
          "Visual Identity",
          "Brand Strategy"
        ),
      },
      {
        name: "Illustration",
        slug: "illustration",
        description: "Custom illustrations, icons, and digital art.",
        children: c(
          "Editorial Illustration",
          "Character Design",
          "Icon Sets",
          "Digital Painting",
          "Comic Art",
          "Children's Illustration",
          "Technical Illustration"
        ),
      },
      {
        name: "Motion Design",
        slug: "motion-design",
        description: "Animations, motion graphics, and video effects.",
        children: c(
          "Explainer Videos",
          "Logo Animation",
          "Lottie Animations",
          "Kinetic Typography",
          "VFX",
          "Title Sequences",
          "Motion Branding"
        ),
      },
      {
        name: "3D Design",
        slug: "3d-design",
        description: "3D modeling, rendering, and immersive visuals.",
        children: c(
          "3D Modeling",
          "Product Rendering",
          "Architectural Viz",
          "Character Modeling",
          "Environment Design",
          "AR/VR Assets",
          "3D Printing"
        ),
      },
      {
        name: "Packaging Design",
        slug: "packaging-design",
        description: "Product packaging, labels, and unboxing experiences.",
        children: c(
          "Box Design",
          "Label Design",
          "Bottle Design",
          "Food Packaging",
          "Cosmetic Packaging",
          "Dieline Design",
          "Unboxing Experience"
        ),
      },
      {
        name: "Presentation Design",
        slug: "presentation-design",
        description: "Pitch decks, keynote slides, and investor presentations.",
        children: c(
          "Pitch Decks",
          "Investor Decks",
          "Sales Decks",
          "Keynote Templates",
          "Google Slides",
          "Conference Talks",
          "Webinar Slides"
        ),
      },
      {
        name: "Print Design",
        slug: "print-design",
        description: "Brochures, posters, magazines, and print collateral.",
        children: c(
          "Magazine Layout",
          "Book Design",
          "Catalog Design",
          "Poster Design",
          "Brochure Design",
          "Annual Reports",
          "Stationery"
        ),
      },
      {
        name: "Design Systems",
        slug: "design-systems",
        description:
          "Component libraries, tokens, and scalable UI foundations.",
        children: c(
          "Component Libraries",
          "Design Tokens",
          "Figma Libraries",
          "Storybook Setup",
          "Accessibility Audit",
          "Theming",
          "Documentation"
        ),
      },
    ],
  },
  marketing: {
    name: "Marketing",
    slug: "marketing",
    description:
      "Grow your brand with expert marketers, strategists, and campaign specialists.",
    heroImage: unsplash("1557838923-2985c318be48"),
    subcategories: [
      {
        name: "Digital Marketing",
        slug: "digital-marketing",
        description: "SEO, SEM, social media, and online advertising.",
        children: c(
          "Google Ads",
          "Meta Ads",
          "TikTok Ads",
          "LinkedIn Ads",
          "Display Advertising",
          "Retargeting",
          "Programmatic",
          "Affiliate Marketing"
        ),
      },
      {
        name: "Content Marketing",
        slug: "content-marketing",
        description: "Blog posts, whitepapers, and content strategy.",
        children: c(
          "Blog Writing",
          "Whitepapers",
          "Case Studies",
          "E-books",
          "Content Strategy",
          "Editorial Calendars",
          "SEO Content"
        ),
      },
      {
        name: "Email Marketing",
        slug: "email-marketing",
        description: "Campaigns, automation, and newsletter strategy.",
        children: c(
          "Campaign Design",
          "Newsletter Setup",
          "Drip Automation",
          "Transactional Emails",
          "List Segmentation",
          "A/B Testing",
          "Deliverability"
        ),
      },
      {
        name: "Social Media",
        slug: "social-media",
        description: "Social strategy, community management, and growth.",
        children: c(
          "Instagram Growth",
          "TikTok Strategy",
          "LinkedIn B2B",
          "Community Management",
          "Influencer Outreach",
          "Content Calendars",
          "Social Analytics"
        ),
      },
      {
        name: "Analytics & SEO",
        slug: "analytics-seo",
        description:
          "Performance tracking, keyword research, and optimization.",
        children: c(
          "Keyword Research",
          "On-Page SEO",
          "Technical SEO",
          "Link Building",
          "GA4 Setup",
          "Tag Manager",
          "Conversion Tracking"
        ),
      },
      {
        name: "Brand Marketing",
        slug: "brand-marketing",
        description: "Brand positioning, storytelling, and campaigns.",
        children: c(
          "Brand Positioning",
          "Messaging Frameworks",
          "Storytelling",
          "Campaign Strategy",
          "Brand Audits",
          "Tone of Voice"
        ),
      },
      {
        name: "Growth Marketing",
        slug: "growth-marketing",
        description: "Experimentation, funnels, and conversion optimization.",
        children: c(
          "Funnel Optimization",
          "A/B Testing",
          "Activation",
          "Retention",
          "Referral Loops",
          "PLG Strategy"
        ),
      },
      {
        name: "Performance Marketing",
        slug: "performance-marketing",
        description: "Paid acquisition and ROAS optimization.",
        children: c(
          "Paid Search",
          "Paid Social",
          "Creative Testing",
          "Attribution",
          "LTV Modeling",
          "ROAS Optimization"
        ),
      },
      {
        name: "Influencer Marketing",
        slug: "influencer-marketing",
        description: "Influencer sourcing, outreach, and campaign management.",
        children: c(
          "Creator Sourcing",
          "Outreach",
          "Contract Negotiation",
          "Campaign Management",
          "UGC Campaigns",
          "Affiliate Programs"
        ),
      },
      {
        name: "PR & Communications",
        slug: "pr-communications",
        description: "Press, media relations, and corporate comms.",
        children: c(
          "Press Releases",
          "Media Relations",
          "Crisis Comms",
          "Investor Relations",
          "Internal Comms",
          "Speechwriting"
        ),
      },
      {
        name: "Product Marketing",
        slug: "product-marketing",
        description: "Launches, positioning, and GTM for product teams.",
        children: c(
          "Launch Plans",
          "Positioning",
          "Messaging",
          "Competitive Analysis",
          "Sales Enablement",
          "Customer Research"
        ),
      },
      {
        name: "Event Marketing",
        slug: "event-marketing",
        description: "Conferences, webinars, and activations.",
        children: c(
          "Conference Planning",
          "Webinars",
          "Trade Shows",
          "Field Marketing",
          "Activations",
          "Sponsorships"
        ),
      },
    ],
  },
  "data-analytics": {
    name: "Data & Analytics",
    slug: "data-analytics",
    description:
      "Turn data into decisions with expert analysts, engineers, and data scientists.",
    heroImage: unsplash("1551288049-bebda4e38f71"),
    subcategories: [
      {
        name: "Data Engineering",
        slug: "data-engineering",
        description: "Pipelines, ETL, and data infrastructure.",
        children: c(
          "ETL Pipelines",
          "Airflow",
          "dbt",
          "Data Warehousing",
          "Snowflake",
          "BigQuery",
          "Streaming Pipelines",
          "Data Lakes"
        ),
      },
      {
        name: "Data Science",
        slug: "data-science",
        description: "Machine learning, modeling, and predictive analytics.",
        children: c(
          "Predictive Modeling",
          "Classification",
          "Clustering",
          "Recommendation Systems",
          "NLP",
          "Computer Vision",
          "Forecasting",
          "Feature Engineering"
        ),
      },
      {
        name: "Business Intelligence",
        slug: "business-intelligence",
        description: "Dashboards, reporting, and KPI tracking.",
        children: c(
          "Tableau Dashboards",
          "Power BI",
          "Looker",
          "KPI Frameworks",
          "Executive Reports",
          "Self-Service BI",
          "SQL Reporting"
        ),
      },
      {
        name: "Data Visualization",
        slug: "data-visualization",
        description: "Charts, infographics, and interactive dashboards.",
        children: c(
          "D3.js Charts",
          "Interactive Dashboards",
          "Infographics",
          "Chart Design",
          "Data Storytelling",
          "Geospatial Viz",
          "Real-Time Dashboards"
        ),
      },
      {
        name: "Big Data",
        slug: "big-data",
        description: "Large-scale data processing and distributed systems.",
        children: c(
          "Apache Spark",
          "Hadoop",
          "Kafka",
          "Distributed Storage",
          "Stream Processing",
          "Data Partitioning",
          "Performance Tuning"
        ),
      },
      {
        name: "Machine Learning",
        slug: "machine-learning",
        description: "Model development, training, and deployment.",
        children: c(
          "Model Training",
          "Hyperparameter Tuning",
          "Model Serving",
          "Experiment Tracking",
          "Feature Stores",
          "Model Evaluation"
        ),
      },
      {
        name: "MLOps",
        slug: "mlops",
        description:
          "Productionizing ML with reliable pipelines and monitoring.",
        children: c(
          "Model Deployment",
          "Model Monitoring",
          "Drift Detection",
          "CI/CD for ML",
          "Model Registry",
          "Feature Pipelines"
        ),
      },
      {
        name: "Data Strategy",
        slug: "data-strategy",
        description: "Data governance, architecture, and roadmaps.",
        children: c(
          "Data Governance",
          "Data Catalogs",
          "Data Architecture",
          "Data Roadmaps",
          "Data Maturity Audits",
          "Privacy Compliance"
        ),
      },
      {
        name: "Product Analytics",
        slug: "product-analytics",
        description: "Funnels, retention, and product experimentation.",
        children: c(
          "Event Tracking",
          "Funnel Analysis",
          "Retention Analysis",
          "Cohort Analysis",
          "Amplitude",
          "Mixpanel",
          "Heap"
        ),
      },
      {
        name: "Marketing Analytics",
        slug: "marketing-analytics",
        description: "Attribution, LTV, and channel performance.",
        children: c(
          "Multi-Touch Attribution",
          "LTV Modeling",
          "Media Mix Modeling",
          "Channel Analysis",
          "Cohort Reporting",
          "Campaign Analytics"
        ),
      },
      {
        name: "Finance Analytics",
        slug: "finance-analytics",
        description:
          "Financial reporting, modeling, and forecasting analytics.",
        children: c(
          "FP&A Modeling",
          "Revenue Forecasting",
          "Cohort Economics",
          "Financial Reporting",
          "Cash Flow Modeling",
          "Budget Variance"
        ),
      },
      {
        name: "Geospatial Analytics",
        slug: "geospatial-analytics",
        description: "Mapping, routing, and location intelligence.",
        children: c(
          "GIS Analysis",
          "Mapbox",
          "Routing",
          "Geocoding",
          "Location Intelligence",
          "Spatial Clustering"
        ),
      },
    ],
  },
  writing: {
    name: "Writing & Content",
    slug: "writing",
    description:
      "Find skilled writers for copywriting, technical documentation, and creative content.",
    heroImage: unsplash("1455390582262-044cdead277a"),
    subcategories: [
      {
        name: "Copywriting",
        slug: "copywriting",
        description: "Marketing copy, ad copy, and persuasive writing.",
        children: c(
          "Website Copy",
          "Ad Copy",
          "Sales Pages",
          "Product Descriptions",
          "Taglines",
          "Email Copy",
          "Brand Voice"
        ),
      },
      {
        name: "Technical Writing",
        slug: "technical-writing",
        description: "Documentation, API guides, and knowledge bases.",
        children: c(
          "API Documentation",
          "Developer Guides",
          "Knowledge Bases",
          "User Manuals",
          "Release Notes",
          "Tutorials",
          "Architecture Docs"
        ),
      },
      {
        name: "Creative Writing",
        slug: "creative-writing",
        description: "Storytelling, scripts, and editorial content.",
        children: c(
          "Short Stories",
          "Screenwriting",
          "Video Scripts",
          "Podcast Scripts",
          "Children's Books",
          "Fiction Editing",
          "Ghostwriting"
        ),
      },
      {
        name: "Translation",
        slug: "translation",
        description: "Localization, multilingual content, and transcription.",
        children: c(
          "Website Localization",
          "App Localization",
          "Subtitling",
          "Transcription",
          "Document Translation",
          "Legal Translation",
          "Marketing Translation"
        ),
      },
      {
        name: "Editing & Proofreading",
        slug: "editing-proofreading",
        description: "Quality assurance for written content.",
        children: c(
          "Copyediting",
          "Line Editing",
          "Developmental Editing",
          "Proofreading",
          "Fact Checking",
          "Style Guide Enforcement",
          "Academic Editing"
        ),
      },
      {
        name: "Content Strategy",
        slug: "content-strategy",
        description: "Editorial planning, content audits, and messaging.",
        children: c(
          "Content Audits",
          "Editorial Calendars",
          "Style Guides",
          "Messaging Frameworks",
          "Topic Clusters",
          "Content Governance"
        ),
      },
      {
        name: "SEO Writing",
        slug: "seo-writing",
        description: "Keyword-optimized content built to rank.",
        children: c(
          "Blog Articles",
          "Pillar Pages",
          "Product SEO",
          "Keyword Research",
          "Content Briefs",
          "Internal Linking"
        ),
      },
      {
        name: "Ghostwriting",
        slug: "ghostwriting",
        description: "Thought leadership, books, and bylines.",
        children: c(
          "Thought Leadership",
          "LinkedIn Posts",
          "Book Writing",
          "Memoirs",
          "Speeches",
          "Executive Bylines"
        ),
      },
      {
        name: "Scriptwriting",
        slug: "scriptwriting",
        description: "Scripts for video, podcast, and broadcast.",
        children: c(
          "YouTube Scripts",
          "Podcast Scripts",
          "Explainer Scripts",
          "TV Scripts",
          "Film Scripts",
          "Ad Scripts"
        ),
      },
      {
        name: "Academic & Research Writing",
        slug: "academic-research-writing",
        description: "Research papers, theses, and journal submissions.",
        children: c(
          "Research Papers",
          "Thesis Writing",
          "Literature Reviews",
          "Journal Submissions",
          "Grant Proposals",
          "Dissertation Support"
        ),
      },
      {
        name: "Grant & Proposal Writing",
        slug: "grant-proposal-writing",
        description: "RFPs, grants, and winning business proposals.",
        children: c(
          "Grant Applications",
          "RFP Responses",
          "Business Proposals",
          "Fundraising Letters",
          "Case Statements",
          "Sponsorship Proposals"
        ),
      },
      {
        name: "UX Writing",
        slug: "ux-writing",
        description: "Microcopy for interfaces, onboarding, and error states.",
        children: c(
          "Microcopy",
          "Onboarding Copy",
          "Error Messages",
          "Notifications",
          "Empty States",
          "In-Product Education"
        ),
      },
    ],
  },
  "business-consulting": {
    name: "Business & Consulting",
    slug: "business-consulting",
    description:
      "Strategic advice, project management, and operational expertise for your business.",
    heroImage: unsplash("1454165804606-c3d57bc86b40"),
    subcategories: [
      {
        name: "Strategy Consulting",
        slug: "strategy-consulting",
        description: "Business strategy, go-to-market, and growth planning.",
        children: c(
          "Go-to-Market",
          "Growth Strategy",
          "Business Model Design",
          "Competitive Strategy",
          "Vision & Mission",
          "Strategic Planning",
          "OKR Design"
        ),
      },
      {
        name: "Project Management",
        slug: "project-management",
        description: "Agile, Scrum, and project delivery.",
        children: c(
          "Agile Coaching",
          "Scrum Master",
          "Kanban",
          "PMO Setup",
          "Project Recovery",
          "Roadmap Planning",
          "Risk Management"
        ),
      },
      {
        name: "Financial Consulting",
        slug: "financial-consulting",
        description: "Financial modeling, budgeting, and forecasting.",
        children: c(
          "Financial Modeling",
          "Budgeting",
          "Forecasting",
          "Valuation",
          "Cap Tables",
          "Fundraising",
          "Unit Economics"
        ),
      },
      {
        name: "HR & Recruiting",
        slug: "hr-recruiting",
        description: "Talent acquisition, org design, and people ops.",
        children: c(
          "Technical Recruiting",
          "Executive Search",
          "Org Design",
          "Compensation Planning",
          "Onboarding Programs",
          "HR Policies",
          "Performance Management"
        ),
      },
      {
        name: "Legal & Compliance",
        slug: "legal-compliance",
        description: "Contracts, regulatory compliance, and legal ops.",
        children: c(
          "Contract Drafting",
          "IP & Trademarks",
          "Privacy & GDPR",
          "Terms of Service",
          "NDA Templates",
          "Regulatory Filings",
          "Compliance Audits"
        ),
      },
      {
        name: "Operations Consulting",
        slug: "operations-consulting",
        description: "Process design, supply chain, and efficiency.",
        children: c(
          "Process Optimization",
          "Supply Chain",
          "Lean Six Sigma",
          "SOP Development",
          "Workflow Automation",
          "Vendor Management"
        ),
      },
      {
        name: "Sales Consulting",
        slug: "sales-consulting",
        description: "Sales strategy, enablement, and revenue ops.",
        children: c(
          "Sales Playbooks",
          "CRM Implementation",
          "Sales Enablement",
          "Outbound Strategy",
          "Revenue Operations",
          "Pipeline Management"
        ),
      },
      {
        name: "Customer Success",
        slug: "customer-success",
        description: "Onboarding, retention, and account management programs.",
        children: c(
          "Onboarding Programs",
          "Retention Strategy",
          "QBR Frameworks",
          "Health Scoring",
          "Playbook Design",
          "CS Tooling"
        ),
      },
      {
        name: "Business Analysis",
        slug: "business-analysis",
        description: "Requirements gathering and process modeling.",
        children: c(
          "Requirements Gathering",
          "Process Mapping",
          "Gap Analysis",
          "Stakeholder Interviews",
          "Use Case Modeling",
          "BPMN Diagrams"
        ),
      },
      {
        name: "Change Management",
        slug: "change-management",
        description: "Transformation programs and org change.",
        children: c(
          "Org Transformation",
          "Change Communications",
          "Training Programs",
          "Adoption Strategy",
          "Culture Change",
          "Executive Alignment"
        ),
      },
      {
        name: "Accounting & Bookkeeping",
        slug: "accounting-bookkeeping",
        description: "Bookkeeping, tax, and accounting services.",
        children: c(
          "Bookkeeping",
          "Tax Preparation",
          "Month-End Close",
          "Payroll",
          "AP/AR Management",
          "QuickBooks Setup"
        ),
      },
      {
        name: "Executive Coaching",
        slug: "executive-coaching",
        description: "Leadership development and executive coaching.",
        children: c(
          "Leadership Coaching",
          "Founder Coaching",
          "Team Coaching",
          "Conflict Resolution",
          "Career Coaching",
          "360 Reviews"
        ),
      },
    ],
  },
  development: {
    name: "Development",
    slug: "development",
    description:
      "Build software with expert engineers across web, mobile, cloud, and emerging tech.",
    heroImage: unsplash("1461749280684-dccba630e2f6"),
    subcategories: [
      {
        name: "Web Development",
        slug: "web-development",
        description:
          "Full-stack web apps, marketing sites, and SaaS platforms.",
        children: c(
          "React",
          "Next.js",
          "Vue.js",
          "Angular",
          "Svelte",
          "Node.js",
          "Ruby on Rails",
          "Django"
        ),
      },
      {
        name: "Mobile Development",
        slug: "mobile-development",
        description: "Native and cross-platform iOS and Android apps.",
        children: c(
          "iOS Swift",
          "Android Kotlin",
          "React Native",
          "Flutter",
          "Ionic",
          "Mobile UI Kits",
          "App Store Optimization",
          "Push Notifications"
        ),
      },
      {
        name: "Backend Development",
        slug: "backend-development",
        description: "APIs, microservices, and server-side architecture.",
        children: c(
          "REST APIs",
          "GraphQL APIs",
          "Microservices",
          "Database Design",
          "Node.js",
          "Python",
          "Go",
          "Java"
        ),
      },
      {
        name: "Frontend Development",
        slug: "frontend-development",
        description: "User interfaces, animations, and accessibility.",
        children: c(
          "React",
          "Vue.js",
          "Angular",
          "TypeScript",
          "CSS & Tailwind",
          "Animations",
          "Accessibility",
          "Performance"
        ),
      },
      {
        name: "Cloud & DevOps",
        slug: "cloud-devops",
        description: "Infrastructure, CI/CD, and cloud deployment.",
        children: c(
          "AWS",
          "Google Cloud",
          "Azure",
          "Kubernetes",
          "Docker",
          "Terraform",
          "CI/CD Pipelines",
          "Observability"
        ),
      },
      {
        name: "Game Development",
        slug: "game-development",
        description: "Unity, Unreal, and indie game development.",
        children: c(
          "Unity",
          "Unreal Engine",
          "Godot",
          "Game Design",
          "Mobile Games",
          "Multiplayer Backends",
          "Game Art"
        ),
      },
      {
        name: "AI & Machine Learning",
        slug: "ai-ml",
        description: "LLM apps, fine-tuning, and ML pipelines.",
        children: c(
          "LLM Apps",
          "Prompt Engineering",
          "Fine-Tuning",
          "RAG Systems",
          "MLOps",
          "Computer Vision",
          "Recommendation Systems"
        ),
      },
      {
        name: "Blockchain & Web3",
        slug: "blockchain-web3",
        description: "Smart contracts, DeFi, and NFT platforms.",
        children: c(
          "Solidity",
          "Smart Contract Audits",
          "DeFi Protocols",
          "NFT Platforms",
          "Ethereum",
          "Solana",
          "Wallet Integration"
        ),
      },
      {
        name: "Embedded & IoT",
        slug: "embedded-iot",
        description: "Firmware, edge devices, and connected hardware.",
        children: c(
          "Firmware",
          "Arduino",
          "Raspberry Pi",
          "ESP32",
          "Edge AI",
          "IoT Gateways",
          "Protocol Integration"
        ),
      },
      {
        name: "Desktop Apps",
        slug: "desktop-apps",
        description: "Native and cross-platform desktop apps.",
        children: c(
          "Electron Apps",
          "Tauri",
          ".NET Desktop",
          "macOS Native",
          "Windows Native",
          "Qt",
          "Linux GTK"
        ),
      },
      {
        name: "API & Integrations",
        slug: "api-integrations",
        description: "Third-party integrations, webhooks, and middleware.",
        children: c(
          "Stripe Integration",
          "Salesforce Integration",
          "Zapier & Make",
          "Webhooks",
          "OAuth Flows",
          "iPaaS",
          "Middleware"
        ),
      },
      {
        name: "E-commerce Development",
        slug: "ecommerce-development",
        description: "Shopify, WooCommerce, and custom storefronts.",
        children: c(
          "Shopify",
          "WooCommerce",
          "BigCommerce",
          "Magento",
          "Custom Storefronts",
          "Headless Commerce",
          "Payment Integration"
        ),
      },
    ],
  },
  testing: {
    name: "Testing & QA",
    slug: "testing",
    description:
      "Ship with confidence — manual QA, test automation, and release quality at every layer.",
    heroImage: unsplash("1454165804606-c3d57bc86b40"),
    subcategories: [
      {
        name: "Manual QA",
        slug: "manual-qa",
        description: "Exploratory testing, regression, and release QA.",
        children: c(
          "Exploratory Testing",
          "Regression Testing",
          "Release QA",
          "Bug Reporting",
          "Cross-Browser Testing",
          "Mobile QA"
        ),
      },
      {
        name: "Test Automation",
        slug: "test-automation",
        description: "Automated end-to-end and integration suites.",
        children: c(
          "Cypress",
          "Playwright",
          "Selenium",
          "WebdriverIO",
          "TestCafe",
          "Puppeteer",
          "Robot Framework"
        ),
      },
      {
        name: "Performance Testing",
        slug: "performance-testing",
        description: "Load, stress, and capacity testing.",
        children: c(
          "Load Testing",
          "Stress Testing",
          "k6",
          "JMeter",
          "Gatling",
          "Lighthouse Audits",
          "APM Setup"
        ),
      },
      {
        name: "Security Testing",
        slug: "security-testing",
        description: "Pentesting, vulnerability scans, and AppSec.",
        children: c(
          "Penetration Testing",
          "Vulnerability Scanning",
          "OWASP Top 10",
          "API Security",
          "Mobile AppSec",
          "Static Analysis"
        ),
      },
      {
        name: "API Testing",
        slug: "api-testing",
        description: "REST, GraphQL, and contract testing.",
        children: c(
          "REST Testing",
          "GraphQL Testing",
          "Postman Collections",
          "Contract Testing",
          "Pact",
          "Schema Validation"
        ),
      },
      {
        name: "Mobile Testing",
        slug: "mobile-testing",
        description: "iOS and Android test strategy and automation.",
        children: c(
          "iOS Testing",
          "Android Testing",
          "Appium",
          "Detox",
          "Espresso",
          "XCUITest",
          "Device Labs"
        ),
      },
      {
        name: "Accessibility Testing",
        slug: "accessibility-testing",
        description: "WCAG audits and assistive-tech compatibility.",
        children: c(
          "WCAG Audits",
          "Screen Reader Testing",
          "Keyboard Navigation",
          "axe Audits",
          "Section 508",
          "ADA Compliance"
        ),
      },
      {
        name: "Usability Testing",
        slug: "usability-testing",
        description: "User testing, moderated sessions, and UX validation.",
        children: c(
          "Moderated Sessions",
          "Unmoderated Testing",
          "User Interviews",
          "First-Click Testing",
          "Task Completion",
          "Remote Testing"
        ),
      },
      {
        name: "QA Strategy",
        slug: "qa-strategy",
        description: "Test planning, QA process, and team coaching.",
        children: c(
          "Test Planning",
          "QA Process Design",
          "Test Case Management",
          "QA Coaching",
          "Shift-Left Testing",
          "Quality Metrics"
        ),
      },
      {
        name: "CI/CD Quality Gates",
        slug: "ci-cd-quality-gates",
        description: "Build pipelines, test gating, and release checks.",
        children: c(
          "GitHub Actions",
          "GitLab CI",
          "CircleCI",
          "Jenkins",
          "Test Reporting",
          "Coverage Gates",
          "Flaky Test Triage"
        ),
      },
    ],
  },
  security: {
    name: "Security",
    slug: "security",
    description:
      "Harden applications, infrastructure, and processes with expert security practitioners.",
    heroImage: unsplash("1518770660439-4636190af475"),
    subcategories: [
      {
        name: "Application Security",
        slug: "application-security",
        description: "Secure coding, code review, and AppSec programs.",
        children: c(
          "Secure Code Review",
          "Threat Modeling",
          "SAST",
          "DAST",
          "Dependency Scanning",
          "Secret Scanning",
          "AppSec Programs"
        ),
      },
      {
        name: "Penetration Testing",
        slug: "penetration-testing",
        description: "Red team, external, and internal pentests.",
        children: c(
          "Web Pentesting",
          "API Pentesting",
          "Mobile Pentesting",
          "Network Pentesting",
          "Red Team Exercises",
          "Social Engineering"
        ),
      },
      {
        name: "Cloud Security",
        slug: "cloud-security",
        description: "AWS, GCP, Azure configuration and posture.",
        children: c(
          "AWS Security",
          "GCP Security",
          "Azure Security",
          "IAM Design",
          "CSPM",
          "CNAPP",
          "Kubernetes Hardening"
        ),
      },
      {
        name: "Compliance & Audits",
        slug: "compliance-audits",
        description: "SOC 2, ISO 27001, HIPAA, PCI, and more.",
        children: c(
          "SOC 2 Prep",
          "ISO 27001",
          "HIPAA",
          "PCI DSS",
          "GDPR",
          "FedRAMP",
          "Audit Remediation"
        ),
      },
      {
        name: "Identity & Access",
        slug: "identity-access",
        description: "SSO, MFA, RBAC, and identity architecture.",
        children: c(
          "SSO Integration",
          "MFA Rollout",
          "RBAC Design",
          "OAuth/OIDC",
          "SAML",
          "Zero Trust",
          "Identity Federation"
        ),
      },
      {
        name: "Incident Response",
        slug: "incident-response",
        description: "IR planning, tabletop exercises, and forensics.",
        children: c(
          "IR Playbooks",
          "Tabletop Exercises",
          "Forensics",
          "Breach Response",
          "Post-Incident Review",
          "Threat Hunting"
        ),
      },
      {
        name: "Security Operations",
        slug: "security-operations",
        description: "SOC, SIEM, detection engineering, and monitoring.",
        children: c(
          "SIEM Setup",
          "Detection Engineering",
          "SOC Operations",
          "Alert Tuning",
          "Log Pipelines",
          "Threat Intelligence"
        ),
      },
      {
        name: "DevSecOps",
        slug: "devsecops",
        description: "Security in CI/CD and developer workflows.",
        children: c(
          "CI/CD Security",
          "Container Scanning",
          "IaC Scanning",
          "Policy as Code",
          "Supply Chain Security",
          "SBOM"
        ),
      },
      {
        name: "Network Security",
        slug: "network-security",
        description: "Firewalls, segmentation, VPNs, and zero trust.",
        children: c(
          "Firewall Design",
          "Network Segmentation",
          "VPN Setup",
          "IDS/IPS",
          "Zero Trust Networking",
          "DDoS Protection"
        ),
      },
      {
        name: "Security Training",
        slug: "security-training",
        description: "Secure coding and awareness training.",
        children: c(
          "Secure Coding Training",
          "Phishing Simulations",
          "Awareness Programs",
          "Tabletop Training",
          "Workshop Delivery"
        ),
      },
    ],
  },
  maintenance: {
    name: "Maintenance & Support",
    slug: "maintenance",
    description:
      "Keep your product healthy, up-to-date, and reliable with ongoing support and maintenance.",
    heroImage: unsplash("1517245386807-bb43f82c33c4"),
    subcategories: [
      {
        name: "Bug Fixes",
        slug: "bug-fixes",
        description: "Triage and fix bugs across web, mobile, and backend.",
        children: c(
          "Web Bug Fixes",
          "Mobile Bug Fixes",
          "Backend Bug Fixes",
          "CSS Issues",
          "Cross-Browser Fixes",
          "Hotfix Support"
        ),
      },
      {
        name: "Dependency Updates",
        slug: "dependency-updates",
        description: "Package upgrades, security patches, and migrations.",
        children: c(
          "NPM Upgrades",
          "Python Upgrades",
          "Framework Migrations",
          "Security Patching",
          "Breaking Change Fixes",
          "Lockfile Audits"
        ),
      },
      {
        name: "Performance Tuning",
        slug: "performance-tuning",
        description: "Frontend, backend, and database optimization.",
        children: c(
          "Frontend Perf",
          "Backend Perf",
          "Database Tuning",
          "Caching Strategy",
          "CDN Setup",
          "Core Web Vitals"
        ),
      },
      {
        name: "Refactoring",
        slug: "refactoring",
        description: "Code cleanup, tech debt, and architecture updates.",
        children: c(
          "Code Cleanup",
          "Tech Debt Paydown",
          "Architecture Refactor",
          "Test Coverage",
          "Legacy Modernization",
          "Module Splitting"
        ),
      },
      {
        name: "WordPress Maintenance",
        slug: "wordpress-maintenance",
        description: "WordPress updates, backups, and security.",
        children: c(
          "Plugin Updates",
          "Core Updates",
          "Backups",
          "Malware Removal",
          "Theme Customization",
          "Speed Optimization"
        ),
      },
      {
        name: "Shopify Maintenance",
        slug: "shopify-maintenance",
        description: "Theme updates, app integrations, and store health.",
        children: c(
          "Theme Updates",
          "App Integrations",
          "Liquid Edits",
          "Checkout Fixes",
          "Performance Audits",
          "SEO Fixes"
        ),
      },
      {
        name: "Server & Uptime",
        slug: "server-uptime",
        description: "Monitoring, on-call, and infrastructure support.",
        children: c(
          "Uptime Monitoring",
          "On-Call Support",
          "Log Monitoring",
          "Alerting Setup",
          "Incident Response",
          "Backup Strategy"
        ),
      },
      {
        name: "Database Maintenance",
        slug: "database-maintenance",
        description: "Index tuning, migrations, and backup strategy.",
        children: c(
          "Index Tuning",
          "Query Optimization",
          "Backup Strategy",
          "Migrations",
          "Replication Setup",
          "Disaster Recovery"
        ),
      },
      {
        name: "Content Updates",
        slug: "content-updates",
        description: "Ongoing content, copy, and media updates.",
        children: c(
          "Copy Edits",
          "Image Updates",
          "Landing Page Updates",
          "Blog Uploads",
          "Translation Updates",
          "CMS Updates"
        ),
      },
      {
        name: "Legacy Code Rescue",
        slug: "legacy-code-rescue",
        description: "Rescue, document, and modernize legacy codebases.",
        children: c(
          "Codebase Audits",
          "Documentation Writing",
          "Dependency Rescue",
          "Modernization Plans",
          "Test Suite Recovery",
          "Developer Onboarding"
        ),
      },
    ],
  },
  "digital-marketing": {
    name: "Digital Marketing",
    slug: "digital-marketing",
    description:
      "Acquire customers and grow revenue with expert digital marketers and performance specialists.",
    heroImage: unsplash("1557838923-2985c318be48"),
    subcategories: [
      {
        name: "Paid Search",
        slug: "paid-search",
        description: "Google Ads, Bing Ads, and search campaign management.",
        children: c(
          "Google Ads",
          "Bing Ads",
          "Shopping Ads",
          "Performance Max",
          "Keyword Research",
          "Bid Management",
          "Ad Copy Testing"
        ),
      },
      {
        name: "Paid Social",
        slug: "paid-social",
        description: "Meta, TikTok, LinkedIn, and social ad campaigns.",
        children: c(
          "Meta Ads",
          "TikTok Ads",
          "LinkedIn Ads",
          "Pinterest Ads",
          "Snapchat Ads",
          "Creative Testing",
          "Audience Research"
        ),
      },
      {
        name: "SEO",
        slug: "seo",
        description: "On-page, technical, and link-building SEO.",
        children: c(
          "Keyword Research",
          "On-Page SEO",
          "Technical SEO",
          "Link Building",
          "Local SEO",
          "SEO Audits",
          "Content Optimization"
        ),
      },
      {
        name: "Content Marketing",
        slug: "content-marketing",
        description: "Blogs, ebooks, and content strategy.",
        children: c(
          "Blog Writing",
          "Whitepapers",
          "Case Studies",
          "E-books",
          "Content Strategy",
          "Editorial Calendars",
          "SEO Content"
        ),
      },
      {
        name: "Email Marketing",
        slug: "email-marketing",
        description: "Campaigns, automation, and newsletter strategy.",
        children: c(
          "Campaign Design",
          "Newsletter Setup",
          "Drip Automation",
          "Transactional Emails",
          "List Segmentation",
          "A/B Testing",
          "Deliverability"
        ),
      },
      {
        name: "Social Media Management",
        slug: "social-media-management",
        description: "Organic social, community, and content planning.",
        children: c(
          "Instagram Growth",
          "TikTok Strategy",
          "LinkedIn B2B",
          "Community Management",
          "Influencer Outreach",
          "Content Calendars",
          "Social Analytics"
        ),
      },
      {
        name: "Influencer Marketing",
        slug: "influencer-marketing",
        description: "Influencer sourcing, outreach, and campaign ops.",
        children: c(
          "Creator Sourcing",
          "Outreach",
          "Contract Negotiation",
          "Campaign Management",
          "UGC Campaigns",
          "Affiliate Programs"
        ),
      },
      {
        name: "Conversion Optimization",
        slug: "conversion-optimization",
        description: "Landing pages, A/B testing, and funnel optimization.",
        children: c(
          "Landing Page Optimization",
          "A/B Testing",
          "Funnel Analysis",
          "Heatmaps",
          "Session Recordings",
          "CRO Strategy"
        ),
      },
      {
        name: "Analytics & Reporting",
        slug: "analytics-reporting",
        description: "GA4, attribution, dashboards, and reporting.",
        children: c(
          "GA4 Setup",
          "Tag Manager",
          "Attribution",
          "Dashboards",
          "KPI Reporting",
          "Data Studio",
          "Looker Studio"
        ),
      },
      {
        name: "Marketing Automation",
        slug: "marketing-automation",
        description: "HubSpot, Marketo, and lifecycle automation.",
        children: c(
          "HubSpot Workflows",
          "Marketo",
          "Pardot",
          "Braze",
          "Customer.io",
          "Lifecycle Campaigns",
          "Lead Scoring"
        ),
      },
      {
        name: "Affiliate Marketing",
        slug: "affiliate-marketing",
        description: "Affiliate program setup and partner management.",
        children: c(
          "Program Setup",
          "Partner Recruitment",
          "Commission Design",
          "Tracking Setup",
          "Partner Management",
          "Fraud Detection"
        ),
      },
      {
        name: "Video Marketing",
        slug: "video-marketing",
        description: "YouTube strategy, video ads, and short-form content.",
        children: c(
          "YouTube Strategy",
          "Video Ads",
          "Shorts & Reels",
          "Video SEO",
          "Scriptwriting",
          "Thumbnail Design"
        ),
      },
    ],
  },
}

// ── Technologies per category (logos served via cdn.simpleicons.org) ──
interface TechItem {
  name: string
  slug: string
}

const CATEGORY_TECHNOLOGIES: Record<string, TechItem[]> = {
  design: [
    { name: "Figma", slug: "figma" },
    { name: "Sketch", slug: "sketch" },
    { name: "Adobe XD", slug: "adobexd" },
    { name: "Photoshop", slug: "adobephotoshop" },
    { name: "Illustrator", slug: "adobeillustrator" },
    { name: "InDesign", slug: "adobeindesign" },
    { name: "After Effects", slug: "adobeaftereffects" },
    { name: "Framer", slug: "framer" },
    { name: "InVision", slug: "invision" },
    { name: "Webflow", slug: "webflow" },
    { name: "Blender", slug: "blender" },
    { name: "Canva", slug: "canva" },
  ],
  "design-creative": [
    { name: "Figma", slug: "figma" },
    { name: "Sketch", slug: "sketch" },
    { name: "Adobe XD", slug: "adobexd" },
    { name: "Photoshop", slug: "adobephotoshop" },
    { name: "Illustrator", slug: "adobeillustrator" },
    { name: "InDesign", slug: "adobeindesign" },
    { name: "After Effects", slug: "adobeaftereffects" },
    { name: "Framer", slug: "framer" },
    { name: "InVision", slug: "invision" },
    { name: "Webflow", slug: "webflow" },
    { name: "Blender", slug: "blender" },
    { name: "Canva", slug: "canva" },
  ],
  "software-development": [
    { name: "React", slug: "react" },
    { name: "Vue.js", slug: "vuedotjs" },
    { name: "Angular", slug: "angular" },
    { name: "Next.js", slug: "nextdotjs" },
    { name: "Node.js", slug: "nodedotjs" },
    { name: "TypeScript", slug: "typescript" },
    { name: "Python", slug: "python" },
    { name: "Go", slug: "go" },
    { name: "Rust", slug: "rust" },
    { name: "Docker", slug: "docker" },
    { name: "Kubernetes", slug: "kubernetes" },
    { name: "PostgreSQL", slug: "postgresql" },
  ],
  "data-analytics": [
    { name: "Python", slug: "python" },
    { name: "R", slug: "r" },
    { name: "Tableau", slug: "tableau" },
    { name: "Power BI", slug: "powerbi" },
    { name: "Apache Spark", slug: "apachespark" },
    { name: "Snowflake", slug: "snowflake" },
    { name: "Databricks", slug: "databricks" },
    { name: "Jupyter", slug: "jupyter" },
    { name: "Pandas", slug: "pandas" },
    { name: "TensorFlow", slug: "tensorflow" },
    { name: "PyTorch", slug: "pytorch" },
    { name: "PostgreSQL", slug: "postgresql" },
  ],
  marketing: [
    { name: "Google Analytics", slug: "googleanalytics" },
    { name: "HubSpot", slug: "hubspot" },
    { name: "Mailchimp", slug: "mailchimp" },
    { name: "Google Ads", slug: "googleads" },
    { name: "Meta", slug: "meta" },
    { name: "Salesforce", slug: "salesforce" },
    { name: "Semrush", slug: "semrush" },
    { name: "Ahrefs", slug: "ahrefs" },
    { name: "Hootsuite", slug: "hootsuite" },
    { name: "Zapier", slug: "zapier" },
    { name: "Canva", slug: "canva" },
    { name: "Notion", slug: "notion" },
  ],
  writing: [
    { name: "Google Docs", slug: "googledocs" },
    { name: "Notion", slug: "notion" },
    { name: "Grammarly", slug: "grammarly" },
    { name: "WordPress", slug: "wordpress" },
    { name: "Medium", slug: "medium" },
    { name: "Substack", slug: "substack" },
    { name: "Ghost", slug: "ghost" },
    { name: "Contentful", slug: "contentful" },
    { name: "Dropbox Paper", slug: "dropbox" },
    { name: "Evernote", slug: "evernote" },
    { name: "Obsidian", slug: "obsidian" },
    { name: "Scribd", slug: "scribd" },
  ],
  research: [
    { name: "Python", slug: "python" },
    { name: "R", slug: "r" },
    { name: "Jupyter", slug: "jupyter" },
    { name: "Tableau", slug: "tableau" },
    { name: "Pandas", slug: "pandas" },
    { name: "Kaggle", slug: "kaggle" },
    { name: "Google Scholar", slug: "googlescholar" },
    { name: "Mendeley", slug: "mendeley" },
    { name: "Zotero", slug: "zotero" },
    { name: "Overleaf", slug: "overleaf" },
    { name: "LaTeX", slug: "latex" },
    { name: "ORCID", slug: "orcid" },
  ],
  "business-consulting": [
    { name: "Excel", slug: "microsoftexcel" },
    { name: "PowerPoint", slug: "microsoftpowerpoint" },
    { name: "Notion", slug: "notion" },
    { name: "Salesforce", slug: "salesforce" },
    { name: "HubSpot", slug: "hubspot" },
    { name: "Slack", slug: "slack" },
    { name: "Asana", slug: "asana" },
    { name: "Trello", slug: "trello" },
    { name: "Jira", slug: "jira" },
    { name: "Monday", slug: "mondaydotcom" },
    { name: "Airtable", slug: "airtable" },
    { name: "Zoom", slug: "zoom" },
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
type FavoriteEntityType = "project" | "service" | "team" | "talent"

const favoriteKey = (type: FavoriteEntityType, itemId: string) =>
  `${type}:${itemId}`

/**
 * Shared favorite-toggle control used by every card's `favoriteSlot`.
 * Centralizes the FavoriteRoot/Tooltip/Favorite markup.
 */
function FavoriteButton({
  itemId,
  type,
  favoritedItems,
  onToggle,
}: {
  itemId?: string | null
  type: FavoriteEntityType
  favoritedItems: Set<string>
  onToggle: (
    itemId: string,
    type: FavoriteEntityType,
    pressed: boolean
  ) => void
}) {
  const id = itemId ? String(itemId) : undefined
  const key = id ? favoriteKey(type, id) : undefined
  return (
    <FavoriteRoot
      value={key ? favoritedItems.has(key) : false}
      onValueChange={
        id ? (pressed: boolean) => onToggle(id, type, pressed) : undefined
      }
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
  )
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

  /**
   * Page-kind detection — matches the category-service contract
   * (see `backend/apps/category-service/src/app/category-pages/README.md`).
   *
   * URL scheme per docs:
   *   /c/:l1[/:l2[/:l3]]                    → "show-all" page (mixed blocks)
   *   /c/:l1[/:l2[/:l3]]/projects           → kind=projects listing
   *   /c/:l1[/:l2[/:l3]]/services           → kind=services listing
   *   /c/:l1[/:l2[/:l3]]/teams              → kind=teams listing
   *   /c/:l1[/:l2[/:l3]]/talent             → kind=talent listing
   */
  const KIND_SUFFIXES = ["projects", "services", "teams", "talent"] as const
  type PageKind = "show-all" | (typeof KIND_SUFFIXES)[number]
  const lastSegment = category?.[category.length - 1]
  const pageKind: PageKind = (KIND_SUFFIXES as readonly string[]).includes(
    lastSegment
  )
    ? (lastSegment as PageKind)
    : "show-all"
  const hasKindSuffix = pageKind !== "show-all"
  const actualCategory = hasKindSuffix ? category.slice(0, -1) : category
  // Back-compat alias (old name used in a few spots)
  const isProjectsPage = pageKind === "projects"

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
  const [activeTopProjectsTab, setActiveTopProjectsTab] = useState("Featured")
  const [activeTopServicesTab, setActiveTopServicesTab] = useState("Featured")

  const subcategoryScrollRef = useRef<HTMLDivElement>(null)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = subcategoryScrollRef.current
    if (!el) return
    setCanScrollPrev(el.scrollLeft > 0)
    setCanScrollNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])

  useEffect(() => {
    const el = subcategoryScrollRef.current
    if (!el) return
    updateScrollState()
    el.addEventListener("scroll", updateScrollState, { passive: true })
    return () => el.removeEventListener("scroll", updateScrollState)
  }, [updateScrollState])

  const scrollSubcategories = useCallback((direction: "prev" | "next") => {
    const el = subcategoryScrollRef.current
    if (!el) return
    el.scrollBy({
      left: direction === "next" ? el.clientWidth : -el.clientWidth,
      behavior: "smooth",
    })
  }, [])

  const browseTypeScrollRef = useRef<HTMLDivElement>(null)
  const [canScrollPrevBrowseType, setCanScrollPrevBrowseType] = useState(false)
  const [canScrollNextBrowseType, setCanScrollNextBrowseType] = useState(false)

  const updateScrollStateBrowseType = useCallback(() => {
    const el = browseTypeScrollRef.current
    if (!el) return
    setCanScrollPrevBrowseType(el.scrollLeft > 0)
    setCanScrollNextBrowseType(
      el.scrollLeft + el.clientWidth < el.scrollWidth - 1
    )
  }, [])

  useEffect(() => {
    const el = browseTypeScrollRef.current
    if (!el) return
    updateScrollStateBrowseType()
    el.addEventListener("scroll", updateScrollStateBrowseType, {
      passive: true,
    })
    return () => el.removeEventListener("scroll", updateScrollStateBrowseType)
  }, [updateScrollStateBrowseType])

  const scrollBrowseType = useCallback((direction: "prev" | "next") => {
    const el = browseTypeScrollRef.current
    if (!el) return
    el.scrollBy({
      left: direction === "next" ? el.clientWidth : -el.clientWidth,
      behavior: "smooth",
    })
  }, [])

  const skillsScrollRef = useRef<HTMLDivElement>(null)
  const [canScrollPrevSkills, setCanScrollPrevSkills] = useState(false)
  const [canScrollNextSkills, setCanScrollNextSkills] = useState(false)

  const updateScrollStateSkills = useCallback(() => {
    const el = skillsScrollRef.current
    if (!el) return
    setCanScrollPrevSkills(el.scrollLeft > 0)
    setCanScrollNextSkills(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])

  useEffect(() => {
    const el = skillsScrollRef.current
    if (!el) return
    updateScrollStateSkills()
    el.addEventListener("scroll", updateScrollStateSkills, { passive: true })
    return () => el.removeEventListener("scroll", updateScrollStateSkills)
  }, [updateScrollStateSkills])

  const scrollSkills = useCallback((direction: "prev" | "next") => {
    const el = skillsScrollRef.current
    if (!el) return
    el.scrollBy({
      left: direction === "next" ? el.clientWidth : -el.clientWidth,
      behavior: "smooth",
    })
  }, [])

  // ✅ Extract l1, l2, l3
  const rawL1 = categoryPath?.l1
  // Root browse sentinel — bare `/projects`, `/services`, `/teams`, `/talent`
  // rewrite to `/c/_browse/<kind>`. In this mode we show the list of L1
  // categories instead of drilling into a specific category's subcategories.
  const rootBrowseMode = rawL1 === "_browse"
  const l1 = rootBrowseMode ? undefined : rawL1
  const l2 = categoryPath?.l2
  const l3 = categoryPath?.l3
  const isAllPage = pageKind === "show-all"
  const isL1AllPage = isAllPage && Boolean(l1) && !l2 && !l3
  const isL2AllPage = isAllPage && Boolean(l1) && Boolean(l2) && !l3
  const isL3AllPage = isAllPage && Boolean(l1) && Boolean(l2) && Boolean(l3)
  const isL1OrL2AllPage = isL1AllPage || isL2AllPage

  // Resolve category metadata from the static taxonomy. In rootBrowseMode we
  // synthesize an l1Meta whose "subcategories" are the canonical top-level
  // categories — mirrors the secondary-nav pills so `/teams` shows exactly
  // the same L1 set the user sees everywhere else in the app.
  const ROOT_L1_SLUGS = [
    "research",
    "design",
    "development",
    "testing",
    "security",
    "maintenance",
    "digital-marketing",
    "business-consulting",
    "writing",
    "data-analytics",
  ] as const
  const l1Meta = useMemo(() => {
    if (rootBrowseMode) {
      return {
        name: "All Categories",
        slug: "_browse",
        description: "",
        heroImage: unsplash("1519389950473-47ba0277781c"),
        subcategories: ROOT_L1_SLUGS.map((slug) => CATEGORY_TAXONOMY[slug])
          .filter(Boolean)
          .map((cat) => ({
            name: cat.name,
            slug: cat.slug,
            description: cat.description,
            children: [],
          })),
      } as CategoryMeta
    }
    return getCategoryMeta(l1 ?? "")
  }, [l1, rootBrowseMode])
  const l2Meta = useMemo(
    () =>
      l2
        ? (l1Meta.subcategories.find((s) => s.slug === l2) ?? {
            name: slugToTitle(l2),
            slug: l2,
            description: "",
          })
        : null,
    [l1Meta, l2]
  )
  const l3Meta = useMemo(
    () => (l3 ? { name: slugToTitle(l3), slug: l3, description: "" } : null),
    [l3]
  )

  // The "current" category is the deepest level
  const currentName = l3Meta?.name ?? l2Meta?.name ?? l1Meta.name
  const currentDescription =
    (l2Meta && "description" in l2Meta ? l2Meta.description : null) ??
    l1Meta.description

  /**
   * Label used in section headers ("Top ___ Projects", "Recommended ___",
   * "Guides Related to ___", etc).
   *
   * On kind-filtered URLs (/c/<l1>/projects, /c/<l1>/services, ...) and on
   * the top-level Browse routes (/projects, /services, /teams, /talent —
   * rewritten to /c/development/<kind>), we strip the category name from
   * row titles and use only the entity label. Example:
   *
   *   /c/development/projects → "Top Projects" (not "Top Development Projects")
   *   /c/development          → "Top Development Projects" (show-all keeps currentName)
   *
   * This matches the requirement that every row title reflects the listing
   * type instead of the category name.
   */
  const sectionLabel =
    pageKind === "projects"
      ? "Projects"
      : pageKind === "services"
        ? "Services"
        : pageKind === "teams"
          ? "Teams"
          : pageKind === "talent"
            ? "Talent"
            : currentName

  /**
   * Canonical slug path for the currently-viewed category, excluding any
   * kind suffix. Used as the base for "View all X" style links so they
   * always route to the deepest level the user is browsing.
   */
  const currentCategoryPath = [l1Meta.slug, l2Meta?.slug, l3Meta?.slug]
    .filter(Boolean)
    .join("/")
  const currentCategorySlugs = [l1Meta.slug, l2Meta?.slug, l3Meta?.slug].filter(
    (slug): slug is string => Boolean(slug)
  )
  const recommendedServiceSeeds = scopeSeedItems(
    serviceCardMocks,
    currentCategorySlugs
  )
  const recommendedTeamSeeds = scopeSeedItems(teamSeeds, currentCategorySlugs)
  const recommendedTalentSeeds = scopeSeedItems(
    topTalentMock,
    currentCategorySlugs
  )

  /** Build a link to the kind-specific listing page at the current depth. */
  const listingHref = (
    kind: "projects" | "services" | "teams" | "talent" | "all"
  ) => {
    if (kind === "all") return `/c/${currentCategoryPath}`
    // Original: return `/c/${currentCategoryPath}/${kind}`
    return `/${kind}/${currentCategoryPath}`
  }

  /** "Explore more" CTA target: search page filtered by kind + current topic. */
  const exploreMoreHref = (kind: "projects" | "services" | "teams" | "talent") =>
    `/search?category=${kind}&q=${encodeURIComponent(l1Meta.name)}`

  // Call hooks unconditionally to satisfy React rules
  const l1Query = useCategoryPageL1(
    l1 ?? "",
    { kind: pageKind },
    { enabled: !!l1 && !l2 && !l3 }
  )
  const l2Query = useCategoryPageL2(
    l1 ?? "",
    l2 ?? "",
    { kind: pageKind },
    { enabled: !!l1 && !!l2 && !l3 }
  )
  const l3Query = useCategoryPageL3(
    l1 ?? "",
    l2 ?? "",
    l3 ?? "",
    { kind: pageKind },
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
  const browseSkills = useMemo(() => {
    const relatedSkills = pageData?.suggestions?.relatedSkills
    if (!Array.isArray(relatedSkills)) return []
    return relatedSkills
      .map((skill: any) => {
        const name = typeof skill === "string" ? skill : skill?.name
        if (!name) return null
        const slug =
          typeof skill === "object" && skill?.slug
            ? skill.slug
            : name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "")
        return { name, slug }
      })
      .filter((skill: any): skill is { name: string; slug: string } =>
        Boolean(skill)
      )
  }, [pageData])

  const serviceItems =
    listingsServices.length > 0 ? listingsServices : []

  const talentItems =
    talentUsers.length > 0 ? talentUsers : []

  const projectItems =
    listingsProjects.length > 0 ? listingsProjects : displayedProjects

  const teamItems = useMemo(
    () => projectItems.filter((p) => p.team).map((p) => p.team),
    [projectItems]
  )

  const getListingTypeName = (item: any): string | null => {
    const raw =
      item?.projectType ??
      item?.project_type ??
      item?.serviceType ??
      item?.service_type ??
      item?.typeName ??
      item?.type_name ??
      item?.type

    if (typeof raw !== "string") return null

    const value = raw.trim()
    if (!value || ["project", "service", "team", "talent"].includes(value.toLowerCase())) {
      return null
    }

    return value
  }

  const getBrowseTypeOptions = (items: any[]) => {
    const counts = new Map<string, number>()

    for (const item of items) {
      const name = getListingTypeName(item)
      if (!name) continue
      counts.set(name, (counts.get(name) ?? 0) + 1)
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .slice(0, 24)
  }

  const browseTypeGroups = useMemo(
    () =>
      [
        {
          label: "Projects",
          value: "Projects",
          options: getBrowseTypeOptions(projectItems),
        },
        {
          label: "Services",
          value: "Services",
          options: getBrowseTypeOptions(serviceItems),
        },
      ].filter((group) => group.options.length > 0),
    [projectItems, serviceItems]
  )

  const getListingCollaborators = (item: any): string[] => {
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

  // Popular/Top-Rated/Featured/Newest/Trending/Bestsellers/In-Demand below are
  // simple client-side sorts on whatever fields the API happens to return —
  // not the real weighted/time-windowed ranking spec (backend engagement
  // scores, review-count thresholds, admin-curated Featured flag, profile
  // completeness for Newest talent, etc.). Revisit once that's implemented.
  const getComparableDate = (item: any) =>
    new Date(
      item?.createdAt ??
        item?.publishedAt ??
        item?.updatedAt ??
        item?.created_at ??
        item?.published_at ??
        item?.updated_at ??
        0
    ).getTime() || 0

  const getComparableRating = (item: any) =>
    Number(item?.rating ?? item?.averageRating ?? item?.avgRating ?? 0)

  const getComparablePopularity = (item: any) =>
    Number(
      item?.reviewCount ??
        item?.reviews ??
        item?.projectCount ??
        item?.projects ??
        item?.favoriteCount ??
        item?.favoritesCount ??
        0
    )

  const getComparableSales = (item: any) =>
    Number(
      item?.salesCount ??
        item?.ordersCount ??
        item?.completedOrders ??
        item?.completedProjects ??
        item?.purchases ??
        0
    )

  const getCarouselItemsForTab = <T,>(items: T[], tab: string): T[] => {
    const sorted = [...items]

    switch (tab) {
      case "Featured": {
        const featured = sorted.filter((item: any) => item?.featured)
        return featured.length > 0 ? featured : sorted
      }
      case "Newest":
        return sorted.sort(
          (a: any, b: any) => getComparableDate(b) - getComparableDate(a)
        )
      case "Most Popular":
      case "Trending":
        return sorted.sort(
          (a: any, b: any) =>
            getComparablePopularity(b) - getComparablePopularity(a)
        )
      case "Top-Rated":
        return sorted.sort(
          (a: any, b: any) => getComparableRating(b) - getComparableRating(a)
        )
      case "Best-Sellers":
      case "Bestsellers":
        return sorted.sort(
          (a: any, b: any) => getComparableSales(b) - getComparableSales(a)
        )
      default:
        return sorted
    }
  }

  const getItemCategoryValues = (item: any): string[] => {
    const rawValues = [
      item?.category,
      item?.categoryName,
      item?.categorySlug,
      item?.subcategory,
      item?.subcategoryName,
      item?.subcategorySlug,
      item?.l2Slug,
      item?.l3Slug,
      ...(Array.isArray(item?.categories) ? item.categories : []),
      ...(Array.isArray(item?.categorySlugs) ? item.categorySlugs : []),
      ...(Array.isArray(item?.tags) ? item.tags : []),
      ...(Array.isArray(item?.skills) ? item.skills : []),
    ]

    return rawValues
      .map((value: any) =>
        typeof value === "string"
          ? value
          : value?.slug ?? value?.name ?? value?.title ?? ""
      )
      .filter(Boolean)
      .map((value: string) => value.toLowerCase())
  }

  const getCarouselItemsForCategoryTab = <T,>(
    items: T[],
    sub: { name?: string; slug?: string },
    rankingTab = "Top-Rated"
  ): T[] => {
    if (!sub?.name || sub.name === "All") {
      return getCarouselItemsForTab(items, rankingTab)
    }

    const needles = [sub.slug, sub.name]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase())

    const filtered = items.filter((item: any) => {
      const values = getItemCategoryValues(item)
      return needles.some((needle) =>
        values.some((value) => value === needle || value.includes(needle))
      )
    })

    return getCarouselItemsForTab(
      filtered.length > 0 ? filtered : [],
      rankingTab
    )
  }

  // Subcategories: static taxonomy is the curated source of truth.
  //   L1 page → show L1's subcategories
  //   L2 page → show L2's children (populated in the static taxonomy)
  //   L3 page → no subcategories section (intentionally empty)
  const subcategories = useMemo(() => {
    if (l3) return []
    if (!l2 && !l3 && l1Meta.subcategories.length > 0) {
      return l1Meta.subcategories.map((s) => ({ ...s, uuid: s.slug }))
    }
    if (
      l2 &&
      !l3 &&
      l2Meta &&
      "children" in l2Meta &&
      l2Meta.children &&
      l2Meta.children.length > 0
    ) {
      return l2Meta.children.map((s) => ({ ...s, uuid: s.slug }))
    }
    const apiChildren = (pageData?.children ?? []).filter(
      (ch: any) => ch && ch.name && ch.slug
    )
    if (apiChildren.length > 0) return apiChildren
    return []
  }, [pageData?.children, l1Meta.subcategories, l2Meta, l2, l3])

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


  useEffect(() => {
    async function loadFavorites() {
      const favorites = await getAllFavorites()
      // Transition shim: seed both the legacy plain-itemId key and the new
      // composite favoriteKey, so widgets not yet converted to the shared
      // FavoriteButton (still checking favoritedItems.has(itemId) inline)
      // keep showing correct state alongside converted ones. Remove the
      // itemId writes here once every entity type is converted.
      const keys = new Set<string>()
      for (const fav of favorites) {
        keys.add(fav.itemId)
        keys.add(favoriteKey(fav.type as FavoriteEntityType, fav.itemId))
      }
      setFavoritedItems(keys)
    }

    loadFavorites()
  }, [])

  // Helper to toggle favorites on any card
  const handleFavoriteToggle = async (
    itemId: string,
    type: "project" | "service" | "team" | "talent",
    newPressed: boolean
  ) => {
    // Optimistic update — toggle immediately, persist in background
    const key = favoriteKey(type, itemId)

    if (newPressed) {
      setFavoritedItems((prev) => {
        const next = new Set(prev)
        next.add(itemId) // transition shim — see loadFavorites
        next.add(key)
        return next
      })
      const favorite = await addFavorite({ type, itemId })
      if (!favorite) {
        setFavoritedItems((prev) => {
          const next = new Set(prev)
          next.delete(itemId)
          next.delete(key)
          return next
        })
      }
    } else {
      setFavoritedItems((prev) => {
        const next = new Set(prev)
        next.delete(itemId)
        next.delete(key)
        return next
      })
      const fav = await findFavoriteByTypeAndItemId(type as FavoriteType, itemId)
      const removed = fav ? await removeFavorite(fav.id) : true
      if (!removed) {
        setFavoritedItems((prev) => {
          const next = new Set(prev)
          next.add(itemId)
          next.add(key)
          return next
        })
      }
    }
  }

  // Fetch real projects and services from listings-service via gateway
  const apiBase = getPublicApiUrl() || "http://localhost:4000"
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
        // Fetch real talent users from the public talent listing endpoint.
        // We prefer talents with both an avatar AND a username so the card
        // hover-state and "View profile" link both work.
        const usersRes = await fetch(`${apiBase}/talent/users`).catch(
          () => null
        )
        if (usersRes?.ok) {
          const users = await usersRes.json()
          const rich = users.filter((u: any) => u.username && u.avatarUrl)
          const fallback = users.filter((u: any) => u.username)
          setTalentUsers(rich.length > 0 ? rich : fallback)
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
          <CategoryBanner
            image={heroBannerFor(
              l1Meta.slug,
              l2Meta?.slug ?? "",
              l3Meta?.slug ?? ""
            )}
            alt={`${currentName} banner`}
            title={pageKind === "show-all" ? currentName : sectionLabel}
            description={
              pageKind === "show-all"
                ? currentDescription
                : pageKind === "projects"
                  ? `Browse ${currentName.toLowerCase()} projects posted by clients worldwide.`
                  : pageKind === "services"
                    ? `Discover ${currentName.toLowerCase()} services from top-rated freelancers.`
                    : pageKind === "teams"
                      ? `Hire vetted ${currentName.toLowerCase()} teams ready to deliver.`
                      : `Find expert ${currentName.toLowerCase()} talent for your next project.`
            }
            breadcrumbs={
              <div className="flex items-center gap-x-2">
                <NextLink href="/">
                  <Home03 className="size-[18px] text-white opacity-60" />
                </NextLink>
                <span className="text-xs leading-6 font-semibold text-white opacity-60">
                  /
                </span>
                {pageKind === "show-all" ? (
                  <>
                    <NextLink
                      href={`/c/${l1Meta.slug}`}
                      className="text-xs leading-6 font-semibold text-white opacity-60 hover:opacity-100 transition-opacity"
                    >
                      {l1Meta.name}
                    </NextLink>
                    {l2Meta && (
                      <>
                        <span className="text-xs leading-6 font-semibold text-white opacity-60">
                          /
                        </span>
                        <NextLink
                          href={`/c/${l1Meta.slug}/${l2Meta.slug}`}
                          className="text-xs leading-6 font-semibold text-white opacity-60 hover:opacity-100 transition-opacity"
                        >
                          {l2Meta.name}
                        </NextLink>
                      </>
                    )}
                    {l3Meta && (
                      <>
                        <span className="text-xs leading-6 font-semibold text-white opacity-60">
                          /
                        </span>
                        <span className="text-xs leading-6 font-semibold text-white">
                          {l3Meta.name}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {/* Entity root — links to /projects, /services, etc. */}
                    {l2Meta || l3Meta ? (
                      <NextLink
                        href={`/${pageKind}`}
                        className="text-xs leading-6 font-semibold text-white opacity-60 hover:opacity-100 transition-opacity"
                      >
                        {sectionLabel}
                      </NextLink>
                    ) : (
                      <span className="text-xs leading-6 font-semibold text-white">
                        {sectionLabel}
                      </span>
                    )}
                    {/* L1 shown only when drilling into L2/L3 */}
                    {(l2Meta || l3Meta) && (
                      <>
                        <span className="text-xs leading-6 font-semibold text-white opacity-60">
                          /
                        </span>
                        <NextLink
                          href={`/${pageKind}/${l1Meta.slug}`}
                          className="text-xs leading-6 font-semibold text-white opacity-60 hover:opacity-100 transition-opacity"
                        >
                          {l1Meta.name}
                        </NextLink>
                      </>
                    )}
                    {l2Meta && (
                      <>
                        <span className="text-xs leading-6 font-semibold text-white opacity-60">
                          /
                        </span>
                        {l3Meta ? (
                          <NextLink
                            href={`/${pageKind}/${l1Meta.slug}/${l2Meta.slug}`}
                            className="text-xs leading-6 font-semibold text-white opacity-60 hover:opacity-100 transition-opacity"
                          >
                            {l2Meta.name}
                          </NextLink>
                        ) : (
                          <span className="text-xs leading-6 font-semibold text-white">
                            {l2Meta.name}
                          </span>
                        )}
                      </>
                    )}
                    {l3Meta && (
                      <>
                        <span className="text-xs leading-6 font-semibold text-white opacity-60">
                          /
                        </span>
                        <span className="text-xs leading-6 font-semibold text-white">
                          {l3Meta.name}
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>
            }
          />

          {/* Dynamic subcategories section.
              Per Doc 1 (L1/L2/L3 Category Pages), L3 is the leaf — it has no
              subcategories, so the Explore block is hidden entirely on L3
              pages and also hidden on any L1/L2 that has no populated
              children (prevents an empty "No subcategories available" block). */}
          {subcategories.length > 0 && (
            <div className="mt-[50px]">
              <div className="flex items-center justify-between">
                <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                  {pageKind !== "show-all"
                    ? `Browse ${sectionLabel} by Category`
                    : `Explore ${sectionLabel}`}
                </h1>

                {subcategories.length > 0 && (
                  <div className="flex items-center gap-x-3">
                    <IconButton
                      className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                      visual="gray"
                      variant="outlined"
                      data-state={canScrollPrev ? "active" : "inactive"}
                      onClick={() => scrollSubcategories("prev")}
                    >
                      <ChevronLeft className="size-[18px]" />
                    </IconButton>
                    <IconButton
                      className="rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"
                      visual="gray"
                      variant="outlined"
                      data-state={canScrollNext ? "active" : "inactive"}
                      onClick={() => scrollSubcategories("next")}
                    >
                      <ChevronRight className="size-[18px]" />
                    </IconButton>
                  </div>
                )}
              </div>

              <div
                ref={subcategoryScrollRef}
                className="mt-6 overflow-x-auto overflow-y-visible py-1 -my-1 px-1 -mx-1"
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                <div
                  className={`grid gap-[15px] ${l2 ? "grid-rows-1" : "grid-rows-2"} grid-flow-col`}
                  style={{ gridAutoColumns: "calc((100% - 60px) / 5)" }}
                >
                  {subcategories.length > 0 ? (
                    (() => {
                      const iconMap =
                        resolveUniqueSubcategoryIcons(subcategories)
                      return subcategories.map((subcat: any) => (
                        <NextLink
                          key={subcat.uuid ?? subcat.slug}
                          href={
                            rootBrowseMode
                              ? pageKind === "show-all"
                                ? `/c/${subcat.slug}`
                                : `/c/${subcat.slug}/${pageKind}`
                              : pageKind === "show-all"
                                ? `/c/${[l1Meta.slug, l2Meta?.slug, subcat.slug].filter(Boolean).join("/")}`
                                : `/c/${[l1Meta.slug, l2Meta?.slug, subcat.slug].filter(Boolean).join("/")}/${pageKind}`
                          }
                          className="group border border-gray-200 bg-white rounded-lg p-5 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] hover:ring-1 hover:ring-gray-300 hover:border-gray-300 cursor-pointer transition duration-300"
                        >
                          <article>
                            <SubcategoryIconTile
                              slug={subcat.slug}
                              name={subcat.name}
                              icon={iconMap.get(
                                subcat.slug || subcat.name || ""
                              )}
                            />

                            <div className="mt-5">
                              <h1 className="text-base leading-none font-semibold text-dark-blue-400 transition duration-300">
                                {subcat.name}
                              </h1>
                              <p className="text-[13px] leading-[1.4] font-light text-dark-blue-400 mt-1 line-clamp-3">
                                {subcat.description ||
                                  `Explore ${subcat.name} category`}
                              </p>
                            </div>
                          </article>
                        </NextLink>
                      ))
                    })()
                  ) : (
                    <div className="text-center py-8 text-gray-500 w-full">
                      No subcategories available
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}


          {isL3AllPage && (
            <>
              <div className="mt-[50px]">
                <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                  Top {currentName} Projects
                </h1>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-7">
                  <div className="flex flex-wrap items-center gap-3">
                    {marketplaceTabs.map((tab) => (
                      <Button
                        key={tab}
                        type="button"
                        variant="outlined"
                        visual="gray"
                        size="sm"
                        aria-pressed={activeTopProjectsTab === tab}
                        onClick={() => setActiveTopProjectsTab(tab)}
                        className={`h-8 rounded-full bg-white px-3.5 text-sm font-medium shadow-none ${
                          activeTopProjectsTab === tab
                            ? "border-2 border-dark-blue-400 text-dark-blue-400"
                            : "border-gray-300 text-gray-500 hover:border-dark-blue-400 hover:text-dark-blue-400"
                        }`}
                      >
                        {tab}
                      </Button>
                    ))}
                  </div>

                  <Button
                    asChild
                    variant="link"
                    visual="gray"
                    size="lg"
                    className="h-auto p-0 text-base font-bold text-gray-500 underline hover:text-dark-blue-400"
                  >
                    <NextLink href={listingHref("projects")}>
                      Explore More Projects
                    </NextLink>
                  </Button>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                  {fromLength(8).map((idx) => {
                    const project =
                      listingsProjects.length > 0
                        ? listingsProjects[idx % listingsProjects.length]
                        : null
                    const mock = projectCardMocks[idx % projectCardMocks.length]

                    return (
                      <ListingCard
                        key={project?.id ?? `l3-top-project-${idx}`}
                        kind="project"
                        id={project?.id ?? `l3-top-project-${idx}`}
                        title={project?.title || mock.title}
                        description={
                          project?.description?.slice(0, 120) ||
                          mock.description
                        }
                        mediaUrl={
                          project?.mediaUrls?.[0] ||
                          project?.coverImage ||
                          mock.mediaUrl
                        }
                        budget={project?.budget ? `$${Number(project.budget).toLocaleString()} budget` : mock.budget}
                        duration={project?.duration ? `Starting from ${project.duration}` : mock.duration}
                        rating={4.9}
                        reviewCount={5}
                        href={
                          project
                            ? buildProjectUrl(
                                currentCategoryPath,
                                project.slug,
                                project.id
                              )
                            : buildProjectUrl(
                                currentCategoryPath,
                                mock.slug,
                                mock.id
                              )
                        }
                        collaborators={(talentUsers.length > 0
                          ? talentUsers.slice(0, 6)
                          : Array(6).fill("/woman.jpg")
                        ).map(
                          (u: any) =>
                            (typeof u === "string" ? u : u?.avatarUrl) ||
                            "/woman.jpg"
                        )}
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
                    )
                  })}
                </div>
              </div>

              <div className="mt-[50px]">
                <Tabs defaultValue="Industry">
                  <div className="flex items-center justify-between">
                    <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                      Narrow Your Project Search
                    </h1>
                    <Button
                      variant="link"
                      visual="gray"
                      size="lg"
                      className="h-auto p-0 text-base font-bold text-gray-500 underline hover:text-dark-blue-400"
                    >
                      Advanced Filters
                    </Button>
                  </div>
                  <TabsList className="mt-6 flex flex-wrap items-center gap-3">
                    {["Industry", "Budget", "Project Length", "Team Size"].map(
                      (tab) => (
                        <Badge
                          key={tab}
                          variant="circular"
                          visual="gray"
                          size="lg"
                          className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                          asChild
                        >
                          <TabsTrigger value={tab}>{tab}</TabsTrigger>
                        </Badge>
                      )
                    )}
                  </TabsList>
                  <div className="mt-6">
                    <TabsContent
                      value="Industry"
                      className="grid grid-cols-2 gap-4 md:grid-cols-4"
                    >
                      {narrowProjectSearch.industries.map((item) => (
                        <NextLink
                          key={item}
                          href={`/search?category=${l1Meta.slug}&industry=${encodeURIComponent(item)}`}
                        >
                          <article className="flex h-[52px] items-center justify-center rounded-lg border border-gray-200 bg-white p-4 text-center text-sm font-semibold text-dark-blue-400 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] transition duration-300 hover:border-gray-300 hover:ring-1 hover:ring-gray-300">
                            {item}
                          </article>
                        </NextLink>
                      ))}
                    </TabsContent>
                    <TabsContent
                      value="Budget"
                      className="grid grid-cols-2 gap-4 md:grid-cols-4"
                    >
                      {narrowProjectSearch.budgets.map((item) => (
                        <article
                          key={item}
                          className="flex h-[52px] items-center justify-center rounded-lg border border-gray-200 bg-white p-4 text-center text-sm font-semibold text-dark-blue-400 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]"
                        >
                          {item}
                        </article>
                      ))}
                    </TabsContent>
                    <TabsContent
                      value="Project Length"
                      className="grid grid-cols-2 gap-4 md:grid-cols-4"
                    >
                      {narrowProjectSearch.lengths.map((item) => (
                          <article
                            key={item}
                            className="flex h-[52px] items-center justify-center rounded-lg border border-gray-200 bg-white p-4 text-center text-sm font-semibold text-dark-blue-400 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]"
                          >
                            {item}
                          </article>
                        )
                      )}
                    </TabsContent>
                    <TabsContent
                      value="Team Size"
                      className="grid grid-cols-2 gap-4 md:grid-cols-4"
                    >
                      {narrowProjectSearch.teamSizes.map((item) => (
                          <article
                            key={item}
                            className="flex h-[52px] items-center justify-center rounded-lg border border-gray-200 bg-white p-4 text-center text-sm font-semibold text-dark-blue-400 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]"
                          >
                            {item}
                          </article>
                        )
                      )}
                    </TabsContent>
                  </div>
                </Tabs>
              </div>

              <div className="relative mt-[50px] h-[298px] overflow-hidden rounded-lg p-[50px]">
                <NextImage
                  className="object-cover"
                  src="/vr-4.png"
                  sizes="100vw"
                  alt={`${currentName} hero`}
                  fill
                />
                <div className="absolute inset-0 flex items-center justify-end bg-black/40 p-[50px]">
                  <div className="max-w-[750px]">
                    <h1 className="text-4xl font-bold leading-none text-white">
                      Fueling the Future of Research
                    </h1>
                    <p className="mt-2 text-xl font-light leading-none text-white">
                      Discover research experts and projects tailored to your goals.
                    </p>
                    <Button
                      asChild
                      className="mt-[50px] rounded-full duration-300 hover:gap-x-3.5 transition-[column-gap] bg-white hover:bg-white/90 text-dark-blue-400 hover:text-dark-blue-400"
                      size="lg"
                    >
                      <NextLink href={listingHref("projects")}>
                        Explore Research <ArrowRight className="size-[15px]" />
                      </NextLink>
                    </Button>
                  </div>
                </div>
              </div>
            {isL3AllPage && (
              <div className="mt-[50px]">
                <Tabs defaultValue="Featured">
                  <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                    Top {currentName} Services
                  </h1>
                  <SwiperRoot>
                    <div className="mt-6 flex items-center justify-between">
                      <TabsList className="flex items-center gap-x-3">
                        {marketplaceTabs.map((tab) => (
                          <Badge
                            key={tab}
                            variant="circular"
                            visual="gray"
                            size="lg"
                            className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                            asChild
                          >
                            <TabsTrigger value={tab}>{tab}</TabsTrigger>
                          </Badge>
                        ))}
                      </TabsList>
                      <Button
                        asChild
                        variant="link"
                        visual="gray"
                        size="lg"
                        className="h-auto p-0 text-base font-bold text-gray-500 underline hover:text-dark-blue-400"
                      >
                        Explore More Teams
                      </Button>
                    </div>
                    <div className="mt-6">
                      {marketplaceTabs.map((tabValue) => (
                        <TabsContent key={tabValue} value={tabValue}>
                          <SwiperContent slidesPerView="auto" spaceBetween={20}>
                            {fromLength(8).map((idx) => {
                              const service =
                                listingsServices.length > 0
                                  ? listingsServices[idx % listingsServices.length]
                                  : null
                              const mock =
                                serviceCardMocks[idx % serviceCardMocks.length]
                              return (
                                <SwiperSlide
                                  className="w-[355px]"
                                  key={service?.id ?? `l3-service-${idx}`}
                                >
                                  <ListingCard
                                    kind="service"
                                    id={service?.id ?? `l3-service-${idx}`}
                                    title={
                                      service?.title ||
                                      mock.title
                                    }
                                    description={
                                      service?.description?.slice(0, 120) ||
                                      mock.description
                                    }
                                    mediaUrl={
                                      service?.mediaUrls?.[0] ||
                                      service?.coverImage ||
                                      mock.mediaUrl
                                    }
                                    budget={
                                      service?.priceMin
                                        ? `$${Number(service.priceMin).toLocaleString()}/month`
                                        : mock.budget
                                    }
                                    rating={4.9}
                                    reviewCount={5}
                                    href={
                                      service
                                        ? buildServiceUrl(
                                            currentCategoryPath,
                                            service.slug,
                                            service.id
                                          )
                                        : buildServiceUrl(
                                            currentCategoryPath,
                                            mock.slug,
                                            mock.id
                                          )
                                    }
                                    collaborators={Array(6).fill("/woman.jpg")}
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
                                                {pressed ? "Saved" : "Save to favorites"}
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        )}
                                      </FavoriteRoot>
                                    }
                                  />
                                </SwiperSlide>
                              )
                            })}
                          </SwiperContent>
                        </TabsContent>
                      ))}
                    </div>
                  </SwiperRoot>
                </Tabs>
              </div>
              )}

              <div className="mt-[50px]">
                <Tabs defaultValue="Featured">
                  <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                    {l3Meta ? `${l2Meta?.name ?? currentName} Teams` : `${currentName} Teams`}
                  </h1>
                  <SwiperRoot>
                    <div className="mt-6 flex items-center justify-between">
                      <TabsList className="flex items-center gap-x-3">
                        {marketplaceTalentTabs.map(
                          (tab) => (
                            <Badge
                              key={tab}
                              variant="circular"
                              visual="gray"
                              size="lg"
                              className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                              asChild
                            >
                              <TabsTrigger value={tab}>{tab}</TabsTrigger>
                            </Badge>
                          )
                        )}
                      </TabsList>
                      <Button
                        variant="link"
                        visual="gray"
                        size="lg"
                        className="h-auto p-0 text-base font-bold text-gray-500 underline hover:text-dark-blue-400"
                      >
                        Explore More Teams
                      </Button>
                    </div>
                    <div className="mt-6">
                      {marketplaceTalentTabs.map(
                        (tabValue) => (
                          <TabsContent key={tabValue} value={tabValue}>
                            <SwiperContent slidesPerView="auto" spaceBetween={20}>
                              {teamSeeds.map((team) => (
                                <SwiperSlide
                                  className="w-[355px]"
                                  key={`l3-team-${team.id}`}
                                >
                                  <ListingCard
                                    kind="team"
                                    id={team.id}
                                    name={team.name}
                                    handle={team.handle}
                                    tagline={team.tagline}
                                    experience={team.experience}
                                    rate={team.rate}
                                    locations={team.location}
                                    rating={team.rating}
                                    projectCount={team.completedProjects}
                                    skills={team.skills}
                                    memberAvatars={team.memberAvatars}
                                    previousClientLogos={team.previousClientLogos}
                                    favoriteSlot={<FavoriteRoot>{() => <Favorite />}</FavoriteRoot>}
                                  />
                                </SwiperSlide>
                              ))}
                            </SwiperContent>
                          </TabsContent>
                        )
                      )}
                    </div>
                  </SwiperRoot>
                </Tabs>
              </div>

              <div className="mt-[50px]">
                <Tabs defaultValue="Featured">
                  <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                    All Stars in {currentName}
                  </h1>
                  <SwiperRoot>
                    <div className="mt-6 flex items-center justify-between">
                      <TabsList className="flex items-center gap-x-3">
                        {marketplaceTalentTabs.map((tab) => (
                          <Badge
                            key={tab}
                            variant="circular"
                            visual="gray"
                            size="lg"
                            className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                            asChild
                          >
                            <TabsTrigger value={tab}>{tab}</TabsTrigger>
                          </Badge>
                        ))}
                      </TabsList>
                      <Button
                        variant="link"
                        visual="gray"
                        size="lg"
                        className="h-auto p-0 text-base font-bold text-gray-500 underline hover:text-dark-blue-400"
                      >
                        Explore More Talent
                      </Button>
                    </div>
                    <div className="mt-6">
                      {marketplaceTalentTabs.map((tabValue) => (
                        <TabsContent key={tabValue} value={tabValue}>
                          <SwiperContent slidesPerView="auto" spaceBetween={20}>
                            {topTalentMock.map((talent) => (
                              <SwiperSlide
                                className="w-[355px]"
                                key={`l3-star-${tabValue}-${talent.id}`}
                              >
                                <TopTalentCard talent={talent} />
                              </SwiperSlide>
                            ))}
                          </SwiperContent>
                        </TabsContent>
                      ))}
                    </div>
                  </SwiperRoot>
                </Tabs>
              </div>

              <div className="mt-[50px]">
                <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                  Browse by Skills
                </h1>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {browseSkillMocks.map((skill) => (
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
            </>
          )}



          {/* Recommended in {Category} — entity-tab carousel. Show-all only,
              because kind-filtered browse pages (/projects, /teams, etc.)
              should contain a single entity kind — no tabs that switch kinds. */}
          {isL1OrL2AllPage && (
            <div className="mt-[50px]">
              <Tabs defaultValue="Projects">
                <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                  Recommended in {currentName}
                </h1>
                <SwiperRoot>
                  <div className="mt-6 flex justify-between items-center">
                    <TabsList className="flex items-center gap-x-3">
                      {["Projects", "Services", "Teams", "Talent"].map(
                        (tab) => (
                          <Badge
                            key={tab}
                            variant="circular"
                            visual="gray"
                            size="lg"
                            className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                            asChild
                          >
                            <TabsTrigger value={tab}>{tab}</TabsTrigger>
                          </Badge>
                        )
                      )}
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
                    <TabsContent
                      className="gap-5 flex items-center"
                      value="Projects"
                    >
                      <SwiperContent slidesPerView="auto" spaceBetween={20}>
                        {getCarouselItemsForTab(
                          listingsProjects.length > 0
                            ? listingsProjects
                            : displayedProjects,
                          "Featured"
                        )
                          .filter(
                            (project: any) =>
                              project?.mediaUrls?.[0] &&
                              project?.title &&
                              (project.budget ??
                                project.scopeTotal?.budget ??
                                project.price)
                          )
                          .slice(0, 8)
                          .map((project: any, idx: number) => {
                            const key = project?.id ?? idx
                            return (
                              <SwiperSlide
                                className="h-auto w-[355px]"
                                key={key}
                              >
                                <ListingCard
                                  kind="project"
                                  id={project.id ?? `project-${idx}`}
                                  title={project.title}
                                  description={project?.shortDescription}
                                  mediaUrl={project?.mediaUrls?.[0]}
                                  duration={
                                    project.duration
                                      ? `Starting from ${project.duration}`
                                      : ""
                                  }
                                  budget={String(
                                    project.budget ??
                                      project.scopeTotal?.budget ??
                                      project.price ??
                                      ""
                                  )}
                                  rating={Number(project.rating) || undefined}
                                  reviewCount={project.reviewCount}
                                  href={
                                    project.slug && project.id
                                      ? projectDetailsUrl(project.slug, project.id)
                                      : listingHref("projects")
                                  }
                                  // Original: avatarsSlot={hardcoded /woman.jpg tooltip avatar group}
                                  collaborators={getListingCollaborators(project)}
                                  favoriteSlot={
                                    <FavoriteButton
                                      itemId={project?.id}
                                      type="project"
                                      favoritedItems={favoritedItems}
                                      onToggle={handleFavoriteToggle}
                                    />
                                  }
                                />
                              </SwiperSlide>
                            )
                          })}
                        <SwiperSlide className="w-[355px] h-auto">
                          <NextLink
                            href={listingHref("projects")}
                            className="block h-full"
                          >
                            <Card className="h-full min-h-[300px] border-none flex-col justify-end items-start px-6 py-[50px] bg-gray-700 shadow-none hover:ring-0">
                              <h1 className="text-[28px] font-bold leading-[1.2] text-white">
                                More Projects in {currentName}
                              </h1>
                              <div className="mt-8 size-10 rounded-full bg-white flex items-center justify-center shrink-0">
                                <ChevronRight className="size-[18px] text-gray-700" />
                              </div>
                            </Card>
                          </NextLink>
                        </SwiperSlide>
                      </SwiperContent>
                    </TabsContent>

                    <TabsContent
                      className="gap-5 flex items-center"
                      value="Services"
                    >
                      <SwiperContent slidesPerView="auto" spaceBetween={20}>
                        {(listingsServices.length > 0
                          ? listingsServices.slice(0, 8)
                          : recommendedServiceSeeds
                        ).map((item: any, idx: number) => {
                          const service =
                            listingsServices.length > 0 ? item : null
                          const mock =
                            listingsServices.length > 0
                              ? recommendedServiceSeeds[
                                  idx % recommendedServiceSeeds.length
                                ]
                              : item
                          const key = service?.id ?? idx
                          return (
                            <SwiperSlide className="w-[355px]" key={key}>
                              <ListingCard
                                kind="service"
                                id={service?.id ?? `mock-${idx}`}
                                title={service?.title || mock.title}
                                description={
                                  service?.description?.slice(0, 120) ||
                                  mock.description
                                }
                                mediaUrl={service?.mediaUrls?.[0] || mock.mediaUrl}
                                budget={
                                  service?.priceMin
                                    ? `$${Number(service.priceMin).toLocaleString()} - $${Number(service.priceMax).toLocaleString()}/month`
                                    : mock.budget
                                }
                                rating={4.9}
                                reviewCount={5}
                                href={
                                  service
                                    ? buildServiceUrl(
                                        currentCategoryPath,
                                        service.slug,
                                        service.id
                                      )
                                    : buildServiceUrl(
                                        currentCategoryPath,
                                        mock.slug,
                                        mock.id
                                      )
                                }
                                collaborators={(talentUsers.length > 0
                                  ? talentUsers.slice(0, 4)
                                  : []
                                ).map((u: any) => u?.avatarUrl || "/woman.jpg")}
                                favoriteSlot={
                                  service ? (
                                    <FavoriteRoot
                                      value={favoritedItems.has(
                                        String(service.id)
                                      )}
                                      onValueChange={(pressed) =>
                                        handleFavoriteToggle(
                                          String(service.id),
                                          "service",
                                          pressed
                                        )
                                      }
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
                                  ) : null
                                }
                              />
                            </SwiperSlide>
                          )
                        })}
                        <SwiperSlide className="w-[355px] h-auto">
                          <NextLink
                            href={listingHref("services")}
                            className="block h-full"
                          >
                            <Card className="h-full min-h-[300px] border-none flex flex-col justify-end items-start px-6 py-[50px] bg-gray-700 shadow-none hover:ring-0">
                              <h1 className="text-[28px] font-bold leading-[1.2] text-white">
                                More Services in {currentName}
                              </h1>
                              <div className="mt-8 size-10 rounded-full bg-white flex items-center justify-center shrink-0">
                                <ChevronRight className="size-[18px] text-gray-700" />
                              </div>
                            </Card>
                          </NextLink>
                        </SwiperSlide>
                      </SwiperContent>
                    </TabsContent>

                    <TabsContent
                      className="gap-5 flex items-center"
                      value="Teams"
                    >
                      <SwiperContent slidesPerView="auto" spaceBetween={20}>
                        {recommendedTeamSeeds.map((team) => (
                          <SwiperSlide
                            className="w-[355px]"
                            key={`recommended-team-${team.id}`}
                          >
                            <ListingCard
                              kind="team"
                              id={team.id}
                              name={team.name}
                              handle={team.handle}
                              tagline={team.tagline}
                              experience={team.experience}
                              rate={team.rate}
                              locations={team.location}
                              rating={team.rating}
                              projectCount={team.completedProjects}
                              skills={team.skills}
                              memberAvatars={team.memberAvatars}
                              previousClientLogos={team.previousClientLogos}
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
                          </SwiperSlide>
                        ))}
                        <SwiperSlide className="w-[355px] h-auto">
                          <NextLink
                            href={listingHref("teams")}
                            className="block h-full"
                          >
                            <Card className="h-full min-h-[300px] border-none flex flex-col justify-end items-start px-6 py-[50px] bg-gray-700 shadow-none hover:ring-0">
                              <h1 className="text-[28px] font-bold leading-[1.2] text-white">
                                More Teams in {currentName}
                              </h1>
                              <div className="mt-8 size-10 rounded-full bg-white flex items-center justify-center shrink-0">
                                <ChevronRight className="size-[18px] text-gray-700" />
                              </div>
                            </Card>
                          </NextLink>
                        </SwiperSlide>
                      </SwiperContent>
                    </TabsContent>

                    <TabsContent
                      className="gap-5 flex items-center"
                      value="Talent"
                    >
                      <SwiperContent slidesPerView="auto" spaceBetween={20}>
                        {talentUsers.length > 0
                          ? talentUsers
                              .slice(0, 8)
                              .map((u: TalentUser, idx: number) => (
                            <SwiperSlide className="w-[355px]" key={u.id}>
                              <ListingCard
                                kind="talent"
                                {...talentToCardProps(u, idx)}
                              />
                            </SwiperSlide>
                              ))
                          : recommendedTalentSeeds.map((talent) => (
                              <SwiperSlide
                                className="w-[355px]"
                                key={`recommended-talent-${talent.id}`}
                              >
                                <ListingCard
                                  kind="talent"
                                  id={talent.id}
                                  username={talent.username}
                                  name={talent.username}
                                  handle={talent.handle}
                                  role={talent.role}
                                  photo={talent.photo}
                                  rate={talent.rate}
                                  experience={talent.experience}
                                  country={talent.location}
                                  rating={Number(talent.rating)}
                                  projects={Number.parseInt(
                                    talent.projects,
                                    10
                                  )}
                                  allStars
                                  skills={talent.skills}
                                  href={`/talent-profile?username=${encodeURIComponent(talent.username)}`}
                                />
                              </SwiperSlide>
                            ))}
                        <SwiperSlide className="w-[355px] h-auto">
                          <NextLink
                            href={listingHref("talent")}
                            className="block h-full"
                          >
                            <Card className="h-full min-h-[300px] border-none flex flex-col justify-end items-start px-6 py-[50px] bg-gray-700 shadow-none hover:ring-0">
                              <h1 className="text-[28px] font-bold leading-[1.2] text-white">
                                More Talent in {currentName}
                              </h1>
                              <div className="mt-8 size-10 rounded-full bg-white flex items-center justify-center shrink-0">
                                <ChevronRight className="size-[18px] text-gray-700" />
                              </div>
                            </Card>
                          </NextLink>
                        </SwiperSlide>
                      </SwiperContent>
                    </TabsContent>
                  </div>
                </SwiperRoot>
              </Tabs>
            </div>
          )}

          {/* Top-Rated {Category} Projects — projects-backed carousel.
              Show-all only: the kind-filtered /projects page already has the
              "Top Projects" section further down, so skipping this here
              avoids two identical "Top" rows on the same page. */}
          {isL1OrL2AllPage && (
            <div className="mt-[50px]">
              <Tabs defaultValue={subcategories[0]?.name || "All"}>
                <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                  Top-Rated {sectionLabel} Projects
                </h1>
                <SwiperRoot>
                  <div className="mt-6 flex justify-between items-center">
                    <TabsList className="flex items-center gap-x-3">
                      {(subcategories.length > 0
                        ? subcategories.slice(0, 5)
                        : [{ name: "All" }]
                      ).map((sub: any) => (
                        <Badge
                          key={sub.name}
                          variant="circular"
                          visual="gray"
                          size="lg"
                          className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                          asChild
                        >
                          <TabsTrigger value={sub.name}>{sub.name}</TabsTrigger>
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
                    {(subcategories.length > 0
                      ? subcategories.slice(0, 5)
                      : [{ name: "All" }]
                    ).map((sub: any) => (
                      <TabsContent key={sub.name} value={sub.name}>
                        <SwiperContent slidesPerView="auto" spaceBetween={20}>
                          <SwiperSlide className="w-[355px] h-auto">
                            <article className="py-[50px] h-full min-h-[440px] rounded-lg bg-error-700 flex flex-col items-start justify-end px-6" style={{ backgroundColor: "#DC6803" }}>
                              <h1 className="text-[28px] font-bold leading-none text-white">
                                {sub.name} Projects
                              </h1>
                              <p className="mt-3 text-lg font-light leading-none text-white">
                                Discover high-quality {sub.name.toLowerCase()}{" "}
                                projects ready to launch.
                              </p>
                              <Button
                                className="rounded-full duration-300 hover:gap-x-3.5 transition-[column-gap] bg-white hover:text-warning-800 hover:bg-white text-warning-700 mt-8"
                                size="lg"
                              >
                                Explore More{" "}
                                <ArrowRight className="size-[15px]" />
                              </Button>
                            </article>
                          </SwiperSlide>
                          {fromLength(8).map((idx) => {
                            // Cycle through real listings so every card links to a real project detail page.
                            const project =
                              listingsProjects.length > 0
                                ? listingsProjects[
                                    idx % listingsProjects.length
                                  ]
                                : null
                            const mock = projectCardMocks[idx % projectCardMocks.length]
                            const href = project
                              ? buildProjectUrl(
                                  currentCategoryPath,
                                  project.slug,
                                  project.id
                                )
                              : buildProjectUrl(
                                  currentCategoryPath,
                                  mock.slug,
                                  mock.id
                                )
                            return (
                              <SwiperSlide
                                key={project?.id ?? idx}
                                className="w-[355px]"
                              >
                                <NextLink
                                  href={href}
                                  className="block focus-visible:outline-none"
                                >
                                  <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                    <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15 cursor-pointer">
                                      <NextImage
                                        className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                        src={
                                          project?.mediaUrls?.[0] ||
                                          mock.mediaUrl
                                        }
                                        alt={project?.title || mock.title}
                                        fill
                                        sizes="33vw"
                                      />
                                    </div>
                                    <div className="mt-3 flex items-start gap-x-3">
                                      <span className="font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline">
                                        {project?.title ||
                                          mock.title}
                                      </span>
                                      <div className="inline-flex items-center gap-x-1">
                                        <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                        <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                          4.9{" "}
                                          <span className="font-extralight">
                                            (5)
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                    <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                      {project?.description?.slice(0, 140) ||
                                        mock.description}
                                    </p>
                                    <div className="mt-[14.5px] flex flex-col gap-y-3">
                                      <div className="flex items-center gap-x-[6.4px]">
                                        <Clock className="size-[18px] shrink-0 text-primary-500" />
                                        <span className="font-medium text-sm leading-none text-dark-blue-400">
                                          Starting from{" "}
                                          {project?.duration || mock.duration.replace("Starting from ", "")}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[6.4px]">
                                        <Money className="size-[18px] shrink-0 text-primary-500" />
                                        <span className="font-medium text-sm leading-none text-dark-blue-400">
                                          {project?.budget
                                            ? `$${Number(
                                                project.budget
                                              ).toLocaleString()} budget`
                                            : mock.budget}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="mt-5 flex items-end justify-between">
                                      <AvatarGroup
                                        max={5}
                                        size="sm"
                                        excess
                                        excessClassName="border-gray-300 text-gray-500"
                                      >
                                        {(talentUsers.length > 0
                                          ? talentUsers.slice(0, 6)
                                          : fromLength(6)
                                        ).map((u: any, k: number) => (
                                          <Avatar
                                            key={u?.id ?? k}
                                            size="sm"
                                            className="border-2 border-white hover:ring-0 active:ring-0"
                                          >
                                            <AvatarImage
                                              src={u?.avatarUrl || "/woman.jpg"}
                                              alt={u?.firstName || "Team"}
                                            />
                                            <AvatarFallback>
                                              {u?.firstName?.[0] || "T"}
                                            </AvatarFallback>
                                          </Avatar>
                                        ))}
                                      </AvatarGroup>
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
                              </SwiperSlide>
                            )
                          })}
                        </SwiperContent>
                      </TabsContent>
                    ))}
                  </div>
                </SwiperRoot>
              </Tabs>
            </div>
          )}

          {/* {Category} Teams — teams-backed carousel. Visible on show-all
              and on the kind-filtered /teams page, where it serves as the
              primary "Top Software Development Teams" section from the L1
              Teams design. */}
          {isL1OrL2AllPage && (
            <div className="mt-[50px]">
              <Tabs defaultValue="Featured">
                <h1 className="text-[28px] leading-none text-dark-blue-400 font-bold">
                  {currentName} Teams
                </h1>
                <SwiperRoot>
                  <div className="mt-6 flex justify-between items-center">
                    <TabsList className="flex items-center gap-x-3">
                      {[
                        "Featured",
                        "Newest",
                        "Most Popular",
                        "Trending",
                        "Top-Rated",
                      ].map((tab) => (
                        <Badge
                          key={tab}
                          variant="circular"
                          visual="gray"
                          size="lg"
                          className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                          asChild
                        >
                          <TabsTrigger value={tab}>{tab}</TabsTrigger>
                        </Badge>
                      ))}
                    </TabsList>
                    <div className="flex items-center gap-x-8">
                      <Button
                        variant="link"
                        visual="gray"
                        size="lg"
                        className="underline hover:text-dark-blue-400"
                      >
                        Explore More Teams
                      </Button>
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
                  </div>
                  <div className="mt-6">
                    {[
                      "Featured",
                      "Newest",
                      "Most Popular",
                      "Trending",
                      "Top-Rated",
                    ].map((tabValue) => (
                      <TabsContent key={tabValue} value={tabValue}>
                        <SwiperContent slidesPerView={1} spaceBetween={20}>
                          {(() => {
                            const totalMockItems = fromLength(23)
                            const chunks = []
                            for (let i = 0; i < totalMockItems.length; i += 8) {
                              chunks.push(totalMockItems.slice(i, i + 8))
                            }
                            return chunks.map((chunk, page) => (
                              <SwiperSlide key={page}>
                                <div className="grid grid-cols-4 gap-5">
                                  {chunk.map((key) => (
                                    <ListingCard
                                      key={key}
                                      kind="team"
                                      id={`mock-${page}-${key}`}
                                      name="Team Name"
                                      handle="@Tech Sentinel"
                                      tagline={`${currentName} team`}
                                      experience="Average 10 years of experience"
                                      rate="$85 - $120/hr"
                                      locations="UK, USA, Brazil, Philippines, more..."
                                      rating={4.7}
                                      projectCount={2}
                                      skills={[
                                        "iOS",
                                        "E-commerce",
                                        "Mobile Application",
                                        "Small Business",
                                        "Software Development",
                                      ]}
                                      memberAvatars={Array.from(
                                        { length: 6 },
                                        () => "/woman.jpg"
                                      )}
                                      previousClientLogos={[
                                        "/google.png",
                                        "/microsoft.png",
                                        "/aws.png",
                                        "/instagram.png",
                                        "/spotify.png",
                                      ]}
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
                                  ))}
                                </div>
                              </SwiperSlide>
                            ))
                          })()}
                        </SwiperContent>
                      </TabsContent>
                    ))}
                  </div>
                </SwiperRoot>
              </Tabs>
            </div>
          )}

          {/* Popular Searches */}
          {isL1AllPage && (
            <div className="mt-[50px]">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Popular Searches
              </h1>
              <div className="mt-6 flex items-center flex-wrap gap-3">
                {[
                  "API Development",
                  "Cloud Migration",
                  "Data Pipeline",
                  "Machine Learning",
                  "Mobile App",
                  "Web Application",
                  "Microservices",
                  "DevOps",
                  "UI/UX Design",
                  "Database Optimization",
                ].map((term) => (
                  <NextLink
                    key={term}
                    href={`/search?q=${encodeURIComponent(term)}&category=${l1Meta.slug}`}
                    className="focus-visible:outline-none"
                  >
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-auto px-[13.21px] py-[4.6px] border-[1.15px] bg-gray-100 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-200 transition duration-300 cursor-pointer"
                    >
                      {term}
                    </Badge>
                  </NextLink>
                ))}
              </div>
            </div>
          )}



          {pageKind === "projects" && (
            <div className="mt-[50px]">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Top {currentName} Projects
              </h1>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-7">
                <div className="flex flex-wrap items-center gap-3">
                  {[
                    "Featured",
                    "Newest",
                    "Most Popular",
                    "Trending",
                    "Top-Rated",
                    "Bestsellers",
                  ].map((tab) => (
                    <Button
                      key={tab}
                      type="button"
                      variant="outlined"
                      visual="gray"
                      size="sm"
                      aria-pressed={activeTopProjectsTab === tab}
                      onClick={() => setActiveTopProjectsTab(tab)}
                      className={`h-8 rounded-full bg-white px-3.5 text-sm font-medium shadow-none ${
                        activeTopProjectsTab === tab
                          ? "border-2 border-dark-blue-400 text-dark-blue-400"
                          : "border-gray-300 text-gray-500 hover:border-dark-blue-400 hover:text-dark-blue-400"
                      }`}
                    >
                      {tab}
                    </Button>
                  ))}
                </div>

                <Button
                  asChild
                  variant="link"
                  visual="gray"
                  size="lg"
                  className="h-auto p-0 text-base font-bold text-gray-500 underline hover:text-dark-blue-400"
                >
                  <NextLink href={listingHref("projects")}>
                    Explore More Projects
                  </NextLink>
                </Button>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                {(() => {
                  const baseItems =
                    listingsProjects.length > 0
                      ? listingsProjects.slice(0, 8)
                      : fromLength(8)
                  const tabShiftMap: Record<string, number> = {
                    Featured: 0,
                    Newest: 1,
                    "Most Popular": 2,
                    Trending: 3,
                    "Top-Rated": 4,
                    Bestsellers: 5,
                  }
                  const shift = tabShiftMap[activeTopProjectsTab] ?? 0
                  const projectItems =
                    baseItems.length > 0
                      ? baseItems.slice(shift).concat(baseItems.slice(0, shift))
                      : baseItems

                  return projectItems.map((item: any, idx: number) => {
                    const project = listingsProjects.length > 0 ? item : null
                    const mock = projectCardMocks[idx % projectCardMocks.length]

                    return (
                      <ListingCard
                        key={project?.id ?? `top-project-${idx}`}
                        kind="project"
                        id={project?.id ?? `top-project-${idx}`}
                      title={project?.title || mock.title}
                      description={
                        project?.description?.slice(0, 120) ||
                        mock.description
                      }
                        mediaUrl={
                          project?.mediaUrls?.[0] ||
                          project?.coverImage ||
                          mock.mediaUrl
                        }
                      budget={project?.budget ? `$${Number(project.budget).toLocaleString()} budget` : mock.budget}
                      duration={project?.duration ? `Starting from ${project.duration}` : mock.duration}
                        rating={4.9}
                        reviewCount={5}
                        href={
                          project
                            ? buildProjectUrl(
                                currentCategoryPath,
                                project.slug,
                                project.id
                              )
                            : buildProjectUrl(
                                currentCategoryPath,
                                mock.slug,
                                mock.id
                              )
                        }
                        collaborators={(talentUsers.length > 0
                          ? talentUsers.slice(0, 6)
                          : Array(6).fill("/woman.jpg")
                        ).map(
                          (u: any) =>
                            (typeof u === "string" ? u : u?.avatarUrl) ||
                            "/woman.jpg"
                        )}
                        favoriteSlot={
                          <FavoriteRoot
                            value={
                              project
                                ? favoritedItems.has(String(project.id))
                                : undefined
                            }
                            onValueChange={
                              project
                                ? (pressed) =>
                                    handleFavoriteToggle(
                                      String(project.id),
                                      "project",
                                      pressed
                                    )
                                : undefined
                            }
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
                        }
                      />
                    )
                  })
                })()}
              </div>
            </div>
          )}

          {pageKind === "services" && (
            <div className="mt-[50px]">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Top {currentName} Services
              </h1>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-7">
                <div className="flex flex-wrap items-center gap-3">
                  {[
                    "Featured",
                    "Newest",
                    "Most Popular",
                    "Trending",
                    "Top-Rated",
                    "Bestsellers",
                  ].map((tab) => (
                    <Button
                      key={tab}
                      type="button"
                      variant="outlined"
                      visual="gray"
                      size="sm"
                      aria-pressed={activeTopServicesTab === tab}
                      onClick={() => setActiveTopServicesTab(tab)}
                      className={`h-8 rounded-full bg-white px-3.5 text-sm font-medium shadow-none ${
                        activeTopServicesTab === tab
                          ? "border-2 border-dark-blue-400 text-dark-blue-400"
                          : "border-gray-300 text-gray-500 hover:border-dark-blue-400 hover:text-dark-blue-400"
                      }`}
                    >
                      {tab}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="link"
                  visual="gray"
                  size="lg"
                  className="h-auto p-0 text-base font-bold text-gray-500 underline hover:text-dark-blue-400"
                >
                  Explore More Services
                </Button>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                {(() => {
                  const baseItems =
                    listingsServices.length > 0
                      ? listingsServices.slice(0, 8)
                      : fromLength(8)
                  const tabShiftMap: Record<string, number> = {
                    Featured: 0,
                    Newest: 1,
                    "Most Popular": 2,
                    Trending: 3,
                    "Top-Rated": 4,
                    Bestsellers: 5,
                  }
                  const shift = tabShiftMap[activeTopServicesTab] ?? 0
                  const serviceItems =
                    baseItems.length > 0
                      ? baseItems
                          .slice(shift)
                          .concat(baseItems.slice(0, shift))
                      : baseItems

                  return serviceItems.map((item: any, idx: number) => {
                  const service = listingsServices.length > 0 ? item : null
                  const mock = serviceCardMocks[idx % serviceCardMocks.length]

                  return (
                    <ListingCard
                      key={service?.id ?? `top-service-${idx}`}
                      kind="service"
                      id={service?.id ?? `top-service-${idx}`}
                      title={service?.title || mock.title}
                      description={
                        service?.description?.slice(0, 120) ||
                        mock.description
                      }
                      mediaUrl={service?.mediaUrls?.[0] || mock.mediaUrl}
                      budget={
                        service?.priceMin
                          ? `$${Number(service.priceMin).toLocaleString()}/month`
                          : mock.budget
                      }
                      rating={4.9}
                      reviewCount={5}
                      href={
                        service
                          ? buildServiceUrl(
                              currentCategoryPath,
                              service.slug,
                              service.id
                            )
                          : buildServiceUrl(
                              currentCategoryPath,
                              mock.slug,
                              mock.id
                            )
                      }
                      collaborators={(talentUsers.length > 0
                        ? talentUsers.slice(0, 6)
                        : Array(6).fill("/woman.jpg")
                      ).map(
                        (u: any) =>
                          (typeof u === "string" ? u : u?.avatarUrl) ||
                          "/woman.jpg"
                      )}
                      favoriteSlot={
                        <FavoriteRoot
                          value={
                            service
                              ? favoritedItems.has(String(service.id))
                              : undefined
                          }
                          onValueChange={
                            service
                              ? (pressed) =>
                                  handleFavoriteToggle(
                                    String(service.id),
                                    "service",
                                    pressed
                                  )
                              : undefined
                          }
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
                      }
                    />
                  )
                  })
                })()}
              </div>
            </div>
          )}

          {pageKind === "talent" && (
            <div className="mt-[50px]">
              <Tabs defaultValue="Featured">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <h1 className="text-[28px] font-bold leading-none text-dark-blue-400">
                      Top {currentName} Talent
                    </h1>
                    <TabsList className="mt-6 flex flex-wrap items-center gap-3">
                      {marketplaceTalentTabs.map((tab) => (
                        <TabsTrigger
                          key={tab}
                          value={tab}
                          className="flex h-8 items-center rounded-full border border-gray-300 bg-white px-3.5 text-sm font-medium text-gray-500 transition-colors data-[state=active]:border-2 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                        >
                          {tab}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  <Button
                    variant="link"
                    visual="gray"
                    size="lg"
                    className="mt-[58px] h-auto p-0 text-base font-bold text-gray-500 underline hover:text-dark-blue-400"
                  >
                    Explore More Talent
                  </Button>
                </div>

                <div className="mt-7">
                  {marketplaceTalentTabs.map((tabValue) => (
                <TabsContent
                  key={tabValue}
                  value={tabValue}
                  className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4"
                >
                  {Array.from({ length: 8 }, (_, idx) => topTalentMock[idx % topTalentMock.length]).map(
                    (talent, idx) => (
                      <TopTalentCard
                        key={`${tabValue}-${talent.id}-${idx}`}
                        talent={talent}
                      />
                    )
                  )}
                </TabsContent>                  
              ))}
                </div>
              </Tabs>
            </div>
          )}


          {isL2AllPage && (
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
              {[
                "JavaScript",
                "Python",
                "React",
                "Node.js",
                "TypeScript",
                "AWS",
                "Docker",
                "Kubernetes",
                "GraphQL",
                "PostgreSQL",
                "MongoDB",
              ].map((skill) => (
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
          )}

{isL1OrL2AllPage && (
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
                  className="rounded-full duration-300 hover:gap-x-3.5 transition-[column-gap] bg-white hover:bg-white/90 text-dark-blue-400 hover:text-dark-blue-400 mt-[50px]"
                  size="lg"
                >
                  Explore more <ArrowRight className="size-[15px]" />
                </Button>
              </div>
            </div>
          </div>
)}

          {/* Browse by Type — grid with Projects/Services tabs */}
          {isL1AllPage && (
          <div className="mt-[50px]">
            <Tabs defaultValue="Projects">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Browse by Type
              </h1>
              <SwiperRoot>
                <div className="mt-6 flex justify-between items-center">
                  <TabsList className="flex items-center gap-x-3">
                    {["Projects", "Services"].map((tab) => (
                      <Badge
                        key={tab}
                        variant="circular"
                        visual="gray"
                        size="lg"
                        className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
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
                  {["Projects", "Services"].map((tabValue) => {
                    const browseTypeNames = [
                      "Infrastructure as Code",
                      "API Development",
                      "Cloud Migration",
                      "CI/CD Pipeline",
                      "Database Design",
                      "Microservices",
                      "Containerization",
                      "Serverless",
                      "Monitoring",
                      "Security Audit",
                      "Load Balancing",
                      "Data Backup",
                    ]
                    const iconMap = resolveUniqueSubcategoryIcons(
                      browseTypeNames.map((name) => ({ name }))
                    )
                    return (
                      <TabsContent key={tabValue} value={tabValue}>
                        <SwiperContent slidesPerView={1} spaceBetween={20}>
                          {(() => {
                            const chunks = []
                            for (
                              let i = 0;
                              i < browseTypeNames.length;
                              i += 8
                            ) {
                              chunks.push(browseTypeNames.slice(i, i + 8))
                            }
                            return chunks.map((chunk, page) => (
                              <SwiperSlide key={page}>
                                <div className="grid grid-cols-4 gap-[15px]">
                                  {chunk.map((name, idx) => {
                                    const seedIndex = page * 8 + idx
                                    const projectMock =
                                      projectCardMocks[
                                        seedIndex % projectCardMocks.length
                                      ]
                                    const serviceMock =
                                      serviceCardMocks[
                                        seedIndex % serviceCardMocks.length
                                      ]
                                    const isServiceTab = tabValue === "Services"
                                    return (
                                      <article
                                        key={name}
                                        className="group border border-gray-200 bg-white rounded-lg p-5 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] hover:ring-1 hover:ring-gray-300 hover:border-gray-300 cursor-pointer transition duration-300"
                                      >
                                        <SubcategoryIconTile
                                          name={name}
                                          icon={iconMap.get(name)}
                                          className="!h-[35px] !w-[35px]"
                                        />
                                        <div className="mt-5">
                                          <span className="text-[10px] leading-none font-medium text-dark-blue-400">
                                            {isServiceTab ? "Service" : "DevOps"}
                                          </span>
                                          <h1 className="mt-1 text-base leading-none font-semibold text-dark-blue-400">
                                            {name}
                                          </h1>
                                        </div>
                                        <div className="mt-3 flex flex-col gap-y-2">
                                          <div className="flex items-center gap-x-[6.4px]">
                                            <Clock className="size-[18px] shrink-0 text-primary-500" />
                                            <span className="font-medium text-sm leading-none text-dark-blue-400">
                                              {isServiceTab
                                                ? `Starting from ${serviceMock.duration}`
                                                : projectMock.duration}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-x-[6.4px]">
                                            <Money className="size-[18px] shrink-0 text-primary-500" />
                                            <span className="font-medium text-sm leading-none text-dark-blue-400">
                                              {isServiceTab
                                                ? serviceMock.budget
                                                : projectMock.budget}
                                            </span>
                                          </div>
                                        </div>
                                      </article>
                                    )
                                  })}
                                </div>
                              </SwiperSlide>
                            ))
                          })()}
                        </SwiperContent>
                      </TabsContent>
                    )
                  })}
                </div>
              </SwiperRoot>
            </Tabs>
          </div>
          )}

          {/* <div className="mt-[50px]">
            <Tabs defaultValue="Back-End Development">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Recommended {pageKind === "show-all" ? `${currentName} Projects` : sectionLabel}
              </h1>
              <div className="mt-6 flex justify-between items-center">
                <TabsList className="flex items-center gap-x-3">
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
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
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Blockchain">Blockchain</TabsTrigger>
                  </Badge>
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
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
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
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
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
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
                      className="rounded-full duration-300 hover:gap-x-3.5 transition-[column-gap] bg-white hover:bg-white hover:text-warning-800 text-warning-700 mt-8"
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
                            href={listingHref("projects")}
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

                        <p className="mt-3 line-clamp-3 text-sm leading-[1.4] font-extralight text-dark-blue-400">
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
          </div> */}

          {/* Top {Category} Projects — Swiper with filter tabs */}
          {isL1OrL2AllPage && (
          <div className="mt-[50px]">
            <Tabs defaultValue="Featured">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Top {currentName} Projects
              </h1>
              <SwiperRoot>
                <div className="mt-6 flex justify-between items-center">
                  <TabsList className="flex items-center gap-x-3">
                    {[
                      "Featured",
                      "Newest",
                      "Most Popular",
                      "Trending",
                      "Top-Rated",
                    ].map((tab) => (
                      <Badge
                        key={tab}
                        variant="circular"
                        visual="gray"
                        size="lg"
                        className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                        asChild
                      >
                        <TabsTrigger value={tab}>{tab}</TabsTrigger>
                      </Badge>
                    ))}
                  </TabsList>
                  <div className="flex items-center gap-x-8">
                    <Button
                      variant="link"
                      visual="gray"
                      size="lg"
                      className="underline hover:text-dark-blue-400"
                    >
                      Explore More Projects
                    </Button>
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
                </div>
                <div className="mt-6">
                  {[
                    "Featured",
                    "Newest",
                    "Most Popular",
                    "Trending",
                    "Top-Rated",
                  ].map((tabValue) => (
                    <TabsContent key={tabValue} value={tabValue}>
                      <SwiperContent slidesPerView="auto" spaceBetween={20}>
                        {(listingsProjects.length > 0
                          ? listingsProjects.slice(0, 8)
                          : fromLength(8)
                        ).map((item: any, idx: number) => {
                          const project =
                            listingsProjects.length > 0 ? item : null
                          const mock = projectCardMocks[idx % projectCardMocks.length]
                          return (
                            <SwiperSlide
                              className="w-[355px]"
                              key={project?.id ?? idx}
                            >
                              <ListingCard
                                kind="project"
                                id={project?.id ?? `mock-${idx}`}
                                title={
                                  project?.title ||
                                  mock.title
                                }
                                description={
                                  project?.description?.slice(0, 120) ||
                                  mock.description
                                }
                                mediaUrl={
                                  project?.mediaUrls?.[0] || mock.mediaUrl
                                }
                        budget={project?.budget ? `$${Number(project.budget).toLocaleString()} budget` : mock.budget}
                        duration={project?.duration ? `Starting from ${project.duration}` : mock.duration}
                                rating={4.9}
                                reviewCount={5}
                                href={
                                  project
                                    ? buildProjectUrl(
                                        currentCategoryPath,
                                        project.slug,
                                        project.id
                                      )
                                    : buildProjectUrl(
                                        currentCategoryPath,
                                        mock.slug,
                                        mock.id
                                      )
                                }
                                collaborators={(talentUsers.length > 0
                                  ? talentUsers.slice(0, 6)
                                  : Array(6).fill("/woman.jpg")
                                ).map(
                                  (u: any) =>
                                    (typeof u === "string"
                                      ? u
                                      : u?.avatarUrl) || "/woman.jpg"
                                )}
                                favoriteSlot={
                                  project ? (
                                    <FavoriteRoot
                                      value={favoritedItems.has(
                                        String(project.id)
                                      )}
                                      onValueChange={(pressed) =>
                                        handleFavoriteToggle(
                                          String(project.id),
                                          "project",
                                          pressed
                                        )
                                      }
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
                                  ) : null
                                }
                              />
                            </SwiperSlide>
                          )
                        })}
                      </SwiperContent>
                    </TabsContent>
                  ))}
                </div>
              </SwiperRoot>
            </Tabs>
          </div>
          )}

          {/* Top {Category} Services — Swiper with filter tabs */}
          {isL1AllPage && (
            <div className="mt-[50px]">
              <Tabs defaultValue="Featured">
                <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                  Top {currentName} Services
                </h1>
                <SwiperRoot>
                  <div className="mt-6 flex justify-between items-center">
                    <TabsList className="flex items-center gap-x-3">
                      {[
                        "Featured",
                        "Newest",
                        "Most Popular",
                        "Trending",
                        "Top-Rated",
                        "Bestsellers",
                      ].map((tab) => (
                        <Badge
                          key={tab}
                          variant="circular"
                          visual="gray"
                          size="lg"
                          className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                          asChild
                        >
                          <TabsTrigger value={tab}>{tab}</TabsTrigger>
                        </Badge>
                      ))}
                    </TabsList>
                    <div className="flex items-center gap-x-8">
                      <Button
                        asChild
                        variant="link"
                        visual="gray"
                        size="lg"
                        className="underline hover:text-dark-blue-400"
                      >
                        <NextLink href={listingHref("services")}>
                          Explore More Services
                        </NextLink>
                      </Button>
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
                  </div>

                  <div className="mt-6">
                    {[
                      "Featured",
                      "Newest",
                      "Most Popular",
                      "Trending",
                      "Top-Rated",
                      "Bestsellers",
                    ].map((tabValue) => (
                      <TabsContent key={tabValue} value={tabValue}>
                        <SwiperContent slidesPerView="auto" spaceBetween={20}>
                          {(listingsServices.length > 0
                            ? listingsServices.slice(0, 8)
                            : fromLength(8)
                          ).map((item: any, idx: number) => {
                            const service =
                              listingsServices.length > 0 ? item : null
                            const mock =
                              serviceCardMocks[idx % serviceCardMocks.length]

                            return (
                              <SwiperSlide
                                className="w-[355px]"
                                key={service?.id ?? `${tabValue}-${idx}`}
                              >
                                <ListingCard
                                  kind="service"
                                  id={service?.id ?? `top-service-${idx}`}
                                  title={service?.title || mock.title}
                                  description={
                                    service?.description?.slice(0, 120) ||
                                    mock.description
                                  }
                                  mediaUrl={
                                    service?.mediaUrls?.[0] || mock.mediaUrl
                                  }
                                  budget={
                                    service?.priceMin
                                      ? `$${Number(service.priceMin).toLocaleString()}/month`
                                      : mock.budget
                                  }
                                  rating={4.9}
                                  reviewCount={5}
                                  href={
                                    service
                                      ? buildServiceUrl(
                                          currentCategoryPath,
                                          service.slug,
                                          service.id
                                        )
                                      : buildServiceUrl(
                                          currentCategoryPath,
                                          mock.slug,
                                          mock.id
                                        )
                                  }
                                  collaborators={(talentUsers.length > 0
                                    ? talentUsers.slice(0, 6)
                                    : Array(6).fill("/woman.jpg")
                                  ).map(
                                    (u: any) =>
                                      (typeof u === "string"
                                        ? u
                                        : u?.avatarUrl) || "/woman.jpg"
                                  )}
                                  favoriteSlot={
                                    <FavoriteRoot
                                      value={
                                        service
                                          ? favoritedItems.has(
                                              String(service.id)
                                            )
                                          : undefined
                                      }
                                      onValueChange={
                                        service
                                          ? (pressed) =>
                                              handleFavoriteToggle(
                                                String(service.id),
                                                "service",
                                                pressed
                                              )
                                          : undefined
                                      }
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
                                  }
                                />
                              </SwiperSlide>
                            )
                          })}
                        </SwiperContent>
                      </TabsContent>
                    ))}
                  </div>
                </SwiperRoot>
              </Tabs>
            </div>
          )}


          {pageKind === "teams" && (
            <div className="mt-[50px]">
              <Tabs defaultValue="Featured">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div>
                    <h1 className="text-[28px] font-bold leading-none text-dark-blue-400">
                      Top {currentName} Teams
                    </h1>
                    <TabsList className="mt-6 flex flex-wrap items-center gap-3">
                      {marketplaceTalentTabs.map((tab) => (
                        <TabsTrigger
                          key={tab}
                          value={tab}
                          className="flex h-8 items-center rounded-full border border-gray-300 bg-white px-3.5 text-sm font-medium text-gray-500 transition-colors data-[state=active]:border-2 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                        >
                          {tab}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  <Button
                    asChild
                    variant="link"
                    visual="gray"
                    size="lg"
                    className="mt-[58px] h-auto p-0 text-base font-bold text-gray-500 underline hover:text-dark-blue-400"
                  >
                    <NextLink href={listingHref("teams")}>
                      Explore More Teams
                    </NextLink>
                  </Button>
                </div>

                <div className="mt-7">
                  {marketplaceTalentTabs.map((tabValue) => (
                    <TabsContent
                      key={tabValue}
                      value={tabValue}
                      className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4"
                    >
                      {teamSeeds.map((team) => (
                        <ListingCard
                          key={`${tabValue}-${team.id}`}
                          kind="team"
                          id={team.id}
                          name={team.name}
                          handle={team.handle}
                          tagline={team.tagline}
                          experience={team.experience}
                          rate={team.rate}
                          locations={team.location}
                          rating={team.rating}
                          projectCount={team.completedProjects}
                          skills={team.skills}
                          memberAvatars={team.memberAvatars}
                          previousClientLogos={team.previousClientLogos}
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
                      ))}
                    </TabsContent>
                  ))}
                </div>
              </Tabs>
            </div>
          )}

          {pageKind === "services" && (
          <div className="mt-[50px]">
            <Tabs defaultValue="Featured">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Top Services
              </h1>
              <SwiperRoot>
                <div className="mt-6 flex justify-between items-center">
                  <TabsList className="flex items-center gap-x-3">
                    {[
                      "Featured",
                      "Newest",
                      "Most Popular",
                      "Trending",
                      "Top-Rated",
                    ].map((tab) => (
                      <Badge
                        key={tab}
                        variant="circular"
                        visual="gray"
                        size="lg"
                        className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                        asChild
                      >
                        <TabsTrigger value={tab}>{tab}</TabsTrigger>
                      </Badge>
                    ))}
                  </TabsList>
                  <div className="flex items-center gap-x-8">
                    <Button
                      variant="link"
                      visual="gray"
                      size="lg"
                      className="underline hover:text-dark-blue-400"
                    >
                      Explore More Services
                    </Button>
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
                </div>
                <div className="mt-6">
                  {[
                    "Featured",
                    "Newest",
                    "Most Popular",
                    "Trending",
                    "Top-Rated",
                  ].map((tabValue) => (
                    <TabsContent key={tabValue} value={tabValue}>
                      <SwiperContent slidesPerView="auto" spaceBetween={20}>
                        {(listingsServices.length > 0
                          ? listingsServices.slice(0, 8)
                          : fromLength(8)
                        ).map((item: any, idx: number) => {
                          const service =
                            listingsServices.length > 0 ? item : null
                          const mock =
                            serviceCardMocks[idx % serviceCardMocks.length]
                          return (
                            <SwiperSlide
                              className="w-[355px]"
                              key={service?.id ?? idx}
                            >
                              <ListingCard
                                kind="service"
                                id={service?.id ?? `mock-${idx}`}
                                title={service?.title || mock.title}
                                description={
                                  service?.description?.slice(0, 120) ||
                                  mock.description
                                }
                                mediaUrl={service?.mediaUrls?.[0] || mock.mediaUrl}
                                budget={
                                  service?.priceMin
                                    ? `$${Number(service.priceMin).toLocaleString()} - $${Number(service.priceMax).toLocaleString()}/month`
                                    : mock.budget
                                }
                                rating={4.9}
                                reviewCount={5}
                                href={
                                  service
                                    ? buildServiceUrl(
                                        currentCategoryPath,
                                        service.slug,
                                        service.id
                                      )
                                    : buildServiceUrl(
                                        currentCategoryPath,
                                        mock.slug,
                                        mock.id
                                      )
                                }
                                collaborators={(talentUsers.length > 0
                                  ? talentUsers.slice(0, 6)
                                  : Array(6).fill("/woman.jpg")
                                ).map(
                                  (u: any) =>
                                    (typeof u === "string"
                                      ? u
                                      : u?.avatarUrl) || "/woman.jpg"
                                )}
                                favoriteSlot={
                                  service ? (
                                    <FavoriteRoot
                                      value={favoritedItems.has(
                                        String(service.id)
                                      )}
                                      onValueChange={(pressed) =>
                                        handleFavoriteToggle(
                                          String(service.id),
                                          "service",
                                          pressed
                                        )
                                      }
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
                                  ) : null
                                }
                              />
                            </SwiperSlide>
                          )
                        })}
                      </SwiperContent>
                    </TabsContent>
                  ))}
                </div>
              </SwiperRoot>
            </Tabs>
          </div>
          )}
          {isL1OrL2AllPage && (
          <div className="mt-[50px]">
            <Tabs defaultValue="Project Type">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Narrow Your {sectionLabel} Search
              </h1>
              <div className="mt-6 flex justify-between items-center">
                <TabsList className="flex items-center gap-x-3">
                  <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Project Type">Project Type</TabsTrigger>
                  </Badge>
                  {/* <Badge
                    variant="circular"
                    visual="gray"
                    size="lg"
                    className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                    asChild
                  >
                    <TabsTrigger value="Industry">Industry</TabsTrigger>
                  </Badge> */}
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Budget">Budget</TabsTrigger>
                    </Badge>
                    <Badge
                      variant="circular"
                      visual="gray"
                      size="lg"
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
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
                      className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                      asChild
                    >
                      <TabsTrigger value="Team Size">Team Size</TabsTrigger>
                    </Badge>
                  </TabsList>

                  <Button
                    size="lg"
                    variant="link"
                    visual="gray"
                    className="hover:text-dark-blue-400"
                  >
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
                    {[
                      "Web App",
                      "Mobile App",
                      "Desktop App",
                      "SaaS Platform",
                      "API / Backend",
                      "E-commerce Store",
                      "Landing Page",
                      "Chrome Extension",
                      "CLI Tool",
                      "Game",
                    ].map((projectType) => (
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
                    {[
                      "Agriculture",
                      "Oil & Gas",
                      "Manufacturing",
                      "Construction",
                      "Utilities",
                      "Retail & Wholesale",
                      "Transportation",
                      "Finance & Banking",
                      "Real Estate",
                      "Healthcare",
                    ].map((industry) => (
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
                    {[
                      "1 - 3 months",
                      "3 - 6 months",
                      "6 - 12 months",
                      "12 - 18 months",
                      "18 - 24 months",
                      "24+ months",
                    ].map((duration) => (
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
                    {[
                      "1 - 2 members",
                      "2 - 5 members",
                      "5 - 10 members",
                      "10 - 15 members",
                      "15 - 20 members",
                      "20+ members",
                    ].map((size) => (
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
          )}

          {/* {Category} All Stars — talent Swiper with filter tabs */}
          {isL1AllPage && (
            <div className="mt-[50px]">
              <Tabs defaultValue="Featured">
                <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                  {isL2AllPage
                    ? `All Stars in ${currentName}`
                    : `${currentName} All Stars`}
                </h1>
                <SwiperRoot>
                  <div className="mt-6 flex justify-between items-center">
                    <TabsList className="flex items-center gap-x-3">
                      {[
                        "Featured",
                        "Newest",
                        "Most Popular",
                        "Trending",
                        "Top-Rated",
                      ].map((tab) => (
                        <Badge
                          key={tab}
                          variant="circular"
                          visual="gray"
                          size="lg"
                          className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                          asChild
                        >
                          <TabsTrigger value={tab}>{tab}</TabsTrigger>
                        </Badge>
                      ))}
                    </TabsList>
                    <div className="flex items-center gap-x-8">
                      <Button
                        variant="link"
                        visual="gray"
                        size="lg"
                        className="hover:underline hover:text-dark-blue-400"
                      >
                        Explore More All Stars
                      </Button>
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
                  </div>
                  <div className="mt-6">
                    {[
                      "Featured",
                      "Newest",
                      "Most Popular",
                      "Trending",
                      "Top-Rated",
                    ].map((tabValue) => (
                      <TabsContent key={tabValue} value={tabValue}>
                        <SwiperContent slidesPerView="auto" spaceBetween={20}>
                          <SwiperSlide className="w-[355px] h-auto">
                            <article
                              className="py-[50px] h-full min-h-[440px] rounded-lg bg-error-700 flex flex-col items-start justify-end px-6"
                              style={{ backgroundColor: "#2459DB" }}
                            >
                                <h1 className="text-[28px] font-bold leading-none text-white">
                                  {currentName} Talent
                                </h1>
                                <p className="mt-4 text-lg font-light leading-snug text-white opacity-90 max-w-[280px]">
                                  Find {currentName.toLowerCase()} talent to
                                  bring your projects to life.
                                </p>
                              <div className="flex flex-col gap-y-4">
                                <Button
                                  asChild
                                  className="rounded-full duration-300 hover:gap-x-3.5 transition-[column-gap] bg-white hover:bg-white/90 text-[#2459DB] hover:text-[#2459DB] px-6 h-12 text-base font-semibold"
                                  size="lg"
                                >

                                  <NextLink href={listingHref("talent")}>
                                    Explore More{" "}
                                    <ArrowRight className="size-[15px] ml-2" />
                                  </NextLink>
                                </Button>
                              </div>
                            </article>
                          </SwiperSlide>
                          {(talentUsers.length > 0
                            ? talentUsers.slice(0, 8)
                            : fromLength(8)
                          ).map((u: any, idx: number) => (
                            <SwiperSlide
                              className="w-[355px]"
                              key={u?.id ?? idx}
                            >
                              {talentUsers.length > 0 ? (
                                <ListingCard
                                  kind="talent"
                                  {...talentToCardProps(u, idx)}
                                />
                              ) : (
                                <ListingCard
                                  kind="talent"
                                  id={`mock-${idx}`}
                                  username={`expert-${idx}`}
                                  name="Expert Freelancer"
                                  role={`${currentName} Specialist`}
                                  photo="/woman.jpg"
                                  rate="$75/hr"
                                  rating={4.9}
                                  projects={12}
                                  skills={["React", "TypeScript", "Node.js"]}
                                />
                              )}
                            </SwiperSlide>
                          ))}
                        </SwiperContent>
                      </TabsContent>
                    ))}
                  </div>
                </SwiperRoot>
              </Tabs>
            </div>
          )}
          {isL1AllPage && (
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
              {[
                "JavaScript",
                "Python",
                "React",
                "Node.js",
                "TypeScript",
                "AWS",
                "Docker",
                "Kubernetes",
                "GraphQL",
                "PostgreSQL",
                "MongoDB",
              ].map((skill) => (
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
          )}

          {pageKind !== "show-all" && (
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
                  className="rounded-full duration-300 hover:gap-x-3.5 transition-[column-gap] bg-white hover:bg-white/90 text-dark-blue-400 hover:text-dark-blue-400 mt-[50px]"
                  size="lg"
                >
                  Explore more <ArrowRight className="size-[15px]" />
                </Button>
              </div>
            </div>
          </div>
)}

            {pageKind !== "show-all" && l1 && !l2 && !l3 && (
            <div className="mt-[50px]">
              <Tabs defaultValue={subcategories[0]?.name || "All"}>
                <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                  Recommended {currentName} {sectionLabel}
                </h1>
                <SwiperRoot>
                  <div className="mt-6 flex justify-between items-center">
                    <TabsList className="flex items-center gap-x-3">
                      {(subcategories.length > 0
                        ? subcategories.slice(0, 5)
                        : [{ name: "All" }]
                      ).map((sub: any) => (
                        <Badge
                          key={sub.name}
                          variant="circular"
                          visual="gray"
                          size="lg"
                          className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                          asChild
                        >
                          <TabsTrigger value={sub.name}>{sub.name}</TabsTrigger>
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
                    {(subcategories.length > 0
                      ? subcategories.slice(0, 5)
                      : [{ name: "All" }]
                    ).map((sub: any) => (
                      <TabsContent key={sub.name} value={sub.name}>
                        <SwiperContent slidesPerView="auto" spaceBetween={20}>
                    <SwiperSlide className="w-[355px] h-auto">
                      <article className="h-full min-h-[430px] rounded-lg bg-[#E86600] px-8 py-[50px] flex flex-col items-start justify-end text-white">
                        <h2 className="text-[28px] font-bold leading-[1.2]">
                          {currentName} {sectionLabel}
                        </h2>
                        <p className="mt-5 text-xl font-light leading-snug">
                          Discover high-quality{" "}
                          {currentName.toLowerCase()}{" "}
                          {sectionLabel.toLowerCase()} ready to launch.
                        </p>
                        <Button
                          asChild
                          className="mt-12 rounded-full duration-300 hover:gap-x-3.5 transition-[column-gap] bg-white px-6 text-[#B54708] hover:bg-white/90 hover:text-[#B54708]"
                          size="lg"
                        >
                          <NextLink href={listingHref(pageKind)}>
                            Explore More <ArrowRight className="size-[15px]" />
                          </NextLink>
                        </Button>
                      </article>
                    </SwiperSlide>

                    {pageKind === "projects" &&
                      (listingsProjects.length > 0
                        ? listingsProjects.slice(0, 8)
                        : fromLength(8)
                      ).map((item: any, idx: number) => {
                        const project =
                          listingsProjects.length > 0 ? item : null
                        const mock =
                          projectCardMocks[idx % projectCardMocks.length]
                        return (
                          <SwiperSlide
                            className="w-[355px]"
                            key={project?.id ?? idx}
                          >
                            <ListingCard
                              kind="project"
                              id={project?.id ?? `recommended-project-${idx}`}
                              title={project?.title || mock.title}
                              description={
                                project?.description?.slice(0, 120) ||
                                mock.description
                              }
                              mediaUrl={
                                project?.mediaUrls?.[0] ||
                                project?.coverImage ||
                                mock.mediaUrl
                              }
                              budget={
                                project?.budget
                                  ? `$${Number(project.budget).toLocaleString()}/month`
                                  : mock.budget
                              }
                              rating={4.9}
                              reviewCount={5}
                              href={
                                project
                                  ? buildProjectUrl(
                                      currentCategoryPath,
                                      project.slug,
                                      project.id
                                    )
                                  : buildProjectUrl(
                                      currentCategoryPath,
                                      mock.slug,
                                      mock.id
                                    )
                              }
                              collaborators={(talentUsers.length > 0
                                ? talentUsers.slice(0, 6)
                                : Array(6).fill("/woman.jpg")
                              ).map(
                                (u: any) =>
                                  (typeof u === "string"
                                    ? u
                                    : u?.avatarUrl) || "/woman.jpg"
                              )}
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
                          </SwiperSlide>
                        )
                      })}

                    {pageKind === "services" &&
                      (listingsServices.length > 0
                        ? listingsServices.slice(0, 8)
                        : fromLength(8)
                      ).map((item: any, idx: number) => {
                        const service =
                          listingsServices.length > 0 ? item : null
                        const mock =
                          serviceCardMocks[idx % serviceCardMocks.length]
                        return (
                          <SwiperSlide
                            className="w-[355px]"
                            key={service?.id ?? idx}
                          >
                            <ListingCard
                              kind="service"
                              id={service?.id ?? `recommended-service-${idx}`}
                              title={
                                service?.title ||
                                mock.title
                              }
                              description={
                                service?.description?.slice(0, 120) ||
                                mock.description
                              }
                              mediaUrl={
                                service?.mediaUrls?.[0] ||
                                service?.coverImage ||
                                mock.mediaUrl
                              }
                              budget={
                                service?.priceMin
                                  ? `$${Number(service.priceMin).toLocaleString()}/month`
                                  : mock.budget
                              }
                              rating={4.9}
                              reviewCount={5}
                              href={
                                service
                                  ? buildServiceUrl(
                                      currentCategoryPath,
                                      service.slug,
                                      service.id
                                    )
                                  : buildServiceUrl(
                                      currentCategoryPath,
                                      mock.slug,
                                      mock.id
                                    )
                              }
                              collaborators={(talentUsers.length > 0
                                ? talentUsers.slice(0, 6)
                                : Array(6).fill("/woman.jpg")
                              ).map(
                                (u: any) =>
                                  (typeof u === "string"
                                    ? u
                                    : u?.avatarUrl) || "/woman.jpg"
                              )}
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
                          </SwiperSlide>
                        )
                      })}

                    {pageKind === "teams" &&
                      teamSeeds.map((team) => (
                        <SwiperSlide
                          className="w-[355px]"
                          key={`recommended-team-${team.id}`}
                        >
                          <ListingCard
                            kind="team"
                            id={team.id}
                            name={team.name}
                            handle={team.handle}
                            tagline={team.tagline}
                            experience={team.experience}
                            rate={team.rate}
                            locations={team.location}
                            rating={team.rating}
                            projectCount={team.completedProjects}
                            skills={team.skills}
                            memberAvatars={team.memberAvatars}
                            previousClientLogos={team.previousClientLogos}
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
                        </SwiperSlide>
                      ))}

                    {pageKind === "talent" &&
                      topTalentMock.map((talent) => (
                        <SwiperSlide
                          className="w-[355px]"
                          key={`recommended-${talent.id}`}
                        >
                          <TopTalentCard talent={talent} />
                        </SwiperSlide>
                      ))}
                        </SwiperContent>
                      </TabsContent>
                    ))}
                  </div>
                </SwiperRoot>
              </Tabs>
            </div>
          )}

          {isL1AllPage && (
            <div className="mt-[50px]">
              <Tabs defaultValue={subcategories[0]?.name || "All"}>
                <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                  {isL2AllPage
                    ? `Newest Talent in ${currentName}`
                    : `Newest ${currentName} Talent`}
                </h1>
                <SwiperRoot>
                  <div className="mt-6 flex justify-between items-center">
                    <TabsList className="flex items-center gap-x-3">
                      {(subcategories.length > 0
                        ? subcategories.slice(0, 5)
                        : [{ name: "All" }]
                      ).map((sub: any) => (
                        <Badge
                          key={sub.name}
                          variant="circular"
                          visual="gray"
                          size="lg"
                          className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                          asChild
                        >
                          <TabsTrigger value={sub.name}>{sub.name}</TabsTrigger>
                        </Badge>
                      ))}
                    </TabsList>
                    <div className="flex items-center gap-x-8">
                      <Button
                        variant="link"
                        visual="gray"
                        size="lg"
                        className="underline hover:text-dark-blue-400"
                      >
                        Explore More Talent
                      </Button>
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
                  </div>
                  <div className="mt-6">
                    {(subcategories.length > 0
                      ? subcategories.slice(0, 5)
                      : [{ name: "All" }]
                    ).map((sub: any) => (
                      <TabsContent key={sub.name} value={sub.name}>
                        <SwiperContent slidesPerView="auto" spaceBetween={20}>
                          <SwiperSlide className="w-[355px] h-auto">
                            <article
                              className="py-[50px] h-full min-h-[440px] rounded-lg bg-error-700 flex flex-col items-start justify-end px-6"
                              style={{ backgroundColor: "#027A48" }}
                            >
                              <h1 className="text-[28px] font-bold leading-none text-white">
                                New {currentName} Talent
                              </h1>
                              <p className="mt-3 text-lg font-light leading-none text-white">
                                Discover the newest {currentName.toLowerCase()}{" "}
                                experts joining our community.
                              </p>
                              <div className="mt-8 flex flex-col gap-y-3">
                                <Button
                                  asChild
                                  className="rounded-full duration-300 hover:gap-x-3.5 transition-[column-gap] bg-white hover:bg-white/90 text-[#027A48] hover:text-[#027A48] px-6 h-12 text-base font-semibold"
                                  size="lg"
                                >
                                  <NextLink href={listingHref("talent")}>
                                    Explore More{" "}
                                    <ArrowRight className="size-[15px] ml-2" />
                                  </NextLink>
                                </Button>
                              </div>
                            </article>
                          </SwiperSlide>
                          {(talentUsers.length > 0
                            ? talentUsers.slice(0, 8)
                            : fromLength(8)
                          ).map((u: any, idx: number) => (
                            <SwiperSlide
                              className="w-[355px]"
                              key={u?.id ?? idx}
                            >
                              {talentUsers.length > 0 ? (
                                <ListingCard
                                  kind="talent"
                                  {...talentToCardProps(u, idx)}
                                />
                              ) : (
                                <ListingCard
                                  kind="talent"
                                  id={`mock-${idx}`}
                                  username={`expert-${idx}`}
                                  name="Expert Freelancer"
                                  role={`${currentName} Specialist`}
                                  photo="/woman.jpg"
                                  rate="$75/hr"
                                  rating={4.9}
                                  projects={12}
                                  skills={["React", "TypeScript", "Node.js"]}
                                />
                              )}
                            </SwiperSlide>
                          ))}
                        </SwiperContent>
                      </TabsContent>
                    ))}
                  </div>
                </SwiperRoot>
              </Tabs>
            </div>
          )}

          {isL1OrL2AllPage && (
          <div className="mt-[50px]">
            <div className="flex items-center justify-between">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Browse by Technology
              </h1>

              <NextLink href="/technologies">
                <Button
                  size="lg"
                  variant="link"
                  visual="gray"
                  className="hover:text-dark-blue-400"
                >
                  View All technologies <ArrowRight className="size-[15px]" />
                </Button>
              </NextLink>
            </div>

            <div className="gap-[15px] mt-6 grid grid-cols-6">
              {(
                CATEGORY_TECHNOLOGIES[l1Meta.slug] ??
                CATEGORY_TECHNOLOGIES["software-development"]
              ).map((tech) => (
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
                    <h1 className="text-xs font-medium leading-none text-dark-blue-400 text-center">
                      {tech.name}
                    </h1>
                  </article>
                </NextLink>
              ))}
            </div>
          </div>
          )}

          {/* {Category} All Stars — talent Swiper with filter tabs */}
          {isL2AllPage && (
            <div className="mt-[50px]">
              <Tabs defaultValue="Featured">
                <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                  {isL2AllPage
                    ? `All Stars in ${currentName}`
                    : `${currentName} All Stars`}
                </h1>
                <SwiperRoot>
                  <div className="mt-6 flex justify-between items-center">
                    <TabsList className="flex items-center gap-x-3">
                      {[
                        "Featured",
                        "Newest",
                        "Most Popular",
                        "Trending",
                        "Top-Rated",
                      ].map((tab) => (
                        <Badge
                          key={tab}
                          variant="circular"
                          visual="gray"
                          size="lg"
                          className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                          asChild
                        >
                          <TabsTrigger value={tab}>{tab}</TabsTrigger>
                        </Badge>
                      ))}
                    </TabsList>
                    <div className="flex items-center gap-x-8">
                      <Button
                        variant="link"
                        visual="gray"
                        size="lg"
                        className="hover:underline hover:text-dark-blue-400"
                      >
                        Explore More All Stars
                      </Button>
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
                  </div>
                  <div className="mt-6">
                    {[
                      "Featured",
                      "Newest",
                      "Most Popular",
                      "Trending",
                      "Top-Rated",
                    ].map((tabValue) => (
                      <TabsContent key={tabValue} value={tabValue}>
                        <SwiperContent slidesPerView="auto" spaceBetween={20}>
                          <SwiperSlide className="w-[355px] h-auto">
                            <article
                              className="h-full min-h-[440px] rounded-lg bg-success-700 p-10 flex flex-col items-start justify-between"
                              style={{ backgroundColor: "#2459DB" }}
                            >
                                <h1 className="text-[28px] font-bold leading-none text-white">
                                  {currentName} Talent
                                </h1>
                                <p className="mt-3 text-lg font-light leading-none text-white">
                                  Find {currentName.toLowerCase()} talent to
                                  bring your projects to life.
                                </p>
                              <div className="flex flex-col gap-y-4">
                                <Button
                                  asChild
                                  className="rounded-full duration-300 hover:gap-x-3.5 transition-[column-gap] bg-white hover:bg-white/90 text-[#2459DB] hover:text-[#2459DB] px-6 h-12 text-base font-semibold"
                                  size="lg"
                                >
                                  <NextLink href={listingHref("talent")}>
                                    Explore More{" "}
                                    <ArrowRight className="size-[15px] ml-2" />
                                  </NextLink>
                                </Button>
                              </div>
                            </article>
                          </SwiperSlide>
                          {(talentUsers.length > 0
                            ? talentUsers.slice(0, 8)
                            : fromLength(8)
                          ).map((u: any, idx: number) => (
                            <SwiperSlide
                              className="w-[355px]"
                              key={u?.id ?? idx}
                            >
                              {talentUsers.length > 0 ? (
                                <ListingCard
                                  kind="talent"
                                  {...talentToCardProps(u, idx)}
                                />
                              ) : (
                                <ListingCard
                                  kind="talent"
                                  id={`mock-${idx}`}
                                  username={`expert-${idx}`}
                                  name="Expert Freelancer"
                                  role={`${currentName} Specialist`}
                                  photo="/woman.jpg"
                                  rate="$75/hr"
                                  rating={4.9}
                                  projects={12}
                                  skills={["React", "TypeScript", "Node.js"]}
                                />
                              )}
                            </SwiperSlide>
                          ))}
                        </SwiperContent>
                      </TabsContent>
                    ))}
                  </div>
                </SwiperRoot>
              </Tabs>
            </div>
          )}

          {isL1OrL2AllPage && (
          <div className="relative overflow-hidden h-[298px] mt-[50px] p-[50px] rounded-lg">
            <NextImage
              className="object-cover"
              src="/vr-4.png"
              sizes="100vw"
              alt={`${currentName} hero`}
              fill
            />
            <div className="absolute inset-0 bg-black/40 p-[50px] flex justify-end items-center">
              <div className="max-w-[750px]">
                <h1 className="text-white text-4xl font-bold leading-none">
                  Fueling the Future of {sectionLabel}
                </h1>

                <p className="text-xl mt-2 font-light leading-none text-white">
                  Discover {sectionLabel.toLowerCase()} experts and projects
                  tailored to your goals.
                </p>

                <Button
                  asChild
                  className="rounded-full duration-300 hover:gap-x-3.5 transition-[column-gap] bg-white hover:bg-white/90 text-dark-blue-400 hover:text-dark-blue-400 mt-[50px]"
                  size="lg"
                >
                  <NextLink href={listingHref("projects")}>
                    Explore {sectionLabel}{" "}
                    <ArrowRight className="size-[15px]" />
                  </NextLink>
                </Button>
              </div>
            </div>
          </div>
          )}

          {isL2AllPage && (
            <div className="mt-[50px]">
              <Tabs defaultValue={subcategories[0]?.name || "All"}>
                <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                  {isL2AllPage
                    ? `Newest Talent in ${currentName}`
                    : `Newest ${currentName} Talent`}
                </h1>
                <SwiperRoot>
                  <div className="mt-6 flex justify-between items-center">
                    <TabsList className="flex items-center gap-x-3">
                      {(subcategories.length > 0
                        ? subcategories.slice(0, 5)
                        : [{ name: "All" }]
                      ).map((sub: any) => (
                        <Badge
                          key={sub.name}
                          variant="circular"
                          visual="gray"
                          size="lg"
                          className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                          asChild
                        >
                          <TabsTrigger value={sub.name}>{sub.name}</TabsTrigger>
                        </Badge>
                      ))}
                    </TabsList>
                    <div className="flex items-center gap-x-8">
                      <Button
                        variant="link"
                        visual="gray"
                        size="lg"
                        className="underline hover:text-dark-blue-400"
                      >
                        Explore More Talent
                      </Button>
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
                  </div>
                  <div className="mt-6">
                    {(subcategories.length > 0
                      ? subcategories.slice(0, 5)
                      : [{ name: "All" }]
                    ).map((sub: any) => (
                      <TabsContent key={sub.name} value={sub.name}>
                        <SwiperContent slidesPerView="auto" spaceBetween={20}>
                          <SwiperSlide className="w-[355px] h-auto">
                            <article
                              className="h-full min-h-[440px] rounded-lg bg-success-700 p-10 flex flex-col items-start justify-between"
                              style={{ backgroundColor: "#027A48" }}
                            >
                              <div className="pt-6">
                                <h1 className="text-4xl font-bold leading-[1.1] text-white tracking-tight">
                                  New {currentName} Talent
                                </h1>
                                <p className="mt-4 text-lg font-light leading-snug text-white opacity-90 max-w-[280px]">
                                  Discover the newest{" "}
                                  {currentName.toLowerCase()} experts joining
                                  our community.
                                </p>
                              </div>
                              <div className="flex flex-col gap-y-4">
                                <Button
                                  asChild
                                  className="rounded-full duration-300 hover:gap-x-3.5 transition-[column-gap] bg-white hover:bg-white/90 text-[#027A48] hover:text-[#027A48] px-6 h-12 text-base font-semibold"
                                  size="lg"
                                >
                                  <NextLink href={listingHref("talent")}>
                                    Explore More{" "}
                                    <ArrowRight className="size-[15px] ml-2" />
                                  </NextLink>
                                </Button>
                              </div>
                            </article>
                          </SwiperSlide>
                          {(talentUsers.length > 0
                            ? talentUsers.slice(0, 8)
                            : fromLength(8)
                          ).map((u: any, idx: number) => (
                            <SwiperSlide
                              className="w-[355px]"
                              key={u?.id ?? idx}
                            >
                              {talentUsers.length > 0 ? (
                                <ListingCard
                                  kind="talent"
                                  {...talentToCardProps(u, idx)}
                                />
                              ) : (
                                <ListingCard
                                  kind="talent"
                                  id={`mock-${idx}`}
                                  username={`expert-${idx}`}
                                  name="Expert Freelancer"
                                  role={`${currentName} Specialist`}
                                  photo="/woman.jpg"
                                  rate="$75/hr"
                                  rating={4.9}
                                  projects={12}
                                  skills={["React", "TypeScript", "Node.js"]}
                                />
                              )}
                            </SwiperSlide>
                          ))}
                        </SwiperContent>
                      </TabsContent>
                    ))}
                  </div>
                </SwiperRoot>
              </Tabs>
            </div>
          )}


          {isL1OrL2AllPage && (
            <div className="mt-[50px]">
              <Tabs defaultValue={subcategories[0]?.name || "All"}>
                <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                  {isL2AllPage
                    ? `Top Services in ${currentName}`
                    : `In-Demand Services in ${sectionLabel}`}
                </h1>
                <SwiperRoot>
                  <div className="mt-6 flex justify-between items-center">
                    <TabsList className="flex items-center gap-x-3">
                      {(subcategories.length > 0
                        ? subcategories.slice(0, 5)
                        : [{ name: "All" }]
                      ).map((sub: any) => (
                        <Badge
                          key={sub.name}
                          variant="circular"
                          visual="gray"
                          size="lg"
                          className="h-8 border bg-white border-gray-300 px-3.5 text-gray-500 transition-colors duration-200 hover:border-dark-blue-400 hover:text-dark-blue-400 data-[state=active]:ring-1 data-[state=active]:ring-dark-blue-400 data-[state=active]:border-dark-blue-400 data-[state=active]:text-dark-blue-400"
                          asChild
                        >
                          <TabsTrigger value={sub.name}>{sub.name}</TabsTrigger>
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
                    {(subcategories.length > 0
                      ? subcategories.slice(0, 5)
                      : [{ name: "All" }]
                    ).map((sub: any) => (
                      <TabsContent key={sub.name} value={sub.name}>
                        <SwiperContent slidesPerView="auto" spaceBetween={20}>
                          <SwiperSlide className="w-[355px] h-auto">
                            <article className="py-[50px] h-full rounded-lg bg-error-700 flex flex-col items-start justify-end px-6">
                              <h1 className="text-[28px] font-bold leading-none text-white">
                                Cybersecurity Services
                              </h1>
                              <p className="mt-3 text-lg font-light leading-none text-white">
                                Explore cloud computing services tailored to
                                meet your unique business needs.
                              </p>
                              <div className="mt-8 flex flex-col gap-y-3">
                                <Button
                                  className="rounded-full duration-300 hover:gap-x-3.5 transition-[column-gap] bg-white hover:text-error-800 hover:bg-white text-error-700"
                                  size="lg"
                                >
                                  Explore More{" "}
                                  <ArrowRight className="size-[15px]" />
                                </Button>
                              </div>
                            </article>
                          </SwiperSlide>
                          {(listingsServices.length > 0
                            ? listingsServices.slice(0, 8)
                            : fromLength(8)
                          ).map((item: any, idx: number) => {
                            const service =
                              listingsServices.length > 0 ? item : null
                            const mock =
                              serviceCardMocks[idx % serviceCardMocks.length]
                            const href = service
                              ? buildServiceUrl(
                                  currentCategoryPath,
                                  service.slug,
                                  service.id
                                )
                              : buildServiceUrl(
                                  currentCategoryPath,
                                  mock.slug,
                                  mock.id
                                )
                            return (
                              <SwiperSlide
                                key={service?.id ?? idx}
                                className="w-[355px]"
                              >
                                <NextLink
                                  href={href}
                                  className="block focus-visible:outline-none"
                                >
                                  <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                    <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15 cursor-pointer">
                                      <NextImage
                                        className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                        src={
                                          service?.mediaUrls?.[0] ||
                                          mock.mediaUrl
                                        }
                                        alt={service?.title || mock.title}
                                        fill
                                        sizes="33vw"
                                      />
                                      <span className="absolute right-2 top-2 inline-flex max-w-[60%] items-center gap-1 truncate rounded-md bg-dark-blue-400/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                                        <svg
                                          viewBox="0 0 24 24"
                                          className="size-3 shrink-0"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2.5"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          aria-hidden="true"
                                        >
                                          <path d="M21 12a9 9 0 0 1-15.5 6.3" />
                                          <path d="M3 12A9 9 0 0 1 18.5 5.7" />
                                          <path d="M7 18H5v-2" />
                                          <path d="M17 6h2v2" />
                                        </svg>
                                        <span className="truncate">Service</span>
                                      </span>
                                    </div>
                                    <div className="mt-3 flex items-start gap-x-3">
                                      <span className="font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline">
                                        {service?.title || mock.title}
                                      </span>
                                      <div className="inline-flex items-center gap-x-1">
                                        <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                        <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                          4.9{" "}
                                          <span className="font-extralight">
                                            (5)
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                    <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                      {service?.description?.slice(0, 140) ||
                                        mock.description}
                                    </p>
                                    <div className="mt-[14.5px] flex flex-col gap-y-3">
                                      <div className="flex items-center gap-x-[6.4px]">
                                        <Clock className="size-[18px] shrink-0 text-primary-500" />
                                        <span className="font-medium text-sm leading-none text-dark-blue-400">
                                          Starting from{" "}
                                          {service?.duration || mock.duration}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-x-[6.4px]">
                                        <Money className="size-[18px] shrink-0 text-primary-500" />
                                        <span className="font-medium text-sm leading-none text-dark-blue-400">
                                          {service?.priceMin
                                            ? `$${Number(service.priceMin).toLocaleString()} - $${Number(service.priceMax).toLocaleString()}/month`
                                            : mock.budget}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="mt-5 flex items-end justify-between">
                                      <AvatarGroup
                                        max={5}
                                        size="sm"
                                        excess
                                        excessClassName="border-gray-300 text-gray-500"
                                      >
                                        {(talentUsers.length > 0
                                          ? talentUsers.slice(0, 6)
                                          : fromLength(6)
                                        ).map((u: any, k: number) => (
                                          <Avatar
                                            key={u?.id ?? k}
                                            size="sm"
                                            className="border-2 border-white hover:ring-0 active:ring-0"
                                          >
                                            <AvatarImage
                                              src={u?.avatarUrl || "/woman.jpg"}
                                              alt={u?.firstName || "Team"}
                                            />
                                            <AvatarFallback>
                                              {u?.firstName?.[0] || "T"}
                                            </AvatarFallback>
                                          </Avatar>
                                        ))}
                                      </AvatarGroup>
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
                              </SwiperSlide>
                            )
                          })}
                        </SwiperContent>
                      </TabsContent>
                    ))}
                  </div>
                </SwiperRoot>
              </Tabs>
            </div>
          )}

          {isL1OrL2AllPage && (
            <div className="mt-[50px]">
              <div className="flex items-center justify-between">
                <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                  Featured Project Collections
                </h1>
                <Button
                  asChild
                  size="lg"
                  variant="link"
                  visual="gray"
                  className="hover:text-dark-blue-400"
                >
                  <NextLink href={listingHref("projects")}>
                    View All Collections <ArrowRight className="size-[15px]" />
                  </NextLink>
                </Button>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-6">
                {projectCardMocks.slice(0, 3).map((project, idx) => (
                  <NextLink
                    key={`featured-project-collection-${project.id}`}
                    href={projectDetailsUrl(project.slug, project.id)}
                    className="group block rounded-lg border border-gray-200 bg-white p-5 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] transition hover:border-gray-300 hover:ring-1 hover:ring-gray-300"
                  >
                    <div className="relative h-[170px] overflow-hidden rounded-md bg-gray-100">
                      <NextImage
                        src={project.mediaUrl}
                        alt={project.title}
                        fill
                        sizes="33vw"
                        className="object-cover transition duration-700 group-hover:scale-105"
                      />
                    </div>
                    <p className="mt-4 text-xs font-semibold uppercase leading-none text-primary-600">
                      Collection {idx + 1}
                    </p>
                    <h2 className="mt-2 text-lg font-bold leading-6 text-dark-blue-400 group-hover:underline">
                      {project.title}
                    </h2>
                    <p className="mt-2 line-clamp-3 text-sm font-light leading-5 text-dark-blue-400">
                      {project.description}
                    </p>
                  </NextLink>
                ))}
              </div>
            </div>
          )}

          {isL1OrL2AllPage && (
            <div className="relative mt-[50px] overflow-hidden rounded-lg bg-dark-blue-400 p-[50px]">
              <div className="max-w-[620px]">
                <h1 className="text-4xl font-bold leading-none text-white">
                  Take Your Projects Further
                </h1>
                <p className="mt-3 text-xl font-light leading-7 text-white">
                  Find the right {currentName.toLowerCase()} teams, talent, and
                  services for your next build.
                </p>
                <Button
                  asChild
                  className="mt-10 rounded-full bg-white text-dark-blue-400 transition-[column-gap] duration-300 hover:gap-x-3.5 hover:bg-white/90 hover:text-dark-blue-400"
                  size="lg"
                >
                  <NextLink href={listingHref("projects")}>
                    Explore Projects <ArrowRight className="size-[15px]" />
                  </NextLink>
                </Button>
              </div>
            </div>
          )}

          {isL1OrL2AllPage && (
            <div className="mt-[50px]">
              <div className="flex items-center justify-between">
                <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                  {currentName} Courses
                </h1>
                <Button
                  asChild
                  size="lg"
                  variant="link"
                  visual="gray"
                  className="hover:text-dark-blue-400"
                >
                  <NextLink href="/courses">
                    Explore Courses <ArrowRight className="size-[15px]" />
                  </NextLink>
                </Button>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-6">
                {[
                  "Foundations",
                  "Advanced Delivery",
                  "Team Operations",
                ].map((course, idx) => {
                  const service = serviceCardMocks[idx % serviceCardMocks.length]
                  return (
                    <NextLink
                      key={`course-${course}`}
                      href="/courses"
                      className="group block rounded-lg border border-gray-200 bg-white p-5 shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)] transition hover:border-gray-300 hover:ring-1 hover:ring-gray-300"
                    >
                      <div className="relative h-[150px] overflow-hidden rounded-md bg-gray-100">
                        <NextImage
                          src={service.mediaUrl}
                          alt={`${currentName} ${course}`}
                          fill
                          sizes="33vw"
                          className="object-cover transition duration-700 group-hover:scale-105"
                        />
                      </div>
                      <h2 className="mt-4 text-lg font-bold leading-6 text-dark-blue-400 group-hover:underline">
                        {currentName} {course}
                      </h2>
                      <p className="mt-2 text-sm font-light leading-5 text-dark-blue-400">
                        Practical lessons for planning, launching, and scaling{" "}
                        {currentName.toLowerCase()} work.
                      </p>
                    </NextLink>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mt-[50px]">
            <div className="flex justify-between items-center">
              <h1 className="text-[28px] leading-none font-bold text-dark-blue-400">
                Guides Related to {sectionLabel}
              </h1>

              <Button
                size="lg"
                variant="link"
                visual="gray"
                className="hover:text-dark-blue-400"
              >
                Visit the Blog <ArrowRight className="size-[15px]" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-x-8 mt-6">
              <div className="flex flex-col gap-y-8">
                <article className="flex gap-x-6 group cursor-pointer rounded-lg hover:shadow-md motion-safe:transition-shadow motion-safe:duration-200">
                  <div className="relative w-[238px] overflow-hidden rounded-lg shrink-0">
                    <NextImage
                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                      sizes="25vw"
                      fill
                      src="/artificial-hand.jpeg"
                    />
                  </div>
                  <div className="py-3">
                    <span className="text-xs font-medium leading-none text-dark-blue-400">
                      Software Testing
                    </span>
                    <h1 className="mt-2 text-lg font-bold leading-none text-dark-blue-400 group-hover:underline">
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
                      className="text-dark-blue-400 mt-3 group-hover:underline"
                      size="md"
                      variant="link"
                      visual="gray"
                    >
                      Read more <ArrowRight className="size-[15px]" />
                    </Button>
                  </div>
                </article>
                <article className="flex gap-x-6 group cursor-pointer rounded-lg hover:shadow-md motion-safe:transition-shadow motion-safe:duration-200">
                  <div className="relative w-[238px] overflow-hidden rounded-lg shrink-0">
                    <NextImage
                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                      sizes="25vw"
                      fill
                      src="/artificial-hand.jpeg"
                    />
                  </div>
                  <div className="py-3">
                    <span className="text-xs font-medium leading-none text-dark-blue-400">
                      Software Testing
                    </span>
                    <h1 className="mt-2 text-lg font-bold leading-none text-dark-blue-400 group-hover:underline">
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
                      className="text-dark-blue-400 mt-3 group-hover:underline"
                      size="md"
                      variant="link"
                      visual="gray"
                    >
                      Read more <ArrowRight className="size-[15px]" />
                    </Button>
                  </div>
                </article>
              </div>
              <div className="rounded-lg overflow-hidden relative group cursor-pointer">
                <NextImage
                  className="object-cover group-hover:scale-105 motion-safe:transition-transform motion-safe:[transition-duration:3000ms]"
                  src="/artificial-hand.jpeg"
                  alt="Guide"
                  sizes="50vw"
                  fill
                />
                <div className="p-[50px] absolute inset-0 flex flex-col justify-end">
                  <div className="p-8 rounded-lg bg-white">
                    <span className="text-xs font-medium leading-none text-dark-blue-400">
                      Software Testing
                    </span>
                    <h1 className="mt-2 text-lg font-bold leading-none text-dark-blue-400 group-hover:underline">
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
                      className="text-dark-blue-400 mt-3 group-hover:underline"
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
      <div className="py-20 px-[50px] bg-white">
        <h1 className="text-[28px] font-bold text-center text-dark-blue-400">
          {currentName} FAQ
        </h1>

        <div className="mt-10 max-w-[1200px] mx-auto">
          <Tabs defaultValue="general" className="flex gap-x-20">
            <TabsList className="flex flex-col items-start gap-y-3 bg-transparent h-auto min-w-[240px]">
              <TabsTrigger
                value="general"
                className="w-full flex items-center justify-between px-6 py-3.5 rounded-[12px] border border-transparent text-base font-bold text-dark-blue-400 hover:bg-gray-50 hover:border-gray-200 data-[state=active]:!border-primary-600 data-[state=active]:text-primary-600 data-[state=active]:bg-white transition-all group"
              >
                General Questions
                <ArrowRight className="size-3.5 opacity-0 data-[state=active]:opacity-100 group-data-[state=active]:opacity-100 text-primary-600" />
              </TabsTrigger>
              <TabsTrigger
                value="career"
                className="w-full flex items-center justify-between px-6 py-3.5 rounded-[12px] border border-transparent text-base font-bold text-dark-blue-400 hover:bg-gray-50 hover:border-gray-200 data-[state=active]:!border-primary-600 data-[state=active]:text-primary-600 data-[state=active]:bg-white transition-all group"
              >
                Career Related Questions
                <ArrowRight className="size-3.5 opacity-0 data-[state=active]:opacity-100 group-data-[state=active]:opacity-100 text-primary-600" />
              </TabsTrigger>
              <TabsTrigger
                value="technical"
                className="w-full flex items-center justify-between px-6 py-3.5 rounded-[12px] border border-transparent text-base font-bold text-dark-blue-400 hover:bg-gray-50 hover:border-gray-200 data-[state=active]:!border-primary-600 data-[state=active]:text-primary-600 data-[state=active]:bg-white transition-all group"
              >
                Technical Questions
                <ArrowRight className="size-3.5 opacity-0 data-[state=active]:opacity-100 group-data-[state=active]:opacity-100 text-primary-600" />
              </TabsTrigger>
            </TabsList>

            <div className="flex-1">
              <TabsContent
                value="general"
                className="mt-0 border-t border-gray-200"
              >
                <div className="flex flex-col">
                  {[
                    `What is ${currentName.toLowerCase()}?`,
                    `What are the main stages of ${currentName.toLowerCase()}?`,
                    `What are the most in-demand ${currentName.toLowerCase()} languages?`,
                    `What skills are essential for ${currentName.toLowerCase()}?`,
                    `What are some popular ${currentName.toLowerCase()} methodologies?`,
                  ].map((q, i) => (
                    <div
                      key={i}
                      className="py-6 flex items-center justify-between border-b border-gray-200 group cursor-pointer"
                    >
                      <span className="text-base font-semibold text-dark-blue-400 group-hover:text-primary-600 transition-colors">
                        {q}
                      </span>
                      <ArrowRight className="size-3.5 text-dark-blue-400 group-hover:text-primary-600 transition-colors" />
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent
                value="career"
                className="mt-0 border-t border-gray-200"
              >
                <div className="flex flex-col">
                  {[
                    `How to start a career in ${currentName}?`,
                    `What is the average salary for ${currentName} specialists?`,
                    `Are there remote opportunities in ${currentName}?`,
                  ].map((q, i) => (
                    <div
                      key={i}
                      className="py-6 flex items-center justify-between border-b border-gray-200 group cursor-pointer"
                    >
                      <span className="text-base font-semibold text-dark-blue-400 group-hover:text-primary-600 transition-colors">
                        {q}
                      </span>
                      <ArrowRight className="size-3.5 text-dark-blue-400 group-hover:text-primary-600 transition-colors" />
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent
                value="technical"
                className="mt-0 border-t border-gray-200"
              >
                <div className="flex flex-col">
                  {[
                    `What tools are used in ${currentName}?`,
                    `Best practices for ${currentName} projects.`,
                    `How to stay updated with ${currentName} trends?`,
                  ].map((q, i) => (
                    <div
                      key={i}
                      className="py-6 flex items-center justify-between border-b border-gray-200 group cursor-pointer"
                    >
                      <span className="text-base font-semibold text-dark-blue-400 group-hover:text-primary-600 transition-colors">
                        {q}
                      </span>
                      <ArrowRight className="size-3.5 text-dark-blue-400 group-hover:text-primary-600 transition-colors" />
                    </div>
                  ))}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div className="mt-16 text-center text-sm text-gray-500">
          Still have some questions? Visit our{" "}
          <NextLink
            href="/help"
            className="text-primary-600 font-medium hover:underline"
          >
            Help Center
          </NextLink>{" "}
          or{" "}
          <NextLink
            href="/chat"
            className="text-primary-600 font-medium hover:underline"
          >
            Chat with Us
          </NextLink>
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
