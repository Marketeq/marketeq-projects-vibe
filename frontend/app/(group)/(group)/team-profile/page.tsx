"use client"

import React, { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { cn, toPxIfNumber } from "@/utils/functions"
import {
  ArrowRight,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  FileText,
  SearchMd,
  MarkerPin01,
  MessageSquare01,
  MessageTextSquare01,
  Plus,
  Share06,
  Star,
  Star01,
  Stars02,
  XCircle,
} from "@blend-metrics/icons"
import { TbStar, TbStarHalfFilled } from "react-icons/tb"
import * as RadixTabs from "@radix-ui/react-tabs"
import { Variants, motion } from "framer-motion"
import { SwiperSlide } from "swiper/react"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import {
  SwiperContent,
  SwiperNextTrigger,
  SwiperPrevTrigger,
  SwiperRoot,
} from "@/components/swiper"
import { useClickOutside } from "@/utils/hooks"
import { LikeDislike } from "@/components/like-dislike"
import { ListingCard } from "@/components/listing-card"
import {
  ShowMoreLessComp,
  ShowMoreLessRoot,
} from "@/components/show-more-less"
import { TalentSearchCard } from "@/components/talent-search-card"
import { SaveButton } from "@/components/talent-profile-comps"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Badge,
  Button,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNextTrigger,
  CarouselPreviousTrigger,
  Favorite,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Progress,
  RatingGroupContext,
  RatingGroupControl,
  RatingGroupHiddenInput,
  RatingGroupItem,
  RatingGroupItemContext,
  RatingGroupLabel,
  RatingGroupRoot,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  tabsListVariants,
} from "@/components/ui"

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const TEAM = {
  id: "v6-group",
  name: "V6 Group",
  avatar: "/man.jpg",
  username: "v6group",
  tagline: "Development team",
  headline:
    "Headline text will go here talking about the company identity.",
  memberCount: 27,
  rateMin: 85,
  rateMax: 120,
  clientSuccessRating: 95,
  happyClients: 15,
  yearsExperience: 30,
  // Figma 13236:30498 — right sidebar
  status: "Offline",
  localTime: "3:30 PM local time",
  avgResponseTime: "1 hour",
  languages: ["English", "Hindi", "Spanish", "Urdu"],
  locations: ["United States", "India", "Pakistan", "Canada"],
  showcaseMore: ["/building.jpg", "/bar.jpg", "/comments.jpg", "/coding-1.jpg"],
  // Figma 13236:30370 — what we offer. Category is a sub-group of each tab,
  // so every Projects/Services x category pair has its own set of cards.
  offers: {
    Projects: {
      "Front-End": [
        { id: "o1", title: "FinTech Analytics Dashboard", description: "Real-time portfolio analytics with streaming market data and custom alerting.", mediaUrl: "/coding.jpg", budget: "$50,000 budget", duration: "Starting from 12 weeks", rating: 4.9, reviewCount: 31 },
        { id: "o2", title: "E-Commerce Storefront Rebuild", description: "Headless storefront migration that lifted checkout conversion by 34%.", mediaUrl: "/chat-gpt.jpg", budget: "$60,000 budget", duration: "Starting from 10 weeks", rating: 4.7, reviewCount: 18 },
        { id: "o3", title: "Patient Portal Interface", description: "Accessible scheduling and records UI for care teams, WCAG 2.2 AA throughout.", mediaUrl: "/boxes.jpg", budget: "$44,000 budget", duration: "Starting from 9 weeks", rating: 4.8, reviewCount: 21 },
      ],
      "Back-End": [
        { id: "o4", title: "Payments Orchestration Layer", description: "Multi-processor routing with idempotent retries and full ledger reconciliation.", mediaUrl: "/building.jpg", budget: "$82,000 budget", duration: "Starting from 16 weeks", rating: 4.9, reviewCount: 27 },
        { id: "o5", title: "Claims Processing Engine", description: "Rules-driven intake, triage and adjuster workflows rebuilt end to end.", mediaUrl: "/bar.jpg", budget: "$70,000 budget", duration: "Starting from 14 weeks", rating: 4.6, reviewCount: 12 },
        { id: "o6", title: "Notification Service", description: "Fan-out delivery across email, push and in-app with per-tenant rate limits.", mediaUrl: "/comments.jpg", budget: "$38,000 budget", duration: "Starting from 8 weeks", rating: 4.8, reviewCount: 15 },
      ],
      "Database": [
        { id: "o7", title: "Data Warehouse Migration", description: "Zero-downtime move to a columnar warehouse with lineage and cost controls.", mediaUrl: "/coding-1.jpg", budget: "$95,000 budget", duration: "Starting from 18 weeks", rating: 4.9, reviewCount: 19 },
        { id: "o8", title: "Search Index Overhaul", description: "Vector search and ranking rebuild lifting result relevance by 41%.", mediaUrl: "/confident-woman.jpg", budget: "$45,000 budget", duration: "Starting from 9 weeks", rating: 4.9, reviewCount: 17 },
        { id: "o9", title: "Event Store Rebuild", description: "Append-only event store with replay, snapshots and schema contracts.", mediaUrl: "/coding.jpg", budget: "$58,000 budget", duration: "Starting from 11 weeks", rating: 4.7, reviewCount: 10 },
      ],
    },
    Services: {
      "Front-End": [
        { id: "o10", title: "Design System Build-Out", description: "Token-driven component library with docs, tests and Figma parity.", mediaUrl: "/chat-gpt.jpg", budget: "$18,000 budget", duration: "Starting from 6 weeks", rating: 4.9, reviewCount: 14 },
        { id: "o11", title: "Accessibility Remediation", description: "WCAG 2.2 AA audit and fixes across web and mobile surfaces.", mediaUrl: "/boxes.jpg", budget: "$9,000 budget", duration: "Starting from 4 weeks", rating: 5, reviewCount: 11 },
        { id: "o12", title: "Performance Engineering", description: "Core Web Vitals remediation across marketing and product surfaces.", mediaUrl: "/building.jpg", budget: "$14,000 budget", duration: "Starting from 4 weeks", rating: 4.9, reviewCount: 10 },
      ],
      "Back-End": [
        { id: "o13", title: "API Architecture Review", description: "Contract design, versioning strategy and a migration path off the monolith.", mediaUrl: "/bar.jpg", budget: "$16,000 budget", duration: "Starting from 5 weeks", rating: 4.8, reviewCount: 13 },
        { id: "o14", title: "Service Decomposition", description: "Carving bounded contexts out of a monolith without a big-bang rewrite.", mediaUrl: "/comments.jpg", budget: "$34,000 budget", duration: "Starting from 10 weeks", rating: 4.7, reviewCount: 8 },
        { id: "o15", title: "Queue Hardening", description: "Back-pressure, dead-letter handling and delivery guarantees you can prove.", mediaUrl: "/coding-1.jpg", budget: "$12,000 budget", duration: "Starting from 3 weeks", rating: 4.8, reviewCount: 9 },
      ],
      "Database": [
        { id: "o16", title: "Schema Modernisation", description: "Normalising a decade-old schema behind expand-and-contract migrations.", mediaUrl: "/confident-woman.jpg", budget: "$22,000 budget", duration: "Starting from 7 weeks", rating: 4.7, reviewCount: 6 },
        { id: "o17", title: "Query Optimisation", description: "Index and plan tuning that cut p95 read latency by more than half.", mediaUrl: "/coding.jpg", budget: "$11,000 budget", duration: "Starting from 3 weeks", rating: 4.9, reviewCount: 12 },
        { id: "o18", title: "Replication & Failover", description: "Cross-region replicas with tested failover and measured RPO/RTO.", mediaUrl: "/chat-gpt.jpg", budget: "$19,000 budget", duration: "Starting from 5 weeks", rating: 4.8, reviewCount: 7 },
      ],
    },
  },
  offersMore: {
    Projects: {
      "Front-End": [
        { id: "m1", title: "FinTech Analytics Dashboard II", description: "Real-time portfolio analytics with streaming market data and custom alerting.", mediaUrl: "/coding.jpg", budget: "$50,000 budget", duration: "Starting from 12 weeks", rating: 4.9, reviewCount: 31 },
        { id: "m2", title: "E-Commerce Storefront Rebuild Retainer", description: "Headless storefront migration that lifted checkout conversion by 34%.", mediaUrl: "/chat-gpt.jpg", budget: "$60,000 budget", duration: "Starting from 10 weeks", rating: 4.7, reviewCount: 18 },
        { id: "m3", title: "Patient Portal Interface Audit", description: "Accessible scheduling and records UI for care teams, WCAG 2.2 AA throughout.", mediaUrl: "/boxes.jpg", budget: "$44,000 budget", duration: "Starting from 9 weeks", rating: 4.8, reviewCount: 21 },
      ],
      "Back-End": [
        { id: "m4", title: "Payments Orchestration Layer II", description: "Multi-processor routing with idempotent retries and full ledger reconciliation.", mediaUrl: "/building.jpg", budget: "$82,000 budget", duration: "Starting from 16 weeks", rating: 4.9, reviewCount: 27 },
        { id: "m5", title: "Claims Processing Engine Retainer", description: "Rules-driven intake, triage and adjuster workflows rebuilt end to end.", mediaUrl: "/bar.jpg", budget: "$70,000 budget", duration: "Starting from 14 weeks", rating: 4.6, reviewCount: 12 },
        { id: "m6", title: "Notification Service Audit", description: "Fan-out delivery across email, push and in-app with per-tenant rate limits.", mediaUrl: "/comments.jpg", budget: "$38,000 budget", duration: "Starting from 8 weeks", rating: 4.8, reviewCount: 15 },
      ],
      "Database": [
        { id: "m7", title: "Data Warehouse Migration II", description: "Zero-downtime move to a columnar warehouse with lineage and cost controls.", mediaUrl: "/coding-1.jpg", budget: "$95,000 budget", duration: "Starting from 18 weeks", rating: 4.9, reviewCount: 19 },
        { id: "m8", title: "Search Index Overhaul Retainer", description: "Vector search and ranking rebuild lifting result relevance by 41%.", mediaUrl: "/confident-woman.jpg", budget: "$45,000 budget", duration: "Starting from 9 weeks", rating: 4.9, reviewCount: 17 },
        { id: "m9", title: "Event Store Rebuild Audit", description: "Append-only event store with replay, snapshots and schema contracts.", mediaUrl: "/coding.jpg", budget: "$58,000 budget", duration: "Starting from 11 weeks", rating: 4.7, reviewCount: 10 },
      ],
    },
    Services: {
      "Front-End": [
        { id: "m10", title: "Design System Build-Out II", description: "Token-driven component library with docs, tests and Figma parity.", mediaUrl: "/chat-gpt.jpg", budget: "$18,000 budget", duration: "Starting from 6 weeks", rating: 4.9, reviewCount: 14 },
        { id: "m11", title: "Accessibility Remediation Retainer", description: "WCAG 2.2 AA audit and fixes across web and mobile surfaces.", mediaUrl: "/boxes.jpg", budget: "$9,000 budget", duration: "Starting from 4 weeks", rating: 5, reviewCount: 11 },
        { id: "m12", title: "Performance Engineering Audit", description: "Core Web Vitals remediation across marketing and product surfaces.", mediaUrl: "/building.jpg", budget: "$14,000 budget", duration: "Starting from 4 weeks", rating: 4.9, reviewCount: 10 },
      ],
      "Back-End": [
        { id: "m13", title: "API Architecture Review II", description: "Contract design, versioning strategy and a migration path off the monolith.", mediaUrl: "/bar.jpg", budget: "$16,000 budget", duration: "Starting from 5 weeks", rating: 4.8, reviewCount: 13 },
        { id: "m14", title: "Service Decomposition Retainer", description: "Carving bounded contexts out of a monolith without a big-bang rewrite.", mediaUrl: "/comments.jpg", budget: "$34,000 budget", duration: "Starting from 10 weeks", rating: 4.7, reviewCount: 8 },
        { id: "m15", title: "Queue Hardening Audit", description: "Back-pressure, dead-letter handling and delivery guarantees you can prove.", mediaUrl: "/coding-1.jpg", budget: "$12,000 budget", duration: "Starting from 3 weeks", rating: 4.8, reviewCount: 9 },
      ],
      "Database": [
        { id: "m16", title: "Schema Modernisation II", description: "Normalising a decade-old schema behind expand-and-contract migrations.", mediaUrl: "/confident-woman.jpg", budget: "$22,000 budget", duration: "Starting from 7 weeks", rating: 4.7, reviewCount: 6 },
        { id: "m17", title: "Query Optimisation Retainer", description: "Index and plan tuning that cut p95 read latency by more than half.", mediaUrl: "/coding.jpg", budget: "$11,000 budget", duration: "Starting from 3 weeks", rating: 4.9, reviewCount: 12 },
        { id: "m18", title: "Replication & Failover Audit", description: "Cross-region replicas with tested failover and measured RPO/RTO.", mediaUrl: "/chat-gpt.jpg", budget: "$19,000 budget", duration: "Starting from 5 weeks", rating: 4.8, reviewCount: 7 },
      ],
    },
  },
  // Figma 13236:30381 — awards
  awards: [
    {
      title: "The unseen of spending three years at Pixelgrade",
      year: "2020",
      issuer: "Nike",
      logo: "/logos/nasdaq.svg",
      description:
        "This is a description about the award that the team has won. It's around two sentences and 100 characters.",
    },
    {
      title: "Best product design team of the year",
      year: "2022",
      issuer: "Adobe",
      logo: "/logos/adobe.svg",
      description:
        "Recognised for outstanding craft across a portfolio of accessible, high-performance product launches.",
    },
    {
      title: "Excellence in cloud engineering",
      year: "2024",
      issuer: "Microsoft",
      logo: "/logos/microsoft.svg",
      description:
        "Awarded for scalable infrastructure work delivered across fintech and healthcare platforms.",
    },
  ],
  // Figma 13236:30371 — success stories
  successStories: [
    { title: "Referrizer Rebuild", handle: "@Referrizer", rating: 4.8, posted: "Posted a week ago", image: "/coding.jpg" },
    { title: "Atlas Analytics", handle: "@AtlasHQ", rating: 4.9, posted: "Posted 2 weeks ago", image: "/chat-gpt.jpg" },
    { title: "Northwind Commerce", handle: "@Northwind", rating: 4.7, posted: "Posted a month ago", image: "/boxes.jpg" },
  ],
  // Figma 13101:45203 — wordmark logos exported from the design
  featuredClients: [
    { name: "Dropbox", logo: "/logos/dropbox.svg", width: 93.809, height: 18.114 },
    { name: "Microsoft", logo: "/logos/microsoft.svg", width: 96.147, height: 20.527 },
    { name: "Adobe", logo: "/logos/adobe.svg", width: 75.467, height: 19.646 },
    { name: "Nasdaq", logo: "/logos/nasdaq.svg", width: 83.803, height: 23.662 },
  ],
  certifications: [
    "AWS Certified Solutions Architect",
    "Google Cloud Professional",
    "Certified Scrum Master",
  ],
  industries: ["FinTech", "Healthcare", "E-Commerce", "SaaS", "Web3"],
  topCategories: [
    "Mobile Apps",
    "Web Design",
    "UX/UI Design",
    "React Development",
    "Javascript Development",
    "Artificial Intelligence",
    "Machine Learning",
    "Web3",
    "Blockchain",
  ],
  // Figma 13236:30319 — masonry showcase, 6 image tiles
  showcase: [
    "/coding.jpg",
    "/chat-gpt.jpg",
    "/boxes.jpg",
    "/building.jpg",
    "/bar.jpg",
    "/comments.jpg",
  ],
  about:
    "V6 Group is a multidisciplinary product team specializing in end-to-end design and engineering. From early-stage prototyping in Figma to scalable cloud infrastructure on AWS, we deliver cohesive digital products that delight users and drive business outcomes.\n\nOur team blends deep technical expertise with a user-centered design philosophy, ensuring every project ships on time and exceeds expectations. We embed directly with your stakeholders, run discovery workshops, and translate ambiguous requirements into a roadmap your engineers can act on immediately.\n\nWe have shipped platforms across fintech, healthcare, e-commerce and SaaS, each held to the same standard: accessible by default, instrumented from day one, and documented well enough that your team can own it after handoff. Whether you need a focused audit, a greenfield build, or an embedded squad to accelerate an existing roadmap, we scale to fit.",
  rating: 4.9,
  reviewCount: 127,
  completedProjects: 47,
  repeatHireRate: 89,
  location: "San Francisco, CA & Remote",
  rate: "$85-150/hr",
  experience: "8+ years avg experience",
  skills: [
    "React",
    "TypeScript",
    "Node.js",
    "Figma",
    "AWS",
    "PostgreSQL",
    "Docker",
    "GraphQL",
  ],
  services: [
    "Product Design & UX",
    "Full-Stack Web Development",
    "Cloud Architecture & DevOps",
    "API Design & Integration",
    "Mobile App Development",
    "Technical Consulting",
  ],
  members: [
    {
      name: "Sarah Chen",
      handle: "@sarahchen",
      role: "Lead Designer",
      avatar: "/woman.jpg",
      skills: ["Figma", "UX Research", "Prototyping"],
    },
    {
      name: "Marcus Rivera",
      handle: "@marcusrivera",
      role: "Senior Frontend Engineer",
      avatar: "/man.jpg",
      skills: ["React", "TypeScript", "Next.js"],
    },
    {
      name: "Aisha Patel",
      handle: "@aishapatel",
      role: "Backend Engineer",
      avatar: "/woman.jpg",
      skills: ["Node.js", "PostgreSQL", "GraphQL"],
    },
    {
      name: "James Kim",
      handle: "@jameskim",
      role: "DevOps Engineer",
      avatar: "/man.jpg",
      skills: ["AWS", "Docker", "Terraform"],
    },
    {
      name: "Elena Volkov",
      handle: "@elenavolkov",
      role: "Product Manager",
      avatar: "/woman.jpg",
      skills: ["Agile", "Analytics", "Strategy"],
    },
    {
      name: "David Okafor",
      handle: "@davidokafor",
      role: "Full-Stack Developer",
      avatar: "/man.jpg",
      skills: ["React", "Node.js", "TypeScript"],
    },
  ],
  portfolio: [
    {
      title: "FinTech Dashboard",
      description: "Real-time analytics platform for portfolio management",
      image: "/woman.jpg",
      tags: ["React", "AWS", "GraphQL"],
    },
    {
      title: "Healthcare Patient Portal",
      description: "HIPAA-compliant patient engagement platform",
      image: "/man.jpg",
      tags: ["TypeScript", "PostgreSQL", "Docker"],
    },
    {
      title: "E-Commerce Redesign",
      description: "Complete storefront overhaul increasing conversion 34%",
      image: "/woman.jpg",
      tags: ["Figma", "Next.js", "Stripe"],
    },
    {
      title: "SaaS Onboarding Flow",
      description: "Guided onboarding reducing time-to-value by 60%",
      image: "/man.jpg",
      tags: ["React", "Node.js", "Analytics"],
    },
  ],
  reviews: [
    {
      author: "Michael Torres",
      company: "Acme Corp",
      rating: 5,
      text: "V6 Group delivered our platform ahead of schedule. Their attention to detail and proactive communication made the entire process seamless.",
      date: "Mar 2026",
    },
    {
      author: "Linda Park",
      company: "Healthwise",
      rating: 5,
      text: "Exceptional team. They understood our compliance requirements from day one and built a robust, scalable solution.",
      date: "Feb 2026",
    },
    {
      author: "Jason Wright",
      company: "RetailMax",
      rating: 5,
      text: "Our conversion rate jumped 34% after the redesign. The V6 team brought both creative vision and technical excellence.",
      date: "Jan 2026",
    },
    {
      author: "Priya Sharma",
      company: "NovaTech",
      rating: 4,
      text: "Great collaboration throughout. A few timeline bumps on the backend integration, but the final product is solid.",
      date: "Dec 2025",
    },
  ],
}

// "A, B, +N more" — matches the Figma sidebar copy
function summarizeList(items: string[], visible: number) {
  const shown = items.slice(0, visible).join(", ")
  const rest = items.length - visible
  return rest > 0 ? `${shown}, +${rest} more` : shown
}

/** Same in-header swiper nav styling the category and homepage carousels use. */
const NAV_BUTTON_CLASS =
  "rounded-full border-dark-blue-400 text-dark-blue-400 opacity-[.19] size-8 transition-opacity duration-300 data-[state=active]:opacity-100 data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-dark-blue-400"

/** talent-profile "My Offers" pill styling. Figma strokes sit inside the 34px
 *  pill, so the 2px outline is a ring rather than a border. */
const OFFER_PILL_CLASS =
  "shrink-0 focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:ring-gray-400 px-3.5 ring-2 ring-inset ring-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:ring-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:ring-dark-blue-400 text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"

const OFFER_TABS = ["Projects", "Services"] as const
const OFFER_CATEGORIES = ["Front-End", "Back-End", "Database"] as const

const ABOUT_TABS = ["Featured Clients", "Certifications", "Industry Expertise"]

// Anchor-tab sections. The tabs scroll the page; they do not swap content.
// Figma 13236:30309 — tab order and labels
const SECTIONS = [
  { value: "overview", href: "#overview", label: "Overview" },
  { value: "portfolio", href: "#portfolio", label: "Portfolio" },
  { value: "services", href: "#offers", label: "Services" },
  { value: "offers", href: "#offers", label: "Offers" },
  { value: "specialization", href: "#overview", label: "Specialization" },
  {
    value: "success-stories",
    href: "#success-stories",
    label: "Success Stories",
  },
  { value: "team", href: "#members", label: "Team" },
  { value: "work-history", href: "#project-history", label: "Work History" },
]

// ---------------------------------------------------------------------------
// Work History helpers — copied verbatim from talent-profile
// ---------------------------------------------------------------------------

const variants: Variants = {
  expanded: {
    width: 375,
    transition: {
      duration: 0.3,
    },
  },
  collapsed: {
    width: 220,
    transition: {
      duration: 0.3,
    },
  },
}

const SectionSearchBar = () => {
  const [email, setEmail] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useClickOutside([ref], () => setIsExpanded(false))

  const on = () => setIsExpanded(true)

  return (
    <motion.div
      ref={ref}
      className="shrink-0 w-[220px]"
      animate={isExpanded ? "expanded" : "collapsed"}
      variants={variants}
    >
      <InputGroup className="w-full">
        <Input
          id="email"
          type="email"
          onClick={on}
          className="peer text-sm leading-5 h-10 right-3 pl-[34px]"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Search"
        />
        <InputLeftElement className="text-gray-400 peer-focus:text-primary-500">
          <SearchMd className="size-4" />
        </InputLeftElement>
        {email ? (
          <InputRightElement>
            <button
              className="focus-visible:outline-none inline-block"
              onClick={() => setEmail("")}
            >
              <XCircle className="size-4 text-gray-500/50 hover:text-gray-500" />
            </button>
          </InputRightElement>
        ) : null}
      </InputGroup>
    </motion.div>
  )
}

const lineClampClass: Record<number, string> = {
  2: "line-clamp-2",
  3: "line-clamp-3",
  4: "line-clamp-4",
  5: "line-clamp-5",
  6: "line-clamp-6",
}

function LineClampText({
  text,
  lines,
  className,
  toggleClassName,
  expandLabel = "...Read More",
  collapseLabel = "Read Less",
  inline = false,
}: {
  text: string
  lines: number
  className?: string
  toggleClassName?: string
  expandLabel?: string
  collapseLabel?: string
  inline?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [clamped, setClamped] = useState(false)
  const [collapsedHeight, setCollapsedHeight] = useState<number>(0)
  const textRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const el = textRef.current
    if (el) {
      setClamped(el.scrollHeight > el.clientHeight)
      if (!expanded) setCollapsedHeight(el.clientHeight)
    }
  }, [text, expanded])

  const clampCls = lineClampClass[lines] || "line-clamp-3"

  if (inline) {
    return (
      <div
        className="overflow-hidden [interpolate-size:allow-keywords] transition-[height] duration-300"
        style={{
          height: expanded
            ? "auto"
            : collapsedHeight
              ? `${collapsedHeight}px`
              : "auto",
        }}
      >
        <p ref={textRef} className={cn(className, !expanded && clampCls)}>
          {text}
          {clamped && !expanded && (
            <button
              className="inline text-sm font-semibold text-gray-700 hover:text-gray-900 ml-1"
              onClick={() => setExpanded(true)}
            >
              {expandLabel}
            </button>
          )}
          {expanded && collapseLabel && (
            <button
              className="inline text-sm font-semibold text-gray-700 hover:text-gray-900 ml-1"
              onClick={() => setExpanded(false)}
            >
              {collapseLabel}
            </button>
          )}
        </p>
      </div>
    )
  }

  return (
    <>
      <div
        className="overflow-hidden [interpolate-size:allow-keywords] transition-[height] duration-300"
        style={{
          height: expanded
            ? "auto"
            : collapsedHeight
              ? `${collapsedHeight}px`
              : "auto",
        }}
      >
        <p ref={textRef} className={cn(className, !expanded && clampCls)}>
          {text}
        </p>
      </div>
      {clamped && !expanded && (
        <Button
          className={toggleClassName}
          variant="link"
          visual="gray"
          onClick={() => setExpanded(true)}
        >
          {expandLabel}
        </Button>
      )}
      {expanded && collapseLabel && (
        <Button
          className={toggleClassName}
          variant="link"
          visual="gray"
          onClick={() => setExpanded(false)}
        >
          {collapseLabel}
        </Button>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Helper: Star Rating
// ---------------------------------------------------------------------------

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  const full = Math.floor(rating)
  const hasHalf = rating - full >= 0.25 && rating - full < 0.75
  const empty = 5 - full - (hasHalf ? 1 : 0)
  return (
    <div className="flex items-center gap-x-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <TbStar
          key={`f${i}`}
          className="text-primary-500 fill-primary-500"
          style={{ width: size, height: size }}
        />
      ))}
      {hasHalf && (
        <TbStarHalfFilled
          className="text-primary-500 fill-primary-500"
          style={{ width: size, height: size }}
        />
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <TbStar
          key={`e${i}`}
          className="text-gray-300"
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page Export
// ---------------------------------------------------------------------------

export default function TeamProfilePage() {
  return (
    <Suspense>
      <TeamProfileContent />
    </Suspense>
  )
}

// ---------------------------------------------------------------------------
// Main Content
// ---------------------------------------------------------------------------

function TeamProfileContent() {
  const searchParams = useSearchParams()
  const teamId = searchParams.get("teamId")
  const [activeTab, setActiveTab] = useState(SECTIONS[0].value)
  const tabsListRef = useRef<HTMLDivElement>(null)
  const [isTabsListStuck, setIsTabsListStuck] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const [isCardStuck, setIsCardStuck] = useState(false)
  const [aboutTab, setAboutTab] = useState(ABOUT_TABS[0])
  const [offerTab, setOfferTab] = useState<(typeof OFFER_TABS)[number]>(
    OFFER_TABS[0]
  )
  const [offerCategory, setOfferCategory] =
    useState<(typeof OFFER_CATEGORIES)[number]>(OFFER_CATEGORIES[0])
  const [portfolioExpanded, setPortfolioExpanded] = useState(false)
  const [offersExpanded, setOffersExpanded] = useState(false)
  // Work History: same binding talent-profile uses for the reviews disclosure
  const [autoExpandProjectHistory, setAutoExpandProjectHistory] =
    useState<boolean>(false)

  // Shadow the sidebar card once it sticks (same as talent-profile)
  useEffect(() => {
    const element = cardRef.current
    if (!element) return

    const topValue = window.getComputedStyle(element).top
    const top = topValue.endsWith("px") ? parseFloat(topValue.slice(0, -2)) : 0

    const handleScroll = () => {
      setIsCardStuck(Math.ceil(top) === Math.ceil(element.getBoundingClientRect().y))
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Sticky detection for the tab bar (64 = global nav height)
  useEffect(() => {
    const element = tabsListRef.current
    if (!element) return

    const handleScroll = () => {
      setIsTabsListStuck(64 >= Math.ceil(element.getBoundingClientRect().y))
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Hide the app's secondary nav while the bar is pinned (same as talent-profile)
  useEffect(() => {
    if (!isTabsListStuck) return

    document.documentElement.dataset.pinnedBar = "active"

    return () => {
      delete document.documentElement.dataset.pinnedBar
    }
  }, [isTabsListStuck])

  // Keep the active tab in sync with the hash the anchors navigate to
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      const match = SECTIONS.find((section) => section.href === hash)
      if (match) setActiveTab(match.value)
    }

    handleHashChange()
    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  const team = TEAM // In production, fetch by teamId

  return (
    <div className="py-[50px]">
      <div className="max-w-[1440px] mx-auto px-[100px]">
        {/* ---------------------------------------------------------------- */}
        {/* Card container */}
        {/* ---------------------------------------------------------------- */}
        <div className="border border-gray-200 rounded-lg bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
          {/* -------------------------------------------------------------- */}
          {/* Hero Section */}
          {/* -------------------------------------------------------------- */}
          {/* Figma 13236:30192 — flex-col items-center p-[40px] w-full */}
          <div className="flex flex-col items-center p-10 w-full">
            {/* 13236:30193 — flex gap-[32px] items-start w-full */}
            <div className="flex items-start gap-x-8 w-full">
              {/* 13236:30194 — flex-1 flex-col items-start justify-between self-stretch */}
              <div className="flex flex-1 flex-col items-start justify-between self-stretch min-w-px">
                {/* 13236:30195 — flex gap-[8px] items-center w-[239px] */}
                <div className="flex items-center gap-x-2 w-[239px]">
                  {/* 13236:30196 — Avatar 56px, border gray-300 */}
                  <Avatar size="xl" className="shrink-0 border border-gray-300 hover:ring-0 active:ring-0">
                    <AvatarImage
                      src={team.avatar}
                      alt={team.name}
                      className="object-cover"
                    />
                    <AvatarFallback>{team.name.charAt(0)}</AvatarFallback>
                  </Avatar>

                  {/* 13236:30197 — flex-1 flex-col gap-[2px] justify-center */}
                  <div className="flex flex-1 flex-col gap-y-0.5 items-start justify-center min-w-px text-dark-blue-400 whitespace-nowrap">
                    {/* 13236:30198 — 24px bold */}
                    <p className="text-2xl font-bold leading-[30px] text-center">
                      {team.name}
                    </p>
                    {/* 13236:30199 — 12px medium, capitalize, ellipsis */}
                    <p className="capitalize text-xs font-medium leading-[15px] min-w-full overflow-hidden text-ellipsis">
                      {team.tagline}
                    </p>
                  </div>
                </div>

                {/* 13236:30200 — headline, leading-[1.2], dark-blue-400 */}
                <p className="min-w-full text-[47.074px] font-black leading-[56px] text-dark-blue-400">
                  {team.headline}
                </p>

                {/* 13236:30201 — wrap, gap-[12px], h-[68px], clipped */}
                <div className="flex flex-wrap content-start items-start gap-3 h-[68px] w-full overflow-hidden">
                  {team.skills.map((skill) => (
                    <Badge key={skill} visual="gray" size="lg">
                      {skill}
                    </Badge>
                  ))}
                </div>

                {/* 13236:30235 — flex gap-[12px] items-center */}
                <div className="flex items-center gap-x-3">
                  {/* 13236:30236 — primary filled, px-4 py-2.5, 15px icon */}
                  <Button size="md">
                    <Plus className="size-[15px]" />
                    Join Team
                  </Button>

                  {/* 13101:77953 — Save + chevron segmented group */}
                  <SaveButton />

                  {/* 13236:30238 — share */}
                  <IconButton
                    className="w-11 text-gray-500"
                    variant="outlined"
                    visual="gray"
                    size="md"
                  >
                    <Share06 className="size-5" />
                  </IconButton>
                </div>
              </div>

              {/* 13236:30239 — flex items-end */}
              <div className="flex items-end shrink-0">
                {/* 13236:30240 — flex-col items-start mr-[-140px] */}
                <div className="flex flex-col items-start -mr-[140px]">
                  {/* 13236:30241 — overlapping stack, Figma bounds 571x447 */}
                  <div className="relative w-[571.45px] h-[447.23px]">
                    {/* 13236:30242 — left-0 top-0 */}
                    <div className="absolute left-0 top-0">
                      {/* 13236:30243 — Avatar 265px */}
                      <Avatar className="size-[265.378px] hover:ring-0 active:ring-0">
                        <AvatarImage
                          src={team.members[0].avatar}
                          alt={team.members[0].name}
                          className="object-cover"
                        />
                        <AvatarFallback>
                          {team.members[0].name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>

                      {/* 13236:30244 — left-[214.96px] top-[41.62px] gap-[12.132px] */}
                      <div className="absolute left-[214.96px] top-[41.62px] flex flex-col gap-y-[12.132px] items-start">
                        {/* 13236:30245 — All Star pill */}
                        <div className="flex items-center justify-center gap-x-[6.066px] px-2 py-1.5 rounded-md bg-black/80">
                          <Stars02 className="size-4 text-white" />
                          <span className="text-sm font-bold leading-[17px] text-white whitespace-nowrap">
                            All Star
                          </span>
                        </div>
                        {/* 13236:30248 — member card */}
                        <div className="flex flex-col items-start bg-white ring-1 ring-inset ring-gray-300 rounded-lg pl-[14px] pr-3 py-3 drop-shadow-[0px_3.033px_3.791px_rgba(0,0,0,0.04)]">
                          <div className="flex flex-col gap-y-0.5 items-start w-[141.03px] text-dark-blue-400">
                            <p className="w-full truncate text-base font-bold leading-[19px]">
                              {team.members[0].name}
                            </p>
                            <p className="w-full truncate text-sm leading-[17px]">
                              {team.members[0].role}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 13236:30252 — left-[52.89px] top-[288px] */}
                    <div className="absolute left-[52.89px] top-[288px]">
                      {/* 13236:30253 — Avatar 159px */}
                      <Avatar className="size-[159.227px] hover:ring-0 active:ring-0">
                        <AvatarImage
                          src={team.members[1].avatar}
                          alt={team.members[1].name}
                          className="object-cover"
                        />
                        <AvatarFallback>
                          {team.members[1].name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>

                      {/* 13236:30254 — left-[134.53px] top-[70.39px] */}
                      <div className="absolute left-[134.53px] top-[70.39px] flex flex-col gap-y-[12.132px] items-start">
                        {/* 13236:30259 — member card */}
                        <div className="flex flex-col items-start bg-white ring-1 ring-inset ring-gray-300 rounded-lg pl-[14px] pr-3 py-3 drop-shadow-[0px_3.033px_3.791px_rgba(0,0,0,0.04)]">
                          <div className="flex flex-col gap-y-0.5 items-start w-[141.03px] text-dark-blue-400">
                            <p className="w-full truncate text-base font-bold leading-[19px]">
                              {team.members[1].name}
                            </p>
                            <p className="w-full truncate text-sm leading-[17px]">
                              {team.members[1].role}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 13236:30263 — left-[264.95px] top-[175.73px] */}
                    <div className="absolute left-[264.95px] top-[175.73px]">
                      {/* 13236:30264 — Avatar 159px */}
                      <Avatar className="size-[159.227px] hover:ring-0 active:ring-0">
                        <AvatarImage
                          src={team.members[2].avatar}
                          alt={team.members[2].name}
                          className="object-cover"
                        />
                        <AvatarFallback>
                          {team.members[2].name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>

                      {/* 13236:30265 — left-[137.47px] top-[35.75px] */}
                      <div className="absolute left-[137.47px] top-[35.75px] flex flex-col gap-y-[12.132px] items-start">
                        {/* 13236:30266 — All Star pill */}
                        <div className="flex items-center justify-center gap-x-[6.066px] px-2 py-1.5 rounded-md bg-black/80">
                          <Stars02 className="size-4 text-white" />
                          <span className="text-sm font-bold leading-[17px] text-white whitespace-nowrap">
                            All Star
                          </span>
                        </div>
                        {/* 13236:30269 — member card */}
                        <div className="flex flex-col items-start bg-white ring-1 ring-inset ring-gray-300 rounded-lg pl-[14px] pr-3 py-3 drop-shadow-[0px_3.033px_3.791px_rgba(0,0,0,0.04)]">
                          <div className="flex flex-col gap-y-0.5 items-start w-[141.03px] text-dark-blue-400">
                            <p className="w-full truncate text-base font-bold leading-[19px]">
                              {team.members[2].name}
                            </p>
                            <p className="w-full truncate text-sm leading-[17px]">
                              {team.members[2].role}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 13236:30273 — flex-col gap-[8px] items-start */}
                <div className="flex flex-col gap-y-2 items-start">
                  {/* 13236:30274 — 3 avatars 40px, border-2 white, -6px overlap */}
                  <AvatarGroup size="md" className="-space-x-1.5">
                    {team.members.slice(3, 6).map((member) => (
                      <Avatar
                        key={member.name}
                        size="md"
                        className="border-2 border-white hover:ring-0 active:ring-0"
                      >
                        <AvatarImage
                          src={member.avatar}
                          alt={member.name}
                          className="object-cover"
                        />
                        <AvatarFallback>
                          {member.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </AvatarGroup>

                  {/* 13236:30275 — flex gap-[4px] items-center */}
                  <div className="flex items-center gap-x-1 w-full">
                    <span className="text-[10.839px] font-semibold leading-[13px] text-dark-blue-400 whitespace-nowrap">
                      {team.memberCount - 3} more team members
                    </span>
                    <ArrowRight className="h-3 w-[11.25px] shrink-0 text-dark-blue-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* Stats Bar — Figma 13236:30278 (same styling as talent-profile) */}
          {/* -------------------------------------------------------------- */}
          <div className="py-3 px-8 border-t border-gray-200 flex flex-wrap items-center gap-x-8 bg-[#122A4B]/[.02]">
            {/* 13236:30279 — Rate */}
            <div className="flex gap-x-2 items-center shrink-0">
              <span className="text-sm font-extralight leading-none text-dark-blue-400">
                Rate
              </span>
              <span className="text-xl font-bold leading-none text-dark-blue-400">
                {`$${team.rateMin} - $${team.rateMax}`}
                <span className="text-sm font-extralight leading-none text-dark-blue-400">
                  /hr
                </span>
              </span>
            </div>

            {/* 13236:30286 — flex-1 metrics row */}
            <div className="flex flex-1 items-center justify-between min-w-px">
              {/* 13236:30287 — divider */}
              <div className="w-px h-[22px] bg-gray-200 shrink-0" />

              {/* 13236:30288 — Client success rating */}
              <div className="flex gap-x-3 items-center justify-center shrink-0">
                <span className="text-sm font-extralight leading-none text-dark-blue-400">
                  Client success rating
                </span>
                <span className="text-sm font-bold leading-none text-dark-blue-400">
                  {`${team.clientSuccessRating}%`}
                </span>
              </div>

              {/* 13236:30292 — divider */}
              <div className="w-px h-[22px] bg-gray-200 shrink-0" />

              {/* 13236:30293 — Total projects completed */}
              <div className="flex gap-x-3 items-center justify-center shrink-0">
                <span className="text-sm font-extralight leading-none text-dark-blue-400">
                  Total projects completed
                </span>
                <span className="text-sm font-bold leading-none text-dark-blue-400">
                  {team.completedProjects.toLocaleString()}
                </span>
              </div>

              {/* 13236:30297 — divider */}
              <div className="w-px h-[22px] bg-gray-200 shrink-0" />

              {/* 13236:30298 — Average rating */}
              <div className="flex gap-x-3 items-center justify-center shrink-0">
                <span className="text-sm font-extralight leading-none text-dark-blue-400">
                  Average rating
                </span>
                {/* 13236:30300 — gray-200 chip, 12px star */}
                <Badge
                  className="gap-x-1 rounded bg-gray-200 px-2 py-1 text-gray-500"
                  visual="gray"
                  size="sm"
                >
                  <Star01 className="size-3 fill-gray-500 text-gray-500" />
                  {team.rating}
                </Badge>
              </div>

              {/* 13236:30304 — divider */}
              <div className="w-px h-[22px] bg-gray-200 shrink-0" />

              {/* 13236:30305 — Repeat hire rate */}
              <div className="flex gap-x-3 items-center justify-center shrink-0">
                <span className="text-sm font-extralight leading-none text-dark-blue-400">
                  Repeat hire rate
                </span>
                <span className="text-sm font-bold leading-none text-dark-blue-400">
                  {`${team.repeatHireRate}%`}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Anchor tabs — these scroll the page, they do not swap content */}
      {/* -------------------------------------------------------------------- */}
      <Tabs
        className="mt-6"
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value)
          if (value === "services") setOfferTab("Services")
          if (value === "offers") setOfferTab("Projects")
          if (value === "specialization") setAboutTab("Industry Expertise")
        }}
      >
        <TabsList
          className="group/list p-0 bg-transparent data-[status=stuck]:border-b data-[status=stuck]:border-gray-200 z-50 transition duration-300 top-0 sticky block data-[status=stuck]:bg-white border-0"
          data-status={isTabsListStuck ? "stuck" : "unstuck"}
          ref={tabsListRef}
        >
          <div className="max-w-[1440px] mx-auto px-[100px]">
            <div className="contents group-data-[status=stuck]/list:pt-3 group-data-[status=stuck]/list:flex items-center max-w-[1240px] mx-auto">
              <div className="flex-auto contents group-data-[status=stuck]/list:block">
                {/* Pinned-bar identity — agency name + username */}
                <div className="hidden items-center gap-x-3 group-data-[status=stuck]/list:flex">
                  <Avatar
                    className="hover:ring-0 active:ring-primary-100"
                    size="lg"
                  >
                    <AvatarImage src={team.avatar} alt={team.name} />
                    <AvatarFallback>{team.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-y-0.5">
                    <span className="text-lg leading-none font-bold text-dark-blue-400">
                      {team.name}{" "}
                      <span className="text-base font-extralight">
                        @{team.username}
                      </span>
                    </span>

                    <span className="text-sm leading-none font-medium text-dark-blue-400">
                      {team.tagline}
                    </span>
                  </div>
                </div>
            <div
              className={cn(
                tabsListVariants({
                  className:
                    "bg-transparent justify-start w-full gap-8 group-data-[status=stuck]/list:border-b-0 group-data-[status=stuck]/list:mt-3 inline-flex",
                })
              )}
            >
              {SECTIONS.map(({ value, href, label }) => (
                <TabsTrigger
                  className="capitalize pb-[11px]"
                  key={value}
                  value={value}
                  asChild
                >
                  <NextLink href={href}>{label}</NextLink>
                </TabsTrigger>
              ))}
            </div>
              </div>

              {/* Pinned-bar actions */}
              <div className="space-y-3 group-data-[status=stuck]/list:block hidden">
                <div className="flex items-center gap-x-3">
                  <Button size="md">
                    <Plus className="size-[15px]" />
                    Join Team
                  </Button>

                  <SaveButton />

                  <IconButton
                    className="w-11 text-gray-500"
                    variant="outlined"
                    visual="gray"
                    size="md"
                  >
                    <Share06 className="size-[20px]" />
                  </IconButton>
                </div>

                <div className="flex items-center mt-3 gap-x-[9px]">
                  <Clock className="size-4" />
                  <p className="text-[12.09px] leading-none font-extralight text-dark-blue-400">
                    {team.name} is currently{" "}
                    <span className="font-bold text-success-600">available</span>{" "}
                    for hire
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsList>

        <div className="max-w-[1440px] mx-auto px-[100px]">
            {/* ------------------------------------------------------------ */}
            {/* Overview Tab */}
            {/* ------------------------------------------------------------ */}
            <div className="pt-6 scroll-mt-[137.5px]" id="portfolio">
              {/* Figma 13236:30318 — 1240 x 470.28, gap-[24px] */}
              <div className="flex flex-col gap-y-6 items-start justify-center w-full">
                {/* 13236:30319 — 4 columns x 301, gap-[12px], h-[426.28px] */}
                <div className="flex items-start gap-x-3 h-[426.28px] w-full">
                  {/* 13236:30320 — col 1 */}
                  <div className="flex flex-1 flex-col gap-y-3 h-full items-start min-w-px">
                    {/* 13236:30321 — 301 x 318.05 (flex-1) */}
                    <div className="relative flex-1 min-h-px w-full rounded-[10.803px] border-[0.923px] border-gray-200">
                      <NextImage
                        src={team.showcase[0]}
                        alt=""
                        fill
                        className="absolute inset-0 object-cover rounded-[10.803px]"
                      />
                      <div
                        aria-hidden
                        className="absolute inset-0 pointer-events-none rounded-[10.803px] bg-gradient-to-b from-[rgba(0,0,0,0)] from-[50.118%] to-[rgba(0,0,0,0.5)] to-[82.638%]"
                      />
                    </div>

                    {/* 13236:30322 — Meet the Team, 301 x 96.23 */}
                    <div className="flex items-center justify-center p-5 w-full shrink-0 rounded-[10.803px] ring-[0.923px] ring-inset ring-gray-200 bg-gray-700">
                      {/* 13236:30323 */}
                      <div className="flex flex-col items-center justify-center w-[303.563px]">
                        {/* 13236:30324 — gap-[9.227px] */}
                        <div className="flex flex-col gap-y-[9.227px] items-start">
                          {/* 13236:30325 — 3 avatars 32px, -4px overlap */}
                          <AvatarGroup size="md" className="-space-x-1">
                            {team.members.slice(0, 3).map((member) => (
                              <Avatar
                                key={member.name}
                                className="size-8 hover:ring-0 active:ring-0"
                              >
                                <AvatarImage
                                  src={member.avatar}
                                  alt={member.name}
                                  className="object-cover"
                                />
                                <AvatarFallback>
                                  {member.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </AvatarGroup>
                          {/* 13236:30326 — 12px bold, box 15 */}
                          <span className="text-xs font-bold leading-[15px] text-white whitespace-nowrap">
                            Meet the Team
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 13236:30327 — col 2 */}
                  <div className="flex flex-1 flex-col gap-y-3 h-full items-start min-w-px">
                    {/* 13236:30328 — 301 x 249.28 (flex-1) */}
                    <div className="relative flex-1 min-h-px w-full rounded-[10.803px] border-[0.923px] border-gray-200">
                      <NextImage
                        src={team.showcase[1]}
                        alt=""
                        fill
                        className="absolute inset-0 object-cover rounded-[10.803px]"
                      />
                      <div
                        aria-hidden
                        className="absolute inset-0 pointer-events-none rounded-[10.803px] bg-gradient-to-b from-[rgba(0,0,0,0)] from-[50.118%] to-[rgba(0,0,0,0.5)] to-[82.638%]"
                      />
                    </div>
                    {/* 13236:30329 — 301 x 165 */}
                    <div className="relative h-[165px] shrink-0 w-full rounded-[10.803px] border-[0.923px] border-gray-200">
                      <NextImage
                        src={team.showcase[2]}
                        alt=""
                        fill
                        className="absolute inset-0 object-cover rounded-[10.803px]"
                      />
                      <div
                        aria-hidden
                        className="absolute inset-0 pointer-events-none rounded-[10.803px] bg-gradient-to-b from-[rgba(0,0,0,0)] from-[50.118%] to-[rgba(0,0,0,0.5)] to-[82.638%]"
                      />
                    </div>
                  </div>

                  {/* 13236:30330 — col 3 */}
                  <div className="flex flex-1 flex-col gap-y-3 h-full items-start min-w-px">
                    {/* 13236:30331 — 301 x 165 */}
                    <div className="relative h-[165px] shrink-0 w-full rounded-[10.803px] border-[0.923px] border-gray-200">
                      <NextImage
                        src={team.showcase[3]}
                        alt=""
                        fill
                        className="absolute inset-0 object-cover rounded-[10.803px]"
                      />
                      <div
                        aria-hidden
                        className="absolute inset-0 pointer-events-none rounded-[10.803px] bg-gradient-to-b from-[rgba(0,0,0,0)] from-[50.118%] to-[rgba(0,0,0,0.5)] to-[82.638%]"
                      />
                    </div>
                    {/* 13236:30332 — 301 x 249.28 (flex-1) */}
                    <div className="relative flex-1 min-h-px w-full rounded-[10.803px] border-[0.923px] border-gray-200">
                      <NextImage
                        src={team.showcase[4]}
                        alt=""
                        fill
                        className="absolute inset-0 object-cover rounded-[10.803px]"
                      />
                      <div
                        aria-hidden
                        className="absolute inset-0 pointer-events-none rounded-[10.803px] bg-gradient-to-b from-[rgba(0,0,0,0)] from-[50.118%] to-[rgba(0,0,0,0.5)] to-[82.638%]"
                      />
                    </div>
                  </div>

                  {/* 13331:32104 — col 4 (Component 1000001832) */}
                  <div className="flex flex-1 flex-col gap-y-3 h-full items-start min-w-px">
                    {/* 13330:31468 — stats card */}
                    <div className="flex items-center justify-center p-5 w-full shrink-0 rounded-[10.803px] ring-[0.923px] ring-inset ring-gray-200 bg-gray-700">
                      {/* 13330:31469 — gap-[12px] */}
                      <div className="flex items-center justify-center gap-x-3 text-center text-white">
                        {/* 13330:31470 */}
                        <div className="flex flex-col gap-y-1 items-center justify-center">
                          <p className="text-[32px] leading-[38px] whitespace-nowrap">
                            <span className="font-black">
                              {team.completedProjects}
                            </span>
                            <span className="font-normal">+</span>
                          </p>
                          <p className="text-xs font-normal leading-[14px] w-[79.351px]">
                            Completed Projects
                          </p>
                        </div>
                        {/* 13330:31473 */}
                        <div className="flex flex-col gap-y-1 items-center justify-center">
                          <p className="text-[32px] leading-[38px] whitespace-nowrap">
                            <span className="font-black">
                              {team.happyClients}
                            </span>
                            <span className="font-normal">+</span>
                          </p>
                          <p className="text-xs font-normal leading-[14px] w-[56.284px]">
                            Happy Clients
                          </p>
                        </div>
                        {/* 13330:31476 */}
                        <div className="flex flex-col gap-y-1 items-center justify-center w-[96.882px]">
                          <p className="text-[32px] leading-[38px] whitespace-nowrap">
                            <span className="font-black">
                              {team.yearsExperience}
                            </span>
                            <span className="font-normal">+</span>
                          </p>
                          <p className="text-xs font-normal leading-[14px] w-[96.882px]">
                            Years Collective Experience
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 13330:31479 — flex-1 image */}
                    <div className="relative flex-1 min-h-px w-full rounded-[10.803px] border-[0.923px] border-gray-200">
                      <NextImage
                        src={team.showcase[5]}
                        alt=""
                        fill
                        className="absolute inset-0 object-cover rounded-[10.803px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Extra tiles — slide open / closed */}
                <div
                  className="overflow-hidden [interpolate-size:allow-keywords] transition-[height] duration-300 w-full"
                  style={{ height: portfolioExpanded ? "auto" : 0 }}
                >
                  <div className="flex items-start gap-x-3 h-[426.28px] w-full">
                    {team.showcaseMore.map((image, i) => (
                      <div
                        className="flex flex-1 flex-col gap-y-3 h-full items-start min-w-px"
                        key={image + i}
                      >
                        <div className="relative flex-1 min-h-px w-full rounded-[10.803px] border-[0.923px] border-gray-200">
                          <NextImage
                            alt=""
                            className="absolute inset-0 object-cover rounded-[10.803px]"
                            fill
                            src={image}
                          />
                          <div
                            aria-hidden
                            className="absolute inset-0 pointer-events-none rounded-[10.803px] bg-gradient-to-b from-[rgba(0,0,0,0)] from-[50.118%] to-[rgba(0,0,0,0.5)] to-[82.638%]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 13236:30346 — Content divider / View More */}
                <div className="flex flex-col gap-y-6 items-start w-full">
                  <div className="flex items-center gap-x-1 w-full">
                    <div className="bg-gray-200 flex-1 h-px min-w-px" />
                    <button
                      aria-expanded={portfolioExpanded}
                      className="group/more inline-flex items-center justify-center overflow-clip focus-visible:outline-none"
                      onClick={() => setPortfolioExpanded((prev) => !prev)}
                      type="button"
                    >
                      <span className="text-xs font-semibold leading-5 text-center text-gray-500 whitespace-nowrap transition-colors duration-300 group-hover/more:text-dark-blue-400 group-hover/more:underline">
                        {portfolioExpanded ? "View Less" : "View More"}
                      </span>
                    </button>
                    <div className="bg-gray-200 flex-1 h-px min-w-px" />
                  </div>
                </div>
              </div>
            </div>
            {/* Two-column: main content + right sidebar (Figma 951 / 289) */}
            <div className="mt-6 flex gap-x-8">
              <div className="flex-auto min-w-0">
            <div className="space-y-6 scroll-mt-[137.5px]" id="overview">
                {/* ---------------------------------------------------------- */}
                {/* About the team — Figma 13236:30349 (919 x 445) */}
                {/* ---------------------------------------------------------- */}
                <div className="flex flex-col items-start w-full">
                  {/* 13236:30351 — 919 x 311 */}
                  <div className="bg-white border border-gray-200 drop-shadow-[0px_1px_2.5px_rgba(16,24,40,0.02)] flex flex-col items-start justify-center p-[23px] rounded-t-lg w-full">
                    {/* 13236:30352 — gap-[24px] */}
                    <div className="flex flex-col gap-y-6 items-start w-full">
                      {/* 13236:30353 — gap-[24px] */}
                      <div className="flex flex-col gap-y-6 items-start justify-center w-full">
                        {/* 13236:30354 — 20px bold, box 25 */}
                        <h2 className="text-xl font-bold leading-[25px] text-dark-blue-400 whitespace-nowrap">
                          About the team
                        </h2>
                        {/* 13236:30355 / 30356 — 14px light, box 170 (10 lines x 17) */}
                        <div className="flex items-start justify-center w-full">
                          <p className="flex-1 min-w-px overflow-hidden text-ellipsis line-clamp-[10] text-sm font-light leading-[17px] text-gray-700 whitespace-pre-wrap">
                            {team.about}
                          </p>
                        </div>
                      </div>
                      {/* 13236:30357 — Read More, box 63 x 20 */}
                      <button
                        className="inline-flex items-center justify-center overflow-clip focus-visible:outline-none"
                        type="button"
                      >
                        <span className="text-xs font-semibold leading-5 text-center text-gray-500 whitespace-nowrap">
                          Read More
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 13236:30358 — pill tabs + logos, 919 x 134 */}
                  <Tabs
                    className="bg-white border-x border-b border-gray-200 drop-shadow-[0px_1px_2.5px_rgba(16,24,40,0.02)] flex flex-col items-center justify-center pt-6 pb-[23px] px-[23px] rounded-b-lg w-full"
                    value={aboutTab}
                    onValueChange={setAboutTab}
                  >
                    <div className="flex flex-col gap-y-6 items-start justify-center w-full">
                      {/* 13104:10089 — pills row, 871 x 34, gap-[12px] */}
                      <TabsList className="border-b-0 gap-x-3 items-start justify-start px-0 pt-0 w-full">
                        {ABOUT_TABS.map((tab) => (
                          <TabsTrigger
                            key={tab}
                            className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:ring-gray-400 px-3.5 ring-2 ring-inset ring-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:ring-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:ring-dark-blue-400 text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                            showUnderline={false}
                            value={tab}
                            variant="unstyled"
                          >
                            {tab}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {/* 13101:45203 — logo row, 871 x 28, gap-[24px] */}
                      <TabsContent className="w-full" value="Featured Clients">
                        <div className="flex flex-wrap content-center items-center gap-6 h-7 w-full">
                          {team.featuredClients.map((client) => (
                            <NextImage
                              key={client.name}
                              alt={client.name}
                              className="shrink-0"
                              height={client.height}
                              src={client.logo}
                              style={{ width: client.width, height: client.height }}
                              width={client.width}
                            />
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent className="w-full" value="Certifications">
                        <div className="flex flex-wrap content-center items-center gap-6 min-h-7 w-full">
                          {team.certifications.map((cert) => (
                            <span
                              key={cert}
                              className="text-sm leading-5 font-medium text-dark-blue-400"
                            >
                              {cert}
                            </span>
                          ))}
                        </div>
                      </TabsContent>

                      <TabsContent className="w-full" value="Industry Expertise">
                        <div className="flex flex-wrap content-center items-center gap-3 min-h-7 w-full">
                          {team.industries.map((industry) => (
                            <Badge key={industry} visual="gray" size="lg">
                              {industry}
                            </Badge>
                          ))}
                        </div>
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* Our Team — Figma 13236:30359 (919 x 522) */}
                {/* ---------------------------------------------------------- */}
                <div className="scroll-mt-[137.5px]" id="members">
                <SwiperRoot className="bg-white border border-gray-200 drop-shadow-[0px_1px_2.5px_rgba(16,24,40,0.02)] p-[23px] rounded-lg w-full">
                  {/* 13236:30360 — header, 871 x 32 */}
                  <div className="flex h-8 items-center justify-between w-full">
                    {/* 13236:30361 — 20px bold, box 25 */}
                    <h2 className="text-xl font-bold leading-[25px] text-dark-blue-400 whitespace-nowrap">
                      Our Team
                    </h2>

                    {/* 13236:30362 — gap-[32px] */}
                    <div className="flex items-center gap-x-8">
                      {/* 13236:30363 — 16px semibold, underlined, box 63 x 24 */}
                      <Button
                        className="h-auto p-0 text-base font-semibold leading-6 capitalize underline decoration-gray-500/50"
                        variant="link"
                        visual="gray"
                      >
                        View All
                      </Button>

                      {/* 13103:27979 — Navigation, 76 x 32, gap-[12px] */}
                      <div className="flex items-start gap-x-3">
                        <SwiperPrevTrigger asChild>
                          <IconButton
                            className={NAV_BUTTON_CLASS}
                            variant="outlined"
                            visual="gray"
                          >
                            <ChevronLeft className="size-[18px]" />
                          </IconButton>
                        </SwiperPrevTrigger>
                        <SwiperNextTrigger asChild>
                          <IconButton
                            className={NAV_BUTTON_CLASS}
                            variant="outlined"
                            visual="gray"
                          >
                            <ChevronRight className="size-[18px]" />
                          </IconButton>
                        </SwiperNextTrigger>
                      </div>
                    </div>
                  </div>

                  {/* 13236:30365 — cards, 320 wide, gap-[20px] */}
                  <div className="mt-6">
                    <SwiperContent slidesPerView="auto" spaceBetween={20}>
                      {team.members.map((member, index) => (
                        <SwiperSlide className="h-auto w-[320px]" key={member.name}>
                          <TalentSearchCard
                            handle={member.handle}
                            imageLoading={index < 2 ? "eager" : "lazy"}
                            name={member.name}
                            photo={member.avatar}
                            role={member.role}
                            skills={member.skills}
                          />
                        </SwiperSlide>
                      ))}
                    </SwiperContent>
                  </div>
                </SwiperRoot>
                </div>

                {/* ---------------------------------------------------------- */}
                {/* What We Offer — Figma 13236:30370 (919 x 586.13) */}
                {/* Heading + pill tabs copied from talent-profile "My Offers" */}
                {/* ---------------------------------------------------------- */}
                <Tabs
                  className="scroll-mt-[137.5px] w-full"
                  id="offers"
                  onValueChange={setOfferTab}
                  value={offerTab}
                >
                  {/* 13126:30230 — gap-[24px] */}
                  <div className="flex flex-col gap-y-6 items-start w-full">
                    {/* 13126:30231 — 20px bold, box 24 */}
                    <h2 className="text-xl font-bold leading-6 text-dark-blue-400 whitespace-nowrap">
                      What We Offer
                    </h2>

                    {/* 13126:30232 — 919 x 34 */}
                    <div className="flex h-[34px] items-center justify-between w-full">
                      {/* 13126:30233 — Projects / Services, gap-[12px] */}
                      <TabsList className="border-b-0 gap-x-3 items-start justify-start px-0 pt-0">
                        {OFFER_TABS.map((tab) => (
                          <TabsTrigger
                            className={OFFER_PILL_CLASS}
                            key={tab}
                            showUnderline={false}
                            value={tab}
                            variant="unstyled"
                          >
                            {tab}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {/* 13126:30236 — filters + View All, gap-[24px] */}
                      <div className="flex items-center gap-x-6">
                        {/* 13126:30237 — gap-[12px] */}
                        <div className="flex items-start gap-x-3">
                          {OFFER_CATEGORIES.map((category) => (
                            <button
                              className={cn(
                                OFFER_PILL_CLASS,
                                offerCategory === category
                                  ? "text-dark-blue-400 ring-dark-blue-400"
                                  : ""
                              )}
                              aria-pressed={offerCategory === category}
                              key={category}
                              onClick={() => setOfferCategory(category)}
                              type="button"
                            >
                              {category}
                            </button>
                          ))}
                        </div>

                        {/* 13126:30241 — View All, box 70 x 20 */}
                        <Button
                          className="h-auto gap-x-1 p-0 text-sm font-semibold leading-5 text-gray-500"
                          variant="link"
                          visual="gray"
                        >
                          View All
                          <ArrowRight className="size-[15px]" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {OFFER_TABS.map((tab) => {
                    const visibleOffers = team.offers[tab][offerCategory]
                    const extraOffers = team.offersMore[tab][offerCategory]

                    return (
                    <TabsContent className="w-full" key={tab} value={tab}>
                      {/* 13126:30302 — 3 cards, 293 wide, gap-[20px] */}
                      <div className="mt-6 grid grid-cols-3 gap-5">
                        {visibleOffers.map((offer) => (
                          <ListingCard
                            budget={offer.budget}
                            description={offer.description}
                            duration={offer.duration}
                            id={offer.id}
                            key={offer.id}
                            kind={tab === "Projects" ? "project" : "service"}
                            mediaUrl={offer.mediaUrl}
                            rating={offer.rating}
                            reviewCount={offer.reviewCount}
                            title={offer.title}
                          />
                        ))}
                      </div>

                      {/* Extra cards — slide open / closed */}
                      <div
                        className="overflow-hidden [interpolate-size:allow-keywords] transition-[height] duration-300 w-full"
                        style={{ height: offersExpanded ? "auto" : 0 }}
                      >
                        <div className="mt-5 grid grid-cols-3 gap-5">
                          {extraOffers.map((offer) => (
                            <ListingCard
                              budget={offer.budget}
                              description={offer.description}
                              duration={offer.duration}
                              id={offer.id}
                              key={offer.id}
                              kind={tab === "Projects" ? "project" : "service"}
                              mediaUrl={offer.mediaUrl}
                              rating={offer.rating}
                              reviewCount={offer.reviewCount}
                              title={offer.title}
                            />
                          ))}
                        </div>
                      </div>

                      {/* 13126:30306 — Content divider / View More */}
                      <div className="mt-6 flex items-center gap-x-1 w-full">
                        <div className="bg-gray-200 flex-1 h-px min-w-px" />
                        <button
                          aria-expanded={offersExpanded}
                          className="group/more inline-flex items-center justify-center overflow-clip focus-visible:outline-none"
                          onClick={() => setOffersExpanded((prev) => !prev)}
                          type="button"
                        >
                          <span className="text-xs font-semibold leading-5 text-center text-gray-500 whitespace-nowrap transition-colors duration-300 group-hover/more:text-dark-blue-400 group-hover/more:underline">
                            {offersExpanded ? "View Less" : "View More"}
                          </span>
                        </button>
                        <div className="bg-gray-200 flex-1 h-px min-w-px" />
                      </div>
                    </TabsContent>
                    )
                  })}
                </Tabs>
                {/* ---------------------------------------------------------- */}
                {/* Success Stories — Figma 13236:30371 (919 x 398) */}
                {/* ---------------------------------------------------------- */}
                <div className="scroll-mt-[137.5px]" id="success-stories">
                <SwiperRoot className="bg-white border border-gray-200 drop-shadow-[0px_1px_2.5px_rgba(16,24,40,0.02)] p-[23px] rounded-lg w-full">
                  {/* 13236:30372 — header, 871 x 32 */}
                  <div className="flex h-8 items-center justify-between w-full">
                    {/* 13236:30373 — 20px bold, box 24 */}
                    <h2 className="text-xl font-bold leading-6 text-dark-blue-400 whitespace-nowrap">
                      Success Stories
                    </h2>

                    {/* 13236:30374 — gap-[32px] */}
                    <div className="flex items-center gap-x-8">
                      <Button
                        className="h-auto p-0 text-base font-semibold leading-6 capitalize underline decoration-gray-500/50"
                        variant="link"
                        visual="gray"
                      >
                        View All
                      </Button>

                      <div className="flex items-start gap-x-3">
                        <SwiperPrevTrigger asChild>
                          <IconButton
                            className={NAV_BUTTON_CLASS}
                            variant="outlined"
                            visual="gray"
                          >
                            <ChevronLeft className="size-[18px]" />
                          </IconButton>
                        </SwiperPrevTrigger>
                        <SwiperNextTrigger asChild>
                          <IconButton
                            className={NAV_BUTTON_CLASS}
                            variant="outlined"
                            visual="gray"
                          >
                            <ChevronRight className="size-[18px]" />
                          </IconButton>
                        </SwiperNextTrigger>
                      </div>
                    </div>
                  </div>

                  {/* 13236:30377 — cards, 277 x 294, gap-[20px] */}
                  <div className="mt-6">
                    <SwiperContent slidesPerView="auto" spaceBetween={20}>
                      {team.successStories.map((story) => (
                        <SwiperSlide className="h-auto w-[277px]" key={story.title}>
                          {/* 13236:30378 — pt-[200px] pb-[20px] px-[20px] */}
                          <article className="relative flex gap-x-[15px] h-[294px] items-end overflow-clip pb-5 pt-[200px] px-5 rounded-lg border border-gray-200 w-[277px]">
                            <NextImage
                              alt=""
                              className="absolute inset-0 object-cover rounded-lg"
                              fill
                              src={story.image}
                            />
                            {/* 13136:35100 — bottom scrim */}
                            <div
                              aria-hidden
                              className="absolute bottom-[-1px] h-[162px] left-[-1px] pointer-events-none rounded-b-lg w-[294px] bg-gradient-to-b from-[rgba(0,0,0,0)] to-[rgba(0,0,0,0.5)]"
                            />
                            {/* 13136:34878 — gap-[8px], w-[244px] */}
                            <div className="relative flex flex-col gap-y-2 items-start w-[244px]">
                              {/* 13136:34879 — gap-[2px] */}
                              <div className="flex flex-col gap-y-0.5 items-start leading-[normal] text-white w-full whitespace-nowrap">
                                <p className="text-base font-bold text-center">
                                  {story.title}
                                </p>
                                <p className="capitalize text-xs font-medium min-w-full overflow-hidden text-ellipsis">
                                  {story.handle}
                                </p>
                              </div>
                              {/* 13136:34900 — gap-[12px] */}
                              <div className="flex items-center gap-x-3">
                                {/* 13136:34901 — w-[116px], gap-[9.388px] */}
                                <div className="flex items-center gap-x-[9.388px] w-[116px]">
                                  {/* 13136:34902 — 5 x 15px, gap-[2.347px] */}
                                  <div className="flex items-center gap-x-[2.347px]">
                                    {[0, 1, 2, 3, 4].map((i) => (
                                      <Star01
                                        className="size-[15px] fill-white text-white"
                                        key={i}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-base font-bold leading-[28.165px] text-white whitespace-nowrap">
                                    {story.rating}
                                  </span>
                                </div>
                                <p className="text-[11px] font-light leading-6 text-white whitespace-nowrap">
                                  {story.posted}
                                </p>
                              </div>
                            </div>
                          </article>
                        </SwiperSlide>
                      ))}
                    </SwiperContent>
                  </div>
                </SwiperRoot>

                </div>

                {/* ---------------------------------------------------------- */}
                {/* Awards — Figma 13236:30381 (919 x 408.83) */}
                {/* ---------------------------------------------------------- */}
                <SwiperRoot className="bg-white border border-gray-200 drop-shadow-[0px_1px_2.5px_rgba(16,24,40,0.02)] p-[23px] rounded-lg w-full">
                  {/* 13236:30382 — header, 871 x 32 */}
                  <div className="flex h-8 items-center justify-between w-full">
                    {/* 13236:30383 — 20px bold, box 24 */}
                    <h2 className="text-xl font-bold leading-6 text-dark-blue-400 whitespace-nowrap">
                      Awards
                    </h2>

                    <div className="flex items-center gap-x-8">
                      <Button
                        className="h-auto p-0 text-base font-semibold leading-6 capitalize underline decoration-gray-500/50"
                        variant="link"
                        visual="gray"
                      >
                        View All
                      </Button>

                      <div className="flex items-start gap-x-3">
                        <SwiperPrevTrigger asChild>
                          <IconButton
                            className={NAV_BUTTON_CLASS}
                            variant="outlined"
                            visual="gray"
                          >
                            <ChevronLeft className="size-[18px]" />
                          </IconButton>
                        </SwiperPrevTrigger>
                        <SwiperNextTrigger asChild>
                          <IconButton
                            className={NAV_BUTTON_CLASS}
                            variant="outlined"
                            visual="gray"
                          >
                            <ChevronRight className="size-[18px]" />
                          </IconButton>
                        </SwiperNextTrigger>
                      </div>
                    </div>
                  </div>

                  {/* 13236:30387 — cards, 277 x 304.83, gap-[20px] */}
                  <div className="mt-6">
                    <SwiperContent slidesPerView="auto" spaceBetween={20}>
                      {team.awards.map((award) => (
                        <SwiperSlide className="h-auto w-[277px]" key={award.title}>
                          {/* 13136:37453 — p-[20px], gap-[20px] */}
                          <article className="bg-white border border-gray-200 drop-shadow-[0px_1px_2.5px_rgba(16,24,40,0.02)] flex flex-col gap-y-5 h-[304.83px] items-center justify-center p-[19px] rounded-lg w-[277px]">
                            {/* 13136:37444 — 130 x 133 */}
                            <div className="flex h-[133px] items-center justify-center shrink-0 w-[130px] bg-gray-100">
                              <NextImage
                                alt={award.issuer}
                                className="object-contain"
                                height={48}
                                src={award.logo}
                                width={80}
                              />
                            </div>

                            {/* 13136:37446 — gap-[4px], 237 x 111.83 */}
                            <div className="flex flex-col gap-y-1 items-center shrink-0 w-full">
                              {/* 13136:37447 — 16px bold, box 39 (2 lines) */}
                              <div className="flex items-start justify-center w-full">
                                <p className="flex-1 min-w-px capitalize text-base font-bold leading-[19.5px] text-center text-dark-blue-400">
                                  {award.title}
                                </p>
                              </div>
                              {/* 13136:37448 — gap-[5px] */}
                              <div className="flex flex-col gap-y-[5px] items-start text-center w-full">
                                {/* 13136:37449 — 10px, box 13 */}
                                <p className="text-[10px] font-normal leading-[13px] text-dark-blue-400 w-full">
                                  {award.year}
                                </p>
                                {/* 13136:37450 — 14px light, box 50.83 (3 lines) */}
                                <p className="line-clamp-3 overflow-hidden text-ellipsis text-sm font-light leading-[16.943px] text-gray-700 w-full">
                                  {award.description}
                                </p>
                              </div>
                            </div>
                          </article>
                        </SwiperSlide>
                      ))}
                    </SwiperContent>
                  </div>
                </SwiperRoot>

                {/* ---------------------------------------------------------- */}
                {/* Work History + Reviews — copied verbatim from talent-profile */}
                {/* ---------------------------------------------------------- */}
                  <div
                    className="mt-6 scroll-mt-[137.5px]"
                    id="project-history"
                  >
                    <div className="border border-gray-200 rounded-t-lg bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] py-5 pl-5 pr-6">
                      <Carousel
                        opts={{
                          align: "start",
                        }}
                        className="w-full"
                      >
                        <CarouselContent>
                          {Array.from({ length: 7 }).map((_, index) => (
                            <CarouselItem
                              key={index}
                              className="basis-[20%] h-[108px]"
                            >
                              <div className="p-1 size-full bg-gray-200 relative rounded-lg overflow-hidden">
                                <NextImage
                                  src="/cpu.png"
                                  alt="CPU"
                                  fill
                                  sizes="(max-width: 768px) 40vw, 20vw"
                                />
                              </div>
                            </CarouselItem>
                          ))}
                        </CarouselContent>

                        <CarouselPreviousTrigger />
                        <CarouselNextTrigger />
                      </Carousel>

                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs leading-none font-extralight text-dark-blue-400">
                          Client project images
                        </span>

                        <Button variant="link" visual="gray">
                          View All
                        </Button>
                      </div>
                    </div>

                    <div className="p-8 border-x gap-x-[50px] border-b flex items-start rounded-b-lg border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                      <div className="flex flex-col flex-1 gap-y-1.5 basis-[147px]">
                        <h1 className="text-xl leading-none text-nowrap font-bold text-dark-blue-400">
                          Work History
                        </h1>

                        <RatingGroupRoot
                          className="flex-row gap-x-1.5 mt-1.5"
                          allowHalf
                          count={5}
                          defaultValue={4}
                          disabled
                        >
                          <RatingGroupLabel size="sm">4.9</RatingGroupLabel>
                          <RatingGroupControl>
                            <RatingGroupContext>
                              {({ items }) =>
                                items.map((item) => (
                                  <RatingGroupItem key={item} index={item}>
                                    <RatingGroupItemContext>
                                      {({ half }) =>
                                        half ? <TbStarHalfFilled /> : <TbStar />
                                      }
                                    </RatingGroupItemContext>
                                  </RatingGroupItem>
                                ))
                              }
                            </RatingGroupContext>
                            <RatingGroupHiddenInput />
                          </RatingGroupControl>
                        </RatingGroupRoot>

                        <NextLink
                          href="#"
                          className="focus-visible:outline-none text-xs leading-6 transition duration-300 hover:underline text-dark-blue-400"
                        >
                          23 ratings
                        </NextLink>
                      </div>

                      <div className="flex flex-col flex-1 gap-y-1 basis-[304px]">
                        <div className="flex items-center gap-x-2">
                          <NextLink
                            href="#"
                            className="hover:underline focus-visible:outline-none text-xs font-semibold text-dark-blue-400"
                          >
                            5
                          </NextLink>
                          <Progress className="flex-auto" value={100} />
                          <NextLink
                            href="#"
                            className="hover:underline focus-visible:outline-none text-xs font-semibold leading-[21px] inline-flex items-center gap-x-1 text-dark-blue-400"
                          >
                            100% <span className="font-extralight">(100)</span>
                          </NextLink>
                        </div>
                        <div className="flex items-center gap-x-2">
                          <NextLink
                            href="#"
                            className="hover:underline focus-visible:outline-none text-xs font-semibold text-dark-blue-400"
                          >
                            4
                          </NextLink>
                          <Progress className="flex-auto" value={75} />
                          <NextLink
                            href="#"
                            className="hover:underline focus-visible:outline-none text-xs font-semibold leading-[21px] inline-flex items-center gap-x-1 text-dark-blue-400"
                          >
                            75% <span className="font-extralight">(75)</span>
                          </NextLink>
                        </div>
                        <div className="flex items-center gap-x-2">
                          <NextLink
                            href="#"
                            className="hover:underline focus-visible:outline-none text-xs font-semibold text-dark-blue-400"
                          >
                            3
                          </NextLink>
                          <Progress className="flex-auto" value={50} />
                          <NextLink
                            href="#"
                            className="hover:underline focus-visible:outline-none text-xs font-semibold leading-[21px] inline-flex items-center gap-x-1 text-dark-blue-400"
                          >
                            50% <span className="font-extralight">(50)</span>
                          </NextLink>
                        </div>
                        <div className="flex items-center gap-x-2">
                          <NextLink
                            href="#"
                            className="hover:underline focus-visible:outline-none text-xs font-semibold text-dark-blue-400"
                          >
                            2
                          </NextLink>
                          <Progress className="flex-auto" value={25} />
                          <NextLink
                            href="#"
                            className="hover:underline focus-visible:outline-none text-xs font-semibold leading-[21px] inline-flex items-center gap-x-1 text-dark-blue-400"
                          >
                            25% <span className="font-extralight">(25)</span>
                          </NextLink>
                        </div>
                        <div className="flex items-center gap-x-2">
                          <NextLink
                            href="#"
                            className="hover:underline focus-visible:outline-none text-xs font-semibold text-dark-blue-400"
                          >
                            1
                          </NextLink>
                          <Progress className="flex-auto" value={0} />
                          <NextLink
                            href="#"
                            className="hover:underline focus-visible:outline-none text-xs font-semibold leading-[21px] inline-flex items-center gap-x-1 text-dark-blue-400"
                          >
                            0% <span className="font-extralight">(0)</span>
                          </NextLink>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col basis-[304px]">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <NextLink
                              href="#"
                              className="focus-visible:outline-none text-xs leading-5 font-semibold underline text-gray-500 hover:text-gray-600"
                            >
                              Communication Level
                            </NextLink>

                            <div className="flex items-center gap-x-1">
                              <Star className="size-3.5 text-primary-500 fill-primary-500" />
                              <span className="text-[13px] leading-none font-medium">
                                4.3
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <NextLink
                              href="#"
                              className="focus-visible:outline-none text-xs leading-5 font-semibold underline text-gray-500 hover:text-gray-600"
                            >
                              Responsiveness
                            </NextLink>

                            <div className="flex items-center gap-x-1">
                              <Star className="size-3.5 text-primary-500 fill-primary-500" />
                              <span className="text-[13px] leading-none font-medium">
                                4.3
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <NextLink
                              href="#"
                              className="focus-visible:outline-none text-xs leading-5 font-semibold underline text-gray-500 hover:text-gray-600"
                            >
                              Quality of Delivery
                            </NextLink>

                            <div className="flex items-center gap-x-1">
                              <Star className="size-3.5 text-primary-500 fill-primary-500" />
                              <span className="text-[13px] leading-none font-medium">
                                4.3
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <NextLink
                              href="#"
                              className="focus-visible:outline-none text-xs leading-5 font-semibold underline text-gray-500 hover:text-gray-600"
                            >
                              Value of Delivery
                            </NextLink>

                            <div className="flex items-center gap-x-1">
                              <Star className="size-3.5 text-primary-500 fill-primary-500" />
                              <span className="text-[13px] leading-none font-medium">
                                4.3
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <NextLink
                              href="#"
                              className="focus-visible:outline-none text-xs leading-5 font-semibold underline text-gray-500 hover:text-gray-600"
                            >
                              Value of Delivery
                            </NextLink>

                            <div className="flex items-center gap-x-1">
                              <Star className="size-3.5 text-primary-500 fill-primary-500" />
                              <span className="text-[13px] leading-none font-medium">
                                4.9
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Tabs defaultValue="Completed">
                      <RadixTabs.List className="flex items-center justify-between">
                        <div className="flex items-center gap-x-3">
                          <TabsTrigger
                            variant="unstyled"
                            showUnderline={false}
                            value="Completed"
                            className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                          >
                            Completed (24)
                          </TabsTrigger>
                          <TabsTrigger
                            variant="unstyled"
                            showUnderline={false}
                            value="Ongoing"
                            className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                          >
                            Ongoing (7)
                          </TabsTrigger>
                        </div>

                        <div className="inline-flex items-center gap-x-3">
                          <SectionSearchBar />

                          <Listbox
                            className="shrink-0 w-max"
                            defaultValue="Most Recent"
                          >
                            <ListboxButton className="w-max text-sm h-10" />
                            <ListboxOptions className="w-[177px] right-0">
                              {[
                                "Most Recent",
                                "Oldest",
                                "Highest Rating",
                                "Lowest Rating",
                              ].map((option) => (
                                <ListboxOption
                                  className="ui-active:text-gray-700 ui-active:font-medium text-gray-500"
                                  key={option}
                                  value={option}
                                >
                                  {option}
                                </ListboxOption>
                              ))}
                            </ListboxOptions>
                          </Listbox>
                        </div>
                      </RadixTabs.List>
                      <TabsContent value="Completed">
                        <ShowMoreLessRoot
                          value={autoExpandProjectHistory}
                          onValueChange={setAutoExpandProjectHistory}
                        >
                          {({ isShowing, setIsShowing, scrollHeight, ref }) => (
                            <>
                              <div
                                ref={ref}
                                className="mt-6 overflow-hidden [interpolate-size:allow-keywords] transition-[height] duration-500"
                                style={{
                                  height: isShowing
                                    ? "auto"
                                    : scrollHeight
                                      ? toPxIfNumber(scrollHeight)
                                      : "auto",
                                }}
                              >
                                <ShowMoreLessComp max={2}>
                                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                    <div className="flex items-center pt-6 px-6">
                                      <div className="flex-1 w-[394px] space-y-3">
                                        <div className="flex items-start gap-x-3">
                                          <Avatar size="md">
                                            <AvatarImage
                                              src="/man.jpg"
                                              alt="Man"
                                            />
                                            <AvatarFallback>M</AvatarFallback>
                                          </Avatar>

                                          <div className="space-y-3">
                                            <div className="flex flex-col">
                                              <div className="inline-flex items-center gap-x-1">
                                                <span className="text-base leading-6 font-semibold text-dark-blue-400">
                                                  Emily
                                                </span>
                                                <span className="text-base leading-6 text-dark-blue-400">
                                                  @emily.j
                                                </span>
                                              </div>

                                              <span className="text-[13px] leading-6 text-dark-blue-400">
                                                Product Manager
                                              </span>
                                            </div>

                                            <div className="inline-flex items-center gap-x-2">
                                              <span className="text-xs leading-none text-dark-blue-400">
                                                December 2020 - Present
                                              </span>
                                              <span className="shrink-0 size-1 rounded-full bg-gray-300 inline-block" />
                                              <span className="text-xs leading-none text-dark-blue-400">
                                                5 yrs 2 mos
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-x-2">
                                          <div className="inline-flex items-center gap-x-[2.35px]">
                                            <Favorite
                                              defaultPressed
                                              className="size-[15px]"
                                            />
                                            <Favorite
                                              defaultPressed
                                              className="size-[15px]"
                                            />
                                            <Favorite
                                              defaultPressed
                                              className="size-[15px]"
                                            />
                                            <Favorite
                                              defaultPressed
                                              className="size-[15px]"
                                            />
                                            <Favorite
                                              defaultPressed
                                              className="size-[15px]"
                                            />
                                          </div>

                                          <span className="text-base leading-[28.16px] font-bold text-dark-blue-400">
                                            4.8
                                          </span>

                                          <span className="text-[11px] leading-6 font-extralight text-dark-blue-400">
                                            Posted a week ago
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex-1 w-[477px] inline-grid grid-cols-2 gap-y-4 gap-x-[50px] pb-3">
                                        <div className="flex items-center gap-x-[6.4px]">
                                          <CheckCircle className="size-[18px] text-success-500" />
                                          <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                            Would Recommend
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-x-[6.4px]">
                                          <CheckCircle className="size-[18px] text-success-500" />
                                          <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                            Would Recommend
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-x-[6.4px]">
                                          <CheckCircle className="size-[18px] text-success-500" />
                                          <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                            Would Recommend
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-x-[6.4px]">
                                          <CheckCircle className="size-[18px] text-success-500" />
                                          <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                            Would Recommend
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-3 px-6">
                                      <h1 className="text-sm leading-6 font-semibold text-dark-blue-400">
                                        Best Experience with a Backend
                                        Engineer!!!!
                                      </h1>
                                      <LineClampText
                                        text="Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptate doloremque impedit eveniet harum dolores modi dolor, aspernatur saepe incidunt consequuntur et voluptatem dolorem ea sequi officia distinctio perspiciatis labore fugit eligendi architecto similique esse assumenda fugiat? Aut tempora veritatis, similique exercitationem quos consequuntur repudiandae, quaerat nesciunt ducimus beatae tempore alias repellendus id quidem pariatur blanditiis architecto quasi aperiam fugiat maiores?"
                                        lines={2}
                                        className="text-sm leading-relaxed mt-1 text-gray-700 font-extralight"
                                        expandLabel="...Read More"
                                        collapseLabel=""
                                        inline
                                      />

                                      <div className="mt-3 flex items-center justify-between">
                                        <div className="items-center inline-flex gap-x-2.5">
                                          {true && (
                                            <>
                                              <span className="text-xs font-medium leading-none text-dark-blue-400">
                                                Helpful
                                              </span>
                                              <LikeDislike />
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-6 flex items-center gap-x-3 px-6 pb-6">
                                      <div className="border border-black/10 w-[153px] relative rounded-lg overflow-hidden h-[98px]">
                                        <NextImage
                                          className="object-cover"
                                          src="/dashboard.png"
                                          alt="Dashboard"
                                          fill
                                          sizes="25vw"
                                        />
                                      </div>

                                      <div className="flex-auto space-y-3">
                                        <h1 className="text-sm font-bold leading-6 text-dark-blue-400">
                                          Seniority Mobile App
                                        </h1>

                                        <div className="flex gap-x-8 items-center">
                                          <div className="inline-flex items-center gap-x-3">
                                            <span className="text-sm text-dark-blue-400 leading-6">
                                              Project Cost
                                            </span>
                                            <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                              Project Cost
                                            </span>
                                          </div>
                                          <div className="inline-flex items-center gap-x-3">
                                            <span className="text-sm text-dark-blue-400 leading-6">
                                              Project Cost
                                            </span>
                                            <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                              Project Cost
                                            </span>
                                          </div>
                                          <div className="inline-flex items-center gap-x-3">
                                            <span className="text-sm text-dark-blue-400 leading-6">
                                              Project Cost
                                            </span>
                                            <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                              Project Cost
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-x-2">
                                          <Badge size="sm" visual="gray">
                                            Team player
                                          </Badge>
                                          <Badge size="sm" visual="gray">
                                            Team player
                                          </Badge>
                                          <Badge size="sm" visual="gray">
                                            Team player
                                          </Badge>
                                          <Badge size="sm" visual="gray">
                                            Team player
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-6 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                    <div className="flex items-center pt-6 px-6">
                                      <div className="flex-1 w-[394px] space-y-3">
                                        <div className="flex items-start gap-x-3">
                                          <Avatar size="md">
                                            <AvatarImage
                                              src="/man.jpg"
                                              alt="Man"
                                            />
                                            <AvatarFallback>M</AvatarFallback>
                                          </Avatar>

                                          <div className="space-y-3">
                                            <div className="flex flex-col">
                                              <div className="inline-flex items-center gap-x-1">
                                                <span className="text-base leading-6 font-semibold text-dark-blue-400">
                                                  Emily
                                                </span>
                                                <span className="text-base leading-6 text-dark-blue-400">
                                                  @emily.j
                                                </span>
                                              </div>

                                              <span className="text-[13px] leading-6 text-dark-blue-400">
                                                Product Manager
                                              </span>
                                            </div>

                                            <div className="inline-flex items-center gap-x-2">
                                              <span className="text-xs leading-none text-dark-blue-400">
                                                December 2020 - Present
                                              </span>
                                              <span className="shrink-0 size-1 rounded-full bg-gray-300 inline-block" />
                                              <span className="text-xs leading-none text-dark-blue-400">
                                                5 yrs 2 mos
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-x-2">
                                          <div className="inline-flex items-center gap-x-[2.35px]">
                                            <Favorite
                                              defaultPressed
                                              className="size-[15px]"
                                            />
                                            <Favorite
                                              defaultPressed
                                              className="size-[15px]"
                                            />
                                            <Favorite
                                              defaultPressed
                                              className="size-[15px]"
                                            />
                                            <Favorite
                                              defaultPressed
                                              className="size-[15px]"
                                            />
                                            <Favorite
                                              defaultPressed
                                              className="size-[15px]"
                                            />
                                          </div>

                                          <span className="text-base leading-[28.16px] font-bold text-dark-blue-400">
                                            4.8
                                          </span>

                                          <span className="text-[11px] leading-6 font-extralight text-dark-blue-400">
                                            Posted a week ago
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex-1 w-[477px] inline-grid grid-cols-2 gap-y-4 gap-x-[50px] pb-3">
                                        <div className="flex items-center gap-x-[6.4px]">
                                          <CheckCircle className="size-[18px] text-success-500" />
                                          <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                            Would Recommend
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-x-[6.4px]">
                                          <CheckCircle className="size-[18px] text-success-500" />
                                          <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                            Would Recommend
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-x-[6.4px]">
                                          <CheckCircle className="size-[18px] text-success-500" />
                                          <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                            Would Recommend
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-x-[6.4px]">
                                          <CheckCircle className="size-[18px] text-success-500" />
                                          <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                            Would Recommend
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-3 px-6">
                                      <h1 className="text-sm leading-6 font-semibold text-dark-blue-400">
                                        Best Experience with a Backend
                                        Engineer!!!!
                                      </h1>
                                      <LineClampText
                                        text="Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptate doloremque impedit eveniet harum dolores modi dolor, aspernatur saepe incidunt consequuntur et voluptatem dolorem ea sequi officia distinctio perspiciatis labore fugit eligendi architecto similique esse assumenda fugiat? Aut tempora veritatis, similique exercitationem quos consequuntur repudiandae, quaerat nesciunt ducimus beatae tempore alias repellendus id quidem pariatur blanditiis architecto quasi aperiam fugiat maiores?"
                                        lines={2}
                                        className="text-sm leading-relaxed mt-1 text-gray-700 font-extralight"
                                        expandLabel="...Read More"
                                        collapseLabel=""
                                        inline
                                      />

                                      <div className="mt-3 flex items-center justify-between">
                                        <div className="items-center inline-flex gap-x-2.5">
                                          {true && (
                                            <>
                                              <span className="text-xs font-medium leading-none text-dark-blue-400">
                                                Helpful
                                              </span>
                                              <LikeDislike />
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-6 flex items-center gap-x-3 px-6 pb-6">
                                      <div className="border border-black/10 w-[153px] relative rounded-lg overflow-hidden h-[98px]">
                                        <NextImage
                                          className="object-cover"
                                          src="/dashboard.png"
                                          alt="Dashboard"
                                          fill
                                          sizes="25vw"
                                        />
                                      </div>

                                      <div className="flex-auto space-y-3">
                                        <h1 className="text-sm font-bold leading-6 text-dark-blue-400">
                                          Seniority Mobile App
                                        </h1>

                                        <div className="flex gap-x-8 items-center">
                                          <div className="inline-flex items-center gap-x-3">
                                            <span className="text-sm text-dark-blue-400 leading-6">
                                              Project Cost
                                            </span>
                                            <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                              Project Cost
                                            </span>
                                          </div>
                                          <div className="inline-flex items-center gap-x-3">
                                            <span className="text-sm text-dark-blue-400 leading-6">
                                              Project Cost
                                            </span>
                                            <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                              Project Cost
                                            </span>
                                          </div>
                                          <div className="inline-flex items-center gap-x-3">
                                            <span className="text-sm text-dark-blue-400 leading-6">
                                              Project Cost
                                            </span>
                                            <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                              Project Cost
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-x-2">
                                          <Badge size="sm" visual="gray">
                                            Team player
                                          </Badge>
                                          <Badge size="sm" visual="gray">
                                            Team player
                                          </Badge>
                                          <Badge size="sm" visual="gray">
                                            Team player
                                          </Badge>
                                          <Badge size="sm" visual="gray">
                                            Team player
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="p-6 bg-white border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] border-t">
                                      <div className="flex items-center gap-x-3">
                                        <Avatar
                                          className="hover:ring-0 active:ring-primary-100"
                                          size="md"
                                        >
                                          <AvatarImage
                                            src="/man.jpg"
                                            alt="Man"
                                          />
                                          <AvatarFallback>M</AvatarFallback>
                                        </Avatar>

                                        <div className="flex flex-col flex-1">
                                          <div className="inline-flex items-center gap-x-1">
                                            <span className="text-sm leading-6 font-bold text-dark-blue-400">
                                              Company Response
                                            </span>
                                            <span className="text-sm leading-6 text-dark-blue-400">
                                              @Acme Inc.
                                            </span>
                                          </div>

                                          <div className="inline-flex items-center mt-[1.5px] gap-x-2">
                                            <span className="text-xs leading-none text-dark-blue-400">
                                              90 days project
                                            </span>
                                            <span className="shrink-0 size-1 rounded-full bg-gray-300 inline-block" />
                                            <span className="text-xs leading-none text-dark-blue-400">
                                              March 2023
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <LineClampText
                                        text="Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptate doloremque impedit eveniet harum dolores modi dolor, aspernatur saepe incidunt consequuntur et voluptatem dolorem ea sequi officia distinctio perspiciatis labore fugit eligendi architecto similique esse assumenda fugiat? Aut tempora veritatis, similique exercitationem quos consequuntur repudiandae, quaerat nesciunt ducimus beatae tempore alias repellendus id quidem pariatur blanditiis architecto quasi aperiam fugiat maiores?"
                                        lines={2}
                                        className="text-sm leading-relaxed mt-3 text-gray-700 font-extralight"
                                        expandLabel="...Read More"
                                        collapseLabel=""
                                        inline
                                      />

                                      <div className="mt-3 flex items-center justify-between">
                                        <div className="items-center inline-flex gap-x-2.5">
                                          {true && (
                                            <>
                                              <span className="text-xs font-medium leading-none text-dark-blue-400">
                                                Helpful
                                              </span>
                                              <LikeDislike />
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-6 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                    <div className="flex items-center pt-6 px-6">
                                      <div className="flex-1 w-[394px] space-y-3">
                                        <div className="flex items-start gap-x-3">
                                          <Avatar size="md">
                                            <AvatarImage
                                              src="/man.jpg"
                                              alt="Man"
                                            />
                                            <AvatarFallback>M</AvatarFallback>
                                          </Avatar>

                                          <div className="space-y-3">
                                            <div className="flex flex-col">
                                              <div className="inline-flex items-center gap-x-1">
                                                <span className="text-base leading-6 font-semibold text-dark-blue-400">
                                                  Emily
                                                </span>
                                                <span className="text-base leading-6 text-dark-blue-400">
                                                  @emily.j
                                                </span>
                                              </div>

                                              <span className="text-[13px] leading-6 text-dark-blue-400">
                                                Product Manager
                                              </span>
                                            </div>

                                            <div className="inline-flex items-center gap-x-2">
                                              <span className="text-xs leading-none text-dark-blue-400">
                                                December 2020 - Present
                                              </span>
                                              <span className="shrink-0 size-1 rounded-full bg-gray-300 inline-block" />
                                              <span className="text-xs leading-none text-dark-blue-400">
                                                5 yrs 2 mos
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-x-2">
                                          <div className="inline-flex items-center gap-x-[2.35px]">
                                            <Favorite
                                              defaultPressed
                                              className="size-[15px]"
                                            />
                                            <Favorite
                                              defaultPressed
                                              className="size-[15px]"
                                            />
                                            <Favorite
                                              defaultPressed
                                              className="size-[15px]"
                                            />
                                            <Favorite
                                              defaultPressed
                                              className="size-[15px]"
                                            />
                                            <Favorite
                                              defaultPressed
                                              className="size-[15px]"
                                            />
                                          </div>

                                          <span className="text-base leading-[28.16px] font-bold text-dark-blue-400">
                                            4.8
                                          </span>

                                          <span className="text-[11px] leading-6 font-extralight text-dark-blue-400">
                                            Posted a week ago
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex-1 w-[477px] inline-grid grid-cols-2 gap-y-4 gap-x-[50px] pb-3">
                                        <div className="flex items-center gap-x-[6.4px]">
                                          <CheckCircle className="size-[18px] text-success-500" />
                                          <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                            Would Recommend
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-x-[6.4px]">
                                          <CheckCircle className="size-[18px] text-success-500" />
                                          <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                            Would Recommend
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-x-[6.4px]">
                                          <CheckCircle className="size-[18px] text-success-500" />
                                          <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                            Would Recommend
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-x-[6.4px]">
                                          <CheckCircle className="size-[18px] text-success-500" />
                                          <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                            Would Recommend
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-3 px-6">
                                      <h1 className="text-sm leading-6 font-semibold text-dark-blue-400">
                                        Best Experience with a Backend
                                        Engineer!!!!
                                      </h1>
                                      <LineClampText
                                        text="Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptate doloremque impedit eveniet harum dolores modi dolor, aspernatur saepe incidunt consequuntur et voluptatem dolorem ea sequi officia distinctio perspiciatis labore fugit eligendi architecto similique esse assumenda fugiat? Aut tempora veritatis, similique exercitationem quos consequuntur repudiandae, quaerat nesciunt ducimus beatae tempore alias repellendus id quidem pariatur blanditiis architecto quasi aperiam fugiat maiores?"
                                        lines={2}
                                        className="text-sm leading-relaxed mt-1 text-gray-700 font-extralight"
                                        expandLabel="...Read More"
                                        collapseLabel=""
                                        inline
                                      />

                                      <div className="mt-3 flex items-center justify-between">
                                        <div className="items-center inline-flex gap-x-2.5">
                                          {true && (
                                            <>
                                              <span className="text-xs font-medium leading-none text-dark-blue-400">
                                                Helpful
                                              </span>
                                              <LikeDislike />
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-6 flex items-center gap-x-3 px-6 pb-6">
                                      <div className="border border-black/10 w-[153px] relative rounded-lg overflow-hidden h-[98px]">
                                        <NextImage
                                          className="object-cover"
                                          src="/dashboard.png"
                                          alt="Dashboard"
                                          fill
                                          sizes="25vw"
                                        />
                                      </div>

                                      <div className="flex-auto space-y-3">
                                        <h1 className="text-sm font-bold leading-6 text-dark-blue-400">
                                          Seniority Mobile App
                                        </h1>

                                        <div className="flex gap-x-8 items-center">
                                          <div className="inline-flex items-center gap-x-3">
                                            <span className="text-sm text-dark-blue-400 leading-6">
                                              Project Cost
                                            </span>
                                            <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                              Project Cost
                                            </span>
                                          </div>
                                          <div className="inline-flex items-center gap-x-3">
                                            <span className="text-sm text-dark-blue-400 leading-6">
                                              Project Cost
                                            </span>
                                            <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                              Project Cost
                                            </span>
                                          </div>
                                          <div className="inline-flex items-center gap-x-3">
                                            <span className="text-sm text-dark-blue-400 leading-6">
                                              Project Cost
                                            </span>
                                            <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                              Project Cost
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-x-2">
                                          <Badge size="sm" visual="gray">
                                            Team player
                                          </Badge>
                                          <Badge size="sm" visual="gray">
                                            Team player
                                          </Badge>
                                          <Badge size="sm" visual="gray">
                                            Team player
                                          </Badge>
                                          <Badge size="sm" visual="gray">
                                            Team player
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-6 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                    <div className="flex items-center pt-6 px-6">
                                      <div className="flex-1 w-[394px] space-y-3">
                                        <div className="flex items-start gap-x-3">
                                          <Avatar size="md">
                                            <AvatarImage
                                              src="/man.jpg"
                                              alt="Man"
                                            />
                                            <AvatarFallback>M</AvatarFallback>
                                          </Avatar>

                                          <div className="space-y-3">
                                            <div className="flex flex-col">
                                              <div className="inline-flex items-center gap-x-1">
                                                <span className="text-base leading-6 font-semibold text-dark-blue-400">
                                                  Emily
                                                </span>
                                                <span className="text-base leading-6 text-dark-blue-400">
                                                  @emily.j
                                                </span>
                                              </div>

                                              <span className="text-[13px] leading-6 text-dark-blue-400">
                                                Product Manager
                                              </span>
                                            </div>

                                            <div className="inline-flex items-center gap-x-2">
                                              <span className="text-xs leading-none text-dark-blue-400">
                                                December 2020 - Present
                                              </span>
                                              <span className="shrink-0 size-1 rounded-full bg-gray-300 inline-block" />
                                              <span className="text-xs leading-none text-dark-blue-400">
                                                5 yrs 2 mos
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-x-2">
                                          <div className="inline-flex items-center gap-x-[2.35px]">
                                            <Favorite
                                              defaultPressed
                                              className="size-[15px]"
                                            />
                                            <Favorite
                                              defaultPressed
                                              className="size-[15px]"
                                            />
                                            <Favorite
                                              defaultPressed
                                              className="size-[15px]"
                                            />
                                            <Favorite
                                              defaultPressed
                                              className="size-[15px]"
                                            />
                                            <Favorite
                                              defaultPressed
                                              className="size-[15px]"
                                            />
                                          </div>

                                          <span className="text-base leading-[28.16px] font-bold text-dark-blue-400">
                                            4.8
                                          </span>

                                          <span className="text-[11px] leading-6 font-extralight text-dark-blue-400">
                                            Posted a week ago
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex-1 w-[477px] inline-grid grid-cols-2 gap-y-4 gap-x-[50px] pb-3">
                                        <div className="flex items-center gap-x-[6.4px]">
                                          <CheckCircle className="size-[18px] text-success-500" />
                                          <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                            Would Recommend
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-x-[6.4px]">
                                          <CheckCircle className="size-[18px] text-success-500" />
                                          <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                            Would Recommend
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-x-[6.4px]">
                                          <CheckCircle className="size-[18px] text-success-500" />
                                          <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                            Would Recommend
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-x-[6.4px]">
                                          <CheckCircle className="size-[18px] text-success-500" />
                                          <span className="text-sm text-dark-blue-400 leading-none font-medium">
                                            Would Recommend
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-3 px-6">
                                      <h1 className="text-sm leading-6 font-semibold text-dark-blue-400">
                                        Best Experience with a Backend
                                        Engineer!!!!
                                      </h1>
                                      <LineClampText
                                        text="Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptate doloremque impedit eveniet harum dolores modi dolor, aspernatur saepe incidunt consequuntur et voluptatem dolorem ea sequi officia distinctio perspiciatis labore fugit eligendi architecto similique esse assumenda fugiat? Aut tempora veritatis, similique exercitationem quos consequuntur repudiandae, quaerat nesciunt ducimus beatae tempore alias repellendus id quidem pariatur blanditiis architecto quasi aperiam fugiat maiores?"
                                        lines={2}
                                        className="text-sm leading-relaxed mt-1 text-gray-700 font-extralight"
                                        expandLabel="...Read More"
                                        collapseLabel=""
                                        inline
                                      />

                                      <div className="mt-3 flex items-center justify-between">
                                        <div className="items-center inline-flex gap-x-2.5">
                                          {true && (
                                            <>
                                              <span className="text-xs font-medium leading-none text-dark-blue-400">
                                                Helpful
                                              </span>
                                              <LikeDislike />
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-6 flex items-center gap-x-3 px-6 pb-6">
                                      <div className="border border-black/10 w-[153px] relative rounded-lg overflow-hidden h-[98px]">
                                        <NextImage
                                          className="object-cover"
                                          src="/dashboard.png"
                                          alt="Dashboard"
                                          fill
                                          sizes="25vw"
                                        />
                                      </div>

                                      <div className="flex-auto space-y-3">
                                        <h1 className="text-sm font-bold leading-6 text-dark-blue-400">
                                          Seniority Mobile App
                                        </h1>

                                        <div className="flex gap-x-8 items-center">
                                          <div className="inline-flex items-center gap-x-3">
                                            <span className="text-sm text-dark-blue-400 leading-6">
                                              Project Cost
                                            </span>
                                            <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                              Project Cost
                                            </span>
                                          </div>
                                          <div className="inline-flex items-center gap-x-3">
                                            <span className="text-sm text-dark-blue-400 leading-6">
                                              Project Cost
                                            </span>
                                            <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                              Project Cost
                                            </span>
                                          </div>
                                          <div className="inline-flex items-center gap-x-3">
                                            <span className="text-sm text-dark-blue-400 leading-6">
                                              Project Cost
                                            </span>
                                            <span className="text-sm font-bold text-dark-blue-400 leading-6">
                                              Project Cost
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-x-2">
                                          <Badge size="sm" visual="gray">
                                            Team player
                                          </Badge>
                                          <Badge size="sm" visual="gray">
                                            Team player
                                          </Badge>
                                          <Badge size="sm" visual="gray">
                                            Team player
                                          </Badge>
                                          <Badge size="sm" visual="gray">
                                            Team player
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </ShowMoreLessComp>
                              </div>

                              <div className="flex items-center justify-end mt-6">
                                <Button
                                  size="md"
                                  visual="gray"
                                  variant="outlined"
                                  className="bg-white"
                                  onClick={() => setIsShowing((prev) => !prev)}
                                >
                                  {isShowing ? (
                                    <>
                                      View Less{" "}
                                      <ChevronUp className="size-[15px]" />
                                    </>
                                  ) : (
                                    "Show More Feedback (1)"
                                  )}
                                </Button>
                              </div>
                            </>
                          )}
                        </ShowMoreLessRoot>
                      </TabsContent>

                      <TabsContent value="Ongoing">
                        <div className="mt-6 space-y-6">
                          <article className="border p-6 rounded-lg bg-white border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                            <div className="flex items-start gap-x-4">
                              <div className="relative overflow-hidden rounded-md shrink-0 w-[134px] h-[86px]">
                                <NextImage
                                  src="/dashboard.png"
                                  alt="Dashboard"
                                  fill
                                  sizes="25vw"
                                />
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center gap-x-2">
                                  <h1 className="text-sm font-bold text-dark-blue-400">
                                    Seniority Mobile App
                                  </h1>
                                  <Badge
                                    className="border rounded-[3.15px] bg-white border-gray-300"
                                    visual="gray"
                                    variant="rounded"
                                  >
                                    <FileText className="size-[9.46px] text-primary-500" />{" "}
                                    Under NDA
                                  </Badge>
                                </div>

                                <div className="mt-2 flex items-center gap-x-6">
                                  <div className="flex gap-x-3">
                                    <span className="text-xs leading-6 text-dark-blue-400">
                                      Estimated Project Cost
                                    </span>
                                    <span className="font-bold text-sm leading-6 text-dark-blue-400">
                                      $25,000
                                    </span>
                                  </div>
                                  <div className="flex gap-x-3">
                                    <span className="text-xs leading-6 text-dark-blue-400">
                                      Project Type
                                    </span>
                                    <span className="font-bold text-sm leading-6 text-dark-blue-400">
                                      Cloud Software
                                    </span>
                                  </div>
                                  <div className="flex gap-x-3">
                                    <span className="text-xs leading-6 text-dark-blue-400">
                                      Current Phase
                                    </span>
                                    <span className="font-bold text-sm leading-6 text-dark-blue-400">
                                      Development
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-2 flex items-center gap-x-2">
                                  <Badge>API-Driven</Badge>
                                  <Badge>Agile Workflow</Badge>
                                  <Badge>Cross-Platform</Badge>
                                  <Badge>Cloud-Based</Badge>
                                  <Badge>Mobile-Optimized</Badge>
                                  <Badge>FinTech</Badge>
                                  <Badge>SaaS</Badge>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-x-3 mt-3">
                              <div className="flex items-center gap-x-4">
                                <AvatarGroup
                                  excessClassName="border-gray-300 text-gray-500"
                                  excess
                                >
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                </AvatarGroup>

                                <span className="text-xs text-dark-blue-400">
                                  Senior Front-End Developer
                                </span>
                              </div>

                              <span className="shrink-0 size-1 bg-gray-300 rounded-full" />

                              <div className="flex items-center gap-x-2">
                                <span className="text-xs text-dark-blue-400">
                                  January 2025 - Present
                                </span>

                                <Badge
                                  variant="rounded"
                                  className="bg-primary-50 text-primary-500 px-1.5 rounded-[3.15px]"
                                  visual="primary"
                                >
                                  2 Months
                                </Badge>
                              </div>
                            </div>
                          </article>

                          <article className="border p-6 rounded-lg bg-white border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                            <div className="flex items-start gap-x-4">
                              <div className="relative overflow-hidden rounded-md shrink-0 w-[134px] h-[86px]">
                                <NextImage
                                  src="/dashboard.png"
                                  alt="Dashboard"
                                  fill
                                  sizes="25vw"
                                />
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center gap-x-2">
                                  <h1 className="text-sm font-bold text-dark-blue-400">
                                    Seniority Mobile App
                                  </h1>
                                  <Badge
                                    className="border rounded-[3.15px] bg-white border-gray-300"
                                    visual="gray"
                                    variant="rounded"
                                  >
                                    <FileText className="size-[9.46px] text-primary-500" />{" "}
                                    Under NDA
                                  </Badge>
                                </div>

                                <div className="mt-2 flex items-center gap-x-6">
                                  <div className="flex gap-x-3">
                                    <span className="text-xs leading-6 text-dark-blue-400">
                                      Estimated Project Cost
                                    </span>
                                    <span className="font-bold text-sm leading-6 text-dark-blue-400">
                                      $25,000
                                    </span>
                                  </div>
                                  <div className="flex gap-x-3">
                                    <span className="text-xs leading-6 text-dark-blue-400">
                                      Project Type
                                    </span>
                                    <span className="font-bold text-sm leading-6 text-dark-blue-400">
                                      Cloud Software
                                    </span>
                                  </div>
                                  <div className="flex gap-x-3">
                                    <span className="text-xs leading-6 text-dark-blue-400">
                                      Current Phase
                                    </span>
                                    <span className="font-bold text-sm leading-6 text-dark-blue-400">
                                      Development
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-2 flex items-center gap-x-2">
                                  <Badge>API-Driven</Badge>
                                  <Badge>Agile Workflow</Badge>
                                  <Badge>Cross-Platform</Badge>
                                  <Badge>Cloud-Based</Badge>
                                  <Badge>Mobile-Optimized</Badge>
                                  <Badge>FinTech</Badge>
                                  <Badge>SaaS</Badge>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-x-3 mt-3">
                              <div className="flex items-center gap-x-4">
                                <AvatarGroup
                                  excessClassName="border-gray-300 text-gray-500"
                                  excess
                                >
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                  <Avatar className="border-2 border-white hover:ring-0 active:ring-0">
                                    <AvatarImage src="/woman.jpg" alt="Woman" />
                                    <AvatarFallback>W</AvatarFallback>
                                  </Avatar>
                                </AvatarGroup>

                                <span className="text-xs text-dark-blue-400">
                                  Senior Front-End Developer
                                </span>
                              </div>

                              <span className="shrink-0 size-1 bg-gray-300 rounded-full" />

                              <div className="flex items-center gap-x-2">
                                <span className="text-xs text-dark-blue-400">
                                  January 2025 - Present
                                </span>

                                <Badge
                                  variant="rounded"
                                  className="bg-primary-50 text-primary-500 px-1.5 rounded-[3.15px]"
                                  visual="primary"
                                >
                                  2 Months
                                </Badge>
                              </div>
                            </div>
                          </article>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
            </div>
              </div>

              {/* Right sidebar — Figma 13236:30498. Copied from talent-profile. */}
              <div className="shrink-0 flex flex-col gap-y-6 w-[289px] isolate">
                <div
                  className={cn(
                    "rounded-lg z-10 transition duration-300 bg-white top-[145px] sticky",
                    "before:content-[''] before:absolute before:w-full before:top-[-32px] before:h-[40px] before:bg-gray-50",
                    isCardStuck &&
                      "shadow-[0px_12px_16px_-4px_rgba(16,24,40,0.08)]"
                  )}
                  ref={cardRef}
                >
                  {/* 13236:30499 — status / response time / message */}
                  <div className="p-6 relative bg-white border border-gray-200 rounded-t-lg">
                    <div className="flex items-center gap-x-1 justify-center">
                      <span className="inline-flex text-sm leading-[17px] text-dark-blue-400 font-bold items-center gap-x-1">
                        <span className="size-2 inline-block rounded-full bg-gray-500" />{" "}
                        {team.status}
                      </span>
                      <span className="font-extralight text-sm leading-[17px] text-dark-blue-400">
                        {team.localTime}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-center">
                      <span className="text-sm leading-[17px] font-extralight text-dark-blue-400">
                        Average response time{" "}
                        <span className="text-sm font-bold leading-[17px]">
                          {team.avgResponseTime}
                        </span>
                      </span>
                    </div>

                    <button
                      className="w-full mt-5 duration-300 transition focus-visible:outline-none text-sm leading-5 font-semibold shrink-0 h-10 flex items-center justify-center gap-x-2 rounded-[5px] px-4 bg-white border-2 text-primary-500 hover:text-white hover:bg-primary-500 border-primary-500 shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)]"
                      type="button"
                    >
                      <MessageSquare01 className="size-[15px]" /> Message Us
                    </button>
                  </div>

                  {/* 13236:30507 — Languages + Locations */}
                  <div className="bg-white border-gray-200 border-x border-b p-6">
                    <span className="flex items-center text-xs leading-[15px] font-extralight text-dark-blue-400 gap-x-[5.85px]">
                      <MessageTextSquare01 className="size-[15px]" />
                      Languages
                    </span>
                    <p className="mt-3 text-xs leading-[15px] font-bold text-dark-blue-400">
                      {summarizeList(team.languages, 2)}
                    </p>

                    <span className="mt-5 flex items-center text-xs leading-[15px] font-extralight text-dark-blue-400 gap-x-[5.85px]">
                      <MarkerPin01 className="size-[15px]" />
                      Locations
                    </span>
                    <p className="mt-3 text-xs leading-[15px] font-bold text-dark-blue-400">
                      {summarizeList(team.locations, 3)}
                    </p>
                  </div>

                  {/* 13236:30520 — Top Categories */}
                  <div className="bg-white border-gray-200 border-x border-b rounded-b-lg p-6">
                    <span className="flex items-center text-xs leading-[15px] font-extralight text-dark-blue-400 gap-x-[5.85px]">
                      <MessageTextSquare01 className="size-[15px]" />
                      Top Categories
                    </span>
                    <p className="mt-3 text-xs leading-[15px] font-bold text-dark-blue-400 capitalize">
                      {team.topCategories.join(", ")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
        </div>
      </Tabs>
    </div>
  )
}
