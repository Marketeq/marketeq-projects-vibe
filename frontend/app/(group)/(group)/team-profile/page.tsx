"use client"

/**
 * Team Profile page.
 *
 * Adapted from the talent-profile page structure and styled to match the
 * team profile reference design. Uses mock data for now — there is no
 * backend team endpoint yet. Accepts an optional `?teamId=...` search param
 * (ignored in favor of the mock until the API lands).
 */

import React, { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  ChevronDown,
  Clock,
  Heart,
  MapPin,
  MarkerPin02,
  MessageSquare01,
  Plus,
  SearchMd,
  Share01,
  Star,
  XCircle,
} from "@blend-metrics/icons"
import { Adobe } from "@/components/icons/adobe"
import { Dropbox } from "@/components/icons/dropbox"
import { Microsoft } from "@/components/icons/microsoft"
import { Nasdaq } from "@/components/icons/nasdaq"
import NextImage from "@/components/next-image"
import NextLink from "@/components/next-link"
import { Money } from "@/components/money"
import { cn } from "@/utils/functions"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Toggle,
  buttonVariants,
} from "@/components/ui"

// ────────────────────────────────────────────────────────────────────────────
// Mock team data (until backend endpoint exists)
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
  clientSuccessRating: "95%",
  totalProjectsCompleted: 1450,
  averageRating: 4.5,
  repeatHireRate: "85%",
  featuredMembers: [
    {
      name: "Username",
      role: "Full-stack Developer",
      photo: "/man.jpg",
      allStar: true,
    },
    {
      name: "Username",
      role: "Full-stack Developer",
      photo: "/woman.jpg",
      allStar: true,
    },
    {
      name: "Username",
      role: "Full-stack Developer",
      photo: "/man.jpg",
      allStar: true,
    },
  ],
  otherMemberAvatars: [
    "/man.jpg",
    "/woman.jpg",
    "/man.jpg",
    "/woman.jpg",
  ],
  extraMemberCount: 24,
  stats: {
    completedProjects: "40+",
    happyClients: "15+",
    yearsCollectiveExperience: "30+",
  },
  localTime: "3:30 PM local time",
  avgResponse: "1 hour",
  status: "Offline" as "Online" | "Offline",
  languages: ["English", "Hindi", "+2 more"],
  locations: "United States, India, Pakistan, +1 more",
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
  about:
    "Front-end Technologies & Web Accessibility | Exploring Human Interface Design\n\nI'm passionate about crafting intuitive, user-friendly digital experiences with a strong focus on accessibility and human-centered design. With expertise in HTML, CSS, JavaScript, and modern frameworks, I create seamless interfaces that enhance usability for all users, including those with disabilities. I believe technology should be inclusive, aesthetically engaging, and functionally efficient.\n\nI'm always exploring the latest trends in UI/UX and human interface design to ensure that every project balances innovation with practicality. Whether it's optimizing website performance, implementing responsive design, or improving accessibility compliance, I take a detail-oriented approach to building digital products that truly connect with users. I thrive on solving complex design challenges and turning ideas into meaningful, interactive experiences.",
  featuredClients: [
    { name: "Dropbox", Icon: Dropbox },
    { name: "Microsoft", Icon: Microsoft },
    { name: "Adobe", Icon: Adobe },
    { name: "Nasdaq", Icon: Nasdaq },
  ],
  portfolioImages: [
    "/coding-1.jpg",
    "/cpu.png",
    "/dashboard.png",
    "/boxes.jpg",
    "/bar.jpg",
    "/building.jpg",
  ],
}

const OUR_TEAM = [
  {
    id: "priya",
    name: "Priya",
    handle: "@TechSenior",
    role: "Data Scientist",
    photo: "/woman.jpg",
    experience: "7 years of experience",
    rateMin: 85,
    rateMax: 120,
    country: "Ukraine",
    rating: 4.9,
    projects: 16,
    skills: [
      "Web Development",
      "Mobile Design",
      "Copy Design",
      "UX Design",
      "Marketing Automation",
    ],
    allStar: true,
  },
  {
    id: "ngozi",
    name: "Ngozi",
    handle: "@QuibberryData",
    role: "Marketing Technologist",
    photo: "/woman.jpg",
    experience: "3 years of experience",
    rateMin: 85,
    rateMax: 120,
    country: "Ukraine",
    rating: 4.7,
    projects: 7,
    skills: [
      "UX/UX Design",
      "Web Design",
      "Data Science",
      "Web Development",
      "Marketing Design",
    ],
    allStar: true,
  },
  {
    id: "octavio",
    name: "Octavio",
    handle: "@Broadcaster",
    role: "Social Media Manager",
    photo: "/man.jpg",
    experience: "6 years of experience",
    rateMin: 85,
    rateMax: 120,
    country: "Ukraine",
    rating: 4.8,
    projects: 4,
    skills: [
      "Web Design",
      "Data Science",
      "Web Development",
      "AI-Generated Design",
    ],
    allStar: true,
  },
]

const OFFERINGS = [
  {
    id: "ecommerce",
    title: "Ecommerce Experience Design",
    description:
      "Brief Description of the project. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod temp…",
    image: "/coding-1.jpg",
    duration: "Starting from 12 weeks",
    budget: "$50,000 budget",
    rating: 4.9,
    reviewCount: 5,
    category: "Front-End",
  },
  {
    id: "bigdata",
    title: "Big Data Security Lockdown",
    description:
      "Brief Description of the project. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod temp…",
    image: "/cpu.png",
    duration: "Starting from 12 weeks",
    budget: "$50,000 budget",
    rating: 4.9,
    reviewCount: 5,
    category: "Back-End",
  },
  {
    id: "aigrowth",
    title: "AI Growth Strategy Buildout",
    description:
      "Brief Description of the project. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod temp…",
    image: "/dashboard.png",
    duration: "Starting from 12 weeks",
    budget: "$50,000 budget",
    rating: 4.9,
    reviewCount: 5,
    category: "Database",
  },
]

const SUCCESS_STORIES = [
  {
    id: "s1",
    title: "Title of Project",
    handle: "@Referrizer",
    image: "/boxes.jpg",
    rating: 4.8,
    postedAgo: "Posted a week ago",
  },
  {
    id: "s2",
    title: "Title of Project",
    handle: "@Referrizer",
    image: "/bar.jpg",
    rating: 4.8,
    postedAgo: "Posted a week ago",
  },
  {
    id: "s3",
    title: "Title of Project",
    handle: "@Referrizer",
    image: "/building.jpg",
    rating: 4.8,
    postedAgo: "Posted a week ago",
  },
]

const AWARDS = [
  {
    id: "a1",
    title: "The Unseen Of Spending Three Years At Pixelgrade",
    year: "2020",
    description:
      "This is a description about the award that the team has won. It's around two sentences and 100…",
  },
  {
    id: "a2",
    title: "The Unseen Of Spending Three Years At Pixelgrade",
    year: "2020",
    description:
      "This is a description about the award that the team has won. It's around two sentences and 100…",
  },
  {
    id: "a3",
    title: "The Unseen Of Spending Three Years At Pixelgrade",
    year: "2020",
    description:
      "This is a description about the award that the team has won. It's around two sentences and 100…",
  },
]

const MEDIA_STRIP = [
  "/coding-1.jpg",
  "/cpu.png",
  "/dashboard.png",
  "/boxes.jpg",
  "/bar.jpg",
]

const WORK_HISTORY_BARS = [
  { stars: 5, percent: 90 },
  { stars: 4, percent: 10 },
  { stars: 3, percent: 0 },
  { stars: 2, percent: 0 },
  { stars: 1, percent: 0 },
]

const WORK_HISTORY_METRICS = [
  { label: "Skills", value: 4.3 },
  { label: "Communication", value: 4.5 },
  { label: "Work Quality", value: 4.8 },
  { label: "Delivery Timeliness", value: 4.8 },
  { label: "Professionalism", value: 4.9 },
]

const REVIEWS = [
  {
    id: "r1",
    reviewer: {
      name: "Emily",
      handle: "@emily.j",
      photo: "/woman.jpg",
      role: "Product Manager",
      location: "San Francisco, CA",
      date: "September 2018",
    },
    rating: 4.8,
    postedAgo: "Posted a week ago",
    wouldRecommend: true,
    highlyProfessional: true,
    repeatCollaboration: true,
    innovativeCreative: true,
    title: "Best Experience with a Backend Engineer!!!!",
    body:
      "Lorem ipsum dolor sit amet consectetur. Mi eu ipsum augue in integer lacus amet semper. Non dictum phasellus elit turpis nisi vitae at. Tristique ultrices habitasse tortor vehicula elementum. Nulla turpis rhoncus venenatis at. In porta viverra faucibus pulvinar.",
    helpful: 10,
    project: {
      title: "Seniority Mobile App",
      image: "/boxes.jpg",
      cost: "$25,000",
      duration: "120 Days",
      industry: "Finance, Healthcare",
      badges: ["Team Player", "Strong Work Ethic", "Attention to Detail"],
    },
  },
  {
    id: "r2",
    reviewer: {
      name: "Sam",
      handle: "@sam.123",
      photo: "/man.jpg",
      role: "UX/UX Designer",
      location: "San Francisco, CA",
      date: "September 2016",
    },
    rating: 4.8,
    postedAgo: "Posted a week ago",
    wouldRecommend: true,
    highlyProfessional: true,
    repeatCollaboration: true,
    innovativeCreative: true,
    title: "Best Experience with a Backend Engineer!!!!",
    body:
      "Lorem ipsum dolor sit amet consectetur. Mi eu ipsum augue in integer lacus amet semper. Non dictum phasellus elit turpis nisi vitae at. Tristique ultrices habitasse tortor vehicula elementum. Nulla turpis rhoncus venenatis at. In porta viverra faucibus pulvinar.",
    helpful: 10,
    project: {
      title: "Referrizer Website",
      image: "/bar.jpg",
      cost: "$50,000",
      duration: "8 Months",
      industry: "Web Design",
      badges: ["Team Player", "Strong Work Ethic", "Attention to Detail"],
    },
  },
  {
    id: "r3",
    reviewer: {
      name: "",
      handle: "",
      photo: "",
      role: "",
      location: "",
      date: "30 days project · March 2021",
    },
    rating: 0,
    postedAgo: "",
    wouldRecommend: false,
    highlyProfessional: false,
    repeatCollaboration: false,
    innovativeCreative: false,
    title: "Company Response @Acme Inc.",
    body:
      "Lorem ipsum dolor sit amet consectetur. Mi eu ipsum augue in integer lacus amet semper. Non dictum phasellus elit turpis nisi vitae at. Tristique ultrices habitasse tortor vehicula elementum. Nulla turpis rhoncus venenatis at. In porta viverra faucibus pulvinar.",
    helpful: 10,
    project: null,
    isCompanyResponse: true,
  },
]

// ────────────────────────────────────────────────────────────────────────────
// Small helpers
// ────────────────────────────────────────────────────────────────────────────

const SaveButton = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [value, setValue] = useState("")

  return (
    <div className="flex items-center">
      <Toggle
        className={buttonVariants({
          className:
            "group border-r-0 rounded-r-none",
          variant: "outlined",
          visual: "gray",
          size: "md",
        })}
      >
        <Star className="size-5 text-gray-300 transition duration-300 group-hover:text-gray-500 group-data-[state=on]:text-primary-500 group-data-[state=on]:fill-primary-500" />
        <span className="group-data-[state=off]:inline-block hidden">Save</span>
        <span className="hidden group-data-[state=on]:inline-block">Saved</span>
      </Toggle>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton
            className="group rounded-l-none text-gray-500"
            variant="outlined"
            visual="gray"
            size="md"
          >
            <ChevronDown className="duration transition group-data-[state=open]:-rotate-180 size-5" />
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
            onClick={() => setIsOpen(true)}
            className="text-primary-500"
          >
            <Plus className="size-4" /> Create New List
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
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

const SectionHeader = ({
  title,
  action,
}: {
  title: string
  action?: React.ReactNode
}) => (
  <div className="flex items-center justify-between mb-5">
    <h2 className="text-xl leading-7 font-bold text-dark-blue-400">{title}</h2>
    {action}
  </div>
)

const StatPill = ({
  value,
  label,
}: {
  value: string
  label: string
}) => (
  <div className="flex flex-col items-center px-3">
    <span className="text-2xl leading-none font-bold text-primary-500">
      {value}
    </span>
    <span className="mt-1 text-[10px] leading-tight font-medium text-dark-blue-400 text-center">
      {label}
    </span>
  </div>
)

// ────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────

export default function TeamProfilePage() {
  return (
    <Suspense>
      <Default />
    </Suspense>
  )
}

function Default() {
  const searchParams = useSearchParams()
  // teamId is reserved for future wiring — currently unused.
  const _teamId = searchParams.get("teamId")

  const [activeTab, setActiveTab] = useState<string>("Portfolio")
  const [offeringsMode, setOfferingsMode] = useState<"Projects" | "Services">(
    "Projects"
  )
  const [offeringsCategory, setOfferingsCategory] = useState<string>("Front-End")
  const [reviewsTab, setReviewsTab] = useState<"Completed" | "Ongoing">(
    "Completed"
  )
  const [reviewSearch, setReviewSearch] = useState("")

  return (
    <div className="py-[50px]">
      <div className="max-w-[1440px] mx-auto px-[100px]">
        {/* ────────── Hero card ────────── */}
        <div className="border border-gray-200 rounded-lg bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
          <div className="p-10 flex items-start gap-x-10">
            {/* Left: team identity */}
            <div className="flex-1 min-w-0">
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
                    className="rounded-[4px] bg-gray-100 text-dark-blue-400 font-medium border-none"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-x-3">
                <Button size="md" className="gap-x-2">
                  <Plus className="size-4" /> Join Team
                </Button>
                <SaveButton />
              </div>
            </div>

            {/* Right: featured members */}
            <div className="flex-shrink-0 w-[380px] relative">
              <div className="relative h-[320px]">
                {/* Main member card - top right */}
                <div className="absolute top-0 right-4">
                  <div className="relative">
                    <Avatar className="size-[150px] border-4 border-white shadow-lg">
                      <AvatarImage
                        src={TEAM.featuredMembers[0].photo}
                        alt={TEAM.featuredMembers[0].name}
                      />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-1 right-0 bg-dark-blue-400 text-white text-[10px] font-medium px-2 py-1 rounded-full flex items-center gap-x-1">
                      <Star className="size-3 fill-primary-500 text-primary-500" />
                      All Star
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
                </div>

                {/* Member 2 - right middle */}
                <div className="absolute top-[70px] right-0">
                  <div className="relative">
                    <Avatar className="size-[80px] border-4 border-white shadow-lg">
                      <AvatarImage
                        src={TEAM.featuredMembers[1].photo}
                        alt={TEAM.featuredMembers[1].name}
                      />
                      <AvatarFallback>M</AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-1 -right-1 bg-dark-blue-400 text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-x-1">
                      <Star className="size-2.5 fill-primary-500 text-primary-500" />
                      All Star
                    </div>
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

                {/* Member 3 - left bottom */}
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

                {/* Extra members count */}
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
          </div>

          {/* Stats strip */}
          <div className="py-3 px-8 border-t border-gray-200 grid grid-cols-5 divide-x divide-gray-200 bg-[#122A4B]/[.02]">
            <div className="flex items-center justify-center gap-x-2 py-1">
              <span className="text-xs font-light text-gray-500">Rate</span>
              <span className="text-sm font-bold text-dark-blue-400">
                ${TEAM.rateMin} - ${TEAM.rateMax}
                <span className="font-light text-gray-500">/hr</span>
              </span>
            </div>
            <div className="flex items-center justify-center gap-x-2 py-1">
              <span className="text-xs font-light text-gray-500">
                Client success rating
              </span>
              <span className="text-sm font-bold text-dark-blue-400">
                {TEAM.clientSuccessRating}
              </span>
            </div>
            <div className="flex items-center justify-center gap-x-2 py-1">
              <span className="text-xs font-light text-gray-500">
                Total projects completed
              </span>
              <span className="text-sm font-bold text-dark-blue-400">
                {TEAM.totalProjectsCompleted}
              </span>
            </div>
            <div className="flex items-center justify-center gap-x-2 py-1">
              <span className="text-xs font-light text-gray-500">
                Average rating
              </span>
              <span className="inline-flex items-center gap-x-1 text-sm font-bold text-dark-blue-400">
                <Star className="size-3 fill-primary-500 text-primary-500" />
                {TEAM.averageRating}
              </span>
            </div>
            <div className="flex items-center justify-center gap-x-2 py-1">
              <span className="text-xs font-light text-gray-500">
                Repeat hire rate
              </span>
              <span className="text-sm font-bold text-dark-blue-400">
                {TEAM.repeatHireRate}
              </span>
            </div>
          </div>
        </div>

        {/* ────────── Tabs ────────── */}
        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent border-b border-gray-200 rounded-none w-full justify-start h-auto p-0 gap-x-8">
              {[
                "Overview",
                "Portfolio",
                "Services",
                "Offers",
                "Specialization",
                "Success Stories",
                "Team",
                "Work History",
              ].map((tab) => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="data-[state=active]:text-primary-500 data-[state=active]:border-b-2 data-[state=active]:border-primary-500 rounded-none px-0 pb-3 pt-0 text-sm font-medium text-gray-500 hover:text-dark-blue-400 bg-transparent shadow-none"
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* ────────── Portfolio gallery ────────── */}
        <section className="mt-6">
          <div className="grid grid-cols-4 grid-rows-2 gap-3 h-[360px]">
            <div className="relative rounded-lg overflow-hidden bg-gray-100">
              <NextImage
                src={TEAM.portfolioImages[0]}
                alt="Portfolio"
                fill
                className="object-cover"
                sizes="25vw"
              />
            </div>
            <div className="relative rounded-lg overflow-hidden bg-gray-100">
              <NextImage
                src={TEAM.portfolioImages[1]}
                alt="Portfolio"
                fill
                className="object-cover"
                sizes="25vw"
              />
            </div>
            <div className="relative rounded-lg overflow-hidden bg-gray-100">
              <NextImage
                src={TEAM.portfolioImages[2]}
                alt="Portfolio"
                fill
                className="object-cover"
                sizes="25vw"
              />
            </div>
            <div className="relative rounded-lg overflow-hidden bg-white border border-gray-200 flex flex-col justify-center items-center px-4">
              <div className="flex gap-x-4 mb-2">
                <StatPill
                  value={TEAM.stats.completedProjects}
                  label="Completed Projects"
                />
                <StatPill
                  value={TEAM.stats.happyClients}
                  label="Happy Clients"
                />
                <StatPill
                  value={TEAM.stats.yearsCollectiveExperience}
                  label="Years Collective Experience"
                />
              </div>
            </div>

            <div className="relative rounded-lg overflow-hidden bg-dark-blue-400 flex flex-col justify-end p-4">
              <AvatarGroup max={4} size="sm" className="mb-2">
                {TEAM.otherMemberAvatars.map((src, i) => (
                  <Avatar
                    key={i}
                    size="sm"
                    className="border-2 border-dark-blue-400"
                  >
                    <AvatarImage src={src} alt="Member" />
                    <AvatarFallback>·</AvatarFallback>
                  </Avatar>
                ))}
              </AvatarGroup>
              <span className="text-xs font-semibold text-white">
                Meet the Team
              </span>
            </div>
            <div className="relative rounded-lg overflow-hidden bg-gray-100">
              <NextImage
                src={TEAM.portfolioImages[3]}
                alt="Portfolio"
                fill
                className="object-cover"
                sizes="25vw"
              />
            </div>
            <div className="relative rounded-lg overflow-hidden bg-gray-100">
              <NextImage
                src={TEAM.portfolioImages[4]}
                alt="Portfolio"
                fill
                className="object-cover"
                sizes="25vw"
              />
            </div>
            <div className="relative rounded-lg overflow-hidden bg-gray-100">
              <NextImage
                src={TEAM.portfolioImages[5]}
                alt="Portfolio"
                fill
                className="object-cover"
                sizes="25vw"
              />
            </div>
          </div>
          <div className="mt-4 text-center">
            <Button variant="link" visual="gray" size="sm">
              View More
            </Button>
          </div>
        </section>

        {/* ────────── About + Sidebar ────────── */}
        <section className="mt-10 grid grid-cols-[1fr_300px] gap-x-8">
          <div className="border border-gray-200 rounded-lg bg-white p-6">
            <h2 className="text-lg font-bold text-dark-blue-400 mb-3">
              About the team
            </h2>
            <p className="text-sm font-light text-dark-blue-400 leading-relaxed whitespace-pre-line">
              {TEAM.about}
            </p>
            <Button
              variant="link"
              visual="gray"
              size="sm"
              className="mt-2 p-0"
            >
              Read More
            </Button>

            <div className="mt-6 flex items-center gap-x-2 border-t border-gray-100 pt-5">
              <Badge
                visual="primary"
                className="rounded-full bg-primary-50 text-primary-700 border-primary-200"
              >
                Featured Clients
              </Badge>
              <Badge
                visual="gray"
                className="rounded-full bg-gray-50 text-gray-600 border-gray-200"
              >
                Certifications
              </Badge>
              <Badge
                visual="gray"
                className="rounded-full bg-gray-50 text-gray-600 border-gray-200"
              >
                Industry Expertise
              </Badge>
            </div>

            <div className="mt-4 flex items-center gap-x-6">
              {TEAM.featuredClients.map(({ name, Icon }) => (
                <div
                  key={name}
                  className="flex items-center gap-x-2 text-gray-500"
                >
                  <Icon className="h-5" />
                  <span className="text-sm font-medium">{name}</span>
                </div>
              ))}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="border border-gray-200 rounded-lg bg-white p-4">
              <div className="flex items-center gap-x-2">
                <span className="inline-block size-2 rounded-full bg-gray-400" />
                <span className="text-sm font-medium text-dark-blue-400">
                  {TEAM.status}
                </span>
                <span className="text-xs text-gray-500">{TEAM.localTime}</span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Average response time{" "}
                <span className="font-semibold text-dark-blue-400">
                  {TEAM.avgResponse}
                </span>
              </p>
              <Button className="mt-3 w-full" variant="outlined" visual="primary">
                <MessageSquare01 className="size-4" /> Message Us
              </Button>
            </div>

            <div className="border border-gray-200 rounded-lg bg-white p-4 space-y-4 text-xs">
              <div>
                <p className="font-semibold text-dark-blue-400 mb-1">
                  Languages
                </p>
                <p className="text-gray-500">{TEAM.languages.join(", ")}</p>
              </div>
              <div>
                <p className="font-semibold text-dark-blue-400 mb-1">
                  Locations
                </p>
                <div className="flex items-start gap-x-1 text-gray-500">
                  <MarkerPin02 className="size-3 mt-0.5 shrink-0" />
                  <span>{TEAM.locations}</span>
                </div>
              </div>
              <div>
                <p className="font-semibold text-dark-blue-400 mb-1">
                  Top Categories
                </p>
                <p className="text-gray-500 leading-relaxed">
                  {TEAM.topCategories.join(", ")}
                </p>
              </div>
            </div>
          </aside>
        </section>

        {/* ────────── Our Team ────────── */}
        <section className="mt-10">
          <SectionHeader
            title="Our Team"
            action={
              <Button variant="link" visual="gray" size="sm">
                View All →
              </Button>
            }
          />
          <div className="grid grid-cols-3 gap-5">
            {OUR_TEAM.map((member) => (
              <article
                key={member.id}
                className="p-5 border border-gray-200 rounded-lg bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]"
              >
                <div className="relative h-[140px] rounded-lg overflow-hidden bg-gray-100 mb-4">
                  <NextImage
                    src={member.photo}
                    alt={member.name}
                    fill
                    className="object-cover"
                    sizes="33vw"
                  />
                  {member.allStar && (
                    <div className="absolute top-2 left-2 bg-dark-blue-400/80 text-white text-[10px] font-medium px-2 py-1 rounded-full flex items-center gap-x-1">
                      <Star className="size-3 fill-primary-500 text-primary-500" />
                      All Stars
                    </div>
                  )}
                  <button
                    aria-label="Favorite"
                    className="absolute top-2 right-2 size-7 rounded-full bg-white/90 flex items-center justify-center"
                  >
                    <Heart className="size-4 text-gray-500" />
                  </button>
                </div>

                <div className="text-sm font-bold text-dark-blue-400">
                  ${member.rateMin} - ${member.rateMax}
                  <span className="font-light text-gray-500">/hr</span>
                </div>

                <h3 className="mt-2 text-base font-bold text-dark-blue-400">
                  {member.name}{" "}
                  <span className="font-light text-gray-500 text-sm">
                    {member.handle}
                  </span>
                </h3>
                <p className="text-xs font-medium text-dark-blue-400 mt-0.5">
                  {member.role}
                </p>
                <p className="text-[11px] font-light text-gray-500 mt-1">
                  {member.experience}
                </p>
                <div className="mt-2 flex items-center gap-x-1">
                  <MarkerPin02 className="size-3 text-gray-500" />
                  <span className="text-[10px] text-gray-500">
                    {member.country}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-x-2">
                  <Star className="size-3 fill-primary-500 text-primary-500" />
                  <span className="text-xs font-semibold text-dark-blue-400">
                    {member.rating}
                  </span>
                  <span className="text-[11px] font-light text-gray-500">
                    {member.projects} projects
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {member.skills.slice(0, 4).map((skill, i) => (
                    <Badge
                      key={`${skill}-${i}`}
                      visual="gray"
                      className="rounded-[4px] bg-gray-100 text-dark-blue-400 text-[10px] font-medium border-none"
                    >
                      {skill}
                    </Badge>
                  ))}
                  {member.skills.length > 4 && (
                    <Badge
                      visual="gray"
                      className="rounded-[4px] bg-gray-100 text-dark-blue-400 text-[10px] font-medium border-none"
                    >
                      More…
                    </Badge>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ────────── What We Offer ────────── */}
        <section className="mt-10">
          <SectionHeader title="What We Offer" />
          <div className="flex items-center justify-between mb-5 -mt-3">
            <div className="inline-flex p-1 bg-gray-100 rounded-md">
              {(["Projects", "Services"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setOfferingsMode(mode)}
                  className={cn(
                    "px-4 py-1.5 text-xs font-medium rounded",
                    offeringsMode === mode
                      ? "bg-white text-dark-blue-400 shadow-sm"
                      : "text-gray-500"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-x-2">
              {["Front-End", "Back-End", "Database"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setOfferingsCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-full border",
                    offeringsCategory === cat
                      ? "border-primary-500 text-primary-500 bg-primary-50"
                      : "border-gray-200 text-gray-500"
                  )}
                >
                  {cat}
                </button>
              ))}
              <Button variant="link" visual="gray" size="sm">
                View All →
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-5">
            {OFFERINGS.map((offer) => (
              <article
                key={offer.id}
                className="p-5 bg-white border rounded-lg border-gray-200 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]"
              >
                <div className="h-[140px] rounded-md overflow-hidden bg-gray-100 relative">
                  <NextImage
                    src={offer.image}
                    alt={offer.title}
                    fill
                    className="object-cover"
                    sizes="33vw"
                  />
                </div>

                <div className="mt-3 flex items-start gap-x-3">
                  <span className="font-bold flex-auto text-base leading-tight text-dark-blue-400">
                    {offer.title}
                  </span>
                  <div className="inline-flex items-center gap-x-1">
                    <Star className="size-[15px] text-primary-500 fill-primary-500" />
                    <span className="text-sm font-medium text-dark-blue-400">
                      {offer.rating.toFixed(1)}{" "}
                      <span className="font-extralight">
                        ({offer.reviewCount})
                      </span>
                    </span>
                  </div>
                </div>

                <p className="mt-2 text-xs font-light text-dark-blue-400 line-clamp-2">
                  {offer.description}
                </p>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-x-2">
                    <Clock className="size-4 text-primary-500" />
                    <span className="text-xs font-medium text-dark-blue-400">
                      {offer.duration}
                    </span>
                  </div>
                  <div className="flex items-center gap-x-2">
                    <Money className="size-4 text-primary-500" />
                    <span className="text-xs font-medium text-dark-blue-400">
                      {offer.budget}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <AvatarGroup max={4} size="sm">
                    {TEAM.otherMemberAvatars.map((src, i) => (
                      <Avatar
                        key={i}
                        size="sm"
                        className="border-2 border-white"
                      >
                        <AvatarImage src={src} alt="Collaborator" />
                        <AvatarFallback>·</AvatarFallback>
                      </Avatar>
                    ))}
                  </AvatarGroup>
                  <button
                    aria-label="Favorite"
                    className="text-gray-400 hover:text-primary-500"
                  >
                    <Star className="size-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Button variant="link" visual="gray" size="sm">
              View More
            </Button>
          </div>
        </section>

        {/* ────────── Success Stories ────────── */}
        <section className="mt-10">
          <SectionHeader
            title="Success Stories"
            action={
              <Button variant="link" visual="gray" size="sm">
                View All →
              </Button>
            }
          />
          <div className="grid grid-cols-3 gap-5">
            {SUCCESS_STORIES.map((story) => (
              <article
                key={story.id}
                className="relative h-[220px] rounded-lg overflow-hidden bg-gray-900"
              >
                <NextImage
                  src={story.image}
                  alt={story.title}
                  fill
                  className="object-cover opacity-80"
                  sizes="33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <p className="text-base font-bold">{story.title}</p>
                  <p className="text-xs font-light opacity-80">
                    {story.handle}
                  </p>
                  <div className="mt-2 flex items-center gap-x-2">
                    <div className="inline-flex items-center gap-x-1">
                      <Star className="size-3 fill-primary-500 text-primary-500" />
                      <span className="text-xs font-semibold">
                        {story.rating}
                      </span>
                    </div>
                    <span className="text-[10px] opacity-70">
                      {story.postedAgo}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ────────── Awards ────────── */}
        <section className="mt-10">
          <SectionHeader
            title="Awards"
            action={
              <Button variant="link" visual="gray" size="sm">
                View All →
              </Button>
            }
          />
          <div className="grid grid-cols-3 gap-5">
            {AWARDS.map((award) => (
              <article
                key={award.id}
                className="p-5 border border-gray-200 rounded-lg bg-white"
              >
                <div className="h-[120px] flex items-center justify-center bg-gray-50 rounded-md mb-4">
                  <svg
                    viewBox="0 0 100 40"
                    className="w-20 h-10 text-dark-blue-400"
                    fill="currentColor"
                  >
                    <path d="M10 30 L 30 10 L 50 25 L 70 5 L 90 30 Z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-dark-blue-400">
                  {award.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1">{award.year}</p>
                <p className="mt-2 text-xs font-light text-dark-blue-400 line-clamp-3">
                  {award.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ────────── Media strip ────────── */}
        <section className="mt-10">
          <div className="grid grid-cols-5 gap-3 h-[100px]">
            {MEDIA_STRIP.map((src, i) => (
              <div
                key={i}
                className="relative rounded-lg overflow-hidden bg-gray-100"
              >
                <NextImage
                  src={src}
                  alt={`Media ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="20vw"
                />
              </div>
            ))}
          </div>
        </section>

        {/* ────────── Work History ────────── */}
        <section className="mt-10 border border-gray-200 rounded-lg bg-white p-6">
          <h2 className="text-lg font-bold text-dark-blue-400 mb-5">
            Work History
          </h2>
          <div className="grid grid-cols-[1fr_1.5fr_1fr] gap-x-8 items-start">
            {/* Rating summary */}
            <div>
              <div className="text-3xl font-bold text-dark-blue-400">
                {TEAM.averageRating.toFixed(1)}
              </div>
              <div className="mt-1 flex items-center gap-x-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={cn(
                      "size-4",
                      n <= Math.round(TEAM.averageRating)
                        ? "fill-primary-500 text-primary-500"
                        : "text-gray-300"
                    )}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-500">23 ratings</p>
            </div>

            {/* Bar chart */}
            <div className="space-y-2">
              {WORK_HISTORY_BARS.map((bar) => (
                <div key={bar.stars} className="flex items-center gap-x-3">
                  <span className="text-xs text-gray-500 w-3">
                    {bar.stars}
                  </span>
                  <div className="flex-1">
                    <Progress value={bar.percent} className="h-2" />
                  </div>
                  <span className="text-xs text-gray-500 w-10 text-right">
                    {bar.percent}% (52)
                  </span>
                </div>
              ))}
            </div>

            {/* Metrics */}
            <div className="space-y-2">
              {WORK_HISTORY_METRICS.map((m) => (
                <div
                  key={m.label}
                  className="flex items-center justify-between"
                >
                  <span className="text-xs text-dark-blue-400">{m.label}</span>
                  <div className="inline-flex items-center gap-x-1">
                    <Star className="size-3 fill-primary-500 text-primary-500" />
                    <span className="text-xs font-semibold text-dark-blue-400">
                      {m.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews tabs */}
          <div className="mt-8 border-t border-gray-100 pt-5">
            <div className="flex items-center justify-between mb-5">
              <div className="inline-flex items-center gap-x-2">
                <button
                  onClick={() => setReviewsTab("Completed")}
                  className={cn(
                    "px-4 py-1.5 text-xs font-medium rounded-full border",
                    reviewsTab === "Completed"
                      ? "border-primary-500 text-primary-500 bg-primary-50"
                      : "border-gray-200 text-gray-500"
                  )}
                >
                  Completed (24)
                </button>
                <button
                  onClick={() => setReviewsTab("Ongoing")}
                  className={cn(
                    "px-4 py-1.5 text-xs font-medium rounded-full border",
                    reviewsTab === "Ongoing"
                      ? "border-primary-500 text-primary-500 bg-primary-50"
                      : "border-gray-200 text-gray-500"
                  )}
                >
                  Ongoing (2)
                </button>
              </div>

              <div className="flex items-center gap-x-3">
                <InputGroup className="w-[240px]">
                  <Input
                    value={reviewSearch}
                    onChange={(e) => setReviewSearch(e.target.value)}
                    placeholder="Search"
                    className="pl-9 h-9 text-sm"
                  />
                  <InputLeftElement className="text-gray-400">
                    <SearchMd className="size-4" />
                  </InputLeftElement>
                  {reviewSearch && (
                    <InputRightElement>
                      <button onClick={() => setReviewSearch("")}>
                        <XCircle className="size-4 text-gray-400" />
                      </button>
                    </InputRightElement>
                  )}
                </InputGroup>
                <Button variant="outlined" visual="gray" size="sm">
                  Most Recent <ChevronDown className="size-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              {REVIEWS.map((review) => (
                <article
                  key={review.id}
                  className="border-b border-gray-100 pb-6 last:border-none last:pb-0"
                >
                  <div className="flex items-start gap-x-3">
                    <Avatar className="size-10">
                      {review.reviewer.photo && (
                        <AvatarImage
                          src={review.reviewer.photo}
                          alt={review.reviewer.name}
                        />
                      )}
                      <AvatarFallback>
                        {review.reviewer.name?.[0] ?? "A"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-x-2">
                        {review.reviewer.name && (
                          <>
                            <span className="text-sm font-semibold text-dark-blue-400">
                              {review.reviewer.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {review.reviewer.handle}
                            </span>
                          </>
                        )}
                        {review.isCompanyResponse && (
                          <span className="text-sm font-semibold text-dark-blue-400">
                            {review.title}
                          </span>
                        )}
                      </div>
                      {!review.isCompanyResponse && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {review.reviewer.role} • {review.reviewer.location}
                          {review.reviewer.date
                            ? ` • ${review.reviewer.date}`
                            : ""}
                        </p>
                      )}
                      {review.isCompanyResponse && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {review.reviewer.date}
                        </p>
                      )}

                      {review.rating > 0 && (
                        <div className="mt-2 flex items-center gap-x-2">
                          <div className="inline-flex items-center gap-x-1">
                            <Star className="size-3 fill-primary-500 text-primary-500" />
                            <span className="text-xs font-semibold text-dark-blue-400">
                              {review.rating.toFixed(1)}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500">
                            {review.postedAgo}
                          </span>
                        </div>
                      )}

                      {!review.isCompanyResponse && (
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                          {review.wouldRecommend && (
                            <span className="text-green-600">
                              ✓ Would Recommend
                            </span>
                          )}
                          {review.repeatCollaboration && (
                            <span className="text-green-600">
                              ✓ Repeat Collaboration
                            </span>
                          )}
                          {review.highlyProfessional && (
                            <span className="text-green-600">
                              ✓ Highly Professional
                            </span>
                          )}
                          {review.innovativeCreative && (
                            <span className="text-green-600">
                              ✓ Innovative & Creative
                            </span>
                          )}
                        </div>
                      )}

                      {!review.isCompanyResponse && (
                        <h4 className="mt-3 text-sm font-bold text-dark-blue-400">
                          {review.title}
                        </h4>
                      )}
                      <p className="mt-1 text-xs font-light text-dark-blue-400 leading-relaxed">
                        {review.body}{" "}
                        <button className="text-primary-500 font-medium">
                          Read More
                        </button>
                      </p>

                      <div className="mt-3 flex items-center gap-x-2 text-xs text-gray-500">
                        <span>Helpful</span>
                        <button className="hover:text-dark-blue-400">👍</button>
                        <span>{review.helpful}</span>
                      </div>

                      {review.project && (
                        <div className="mt-4 p-3 border border-gray-200 rounded-md bg-gray-50 flex items-center gap-x-4">
                          <div className="relative size-14 rounded-md overflow-hidden bg-gray-200 shrink-0">
                            <NextImage
                              src={review.project.image}
                              alt={review.project.title}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-dark-blue-400">
                              {review.project.title}
                            </p>
                            <div className="mt-1 flex items-center gap-x-4 text-[11px] text-gray-500">
                              <span>
                                Project Cost{" "}
                                <span className="font-semibold text-dark-blue-400">
                                  {review.project.cost}
                                </span>
                              </span>
                              <span>
                                Duration{" "}
                                <span className="font-semibold text-dark-blue-400">
                                  {review.project.duration}
                                </span>
                              </span>
                              <span>
                                Industry{" "}
                                <span className="font-semibold text-dark-blue-400">
                                  {review.project.industry}
                                </span>
                              </span>
                            </div>
                            <div className="mt-2 flex items-center gap-x-2">
                              {review.project.badges.map((b) => (
                                <Badge
                                  key={b}
                                  visual="gray"
                                  className="rounded-[4px] bg-white text-gray-600 text-[10px] font-medium border-gray-200"
                                >
                                  {b}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-6 text-center">
              <Button variant="outlined" visual="gray" size="sm">
                Show More Feedback (6)
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
