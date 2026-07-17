"use client"

import * as React from "react"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import { cn } from "@/utils/functions"
import {
  Check,
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

const portfolioItems = [
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

const visibleSkills = [
  "Typescript",
  "React.js",
  "Tailwind CSS",
  "Next.js",
  "Redux",
]

const profileSkills = [
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

const hiddenSkillCount = profileSkills.length - visibleSkills.length

const workExperience = [
  ["Senior React Developer", "Marketeq Labs", "2021 - Present"],
  ["Front-End Engineer", "CloudWorks", "2018 - 2021"],
  ["UI Developer", "Northstar Digital", "2016 - 2018"],
]

const safeDecodeSlug = (value: string): string => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export default function CheckoutMemberProfilePage() {
  const router = useRouter()
  const params = useParams()
  const slug = safeDecodeSlug(params.slug as string)
  const memberId = params.memberId as string
  const profile =
    memberProfiles.find((member) => member.id === memberId) || memberProfiles[2]

  const [activeTab, setActiveTab] = React.useState<ProfileTab>("Portfolio")
  const [isSaved, setIsSaved] = React.useState(false)
  const [isSaveMenuOpen, setIsSaveMenuOpen] = React.useState(false)
  const [showAllHeroSkills, setShowAllHeroSkills] = React.useState(false)
  const [notice, setNotice] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(null), 2400)
    return () => window.clearTimeout(timeout)
  }, [notice])

  const returnToCheckout = () => {
    router.push(`/checkout/${encodeURIComponent(slug)}`)
  }

  const showNotice = (message: string) => {
    setNotice(message)
  }

  const handleHire = () => {
    router.push(`/talent-checkout/${encodeURIComponent(profile.username)}`)
  }

  const handleSave = () => {
    setIsSaved((current) => !current)
    setIsSaveMenuOpen(false)
    showNotice(
      isSaved
        ? `${profile.name} removed from saved talent.`
        : `${profile.name} saved to your talent list.`
    )
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
        <div className="grid grid-cols-[901px_1fr] gap-x-8">
          <div className="grid grid-cols-[290.333px_290.333px_290.333px] gap-[15px]">
            {portfolioItems.map((item) => (
              <article
                key={item.src}
                className="relative h-[200px] overflow-hidden rounded-lg border border-[#EAECF0] bg-white"
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="290px"
                  className="object-cover"
                />
              </article>
            ))}
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
              <button
                key={skill}
                type="button"
                onClick={() => showNotice(`${skill} selected.`)}
                className="inline-flex h-8 items-center rounded-full bg-gray-100 px-4 text-sm font-medium leading-none text-gray-700 transition-colors hover:bg-primary-50 hover:text-primary-500"
              >
                {skill}
              </button>
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
            {profile.name} builds scalable product experiences with a practical
            focus on clean interfaces, fast delivery, and reliable engineering
            patterns for client-facing teams.
          </p>
        </section>
      )
    }

    if (activeTab === "Offers") {
      return (
        <section className="grid grid-cols-3 gap-5">
          {["Starter Audit", "React Build", "Long-term Team Support"].map(
            (offer, index) => (
              <button
                key={offer}
                type="button"
                onClick={() => showNotice(`${offer} selected.`)}
                className="rounded-lg border border-gray-200 bg-white p-5 text-left transition-colors hover:border-primary-500"
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
              </button>
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
          <p className="mt-3 text-sm text-gray-500">
            B.S. Computer Science, Delhi Technological University
          </p>
        </section>
      )
    }

    return (
      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="text-lg font-semibold text-dark-blue-400">
          Project History
        </h3>
        <p className="mt-3 text-sm text-gray-500">
          1,450 completed projects with a 95% client success rating.
        </p>
      </section>
    )
  }

  return (
    <main className="min-h-screen bg-[#7A8591] px-[76px] py-[90px] font-sans text-dark-blue-400">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-member-profile-title"
        className="mx-auto flex h-[684px] w-[1288px] max-w-[calc(100vw-152px)] flex-col overflow-hidden rounded-b-xl rounded-t-lg bg-white shadow-[0px_20px_40px_rgba(16,24,40,0.18)]"
      >
        <header className="flex h-[84px] shrink-0 items-center justify-between border-gray-200 px-6">
          <h1
            id="checkout-member-profile-title"
            className="text-lg font-semibold leading-7 text-gray-900"
          >
            Viewing {profile.name}'s profile
          </h1>
          <button
            type="button"
            aria-label="Close profile"
            onClick={returnToCheckout}
            className="inline-flex size-10 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="overflow-y-auto px-6 pb-6 pt-0">
          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0px_1px_4px_rgba(16,24,40,0.05)]">
            <div className="box-border flex min-h-[397px] gap-x-[55px] px-10 py-[39px]">
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

              <div className="relative min-w-0 flex-1 pt-1">
                <div className="absolute right-0 top-0 flex shrink-0 items-center gap-x-3">
                  <button
                    type="button"
                    onClick={handleHire}
                    className="inline-flex h-10 w-[108px] items-center justify-center gap-x-2 rounded-[5px] bg-primary-500 px-4 py-2.5 text-sm font-semibold leading-5 text-white shadow-xs transition-colors hover:bg-primary-600"
                  >
                    <Plus className="size-[15px]" />
                    <span className="whitespace-nowrap">Hire Me</span>
                  </button>
                  <div className="relative">
                    <div className="inline-flex h-10 w-[138px] overflow-hidden rounded-[5px] border border-[#D0D5DD] bg-white shadow-xs">
                      <button
                        type="button"
                        onClick={handleSave}
                        className="inline-flex h-10 w-[94px] items-center justify-center gap-x-2 border-r border-[#D0D5DD] px-4 py-2.5 text-sm font-semibold leading-5 text-[#344054] transition-colors hover:bg-gray-50"
                      >
                        {isSaved ? (
                          <Check className="size-5 text-primary-500" />
                        ) : (
                          <Star className="size-5 text-gray-300" />
                        )}
                        {isSaved ? "Saved" : "Save"}
                      </button>
                      <button
                        type="button"
                        aria-label="More options"
                        aria-expanded={isSaveMenuOpen}
                        onClick={() => setIsSaveMenuOpen((open) => !open)}
                        className="inline-flex h-10 w-11 items-center justify-center text-gray-500 transition-colors hover:bg-gray-50"
                      >
                        <ChevronDown className="size-5" />
                      </button>
                    </div>
                    {isSaveMenuOpen ? (
                      <div className="absolute right-0 top-12 z-20 w-[180px] rounded-lg border border-gray-100 bg-white p-1 shadow-lg">
                        <button
                          type="button"
                          onClick={handleSave}
                          className="flex h-9 w-full items-center rounded-md px-3 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          {isSaved ? "Remove saved" : "Save to favorites"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    aria-label="Share profile"
                    onClick={handleShare}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-[5px] border border-[#D0D5DD] bg-white text-gray-500 shadow-xs transition-colors hover:bg-gray-50"
                  >
                    <Share06 className="size-5" />
                  </button>
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
                    <p className="mt-1 text-[22px] font-medium leading-none text-dark-blue-400">
                      {profile.title}
                    </p>
                    <p className="mt-2 text-sm font-normal leading-none text-dark-blue-400">
                      {profile.experience}
                    </p>

                    <div className="mt-6 flex items-center gap-x-5">
                      <span className="inline-flex h-[29px] items-center gap-x-1 rounded-md bg-primary-50 px-3 text-xs font-medium leading-none text-primary-500">
                        <Star className="size-4 fill-current" />
                        4.5
                      </span>
                      <span className="text-xs font-normal leading-none text-dark-blue-400">
                        24 reviews
                      </span>
                    </div>

                    <div className="mt-6 space-y-3">
                      <p className="flex items-center gap-x-2 text-sm font-medium leading-none text-dark-blue-400">
                        <MapPin className="size-5 shrink-0" />
                        {profile.location}
                      </p>
                      <p className="flex items-center gap-x-2 text-sm font-light leading-none text-dark-blue-400">
                        <Clock className="size-5 shrink-0" />
                        {profile.name} is{" "}
                        <span className="font-bold text-success-500">
                          available
                        </span>{" "}
                        for hire
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-[54px]">
                  <h3 className="text-sm font-semibold leading-none text-dark-blue-400">
                    What I Do
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
                    {heroSkills.map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => showNotice(`${skill} selected.`)}
                        className="inline-flex h-7 items-center rounded-2xl bg-gray-100 px-3 py-1 text-sm font-medium leading-none text-gray-700 transition-colors hover:bg-primary-50 hover:text-primary-500"
                      >
                        {skill}
                      </button>
                    ))}
                    {hiddenSkillCount > 0 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setShowAllHeroSkills((current) => !current)
                        }
                        className="inline-flex h-7 items-center rounded-2xl bg-gray-100 px-3 py-1 text-sm font-medium leading-none text-gray-700 transition-colors hover:bg-primary-50 hover:text-primary-500"
                      >
                        {showAllHeroSkills
                          ? "Show less"
                          : `+ ${hiddenSkillCount} more...`}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex min-h-[50px] items-center border-t border-gray-200 px-8 text-sm leading-none text-dark-blue-400">
              <div className="flex shrink-0 items-baseline gap-x-3 whitespace-nowrap border-r border-gray-200 pr-8">
                <span className="font-light">Rate</span>
                <span className="text-[20px] font-bold leading-none">
                  {profile.rateAmount}
                  <span className="text-sm font-light leading-none">/hr</span>
                </span>
              </div>
              <div className="flex shrink-0 items-baseline gap-x-3 whitespace-nowrap border-r border-gray-200 px-8">
                <span className="font-light">Client success rating</span>
                <span className="font-bold">95%</span>
              </div>
              <div className="flex shrink-0 items-baseline gap-x-3 whitespace-nowrap border-r border-gray-200 px-8">
                <span className="font-light">Total projects completed</span>
                <span className="font-bold">1450</span>
              </div>
              <div className="flex shrink-0 items-baseline gap-x-3 whitespace-nowrap border-r border-gray-200 px-8">
                <span className="font-light">Member since</span>
                <span className="font-bold">September 19, 2024</span>
              </div>
              <div className="flex shrink-0 items-baseline gap-x-3 whitespace-nowrap pl-8">
                <span className="font-light">Repeat hire rate</span>
                <span className="font-bold">85%</span>
              </div>
            </div>
          </section>

          <nav className="mt-6 border-b border-gray-200">
            <div className="flex h-8 items-start gap-x-8 px-6">
              {tabs.map((tab) => (
                <button
                  type="button"
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "h-8 px-1 pb-[11px] pt-px text-sm font-semibold capitalize leading-5 transition-colors",
                    tab === activeTab
                      ? "border-b-2 border-primary-500 text-primary-500"
                      : "text-gray-500 hover:text-dark-blue-400"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </nav>

          <div className="mt-[23px]">{renderTabPanel()}</div>
        </div>
      </section>

      {notice ? (
        <div className="fixed bottom-8 left-8 z-50 rounded-[5px] bg-gray-900 px-5 py-4 text-sm font-semibold text-white shadow-lg">
          {notice}
        </div>
      ) : null}
    </main>
  )
}

function ContactCard({ onMessage }: { onMessage: () => void }) {
  return (
    <aside className="h-[150px] rounded-lg border border-gray-200 bg-white p-6 text-center">
      <p className="text-sm font-light leading-none text-dark-blue-400">
        <span className="font-semibold text-gray-900">● Offline</span> 3:30 PM
        local time
      </p>
      <p className="mt-3 text-sm font-light leading-none text-dark-blue-400">
        Average response time <span className="font-bold">1 hour</span>
      </p>
      <button
        type="button"
        onClick={onMessage}
        className="mt-[22px] inline-flex h-10 w-full items-center justify-center gap-x-2 rounded-[5px] border border-primary-500 bg-white text-sm font-semibold leading-5 text-primary-500 transition-colors hover:bg-primary-50"
      >
        <MessageTextSquare01 className="size-[15px]" />
        Message Me
      </button>
    </aside>
  )
}
