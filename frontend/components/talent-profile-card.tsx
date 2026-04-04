import React, { useEffect, useMemo, useState } from "react"
import {
  Copy,
  Edit03,
  MoreHorizontal,
  Star,
  Trash2,
  Zap,
} from "@blend-metrics/icons"
import axios from "axios"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
} from "./ui"

// ============================================================================
// TalentProfileCard Component
// ============================================================================
interface TalentProfile {
  firstName?: string
  lastName?: string
  username: string
  avatarUrl?: string
  location?: string
  timezone?: string
  rate_min?: number
  rate_max?: number
  recentJobTitle?: string
  client_success_rating?: number
  skills?: string[]
  role?: string
  experiences?: any[]
  projects?: number
  yearsOfExperience?: number
  companyLogoUrl?: string
}

type CardVariant = "full" | "compact"

export function TalentProfileCard({
  username,
  variant = "full",
  companyLogoUrl,
  onEdit,
  onDuplicate,
  onRunTest,
  onDelete,
}: {
  username: string
  variant?: CardVariant
  companyLogoUrl?: string
  onEdit?: () => void
  onDuplicate?: () => void
  onRunTest?: () => void
  onDelete?: () => void
}) {
  const [user, setUser] = useState<TalentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Compute experience years safely on every render (hooks must not be conditional)
  const experienceYears = useMemo(() => {
    const direct = user?.yearsOfExperience
    if (typeof direct === "number") return direct
    const exps = user?.experiences ?? []
    const first = exps.find((exp) => exp?.startDate)?.startDate
    if (!first) return undefined
    const diff = Date.now() - new Date(first).getTime()
    return Math.round((diff / (1000 * 60 * 60 * 24 * 365)) * 10) / 10
  }, [user])

  useEffect(() => {
    if (!username) return

    setLoading(true)
    setError(null)

    axios
      .get(`/talent/users/${username}`)
      .then((res) => setUser(res.data))
      .catch((err) =>
        setError(err?.response?.data?.message || "Failed to load profile")
      )
      .finally(() => setLoading(false))
  }, [username])

  if (loading) {
    return (
      <article className="rounded-lg shadow bg-white border p-5 w-full max-w-xs mx-auto">
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-gray-200 animate-pulse" />
          <div className="h-4 w-32 bg-gray-200 animate-pulse mt-3 rounded" />
          <div className="h-3 w-24 bg-gray-200 animate-pulse mt-2 rounded" />
        </div>
      </article>
    )
  }

  if (error) {
    return (
      <article className="rounded-lg shadow bg-white border p-5 w-full max-w-xs mx-auto">
        <div className="text-red-500 text-sm text-center">{error}</div>
      </article>
    )
  }

  if (!user) return null

  const {
    firstName,
    lastName,
    username: uname,
    avatarUrl,
    location,
    timezone,
    rate_min,
    rate_max,
    recentJobTitle,
    client_success_rating,
    skills = [],
    role,
    experiences = [],
    projects,
    companyLogoUrl: companyLogoFromData,
  } = user

  const name = [firstName, lastName].filter(Boolean).join(" ") || uname
  const projectCount =
    typeof projects === "number" ? projects : experiences.length
  const logo = companyLogoUrl ?? companyLogoFromData

  const Menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          aria-label="Open actions"
          size="sm"
          variant="ghost"
          visual="gray"
          className="text-gray-400"
        >
          <MoreHorizontal className="size-4" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            onEdit?.()
          }}
        >
          <Edit03 className="mr-2 size-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            onDuplicate?.()
          }}
        >
          <Copy className="mr-2 size-4" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault()
            onRunTest?.()
          }}
        >
          <Zap className="mr-2 size-4" /> Run Test
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-red-600"
          onSelect={(e) => {
            e.preventDefault()
            onDelete?.()
          }}
        >
          <Trash2 className="mr-2 size-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  if (variant === "compact") {
    return (
      <article className="rounded-xl shadow bg-white border p-5 w-full max-w-[260px] mx-auto relative">
        <div className="absolute right-2 top-2">{Menu}</div>
        <div className="flex flex-col items-center gap-3">
          <Avatar size="xl">
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback>
              {name ? name[0].toUpperCase() : "?"}
            </AvatarFallback>
          </Avatar>
          <h2 className="font-semibold text-base">{uname || name}</h2>
          {(recentJobTitle || role) && (
            <p className="text-sm text-gray-600">{recentJobTitle || role}</p>
          )}
          {logo && (
            <img
              src={logo}
              alt="Company logo"
              className="mt-2 max-h-12 object-contain"
            />
          )}
        </div>
      </article>
    )
  }

  return (
    <article className="rounded-lg shadow bg-white border p-5 w-full max-w-xs mx-auto">
      <div className="flex flex-col items-center">
        <div className="self-end">{Menu}</div>
        <Avatar size="2xl">
          <AvatarImage src={avatarUrl} alt={name} />
          <AvatarFallback>{name ? name[0].toUpperCase() : "?"}</AvatarFallback>
        </Avatar>

        <h2 className="font-bold mt-3 text-lg">{name}</h2>
        {uname && <div className="text-xs text-gray-400 mb-1">@{uname}</div>}
        {role && <p className="text-sm text-gray-500">{role}</p>}
        {recentJobTitle && (
          <p className="text-xs text-gray-500 mt-0.5">{recentJobTitle}</p>
        )}
        {(location || timezone) && (
          <div className="mt-2 text-xs text-gray-600">
            {[location, timezone].filter(Boolean).join(" • ")}
          </div>
        )}

        {rate_min != null && rate_max != null && (
          <div className="mt-2 font-bold text-primary-500 text-base">
            ${rate_min} - ${rate_max}/hr
          </div>
        )}

        <div className="flex items-center mt-2">
          <Star className="text-yellow-400 w-4 h-4" />
          <span className="ml-1 font-medium">
            {client_success_rating ?? "N/A"}
          </span>
          {projectCount > 0 && (
            <span className="ml-2 text-xs text-gray-400">
              {projectCount} project{projectCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {experienceYears !== undefined && (
          <div className="text-xs text-gray-500 mt-1">
            {experienceYears} years of experience
          </div>
        )}

        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3 justify-center">
            {skills.slice(0, 6).map((skill: string) => (
              <Button
                key={skill}
                variant="link"
                visual="gray"
                className="opacity-50 text-xs px-2 py-1"
              >
                {skill}
              </Button>
            ))}
            {skills.length > 6 && (
              <Button
                variant="link"
                visual="gray"
                className="opacity-50 text-xs px-2 py-1"
              >
                +{skills.length - 6} more
              </Button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

// ============================================================================
// Team Members List with Profiles
// ============================================================================
interface TeamMember {
  userId: string
  username: string
  // ... other basic fields from /teams/:teamId/members
}

export function TeamMembersList({ teamId }: { teamId: string }) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [profiles, setProfiles] = useState<Record<string, TalentProfile>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTeamData() {
      try {
        setLoading(true)
        setError(null)

        // Step 1: Fetch team members
        const membersRes = await axios.get(`/teams/${teamId}/members`)
        const members: TeamMember[] = membersRes.data
        setTeamMembers(members)

        // Step 2: Fetch full profiles in parallel
        const profilePromises = members
          .filter((member) => member.username)
          .map(async (member) => {
            try {
              const res = await axios.get(`/talent/users/${member.username}`)
              return { userId: member.userId, profile: res.data }
            } catch (err) {
              console.error(
                `Failed to fetch profile for ${member.username}:`,
                err
              )
              return null
            }
          })

        const profileResults = await Promise.all(profilePromises)

        // Step 3: Build profiles map
        const newProfiles: Record<string, TalentProfile> = {}
        profileResults.forEach((result) => {
          if (result) {
            newProfiles[result.userId] = result.profile
          }
        })
        setProfiles(newProfiles)
      } catch (err: any) {
        setError(err?.response?.data?.message || "Failed to load team members")
      } finally {
        setLoading(false)
      }
    }

    if (teamId) {
      fetchTeamData()
    }
  }, [teamId])

  if (loading) {
    return <div className="text-center py-8">Loading team members...</div>
  }

  if (error) {
    return <div className="text-red-500 text-center py-8">{error}</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
      {teamMembers.map((member) =>
        member.username && profiles[member.userId] ? (
          <TalentProfileCard key={member.userId} username={member.username} />
        ) : (
          <div
            key={member.userId}
            className="rounded-lg shadow bg-white border p-5 w-full max-w-xs mx-auto"
          >
            <div className="text-gray-500 text-sm text-center">
              No public profile available
            </div>
          </div>
        )
      )}
    </div>
  )
}
