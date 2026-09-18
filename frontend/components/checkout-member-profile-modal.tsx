"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { cn } from "@/utils/functions"
import { getPublicApiUrl } from "@/lib/runtime-urls"
import { getCheckoutProjectSummary } from "@/lib/checkout/project-summary"
import { FavoritesAPI, FavoriteGroup } from "@/service/http/favorites"
import { useAuth } from "@/contexts/auth"
import {
  Button,
  Dialog,
  DialogContent,
  IconButton,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui"
import {
  ChevronDown,
  Clock,
  MapPin,
  MessageTextSquare01,
  Plus,
  Share06,
  Star,
  X,
} from "@blend-metrics/icons"

type CheckoutMemberProfile = {
  id: string
  name: string
  handle: string
  username: string
  title: string
  experience: string
  location: string
  rateAmount: string
  avatarSrc: string
}

type TalentPublicProfile = {
  username: string
  name: string
  jobTitles: { headline: string; rate: number }[]
  availability: string | null
  location: string | null
  rate: number | null
  overview: Record<string, any> | null
  skills: string[]
  education: {
    institution: string
    degree: string
    graduationYear: number | null
  }[]
  workExperience: {
    role: string
    company: string
    startDate: string | null
    endDate: string | null
  }[]
  portfolio: {
    title: string
    thumbnailUrl: string | null
  }[]
  rating: number | null
  reviewsCount: number | null
  totalProjectsCompleted: number | null
  repeatHireRate: number | null
  memberSince: string | null
}

const extractOverviewText = (
  overview: Record<string, any> | null | undefined
): string | null => {
  if (!overview) return null
  if (typeof overview === "string") return overview
  try {
    const walk = (node: any): string => {
      if (typeof node?.text === "string") return node.text
      if (Array.isArray(node?.children)) return node.children.map(walk).join(" ")
      if (Array.isArray(node?.root?.children))
        return node.root.children.map(walk).join(" ")
      return ""
    }
    const text = walk(overview).replace(/\s+/g, " ").trim()
    return text || null
  } catch {
    return null
  }
}

const memberProfiles: CheckoutMemberProfile[] = [
  {
    id: "chris-1",
    name: "Chris",
    handle: "@uxdesignmaster",
    username: "uxdesignmaster",
    title: "Product Manager",
    experience: "10 years of experience",
    location: "New York, United States",
    rateAmount: "$500 - $650",
    avatarSrc: "/man.jpg",
  },
  {
    id: "parth-1",
    name: "Parth",
    handle: "@topanalyst",
    username: "topanalyst",
    title: "Business Analyst",
    experience: "3 years of experience",
    location: "Austin, United States",
    rateAmount: "$30 - $60",
    avatarSrc: "/man.jpg",
  },
  {
    id: "dheeraj-1",
    name: "Dheeraj",
    handle: "@dheerajnagdali",
    username: "dheerajnagdali",
    title: "Expert React Developer",
    experience: "10 years of experience",
    location: "Nainital, Uttarakhand, India",
    rateAmount: "$85 - $120",
    avatarSrc: "/man.jpg",
  },
  {
    id: "abdul-1",
    name: "Abdul",
    handle: "@topfullstack",
    username: "topfullstack",
    title: "Full Stack Developer",
    experience: "5 years of experience",
    location: "Lahore, Pakistan",
    rateAmount: "$55 - $85",
    avatarSrc: "/man.jpg",
  },
  {
    id: "waseem-1",
    name: "Waseem",
    handle: "@topbackend",
    username: "topbackend",
    title: "Senior Back-End Developer",
    experience: "7 years of experience",
    location: "Bengaluru, India",
    rateAmount: "$80 - $110",
    avatarSrc: "/man.jpg",
  },
  {
    id: "andrew-1",
    name: "Andrew",
    handle: "@topqa",
    username: "topqa",
    title: "QA Test Engineer",
    experience: "3 years of experience",
    location: "Miami, United States",
    rateAmount: "$95 - $195",
    avatarSrc: "/man.jpg",
  },
  {
    id: "unassigned-1",
    name: "Unassigned Member",
    handle: "@unassigned",
    username: "unassigned",
    title: "UX Researcher",
    experience: "3 years of experience",
    location: "United States",
    rateAmount: "$30 - $50",
    avatarSrc: "",
  },
]

const portfolioFallback = [
  { src: "/crypto.png", alt: "Blockchain portfolio project" },
  { src: "/google-cloud.png", alt: "Cloud infrastructure portfolio project" },
  { src: "/web3-solutions.png", alt: "Messaging app portfolio project" },
]

const tabs = [
  "Portfolio",
  "Skills",
  "Overview",
  "Offers",
  "Work Experience",
  "Education",
  "Project History",
] as const

type ProfileTab = (typeof tabs)[number]

const fallbackSkills = [
  "Typescript",
  "React.js",
  "Tailwind CSS",
  "Next.js",
  "Redux",
  "GraphQL",
  "Node.js",
  "Figma",
  "Design Systems",
  "API Integration",
  "JavaScript",
  "HTML",
  "CSS",
  "REST APIs",
  "Storybook",
  "Jest",
  "Playwright",
  "Zustand",
  "React Query",
  "Framer Motion",
  "Accessibility",
  "Responsive Design",
]

const workExperienceFallback = [
  ["Senior React Developer", "Marketeq Labs", "2021 - Present"],
  ["Front-End Engineer", "CloudWorks", "2018 - 2021"],
  ["UI Developer", "Northstar Digital", "2016 - 2018"],
]

type CheckoutMemberProfileModalProps = {
  slug: string
  memberId: string | null
  onOpenChange: (open: boolean) => void
}

export function CheckoutMemberProfileModal({
  slug,
  memberId,
  onOpenChange,
}: CheckoutMemberProfileModalProps) {
  const router = useRouter()
  const { user, openAuthModal } = useAuth()
  const [activeMemberId, setActiveMemberId] = React.useState<string | null>(
    memberId
  )

  React.useEffect(() => {
    if (memberId) setActiveMemberId(memberId)
  }, [memberId])

  const fallbackProfile =
    memberProfiles.find((member) => member.id === activeMemberId) ||
    memberProfiles[2]

  const [activeTab, setActiveTab] = React.useState<ProfileTab>("Portfolio")
  const [favoriteId, setFavoriteId] = React.useState<string | null>(null)
  const isSaved = favoriteId !== null
  const [isSaveMenuOpen, setIsSaveMenuOpen] = React.useState(false)
  const [showAllHeroSkills, setShowAllHeroSkills] = React.useState(false)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [teamMemberBasics, setTeamMemberBasics] = React.useState<{
    name: string
    username: string | null
    avatarUrl: string | null
    role: string | null
    location: string | null
    rate: number | null
    experienceLevel: string | null
    skills: string[]
    totalProjectsCompleted: number | null
    repeatHireRate: number | null
    memberSince: string | null
  } | null>(null)
  const [talentProfile, setTalentProfile] =
    React.useState<TalentPublicProfile | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(null), 2400)
    return () => window.clearTimeout(timeout)
  }, [notice])

  React.useEffect(() => {
    if (!user) {
      setFavoriteId(null)
      return
    }
    if (!activeMemberId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await FavoritesAPI.getFavorites("talent")
        if (cancelled) return
        const groups: FavoriteGroup[] = Array.isArray(res.data) ? res.data : []
        const match = groups
          .flatMap((group) => group.favorites ?? [])
          .find((favorite) => favorite.itemId === activeMemberId)
        setFavoriteId(match?.id ?? null)
      } catch {
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, activeMemberId])

  React.useEffect(() => {
    if (!activeMemberId) return
    let cancelled = false
    setIsLoading(true)
    ;(async () => {
      try {
        const summary = await getCheckoutProjectSummary(slug)
        const member =
          summary?.teamMembers.find((m) => m.id === activeMemberId) ?? null
        if (cancelled) return
        setTeamMemberBasics(member)

        if (!member?.username) return
        const apiBase = getPublicApiUrl() || "http://localhost:4000"
        const res = await fetch(
          `${apiBase}/public/talent/${encodeURIComponent(member.username)}`
        )
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setTalentProfile(data)
        }
      } catch {
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug, activeMemberId])

  const profile: CheckoutMemberProfile = {
    id: activeMemberId ?? "",
    name: talentProfile?.name || teamMemberBasics?.name || fallbackProfile.name,
    handle:
      talentProfile?.username || teamMemberBasics?.username
        ? `@${talentProfile?.username || teamMemberBasics?.username}`
        : fallbackProfile.handle,
    username:
      talentProfile?.username || teamMemberBasics?.username || fallbackProfile.username,
    title:
      talentProfile?.jobTitles?.[0]?.headline ||
      teamMemberBasics?.role ||
      fallbackProfile.title,
    experience: teamMemberBasics?.experienceLevel || fallbackProfile.experience,
    location:
      talentProfile?.location || teamMemberBasics?.location || fallbackProfile.location,
    rateAmount:
      talentProfile?.rate != null
        ? `$${talentProfile.rate}`
        : teamMemberBasics?.rate != null
          ? `$${teamMemberBasics.rate}`
          : fallbackProfile.rateAmount,
    avatarSrc: teamMemberBasics?.avatarUrl || fallbackProfile.avatarSrc,
  }

  const profileSkills =
    talentProfile?.skills && talentProfile.skills.length > 0
      ? talentProfile.skills
      : teamMemberBasics?.skills && teamMemberBasics.skills.length > 0
        ? teamMemberBasics.skills
        : fallbackSkills
  const visibleSkills = profileSkills.slice(0, 5)
  const hiddenSkillCount = Math.max(profileSkills.length - visibleSkills.length, 0)

  const workExperience =
    talentProfile?.workExperience && talentProfile.workExperience.length > 0
      ? talentProfile.workExperience.map((exp) => [
          exp.role,
          exp.company,
          `${exp.startDate ?? ""}${
            exp.startDate || exp.endDate ? " - " : ""
          }${exp.endDate ?? "Present"}`,
        ])
      : workExperienceFallback

  const portfolioItems =
    talentProfile?.portfolio && talentProfile.portfolio.length > 0
      ? talentProfile.portfolio.map((item, index) => ({
          src:
            item.thumbnailUrl ||
            portfolioFallback[index % portfolioFallback.length].src,
          alt: item.title || portfolioFallback[index % portfolioFallback.length].alt,
        }))
      : portfolioFallback

  const overviewText = extractOverviewText(talentProfile?.overview)

  const showNotice = (message: string) => {
    setNotice(message)
  }

  const handleHire = () => {
    router.push(
      `/talent-checkout/${encodeURIComponent(profile.username)}/project-details`
    )
  }

  const handleSave = async () => {
    setIsSaveMenuOpen(false)
    if (!user) {
      openAuthModal("sign-in")
      return
    }
    try {
      if (favoriteId) {
        await FavoritesAPI.removeFavorite(favoriteId)
        setFavoriteId(null)
        showNotice(`${profile.name} removed from saved talent.`)
      } else {
        const res = await FavoritesAPI.addFavorite({
          type: "talent",
          itemId: activeMemberId ?? "",
        })
        setFavoriteId(res.data.id)
        showNotice(`${profile.name} saved to your talent list.`)
      }
    } catch {
      showNotice("Couldn't update saved talent. Please try again.")
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      showNotice("Profile link copied.")
    } catch {
      showNotice("Profile link is ready to copy from the address bar.")
    }
  }

  const handleMessage = () => {
    showNotice(`Message thread with ${profile.name} opened.`)
  }

  const heroSkills = showAllHeroSkills ? profileSkills : visibleSkills

  const renderTabPanel = () => {
    if (activeTab === "Portfolio") {
      return (
        <div className="grid grid-cols-[919px_289px] gap-x-8">
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-6">
              {portfolioItems.map((item) => (
                <article
                  key={item.src}
                  className="relative h-[200px] overflow-hidden rounded-lg border border-gray-200 bg-white"
                >
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                  sizes="290px"
                  className="object-cover"
                  priority
                />
                </article>
              ))}
            </div>
            <Button
              type="button"
              variant="link"
              visual="gray"
              onClick={() => showNotice("More portfolio projects loaded.")}
              className="flex h-5 w-full items-center gap-1 text-xs font-semibold leading-5 text-gray-500 no-underline hover:no-underline"
            >
              <span className="h-px flex-1 bg-gray-200" />
              View More
              <span className="h-px flex-1 bg-gray-200" />
            </Button>
          </div>

          <ContactCard onMessage={handleMessage} />
        </div>
      )
    }

    if (activeTab === "Skills") {
      return (
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold leading-7 text-dark-blue-400">
            Skills
          </h3>
          <div className="mt-5 flex flex-wrap gap-3">
            {profileSkills.map((skill) => (
              <Button
                key={skill}
                type="button"
                variant="ghost"
                visual="gray"
                onClick={() => showNotice(`${skill} selected.`)}
                className="h-8 rounded-full bg-gray-100 px-4 text-sm font-medium leading-none text-gray-700 hover:bg-primary-50 hover:text-primary-500"
              >
                {skill}
              </Button>
            ))}
          </div>
        </section>
      )
    }

    if (activeTab === "Overview") {
      return (
        <section className="rounded-lg border border-gray-200 bg-white p-6 text-sm leading-6 text-dark-blue-400">
          <h3 className="text-lg font-semibold leading-7">Overview</h3>
          <p className="mt-3 max-w-3xl">
            {overviewText ||
              `${profile.name} builds scalable product experiences with a practical focus on clean interfaces, fast delivery, and reliable engineering patterns for client-facing teams.`}
          </p>
        </section>
      )
    }

    if (activeTab === "Offers") {
      return (
        <section className="grid grid-cols-3 gap-5">
          {["Starter Audit", "React Build", "Long-term Team Support"].map(
            (offer, index) => (
              <Button
                key={offer}
                type="button"
                variant="ghost"
                visual="gray"
                onClick={() => showNotice(`${offer} selected.`)}
                className="h-auto flex-col items-start justify-start gap-0 rounded-lg border border-gray-200 bg-white p-5 text-left font-normal hover:bg-white hover:border-primary-500"
              >
                <h3 className="text-base font-semibold text-dark-blue-400">
                  {offer}
                </h3>
                <p className="mt-3 text-sm text-gray-500">
                  {index === 0
                    ? "A focused review of your current product experience."
                    : index === 1
                      ? "Front-end implementation for React product surfaces."
                      : "Ongoing product engineering support for your team."}
                </p>
              </Button>
            )
          )}
        </section>
      )
    }

    if (activeTab === "Work Experience") {
      return (
        <section className="rounded-lg border border-gray-200 bg-white">
          {workExperience.map(([role, company, dates]) => (
            <article
              key={role}
              className="flex items-center justify-between border-b border-gray-100 px-6 py-5 last:border-b-0"
            >
              <div>
                <h3 className="text-base font-semibold text-dark-blue-400">
                  {role}
                </h3>
                <p className="mt-1 text-sm text-gray-500">{company}</p>
              </div>
              <span className="text-sm font-medium text-dark-blue-400">
                {dates}
              </span>
            </article>
          ))}
        </section>
      )
    }

    if (activeTab === "Education") {
      return (
        <section className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-dark-blue-400">
            Education
          </h3>
          {talentProfile?.education && talentProfile.education.length > 0 ? (
            talentProfile.education.map((entry, index) => (
              <p
                key={`${entry.institution}-${index}`}
                className="mt-3 text-sm text-gray-500"
              >
                {entry.degree}, {entry.institution}
                {entry.graduationYear ? ` (${entry.graduationYear})` : ""}
              </p>
            ))
          ) : (
            <p className="mt-3 text-sm text-gray-500">
              B.S. Computer Science, Delhi Technological University
            </p>
          )}
        </section>
      )
    }

    return (
      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-dark-blue-400">
          Project History
        </h3>
        <p className="mt-3 text-sm text-gray-500">
          {(
            talentProfile?.totalProjectsCompleted ??
            teamMemberBasics?.totalProjectsCompleted ??
            0
          ).toLocaleString()}{" "}
          completed projects. Client success rating: N/A.
        </p>
      </section>
    )
  }

  return (
    <>
      <Dialog open={memberId !== null} onOpenChange={onOpenChange}>
        <DialogContent
          className="flex h-[768px] w-[1288px] max-w-[calc(100vw-152px)] flex-col overflow-hidden p-0 font-sans text-dark-blue-400 shadow-[0px_20px_40px_rgba(16,24,40,0.18)]"
          accessibilityTitle={
            activeMemberId
              ? `Viewing ${profile.name}'s profile`
              : "Team member profile"
          }
        >
      {isLoading || !activeMemberId ? (
        <MemberProfileHeroSkeleton onClose={() => onOpenChange(false)} />
      ) : (
      <>
        <header className="flex h-[84px] shrink-0 items-center justify-between border-gray-200 px-6">
          <h1 className="text-lg font-semibold leading-7 text-gray-900">
            Viewing {profile.name}'s profile
          </h1>
          <IconButton
            type="button"
            aria-label="Close profile"
            onClick={() => onOpenChange(false)}
            visual="gray"
            variant="ghost"
            className="rounded-full text-gray-500 hover:text-gray-700"
          >
            <X className="size-5" />
          </IconButton>
        </header>

        <div className="overflow-y-scroll px-6 pb-6 pt-0">
          <section className="h-[448px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0px_2px_2.5px_rgba(0,0,0,0.04)]">
            <div className="box-border flex h-[398px] gap-x-10 p-10">
              <div className="relative size-[318px] shrink-0 overflow-hidden rounded-full bg-[#8BD4EE]">
                {profile.avatarSrc ? (
                  <Image
                    src={profile.avatarSrc}
                    alt={profile.name}
                    fill
                    sizes="318px"
                    className="object-cover object-center"
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[96px] font-semibold text-white">
                    {profile.name.slice(0, 1)}
                  </div>
                )}
              </div>

              <div className="relative min-w-0 flex-1">
                <div className="absolute right-0 top-0 flex shrink-0 items-center gap-x-3">
                  <Button
                    type="button"
                    onClick={handleHire}
                    visual="primary"
                    variant="filled"
                    size="md"
                    className="w-[108px] shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]"
                  >
                    <Plus className="size-[15px]" />
                    <span className="whitespace-nowrap">Hire Me</span>
                  </Button>
                  <div className="relative">
                    <div className="relative inline-flex h-10 w-[138px] overflow-hidden rounded-[5px] bg-white shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[5px] after:border-2 after:border-[#D0D5DD]">
                      <Button
                        type="button"
                        onClick={handleSave}
                        visual="gray"
                        variant="ghost"
                        className="h-10 w-[94px] rounded-none border-r border-[#D0D5DD] font-bold text-[#344054] hover:bg-gray-50"
                      >
                        <Star
                          className={cn(
                            "size-5",
                            isSaved
                              ? "fill-current text-primary-500"
                              : "text-gray-300"
                          )}
                        />
                        {isSaved ? "Saved" : "Save"}
                      </Button>
                      <IconButton
                        type="button"
                        aria-label="More options"
                        aria-expanded={isSaveMenuOpen}
                        onClick={() => setIsSaveMenuOpen((open) => !open)}
                        visual="gray"
                        variant="ghost"
                        className="h-10 w-11 rounded-none text-gray-500 hover:bg-gray-50"
                      >
                        <ChevronDown className="size-5" />
                      </IconButton>
                    </div>
                    {isSaveMenuOpen ? (
                      <div className="absolute right-0 top-12 z-20 w-[180px] rounded-lg border border-gray-100 bg-white p-1 shadow-lg">
                        <Button
                          type="button"
                          onClick={handleSave}
                          variant="ghost"
                          visual="gray"
                          className="h-9 w-full justify-start px-3 text-left text-sm font-medium text-gray-700"
                        >
                          {isSaved ? "Remove saved" : "Save to favorites"}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  <IconButton
                    type="button"
                    aria-label="Share profile"
                    onClick={handleShare}
                    visual="gray"
                    variant="outlined"
                    size="md"
                    className="w-11 border-2 border-[#D0D5DD] text-gray-500 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)] hover:bg-gray-50"
                  >
                    <Share06 className="size-5" />
                  </IconButton>
                </div>

                <div className="min-w-0 overflow-visible pr-[330px]">
                  <div className="min-w-0 overflow-visible">
                    <div className="flex min-w-0 items-baseline gap-x-2 whitespace-nowrap">
                      <h2 className="overflow-visible text-[28px] font-bold leading-[34px] text-dark-blue-400">
                        {profile.name}
                      </h2>
                      <span className="truncate text-[26px] font-light leading-[32px] text-dark-blue-400">
                        {profile.handle}
                      </span>
                    </div>
                    <p className="mt-1 text-[22px] font-medium leading-[27px] text-dark-blue-400">
                      {profile.title}
                    </p>
                    <p className="mt-2 text-sm font-normal leading-[17px] text-dark-blue-400">
                      {profile.experience}
                    </p>

                    <div className="mt-6 flex items-center gap-x-5">
                      <span className="inline-flex h-[23px] items-center gap-x-1 rounded bg-primary-50 px-2 text-xs font-medium leading-[15px] text-primary-500">
                        <Star className="size-3 fill-current" />
                        {talentProfile?.rating ?? "N/A"}
                      </span>
                      <span className="text-xs font-normal leading-none text-dark-blue-400">
                        {talentProfile?.reviewsCount != null
                          ? `${talentProfile.reviewsCount} reviews`
                          : "No reviews"}
                      </span>
                    </div>

                    <div className="mt-6 space-y-3">
                      <p className="flex items-center gap-x-[9px] text-sm font-medium leading-[17px] text-dark-blue-400">
                        <MapPin className="size-4 shrink-0" />
                        {profile.location}
                      </p>
                      <p className="flex items-center gap-x-2 text-sm font-light leading-[17px] text-dark-blue-400">
                        <Clock className="size-4 shrink-0" />
                        {profile.name} is{" "}
                        <span className="font-bold text-success-500">
                          {talentProfile?.availability || "available"}
                        </span>{" "}
                        for hire
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-[54px]">
                  <h3 className="text-sm font-semibold leading-[17px] text-dark-blue-400">
                    What I do
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
                    {heroSkills.map((skill) => (
                      <span
                        key={skill}
                        className="flex h-7 items-center rounded-2xl bg-gray-100 px-3 py-1 text-sm font-medium leading-none text-gray-700"
                      >
                        {skill}
                      </span>
                    ))}
                    {hiddenSkillCount > 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        visual="gray"
                        onClick={() =>
                          setShowAllHeroSkills((current) => !current)
                        }
                        className="h-7 gap-1 rounded-2xl bg-gray-100 px-3 py-1 text-sm font-medium leading-none text-gray-700 hover:bg-gray-100"
                      >
                        {showAllHeroSkills ? null : (
                          <Plus className="size-[15px]" />
                        )}
                        {showAllHeroSkills
                          ? "Show less"
                          : `${hiddenSkillCount} more...`}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative -left-px flex h-[49px] w-[calc(100%+2px)] shrink-0 items-center gap-x-8 border-t border-gray-200 bg-[rgba(18,42,75,0.02)] px-8 text-dark-blue-400">
              <div className="flex w-[165px] shrink-0 items-center gap-x-2 whitespace-nowrap text-center">
                <span className="text-sm font-light leading-[17px]">Rate</span>
                <span className="flex items-center text-[20px] font-bold leading-[25px]">
                  {profile.rateAmount}
                  <span className="text-sm font-light leading-[17px]">/hr</span>
                </span>
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-between">
                {[
                  ["Client success rating", "N/A", "w-[180px]"],
                  [
                    "Total projects completed",
                    String(
                      talentProfile?.totalProjectsCompleted ??
                        teamMemberBasics?.totalProjectsCompleted ??
                        0
                    ),
                    "w-[210px]",
                  ],
                  [
                    "Member since",
                    (() => {
                      const memberSince =
                        talentProfile?.memberSince ?? teamMemberBasics?.memberSince
                      return memberSince
                        ? new Date(memberSince).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "N/A"
                    })(),
                    "w-[247px]",
                  ],
                  [
                    "Repeat hire rate",
                    (() => {
                      const repeatHireRate =
                        talentProfile?.repeatHireRate ?? teamMemberBasics?.repeatHireRate
                      return repeatHireRate != null ? `${repeatHireRate}%` : "N/A"
                    })(),
                    "w-[148px]",
                  ],
                ].map(([label, value, widthClass]) => (
                  <React.Fragment key={label}>
                    <span className="relative h-[22px] w-0 shrink-0 after:absolute after:inset-y-0 after:left-0 after:w-px after:bg-gray-200" />
                    <span
                      className={cn(
                        "flex shrink-0 items-center gap-x-3 whitespace-nowrap text-sm leading-[17px]",
                        widthClass
                      )}
                    >
                      <span className="font-light">{label}</span>
                      <span className="font-bold">{value}</span>
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </section>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as ProfileTab)}
          >
            <TabsList className="h-11 w-full justify-start gap-x-8 border-b-gray-200 px-5 pt-0">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="h-8 px-1 pb-[11px] capitalize hover:text-dark-blue-400"
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="mt-6">{renderTabPanel()}</div>
        </div>
      </>
      )}
        </DialogContent>
      </Dialog>

      {notice ? (
        <div className="fixed bottom-8 left-8 z-50 rounded-[5px] bg-gray-900 px-5 py-4 text-sm font-semibold text-white shadow-lg">
          {notice}
        </div>
      ) : null}
    </>
  )
}

function ContactCard({ onMessage }: { onMessage: () => void }) {
  return (
    <aside className="h-[152px] rounded-t-lg border border-[#E6E8ED] bg-white p-[25px] text-center">
      <p className="flex items-center justify-center gap-1 text-sm font-light leading-[17px] text-dark-blue-400">
        <span className="size-2 rounded-full bg-gray-500" />
        <span className="font-bold">Offline</span>
        <span>3:30 PM local time</span>
      </p>
      <p className="mt-2 text-sm font-light leading-[17px] text-dark-blue-400">
        Average response time <span className="font-bold">1 hour</span>
      </p>
      <Button
        type="button"
        onClick={onMessage}
        visual="primary"
        variant="outlined"
        size="md"
        className="mt-5 w-full border-2 border-primary-500 bg-white text-primary-500 hover:bg-primary-50"
      >
        <MessageTextSquare01 className="size-[15px]" />
        Message Me
      </Button>
    </aside>
  )
}

const Shimmer = ({ className }: { className: string }) => (
  <div className={cn("relative overflow-hidden bg-gray-100", className)}>
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-white to-gray-100" />
  </div>
)

function MemberProfileHeroSkeleton({ onClose }: { onClose: () => void }) {
  return (
    <>
      <header className="flex h-[84px] shrink-0 items-center justify-between border-gray-200 px-6">
        <Shimmer className="h-5 w-64 rounded" />
        <IconButton
          type="button"
          aria-label="Close profile"
          onClick={onClose}
          visual="gray"
          variant="ghost"
          className="rounded-full text-gray-500 hover:text-gray-700"
        >
          <X className="size-5" />
        </IconButton>
      </header>

      <div className="overflow-y-scroll px-6 pb-6 pt-0">
        <section className="h-[448px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0px_2px_2.5px_rgba(0,0,0,0.04)]">
          <div className="box-border flex h-[398px] gap-x-10 p-10">
            <Shimmer className="size-[318px] shrink-0 rounded-full" />

            <div className="relative min-w-0 flex-1">
              <div className="absolute right-0 top-0 flex shrink-0 items-center gap-x-3">
                <Shimmer className="h-10 w-[108px] rounded-[5px]" />
                <Shimmer className="h-10 w-[138px] rounded-[5px]" />
                <Shimmer className="h-10 w-11 rounded-[5px]" />
              </div>

              <div className="min-w-0 overflow-visible pr-[330px]">
                <Shimmer className="h-[34px] w-52 rounded" />
                <Shimmer className="mt-3 h-[27px] w-40 rounded" />
                <Shimmer className="mt-2 h-[17px] w-36 rounded" />

                <div className="mt-6 flex items-center gap-x-3">
                  <Shimmer className="h-[23px] w-16 rounded" />
                  <Shimmer className="h-3 w-20 rounded" />
                </div>

                <div className="mt-6 space-y-3">
                  <Shimmer className="h-[17px] w-48 rounded" />
                  <Shimmer className="h-[17px] w-56 rounded" />
                </div>
              </div>

              <div className="mt-[54px]">
                <Shimmer className="h-[17px] w-20 rounded" />
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
                  <Shimmer className="h-7 w-20 rounded-2xl" />
                  <Shimmer className="h-7 w-24 rounded-2xl" />
                  <Shimmer className="h-7 w-16 rounded-2xl" />
                  <Shimmer className="h-7 w-28 rounded-2xl" />
                </div>
              </div>
            </div>
          </div>

          <div className="relative -left-px flex h-[49px] w-[calc(100%+2px)] shrink-0 items-center gap-x-8 border-t border-gray-200 bg-[rgba(18,42,75,0.02)] px-8">
            <Shimmer className="h-[17px] w-[165px] rounded" />
            <Shimmer className="h-[17px] w-[180px] rounded" />
            <Shimmer className="h-[17px] w-[190px] rounded" />
            <Shimmer className="h-[17px] w-[150px] rounded" />
          </div>
        </section>
      </div>
    </>
  )
}
