"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/utils/functions"
import { ArrowRight, Check, Star, UserPlus01 } from "@blend-metrics/icons"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
  Badge,
  Button,
  Card,
} from "@/components/ui"

interface NetworkCandidate {
  id: string
  role: string
  name: string
  handle: string
  title: string
  avatar: string
  rating: number
  reviews: number
  skills: string[]
}

// The ordered list of roles a fully-staffed team needs. Order also drives
// the "Next up" / "Currently looking for" banner copy, which names the first
// two roles in this list that don't yet have a selected candidate.
const ROLES_NEEDED = [
  "Product Designer",
  "Full-Stack Developer",
  "QA Engineer",
  "Backend Engineer",
  "Content Strategist",
  "Visual Designer",
  "UX Architect",
  "DevOps Engineer",
]

const CANDIDATES: NetworkCandidate[] = [
  {
    id: "amara-chen",
    role: "Product Designer",
    name: "Amara Chen",
    handle: "@amarabuilds",
    title: "Senior Product Designer",
    avatar: "/woman.jpg",
    rating: 4.9,
    reviews: 31,
    skills: ["Figma", "Design Systems", "User Research", "Prototyping", "Accessibility"],
  },
  {
    id: "marcus-alou",
    role: "Full-Stack Developer",
    name: "Marcus Alou",
    handle: "@marcusdev",
    title: "Senior Full-Stack Developer",
    avatar: "/man.jpg",
    rating: 4.8,
    reviews: 42,
    skills: ["React", "Node.js", "PostgreSQL", "GraphQL", "AWS"],
  },
  {
    id: "priya-raman",
    role: "QA Engineer",
    name: "Priya Raman",
    handle: "@priyaqa",
    title: "Senior QA Engineer",
    avatar: "/confident-woman.jpg",
    rating: 4.7,
    reviews: 19,
    skills: ["Test Automation", "Cypress", "Playwright", "CI/CD", "Regression Testing"],
  },
  {
    id: "diego-fernandez",
    role: "Backend Engineer",
    name: "Diego Fernandez",
    handle: "@diegocodes",
    title: "Backend Engineer",
    avatar: "/man.jpg",
    rating: 4.9,
    reviews: 27,
    skills: ["NestJS", "Microservices", "RabbitMQ", "Docker", "TypeORM"],
  },
  {
    id: "hannah-ito",
    role: "Content Strategist",
    name: "Hannah Ito",
    handle: "@hannahwrites",
    title: "Content Strategist",
    avatar: "/woman.png",
    rating: 4.6,
    reviews: 15,
    skills: ["SEO", "Copywriting", "Content Ops", "Brand Voice", "Editing"],
  },
  {
    id: "leo-whitfield",
    role: "Visual Designer",
    name: "Leo Whitfield",
    handle: "@leocreates",
    title: "Visual Designer",
    avatar: "/man.jpg",
    rating: 4.8,
    reviews: 22,
    skills: ["Branding", "Illustration", "Typography", "Motion Design", "Figma"],
  },
  {
    id: "jordan-blake",
    role: "UX Architect",
    name: "Jordan Blake",
    handle: "@JustDesign",
    title: "Senior UX Architect",
    avatar: "/man.jpg",
    rating: 4.8,
    reviews: 24,
    skills: ["Prototype", "Sketch", "Wireframing", "UX Strategy", "Axure"],
  },
  {
    id: "tariq-simmons",
    role: "DevOps Engineer",
    name: "Tariq Simmons",
    handle: "@tariqops",
    title: "DevOps Engineer",
    avatar: "/man.jpg",
    rating: 4.7,
    reviews: 18,
    skills: ["Kubernetes", "Terraform", "CI/CD", "AWS", "Monitoring"],
  },
]

// Pre-select the first 5 roles' candidates so the banner opens mid-flow,
// matching the Figma state where the avatar stack already shows overflow.
const DEFAULT_SELECTED_IDS = CANDIDATES.slice(0, 5).map((candidate) => candidate.id)

const AVATAR_STACK_MAX = 3

export function TalentNetworkBuilder() {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_SELECTED_IDS)

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const selectedCandidates = useMemo(
    () =>
      selectedIds
        .map((id) => CANDIDATES.find((candidate) => candidate.id === id))
        .filter((candidate): candidate is NetworkCandidate => Boolean(candidate)),
    [selectedIds]
  )

  const remainingCount = Math.max(ROLES_NEEDED.length - selectedCandidates.length, 0)
  const isTeamReady = remainingCount === 0
  const unfilledRoles = useMemo(
    () =>
      ROLES_NEEDED.filter(
        (role) => !selectedCandidates.some((candidate) => candidate.role === role)
      ),
    [selectedCandidates]
  )
  const nextUpRole = unfilledRoles[0]
  const currentlyLookingRole = unfilledRoles[1]

  const overflowCount = Math.max(selectedCandidates.length - AVATAR_STACK_MAX, 0)

  const toggleCandidate = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((existingId) => existingId !== id) : [...prev, id]
    )
  }

  return (
    <div>
      <Card className="flex-col items-stretch gap-5 p-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:p-6">
        <div className="flex items-center gap-4">
          <div className="flex shrink-0 items-center">
            <AvatarGroup size="md" max={AVATAR_STACK_MAX}>
              {selectedCandidates.map((candidate) => (
                <Avatar key={candidate.id} size="md" className="ring-2 ring-white">
                  <AvatarImage src={candidate.avatar} alt={candidate.name} />
                  <AvatarFallback>{candidate.name.charAt(0)}</AvatarFallback>
                </Avatar>
              ))}
            </AvatarGroup>
            {overflowCount > 0 && (
              <span className="ml-2 text-xs font-semibold text-gray-500">
                +{overflowCount} more
              </span>
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-bold leading-tight text-dark-blue-400 lg:text-lg">
              Your team is looking good so far...
            </h2>
            <p className="mt-1 text-sm font-light text-gray-500">
              {isTeamReady
                ? "Your team is fully staffed and ready to go."
                : `${remainingCount} more team member${remainingCount === 1 ? "" : "s"} to add...`}
            </p>
            {!isTeamReady && (nextUpRole || currentlyLookingRole) && (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-gray-500">
                {nextUpRole && (
                  <span>
                    Next up:{" "}
                    <span className="font-semibold text-dark-blue-400">{nextUpRole}</span>
                  </span>
                )}
                {currentlyLookingRole && (
                  <span>
                    Currently looking for:{" "}
                    <span className="font-semibold text-dark-blue-400">
                      {currentlyLookingRole}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <Button
          size="md"
          disabled={selectedCandidates.length === 0}
          onClick={() => router.push("/invite-talent")}
          className="shrink-0"
        >
          Proceed to Confirm Details
          <ArrowRight className="size-4" />
        </Button>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mt-6 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
        {CANDIDATES.map((candidate) => (
          <TalentNetworkCard
            key={candidate.id}
            candidate={candidate}
            selected={selectedSet.has(candidate.id)}
            onToggle={() => toggleCandidate(candidate.id)}
          />
        ))}
      </div>
    </div>
  )
}

function TalentNetworkCard({
  candidate,
  selected,
  onToggle,
}: {
  candidate: NetworkCandidate
  selected: boolean
  onToggle: () => void
}) {
  const visibleSkills = candidate.skills.slice(0, 4)

  return (
    <article className="flex flex-col overflow-hidden rounded-[6px] border border-gray-200 bg-white shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]">
      <div className="p-5">
        <div className="flex items-center gap-3">
          <Avatar size="xl" className="shrink-0">
            <AvatarImage src={candidate.avatar} alt={candidate.name} />
            <AvatarFallback>{candidate.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold leading-none text-dark-blue-400">
              {candidate.name}{" "}
              <span className="text-[12px] font-light leading-none text-gray-500">
                {candidate.handle}
              </span>
            </h3>
            <p className="mt-1.5 text-[12px] font-medium leading-none text-dark-blue-400">
              {candidate.title}
            </p>
          </div>
        </div>

        <div className="mt-3.5 flex items-center gap-x-2">
          <div className="flex items-center gap-x-[5px] rounded-[3.03px] bg-gray-50 px-1.5 py-[3px] shadow-[0px_0.57px_1.14px_0px_rgba(16,24,40,.05)]">
            <div className="flex items-center gap-x-[3px]">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={cn(
                    "size-3 shrink-0",
                    i <= Math.round(candidate.rating)
                      ? "text-primary-500 fill-primary-500"
                      : "text-gray-200 fill-gray-200"
                  )}
                />
              ))}
            </div>
            <span className="text-xs font-semibold leading-none text-dark-blue-400">
              {candidate.rating}
            </span>
          </div>
          <span className="text-xs font-semibold leading-none text-dark-blue-400">
            {candidate.reviews} reviews
          </span>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          {visibleSkills.map((skill) => (
            <Badge
              key={skill}
              visual="gray"
              className="rounded-[5px] border border-gray-200 bg-white px-2 py-[5px] text-dark-blue-400"
            >
              {skill}
            </Badge>
          ))}
          <span className="cursor-pointer text-xs font-bold leading-5 text-gray-500/60 hover:text-gray-500">
            More...
          </span>
        </div>
      </div>

      <div className="mt-auto border-t border-gray-200 p-3">
        <Button
          className="w-full"
          size="sm"
          variant={selected ? "outlined" : "filled"}
          visual={selected ? "gray" : "primary"}
          onClick={onToggle}
        >
          {selected ? (
            <>
              <Check className="size-4" /> Added to My Team
            </>
          ) : (
            <>
              <UserPlus01 className="size-4" /> Add to My Team
            </>
          )}
        </Button>
      </div>
    </article>
  )
}
