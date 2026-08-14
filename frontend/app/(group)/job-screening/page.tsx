"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Archive,
  Briefcase01,
  Building07,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  Copy01,
  CurrencyDollar,
  Download01,
  Edit03,
  FilePlus02,
  FilterLines,
  Flag01,
  GraduationHat01,
  Grid01,
  Home03,
  Link01,
  LinkExternal01,
  MagicWand01,
  Mail01,
  MarkerPin01,
  Maximize01,
  MessageSquare,
  Minimize01,
  MoreHorizontal,
  Plus,
  Printer,
  RefreshCcw01,
  Send03,
  Settings01,
  Share01,
  Star,
  Tool02,
  Translate01,
  Trash01,
  User01,
  UserPlus01,
  X,
  XCircle,
} from "@blend-metrics/icons"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Checkbox,
  CircularProgress,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Favorite,
  FavoriteRoot,
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  SliderRoot,
  SliderTrack,
  SliderRange,
  SliderThumb,
  Tooltip,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Textarea,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui"
import { OfferDialog } from "@/components/hire-me-button"

// ---------- mock data ----------

const mockCandidates = [
  {
    id: "nina-1",
    name: "Nina",
    handle: "@dheerajnagdali",
    title: "Technology Sales Consultant",
    experience: 11,
    city: "Sarajevo",
    country: "Taiwan",
    avatar: "/man.jpg",
    matchingSkills: 12,
    totalSkills: 24,
    skills: [
      "Usability Testing",
      "Graphic Design",
      "Adobe Creative Suite",
      "User-centered Design",
      "UX Research",
      "Prototyping",
    ],
    appliedAgo: "6d ago",
    lastMessage: "6hrs ago",
    isNew: true,
    rating: 4.5,
    payRate: "$85/hr",
    successRate: "95%",
    projectsCompleted: 1450,
    repeatHireRate: "85%",
    matchPercent: 92,
    candidateMessage:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    messageReceivedAt: "12:01 AM",
  },
  {
    id: "dheeraj-2",
    name: "Dheeraj",
    handle: "@dheerajnagdali",
    title: "Full Stack Developer",
    experience: 10,
    city: "Portland, Oregon",
    country: "United States",
    avatar: "/man.jpg",
    matchingSkills: 18,
    totalSkills: 24,
    skills: [
      "React",
      "Node.js",
      "TypeScript",
      "GraphQL",
      "AWS",
      "Docker",
    ],
    appliedAgo: "6d ago",
    lastMessage: "6hrs ago",
    isNew: true,
    rating: 4.5,
    payRate: "$85/hr",
    successRate: "95%",
    projectsCompleted: 1450,
    repeatHireRate: "85%",
    matchPercent: 96,
    candidateMessage:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    messageReceivedAt: "12:01 AM",
  },
  {
    id: "pelumi-3",
    name: "Pelumi",
    handle: "@dheerajnagdali",
    title: "Network Security Engineer",
    experience: 7,
    city: "Vatican",
    country: "Singapore",
    avatar: "/man.jpg",
    matchingSkills: 12,
    totalSkills: 24,
    skills: [
      "Sketch App",
      "Usability Testing",
      "User Experience (UX)",
      "Web Design",
      "Axure RP",
      "Graphic Design",
    ],
    appliedAgo: "6d ago",
    lastMessage: "6hrs ago",
    isNew: true,
    rating: 4.6,
    payRate: "$90/hr",
    successRate: "97%",
    projectsCompleted: 890,
    repeatHireRate: "88%",
    matchPercent: 88,
    candidateMessage:
      "I would love to discuss how my experience can help elevate your product.",
    messageReceivedAt: "9:30 AM",
  },
  {
    id: "pelumi-4",
    name: "Pelumi",
    handle: "@dheerajnagdali",
    title: "Support Specialist",
    experience: 3,
    city: "Oslo",
    country: "United Kingdom",
    avatar: "/man.jpg",
    matchingSkills: 12,
    totalSkills: 24,
    skills: [
      "Design Thinking",
      "Design Thinking",
      "User Experience Design (UED)",
      "Information Architecture",
    ],
    appliedAgo: "6d ago",
    lastMessage: "6hrs ago",
    isNew: true,
    rating: 4.3,
    payRate: "$80/hr",
    successRate: "92%",
    projectsCompleted: 650,
    repeatHireRate: "82%",
    matchPercent: 78,
    candidateMessage:
      "My expertise in scalable systems would be a great fit for your project needs.",
    messageReceivedAt: "6:15 PM",
  },
  {
    id: "olu-5",
    name: "Olu",
    handle: "@dheerajnagdali",
    title: "Product Designer",
    experience: 9,
    city: "Amsterdam",
    country: "Netherlands",
    avatar: "/man.jpg",
    matchingSkills: 14,
    totalSkills: 24,
    skills: [
      "Sketch",
      "Figma",
      "Prototyping",
      "Visual Design",
      "Motion Design",
      "Brand Identity",
    ],
    appliedAgo: "6d ago",
    lastMessage: "6hrs ago",
    isNew: false,
    rating: 4.7,
    payRate: "$88/hr",
    successRate: "96%",
    projectsCompleted: 1200,
    repeatHireRate: "87%",
    matchPercent: 85,
    candidateMessage:
      "I bring a holistic approach to product design.",
    messageReceivedAt: "11:20 AM",
  },
  {
    id: "james-6",
    name: "James",
    handle: "@jamesdev",
    title: "Mobile Developer",
    experience: 7,
    city: "Austin",
    country: "United States",
    avatar: "/man.jpg",
    matchingSkills: 16,
    totalSkills: 24,
    skills: [
      "React Native",
      "Swift",
      "Kotlin",
      "Firebase",
      "REST APIs",
      "App Store",
    ],
    appliedAgo: "4d ago",
    lastMessage: "8hrs ago",
    isNew: false,
    rating: 4.4,
    payRate: "$82/hr",
    successRate: "93%",
    projectsCompleted: 780,
    repeatHireRate: "84%",
    matchPercent: 82,
    candidateMessage:
      "I have extensive experience building cross-platform mobile applications that users love.",
    messageReceivedAt: "2:00 PM",
  },
  {
    id: "elena-7",
    name: "Elena",
    handle: "@elenaqa",
    title: "QA Engineer",
    experience: 5,
    city: "Warsaw",
    country: "Poland",
    avatar: "/man.jpg",
    matchingSkills: 8,
    totalSkills: 24,
    skills: [
      "Selenium",
      "Cypress",
      "Jest",
      "API Testing",
      "Performance Testing",
      "Test Planning",
    ],
    appliedAgo: "7d ago",
    lastMessage: "1d ago",
    isNew: false,
    rating: 4.2,
    payRate: "$70/hr",
    successRate: "91%",
    projectsCompleted: 420,
    repeatHireRate: "80%",
    matchPercent: 72,
    candidateMessage:
      "Quality is my passion. I ensure every release meets the highest standards.",
    messageReceivedAt: "4:45 PM",
  },
  {
    id: "carlos-8",
    name: "Carlos",
    handle: "@carlospm",
    title: "Project Manager",
    experience: 12,
    city: "Mexico City",
    country: "Mexico",
    avatar: "/man.jpg",
    matchingSkills: 11,
    totalSkills: 24,
    skills: [
      "Agile",
      "Scrum",
      "Jira",
      "Stakeholder Management",
      "Risk Assessment",
      "Budgeting",
    ],
    appliedAgo: "2d ago",
    lastMessage: "5hrs ago",
    isNew: false,
    rating: 4.9,
    payRate: "$100/hr",
    successRate: "99%",
    projectsCompleted: 3200,
    repeatHireRate: "95%",
    matchPercent: 75,
    candidateMessage:
      "With 12 years of project management experience, I can drive your project to successful completion.",
    messageReceivedAt: "10:00 AM",
  },
]

const roles = [
  { label: "Software Developer", status: "Closed" },
  { label: "UX Architect", status: "5 spots available", active: true },
  { label: "Software Developer", status: "1 spot available" },
  { label: "Marketing Manager", status: "Closed" },
]

const matchScorePresets = [
  { label: "90% and above", min: 90 },
  { label: "80% and above", min: 80 },
  { label: "70% and above", min: 70 },
  { label: "50% and above", min: 50 },
]

const educationOptions = [
  "Bachelor's Degree",
  "Master's Degree",
  "PhD / Doctorate",
  "Associate Degree",
  "Certification / Bootcamp",
  "Self-Taught",
]

const skillOptions = [
  "Visual Design",
  "Wireframing",
  "User Research",
  "Prototyping",
  "Design Systems",
  "Figma",
  "Interaction Design",
  "Information Architecture",
  "Accessibility (WCAG)",
  "HTML/CSS",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Tailwind CSS",
  "Motion Design",
  "Sketch",
  "Adobe XD",
  "Adobe Illustrator",
  "Adobe Photoshop",
  "UI Animation",
  "Responsive Design",
  "Design Thinking",
  "Usability Testing",
  "A/B Testing",
  "Data Visualization",
  "Brand Identity",
  "Typography",
  "Color Theory",
]

const candidateStatusOptions = [
  { label: "All Candidates", value: "all" },
  { label: "Liked", value: "shortlisted" },
  { label: "Interview Scheduled", value: "interview" },
  { label: "Offer Sent", value: "offer" },
  { label: "New Applicants", value: "new" },
]

const sortOptions = [
  { label: "Apply Date (Newest)", value: "recent" },
  { label: "Newest", value: "new" },
  { label: "Favorites", value: "favorites" },
  { label: "Liked", value: "liked" },
  { label: "Disliked", value: "disliked" },
]

const experienceLevels = [
  "Junior (1-3 years)",
  "Mid-Level (3-5 years)",
  "Senior (5-7 years)",
  "Lead (7-10 years)",
  "Principal (10+ years)",
]

const availabilityOptions = [
  "Available Now",
  "Within 1 Week",
  "Within 2 Weeks",
  "Within 1 Month",
]

const languageOptions = [
  "English",
  "Spanish",
  "French",
  "German",
  "Mandarin",
  "Japanese",
  "Portuguese",
  "Arabic",
  "Hindi",
  "Korean",
]

const ratingOptions = [
  { label: "4.5 & above", min: 4.5 },
  { label: "4.0 & above", min: 4.0 },
  { label: "3.5 & above", min: 3.5 },
  { label: "Any rating", min: 0 },
]

type RequirementMatchType = "percent" | "match" | "no-match"

interface RequirementCategoryData {
  label: string
  iconId: string
  matchType: RequirementMatchType
  matchPercent?: number
  requirement?: string
  badges: { text: string; matched: boolean }[]
}

const mockSkillBadges = [
  "Visual Design",
  "Tailwind CSS",
  "Next.js",
  "Blockchain",
  "Visual Design",
  "Tailwind CSS",
  "Next.js",
  "Blockchain",
  "Visual Design",
  "Tailwind CSS",
  "Next.js",
  "Blockchain",
  "Tailwind CSS",
  "Visual Design",
  "Next.js",
]

const jobRequirementColumns: RequirementCategoryData[][] = [
  [
    {
      label: "Job Title",
      iconId: "job-title",
      matchType: "percent",
      matchPercent: 85,
      requirement: "Requirement: UX Architect",
      badges: [{ text: "UX Designer", matched: true }],
    },
    {
      label: "Work Schedule",
      iconId: "work-schedule",
      matchType: "match",
      badges: [{ text: "Full-Time", matched: true }],
    },
    {
      label: "Education",
      iconId: "education",
      matchType: "no-match",
      badges: [{ text: "Bachelor's Degree", matched: false }],
    },
  ],
  [
    {
      label: "Experience",
      iconId: "experience",
      matchType: "match",
      requirement: "Min Requirement: 4 years",
      badges: [{ text: "5+ years", matched: true }],
    },
    {
      label: "Industries",
      iconId: "industries",
      matchType: "percent",
      matchPercent: 50,
      badges: [
        { text: "Information Technology", matched: true },
        { text: "IT Services", matched: false },
      ],
    },
  ],
  [
    {
      label: "Pay Rate",
      iconId: "pay-rate",
      matchType: "no-match",
      badges: [{ text: "$16 - $25/hr", matched: false }],
    },
    {
      label: "Languages",
      iconId: "languages",
      matchType: "match",
      badges: [
        { text: "English", matched: true },
        { text: "Spanish", matched: true },
      ],
    },
    {
      label: "Country",
      iconId: "country",
      matchType: "match",
      requirement: "Requirement: United States",
      badges: [{ text: "United States", matched: true }],
    },
  ],
]

// ---------- page component ----------

export default function JobScreeningPage() {
  const router = useRouter()
  const [selectedCandidateId, setSelectedCandidateId] = useState(
    mockCandidates[0].id
  )
  const [isHeaderSticky, setIsHeaderSticky] = useState(false)
  const [isDetailSticky, setIsDetailSticky] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [selectedRole, setSelectedRole] = useState("UX Architect")
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  const [hireDialogOpen, setHireDialogOpen] = useState(false)

  // Filter state
  const [matchScoreOpen, setMatchScoreOpen] = useState(false)
  const [matchScoreRange, setMatchScoreRange] = useState<[number, number]>([50, 100])
  const [selectedEducation, setSelectedEducation] = useState<Set<string>>(new Set())
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set())
  const [selectedExperience, setSelectedExperience] = useState<Set<string>>(new Set())
  const [selectedAvailability, setSelectedAvailability] = useState<Set<string>>(new Set())
  const [selectedLanguages, setSelectedLanguages] = useState<Set<string>>(new Set())
  const [selectedRating, setSelectedRating] = useState<number>(0)
  const [payRateRange, setPayRateRange] = useState<[number, number]>([0, 300])
  const [candidateStatus, setCandidateStatus] = useState("all")
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [allFiltersOpen, setAllFiltersOpen] = useState(false)
  const [candidateVotes, setCandidateVotes] = useState<Record<string, "like" | "neutral" | "dislike" | null>>({})
  const [candidateSuperLikes, setCandidateSuperLikes] = useState<Set<string>>(new Set())
  const [candidateNotes, setCandidateNotes] = useState<Record<string, string>>({})
  const [notesOpen, setNotesOpen] = useState(false)
  const [sortBy, setSortBy] = useState("recent")

  const activeFilterCount = [
    matchScoreRange[0] > 50 || matchScoreRange[1] < 100,
    selectedEducation.size > 0,
    selectedSkills.size > 0,
    selectedExperience.size > 0,
    selectedAvailability.size > 0,
    selectedLanguages.size > 0,
    selectedRating > 0,
    payRateRange[0] > 0 || payRateRange[1] < 300,
  ].filter(Boolean).length

  const pageScrollRef = useRef<HTMLDivElement>(null)
  const headerSentinelRef = useRef<HTMLDivElement>(null)
  const contentAreaRef = useRef<HTMLDivElement>(null)
  const detailScrollRef = useRef<HTMLDivElement>(null)
  const detailSentinelRef = useRef<HTMLDivElement>(null)

  const selectedCandidate =
    mockCandidates.find((c) => c.id === selectedCandidateId) ??
    mockCandidates[0]

  // Reset detail scroll position when switching candidates with fade transition
  const [detailFade, setDetailFade] = useState(false)
  useEffect(() => {
    setDetailFade(true)
    const timeout = setTimeout(() => {
      const viewport = detailScrollRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement | null
      if (viewport) viewport.scrollTop = 0
      setDetailFade(false)
    }, 150)
    return () => clearTimeout(timeout)
  }, [selectedCandidateId])

  // Page header expand/minimize on scroll
  useEffect(() => {
    const sentinel = headerSentinelRef.current
    const scrollContainer = pageScrollRef.current
    if (!sentinel || !scrollContainer) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsHeaderSticky(!entry.isIntersecting),
      { root: scrollContainer, threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  // Scroll priority: DOWN = page first, then content. UP = content first, then page.
  useEffect(() => {
    const content = contentAreaRef.current
    const page = pageScrollRef.current
    if (!content || !page) return

    const handleWheel = (e: WheelEvent) => {
      const maxScroll = page.scrollHeight - page.clientHeight
      if (maxScroll <= 0) return

      // Scrolling DOWN — page scrolls first to pin header, then content
      if (e.deltaY > 0 && page.scrollTop < maxScroll - 1) {
        e.preventDefault()
        page.scrollTop = Math.min(page.scrollTop + e.deltaY, maxScroll)
        return
      }

      // Scrolling UP — content scrolls first; only scroll page when active content is at very top
      if (e.deltaY < 0 && page.scrollTop > 0) {
        const target = e.target as HTMLElement
        const activeViewport = target.closest("[data-radix-scroll-area-viewport]") as HTMLElement | null
        const isAtTop = !activeViewport || activeViewport.scrollTop <= 0
        if (isAtTop) {
          e.preventDefault()
          page.scrollTop = Math.max(page.scrollTop + e.deltaY, 0)
        }
      }
    }

    // Listen on all scroll viewports inside the content area + the content area itself
    const viewports = content.querySelectorAll("[data-radix-scroll-area-viewport]")
    const targets = [content, ...Array.from(viewports)]
    targets.forEach((el) => el.addEventListener("wheel", handleWheel as EventListener, { passive: false }))
    return () => {
      targets.forEach((el) => el.removeEventListener("wheel", handleWheel as EventListener))
    }
  }, [])

  // Right panel detail header expand/minimize on scroll
  useEffect(() => {
    const sentinel = detailSentinelRef.current
    const container = detailScrollRef.current
    if (!sentinel || !container) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsDetailSticky(!entry.isIntersecting),
      { root: container, threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={pageScrollRef} className="flex h-[calc(100vh-68px)] flex-col overflow-y-auto bg-gray-50">
      {/* Breadcrumb */}
      <div className="mx-auto w-full max-w-[1240px] shrink-0 px-4 py-6 md:px-6 md:py-8">
        <Breadcrumb spacing="0.5rem">
          <BreadcrumbItem>
            <BreadcrumbLink href="/" className="inline-flex items-center">
              <Home03 className="size-3.5" />
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href="/find-jobs">Jobs</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbLink href="/find-jobs">Mobile Application</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink>iOS Development</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
      </div>

      {/* Sentinel for header sticky detection */}
      <div ref={headerSentinelRef} className="h-0 shrink-0" />

      {/* Title bar — scrolls away with the page, visually continuous with container */}
      <div className="mx-[140px] shrink-0 rounded-t-lg border-l border-r border-t border-gray-200 bg-white">
        <div className="flex items-start justify-between p-6">
          {/* Left: title + role dropdown */}
          <div className="flex items-start gap-6">
            <div className="flex flex-col gap-[3px]">
              <h1 className="text-lg font-bold leading-[22px] text-dark-blue-400">
                Marketeq Client Portal
              </h1>
              <p className="text-[13px] font-normal leading-[15px] text-dark-blue-400">
                Posted 20 days ago
              </p>
            </div>
            <Popover open={roleDropdownOpen} onOpenChange={setRoleDropdownOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outlined"
                  visual="gray"
                  size="sm"
                  className="h-9 rounded-[5px] border-gray-300 px-[14px] text-sm font-semibold text-gray-800 shadow-xs"
                >
                  {selectedRole}
                  <ChevronDown className="ml-2 size-[15px] text-gray-500" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[260px] rounded-lg border border-gray-100 bg-white p-1 shadow-lg"
              >
                {roles.map((role, idx) => (
                  <button
                    key={`${role.label}-${idx}`}
                    type="button"
                    onClick={() => {
                      if (role.status !== "Closed") {
                        setSelectedRole(role.label)
                        setRoleDropdownOpen(false)
                      }
                    }}
                    className={`flex w-full flex-col gap-0.5 rounded-md px-3 py-[10px] text-left transition-colors ${
                      role.active
                        ? "bg-gray-50 text-dark-blue-400"
                        : role.status === "Closed"
                          ? "cursor-default text-gray-400"
                          : "text-gray-500 transition-colors duration-300 hover:bg-gray-50 hover:text-dark-blue-400"
                    }`}
                  >
                    <span className="text-[13px] font-medium">
                      {role.label}
                    </span>
                    <span
                      className={`text-[11px] ${
                        role.status === "Closed"
                          ? "text-gray-400"
                          : "text-gray-500"
                      }`}
                    >
                      {role.status}
                    </span>
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3">
              <Button
                size="md"
                className="h-10 rounded-[5px] bg-primary-50 px-4 text-sm font-semibold text-primary-500 transition-colors duration-300 hover:bg-primary-100"
              >
                <MagicWand01 className="size-[15px]" />
                Magic Hire
              </Button>
              <Button
                variant="outlined"
                visual="gray"
                size="md"
                className="h-10 rounded-[5px] border-gray-300 px-4 text-sm font-semibold text-gray-800 shadow-xs"
              >
                <LinkExternal01 className="size-[15px] text-gray-500" />
                View Job Listing
              </Button>
            </div>
            <PageOptionsMenu />
          </div>
        </div>
      </div>

      {/* Main bordered container */}
      <div className="mx-[140px] flex min-h-[calc(100vh-68px)] flex-col border-b border-l border-r border-gray-200 bg-white">
        {/* Filter bar — sticky, pins when title scrolls away */}
        <div className={`sticky top-0 z-20 bg-white ${isHeaderSticky ? "shadow-sm" : ""}`}>
          <div className={`flex items-center justify-between border-gray-200 pl-3 pr-6 py-3 ${isHeaderSticky ? "border-b" : "border-y"}`}>
            <div className="flex items-center gap-[14px]">
              {/* All Candidates / status filter */}
              <Popover open={statusDropdownOpen} onOpenChange={setStatusDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outlined" visual="gray" size="sm" className={`group h-9 rounded-[5px] px-[10px] text-sm font-semibold shadow-xs transition-all duration-300 data-[state=open]:border-dashed data-[state=open]:border-gray-300 data-[state=open]:bg-gray-100 data-[state=open]:text-gray-500 ${candidateStatus !== "all" ? "border-primary-500 text-primary-500" : "border-gray-300 text-gray-800"}`}>
                    {candidateStatusOptions.find((o) => o.value === candidateStatus)?.label ?? "All Candidates"}
                    <Badge size="sm" className={`ml-1 rounded-full px-1.5 text-xs font-medium group-data-[state=open]:bg-gray-200 group-data-[state=open]:text-gray-500 ${candidateStatus !== "all" ? "bg-primary-50 text-primary-500" : "bg-gray-100 text-gray-500"}`}>50</Badge>
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[220px] rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                  {candidateStatusOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setCandidateStatus(opt.value); setStatusDropdownOpen(false) }}
                      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors duration-300 ${candidateStatus === opt.value ? "bg-primary-50 font-medium text-primary-500" : "text-gray-700 hover:bg-gray-50"}`}
                    >
                      {candidateStatus === opt.value && <Check className="size-3.5 text-primary-500" />}
                      {opt.label}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>

              {/* Match Score filter */}
              <Popover open={matchScoreOpen} onOpenChange={setMatchScoreOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outlined" visual="gray" size="sm" className={`group h-9 rounded-[5px] px-[10px] text-sm font-semibold shadow-xs transition-all duration-300 data-[state=open]:border-dashed data-[state=open]:border-gray-300 data-[state=open]:bg-gray-100 data-[state=open]:text-gray-500 ${matchScoreRange[0] > 50 || matchScoreRange[1] < 100 ? "border-primary-500 text-primary-500" : "border-gray-300 text-gray-800"}`}>
                    Match Score
                    {(matchScoreRange[0] > 50 || matchScoreRange[1] < 100) ? (
                      <Badge size="sm" className="ml-1 rounded-full bg-primary-50 px-1.5 text-xs font-medium text-primary-500 group-data-[state=open]:bg-gray-200 group-data-[state=open]:text-gray-500">
                        {matchScoreRange[1] === 100 ? `${matchScoreRange[0]}%+` : `${matchScoreRange[0]}-${matchScoreRange[1]}%`}
                      </Badge>
                    ) : (
                      <ChevronDown className="ml-1 size-[15px] text-gray-500" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[280px] rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-dark-blue-400">Match Score Range</span>
                      <button onClick={() => setMatchScoreRange([50, 100])} className="text-xs font-medium text-gray-500 hover:text-primary-500">Reset</button>
                    </div>
                    <SliderRoot value={matchScoreRange} onValueChange={(v) => setMatchScoreRange(v as [number, number])} min={50} max={100} step={5} className="w-full">
                      <SliderTrack>
                        <SliderRange />
                      </SliderTrack>
                      <SliderThumb />
                      <SliderThumb />
                    </SliderRoot>
                    <div className="flex items-center justify-between text-xs font-medium text-gray-500">
                      <span>{matchScoreRange[0]}%</span>
                      <span>{matchScoreRange[1]}%</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {matchScorePresets.map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => { setMatchScoreRange([preset.min, 100]); setMatchScoreOpen(false) }}
                          className={`rounded-md px-3 py-2 text-left text-sm transition-colors duration-300 ${matchScoreRange[0] === preset.min && matchScoreRange[1] === 100 ? "bg-primary-50 font-medium text-primary-500" : "text-gray-700 hover:bg-gray-50"}`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Skills filter */}
              <FilterCheckboxDropdown
                label="Skills"
                options={skillOptions}
                selected={selectedSkills}
                onToggle={(val) => {
                  setSelectedSkills((prev) => {
                    const next = new Set(prev)
                    next.has(val) ? next.delete(val) : next.add(val)
                    return next
                  })
                }}
                onClear={() => setSelectedSkills(new Set())}
              />

              {/* Education filter */}
              <FilterCheckboxDropdown
                label="Education"
                options={educationOptions}
                selected={selectedEducation}
                onToggle={(val) => {
                  setSelectedEducation((prev) => {
                    const next = new Set(prev)
                    next.has(val) ? next.delete(val) : next.add(val)
                    return next
                  })
                }}
                onClear={() => setSelectedEducation(new Set())}
              />

              {/* All Filters */}
              <Popover open={allFiltersOpen} onOpenChange={setAllFiltersOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outlined" visual="gray" size="sm" className={`group h-9 rounded-[5px] px-[10px] text-sm font-semibold shadow-xs transition-all duration-300 data-[state=open]:border-dashed data-[state=open]:border-gray-300 data-[state=open]:bg-gray-100 data-[state=open]:text-gray-500 ${activeFilterCount > 0 ? "border-primary-500 text-primary-500" : "border-gray-300 text-gray-800"}`}>
                    {activeFilterCount > 0 ? (
                      <>
                        All Filters
                        <Badge size="sm" className="ml-1 rounded-full bg-primary-50 px-1.5 text-xs font-medium text-primary-500 group-data-[state=open]:bg-gray-200 group-data-[state=open]:text-gray-500">{activeFilterCount}</Badge>
                      </>
                    ) : (
                      <>
                        <FilterLines className="mr-1 size-[15px]" />
                        All Filters
                      </>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[360px] rounded-lg border border-gray-200 bg-white p-0 shadow-lg">
                  <ScrollArea className="h-[420px]">
                    <div className="flex flex-col">
                      {/* Experience Level */}
                      <FilterSection title="Experience Level">
                        {experienceLevels.map((lvl) => (
                          <label key={lvl} className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-1.5 hover:bg-gray-50">
                            <Checkbox
                              size="sm"
                              checked={selectedExperience.has(lvl)}
                              onCheckedChange={() => {
                                setSelectedExperience((prev) => {
                                  const next = new Set(prev)
                                  next.has(lvl) ? next.delete(lvl) : next.add(lvl)
                                  return next
                                })
                              }}
                            />
                            <span className="text-sm text-gray-700">{lvl}</span>
                          </label>
                        ))}
                      </FilterSection>

                      {/* Pay Rate */}
                      <FilterSection title="Pay Rate">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between text-sm font-medium text-dark-blue-400">
                            <span>${payRateRange[0]}/hr</span>
                            <span>${payRateRange[1]}/hr</span>
                          </div>
                          <SliderRoot value={payRateRange} onValueChange={(v) => setPayRateRange(v as [number, number])} min={0} max={300} step={5} className="w-full">
                            <SliderTrack>
                              <SliderRange />
                            </SliderTrack>
                            <SliderThumb />
                            <SliderThumb />
                          </SliderRoot>
                          {(payRateRange[0] > 0 || payRateRange[1] < 300) && (
                            <button onClick={() => setPayRateRange([0, 300])} className="self-end text-xs font-medium text-gray-500 hover:text-primary-500">Reset</button>
                          )}
                        </div>
                      </FilterSection>

                      {/* Availability */}
                      <FilterSection title="Availability">
                        {availabilityOptions.map((opt) => (
                          <label key={opt} className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-1.5 hover:bg-gray-50">
                            <Checkbox
                              size="sm"
                              checked={selectedAvailability.has(opt)}
                              onCheckedChange={() => {
                                setSelectedAvailability((prev) => {
                                  const next = new Set(prev)
                                  next.has(opt) ? next.delete(opt) : next.add(opt)
                                  return next
                                })
                              }}
                            />
                            <span className="text-sm text-gray-700">{opt}</span>
                          </label>
                        ))}
                      </FilterSection>

                      {/* Languages */}
                      <FilterSection title="Languages">
                        {languageOptions.map((lang) => (
                          <label key={lang} className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-1.5 hover:bg-gray-50">
                            <Checkbox
                              size="sm"
                              checked={selectedLanguages.has(lang)}
                              onCheckedChange={() => {
                                setSelectedLanguages((prev) => {
                                  const next = new Set(prev)
                                  next.has(lang) ? next.delete(lang) : next.add(lang)
                                  return next
                                })
                              }}
                            />
                            <span className="text-sm text-gray-700">{lang}</span>
                          </label>
                        ))}
                      </FilterSection>

                      {/* Rating */}
                      <FilterSection title="Rating">
                        {ratingOptions.map((opt) => (
                          <label key={opt.label} className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-1.5 hover:bg-gray-50">
                            <Checkbox
                              size="sm"
                              checked={selectedRating === opt.min}
                              onCheckedChange={() => setSelectedRating(selectedRating === opt.min ? 0 : opt.min)}
                            />
                            {opt.min > 0 && <Star className="size-3.5 fill-primary-500 text-primary-500" />}
                            <span className="text-sm text-gray-700">{opt.label}</span>
                          </label>
                        ))}
                      </FilterSection>
                    </div>
                  </ScrollArea>
                  {/* Footer */}
                  <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
                    <button
                      onClick={() => {
                        setMatchScoreRange([50, 100])
                        setSelectedEducation(new Set())
                        setSelectedSkills(new Set())
                        setSelectedExperience(new Set())
                        setSelectedAvailability(new Set())
                        setSelectedLanguages(new Set())
                        setSelectedRating(0)
                        setPayRateRange([0, 300])
                      }}
                      className="text-sm font-medium text-gray-500 hover:text-gray-700"
                    >
                      Clear all
                    </button>
                    <Button size="sm" disabled={activeFilterCount === 0} onClick={() => activeFilterCount > 0 && setAllFiltersOpen(false)} className="h-9 rounded-[5px] px-4 text-sm font-semibold">
                      Apply Filters
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              {activeFilterCount > 0 && (
                <button
                  onClick={() => {
                    setMatchScoreRange([50, 100])
                    setSelectedEducation(new Set())
                    setSelectedSkills(new Set())
                    setSelectedExperience(new Set())
                    setSelectedAvailability(new Set())
                    setSelectedLanguages(new Set())
                    setSelectedRating(0)
                    setPayRateRange([0, 300])
                  }}
                  className="text-sm font-medium text-gray-500 transition-colors duration-300 hover:text-primary-500"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Sticky: show action buttons inline */}
              {isHeaderSticky && (
                <div className="mr-2 flex items-center gap-3">
                  <Button
                    size="md"
                    className="h-10 rounded-[5px] bg-primary-50 px-4 text-sm font-semibold text-primary-500 transition-colors duration-300 hover:bg-primary-100"
                  >
                    <MagicWand01 className="size-[15px]" />
                    Magic Hire
                  </Button>
                  <Button
                    variant="outlined"
                    visual="gray"
                    size="md"
                    className="h-10 rounded-[5px] border-gray-300 px-4 text-sm font-semibold text-gray-800 shadow-xs"
                  >
                    <LinkExternal01 className="size-[15px] text-gray-500" />
                    View Job Listing
                  </Button>
                  <PageOptionsMenu />
                </div>
              )}
              {!isHeaderSticky && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-[5px] px-[14px] py-2 text-sm font-semibold text-gray-500 transition-colors duration-300 hover:text-dark-blue-400">
                      {sortOptions.find((o) => o.value === sortBy)?.label ?? "Recent Activity"}
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M14 3.99984H8.66667M4 13.3332L4 2.6665M6 11.3332L4 13.3332L2 11.3332M12.9333 6.84428H8.66667M10.0889 9.68873H8.66667"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[180px] rounded-lg border-gray-100 px-0 py-1 shadow-[0px_12px_16px_-4px_rgba(16,24,40,0.08)]">
                    {sortOptions.map((opt) => (
                      <DropdownMenuItem
                        key={opt.value}
                        onClick={() => setSortBy(opt.value)}
                        className={`flex items-center justify-between px-3 py-[10px] text-[13px] leading-[13px] font-medium capitalize ${sortBy === opt.value ? "text-primary-500" : "text-gray-500"}`}
                      >
                        {opt.label}
                        {sortBy === opt.value && <Check className="size-3.5 text-primary-500" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>

        {/* Main content: left list + right detail OR full-width list */}
        <div ref={contentAreaRef} className="flex flex-1 overflow-hidden">
          {/* Left: Candidate list (slides out when minimized) */}
          <div className={`shrink-0 overflow-hidden border-r border-gray-200 transition-all duration-300 ease-in-out ${isMinimized ? "w-0 border-r-0 opacity-0" : "w-[424px] opacity-100"}`}>
            <ScrollArea className="h-full w-[424px]">
              <div className="flex flex-col">
                {mockCandidates.map((candidate) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    isSelected={candidate.id === selectedCandidateId}
                    onClick={() => setSelectedCandidateId(candidate.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Full-width list view (fades in when minimized) */}
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isMinimized ? "flex-1 opacity-100" : "w-0 flex-none opacity-0"}`}>
            <ScrollArea className="h-full">
              <div className="flex flex-col">
                {mockCandidates.map((candidate) => (
                  <FullWidthCandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    isSelected={candidate.id === selectedCandidateId}
                    onClick={() => setSelectedCandidateId(candidate.id)}
                    onToggleMinimize={() => setIsMinimized(false)}
                    onHire={() => setHireDialogOpen(true)}
                    vote={candidateVotes[candidate.id] ?? null}
                    onVote={(v) => {
                      setCandidateVotes((prev) => ({ ...prev, [candidate.id]: v }))
                      if (v !== "like") {
                        setCandidateSuperLikes((prev) => {
                          const next = new Set(prev)
                          next.delete(candidate.id)
                          return next
                        })
                      }
                    }}
                    superLiked={candidateSuperLikes.has(candidate.id)}
                    onSuperLike={() => {
                      setCandidateSuperLikes((prev) => {
                        const next = new Set(prev)
                        const wasSuper = next.has(candidate.id)
                        wasSuper ? next.delete(candidate.id) : next.add(candidate.id)
                        if (!wasSuper) {
                          setCandidateVotes((prev) => ({ ...prev, [candidate.id]: "like" }))
                        }
                        return next
                      })
                    }}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Candidate detail (slides out when minimized) */}
          <div className={`relative flex min-w-0 flex-col transition-all duration-300 ease-in-out ${isMinimized ? "w-0 flex-none overflow-hidden opacity-0" : "flex-1 opacity-100"}`}>
            <ScrollArea ref={detailScrollRef} className={`flex-1 transition-opacity duration-150 ${detailFade ? "opacity-0" : "opacity-100"}`}>
              <div className="p-6">
                {/* Sentinel for detail sticky detection */}
                <div ref={detailSentinelRef} className="h-0" />

                {/* Unified detail header — stays sticky, extra rows collapse seamlessly */}
                <div className={`sticky -top-px z-10 -mx-6 border-b border-gray-200 bg-white px-6 ${isDetailSticky ? "pb-6 pt-6" : "pb-5"}`}>
                  <div className="flex flex-col gap-5">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <span className="text-xl font-bold text-dark-blue-400">
                              {selectedCandidate.name}
                            </span>
                            <span className="text-base font-light text-dark-blue-400">
                              {selectedCandidate.handle}
                            </span>
                          </div>
                          <div className="flex items-center gap-[4.8px]">
                            <Star className="size-[14.4px] fill-primary-500 text-primary-500" />
                            <span className="text-sm font-medium text-dark-blue-400">
                              {selectedCandidate.rating}
                            </span>
                          </div>
                        </div>
                        {/* Extra rows — collapse when pinned */}
                        <div className={`overflow-hidden transition-all duration-200 ease-in-out ${isDetailSticky ? "max-h-0 opacity-0" : "max-h-24 opacity-100"}`}>
                          <p className="text-sm font-semibold text-dark-blue-400">
                            {selectedCandidate.title}
                          </p>
                          <p className="text-sm font-light text-dark-blue-400">
                            {selectedCandidate.experience} years of experience
                          </p>
                          <div className="flex items-center gap-1 text-sm font-light text-dark-blue-400">
                            <MarkerPin01 className="size-[17px] shrink-0 text-dark-blue-400" />
                            {selectedCandidate.city}, {selectedCandidate.country}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outlined"
                          visual="gray"
                          size="md"
                          className="h-10 rounded-[5px] border-gray-300 px-4 text-sm font-semibold text-gray-800 shadow-xs"
                        >
                          <MessageSquare className="size-[15px]" />
                          Message
                        </Button>
                        <Button size="md" className="h-10 rounded-[5px] px-4" onClick={() => setHireDialogOpen(true)}>
                          <Plus className="size-[15px]" />
                          Hire
                        </Button>
                        <CandidateDropdownIconButton />
                      </div>
                    </div>
                    <DetailActionBar
                      candidate={selectedCandidate}
                      onToggleMinimize={() => setIsMinimized(!isMinimized)}
                      isMinimized={isMinimized}
                      vote={candidateVotes[selectedCandidate.id] ?? null}
                      onVote={(v) => {
                        setCandidateVotes((prev) => ({ ...prev, [selectedCandidate.id]: v }))
                        if (v !== "like") {
                          setCandidateSuperLikes((prev) => {
                            const next = new Set(prev)
                            next.delete(selectedCandidate.id)
                            return next
                          })
                        }
                      }}
                      superLiked={candidateSuperLikes.has(selectedCandidate.id)}
                      onSuperLike={() => {
                        setCandidateSuperLikes((prev) => {
                          const next = new Set(prev)
                          const wasSuper = next.has(selectedCandidate.id)
                          wasSuper ? next.delete(selectedCandidate.id) : next.add(selectedCandidate.id)
                          if (!wasSuper) {
                            setCandidateVotes((prev) => ({ ...prev, [selectedCandidate.id]: "like" }))
                          }
                          return next
                        })
                      }}
                      note={candidateNotes[selectedCandidate.id] ?? ""}
                      onNoteChange={(v) => setCandidateNotes((prev) => ({ ...prev, [selectedCandidate.id]: v }))}
                      notesOpen={notesOpen}
                      onNotesOpenChange={setNotesOpen}
                    />
                  </div>
                </div>

                {/* Stats row — full-width border */}
                <div className="-mx-6 grid grid-cols-4 gap-6 border-b border-gray-200 px-6 py-6">
                  <StatItem label="Pay Rate" value={selectedCandidate.payRate} />
                  <StatItem
                    label="Client Success Rating"
                    value={selectedCandidate.successRate}
                  />
                  <StatItem
                    label="Total Projects Completed"
                    value={String(selectedCandidate.projectsCompleted)}
                  />
                  <StatItem
                    label="Repeat Hire Rate"
                    value={selectedCandidate.repeatHireRate}
                  />
                </div>

                {/* Message from candidate */}
                <div className="border-b border-gray-200 py-6">
                  <div className="rounded-lg bg-[#f0f4ff] p-5">
                    <p className="text-sm font-bold text-dark-blue-400">
                      Message from the candidate
                    </p>
                    <p className="mt-2 text-sm font-normal text-dark-blue-400">
                      {selectedCandidate.candidateMessage}
                    </p>
                  </div>
                  <p className="mt-3 text-xs text-dark-blue-400">
                    <span className="font-normal">Received</span>{" "}
                    <span className="font-semibold">
                      {selectedCandidate.messageReceivedAt}
                    </span>
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="size-10 shrink-0">
                        <AvatarImage
                          src={selectedCandidate.avatar}
                          alt="You"
                        />
                        <AvatarFallback>Y</AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 left-7 size-3 rounded-full border-2 border-white bg-success-500" />
                    </div>
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 pr-10 text-sm text-dark-blue-400 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none"
                      />
                      <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-500">
                        <Send03 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Job Requirements */}
                <div className="flex flex-col gap-6 py-6">
                  <h2 className="text-[18px] font-semibold leading-[21px] text-dark-blue-400">
                    Job Requirements
                  </h2>
                  <div className="flex flex-col gap-8">
                    {/* Skills row */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-[10px]">
                        <div className="flex items-center gap-2">
                          <ReqCategoryIcon id="skills" />
                          <span className="text-[14px] font-bold leading-[17px] text-dark-blue-400">
                            Skills
                          </span>
                        </div>
                        <div className="flex items-center gap-[10px]">
                          <CircularProgress
                            size={20}
                            strokeWidth={2.73}
                            value={40}
                            className="shrink-0 text-primary-500"
                            trackClassName="stroke-gray-100"
                          />
                          <span className="whitespace-nowrap text-[12px] font-medium leading-[15px] text-dark-blue-400">
                            40% match
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {mockSkillBadges.map((skill, i) => (
                          <span
                            key={`skill-badge-${i}`}
                            className="flex items-center gap-1 rounded-full bg-gray-100 px-[7px] py-1"
                          >
                            <Check className="size-[15px] shrink-0 text-primary-500" />
                            <span className="whitespace-nowrap text-[12px] font-medium leading-[15px] text-gray-700">
                              {skill}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 3-column categories */}
                    <div className="flex gap-8">
                      {jobRequirementColumns.map((column, colIdx) => (
                        <div
                          key={`req-col-${colIdx}`}
                          className="flex w-[200.67px] flex-col gap-8"
                        >
                          {column.map((cat) => (
                            <RequirementCategory
                              key={cat.label}
                              category={cat}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Dheeraj's Profile */}
                <div className="flex flex-col gap-[26px]">
                  <h2 className="text-[20px] font-bold leading-[24px] text-dark-blue-400">
                    {selectedCandidate.name}&apos;s Profile
                  </h2>

                  {/* Portfolio images */}
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-5">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={`portfolio-${i}`}
                          className="flex-1 overflow-hidden rounded-lg border border-gray-200"
                        >
                          <div className="h-[144px] w-full bg-gradient-to-br from-blue-900 via-purple-600 to-pink-500" />
                        </div>
                      ))}
                    </div>
                    {/* View More divider */}
                    <div className="flex items-center gap-1">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="text-[12px] font-semibold leading-[20px] text-gray-500">
                        View More
                      </span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>
                  </div>

                  {/* Featured Clients + Certifications */}
                  <div className="flex flex-col gap-8">
                    {/* Featured Clients */}
                    <div className="flex flex-col gap-3">
                      <span className="text-[14px] font-bold leading-[17px] text-dark-blue-400">
                        Featured Clients
                      </span>
                      <div className="flex flex-wrap items-center gap-6">
                        {["Dropbox", "Microsoft", "Adobe", "Nasdaq"].map(
                          (client) => (
                            <span
                              key={client}
                              className="flex items-center gap-[6px] text-[14px] font-semibold text-dark-blue-400"
                            >
                              <span className="text-[16px]">
                                {client === "Dropbox" && "⬡"}
                                {client === "Microsoft" && "⊞"}
                                {client === "Adobe" && "A"}
                                {client === "Nasdaq" && "N"}
                              </span>
                              {client}
                            </span>
                          )
                        )}
                      </div>
                    </div>

                    {/* Certifications */}
                    <div className="flex flex-col gap-3">
                      <span className="text-[14px] font-bold leading-[17px] text-dark-blue-400">
                        Certifications
                      </span>
                      <div className="flex flex-wrap items-center gap-6">
                        {[
                          {
                            name: "Adobe Certified Professional",
                            color: "#E6001F",
                          },
                          {
                            name: "Google UX Design Certificate",
                            color: "#4285F4",
                          },
                          {
                            name: "Certified Wordpress Developer",
                            color: "#028CB0",
                          },
                        ].map((cert) => (
                          <div
                            key={cert.name}
                            className="flex items-center gap-[6px] rounded-[3px]"
                          >
                            <div
                              className="flex size-7 items-center justify-center rounded-[3px] text-[10px] font-bold text-white"
                              style={{ backgroundColor: cert.color }}
                            >
                              {cert.name.charAt(0)}
                            </div>
                            <span className="text-[14px] font-medium leading-[17px] text-dark-blue-400">
                              {cert.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Work Experience */}
                  <div className="flex flex-col gap-[7px]">
                    <div className="flex flex-col gap-3">
                      <span className="text-[14px] font-bold leading-[17px] text-dark-blue-400">
                        Work Experience
                      </span>
                      <div className="flex gap-5">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={`work-${i}`}
                            className="flex flex-1 flex-col justify-center rounded-lg border border-gray-200 p-6 shadow-[0px_1px_5px_rgba(16,24,40,0.02)]"
                          >
                            <div className="flex flex-col gap-2">
                              <span className="text-[14px] font-semibold leading-[20px] text-dark-blue-400">
                                Service Advisor
                              </span>
                              <span className="text-[12px] font-normal leading-[15px] text-dark-blue-400">
                                3 yrs, 2 mo
                              </span>
                              <span className="text-[12px] font-normal leading-[15px] text-dark-blue-400">
                                Pacific Motorsports
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <span className="text-[12px] font-semibold leading-[20px] text-gray-500">
                      View More
                    </span>
                  </div>

                  {/* Education */}
                  <div className="flex flex-col gap-[7px]">
                    <div className="flex flex-col gap-3">
                      <span className="text-[14px] font-bold leading-[17px] text-dark-blue-400">
                        Education
                      </span>
                      <div className="flex gap-5">
                        <div className="flex flex-1 flex-col justify-center rounded-lg border border-gray-200 p-6 shadow-[0px_1px_5px_rgba(16,24,40,0.02)]">
                          <div className="flex flex-col gap-2">
                            <span className="text-[14px] font-semibold leading-[20px] text-dark-blue-400">
                              Master&apos;s of Science
                            </span>
                            <span className="text-[12px] font-normal leading-[15px] text-dark-blue-400">
                              Business Management
                            </span>
                            <span className="text-[12px] font-normal leading-[15px] text-dark-blue-400">
                              2013 - 2015
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-1 flex-col justify-center rounded-lg border border-gray-200 p-6 shadow-[0px_1px_5px_rgba(16,24,40,0.02)]">
                          <div className="flex flex-col gap-2">
                            <span className="text-[14px] font-semibold leading-[20px] text-dark-blue-400">
                              Bachelor&apos;s of Science
                            </span>
                            <span className="text-[12px] font-normal leading-[15px] text-dark-blue-400">
                              Computer Science
                            </span>
                            <span className="text-[12px] font-normal leading-[15px] text-dark-blue-400">
                              2013 - 2015
                            </span>
                          </div>
                        </div>
                        {/* Invisible 3rd card placeholder for consistent sizing */}
                        <div className="flex-1 opacity-0" />
                      </div>
                    </div>
                  </div>

                  {/* Project History */}
                  <div className="rounded-lg border border-gray-200 p-6 shadow-[0px_1px_5px_rgba(16,24,40,0.02)]">
                    <div className="flex items-start justify-between gap-[50px]">
                      {/* Left: title + rating */}
                      <div className="flex flex-col gap-[6px]">
                        <span className="text-[20px] font-bold leading-[24px] text-dark-blue-400">
                          Project History
                        </span>
                        <div className="flex items-start gap-[6px]">
                          <span className="text-[14px] font-medium leading-[17px] tracking-[-1px] text-dark-blue-400">
                            4.9
                          </span>
                          <div className="flex items-start gap-[2px]">
                            {[1, 2, 3, 4].map((s) => (
                              <Star
                                key={`star-filled-${s}`}
                                className="size-[18px] fill-primary-500 text-primary-500"
                              />
                            ))}
                            <Star className="size-[18px] fill-primary-500/30 text-primary-500" />
                          </div>
                        </div>
                        <span className="text-[12px] font-normal leading-[24px] text-dark-blue-400 underline">
                          23 ratings
                        </span>
                      </div>

                      {/* Center: rating bars */}
                      <div className="flex min-w-[200px] flex-col gap-3">
                        {[
                          { level: 5, percent: 80, count: 53 },
                          { level: 4, percent: 10, count: 42 },
                          { level: 3, percent: 10, count: 12 },
                          { level: 2, percent: 0, count: 0 },
                          { level: 1, percent: 0, count: 0 },
                        ].map((bar) => (
                          <div
                            key={`bar-${bar.level}`}
                            className="flex items-center gap-2"
                          >
                            <span className="w-2 text-[12px] font-normal text-dark-blue-400">
                              {bar.level}
                            </span>
                            <div className="relative h-2 flex-1 rounded-full bg-gray-100">
                              {bar.percent > 0 && (
                                <div
                                  className="absolute left-0 top-0 h-2 rounded-full bg-primary-500"
                                  style={{ width: `${bar.percent}%` }}
                                />
                              )}
                            </div>
                            <span className="w-[53px] text-[12px] font-normal text-dark-blue-400">
                              {bar.percent}% ({bar.count})
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Right: category ratings */}
                      <div className="flex flex-col gap-[6px]">
                        {[
                          { label: "Communication Level", score: 4.3 },
                          { label: "Responsiveness", score: 4.5 },
                          { label: "Quality of Delivery", score: 4.8 },
                          { label: "Value of Delivery", score: 4.9 },
                          { label: "Money on the Table", score: 4.7 },
                        ].map((cat) => (
                          <div
                            key={cat.label}
                            className="flex items-center justify-between gap-[53px]"
                          >
                            <span className="text-[12px] font-semibold leading-[20px] text-gray-500 underline">
                              {cat.label}
                            </span>
                            <div className="flex items-center gap-1 rounded shadow-[0px_0.75px_1.5px_rgba(16,24,40,0.05)]">
                              <Star className="size-[15px] fill-primary-500 text-primary-500" />
                              <span className="text-[14px] font-medium leading-[17px] text-dark-blue-400">
                                {cat.score}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Hire dialog */}
      <OfferDialog
        open={hireDialogOpen}
        onOpenChange={setHireDialogOpen}
        profile={null}
      />

      {/* Floating Notes Panel */}
      {notesOpen && selectedCandidate && (
        <FloatingNotesPanel
          value={candidateNotes[selectedCandidate.id] ?? ""}
          onChange={(v) => setCandidateNotes((prev) => ({ ...prev, [selectedCandidate.id]: v }))}
          onClose={() => setNotesOpen(false)}
        />
      )}
    </div>
  )
}

// ---------- filter sub-components ----------

function FilterCheckboxDropdown({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string
  options: string[]
  selected: Set<string>
  onToggle: (value: string) => void
  onClear: () => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outlined"
          visual="gray"
          size="sm"
          className={`group h-9 rounded-[5px] px-[10px] text-sm font-semibold shadow-xs transition-all duration-300 data-[state=open]:border-dashed data-[state=open]:border-gray-300 data-[state=open]:bg-gray-100 data-[state=open]:text-gray-500 ${selected.size > 0 ? "border-primary-500 text-primary-500" : "border-gray-300 text-gray-800"}`}
        >
          {label}
          {selected.size > 0 ? (
            <Badge size="sm" className="ml-1 rounded-full bg-primary-50 px-1.5 text-xs font-medium text-primary-500 group-data-[state=open]:bg-gray-200 group-data-[state=open]:text-gray-500">
              {selected.size}
            </Badge>
          ) : (
            <ChevronDown className="ml-1 size-[15px] text-gray-500" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[240px] rounded-lg border border-gray-200 bg-white p-0 shadow-lg">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <span className="text-sm font-semibold text-dark-blue-400">{label}</span>
          {selected.size > 0 && (
            <button onClick={onClear} className="text-xs font-medium text-gray-500 hover:text-primary-500">Clear</button>
          )}
        </div>
        <div className="max-h-[280px] overflow-y-auto">
          <div className="flex flex-col gap-0.5 p-3">
            {options.map((opt) => (
              <label key={opt} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-gray-50">
                <Checkbox
                  size="sm"
                  checked={selected.has(opt)}
                  onCheckedChange={() => onToggle(opt)}
                />
                <span className="text-sm text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-100 px-4 py-4">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</span>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  )
}

function FloatingNotesPanel({
  value,
  onChange,
  onClose,
}: {
  value: string
  onChange: (v: string) => void
  onClose: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: window.innerWidth - 450, y: window.innerHeight - 300 })
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  const snapToCorner = (x: number, y: number) => {
    const w = 426
    const h = 264
    const pad = 16
    const centerX = (window.innerWidth - w) / 2
    const centerY = (window.innerHeight - h) / 2
    const left = pad
    const right = window.innerWidth - w - pad
    const top = pad
    const bottom = window.innerHeight - h - pad

    // 8 snap targets: 4 corners + 4 edge midpoints
    const targets = [
      { x: left, y: top },           // top-left
      { x: centerX, y: top },        // top-center
      { x: right, y: top },          // top-right
      { x: left, y: centerY },       // middle-left
      { x: right, y: centerY },      // middle-right
      { x: left, y: bottom },        // bottom-left
      { x: centerX, y: bottom },     // bottom-center
      { x: right, y: bottom },       // bottom-right
    ]

    let closest = targets[0]
    let minDist = Infinity
    for (const t of targets) {
      const d = (t.x - x) ** 2 + (t.y - y) ** 2
      if (d < minDist) { minDist = d; closest = t }
    }
    return closest
  }

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    e.preventDefault()
  }

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y })
    }
    const onMouseUp = (e: MouseEvent) => {
      if (!dragging.current) return
      dragging.current = false
      setPos(snapToCorner(e.clientX - dragOffset.current.x, e.clientY - dragOffset.current.y))
    }
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [])

  return (
    <div
      ref={panelRef}
      className="fixed z-50 flex w-[426px] flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-[0px_24px_48px_-12px_rgba(16,24,40,0.18)]"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Top drag handle */}
      <div
        className="absolute left-1/2 top-[10px] -translate-x-1/2 cursor-grab opacity-50 transition-opacity duration-300 hover:opacity-100 active:cursor-grabbing"
        onMouseDown={onMouseDown}
      >
        <svg width="33" height="8" viewBox="0 0 33 8" fill="none"><g><path d="M0.342 2.2C0.123 1.981 0 1.684 0 1.375C0 1.066 0.123 0.769 0.342 0.55C0.561 0.331 0.857 0.208 1.167 0.208C1.476 0.208 1.773 0.331 1.992 0.55C2.211 0.769 2.334 1.066 2.334 1.375C2.334 1.684 2.211 1.981 1.992 2.2C1.773 2.419 1.476 2.542 1.167 2.542C0.857 2.542 0.561 2.419 0.342 2.2Z" fill="#667085"/><path d="M0.342 7.45C0.123 7.231 0 6.934 0 6.625C0 6.316 0.123 6.019 0.342 5.8C0.561 5.581 0.857 5.458 1.167 5.458C1.476 5.458 1.773 5.581 1.992 5.8C2.211 6.019 2.334 6.316 2.334 6.625C2.334 6.934 2.211 7.231 1.992 7.45C1.773 7.669 1.476 7.792 1.167 7.792C0.857 7.792 0.561 7.669 0.342 7.45Z" fill="#667085"/><path d="M4.675 2.2C4.456 1.981 4.333 1.684 4.333 1.375C4.333 1.066 4.456 0.769 4.675 0.55C4.894 0.331 5.19 0.208 5.5 0.208C5.809 0.208 6.106 0.331 6.325 0.55C6.544 0.769 6.667 1.066 6.667 1.375C6.667 1.684 6.544 1.981 6.325 2.2C6.106 2.419 5.809 2.542 5.5 2.542C5.19 2.542 4.894 2.419 4.675 2.2Z" fill="#667085"/><path d="M4.675 7.45C4.456 7.231 4.333 6.934 4.333 6.625C4.333 6.316 4.456 6.019 4.675 5.8C4.894 5.581 5.19 5.458 5.5 5.458C5.809 5.458 6.106 5.581 6.325 5.8C6.544 6.019 6.667 6.316 6.667 6.625C6.667 6.934 6.544 7.231 6.325 7.45C6.106 7.669 5.809 7.792 5.5 7.792C5.19 7.792 4.894 7.669 4.675 7.45Z" fill="#667085"/><path d="M9.008 2.2C8.79 1.981 8.667 1.684 8.667 1.375C8.667 1.066 8.79 0.769 9.008 0.55C9.227 0.331 9.524 0.208 9.833 0.208C10.143 0.208 10.44 0.331 10.658 0.55C10.877 0.769 11 1.066 11 1.375C11 1.684 10.877 1.981 10.658 2.2C10.44 2.419 10.143 2.542 9.833 2.542C9.524 2.542 9.227 2.419 9.008 2.2Z" fill="#667085"/><path d="M9.008 7.45C8.79 7.231 8.667 6.934 8.667 6.625C8.667 6.316 8.79 6.019 9.008 5.8C9.227 5.581 9.524 5.458 9.833 5.458C10.143 5.458 10.44 5.581 10.658 5.8C10.877 6.019 11 6.316 11 6.625C11 6.934 10.877 7.231 10.658 7.45C10.44 7.669 10.143 7.792 9.833 7.792C9.524 7.792 9.227 7.669 9.008 7.45Z" fill="#667085"/><path d="M13.342 2.2C13.123 1.981 13 1.684 13 1.375C13 1.066 13.123 0.769 13.342 0.55C13.561 0.331 13.857 0.208 14.167 0.208C14.476 0.208 14.773 0.331 14.992 0.55C15.211 0.769 15.334 1.066 15.334 1.375C15.334 1.684 15.211 1.981 14.992 2.2C14.773 2.419 14.476 2.542 14.167 2.542C13.857 2.542 13.561 2.419 13.342 2.2Z" fill="#667085"/><path d="M13.342 7.45C13.123 7.231 13 6.934 13 6.625C13 6.316 13.123 6.019 13.342 5.8C13.561 5.581 13.857 5.458 14.167 5.458C14.476 5.458 14.773 5.581 14.992 5.8C15.211 6.019 15.334 6.316 15.334 6.625C15.334 6.934 15.211 7.231 14.992 7.45C14.773 7.669 14.476 7.792 14.167 7.792C13.857 7.792 13.561 7.669 13.342 7.45Z" fill="#667085"/><path d="M17.675 2.2C17.456 1.981 17.333 1.684 17.333 1.375C17.333 1.066 17.456 0.769 17.675 0.55C17.894 0.331 18.19 0.208 18.5 0.208C18.809 0.208 19.106 0.331 19.325 0.55C19.544 0.769 19.667 1.066 19.667 1.375C19.667 1.684 19.544 1.981 19.325 2.2C19.106 2.419 18.809 2.542 18.5 2.542C18.19 2.542 17.894 2.419 17.675 2.2Z" fill="#667085"/><path d="M17.675 7.45C17.456 7.231 17.333 6.934 17.333 6.625C17.333 6.316 17.456 6.019 17.675 5.8C17.894 5.581 18.19 5.458 18.5 5.458C18.809 5.458 19.106 5.581 19.325 5.8C19.544 6.019 19.667 6.316 19.667 6.625C19.667 6.934 19.544 7.231 19.325 7.45C19.106 7.669 18.809 7.792 18.5 7.792C18.19 7.792 17.894 7.669 17.675 7.45Z" fill="#667085"/><path d="M22.008 2.2C21.79 1.981 21.667 1.684 21.667 1.375C21.667 1.066 21.79 0.769 22.008 0.55C22.227 0.331 22.524 0.208 22.833 0.208C23.143 0.208 23.44 0.331 23.658 0.55C23.877 0.769 24 1.066 24 1.375C24 1.684 23.877 1.981 23.658 2.2C23.44 2.419 23.143 2.542 22.833 2.542C22.524 2.542 22.227 2.419 22.008 2.2Z" fill="#667085"/><path d="M22.008 7.45C21.79 7.231 21.667 6.934 21.667 6.625C21.667 6.316 21.79 6.019 22.008 5.8C22.227 5.581 22.524 5.458 22.833 5.458C23.143 5.458 23.44 5.581 23.658 5.8C23.877 6.019 24 6.316 24 6.625C24 6.934 23.877 7.231 23.658 7.45C23.44 7.669 23.143 7.792 22.833 7.792C22.524 7.792 22.227 7.669 22.008 7.45Z" fill="#667085"/><path d="M26.342 2.2C26.123 1.981 26 1.684 26 1.375C26 1.066 26.123 0.769 26.342 0.55C26.561 0.331 26.857 0.208 27.167 0.208C27.476 0.208 27.773 0.331 27.992 0.55C28.211 0.769 28.334 1.066 28.334 1.375C28.334 1.684 28.211 1.981 27.992 2.2C27.773 2.419 27.476 2.542 27.167 2.542C26.857 2.542 26.561 2.419 26.342 2.2Z" fill="#667085"/><path d="M26.342 7.45C26.123 7.231 26 6.934 26 6.625C26 6.316 26.123 6.019 26.342 5.8C26.561 5.581 26.857 5.458 27.167 5.458C27.476 5.458 27.773 5.581 27.992 5.8C28.211 6.019 28.334 6.316 28.334 6.625C28.334 6.934 28.211 7.231 27.992 7.45C27.773 7.669 27.476 7.792 27.167 7.792C26.857 7.792 26.561 7.669 26.342 7.45Z" fill="#667085"/><path d="M30.675 2.2C30.456 1.981 30.333 1.684 30.333 1.375C30.333 1.066 30.456 0.769 30.675 0.55C30.894 0.331 31.19 0.208 31.5 0.208C31.809 0.208 32.106 0.331 32.325 0.55C32.544 0.769 32.667 1.066 32.667 1.375C32.667 1.684 32.544 1.981 32.325 2.2C32.106 2.419 31.809 2.542 31.5 2.542C31.19 2.542 30.894 2.419 30.675 2.2Z" fill="#667085"/><path d="M30.675 7.45C30.456 7.231 30.333 6.934 30.333 6.625C30.333 6.316 30.456 6.019 30.675 5.8C30.894 5.581 31.19 5.458 31.5 5.458C31.809 5.458 32.106 5.581 32.325 5.8C32.544 6.019 32.667 6.316 32.667 6.625C32.667 6.934 32.544 7.231 32.325 7.45C32.106 7.669 31.809 7.792 31.5 7.792C31.19 7.792 30.894 7.669 30.675 7.45Z" fill="#667085"/></g></svg>
      </div>

      {/* Left drag handle */}
      <div
        className="absolute left-[9px] top-1/2 -translate-y-1/2 cursor-grab opacity-50 transition-opacity duration-300 hover:opacity-100 active:cursor-grabbing"
        onMouseDown={onMouseDown}
      >
        <svg width="8" height="33" viewBox="0 0 8 33" fill="none"><g><path d="M5.8 0.342C6.019 0.123 6.315 0 6.625 0C6.934 0 7.231 0.123 7.45 0.342C7.669 0.56 7.792 0.857 7.792 1.167C7.792 1.476 7.669 1.773 7.45 1.992C7.231 2.21 6.934 2.333 6.625 2.333C6.315 2.333 6.019 2.21 5.8 1.992C5.581 1.773 5.458 1.476 5.458 1.167C5.458 0.857 5.581 0.56 5.8 0.342Z" fill="#667085"/><path d="M0.55 0.342C0.769 0.123 1.065 0 1.375 0C1.684 0 1.981 0.123 2.2 0.342C2.419 0.56 2.542 0.857 2.542 1.167C2.542 1.476 2.419 1.773 2.2 1.992C1.981 2.21 1.684 2.333 1.375 2.333C1.065 2.333 0.769 2.21 0.55 1.992C0.331 1.773 0.208 1.476 0.208 1.167C0.208 0.857 0.331 0.56 0.55 0.342Z" fill="#667085"/><path d="M5.8 4.675C6.019 4.456 6.315 4.333 6.625 4.333C6.934 4.333 7.231 4.456 7.45 4.675C7.669 4.894 7.792 5.191 7.792 5.5C7.792 5.81 7.669 6.106 7.45 6.325C7.231 6.544 6.934 6.667 6.625 6.667C6.315 6.667 6.019 6.544 5.8 6.325C5.581 6.106 5.458 5.81 5.458 5.5C5.458 5.191 5.581 4.894 5.8 4.675Z" fill="#667085"/><path d="M0.55 4.675C0.769 4.456 1.065 4.333 1.375 4.333C1.684 4.333 1.981 4.456 2.2 4.675C2.419 4.894 2.542 5.191 2.542 5.5C2.542 5.81 2.419 6.106 2.2 6.325C1.981 6.544 1.684 6.667 1.375 6.667C1.065 6.667 0.769 6.544 0.55 6.325C0.331 6.106 0.208 5.81 0.208 5.5C0.208 5.191 0.331 4.894 0.55 4.675Z" fill="#667085"/><path d="M5.8 9.008C6.019 8.79 6.315 8.667 6.625 8.667C6.934 8.667 7.231 8.79 7.45 9.008C7.669 9.227 7.792 9.524 7.792 9.833C7.792 10.143 7.669 10.44 7.45 10.658C7.231 10.877 6.934 11 6.625 11C6.315 11 6.019 10.877 5.8 10.658C5.581 10.44 5.458 10.143 5.458 9.833C5.458 9.524 5.581 9.227 5.8 9.008Z" fill="#667085"/><path d="M0.55 9.008C0.769 8.79 1.065 8.667 1.375 8.667C1.684 8.667 1.981 8.79 2.2 9.008C2.419 9.227 2.542 9.524 2.542 9.833C2.542 10.143 2.419 10.44 2.2 10.658C1.981 10.877 1.684 11 1.375 11C1.065 11 0.769 10.877 0.55 10.658C0.331 10.44 0.208 10.143 0.208 9.833C0.208 9.524 0.331 9.227 0.55 9.008Z" fill="#667085"/><path d="M5.8 13.342C6.019 13.123 6.315 13 6.625 13C6.934 13 7.231 13.123 7.45 13.342C7.669 13.56 7.792 13.857 7.792 14.167C7.792 14.476 7.669 14.773 7.45 14.992C7.231 15.21 6.934 15.333 6.625 15.333C6.315 15.333 6.019 15.21 5.8 14.992C5.581 14.773 5.458 14.476 5.458 14.167C5.458 13.857 5.581 13.56 5.8 13.342Z" fill="#667085"/><path d="M0.55 13.342C0.769 13.123 1.065 13 1.375 13C1.684 13 1.981 13.123 2.2 13.342C2.419 13.56 2.542 13.857 2.542 14.167C2.542 14.476 2.419 14.773 2.2 14.992C1.981 15.21 1.684 15.333 1.375 15.333C1.065 15.333 0.769 15.21 0.55 14.992C0.331 14.773 0.208 14.476 0.208 14.167C0.208 13.857 0.331 13.56 0.55 13.342Z" fill="#667085"/><path d="M5.8 17.675C6.019 17.456 6.315 17.333 6.625 17.333C6.934 17.333 7.231 17.456 7.45 17.675C7.669 17.894 7.792 18.191 7.792 18.5C7.792 18.81 7.669 19.106 7.45 19.325C7.231 19.544 6.934 19.667 6.625 19.667C6.315 19.667 6.019 19.544 5.8 19.325C5.581 19.106 5.458 18.81 5.458 18.5C5.458 18.191 5.581 17.894 5.8 17.675Z" fill="#667085"/><path d="M0.55 17.675C0.769 17.456 1.065 17.333 1.375 17.333C1.684 17.333 1.981 17.456 2.2 17.675C2.419 17.894 2.542 18.191 2.542 18.5C2.542 18.81 2.419 19.106 2.2 19.325C1.981 19.544 1.684 19.667 1.375 19.667C1.065 19.667 0.769 19.544 0.55 19.325C0.331 19.106 0.208 18.81 0.208 18.5C0.208 18.191 0.331 17.894 0.55 17.675Z" fill="#667085"/><path d="M5.8 22.008C6.019 21.79 6.315 21.667 6.625 21.667C6.934 21.667 7.231 21.79 7.45 22.008C7.669 22.227 7.792 22.524 7.792 22.833C7.792 23.143 7.669 23.44 7.45 23.658C7.231 23.877 6.934 24 6.625 24C6.315 24 6.019 23.877 5.8 23.658C5.581 23.44 5.458 23.143 5.458 22.833C5.458 22.524 5.581 22.227 5.8 22.008Z" fill="#667085"/><path d="M0.55 22.008C0.769 21.79 1.065 21.667 1.375 21.667C1.684 21.667 1.981 21.79 2.2 22.008C2.419 22.227 2.542 22.524 2.542 22.833C2.542 23.143 2.419 23.44 2.2 23.658C1.981 23.877 1.684 24 1.375 24C1.065 24 0.769 23.877 0.55 23.658C0.331 23.44 0.208 23.143 0.208 22.833C0.208 22.524 0.331 22.227 0.55 22.008Z" fill="#667085"/><path d="M5.8 26.342C6.019 26.123 6.315 26 6.625 26C6.934 26 7.231 26.123 7.45 26.342C7.669 26.56 7.792 26.857 7.792 27.167C7.792 27.476 7.669 27.773 7.45 27.992C7.231 28.21 6.934 28.333 6.625 28.333C6.315 28.333 6.019 28.21 5.8 27.992C5.581 27.773 5.458 27.476 5.458 27.167C5.458 26.857 5.581 26.56 5.8 26.342Z" fill="#667085"/><path d="M0.55 26.342C0.769 26.123 1.065 26 1.375 26C1.684 26 1.981 26.123 2.2 26.342C2.419 26.56 2.542 26.857 2.542 27.167C2.542 27.476 2.419 27.773 2.2 27.992C1.981 28.21 1.684 28.333 1.375 28.333C1.065 28.333 0.769 28.21 0.55 27.992C0.331 27.773 0.208 27.476 0.208 27.167C0.208 26.857 0.331 26.56 0.55 26.342Z" fill="#667085"/><path d="M5.8 30.675C6.019 30.456 6.315 30.333 6.625 30.333C6.934 30.333 7.231 30.456 7.45 30.675C7.669 30.894 7.792 31.191 7.792 31.5C7.792 31.81 7.669 32.106 7.45 32.325C7.231 32.544 6.934 32.667 6.625 32.667C6.315 32.667 6.019 32.544 5.8 32.325C5.581 32.106 5.458 31.81 5.458 31.5C5.458 31.191 5.581 30.894 5.8 30.675Z" fill="#667085"/><path d="M0.55 30.675C0.769 30.456 1.065 30.333 1.375 30.333C1.684 30.333 1.981 30.456 2.2 30.675C2.419 30.894 2.542 31.191 2.542 31.5C2.542 31.81 2.419 32.106 2.2 32.325C1.981 32.544 1.684 32.667 1.375 32.667C1.065 32.667 0.769 32.544 0.55 32.325C0.331 32.106 0.208 31.81 0.208 31.5C0.208 31.191 0.331 30.894 0.55 30.675Z" fill="#667085"/></g></svg>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute right-[10px] top-[10px] flex size-7 items-center justify-center rounded-md transition-colors duration-300 hover:bg-gray-100"
      >
        <X className="size-4 text-gray-500" />
      </button>

      {/* Notes label + textarea */}
      <div className="flex flex-1 flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">Notes</label>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="What makes them stand out?"
          className="!h-[190px] resize-none rounded-[5px]"
        />
      </div>
    </div>
  )
}

function PageOptionsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex size-10 items-center justify-center rounded-full text-gray-800 hover:bg-gray-100 data-[state=open]:bg-gray-100">
          <MoreHorizontal className="size-[15px]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px]">
        <DropdownMenuItem>
          <Share01 className="mr-2 size-4" />
          Share Job Listing
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Copy01 className="mr-2 size-4" />
          Duplicate Listing
        </DropdownMenuItem>
        <DropdownMenuItem>
          <UserPlus01 className="mr-2 size-4" />
          Invite Candidates
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Download01 className="mr-2 size-4" />
          Export Candidates
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Printer className="mr-2 size-4" />
          Print Summary
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Edit03 className="mr-2 size-4" />
          Edit Job Listing
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings01 className="mr-2 size-4" />
          Screening Settings
        </DropdownMenuItem>
        <DropdownMenuItem>
          <RefreshCcw01 className="mr-2 size-4" />
          Re-run Matching
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Archive className="mr-2 size-4" />
          Archive Listing
        </DropdownMenuItem>
        <DropdownMenuItem visual="destructive">
          <Trash01 className="mr-2 size-4" />
          Delete Listing
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ---------- sub-components ----------

function DetailActionBar({
  candidate,
  onToggleMinimize,
  isMinimized,
  vote,
  onVote,
  superLiked,
  onSuperLike,
  note,
  onNoteChange,
  notesOpen,
  onNotesOpenChange,
}: {
  candidate: (typeof mockCandidates)[number]
  onToggleMinimize?: () => void
  isMinimized?: boolean
  vote?: "like" | "neutral" | "dislike" | null
  onVote?: (v: "like" | "neutral" | "dislike" | null) => void
  superLiked?: boolean
  onSuperLike?: () => void
  note?: string
  onNoteChange?: (v: string) => void
  notesOpen?: boolean
  onNotesOpenChange?: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-6">
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-3">
            {/* Thumbs up / emoji / thumbs down button group */}
            <div className="flex items-center bg-white">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onVote?.(vote === "like" ? null : "like")}
                    className={`flex size-[35px] items-center justify-center rounded-l-[5px] border border-r-0 border-[#D0D5DD] shadow-[0px_1px_4px_rgba(0,0,0,0.03)] transition-colors duration-300 ${vote === "like" ? "bg-[#F2F4F7] text-dark-blue-400" : "text-[#667085] hover:text-dark-blue-400"}`}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill={vote === "like" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
                      <path d="M7 10v12" stroke={vote === "like" ? "white" : "currentColor"} />
                    </svg>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="rounded-md bg-white px-[9px] py-1 text-xs font-semibold text-gray-700 shadow-lg">
                  Like
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onVote?.(vote === "neutral" ? null : "neutral")}
                    className={`flex size-[35px] items-center justify-center border border-[#D0D5DD] shadow-[0px_1px_4px_rgba(0,0,0,0.03)] transition-colors duration-300 ${vote === "neutral" ? "bg-[#F2F4F7] text-dark-blue-400" : "text-[#667085] hover:text-dark-blue-400"}`}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill={vote === "neutral" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M15 10V9" />
                      <path d="M9 10V9" />
                      <path d="M8 16h8" stroke={vote === "neutral" ? "white" : "currentColor"} strokeWidth={vote === "neutral" ? 1.75 : 1.25} />
                      {vote === "neutral" && (
                        <>
                          <path d="M15 10V9" stroke="white" strokeWidth="1.75" />
                          <path d="M9 10V9" stroke="white" strokeWidth="1.75" />
                        </>
                      )}
                    </svg>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="rounded-md bg-white px-[9px] py-1 text-xs font-semibold text-gray-700 shadow-lg">
                  Neutral
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onVote?.(vote === "dislike" ? null : "dislike")}
                    className={`flex size-[35px] items-center justify-center rounded-r-[5px] border border-l-0 border-[#D0D5DD] shadow-[0px_1px_4px_rgba(0,0,0,0.03)] transition-colors duration-300 ${vote === "dislike" ? "bg-[#F2F4F7] text-dark-blue-400" : "text-[#667085] hover:text-dark-blue-400"}`}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill={vote === "dislike" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
                      <path d="M17 14V2" stroke={vote === "dislike" ? "white" : "currentColor"} />
                    </svg>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="rounded-md bg-white px-[9px] py-1 text-xs font-semibold text-gray-700 shadow-lg">
                  Not Interested
                </TooltipContent>
              </Tooltip>
            </div>
            {/* Star / super like */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSuperLike?.()}
                  className="flex size-[35px] items-center justify-center rounded-full border border-[#D0D5DD] bg-white shadow-[0px_1px_4px_rgba(0,0,0,0.03)] transition-colors duration-300 hover:bg-[#F2F4F7] hover:text-[#101828]"
                >
                  <Star className={`size-[15px] ${superLiked ? "fill-[#306CFE] text-[#306CFE]" : "text-[#667085]"}`} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="rounded-md bg-white px-[9px] py-1 text-xs font-semibold text-gray-700 shadow-lg">
                Super Like
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        <div className="flex items-center gap-3 text-sm font-normal text-dark-blue-400">
          <span>Applied {candidate.appliedAgo}</span>
          <span className="inline-block size-1 rounded-full bg-gray-300" />
          <span>Message sent {candidate.lastMessage}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <IconButton
          variant="outlined"
          visual="gray"
          className="size-[35px] rounded-full border-gray-300 shadow-xs"
          onClick={() => onNotesOpenChange?.(!notesOpen)}
        >
          <FilePlus02 className="size-[15px]" />
        </IconButton>
        <IconButton
          variant="outlined"
          visual="gray"
          className="size-[35px] rounded-full border-gray-300 shadow-xs"
          onClick={onToggleMinimize}
        >
          {isMinimized ? <Minimize01 className="size-[15px]" /> : <Maximize01 className="size-[15px]" />}
        </IconButton>
      </div>
    </div>
  )
}

function CandidateCard({
  candidate,
  isSelected,
  onClick,
}: {
  candidate: (typeof mockCandidates)[number]
  isSelected: boolean
  onClick: () => void
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const remainingSkills =
    candidate.matchingSkills - candidate.skills.length
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick() }}
      className={`group relative w-full cursor-pointer border-b border-gray-200 text-left transition-colors ${
        dropdownOpen
          ? "bg-gray-50"
          : isSelected
            ? "bg-primary-25 hover:bg-gray-50"
            : "bg-white hover:bg-gray-50"
      }`}
    >
      {/* Active left blue border - overlays, does not push content */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-primary-500" />
      )}
      <div className="flex w-full flex-col gap-[14px] px-5 py-4">
        <div className="flex w-full gap-[13px]">
          {/* Avatar with match ring + hover tooltip */}
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative flex size-[86px] shrink-0 items-center justify-center">
                  <CircularProgress
                    size={86}
                    strokeWidth={4}
                    value={candidate.matchPercent}
                    className="absolute inset-0 text-primary-500"
                    trackClassName="stroke-transparent"
                  />
                  <Avatar className="h-[66px] w-[66px] hover:ring-0 active:ring-0">
                    <AvatarImage src={candidate.avatar} alt={candidate.name} />
                    <AvatarFallback>{candidate.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="center"
                sideOffset={-53}
                className="rounded-md bg-white px-[9px] py-1 text-base font-semibold text-gray-700 shadow-lg"
              >
                {candidate.matchPercent}% match
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Info */}
          <div className="flex min-w-0 flex-1 flex-col gap-[14px]">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-[2px]">
                <span className="text-base font-bold leading-[19px] text-dark-blue-400">
                  {candidate.name}
                </span>
                <span className="text-sm font-light leading-[17px] text-dark-blue-400">
                  {candidate.handle}
                </span>
              </div>
              <p className="text-xs font-semibold capitalize leading-[15px] text-dark-blue-400">
                {candidate.title}
              </p>
              <p className="text-xs font-light leading-[15px] text-dark-blue-400">
                {candidate.experience} years of experience
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-normal leading-[15px] text-dark-blue-400">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="shrink-0"
              >
                <path
                  d="M8 8.667a1.667 1.667 0 1 0 0-3.334 1.667 1.667 0 0 0 0 3.334Z"
                  stroke="#22376B"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 14.167c2.667-2.667 5.333-5.06 5.333-7.734a5.333 5.333 0 0 0-10.666 0c0 2.674 2.666 5.067 5.333 7.734Z"
                  stroke="#22376B"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>
                {candidate.city}, {candidate.country}
              </span>
            </div>
          </div>

          {/* Actions (top-right) */}
          <div className="flex w-16 shrink-0 flex-col items-end justify-between self-stretch pb-[7px]">
            <div className="flex items-center gap-1">
              <FavoriteRoot>
                {({ pressed }) => (
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div onClick={(e) => e.stopPropagation()}>
                          <Favorite
                            className="size-[30px]"
                            starClassName="size-5"
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="flex items-center gap-1 rounded-[5px] bg-gray-900 px-[7px] py-[3px] text-xs font-semibold leading-[18px] text-white shadow-lg"
                      >
                        {pressed ? (
                          <>
                            <Check className="size-[15px] text-success-500" />
                            Saved
                          </>
                        ) : (
                          "Add to favorites"
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </FavoriteRoot>
              <CandidateDropdown
                iconClassName="text-gray-400 hover:bg-gray-200 hover:text-gray-700 data-[state=open]:bg-gray-200 data-[state=open]:text-gray-700"
                onOpenChange={setDropdownOpen}
              />
            </div>
            {candidate.isNew && (
              <Badge
                visual="success"
                size="sm"
                className="rounded-full bg-success-50 px-2 py-[2px] text-xs font-medium leading-[18px] text-success-700"
              >
                New
              </Badge>
            )}
          </div>
        </div>

        {/* Skills */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold leading-[15px] text-dark-blue-400">
              {candidate.matchingSkills} out of {candidate.totalSkills}{" "}
              matching skills
            </p>
            <div className="flex h-[54px] flex-wrap gap-2 overflow-hidden">
              {candidate.skills.map((skill, i) => (
                <Badge
                  key={`${candidate.id}-${skill}-${i}`}
                  visual="gray"
                  className={`h-fit shrink-0 whitespace-nowrap rounded-full px-[7px] py-1 text-xs font-medium leading-[15px] text-gray-700 ${
                    isSelected ? "bg-primary-50" : "bg-gray-100"
                  }`}
                >
                  <Check className="size-[15px] text-primary-500" />
                  {skill}
                </Badge>
              ))}
              {remainingSkills > 0 && (
                <span className="flex items-center text-xs font-semibold leading-[12px] text-dark-blue-400">
                  + {remainingSkills} more...
                </span>
              )}
            </div>
          </div>

          {/* Applied / message status */}
          <div className="flex items-center gap-3 text-xs font-normal leading-[15px] text-dark-blue-400">
            <span>Applied {candidate.appliedAgo}</span>
            <span className="inline-block size-1 rounded-full bg-gray-300" />
            <span>Message sent {candidate.lastMessage}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function CandidateDropdown({ iconClassName, onOpenChange }: { iconClassName?: string; onOpenChange?: (open: boolean) => void }) {
  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex size-[30px] items-center justify-center rounded-full ${iconClassName ?? "text-gray-400 hover:bg-gray-200 hover:text-gray-700 data-[state=open]:bg-gray-200 data-[state=open]:text-gray-700"}`}
        >
          <MoreHorizontal className="size-[15px]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[180px] rounded-lg border-gray-100 px-0 py-1 shadow-lg"
      >
        <DropdownMenuItem className="flex items-center gap-2 px-3 py-[10px] text-[13px] leading-[13px] font-medium text-gray-500">
          <User01 className="size-4" />
          View Profile
        </DropdownMenuItem>
        <DropdownMenuItem className="flex items-center gap-2 px-3 py-[10px] text-[13px] leading-[13px] font-medium text-gray-500">
          <Link01 className="size-4" />
          Share Profile
        </DropdownMenuItem>
        <DropdownMenuItem className="flex items-center gap-2 px-3 py-[10px] text-[13px] leading-[13px] font-medium text-gray-500">
          <Edit03 className="size-4" />
          Add Notes
        </DropdownMenuItem>
        <DropdownMenuItem className="flex items-center gap-2 px-3 py-[10px] text-[13px] leading-[13px] font-medium text-gray-500">
          <Mail01 className="size-4" />
          Send Message
        </DropdownMenuItem>
        <DropdownMenuItem className="flex items-center gap-2 px-3 py-[10px] text-[13px] leading-[13px] font-medium text-gray-500">
          <Calendar className="size-4" />
          Schedule Interview
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function CandidateDropdownIconButton() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex size-[30px] items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-700 data-[state=open]:bg-gray-200 data-[state=open]:text-gray-700">
          <MoreHorizontal className="size-[15px]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[180px] rounded-lg border-gray-100 px-0 py-1 shadow-lg"
      >
        <DropdownMenuItem className="flex items-center gap-2 px-3 py-[10px] text-[13px] leading-[13px] font-medium text-gray-500">
          <User01 className="size-4" />
          View Profile
        </DropdownMenuItem>
        <DropdownMenuItem className="flex items-center gap-2 px-3 py-[10px] text-[13px] leading-[13px] font-medium text-gray-500">
          <Link01 className="size-4" />
          Share Profile
        </DropdownMenuItem>
        <DropdownMenuItem className="flex items-center gap-2 px-3 py-[10px] text-[13px] leading-[13px] font-medium text-gray-500">
          <Edit03 className="size-4" />
          Add Notes
        </DropdownMenuItem>
        <DropdownMenuItem className="flex items-center gap-2 px-3 py-[10px] text-[13px] leading-[13px] font-medium text-gray-500">
          <Mail01 className="size-4" />
          Send Message
        </DropdownMenuItem>
        <DropdownMenuItem className="flex items-center gap-2 px-3 py-[10px] text-[13px] leading-[13px] font-medium text-gray-500">
          <Calendar className="size-4" />
          Schedule Interview
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-normal text-gray-500">{label}</p>
      <p className="text-base font-bold text-dark-blue-400">{value}</p>
    </div>
  )
}

const reqCategoryIcons: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  skills: Tool02,
  "job-title": Briefcase01,
  "work-schedule": Calendar,
  education: GraduationHat01,
  experience: Building07,
  industries: Grid01,
  "pay-rate": CurrencyDollar,
  languages: Translate01,
  country: Flag01,
}

function ReqCategoryIcon({ id }: { id: string }) {
  const Icon = reqCategoryIcons[id]
  if (!Icon) return <div className="size-[15px] shrink-0" />
  return <Icon className="size-[15px] shrink-0 text-gray-500" />
}

function MatchIndicator({
  type,
  percent,
}: {
  type: RequirementMatchType
  percent?: number
}) {
  if (type === "percent") {
    return (
      <>
        <CircularProgress
          size={20}
          strokeWidth={2.73}
          value={percent ?? 0}
          className="shrink-0 text-primary-500"
          trackClassName="stroke-gray-100"
        />
        <span className="whitespace-nowrap text-[12px] font-medium leading-[15px] text-dark-blue-400">
          {percent}% match
        </span>
      </>
    )
  }
  if (type === "match") {
    return (
      <CheckCircle className="size-5 shrink-0 text-success-500" />
    )
  }
  return (
    <XCircle className="size-5 shrink-0 text-error-500" />
  )
}

function RequirementCategory({
  category,
}: {
  category: RequirementCategoryData
}) {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center gap-[10px]">
        <div className="flex items-center gap-2">
          <ReqCategoryIcon id={category.iconId} />
          <span className="whitespace-nowrap text-[14px] font-bold leading-[17px] text-dark-blue-400">
            {category.label}
          </span>
        </div>
        <MatchIndicator
          type={category.matchType}
          percent={category.matchPercent}
        />
      </div>
      {category.requirement && (
        <span className="text-[12px] font-normal leading-[15px] text-gray-500">
          {category.requirement}
        </span>
      )}
      <div className="flex flex-wrap gap-3">
        {category.badges.map((badge, i) => (
          <span
            key={`${category.label}-b-${i}`}
            className={`flex items-center gap-1 rounded-full px-[7px] py-1 ${
              badge.matched ? "bg-gray-100" : "bg-error-50"
            }`}
          >
            {badge.matched ? (
              <Check className="size-[15px] shrink-0 text-primary-500" />
            ) : (
              <X className="size-[15px] shrink-0 text-error-500" />
            )}
            <span
              className={`whitespace-nowrap text-[12px] font-medium leading-[15px] ${
                badge.matched ? "text-gray-700" : "text-error-500"
              }`}
            >
              {badge.text}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

function FullWidthCandidateCard({
  candidate,
  isSelected,
  onClick,
  onToggleMinimize,
  onHire,
  vote,
  onVote,
  superLiked,
  onSuperLike,
}: {
  candidate: (typeof mockCandidates)[number]
  isSelected: boolean
  onClick: () => void
  onToggleMinimize?: () => void
  onHire?: () => void
  vote?: "like" | "neutral" | "dislike" | null
  onVote?: (v: "like" | "neutral" | "dislike" | null) => void
  superLiked?: boolean
  onSuperLike?: () => void
}) {
  return (
    <div
      className="relative w-full border-b border-gray-200 bg-white text-left"
    >
      <div className="flex gap-6 p-6">
        {/* Left section - candidate info */}
        <div className="flex w-[300px] shrink-0 flex-col justify-between gap-3">
          {/* Avatar + info row */}
          <div className="flex gap-3">
            {/* Avatar with match ring */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative flex size-[86px] shrink-0 items-center justify-center">
                <CircularProgress
                  size={86}
                  strokeWidth={4}
                  value={candidate.matchPercent}
                  className="absolute inset-0 text-primary-500"
                  trackClassName="stroke-transparent"
                />
                <Avatar className="h-[66px] w-[66px] hover:ring-0 active:ring-0">
                  <AvatarImage src={candidate.avatar} alt={candidate.name} />
                  <AvatarFallback>{candidate.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </div>
              <span className="text-xs font-normal text-dark-blue-400">
                {candidate.matchPercent}% match
              </span>
              {candidate.isNew && (
                <Badge
                  visual="success"
                  size="sm"
                  className="rounded-full bg-success-50 px-2 py-[2px] text-xs font-medium leading-[18px] text-success-700"
                >
                  New
                </Badge>
              )}
            </div>

            {/* Name + details */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-[2px]">
                <span className="text-base font-bold leading-[19px] text-dark-blue-400">
                  {candidate.name}
                </span>
                <span className="text-sm font-light leading-[17px] text-dark-blue-400">
                  {candidate.handle}
                </span>
              </div>
              <p className="text-xs font-semibold capitalize leading-[15px] text-dark-blue-400">
                {candidate.title}
              </p>
              <p className="text-xs font-light leading-[15px] text-dark-blue-400">
                {candidate.experience} years of experience
              </p>
              <div className="mt-1 flex items-center gap-1 text-xs font-normal leading-[15px] text-dark-blue-400">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="shrink-0"
                >
                  <path
                    d="M8 8.667a1.667 1.667 0 1 0 0-3.334 1.667 1.667 0 0 0 0 3.334Z"
                    stroke="#22376B"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 14.167c2.667-2.667 5.333-5.06 5.333-7.734a5.333 5.333 0 0 0-10.666 0c0 2.674 2.666 5.067 5.333 7.734Z"
                    stroke="#22376B"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{candidate.city}, {candidate.country}</span>
              </div>
            </div>
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white">
              <button
                onClick={() => onVote?.(vote === "like" ? null : "like")}
                className={`flex size-[35px] items-center justify-center rounded-l-[5px] border border-r-0 border-[#D0D5DD] shadow-[0px_1px_4px_rgba(0,0,0,0.03)] transition-colors duration-300 ${vote === "like" ? "bg-[#F2F4F7] text-[#101828]" : "text-[#667085] hover:text-dark-blue-400"}`}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M4.375 6.875l2.5-5.625a1.875 1.875 0 0 1 1.875 1.875V5.5h3.532a1.25 1.25 0 0 1 1.222 1.503l-1.035 4.84a1.25 1.25 0 0 1-1.222.907H4.375m0-5.875v5.875m0-5.875H2.5a.625.625 0 0 0-.625.625v4.625a.625.625 0 0 0 .625.625h1.875" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                onClick={() => onVote?.(vote === "neutral" ? null : "neutral")}
                className={`flex size-[35px] items-center justify-center border border-[#D0D5DD] shadow-[0px_1px_4px_rgba(0,0,0,0.03)] transition-colors duration-300 ${vote === "neutral" ? "bg-[#F2F4F7] text-[#101828]" : "text-[#667085] hover:text-dark-blue-400"}`}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <circle cx="7.5" cy="7.5" r="5.625" stroke="currentColor" strokeWidth="1.25" />
                  <circle cx="5.625" cy="6.25" r="0.625" fill="currentColor" />
                  <circle cx="9.375" cy="6.25" r="0.625" fill="currentColor" />
                  <path d="M5.625 9.375a2.5 2.5 0 0 0 3.75 0" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                </svg>
              </button>
              <button
                onClick={() => onVote?.(vote === "dislike" ? null : "dislike")}
                className={`flex size-[35px] items-center justify-center rounded-r-[5px] border border-l-0 border-[#D0D5DD] shadow-[0px_1px_4px_rgba(0,0,0,0.03)] transition-colors duration-300 ${vote === "dislike" ? "bg-[#F2F4F7] text-[#101828]" : "text-[#667085] hover:text-dark-blue-400"}`}
              >
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M10.625 8.125l-2.5 5.625a1.875 1.875 0 0 1-1.875-1.875V9.5H2.718a1.25 1.25 0 0 1-1.222-1.503l1.035-4.84A1.25 1.25 0 0 1 3.753 2.25h6.872m0 5.875V2.25m0 5.875H12.5a.625.625 0 0 0 .625-.625V2.875A.625.625 0 0 0 12.5 2.25h-1.875" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <button
              onClick={() => onSuperLike?.()}
              className="flex size-[35px] items-center justify-center rounded-full border border-[#D0D5DD] bg-white shadow-[0px_1px_4px_rgba(0,0,0,0.03)] transition-colors duration-300 hover:bg-[#F2F4F7] hover:text-[#101828]"
            >
              <Star className={`size-[15px] ${superLiked ? "fill-[#306CFE] text-[#306CFE]" : "text-[#667085]"}`} />
            </button>
          </div>

          {/* Applied / message info */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-normal text-dark-blue-400">
              Applied {candidate.appliedAgo}
            </span>
            <span className="text-sm font-normal text-dark-blue-400">
              Message sent {candidate.lastMessage}
            </span>
          </div>

          {/* Message + Hire buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="outlined"
              visual="gray"
              size="md"
              className="h-10 rounded-[5px] border-gray-300 px-4 text-sm font-semibold text-gray-800 shadow-xs"
            >
              <MessageSquare className="size-[15px]" />
              Message
            </Button>
            <Button size="md" className="h-10 rounded-[5px] px-4" onClick={onHire}>
              <Plus className="size-[15px]" />
              Hire
            </Button>
          </div>
        </div>

        {/* Right section - job requirements grid */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* Top row: 3 columns */}
          <div className="flex justify-between gap-3">
            {jobRequirementColumns[0].map((cat) => (
              <div key={cat.label} className="flex-1">
                <RequirementCategory category={cat} />
              </div>
            ))}
          </div>
          {/* Middle row: 2 columns (experience, industries) + empty */}
          <div className="flex justify-between gap-3">
            {jobRequirementColumns[1].map((cat) => (
              <div key={cat.label} className="flex-1">
                <RequirementCategory category={cat} />
              </div>
            ))}
            <div className="flex-1" />
          </div>
          {/* Bottom row: 3 columns (pay rate, languages, country) */}
          <div className="flex justify-between gap-3">
            {jobRequirementColumns[2].map((cat) => (
              <div key={cat.label} className="flex-1">
                <RequirementCategory category={cat} />
              </div>
            ))}
          </div>

          {/* Bottom-right: file plus / minimize icons */}
          <div className="flex items-center justify-end gap-3">
            <IconButton
              variant="outlined"
              visual="gray"
              className="size-[35px] rounded-full border-gray-300 shadow-xs"
            >
              <FilePlus02 className="size-[15px]" />
            </IconButton>
            <IconButton
              variant="outlined"
              visual="gray"
              className="size-[35px] rounded-full border-gray-300 shadow-xs"
              onClick={(e) => { e.stopPropagation(); onToggleMinimize?.() }}
            >
              <Minimize01 className="size-[15px]" />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  )
}
