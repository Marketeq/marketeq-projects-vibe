"use client"

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { UserAPI } from "@/service/http/user"
import type { UserProfile } from "@/types/user"
import { getComputedStyle } from "@/utils/dom-utils"
import { cn, toPxIfNumber } from "@/utils/functions"
import { useClickOutside } from "@/utils/hooks"
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Heart,
  MapPin,
  MarkerPin02,
  MessageSquare01,
  MessageTextSquare01,
  Edit03,
  Eye,
  Plus,
  Plus2,
  RefreshCw,
  SearchMd,
  Share,
  Share01,
  Share06,
  Share07,
  Star,
  Trash03,
  User,
  X,
  XCircle,
} from "@blend-metrics/icons"
import { AdobeBrand, WordpressBrand } from "@blend-metrics/icons/brands"
import { GoogleDefault } from "@blend-metrics/icons/social"
import * as RadixTabs from "@radix-ui/react-tabs"
import { TooltipArrow } from "@radix-ui/react-tooltip"
import { Variants, motion } from "framer-motion"
import { TbStar, TbStarHalfFilled } from "react-icons/tb"
import { useToggle } from "react-use"
import { Adobe } from "@/components/icons/adobe"
import { Dropbox } from "@/components/icons/dropbox"
import { Microsoft } from "@/components/icons/microsoft"
import { Nasdaq } from "@/components/icons/nasdaq"
import {
  AboutMeDialog,
  AvailabilityDialog,
  CertificationsDialog,
  EducationDialog,
  IndustryExpertiseDialog,
  LanguagesDialog,
  MoreInfoDialog,
  MyOffersDialog,
  SkillsDialog,
  WorkExperienceDialog,
  AffiliatedTeamsDialog,
} from "@/components/edit-profile-modals"
import { LikeDislike } from "@/components/like-dislike"
import { Money } from "@/components/money"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import { ReadMoreLess, ReadMoreLessComp, ReadMoreLessRoot } from "@/components/read-more-less"
import {
  ShowMoreLess,
  ShowMoreLessComp,
  ShowMoreLessRoot,
} from "@/components/show-more-less"
import {
  Avatar,
  AvatarFallback,
  AvatarFallbackIcon,
  AvatarGroup,
  AvatarImage,
  Badge,
  Button,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNextTrigger,
  CarouselPreviousTrigger,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Favorite,
  FavoriteRoot,
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
  ScrollArea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Toggle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  buttonVariants,
  tabsListVariants,
} from "@/components/ui"
import { ScrollBar } from "@/components/ui"

const SaveButton = () => {
  const [isOpen, toggleIsOpen] = useToggle(false)
  const [value, setValue] = React.useState("")

  return (
    <div className="flex items-center">
      <Toggle
        className={buttonVariants({
          className:
            "group border-r-0 xs:max-lg:gap-x-[5.1px] xs:max-lg:leading-[12.75px] xs:max-lg:text-[8.93px] xs:max-lg:h-[25.75px] rounded-r-none",
          variant: "outlined",
          visual: "gray",
          size: "md",
        })}
      >
        <Star className="size-[12.75px] lg:size-5 text-gray-300 transition duration-300 group-hover:text-gray-500 group-hover:group-data-[state=on]:text-primary-500 group-data-[state=on]:text-primary-500  group-data-[state=on]:fill-primary-500" />
        <span className="group-data-[state=off]:inline-block hidden">Save</span>
        <span className="hidden group-data-[state=on]:inline-block">Saved</span>
      </Toggle>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton
            className="group rounded-l-none xs:max-lg:size-[25.5px] text-gray-500"
            variant="outlined"
            visual="gray"
            size="md"
          >
            <ChevronDown className="duration transition group-data-[state=open]:-rotate-180 size-[12.75px] lg:size-5" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom">
          <DropdownMenuRadioGroup value={value} onValueChange={setValue}>
            <DropdownMenuRadioTrigger value="Digital Marketing">
              Digital Marketing
            </DropdownMenuRadioTrigger>
            <DropdownMenuRadioTrigger value="Customer Service">
              Customer Service
            </DropdownMenuRadioTrigger>
            <DropdownMenuRadioTrigger value="Email Marketing">
              Email Marketing
            </DropdownMenuRadioTrigger>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => toggleIsOpen()}
            className="text-primary-500"
          >
            <Plus className="size-4" /> Create New List
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isOpen} onOpenChange={toggleIsOpen}>
        <DialogContent>
          <DialogTitle className="sr-only">Save to List</DialogTitle>
          <form className="flex items-center gap-x-3">
            <Input placeholder="Enter List Name" className="flex-auto" />
            <Button size="lg">Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

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

const Shimmer = ({ className }: { className?: string }) => (
  <div className={cn("relative bg-gray-100 rounded overflow-hidden", className)}>
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
  </div>
)

const LazySection = ({ children, minHeight = 200 }: { children: React.ReactNode; minHeight?: number }) => {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "200px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (isVisible) return <>{children}</>
  return <div ref={ref} style={{ minHeight }} />
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
          height: expanded ? "auto" : collapsedHeight ? `${collapsedHeight}px` : "auto",
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
          height: expanded ? "auto" : collapsedHeight ? `${collapsedHeight}px` : "auto",
        }}
      >
        <p ref={textRef} className={cn(className, !expanded && clampCls)}>
          {text}
        </p>
      </div>
      {clamped && !expanded && (
        <Button className={toggleClassName} variant="link" visual="gray" onClick={() => setExpanded(true)}>
          {expandLabel}
        </Button>
      )}
      {expanded && collapseLabel && (
        <Button className={toggleClassName} variant="link" visual="gray" onClick={() => setExpanded(false)}>
          {collapseLabel}
        </Button>
      )}
    </>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Team profile mock. The team profile page is a copy of the talent profile
// page; only the hero and team-specific sections are overridden below.
// ────────────────────────────────────────────────────────────────────────────
const TEAM = {
  name: "V6 Group",
  tagline: "Development Team",
  headline: "Headline text will go here talking about the company identity.",
  skills: [
    "Typescript",
    "React.js",
    "Tailwind CSS",
    "Next.js",
    "Redux",
    "Wireframing",
    "Sketch App",
    "Azure RP",
    "UX Pin",
    "Wireframing",
  ],
  rateMin: 85,
  rateMax: 120,
  clientSuccessRating: 0.95,
  totalProjectsCompleted: 1450,
  averageRating: 4.5,
  repeatHireRate: 0.85,
  featuredMembers: [
    { name: "Username", role: "Full-stack Developer", photo: "/man.jpg" },
    { name: "Username", role: "Full-stack Developer", photo: "/woman.jpg" },
    { name: "Username", role: "Full-stack Developer", photo: "/man.jpg" },
  ],
  otherMemberAvatars: ["/man.jpg", "/woman.jpg", "/man.jpg", "/woman.jpg"],
  extraMemberCount: 24,
}

export default function TeamProfilePage() {
  return (
    <Suspense>
      <Default />
    </Suspense>
  )
}

function Default() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  // Team profile loads placeholder talent data so the existing scaffolding
  // renders. Team-specific sections below override the talent rendering.
  const usernameParam = searchParams.get("username") ?? "htorres.creative"
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(true)

  // Use auth user data immediately for hero while full profile loads
  useEffect(() => {
    if (!usernameParam && user && !profile) {
      setProfile(user as any)
      setIsProfileLoading(false)
    }
  }, [user])

  useEffect(() => {
    let isActive = true

    const loadProfile = async () => {
      if (usernameParam) {
        setIsProfileLoading(true)
        try {
          const res = await UserAPI.getByUsername(usernameParam)
          if (isActive && res?.data) {
            setProfile(res.data)
          }
          return
        } catch (err: any) {
          const status = err?.response?.status

          // Username may be stale or unavailable; fall back to the signed-in user's profile.
          if (status === 404 && user?.id) {
            try {
              const fallbackRes = await UserAPI.getProfile(user.id)
              if (isActive && fallbackRes?.data) {
                setProfile(fallbackRes.data)
              }
            } catch (fallbackErr: any) {
              console.error("[profile] getProfile fallback error:", fallbackErr?.response?.status, fallbackErr?.message)
            }
          } else if (status !== 404) {
            console.error("[profile] getByUsername error:", status, err?.message)
          }
        } finally {
          if (isActive) setIsProfileLoading(false)
        }
        return
      }

      if (user?.id) {
        // Load full profile in background (hero already showing from auth user)
        setIsProfileLoading(true)
        UserAPI.getProfile(user.id)
          .then((res) => {
            if (isActive && res?.data) setProfile(res.data)
          })
          .catch((err) => { console.error("[profile] getProfile error:", err?.response?.status, err?.message) })
          .finally(() => {
            if (isActive) setIsProfileLoading(false)
          })
        return
      }

      // No user yet from auth — try /user/me directly as fallback
      setIsProfileLoading(true)
      UserAPI.me()
        .then((res) => {
          const data = res?.data?.user ?? res?.data?.data?.user ?? res?.data
          if (isActive && data && typeof data === "object" && data.id) {
            setProfile(data)
          }
        })
        .catch((err) => {
          console.error("[profile] me() fallback error:", err?.response?.status, err?.message)
        })
        .finally(() => {
          if (isActive) setIsProfileLoading(false)
        })
    }

    void loadProfile()

    return () => {
      isActive = false
    }
  }, [user?.id, usernameParam])

  const isOwnProfile = Boolean(user?.id && profile?.id && user.id === profile.id)

  const refreshProfile = useCallback(() => {
    if (!profile?.id) return
    UserAPI.getProfile(profile.id)
      .then((res) => { if (res?.data) setProfile(res.data) })
      .catch(() => {})
  }, [profile?.id])

  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "experience" | "education"; id: string; label: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteWorkExperience = useCallback((expId: string) => {
    const exp = profile?.experience?.find((e: any) => String(e.id) === String(expId))
    setDeleteConfirm({ type: "experience", id: expId, label: exp?.role || "this work experience" })
  }, [profile?.experience])

  const handleDeleteEducation = useCallback((eduId: string) => {
    const edu = profile?.education?.find((e: any) => String(e.id) === String(eduId))
    setDeleteConfirm({ type: "education", id: eduId, label: edu?.institution || "this education" })
  }, [profile?.education])

  const confirmDelete = useCallback(async () => {
    if (!profile?.id || !deleteConfirm) return
    setIsDeleting(true)
    try {
      if (deleteConfirm.type === "experience") {
        await UserAPI.removeExperience(profile.id, deleteConfirm.id)
      } else {
        await UserAPI.removeEducation(profile.id, deleteConfirm.id)
      }
      refreshProfile()
    } catch { /* noop */ }
    setIsDeleting(false)
    setDeleteConfirm(null)
  }, [profile?.id, deleteConfirm, refreshProfile])

  const [isEditMode, setIsEditMode] = useState(true)

  // Edit modal open states
  const [availabilityOpen, setAvailabilityOpen] = useState(false)
  const [skillsOpen, setSkillsOpen] = useState(false)
  const [overviewOpen, setOverviewOpen] = useState(false)
  const [offersOpen, setOffersOpen] = useState(false)
  const [jobTitleOpen, setJobTitleOpen] = useState(false)
  const [languagesOpen, setLanguagesOpen] = useState(false)
  const [industriesOpen, setIndustriesOpen] = useState(false)
  const [certificationsOpen, setCertificationsOpen] = useState(false)
  const [workExperienceOpen, setWorkExperienceOpen] = useState(false)
  const [educationOpen, setEducationOpen] = useState(false)
  const [workExpEditIdx, setWorkExpEditIdx] = useState<string | undefined>()
  const [eduEditIdx, setEduEditIdx] = useState<string | undefined>()
  const [affiliatedTeamsOpen, setAffiliatedTeamsOpen] = useState(false)

  const cardRef = useRef<HTMLDivElement>(null)
  const tabsListRef = useRef<HTMLDivElement>(null)
  const [isCardStuck, setIsCardStuck] = useState<boolean>(false)
  const [isTabsListStuck, setIsTabsListStuck] = useState<boolean>(false)

  // Auto-expand state for sections
  const [autoExpandPortfolio, setAutoExpandPortfolio] = useState<boolean>(false)
  const [autoExpandSkills, setAutoExpandSkills] = useState<boolean>(false)
  const [autoExpandOffers, setAutoExpandOffers] = useState<boolean>(false)
  const [autoExpandWorkExperience, setAutoExpandWorkExperience] =
    useState<boolean>(false)
  const [autoExpandEducation, setAutoExpandEducation] = useState<boolean>(false)
  const [autoExpandProjectHistory, setAutoExpandProjectHistory] =
    useState<boolean>(false)
  const [backgroundActiveTab, setBackgroundActiveTab] =
    useState<string>("Work Experience")
  const [activeTab, setActiveTab] = useState<string>("Portfolio")
  const [showLanguageSection, setShowLanguageSection] = useState<boolean>(true)
  const lastScrollYRef = useRef<number>(0)

  useEffect(() => {
    const element = cardRef.current

    if (element) {
      const topValue = getComputedStyle(element)["top"]
      const top = topValue.endsWith("px")
        ? parseFloat(topValue.slice(0, -2))
        : 0

      const handleScroll = () => {
        const rect = element.getBoundingClientRect()
        const isStuck = Math.ceil(top) === Math.ceil(rect.y)
        setIsCardStuck(isStuck)
      }

      window.addEventListener("scroll", handleScroll)

      return () => {
        window.removeEventListener("scroll", handleScroll)
      }
    }
  }, [])

  useEffect(() => {
    const element = tabsListRef.current

    if (element) {
      const handleScroll = () => {
        const rect = element.getBoundingClientRect()
        const isStuck = 64 >= Math.ceil(rect.y)
        setIsTabsListStuck(isStuck)
      }

      window.addEventListener("scroll", handleScroll)

      return () => {
        window.removeEventListener("scroll", handleScroll)
      }
    }
  }, [])

  // Scroll direction detection for language section visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      if (currentScrollY > lastScrollYRef.current && currentScrollY > 100) {
        // Scrolling down and past 100px
        setShowLanguageSection(false)
      } else if (currentScrollY < lastScrollYRef.current) {
        // Scrolling up
        setShowLanguageSection(true)
      }

      lastScrollYRef.current = currentScrollY
    }

    window.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])
  // Auto-expand sections when navigated to via hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash

      // Reset all auto-expand states
      setAutoExpandPortfolio(false)
      setAutoExpandSkills(false)
      setAutoExpandOffers(false)
      setAutoExpandWorkExperience(false)
      setAutoExpandEducation(false)
      setAutoExpandProjectHistory(false)

      // Reset background tab to default
      setBackgroundActiveTab("Work Experience")

      // Set auto-expand for the target section
      switch (hash) {
        case "#portfolio":
          // Delay for portfolio to allow layout to settle
          setTimeout(() => {
            setActiveTab("Portfolio")
            setAutoExpandPortfolio(true)
            // Manual scroll to portfolio section
            setTimeout(() => {
              const portfolioElement = document.getElementById("portfolio")
              if (portfolioElement) {
                portfolioElement.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
            }, 50)
          }, 150)
          break
        case "#skills":
          // Delay for skills to allow layout to settle
          setTimeout(() => {
            setActiveTab("Skills")
            setAutoExpandSkills(true)
            // Manual scroll to skills section
            setTimeout(() => {
              const skillsElement = document.getElementById("skills")
              if (skillsElement) {
                skillsElement.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
            }, 50)
          }, 150)
          break
        case "#offers":
          setActiveTab("Offers")
          setAutoExpandOffers(true)
          break
        case "#background":
          setActiveTab("Work Experience")
          setAutoExpandWorkExperience(true)
          setAutoExpandEducation(true)
          break
        case "#education":
          setActiveTab("Education")
          setAutoExpandWorkExperience(true)
          setAutoExpandEducation(true)
          setBackgroundActiveTab("Education")
          // Prevent default scroll behavior and manually scroll to background section
          setTimeout(() => {
            const backgroundElement = document.getElementById("background")
            if (backgroundElement) {
              backgroundElement.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
          }, 50)
          break
        case "#project-history":
          setActiveTab("Project History")
          setAutoExpandProjectHistory(true)
          break
        case "#overview":
          setActiveTab("Overview")
          break
      }
    }

    // Handle click events on specific links that need auto-expand or special handling
    const handleNavigationClick = (e: Event) => {
      const target = e.target as HTMLAnchorElement
      if (target.href && target.href.includes("#")) {
        const hash = target.href.split("#")[1]
        if (hash === "education") {
          e.preventDefault()
          window.history.pushState(null, "", "#education")
          handleHashChange()
        } else if (hash === "background") {
          e.preventDefault()
          window.history.pushState(null, "", "#background")
          handleHashChange()
        } else if (hash === "portfolio" || hash === "skills") {
          // Prevent default scroll and handle manually
          e.preventDefault()
          window.history.pushState(null, "", `#${hash}`)
          handleHashChange()
        }
      }
    }

    // Add click listeners to all navigation links
    document.addEventListener("click", handleNavigationClick)

    // Handle initial hash on load
    handleHashChange()

    // Listen for hash changes
    window.addEventListener("hashchange", handleHashChange)

    return () => {
      window.removeEventListener("hashchange", handleHashChange)
      document.removeEventListener("click", handleNavigationClick)
    }
  }, [])

  return (
    <>
      <div className="py-[50px]">
        <div className="max-w-[1440px] mx-auto px-[100px]">
          <div className="border border-gray-200 rounded-lg bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
            {isProfileLoading ? (
              /* Skeleton loading state */
              <>
                <div className="p-10 flex items-start gap-x-10">
                  <Shimmer className="size-[318px] rounded-lg shrink-0" />
                  <div className="flex-auto space-y-4 pt-2">
                    <Shimmer className="h-8 w-64" />
                    <Shimmer className="h-6 w-48" />
                    <Shimmer className="h-4 w-36" />
                    <div className="flex items-center gap-x-3 pt-2">
                      <Shimmer className="h-6 w-16 rounded-[4px]" />
                      <Shimmer className="h-4 w-20" />
                    </div>
                    <div className="space-y-3 pt-2">
                      <Shimmer className="h-4 w-52" />
                      <Shimmer className="h-4 w-60" />
                    </div>
                    <div className="flex gap-x-2 pt-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Shimmer key={i} className="h-7 w-24 rounded-full" />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="py-3 px-8 border-t border-gray-200 grid grid-cols-5 divide-x divide-gray-200 bg-[#122A4B]/[.02]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-x-2 justify-center items-center py-1">
                      <Shimmer className="h-4 w-16" />
                      <Shimmer className="h-5 w-12" />
                    </div>
                  ))}
                </div>
              </>
            ) : (
            <>
            <div className="p-10 flex items-start gap-x-10">
              <div className="flex-auto">
                <div className="flex items-center gap-x-3">
                  <Avatar className="size-[42px]">
                    <AvatarImage src="/man.jpg" alt={TEAM.name} />
                    <AvatarFallback>V6</AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-[22px] leading-7 font-bold text-dark-blue-400">
                      {TEAM.name}
                    </h1>
                    <p className="text-sm text-gray-500 font-light leading-none mt-1">
                      {TEAM.tagline}
                    </p>
                  </div>
                </div>

                <h2 className="mt-6 text-[34px] leading-[40px] font-bold text-dark-blue-400 max-w-[440px]">
                  {TEAM.headline}
                </h2>

                <div className="mt-6 flex flex-wrap gap-2 max-w-[520px]">
                  {TEAM.skills.map((skill, i) => (
                    <Badge
                      key={`${skill}-${i}`}
                      visual="gray"
                      size="lg"
                      className="text-gray-700"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>

                <div className="mt-6 flex items-center gap-x-3">
                  <Button size="md">
                    <Plus className="size-[15px]" />
                    Join Team
                  </Button>
                  <SaveButton />
                  <IconButton
                    className="text-gray-500"
                    variant="outlined"
                    visual="gray"
                    size="md"
                  >
                    <Share06 className="size-[20px]" />
                  </IconButton>
                </div>
              </div>

              <div className="shrink-0 w-[380px] relative h-[320px]">
                <div className="absolute top-0 right-4">
                  <div className="relative">
                    <Avatar className="size-[150px] border-4 border-white shadow-lg">
                      <AvatarImage
                        src={TEAM.featuredMembers[0].photo}
                        alt={TEAM.featuredMembers[0].name}
                      />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>
                    <Badge
                      visual="primary"
                      className="absolute -top-1 right-0 bg-dark-blue-400 text-white rounded-full border-none"
                    >
                      <Star className="size-3 fill-primary-500 text-primary-500" />
                      All Star
                    </Badge>
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-xs font-semibold text-dark-blue-400">
                      {TEAM.featuredMembers[0].name}
                    </p>
                    <p className="text-[10px] font-light text-gray-500">
                      {TEAM.featuredMembers[0].role}
                    </p>
                  </div>
                </div>

                <div className="absolute top-[70px] right-0">
                  <div className="relative">
                    <Avatar className="size-[80px] border-4 border-white shadow-lg">
                      <AvatarImage
                        src={TEAM.featuredMembers[1].photo}
                        alt={TEAM.featuredMembers[1].name}
                      />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>
                    <Badge
                      visual="primary"
                      className="absolute -top-1 -right-1 bg-dark-blue-400 text-white rounded-full border-none text-[9px]"
                    >
                      <Star className="size-2.5 fill-primary-500 text-primary-500" />
                      All Star
                    </Badge>
                  </div>
                  <div className="mt-1 text-center">
                    <p className="text-[10px] font-semibold text-dark-blue-400">
                      {TEAM.featuredMembers[1].name}
                    </p>
                    <p className="text-[9px] font-light text-gray-500">
                      {TEAM.featuredMembers[1].role}
                    </p>
                  </div>
                </div>

                <div className="absolute top-[170px] left-8">
                  <Avatar className="size-[80px] border-4 border-white shadow-lg">
                    <AvatarImage
                      src={TEAM.featuredMembers[2].photo}
                      alt={TEAM.featuredMembers[2].name}
                    />
                    <AvatarFallback>M</AvatarFallback>
                  </Avatar>
                  <div className="mt-1 text-center">
                    <p className="text-[10px] font-semibold text-dark-blue-400">
                      {TEAM.featuredMembers[2].name}
                    </p>
                    <p className="text-[9px] font-light text-gray-500">
                      {TEAM.featuredMembers[2].role}
                    </p>
                  </div>
                </div>

                <div className="absolute bottom-4 right-0 flex items-center gap-x-2">
                  <AvatarGroup max={4} size="sm">
                    {TEAM.otherMemberAvatars.map((src, i) => (
                      <Avatar
                        key={i}
                        size="sm"
                        className="border-2 border-white"
                      >
                        <AvatarImage src={src} alt="Member" />
                        <AvatarFallback>·</AvatarFallback>
                      </Avatar>
                    ))}
                  </AvatarGroup>
                  <span className="text-[10px] font-medium text-gray-500">
                    {TEAM.extraMemberCount} more team members
                  </span>
                </div>
              </div>
            </div>

            <div className="py-3 px-8 border-t border-gray-200 grid grid-cols-5 divide-x divide-gray-200 bg-[#122A4B]/[.02]">
              <div className="flex gap-x-2 justify-center items-center">
                <span className="text-sm font-extralight leading-none text-dark-blue-400">
                  Rate
                </span>
                <span className="text-xl font-bold leading-none text-dark-blue-400">
                  {profile?.rateMin || profile?.rateMax
                    ? <>
                        {profile.rateMin && profile.rateMax && Math.round(profile.rateMin) !== Math.round(profile.rateMax)
                          ? `$${Math.round(profile.rateMin)} - $${Math.round(profile.rateMax)}`
                          : `$${Math.round(profile?.rateMax ?? profile?.rateMin ?? 0)}`}
                        <span className="text-sm font-extralight leading-none text-dark-blue-400">
                          /hr
                        </span>
                      </>
                    : "Unknown"
                  }
                </span>
                {isEditMode && isOwnProfile && (
                  <IconButton
                    className="rounded-full text-gray-500 hover:text-gray-800"
                    variant="ghost"
                    visual="gray"
                    onClick={() => setJobTitleOpen(true)}
                  >
                    <Edit03 className="size-4" />
                  </IconButton>
                )}
              </div>
              <div className="flex gap-x-2 justify-center items-center">
                <span className="text-sm font-extralight leading-none text-dark-blue-400">
                  Client success rating
                </span>
                <span className="text-sm font-bold leading-none text-dark-blue-400">
                  {profile?.clientSuccessRating != null
                    ? `${Math.round(profile.clientSuccessRating * 100)}%`
                    : "\u2014"}
                </span>
              </div>
              <div className="flex gap-x-2 justify-center items-center">
                <span className="text-sm font-extralight leading-none text-dark-blue-400">
                  Total projects completed
                </span>
                <span className="text-sm font-bold leading-none text-dark-blue-400">
                  {(profile?.totalProjectsCompleted ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="flex gap-x-2 justify-center items-center">
                <span className="text-sm font-extralight leading-none text-dark-blue-400">
                  Average rating
                </span>
                <span className="inline-flex items-center gap-x-1 text-sm font-bold leading-none text-dark-blue-400">
                  <Star className="size-3 fill-primary-500 text-primary-500" />
                  {TEAM.averageRating}
                </span>
              </div>
              <div className="flex gap-x-2 justify-center items-center">
                <span className="text-sm font-extralight leading-none text-dark-blue-400">
                  Repeat hire rate
                </span>
                <span className="text-sm font-bold leading-none text-dark-blue-400">
                  {profile?.repeatHireRate != null
                    ? `${profile.repeatHireRate}%`
                    : "\u2014"}
                </span>
              </div>
            </div>
            </>
            )}
          </div>
        </div>

        <Tabs className="mt-6" value={activeTab} onValueChange={(val) => {
          setActiveTab(val)
          if (val === "Education") setBackgroundActiveTab("Education")
          if (val === "Work Experience") setBackgroundActiveTab("Work Experience")
        }}>
          <TabsList
            className="group/list p-0 bg-transparent data-[status=stuck]:border-b data-[status=stuck]:border-gray-200 z-50 transition duration-300 top-0 sticky block data-[status=stuck]:bg-white border-0"
            data-status={isTabsListStuck ? "stuck" : "unstuck"}
            ref={tabsListRef}
          >
            <div className="max-w-[1440px] mx-auto px-[100px]">
              <div className="contents group-data-[status=stuck]/list:pt-3 group-data-[status=stuck]/list:flex items-center max-w-[1240px] mx-auto">
                <div className="flex-auto contents group-data-[status=stuck]/list:block">
                  <div className="hidden items-center gap-x-3 group-data-[status=stuck]/list:flex">
                    <Avatar
                      className="hover:ring-0 active:ring-primary-100"
                      size="lg"
                    >
                      <AvatarImage src={profile?.avatarUrl ?? "/man.jpg"} alt={profile?.firstName ?? "User"} />
                      <AvatarFallbackIcon />
                    </Avatar>
                    <div className="flex flex-col gap-y-0.5">
                      <span className="text-lg leading-none font-bold text-dark-blue-400">
                        {profile?.firstName ?? "User"}{" "}
                        <span className="text-base font-extralight">
                          @{profile?.username ?? ""}
                        </span>
                      </span>
                      <span className="text-sm leading-none font-medium text-dark-blue-400">
                        {((profile as any)?.jobTitles?.find((j: any) => j.isDefault)?.jobTitle) ||
                          (profile as any)?.jobTitles?.[0]?.jobTitle ||
                          profile?.role ||
                          ""}
                      </span>
                    </div>
                  </div>
                  <div
                    className={cn(
                      tabsListVariants({
                        className:
                          "bg-transparent justify-start w-full group-data-[status=stuck]/list:border-b-0 group-data-[status=stuck]/list:mt-3 inline-flex",
                      })
                    )}
                  >
                    <TabsTrigger value="Portfolio" asChild>
                      <NextLink href="#portfolio">Portfolio</NextLink>
                    </TabsTrigger>
                    <TabsTrigger value="Skills" asChild>
                      <NextLink href="#skills">Skills</NextLink>
                    </TabsTrigger>
                    <TabsTrigger value="Overview" asChild>
                      <NextLink href="#overview">Overview</NextLink>
                    </TabsTrigger>
                    <TabsTrigger value="Offers" asChild>
                      <NextLink href="#offers">Offers</NextLink>
                    </TabsTrigger>
                    <TabsTrigger value="Work Experience" asChild>
                      <NextLink href="#background">Work Experience</NextLink>
                    </TabsTrigger>
                    <TabsTrigger value="Education" asChild>
                      <NextLink href="#education">Education</NextLink>
                    </TabsTrigger>
                    <TabsTrigger value="Project History" asChild>
                      <NextLink href="#project-history">
                        Project History
                      </NextLink>
                    </TabsTrigger>
                  </div>
                </div>

                <div className="space-y-3 group-data-[status=stuck]/list:block hidden">
                  <div className="flex items-center gap-x-3">
                    {isOwnProfile ? (
                      <>
                        {isEditMode ? (
                          <Button
                            variant="outlined"
                            visual="gray"
                            size="md"
                            onClick={() => setIsEditMode(false)}
                          >
                            <Eye className="size-[15px]" />
                            View as Client
                          </Button>
                        ) : (
                          <Button
                            variant="outlined"
                            visual="gray"
                            size="md"
                            onClick={() => setIsEditMode(true)}
                          >
                            <Edit03 className="size-[15px]" />
                            Edit Profile
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="md">
                                <Plus className="size-[15px]" />
                                Hire Me
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent
                              visual="white"
                              size="md"
                              className="text-gray-700 p-6 max-w-[344px] border border-gray-200 shadow-[0px_24px_48px_-12px_rgba(16,24,40,.18)]"
                              sideOffset={14}
                              side="bottom"
                            >
                              <TooltipArrow className="fill-white" />
                              <div className="flex items-center mt-3 gap-x-[9px]">
                                <Clock className="size-4" />
                                <p className="text-sm leading-none font-extralight text-dark-blue-400">
                                  {profile?.firstName ?? "This talent"}{" "}
                                  is currently{" "}
                                  <span className={`font-medium ${profile?.availability === "unavailable" ? "text-error-600" : "text-success-600"}`}>
                                    {profile?.availability === "unavailable" ? "not available" : "available"}
                                  </span>{" "}
                                  for hire
                                </p>
                              </div>

                              <Button
                                className="mt-3 group"
                                size="md"
                                variant="link"
                              >
                                View similar talent{" "}
                                <ArrowRight className="size-3 transition duration-300 group-hover:translate-x-[4px]" />
                              </Button>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <SaveButton />
                      </>
                    )}

                    <IconButton
                      className="text-gray-500"
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
                      {isEditMode && isOwnProfile ? "You are" : `${profile?.firstName ?? "Talent"} is`}{" "}
                      currently{" "}
                      <span className="text-success-600 font-bold">
                        {profile?.availability ?? "available"}
                      </span>{" "}
                      for hire
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsList>
          <div
            className="max-w-[1440px] mx-auto px-[100px] scroll-mt-[137.5px]"
            id="portfolio"
          >
            <div className="pt-6 flex gap-x-8">
              <div className="flex-auto">
                {isEditMode && isOwnProfile && (() => {
                  const steps = [
                    {
                      label: "Add Your Bio",
                      description: "Share what drives you and let clients connect on a personal level.",
                      done: !!(profile?.bio || profile?.overview),
                      action: () => setOverviewOpen(true),
                    },
                    {
                      label: "Add Your Skills",
                      description: "Let clients know what you're great at.",
                      done: (profile?.skills?.length ?? 0) > 0,
                      action: () => setSkillsOpen(true),
                    },
                    {
                      label: "Add Work Experience",
                      description: "Show clients your professional history.",
                      done: (profile?.experience?.length ?? 0) > 0,
                      action: () => { setActiveTab("Work Experience"); setBackgroundActiveTab("Work Experience"); setWorkExperienceOpen(true) },
                    },
                    {
                      label: "Add Education",
                      description: "Share your academic background.",
                      done: (profile?.education?.length ?? 0) > 0,
                      action: () => { setActiveTab("Education"); setBackgroundActiveTab("Education"); setEducationOpen(true) },
                    },
                    {
                      label: "Add Your Languages",
                      description: "Tell clients which languages you speak.",
                      done: (profile?.languages?.length ?? 0) > 0,
                      action: () => setLanguagesOpen(true),
                    },
                    {
                      label: "Set Your Rate",
                      description: "Help clients understand your pricing.",
                      done: !!(profile?.rateMin || profile?.rateMax),
                      action: () => setJobTitleOpen(true),
                    },
                  ]
                  const completedCount = steps.filter((s) => s.done).length
                  const completionPercent = Math.round((completedCount / steps.length) * 100)
                  const nextStep = steps.find((s) => !s.done)
                  if (completionPercent === 100) return null
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                      <div className="flex items-start">
                        <div className="flex-auto">
                          <h1 className="text-[20px] leading-none font-bold text-dark-blue-400">
                            Ready to Get Hired?
                          </h1>
                          <p className="text-base font-light mt-1 text-dark-blue-400">
                            Clients are 4x more likely to hire users with completed profiles!
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-x-3">
                        <div className="text-sm leading-5 font-medium text-dark-blue-400">
                          {completionPercent}%
                        </div>
                        <div className="flex flex-auto items-center gap-x-1">
                          {steps.map((step, i) => (
                            <Progress
                              key={i}
                              className="flex-auto first:rounded-l-full last:rounded-r-full [&:not(:first-child)]:rounded-l-none [&:not(:last-child)]:rounded-r-none"
                              value={step.done ? 100 : 0}
                              bubble={false}
                            />
                          ))}
                        </div>
                      </div>

                      {nextStep && (
                        <div className="mt-3">
                          <div className="rounded-lg px-4 py-3 flex items-center gap-x-3 bg-white border border-gray-300 shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)]">
                            <div className="rounded-full border border-gray-300 size-11 shrink-0 inline-flex items-center justify-center">
                              <User className="size-5" />
                            </div>
                            <div className="flex-auto">
                              <h1 className="text-base leading-6 font-bold text-dark-blue-400">
                                Next up: {nextStep.label}
                              </h1>
                              <p className="text-xs leading-none text-gray-500">
                                {nextStep.description}
                              </p>
                            </div>
                            <Button
                              className="text-xs leading-5 font-semibold text-primary-500 border border-primary-500 bg-transparent rounded-full hover:bg-primary-500 hover:text-white"
                              onClick={nextStep.action}
                            >
                              Finish This Step
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                <ShowMoreLessRoot
                  value={autoExpandPortfolio}
                  onValueChange={setAutoExpandPortfolio}
                >
                  {({ isShowing, setIsShowing, ref, scrollHeight }) => (
                    <>
                      <div
                        className="grid grid-cols-3 gap-6 overflow-hidden [interpolate-size:allow-keywords] transition-[height] duration-500"
                        ref={ref}
                        style={{
                          height: isShowing
                            ? "auto"
                            : scrollHeight
                              ? toPxIfNumber(scrollHeight)
                              : "auto",
                        }}
                      >
                        <ShowMoreLess max={3}>
                          <article className="group relative rounded-lg overflow-hidden h-[200px] cursor-pointer">
                            <NextImage
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                            <div className="p-[15px] inset-0 absolute flex justify-end items-start flex-col bg-black/0 group-hover:bg-black/50 transition-all duration-300">
                              <h1 className="text-sm leading-none font-medium text-white translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-100">
                                Mobile Finance Application
                              </h1>

                              <div className="mt-2 flex flex-wrap gap-[6.79px] translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-200">
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                              </div>
                            </div>
                          </article>
                          <article className="group relative rounded-lg overflow-hidden h-[200px] cursor-pointer">
                            <NextImage
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                            <div className="p-[15px] inset-0 absolute flex justify-end items-start flex-col bg-black/0 group-hover:bg-black/50 transition-all duration-300">
                              <h1 className="text-sm leading-none font-medium text-white translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-100">
                                Mobile Finance Application
                              </h1>

                              <div className="mt-2 flex flex-wrap gap-[6.79px] translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-200">
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                              </div>
                            </div>
                          </article>
                          <article className="group relative rounded-lg overflow-hidden h-[200px] cursor-pointer">
                            <NextImage
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                            <div className="p-[15px] inset-0 absolute flex justify-end items-start flex-col bg-black/0 group-hover:bg-black/50 transition-all duration-300">
                              <h1 className="text-sm leading-none font-medium text-white translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-100">
                                Mobile Finance Application
                              </h1>

                              <div className="mt-2 flex flex-wrap gap-[6.79px] translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-200">
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                              </div>
                            </div>
                          </article>
                          <article className="group relative rounded-lg overflow-hidden h-[200px] cursor-pointer">
                            <NextImage
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                            <div className="p-[15px] inset-0 absolute flex justify-end items-start flex-col bg-black/0 group-hover:bg-black/50 transition-all duration-300">
                              <h1 className="text-sm leading-none font-medium text-white translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-100">
                                Mobile Finance Application
                              </h1>

                              <div className="mt-2 flex flex-wrap gap-[6.79px] translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-200">
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                              </div>
                            </div>
                          </article>
                          <article className="group relative rounded-lg overflow-hidden h-[200px] cursor-pointer">
                            <NextImage
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                            <div className="p-[15px] inset-0 absolute flex justify-end items-start flex-col bg-black/0 group-hover:bg-black/50 transition-all duration-300">
                              <h1 className="text-sm leading-none font-medium text-white translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-100">
                                Mobile Finance Application
                              </h1>

                              <div className="mt-2 flex flex-wrap gap-[6.79px] translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-200">
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                              </div>
                            </div>
                          </article>
                          <article className="group relative rounded-lg overflow-hidden h-[200px] cursor-pointer">
                            <NextImage
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                            <div className="p-[15px] inset-0 absolute flex justify-end items-start flex-col bg-black/0 group-hover:bg-black/50 transition-all duration-300">
                              <h1 className="text-sm leading-none font-medium text-white translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-100">
                                Mobile Finance Application
                              </h1>

                              <div className="mt-2 flex flex-wrap gap-[6.79px] translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-200">
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                              </div>
                            </div>
                          </article>
                          <article className="group relative rounded-lg overflow-hidden h-[200px] cursor-pointer">
                            <NextImage
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                            <div className="p-[15px] inset-0 absolute flex justify-end items-start flex-col bg-black/0 group-hover:bg-black/50 transition-all duration-300">
                              <h1 className="text-sm leading-none font-medium text-white translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-100">
                                Mobile Finance Application
                              </h1>

                              <div className="mt-2 flex flex-wrap gap-[6.79px] translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-200">
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                              </div>
                            </div>
                          </article>
                          <article className="group relative rounded-lg overflow-hidden h-[200px] cursor-pointer">
                            <NextImage
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                              src="/dashboard.png"
                              alt="Dashboard"
                              fill
                              sizes="33vw"
                            />
                            <div className="p-[15px] inset-0 absolute flex justify-end items-start flex-col bg-black/0 group-hover:bg-black/50 transition-all duration-300">
                              <h1 className="text-sm leading-none font-medium text-white translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-100">
                                Mobile Finance Application
                              </h1>

                              <div className="mt-2 flex flex-wrap gap-[6.79px] translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 delay-200">
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                                <Badge
                                  className="text-white bg-white/20"
                                  visual="gray"
                                >
                                  UI/UX design
                                </Badge>
                              </div>
                            </div>
                          </article>
                        </ShowMoreLess>
                      </div>

                      <div className="my-6">
                        <div className="flex items-center gap-x-1">
                          <span className="flex-auto inline-block h-px bg-gray-200" />
                          <Button
                            variant="link"
                            visual="gray"
                            onClick={() => setIsShowing((prev) => !prev)}
                          >
                            {isShowing ? "View Less" : "View More"}
                          </Button>
                          <span className="flex-auto inline-block h-px bg-gray-200" />
                        </div>
                      </div>
                    </>
                  )}
                </ShowMoreLessRoot>

                <LazySection minHeight={300}>
                <div
                  className="p-6 bg-white border border-gray-200 rounded-lg shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] scroll-mt-[137.5px]"
                  id="skills"
                >
                  <div className="flex items-center justify-between">
                    <h1 className="text-xl leading-none font-bold text-dark-blue-400">
                      Skills
                    </h1>
                    {isEditMode && isOwnProfile && (
                      <IconButton
                        className="rounded-full text-gray-500 hover:text-gray-800"
                        variant="ghost"
                        visual="gray"
                        onClick={() => setSkillsOpen(true)}
                      >
                        <Edit03 className="size-4" />
                      </IconButton>
                    )}
                  </div>

                  <ShowMoreLessRoot
                    value={autoExpandSkills}
                    onValueChange={setAutoExpandSkills}
                  >
                    {({ isShowing, setIsShowing, ref, scrollHeight }) => (
                      <>
                        <div
                          ref={ref}
                          className="[interpolate-size:allow-keywords] flex gap-3 mt-6 flex-wrap overflow-hidden transition-[height] duration-300"
                          style={{
                            height: isShowing
                              ? "auto"
                              : scrollHeight
                                ? toPxIfNumber(scrollHeight)
                                : "auto",
                          }}
                        >
                          <ShowMoreLess max={22}>
                            {(profile?.skills && profile.skills.length > 0)
                              ? profile.skills.map((skill) => (
                                  <Badge
                                    key={skill.id}
                                    className="text-gray-700"
                                    visual="gray"
                                    size="lg"
                                  >
                                    {skill.name}
                                  </Badge>
                                ))
                              : (
                                <>
                                  <Badge className="text-gray-700" visual="gray" size="lg">Typescript</Badge>
                                  <Badge className="text-gray-700" visual="gray" size="lg">React.js</Badge>
                                  <Badge className="text-gray-700" visual="gray" size="lg">Tailwind CSS</Badge>
                                  <Badge className="text-gray-700" visual="gray" size="lg">Next.js</Badge>
                                </>
                              )
                            }
                          </ShowMoreLess>
                        </div>

                        <div className="mt-6 flex items-center justify-center">
                          <Button
                            variant="link"
                            visual="gray"
                            onClick={() => setIsShowing((prev) => !prev)}
                          >
                            {isShowing ? "View Less" : "View More"}
                          </Button>
                        </div>
                      </>
                    )}
                  </ShowMoreLessRoot>
                </div>
                </LazySection>

                <LazySection minHeight={300}>
                <div className="mt-6 scroll-mt-[137.5px]" id="overview">
                  <div className="p-6 rounded-t-lg bg-white border border-gray-200 space-y-6">
                    <div className="flex items-center justify-between">
                      <h1 className="text-xl font-bold text-dark-blue-400 leading-none">
                        Overview
                      </h1>
                      {isEditMode && isOwnProfile && (
                        <IconButton
                          className="rounded-full text-gray-500 hover:text-gray-800"
                          variant="ghost"
                          visual="gray"
                          onClick={() => setOverviewOpen(true)}
                        >
                          <Edit03 className="size-4" />
                        </IconButton>
                      )}
                    </div>

                    {(() => {
                      const bioText = profile?.bio || profile?.overview || "No bio added yet."
                      return (
                        <LineClampText
                          text={bioText}
                          lines={5}
                          className="mt-6 text-sm font-extralight text-gray-700 leading-relaxed"
                          toggleClassName="mt-6"
                          expandLabel="View More"
                          collapseLabel="View Less"
                        />
                      )
                    })()}
                  </div>

                  <Tabs
                    defaultValue="Featured Clients"
                    className="p-6 h-[134px] border-x border-b rounded-b-lg border-gray-200 bg-white"
                  >
                    <RadixTabs.List className="flex items-center gap-x-3">
                      <TabsTrigger
                        variant="unstyled"
                        showUnderline={false}
                        value="Featured Clients"
                        className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                      >
                        Featured Clients
                      </TabsTrigger>
                      <TabsTrigger
                        variant="unstyled"
                        showUnderline={false}
                        value="Certifications"
                        className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                      >
                        Certifications
                      </TabsTrigger>
                      <TabsTrigger
                        variant="unstyled"
                        showUnderline={false}
                        value="Industry Expertise"
                        className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                      >
                        Industry Expertise
                      </TabsTrigger>
                    </RadixTabs.List>

                    <TabsContent value="Featured Clients">
                      <div className="pt-6 flex items-center gap-x-6">
                        <Dropbox />
                        <Microsoft />
                        <Adobe />
                        <Nasdaq />
                      </div>
                    </TabsContent>
                    <TabsContent value="Certifications">
                      <div className="pt-6 flex items-center gap-x-6">
                        <div className="inline-flex text-sm leading-none font-medium text-dark-blue-400 items-center gap-x-1.5">
                          <AdobeBrand className="size-7" />
                          Adobe Certified Professional
                        </div>
                        <div className="inline-flex text-sm leading-none font-medium text-dark-blue-400 items-center gap-x-1.5">
                          <GoogleDefault className="size-6" />
                          Google UX Design Certificate
                        </div>
                        <div className="inline-flex text-sm leading-none font-medium text-dark-blue-400 items-center gap-x-1.5">
                          <WordpressBrand className="size-7" />
                          Certified Wordpress Developer
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="Industry Expertise">
                      <div className="pt-6 flex items-center gap-x-3">
                        <Badge size="lg" visual="gray">
                          Real Estate
                        </Badge>
                        <Badge size="lg" visual="gray">
                          Finance
                        </Badge>
                        <Badge size="lg" visual="gray">
                          Accounting
                        </Badge>
                        <Badge size="lg" visual="gray">
                          Insurance
                        </Badge>
                        <Badge size="lg" visual="gray">
                          Music
                        </Badge>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
                </LazySection>

                <LazySection minHeight={400}>
                <div className="mt-6 scroll-mt-[137.5px]" id="offers">
                  <h1 className="text-xl font-bold leading-none text-dark-blue-400">
                    My Offers
                  </h1>

                  <Tabs defaultValue="Projects" className="mt-6">
                    <div className="flex items-center justify-between">
                      <RadixTabs.List className="inline-flex items-center gap-x-3">
                        <TabsTrigger
                          variant="unstyled"
                          showUnderline={false}
                          value="Projects"
                          className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                        >
                          Projects
                        </TabsTrigger>
                        <TabsTrigger
                          variant="unstyled"
                          showUnderline={false}
                          value="Services"
                          className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                        >
                          Services
                        </TabsTrigger>
                      </RadixTabs.List>

                      <div className="inline-flex items-center gap-x-6">
                        {isEditMode && isOwnProfile && (
                          <Button variant="link" visual="gray" onClick={() => setOffersOpen(true)}>
                            <Edit03 className="size-[15px]" /> Edit Offers
                          </Button>
                        )}
                        <RadixTabs.List className="inline-flex items-center gap-x-3">
                          <TabsTrigger
                            variant="unstyled"
                            showUnderline={false}
                            value="Frontend"
                            className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                          >
                            Frontend
                          </TabsTrigger>
                          <TabsTrigger
                            variant="unstyled"
                            showUnderline={false}
                            value="Backend"
                            className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                          >
                            Backend
                          </TabsTrigger>
                          <TabsTrigger
                            variant="unstyled"
                            showUnderline={false}
                            value="Database"
                            className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                          >
                            Database
                          </TabsTrigger>
                        </RadixTabs.List>

                        <Button className="group" variant="link" visual="gray">
                          View All{" "}
                          <ArrowRight className="size-[15px] transition duration-300 group-hover:translate-x-[4px]" />
                        </Button>
                      </div>
                    </div>

                    <TabsContent value="Frontend">
                      <ShowMoreLessRoot
                        value={autoExpandOffers}
                        onValueChange={setAutoExpandOffers}
                      >
                        {({ setIsShowing, isShowing, ref, scrollHeight }) => (
                          <>
                            <div
                              ref={ref}
                              className="[interpolate-size:allow-keywords] mt-6 overflow-hidden transition-[height] duration-300 grid grid-cols-3 gap-5"
                              style={{
                                height: isShowing
                                  ? "auto"
                                  : scrollHeight
                                    ? toPxIfNumber(scrollHeight)
                                    : "auto",
                              }}
                            >
                              <ShowMoreLessComp max={3}>
                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                    <NextImage
                                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                      src="/dashboard.png"
                                      alt="Frontend Development"
                                      fill
                                      sizes="33vw"
                                    />
                                  </div>

                                  <div className="mt-3 flex items-start gap-x-3">
                                    <NextLink
                                      href="#"
                                      className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                                    >
                                      React Dashboard Development
                                    </NextLink>

                                    <div className="inline-flex items-center gap-x-1">
                                      <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                      <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                        4.8{" "}
                                        <span className="font-extralight">
                                          (12)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    Modern React dashboard with TypeScript,
                                    Tailwind CSS, and advanced data
                                    visualization components.
                                  </p>

                                  <div className="mt-[14.5px] flex flex-col gap-y-3">
                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Clock className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        Starting from 8 weeks
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Money className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        $35,000 budget
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mt-5 flex items-end justify-between">
                                    <TooltipProvider delayDuration={0}>
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
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
                                                  </Avatar>

                                                  <div className="flex flex-col flex-auto">
                                                    <div className="flex items-center gap-x-0.5">
                                                      <span className="text-xs leading-5 font-semibold text-white">
                                                        Sarah
                                                      </span>
                                                      <span className="text-[10px] leading-none font-light text-white">
                                                        @frontendsarah
                                                      </span>
                                                    </div>
                                                    <span className="text-[10px] font-light text-white">
                                                      Frontend Developer
                                                    </span>
                                                  </div>
                                                </div>

                                                <span className="text-sm font-semibold text-white leading-5">
                                                  $85{" "}
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

                                  </div>
                                </article>

                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                    <NextImage
                                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                      src="/dashboard.png"
                                      alt="Frontend Development"
                                      fill
                                      sizes="33vw"
                                    />
                                  </div>

                                  <div className="mt-3 flex items-start gap-x-3">
                                    <NextLink
                                      href="#"
                                      className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                                    >
                                      Vue.js E-commerce Platform
                                    </NextLink>

                                    <div className="inline-flex items-center gap-x-1">
                                      <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                      <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                        4.7{" "}
                                        <span className="font-extralight">
                                          (20)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    Complete e-commerce solution built with
                                    Vue.js 3, Nuxt.js, and modern payment
                                    integration.
                                  </p>

                                  <div className="mt-[14.5px] flex flex-col gap-y-3">
                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Clock className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        Starting from 10 weeks
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Money className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        $45,000 budget
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mt-5 flex items-end justify-between">
                                    <TooltipProvider delayDuration={0}>
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
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
                                                  </Avatar>

                                                  <div className="flex flex-col flex-auto">
                                                    <div className="flex items-center gap-x-0.5">
                                                      <span className="text-xs leading-5 font-semibold text-white">
                                                        Sarah
                                                      </span>
                                                      <span className="text-[10px] leading-none font-light text-white">
                                                        @frontendsarah
                                                      </span>
                                                    </div>
                                                    <span className="text-[10px] font-light text-white">
                                                      Frontend Developer
                                                    </span>
                                                  </div>
                                                </div>

                                                <span className="text-sm font-semibold text-white leading-5">
                                                  $85{" "}
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
                                  </div>
                                </article>

                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                    <NextImage
                                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                      src="/dashboard.png"
                                      alt="Frontend Development"
                                      fill
                                      sizes="33vw"
                                    />
                                  </div>

                                  <div className="mt-3 flex items-start gap-x-3">
                                    <NextLink
                                      href="#"
                                      className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                                    >
                                      Angular Enterprise App
                                    </NextLink>

                                    <div className="inline-flex items-center gap-x-1">
                                      <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                      <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                        4.9{" "}
                                        <span className="font-extralight">
                                          (8)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    Large-scale Angular application with NgRx
                                    state management and enterprise-grade
                                    architecture.
                                  </p>

                                  <div className="mt-[14.5px] flex flex-col gap-y-3">
                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Clock className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        Starting from 14 weeks
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Money className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        $60,000 budget
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mt-5 flex items-end justify-between">
                                    <TooltipProvider delayDuration={0}>
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
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
                                                  </Avatar>

                                                  <div className="flex flex-col flex-auto">
                                                    <div className="flex items-center gap-x-0.5">
                                                      <span className="text-xs leading-5 font-semibold text-white">
                                                        Sarah
                                                      </span>
                                                      <span className="text-[10px] leading-none font-light text-white">
                                                        @frontendsarah
                                                      </span>
                                                    </div>
                                                    <span className="text-[10px] font-light text-white">
                                                      Frontend Developer
                                                    </span>
                                                  </div>
                                                </div>

                                                <span className="text-sm font-semibold text-white leading-5">
                                                  $85{" "}
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
                                  </div>
                                </article>
                              </ShowMoreLessComp>
                            </div>

                            <div className="mt-5 flex justify-center">
                              <Button
                                size="md"
                                visual="gray"
                                variant="outlined"
                                className="bg-white"
                                onClick={() => setIsShowing(!isShowing)}
                              >
                                {isShowing ? "Show Less" : "Show More"}
                              </Button>
                            </div>
                          </>
                        )}
                      </ShowMoreLessRoot>
                    </TabsContent>

                    <TabsContent value="Backend">
                      <ShowMoreLessRoot
                        value={autoExpandOffers}
                        onValueChange={setAutoExpandOffers}
                      >
                        {({ setIsShowing, isShowing, ref, scrollHeight }) => (
                          <>
                            <div
                              ref={ref}
                              className="[interpolate-size:allow-keywords] mt-6 overflow-hidden transition-[height] duration-300 grid grid-cols-3 gap-5"
                              style={{
                                height: isShowing
                                  ? "auto"
                                  : scrollHeight
                                    ? toPxIfNumber(scrollHeight)
                                    : "auto",
                              }}
                            >
                              <ShowMoreLessComp max={3}>
                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                    <NextImage
                                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                      src="/dashboard.png"
                                      alt="Backend Development"
                                      fill
                                      sizes="33vw"
                                    />
                                  </div>

                                  <div className="mt-3 flex items-start gap-x-3">
                                    <NextLink
                                      href="#"
                                      className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                                    >
                                      Node.js API Development
                                    </NextLink>

                                    <div className="inline-flex items-center gap-x-1">
                                      <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                      <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                        4.9{" "}
                                        <span className="font-extralight">
                                          (15)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    RESTful API development with Node.js,
                                    Express, and MongoDB. Includes
                                    authentication and real-time features.
                                  </p>

                                  <div className="mt-[14.5px] flex flex-col gap-y-3">
                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Clock className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        Starting from 10 weeks
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Money className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        $40,000 budget
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mt-5 flex items-end justify-between">
                                    <TooltipProvider delayDuration={0}>
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
                                              <AvatarImage
                                                src="/man.jpg"
                                                alt="Man"
                                              />
                                              <AvatarFallback>M</AvatarFallback>
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
                                                      src="/man.jpg"
                                                      alt="Man"
                                                    />
                                                    <AvatarFallback>
                                                      M
                                                    </AvatarFallback>
                                                  </Avatar>

                                                  <div className="flex flex-col flex-auto">
                                                    <div className="flex items-center gap-x-0.5">
                                                      <span className="text-xs leading-5 font-semibold text-white">
                                                        Mike
                                                      </span>
                                                      <span className="text-[10px] leading-none font-light text-white">
                                                        @backendmike
                                                      </span>
                                                    </div>
                                                    <span className="text-[10px] font-light text-white">
                                                      Backend Developer
                                                    </span>
                                                  </div>
                                                </div>

                                                <span className="text-sm font-semibold text-white leading-5">
                                                  $90{" "}
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
                                  </div>
                                </article>

                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                    <NextImage
                                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                      src="/dashboard.png"
                                      alt="Backend Development"
                                      fill
                                      sizes="33vw"
                                    />
                                  </div>

                                  <div className="mt-3 flex items-start gap-x-3">
                                    <NextLink
                                      href="#"
                                      className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                                    >
                                      Python Django Framework
                                    </NextLink>

                                    <div className="inline-flex items-center gap-x-1">
                                      <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                      <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                        4.7{" "}
                                        <span className="font-extralight">
                                          (18)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    Full-stack web application development using
                                    Django framework with PostgreSQL database
                                    integration.
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

                                  <div className="mt-5 flex items-end justify-between">
                                    <TooltipProvider delayDuration={0}>
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
                                              <AvatarImage
                                                src="/man.jpg"
                                                alt="Man"
                                              />
                                              <AvatarFallback>M</AvatarFallback>
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
                                                      src="/man.jpg"
                                                      alt="Man"
                                                    />
                                                    <AvatarFallback>
                                                      M
                                                    </AvatarFallback>
                                                  </Avatar>

                                                  <div className="flex flex-col flex-auto">
                                                    <div className="flex items-center gap-x-0.5">
                                                      <span className="text-xs leading-5 font-semibold text-white">
                                                        Mike
                                                      </span>
                                                      <span className="text-[10px] leading-none font-light text-white">
                                                        @backendmike
                                                      </span>
                                                    </div>
                                                    <span className="text-[10px] font-light text-white">
                                                      Backend Developer
                                                    </span>
                                                  </div>
                                                </div>

                                                <span className="text-sm font-semibold text-white leading-5">
                                                  $90{" "}
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
                                  </div>
                                </article>

                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                    <NextImage
                                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                      src="/dashboard.png"
                                      alt="Backend Development"
                                      fill
                                      sizes="33vw"
                                    />
                                  </div>

                                  <div className="mt-3 flex items-start gap-x-3">
                                    <NextLink
                                      href="#"
                                      className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                                    >
                                      Microservices Architecture
                                    </NextLink>

                                    <div className="inline-flex items-center gap-x-1">
                                      <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                      <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                        4.8{" "}
                                        <span className="font-extralight">
                                          (22)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    Scalable microservices architecture design
                                    and implementation with Docker, Kubernetes,
                                    and service mesh.
                                  </p>

                                  <div className="mt-[14.5px] flex flex-col gap-y-3">
                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Clock className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        Starting from 16 weeks
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Money className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        $75,000 budget
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mt-5 flex items-end justify-between">
                                    <TooltipProvider delayDuration={0}>
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
                                              <AvatarImage
                                                src="/man.jpg"
                                                alt="Man"
                                              />
                                              <AvatarFallback>M</AvatarFallback>
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
                                                      src="/man.jpg"
                                                      alt="Man"
                                                    />
                                                    <AvatarFallback>
                                                      M
                                                    </AvatarFallback>
                                                  </Avatar>

                                                  <div className="flex flex-col flex-auto">
                                                    <div className="flex items-center gap-x-0.5">
                                                      <span className="text-xs leading-5 font-semibold text-white">
                                                        Mike
                                                      </span>
                                                      <span className="text-[10px] leading-none font-light text-white">
                                                        @backendmike
                                                      </span>
                                                    </div>
                                                    <span className="text-[10px] font-light text-white">
                                                      Backend Developer
                                                    </span>
                                                  </div>
                                                </div>

                                                <span className="text-sm font-semibold text-white leading-5">
                                                  $90{" "}
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
                                  </div>
                                </article>
                              </ShowMoreLessComp>
                            </div>

                            <div className="mt-5 flex justify-center">
                              <Button
                                size="md"
                                visual="gray"
                                variant="outlined"
                                className="bg-white"
                                onClick={() => setIsShowing(!isShowing)}
                              >
                                {isShowing ? "Show Less" : "Show More"}
                              </Button>
                            </div>
                          </>
                        )}
                      </ShowMoreLessRoot>
                    </TabsContent>

                    <TabsContent value="Database">
                      <ShowMoreLessRoot
                        value={autoExpandOffers}
                        onValueChange={setAutoExpandOffers}
                      >
                        {({ setIsShowing, isShowing, ref, scrollHeight }) => (
                          <>
                            <div
                              ref={ref}
                              className="[interpolate-size:allow-keywords] mt-6 overflow-hidden transition-[height] duration-300 grid grid-cols-3 gap-5"
                              style={{
                                height: isShowing
                                  ? "auto"
                                  : scrollHeight
                                    ? toPxIfNumber(scrollHeight)
                                    : "auto",
                              }}
                            >
                              <ShowMoreLessComp max={3}>
                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                    <NextImage
                                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                      src="/dashboard.png"
                                      alt="Database Development"
                                      fill
                                      sizes="33vw"
                                    />
                                  </div>

                                  <div className="mt-3 flex items-start gap-x-3">
                                    <NextLink
                                      href="#"
                                      className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                                    >
                                      PostgreSQL Database Design
                                    </NextLink>

                                    <div className="inline-flex items-center gap-x-1">
                                      <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                      <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                        4.9{" "}
                                        <span className="font-extralight">
                                          (25)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    Professional database design and
                                    optimization for PostgreSQL. Includes
                                    performance tuning and backup strategies.
                                  </p>

                                  <div className="mt-[14.5px] flex flex-col gap-y-3">
                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Clock className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        Starting from 8 weeks
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Money className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        $30,000 budget
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mt-5 flex items-end justify-between">
                                    <TooltipProvider delayDuration={0}>
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
                                              <AvatarImage
                                                src="/woman2.jpg"
                                                alt="Woman2"
                                              />
                                              <AvatarFallback>A</AvatarFallback>
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
                                                      src="/woman2.jpg"
                                                      alt="Woman2"
                                                    />
                                                    <AvatarFallback>
                                                      A
                                                    </AvatarFallback>
                                                  </Avatar>

                                                  <div className="flex flex-col flex-auto">
                                                    <div className="flex items-center gap-x-0.5">
                                                      <span className="text-xs leading-5 font-semibold text-white">
                                                        Anna
                                                      </span>
                                                      <span className="text-[10px] leading-none font-light text-white">
                                                        @databaseanna
                                                      </span>
                                                    </div>
                                                    <span className="text-[10px] font-light text-white">
                                                      Database Engineer
                                                    </span>
                                                  </div>
                                                </div>

                                                <span className="text-sm font-semibold text-white leading-5">
                                                  $95{" "}
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
                                  </div>
                                </article>

                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                    <NextImage
                                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                      src="/dashboard.png"
                                      alt="Database Development"
                                      fill
                                      sizes="33vw"
                                    />
                                  </div>

                                  <div className="mt-3 flex items-start gap-x-3">
                                    <NextLink
                                      href="#"
                                      className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                                    >
                                      MongoDB NoSQL Solutions
                                    </NextLink>

                                    <div className="inline-flex items-center gap-x-1">
                                      <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                      <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                        4.6{" "}
                                        <span className="font-extralight">
                                          (19)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    NoSQL database design and implementation
                                    with MongoDB. Includes data modeling and
                                    aggregation pipeline optimization.
                                  </p>

                                  <div className="mt-[14.5px] flex flex-col gap-y-3">
                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Clock className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        Starting from 6 weeks
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Money className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        $25,000 budget
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mt-5 flex items-end justify-between">
                                    <TooltipProvider delayDuration={0}>
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
                                              <AvatarImage
                                                src="/woman2.jpg"
                                                alt="Woman2"
                                              />
                                              <AvatarFallback>A</AvatarFallback>
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
                                                      src="/woman2.jpg"
                                                      alt="Woman2"
                                                    />
                                                    <AvatarFallback>
                                                      A
                                                    </AvatarFallback>
                                                  </Avatar>

                                                  <div className="flex flex-col flex-auto">
                                                    <div className="flex items-center gap-x-0.5">
                                                      <span className="text-xs leading-5 font-semibold text-white">
                                                        Anna
                                                      </span>
                                                      <span className="text-[10px] leading-none font-light text-white">
                                                        @databaseanna
                                                      </span>
                                                    </div>
                                                    <span className="text-[10px] font-light text-white">
                                                      Database Engineer
                                                    </span>
                                                  </div>
                                                </div>

                                                <span className="text-sm font-semibold text-white leading-5">
                                                  $95{" "}
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
                                  </div>
                                </article>

                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                    <NextImage
                                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                      src="/dashboard.png"
                                      alt="Database Development"
                                      fill
                                      sizes="33vw"
                                    />
                                  </div>

                                  <div className="mt-3 flex items-start gap-x-3">
                                    <NextLink
                                      href="#"
                                      className="focus-visible:outline-none font-bold flex-auto text-base leading-none text-dark-blue-400 hover:underline"
                                    >
                                      Redis Cache Implementation
                                    </NextLink>

                                    <div className="inline-flex items-center gap-x-1">
                                      <Star className="size-[15px] text-primary-500 fill-primary-500" />
                                      <span className="inline-flex items-center gap-x-1 text-sm leading-none text-dark-blue-400 font-medium">
                                        4.8{" "}
                                        <span className="font-extralight">
                                          (14)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    High-performance caching solutions using
                                    Redis. Includes session management and
                                    real-time data processing.
                                  </p>

                                  <div className="mt-[14.5px] flex flex-col gap-y-3">
                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Clock className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        Starting from 4 weeks
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Money className="size-[18px] shrink-0 text-primary-500" />
                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        $18,000 budget
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mt-5 flex items-end justify-between">
                                    <TooltipProvider delayDuration={0}>
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
                                              <AvatarImage
                                                src="/woman2.jpg"
                                                alt="Woman2"
                                              />
                                              <AvatarFallback>A</AvatarFallback>
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
                                                      src="/woman2.jpg"
                                                      alt="Woman2"
                                                    />
                                                    <AvatarFallback>
                                                      A
                                                    </AvatarFallback>
                                                  </Avatar>

                                                  <div className="flex flex-col flex-auto">
                                                    <div className="flex items-center gap-x-0.5">
                                                      <span className="text-xs leading-5 font-semibold text-white">
                                                        Anna
                                                      </span>
                                                      <span className="text-[10px] leading-none font-light text-white">
                                                        @databaseanna
                                                      </span>
                                                    </div>
                                                    <span className="text-[10px] font-light text-white">
                                                      Database Engineer
                                                    </span>
                                                  </div>
                                                </div>

                                                <span className="text-sm font-semibold text-white leading-5">
                                                  $95{" "}
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
                                  </div>
                                </article>
                              </ShowMoreLessComp>
                            </div>

                            <div className="mt-5 flex justify-center">
                              <Button
                                size="md"
                                visual="gray"
                                variant="outlined"
                                className="bg-white"
                                onClick={() => setIsShowing(!isShowing)}
                              >
                                {isShowing ? "Show Less" : "Show More"}
                              </Button>
                            </div>
                          </>
                        )}
                      </ShowMoreLessRoot>
                    </TabsContent>

                    <TabsContent value="Projects">
                      <ShowMoreLessRoot
                        value={autoExpandOffers}
                        onValueChange={setAutoExpandOffers}
                      >
                        {({ setIsShowing, isShowing, ref, scrollHeight }) => (
                          <>
                            <div
                              ref={ref}
                              className="[interpolate-size:allow-keywords] mt-6 overflow-hidden transition-[height] duration-300 grid grid-cols-3 gap-5"
                              style={{
                                height: isShowing
                                  ? "auto"
                                  : scrollHeight
                                    ? toPxIfNumber(scrollHeight)
                                    : "auto",
                              }}
                            >
                              <ShowMoreLessComp max={3}>
                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
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
                                        4.9{" "}
                                        <span className="font-extralight">
                                          (5)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    Brief Description of the project. Lorem
                                    ipsum dolor sit amet, consectetur adipiscing
                                    elit, sed do eiusmod tempor incididunt.
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

                                  <div className="mt-5 flex items-end justify-between">
                                    <TooltipProvider delayDuration={0}>
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
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                        <TooltipProvider delayDuration={0}>
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
                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
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
                                        4.9{" "}
                                        <span className="font-extralight">
                                          (5)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    Brief Description of the project. Lorem
                                    ipsum dolor sit amet, consectetur adipiscing
                                    elit, sed do eiusmod tempor incididunt.
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

                                  <div className="mt-5 flex items-end justify-between">
                                    <TooltipProvider delayDuration={0}>
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
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                        <TooltipProvider delayDuration={0}>
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
                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
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
                                        4.9{" "}
                                        <span className="font-extralight">
                                          (5)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    Brief Description of the project. Lorem
                                    ipsum dolor sit amet, consectetur adipiscing
                                    elit, sed do eiusmod tempor incididunt.
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

                                  <div className="mt-5 flex items-end justify-between">
                                    <TooltipProvider delayDuration={0}>
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
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                        <TooltipProvider delayDuration={0}>
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
                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
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
                                        4.9{" "}
                                        <span className="font-extralight">
                                          (5)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    Brief Description of the project. Lorem
                                    ipsum dolor sit amet, consectetur adipiscing
                                    elit, sed do eiusmod tempor incididunt.
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

                                  <div className="mt-5 flex items-end justify-between">
                                    <TooltipProvider delayDuration={0}>
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
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                        <TooltipProvider delayDuration={0}>
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
                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
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
                                        4.9{" "}
                                        <span className="font-extralight">
                                          (5)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    Brief Description of the project. Lorem
                                    ipsum dolor sit amet, consectetur adipiscing
                                    elit, sed do eiusmod tempor incididunt.
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

                                  <div className="mt-5 flex items-end justify-between">
                                    <TooltipProvider delayDuration={0}>
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
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                        <TooltipProvider delayDuration={0}>
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
                              </ShowMoreLessComp>
                            </div>

                            <div className="my-6">
                              <div className="flex items-center gap-x-1">
                                <span className="flex-auto inline-block h-px bg-gray-200" />
                                <Button
                                  variant="link"
                                  visual="gray"
                                  onClick={() => setIsShowing((prev) => !prev)}
                                >
                                  {isShowing ? "View Less" : "View More"}
                                </Button>
                                <span className="flex-auto inline-block h-px bg-gray-200" />
                              </div>
                            </div>
                          </>
                        )}
                      </ShowMoreLessRoot>
                    </TabsContent>

                    <TabsContent value="Services">
                      <ShowMoreLessRoot
                        value={autoExpandOffers}
                        onValueChange={setAutoExpandOffers}
                      >
                        {({ setIsShowing, isShowing, scrollHeight, ref }) => (
                          <>
                            <div
                              ref={ref}
                              className="[interpolate-size:allow-keywords] mt-6 overflow-hidden transition-[height] duration-300 grid grid-cols-3 gap-5"
                              style={{
                                height: isShowing
                                  ? "auto"
                                  : scrollHeight
                                    ? toPxIfNumber(scrollHeight)
                                    : "auto",
                              }}
                            >
                              <ShowMoreLessComp max={3}>
                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                    <NextImage
                                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                      src="/dashboard.png"
                                      alt="Dashboard"
                                      fill
                                      sizes="33vw"
                                    />
                                    <div className="px-1.5 h-5 text-primary-200 gap-x-1 inline-flex items-center bg-black/50 rounded-[5px] absolute top-[11px] right-[11.3px]">
                                      <RefreshCw className="size-[10.8px]" />{" "}
                                      <span className="text-white font-bold text-[10px] leading-none">
                                        Service
                                      </span>
                                    </div>
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
                                        4.9{" "}
                                        <span className="font-extralight">
                                          (5)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    Brief Description of the project. Lorem
                                    ipsum dolor sit amet, consectetur adipiscing
                                    elit, sed do eiusmod tempor incididunt.
                                  </p>

                                  <div className="mt-[14.5px] flex flex-col gap-y-3">
                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Money className="size-[18px] shrink-0 text-primary-500" />

                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        $50,000 budget
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mt-5 flex items-end justify-between">
                                    <TooltipProvider delayDuration={0}>
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
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                        <TooltipProvider delayDuration={0}>
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

                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                    <NextImage
                                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                      src="/dashboard.png"
                                      alt="Dashboard"
                                      fill
                                      sizes="33vw"
                                    />
                                    <div className="px-1.5 h-5 text-primary-200 gap-x-1 inline-flex items-center bg-black/50 rounded-[5px] absolute top-[11px] right-[11.3px]">
                                      <RefreshCw className="size-[10.8px]" />{" "}
                                      <span className="text-white font-bold text-[10px] leading-none">
                                        Service
                                      </span>
                                    </div>
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
                                        4.9{" "}
                                        <span className="font-extralight">
                                          (5)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    Brief Description of the project. Lorem
                                    ipsum dolor sit amet, consectetur adipiscing
                                    elit, sed do eiusmod tempor incididunt.
                                  </p>

                                  <div className="mt-[14.5px] flex flex-col gap-y-3">
                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Money className="size-[18px] shrink-0 text-primary-500" />

                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        $50,000 budget
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mt-5 flex items-end justify-between">
                                    <TooltipProvider delayDuration={0}>
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
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                        <TooltipProvider delayDuration={0}>
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

                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                    <NextImage
                                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                      src="/dashboard.png"
                                      alt="Dashboard"
                                      fill
                                      sizes="33vw"
                                    />
                                    <div className="px-1.5 h-5 text-primary-200 gap-x-1 inline-flex items-center bg-black/50 rounded-[5px] absolute top-[11px] right-[11.3px]">
                                      <RefreshCw className="size-[10.8px]" />{" "}
                                      <span className="text-white font-bold text-[10px] leading-none">
                                        Service
                                      </span>
                                    </div>
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
                                        4.9{" "}
                                        <span className="font-extralight">
                                          (5)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    Brief Description of the project. Lorem
                                    ipsum dolor sit amet, consectetur adipiscing
                                    elit, sed do eiusmod tempor incididunt.
                                  </p>

                                  <div className="mt-[14.5px] flex flex-col gap-y-3">
                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Money className="size-[18px] shrink-0 text-primary-500" />

                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        $50,000 budget
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mt-5 flex items-end justify-between">
                                    <TooltipProvider delayDuration={0}>
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
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                        <TooltipProvider delayDuration={0}>
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

                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                    <NextImage
                                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                      src="/dashboard.png"
                                      alt="Dashboard"
                                      fill
                                      sizes="33vw"
                                    />
                                    <div className="px-1.5 h-5 text-primary-200 gap-x-1 inline-flex items-center bg-black/50 rounded-[5px] absolute top-[11px] right-[11.3px]">
                                      <RefreshCw className="size-[10.8px]" />{" "}
                                      <span className="text-white font-bold text-[10px] leading-none">
                                        Service
                                      </span>
                                    </div>
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
                                        4.9{" "}
                                        <span className="font-extralight">
                                          (5)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    Brief Description of the project. Lorem
                                    ipsum dolor sit amet, consectetur adipiscing
                                    elit, sed do eiusmod tempor incididunt.
                                  </p>

                                  <div className="mt-[14.5px] flex flex-col gap-y-3">
                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Money className="size-[18px] shrink-0 text-primary-500" />

                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        $50,000 budget
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mt-5 flex items-end justify-between">
                                    <TooltipProvider delayDuration={0}>
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
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                        <TooltipProvider delayDuration={0}>
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

                                <article className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                                  <div className="h-[169px] rounded-[6px] overflow-hidden bg-white relative group border border-black/15">
                                    <NextImage
                                      className="object-cover group-hover:scale-150 transition [transition-duration:3000ms]"
                                      src="/dashboard.png"
                                      alt="Dashboard"
                                      fill
                                      sizes="33vw"
                                    />
                                    <div className="px-1.5 h-5 text-primary-200 gap-x-1 inline-flex items-center bg-black/50 rounded-[5px] absolute top-[11px] right-[11.3px]">
                                      <RefreshCw className="size-[10.8px]" />{" "}
                                      <span className="text-white font-bold text-[10px] leading-none">
                                        Service
                                      </span>
                                    </div>
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
                                        4.9{" "}
                                        <span className="font-extralight">
                                          (5)
                                        </span>
                                      </span>
                                    </div>
                                  </div>

                                  <p className="mt-3 text-sm leading-none font-extralight text-dark-blue-400">
                                    Brief Description of the project. Lorem
                                    ipsum dolor sit amet, consectetur adipiscing
                                    elit, sed do eiusmod tempor incididunt.
                                  </p>

                                  <div className="mt-[14.5px] flex flex-col gap-y-3">
                                    <div className="flex items-center gap-x-[6.4px]">
                                      <Money className="size-[18px] shrink-0 text-primary-500" />

                                      <span className="font-medium text-sm leading-none text-dark-blue-400">
                                        $50,000 budget
                                      </span>
                                    </div>
                                  </div>

                                  <div className="mt-5 flex items-end justify-between">
                                    <TooltipProvider delayDuration={0}>
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
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
                                              <AvatarFallback>W</AvatarFallback>
                                            </Avatar>
                                            <Avatar
                                              size="sm"
                                              className="border-2 border-white hover:ring-0 active:ring-0"
                                            >
                                              <AvatarImage
                                                src="/woman.jpg"
                                                alt="Woman"
                                              />
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                                    <AvatarFallback>
                                                      W
                                                    </AvatarFallback>
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
                                        <TooltipProvider delayDuration={0}>
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
                              </ShowMoreLessComp>
                            </div>

                            <div className="my-6">
                              <div className="flex items-center gap-x-1">
                                <span className="flex-auto inline-block h-px bg-gray-200" />
                                <Button
                                  variant="link"
                                  visual="gray"
                                  onClick={() => setIsShowing((prev) => !prev)}
                                >
                                  {isShowing ? "View Less" : "View More"}
                                </Button>
                                <span className="flex-auto inline-block h-px bg-gray-200" />
                              </div>
                            </div>
                          </>
                        )}
                      </ShowMoreLessRoot>
                    </TabsContent>
                  </Tabs>
                </div>
                </LazySection>

                <LazySection minHeight={400}>
                <div
                  className="p-6 rounded-lg bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] border border-gray-200 scroll-mt-[137.5px]"
                  id="background"
                >
                  <div className="flex items-center justify-between">
                    <h1 className="text-xl leading-none font-bold text-dark-blue-400">
                      Background
                    </h1>
                    {isEditMode && isOwnProfile && (
                      backgroundActiveTab === "Education" ? (
                        <Button variant="outlined" visual="gray" onClick={() => setEducationOpen(true)}>
                          <Plus className="size-[15px]" />
                          Add education
                        </Button>
                      ) : (
                        <Button variant="outlined" visual="gray" onClick={() => setWorkExperienceOpen(true)}>
                          <Plus className="size-[15px]" />
                          Add work experience
                        </Button>
                      )
                    )}
                  </div>

                  <Tabs
                    value={backgroundActiveTab}
                    onValueChange={setBackgroundActiveTab}
                    className="mt-6"
                  >
                    <RadixTabs.List className="inline-flex items-center gap-x-3">
                      <TabsTrigger
                        variant="unstyled"
                        showUnderline={false}
                        value="Work Experience"
                        className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                      >
                        Work Experience
                      </TabsTrigger>
                      <TabsTrigger
                        variant="unstyled"
                        showUnderline={false}
                        value="Education"
                        className="focus-visible:outline-none py-[7px] bg-white hover:bg-gray-50 hover:border-gray-400 px-3.5 border-2 border-gray-300 data-[state=active]:text-dark-blue-400 data-[state=active]:bg-white hover:data-[state=active]:bg-white data-[state=active]:border-dark-blue-400 hover:data-[state=active]:text-dark-blue-400 hover:data-[state=active]:border-dark-blue-400  text-gray-500 hover:text-gray-600 rounded-full text-sm leading-5 font-medium transition duration-300"
                      >
                        Education
                      </TabsTrigger>
                    </RadixTabs.List>

                    <TabsContent value="Work Experience">
                      <ShowMoreLessRoot
                        value={autoExpandWorkExperience}
                        onValueChange={setAutoExpandWorkExperience}
                      >
                        {({ isShowing, setIsShowing, scrollHeight, ref }) => (
                          <>
                            <div
                              ref={ref}
                              className="[interpolate-size:allow-keywords] mt-6 overflow-hidden transition-[height] duration-300"
                              style={{
                                height: isShowing
                                  ? "auto"
                                  : scrollHeight
                                    ? toPxIfNumber(scrollHeight)
                                    : "auto",
                              }}
                            >
                              <ShowMoreLessComp max={4}>
                                {(profile?.experience && profile.experience.length > 0) ? profile.experience
                                  .sort((a: any, b: any) => (b.startDate || "").localeCompare(a.startDate || ""))
                                  .map((exp: any, idx: number) => {
                                    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"]
                                    const fmtDate = (d: string | null) => {
                                      if (!d) return "Present"
                                      const [y, m] = d.split("-")
                                      return `${months[parseInt(m, 10) - 1]} ${y}`
                                    }
                                    const calcDuration = (start: string, end: string | null) => {
                                      const s = new Date(start + "-01")
                                      const e = end ? new Date(end + "-01") : new Date()
                                      let totalMonths = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth())
                                      const yrs = Math.floor(totalMonths / 12)
                                      const mos = totalMonths % 12
                                      const parts = []
                                      if (yrs > 0) parts.push(`${yrs} yr${yrs > 1 ? "s" : ""}`)
                                      if (mos > 0) parts.push(`${mos} mo${mos > 1 ? "s" : ""}`)
                                      return parts.join(" ") || "< 1 mo"
                                    }
                                    return (
                                <div key={exp.id || idx} className="flex gap-x-6">
                                  <div className="relative flex flex-col items-center">
                                    <div className="size-[55px] border border-gray-300 rounded-lg inline-flex shrink-0 justify-center items-center shadow-[0px_1px_4px_0px_rgba(0,0,0,.03)] bg-gray-50 overflow-hidden">
                                      {exp.companyLogoUrl ? (
                                        <NextImage src={exp.companyLogoUrl} alt={exp.company || ""} width={45} height={45} className="object-contain" />
                                      ) : (
                                        <span className="text-lg font-bold text-gray-400">{exp.company?.charAt(0) || "W"}</span>
                                      )}
                                    </div>

                                    {idx < (profile.experience?.length ?? 0) - 1 && (
                                    <div className="absolute flex py-1.5 justify-center top-[55px] inset-x-0 bottom-0">
                                      <span className="inline-block border-dashed border-[1.5px] border-gray-200" />
                                    </div>
                                    )}
                                  </div>

                                  <div className="flex-auto">
                                    <div className="pb-8">
                                      <div className="flex items-center justify-between">
                                        <h1 className="text-base font-bold text-dark-blue-400 leading-none">
                                          {exp.role}
                                        </h1>
                                        {isEditMode && isOwnProfile && (
                                          <div className="flex items-center">
                                            <IconButton
                                              variant="ghost"
                                              visual="gray"
                                              className="rounded-full text-gray-400 hover:text-gray-800"
                                              type="button"
                                              onClick={() => { setWorkExpEditIdx(String(exp.id)); setWorkExperienceOpen(true) }}
                                            >
                                              <Edit03 className="size-4" />
                                            </IconButton>
                                            <IconButton
                                              variant="ghost"
                                              visual="gray"
                                              className="rounded-full text-error-500 hover:bg-error-100"
                                              type="button"
                                              onClick={() => handleDeleteWorkExperience(exp.id)}
                                            >
                                              <Trash03 className="size-4" />
                                            </IconButton>
                                          </div>
                                        )}
                                      </div>
                                      <p className="text-[13px] mt-1.5 leading-none text-dark-blue-400">
                                        {exp.company}
                                      </p>
                                      <div className="mt-1.5 inline-flex items-center gap-x-2">
                                        <span className="text-xs leading-none text-dark-blue-400">
                                          {fmtDate(exp.startDate)} - {fmtDate(exp.endDate)}
                                        </span>
                                        <span className="shrink-0 bg-gray-300 size-1 rounded-full inline-block" />
                                        <span className="text-xs leading-none font-semibold text-dark-blue-400">
                                          {calcDuration(exp.startDate, exp.endDate)}
                                        </span>
                                      </div>

                                      {exp.description && (
                                      <ReadMoreLessRoot>
                                        <ReadMoreLessComp
                                          max={52}
                                          text={exp.description}
                                        >
                                          {({ readMore, text, toggle }) => (
                                            <>
                                              <p className="mt-3 text-sm leading-none font-extralight text-gray-700">
                                                {text}{" "}
                                                <Button
                                                  className="text-gray-700 hover:no-underline hover:text-gray-900 font-semibold"
                                                  size="sm"
                                                  variant="link"
                                                  visual="gray"
                                                  onClick={toggle}
                                                >
                                                  {readMore ? null : "...Read More"}
                                                </Button>
                                              </p>
                                            </>
                                          )}
                                        </ReadMoreLessComp>
                                      </ReadMoreLessRoot>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                    )
                                  }) : (
                                <div className="mt-6 text-sm text-gray-500">No work experience added yet.</div>
                                  )}
                              </ShowMoreLessComp>
                            </div>

                            {(profile?.experience?.length ?? 0) > 4 && (
                            <div className="flex mt-6 items-center justify-center">
                              <Button
                                variant="link"
                                visual="gray"
                                onClick={() => setIsShowing((prev) => !prev)}
                              >
                                {isShowing ? "View Less" : `${(profile?.experience?.length ?? 0) - 4} More...`}
                              </Button>
                            </div>
                            )}
                          </>
                        )}
                      </ShowMoreLessRoot>
                    </TabsContent>

                    <TabsContent value="Education">
                      <ShowMoreLessRoot
                        value={autoExpandEducation}
                        onValueChange={setAutoExpandEducation}
                      >
                        {({ isShowing, setIsShowing, scrollHeight, ref }) => (
                          <>
                            <div
                              ref={ref}
                              className="[interpolate-size:allow-keywords] mt-6 overflow-hidden transition-[height] duration-300"
                              style={{
                                height: isShowing
                                  ? "auto"
                                  : scrollHeight
                                    ? toPxIfNumber(scrollHeight)
                                    : "auto",
                              }}
                            >
                              <ShowMoreLessComp max={4}>
                                {(profile?.education && profile.education.length > 0) ? profile.education
                                  .sort((a: any, b: any) => (b.startDate || "").localeCompare(a.startDate || ""))
                                  .map((edu: any, idx: number) => {
                                    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"]
                                    const fmtDate = (d: string | null) => {
                                      if (!d) return "Present"
                                      const [y, m] = d.split("-")
                                      return `${months[parseInt(m, 10) - 1]} ${y}`
                                    }
                                    return (
                                <div key={edu.id || idx} className="flex pb-5 items-start gap-x-6">
                                  <div className="size-[55px] p-[5px] relative shrink-0 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                                    {edu.institutionLogoUrl ? (
                                      <NextImage src={edu.institutionLogoUrl} alt={edu.institution || ""} fill sizes="55px" className="object-contain p-1" />
                                    ) : (
                                      <span className="text-lg font-bold text-gray-400">{edu.institution?.charAt(0) || "E"}</span>
                                    )}
                                  </div>

                                  <div className="flex-auto">
                                    <div className="flex items-start justify-between">
                                      <h1 className="text-base leading-none font-bold text-dark-blue-400">
                                        {edu.institution}
                                      </h1>
                                      {isEditMode && isOwnProfile && (
                                        <div className="flex items-center">
                                          <IconButton
                                            variant="ghost"
                                            visual="gray"
                                            className="rounded-full text-gray-400 hover:text-gray-800"
                                            type="button"
                                            onClick={() => { setEduEditIdx(String(edu.id)); setEducationOpen(true) }}
                                          >
                                            <Edit03 className="size-4" />
                                          </IconButton>
                                          <IconButton
                                            variant="ghost"
                                            visual="gray"
                                            className="rounded-full text-error-500 hover:bg-error-100"
                                            type="button"
                                            onClick={() => handleDeleteEducation(edu.id)}
                                          >
                                            <Trash03 className="size-4" />
                                          </IconButton>
                                        </div>
                                      )}
                                    </div>
                                    <div className="mt-1.5 flex items-center gap-x-2">
                                      <span className="text-dark-blue-400 text-xs leading-none">
                                        {edu.degree}
                                      </span>
                                      <span className="shrink-0 bg-gray-300 size-1 rounded-full inline-block" />
                                      <span className="text-dark-blue-400 font-semibold text-xs leading-none">
                                        {edu.field}
                                      </span>
                                    </div>
                                    <div className="mt-1.5">
                                      <span className="text-dark-blue-400 text-xs leading-none">
                                        {fmtDate(edu.startDate)} - {fmtDate(edu.endDate)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                    )
                                  }) : (
                                <div className="mt-6 text-sm text-gray-500">No education added yet.</div>
                                  )}
                              </ShowMoreLessComp>
                            </div>

                            <div
                              className={cn(
                                "flex items-center justify-start",
                                isShowing && "justify-center"
                              )}
                            >
                              {(profile?.education?.length ?? 0) > 4 && (
                              <Button
                                size="sm"
                                variant="link"
                                visual="gray"
                                onClick={() => setIsShowing((prev) => !prev)}
                              >
                                {isShowing ? "View Less" : `${(profile?.education?.length ?? 0) - 4} More...`}
                              </Button>
                              )}
                            </div>
                          </>
                        )}
                      </ShowMoreLessRoot>
                    </TabsContent>
                  </Tabs>
                </div>
                </LazySection>

                <LazySection minHeight={400}>
                <div className="mt-6 scroll-mt-[137.5px]" id="project-history">
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
                              <NextImage src="/cpu.png" alt="CPU" fill sizes="(max-width: 768px) 40vw, 20vw" />
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
                        Project History
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
                                        {!isOwnProfile && (
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
                                        {!isOwnProfile && (
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
                                        <AvatarImage src="/man.jpg" alt="Man" />
                                        <AvatarFallbackIcon />
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
                                        {!isOwnProfile && (
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
                                        {!isOwnProfile && (
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
                                        {!isOwnProfile && (
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
                </LazySection>
              </div>

              <div className="shrink-0 flex flex-col gap-y-6 w-[289px] isolate">
                <div
                  className={cn(
                    "top-[145px] sticky bg-white rounded-lg z-10 transition duration-300 before:content-[''] before:absolute before:w-full before:top-[-32px] before:h-[40px] before:bg-gray-50",
                    isCardStuck &&
                      "shadow-[0px_12px_16px_-4px_rgba(16,24,40,0.08)]"
                  )}
                  ref={cardRef}
                >
                  <div className="p-6 rounded-t-lg relative bg-white border border-gray-200">
                    <div className="flex items-center gap-x-1 justify-center">
                      <span className="inline-flex text-sm leading-none text-dark-blue-400 font-bold items-center gap-x-1">
                        <span className={`size-2 inline-block rounded-full ${isOwnProfile ? "bg-green-500" : "bg-gray-500"}`} />{" "}
                        {isOwnProfile ? "Online" : "Offline"}
                      </span>
                      <span className="font-extralight text-sm leading-none text-dark-blue-400">
                        {(() => {
                          const tz = profile?.timezone
                          if (!tz) return ""
                          try {
                            const now = new Date()
                            const timeStr = now.toLocaleTimeString("en-US", {
                              timeZone: tz,
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })
                            return `${timeStr} local time`
                          } catch {
                            return ""
                          }
                        })()}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-center">
                      <span className="text-sm leading-none font-extralight text-dark-blue-400">
                        Average response time{" "}
                        <span className="text-sm font-bold leading-none">
                          1 hour
                        </span>
                      </span>
                    </div>

                    <button className="w-full mt-5 duration-300 transition focus-visible:outlin-none text-sm leading-5 font-semibold shrink-0 h-10 flex items-center justify-center gap-x-2 rounded-[5px] px-4 bg-white border-2 text-primary-500 hover:text-white hover:bg-primary-500 border-primary-500 shadow-[0px_1px_2px_0px_rgba(16,24,40,.05)]">
                      <MessageSquare01 className="size-[15px]" /> Message Me
                    </button>
                  </div>

                  <div
                    className={`border-x rounded-b-lg border-b bg-white border-gray-200 transition-all duration-300 overflow-hidden ${
                      showLanguageSection
                        ? "p-6 max-h-[200px] opacity-100"
                        : "p-0 max-h-0 opacity-0"
                    }`}
                  >
                    {showLanguageSection && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center text-xs leading-none font-extralight text-dark-blue-400 gap-x-[5.85px]">
                            <MessageTextSquare01 className="size-[15px]" />
                            Language
                          </span>

                          <div className="inline-flex items-center gap-x-1.5">
                            <span className="text-xs leading-none font-bold text-dark-blue-400">
                              {(profile?.languages && profile.languages.length > 0)
                                ? profile.languages.map((l: any) => l.name).join(", ")
                                : "\u2014"}
                            </span>
                            {isEditMode && isOwnProfile && (
                              <IconButton
                                className="rounded-full text-gray-500 hover:text-gray-800 size-5"
                                variant="ghost"
                                visual="gray"
                                onClick={() => setLanguagesOpen(true)}
                              >
                                <Edit03 className="size-3" />
                              </IconButton>
                            )}
                          </div>
                        </div>

                        <div className="flex mt-5 items-center justify-between">
                          <span className="flex items-center text-xs leading-none font-extralight text-dark-blue-400 gap-x-[5.85px]">
                            <Clock className="size-[15px]" />
                            Time Zone
                          </span>

                          <span className="text-xs leading-none font-bold text-dark-blue-400">
                            {profile?.timezone ?? "\u2014"}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-6 mt-6">
                  <div className="rounded-lg border border-gray-200 bg-white">
                    <div className="p-6">
                      <h1 className="text-sm font-bold leading-none text-dark-blue-400">
                        Similar profiles
                      </h1>

                      <div className="mt-3">
                        <div className="py-3 flex items-start gap-x-2 border-b border-gray-200">
                          <Avatar
                            className="hover:ring-0 active:ring-primary-100"
                            size="md"
                          >
                            <AvatarImage src="/man.jpg" alt="Man" />
                            <AvatarFallbackIcon />
                          </Avatar>

                          <div className="flex-1">
                            <h1 className="text-sm leading-none text-dark-blue-400 font-bold">
                              Jenny{" "}
                              <span className="text-xs font-extralight leading-none text-gray-500">
                                @LakshitKumar
                              </span>
                            </h1>
                            <p className="mt-0.5 text-xs leading-none font-extralight text-dark-blue-400">
                              Full Stack Developer
                            </p>
                            <div className="mt-1.5 flex items-center justify-between">
                              <span className="text-[13px] leading-none font-bold text-dark-blue-400">
                                $57
                                <span className="text-xs leading-none text-dark-blue-400 font-extralight">
                                  /hr
                                </span>
                              </span>

                              <div className="inline-flex items-center gap-x-1">
                                <Star className="size-3 text-primary-500 fill-primary-500" />
                                <span className="font-medium leading-none text-xs text-dark-blue-400">
                                  4.2
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="py-3 flex items-start gap-x-2 border-b border-gray-200">
                          <Avatar
                            className="hover:ring-0 active:ring-primary-100"
                            size="md"
                          >
                            <AvatarImage src="/man.jpg" alt="Man" />
                            <AvatarFallbackIcon />
                          </Avatar>

                          <div className="flex-1">
                            <h1 className="text-sm leading-none text-dark-blue-400 font-bold">
                              Jenny{" "}
                              <span className="text-xs font-extralight leading-none text-gray-500">
                                @LakshitKumar
                              </span>
                            </h1>
                            <p className="mt-0.5 text-xs leading-none font-extralight text-dark-blue-400">
                              Full Stack Developer
                            </p>
                            <div className="mt-1.5 flex items-center justify-between">
                              <span className="text-[13px] leading-none font-bold text-dark-blue-400">
                                $57
                                <span className="text-xs leading-none text-dark-blue-400 font-extralight">
                                  /hr
                                </span>
                              </span>

                              <div className="inline-flex items-center gap-x-1">
                                <Star className="size-3 text-primary-500 fill-primary-500" />
                                <span className="font-medium leading-none text-xs text-dark-blue-400">
                                  4.2
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="py-3 flex items-start gap-x-2 border-b border-gray-200">
                          <Avatar
                            className="hover:ring-0 active:ring-primary-100"
                            size="md"
                          >
                            <AvatarImage src="/man.jpg" alt="Man" />
                            <AvatarFallbackIcon />
                          </Avatar>

                          <div className="flex-1">
                            <h1 className="text-sm leading-none text-dark-blue-400 font-bold">
                              Jenny{" "}
                              <span className="text-xs font-extralight leading-none text-gray-500">
                                @LakshitKumar
                              </span>
                            </h1>
                            <p className="mt-0.5 text-xs leading-none font-extralight text-dark-blue-400">
                              Full Stack Developer
                            </p>
                            <div className="mt-1.5 flex items-center justify-between">
                              <span className="text-[13px] leading-none font-bold text-dark-blue-400">
                                $57
                                <span className="text-xs leading-none text-dark-blue-400 font-extralight">
                                  /hr
                                </span>
                              </span>

                              <div className="inline-flex items-center gap-x-1">
                                <Star className="size-3 text-primary-500 fill-primary-500" />
                                <span className="font-medium leading-none text-xs text-dark-blue-400">
                                  4.2
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="py-3 flex items-start gap-x-2 border-b border-gray-200">
                          <Avatar
                            className="hover:ring-0 active:ring-primary-100"
                            size="md"
                          >
                            <AvatarImage src="/man.jpg" alt="Man" />
                            <AvatarFallbackIcon />
                          </Avatar>

                          <div className="flex-1">
                            <h1 className="text-sm leading-none text-dark-blue-400 font-bold">
                              Jenny{" "}
                              <span className="text-xs font-extralight leading-none text-gray-500">
                                @LakshitKumar
                              </span>
                            </h1>
                            <p className="mt-0.5 text-xs leading-none font-extralight text-dark-blue-400">
                              Full Stack Developer
                            </p>
                            <div className="mt-1.5 flex items-center justify-between">
                              <span className="text-[13px] leading-none font-bold text-dark-blue-400">
                                $57
                                <span className="text-xs leading-none text-dark-blue-400 font-extralight">
                                  /hr
                                </span>
                              </span>

                              <div className="inline-flex items-center gap-x-1">
                                <Star className="size-3 text-primary-500 fill-primary-500" />
                                <span className="font-medium leading-none text-xs text-dark-blue-400">
                                  4.2
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-center">
                        <Button size="sm" variant="link" visual="gray">
                          View More
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white">
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <h1 className="text-sm font-bold leading-none text-dark-blue-400">
                        Affiliated Teams
                      </h1>
                      {isEditMode && isOwnProfile && (
                        <IconButton
                          className="rounded-full text-gray-500 hover:text-gray-800 size-6"
                          variant="ghost"
                          visual="gray"
                          onClick={() => setAffiliatedTeamsOpen(true)}
                        >
                          <Edit03 className="size-3.5" />
                        </IconButton>
                      )}
                    </div>

                    <div className="mt-3">
                      <div className="py-3 flex items-center gap-x-2 border-b border-gray-200">
                        <Avatar
                          className="hover:ring-0 active:ring-primary-100"
                          size="md"
                        >
                          <AvatarImage src="/man.jpg" alt="Man" />
                          <AvatarFallbackIcon />
                        </Avatar>

                        <div className="flex-1">
                          <NextLink
                            href="#"
                            className="focus-visible:outline-none hover:underline text-sm leading-none text-dark-blue-400 font-bold"
                          >
                            Bitcoin Master Devs
                          </NextLink>

                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="inline-flex items-center gap-x-1 font-extralight">
                              <MarkerPin02 className="size-2.5 text-dark-blue-400" />
                              <span className="text-[10px] leading-none text-dark-blue-400 font-extralight">
                                Moscow, Russia
                              </span>
                            </span>

                            <div className="inline-flex items-center gap-x-1">
                              <Clock className="size-[10px] text-primary-500" />
                              <span className="font-extralight leading-none text-[10px] text-dark-blue-400">
                                450 hrs
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="py-3 flex items-center gap-x-2 border-b border-gray-200">
                        <Avatar
                          className="hover:ring-0 active:ring-primary-100"
                          size="md"
                        >
                          <AvatarImage src="/man.jpg" alt="Man" />
                          <AvatarFallbackIcon />
                        </Avatar>

                        <div className="flex-1">
                          <NextLink
                            href="#"
                            className="focus-visible:outline-none hover:underline text-sm leading-none text-dark-blue-400 font-bold"
                          >
                            Bitcoin Master Devs
                          </NextLink>

                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="inline-flex items-center gap-x-1 font-extralight">
                              <MarkerPin02 className="size-2.5 text-dark-blue-400" />
                              <span className="text-[10px] leading-none text-dark-blue-400 font-extralight">
                                Moscow, Russia
                              </span>
                            </span>

                            <div className="inline-flex items-center gap-x-1">
                              <Clock className="size-[10px] text-primary-500" />
                              <span className="font-extralight leading-none text-[10px] text-dark-blue-400">
                                450 hrs
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="py-3 flex items-center gap-x-2 border-b border-gray-200">
                        <Avatar
                          className="hover:ring-0 active:ring-primary-100"
                          size="md"
                        >
                          <AvatarImage src="/man.jpg" alt="Man" />
                          <AvatarFallbackIcon />
                        </Avatar>

                        <div className="flex-1">
                          <NextLink
                            href="#"
                            className="focus-visible:outline-none hover:underline text-sm leading-none text-dark-blue-400 font-bold"
                          >
                            Bitcoin Master Devs
                          </NextLink>

                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="inline-flex items-center gap-x-1 font-extralight">
                              <MarkerPin02 className="size-2.5 text-dark-blue-400" />
                              <span className="text-[10px] leading-none text-dark-blue-400 font-extralight">
                                Moscow, Russia
                              </span>
                            </span>

                            <div className="inline-flex items-center gap-x-1">
                              <Clock className="size-[10px] text-primary-500" />
                              <span className="font-extralight leading-none text-[10px] text-dark-blue-400">
                                450 hrs
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="py-3 flex items-center gap-x-2 border-b border-gray-200">
                        <Avatar
                          className="hover:ring-0 active:ring-primary-100"
                          size="md"
                        >
                          <AvatarImage src="/man.jpg" alt="Man" />
                          <AvatarFallbackIcon />
                        </Avatar>

                        <div className="flex-1">
                          <NextLink
                            href="#"
                            className="focus-visible:outline-none hover:underline text-sm leading-none text-dark-blue-400 font-bold"
                          >
                            Bitcoin Master Devs
                          </NextLink>

                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="inline-flex items-center gap-x-1 font-extralight">
                              <MarkerPin02 className="size-2.5 text-dark-blue-400" />
                              <span className="text-[10px] leading-none text-dark-blue-400 font-extralight">
                                Moscow, Russia
                              </span>
                            </span>

                            <div className="inline-flex items-center gap-x-1">
                              <Clock className="size-[10px] text-primary-500" />
                              <span className="font-extralight leading-none text-[10px] text-dark-blue-400">
                                450 hrs
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="py-3 flex items-center gap-x-2 border-b border-gray-200">
                        <Avatar
                          className="hover:ring-0 active:ring-primary-100"
                          size="md"
                        >
                          <AvatarImage src="/man.jpg" alt="Man" />
                          <AvatarFallbackIcon />
                        </Avatar>

                        <div className="flex-1">
                          <NextLink
                            href="#"
                            className="focus-visible:outline-none hover:underline text-sm leading-none text-dark-blue-400 font-bold"
                          >
                            Bitcoin Master Devs
                          </NextLink>

                          <div className="mt-1.5 flex items-center justify-between">
                            <span className="inline-flex items-center gap-x-1 font-extralight">
                              <MarkerPin02 className="size-2.5 text-dark-blue-400" />
                              <span className="text-[10px] leading-none text-dark-blue-400 font-extralight">
                                Moscow, Russia
                              </span>
                            </span>

                            <div className="inline-flex items-center gap-x-1">
                              <Clock className="size-[10px] text-primary-500" />
                              <span className="font-extralight leading-none text-[10px] text-dark-blue-400">
                                450 hrs
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-center">
                      <Button size="sm" variant="link" visual="gray">
                        View More
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Tabs>
      </div>

      {/* Edit Profile Modals */}
      {isOwnProfile && (
        <>
          <AvailabilityDialog opened={availabilityOpen} onOpenedChange={setAvailabilityOpen} profile={profile} onSaved={refreshProfile} />
          <SkillsDialog opened={skillsOpen} onOpenedChange={setSkillsOpen} profile={profile} onSaved={refreshProfile} />
          <AboutMeDialog opened={overviewOpen} onOpenedChange={setOverviewOpen} profile={profile} onSaved={refreshProfile} />
          <MyOffersDialog opened={offersOpen} onOpenedChange={setOffersOpen} />
          <MoreInfoDialog opened={jobTitleOpen} onOpenedChange={setJobTitleOpen} profile={profile} onSaved={refreshProfile} />
          <LanguagesDialog opened={languagesOpen} onOpenedChange={setLanguagesOpen} profile={profile} onSaved={refreshProfile} />
          <IndustryExpertiseDialog opened={industriesOpen} onOpenedChange={setIndustriesOpen} profile={profile} onSaved={refreshProfile} />
          <CertificationsDialog opened={certificationsOpen} onOpenedChange={setCertificationsOpen} profile={profile} onSaved={refreshProfile} />
          <WorkExperienceDialog
            opened={workExperienceOpen}
            onOpenedChange={(o: boolean) => { setWorkExperienceOpen(o); if (!o) setWorkExpEditIdx(undefined) }}
            editIndex={workExpEditIdx}
            profile={profile}
            onSaved={refreshProfile}
          />
          <EducationDialog
            opened={educationOpen}
            onOpenedChange={(o: boolean) => { setEducationOpen(o); if (!o) setEduEditIdx(undefined) }}
            editIndex={eduEditIdx}
            profile={profile}
            onSaved={refreshProfile}
          />
          <AffiliatedTeamsDialog opened={affiliatedTeamsOpen} onOpenedChange={setAffiliatedTeamsOpen} />

          <Dialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null) }}>
            <DialogContent>
              <DialogHeader>
                <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full border-8 border-error-50 bg-error-100">
                  <AlertCircle className="h-4 w-4 text-error-600" />
                </div>

                <div className="flex flex-col gap-y-2">
                  <DialogTitle>Delete {deleteConfirm?.type === "experience" ? "Work Experience" : "Education"}?</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete <strong>{deleteConfirm?.label}</strong>? This action cannot be undone.
                  </DialogDescription>
                </div>
              </DialogHeader>

              <DialogFooter className="mt-8">
                <DialogClose asChild>
                  <Button variant="outlined" visual="gray" disabled={isDeleting}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button visual="error" onClick={confirmDelete} disabled={isDeleting}>
                  {isDeleting ? "Deleting..." : "Yes, delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  )
}
