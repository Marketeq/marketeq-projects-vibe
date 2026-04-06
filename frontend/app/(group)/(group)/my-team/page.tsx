"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth"
import { InvitationsAPI } from "@/service/http/invitations"
import { AffiliatedTeam, TeamMember, TeamsAPI } from "@/service/http/teams"
import { getFirstItem } from "@/utils/functions"
import {
  Copy,
  Edit03,
  MoreHorizontal,
  Plus,
  SearchMd,
  Trash2,
  Zap,
} from "@blend-metrics/icons"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { ToggleGroupItem, ToggleGroupRoot } from "@/components/ui/toggle-group"
// import CreateTeamForm from "@/components/create-team-form"
import { Grid, List, SortAs } from "@/components/icons"
import { InviteWindow, InviteWindowTrigger } from "@/components/invite-window"
import { TalentProfileCard } from "@/components/talent-profile-card"
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  ScrollArea,
  ScrollBar,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from "@/components/ui"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui"

type MemberWithOrigin = TeamMember & { origin?: "internal" | "network" }

const GRID_LAYOUT = "GRID"
const LIST_LAYOUT = "LIST"

type ApiInvitation = {
  id: string
  teamId: string
  teamName?: string
  invitedEmail: string
  role: "admin" | "editor" | "viewer"
  status: "pending" | "accepted" | "canceled" | "expired"
  token: string
  createdByUserId: string
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function toDisplayName(member: TeamMember): string {
  const fullName = [member.firstName, member.lastName]
    .filter(Boolean)
    .join(" ")
    .trim()
  if (fullName) return fullName
  if (member.username) return member.username
  if (member.email) {
    const local = member.email.split("@")[0] || ""
    if (local) return local
  }
  if (uuidPattern.test(member.userId)) return "Team Member"
  return member.userId
}

// ─── Member Card (Grid) ───────────────────────────────────────────────────────
const MemberCard = ({
  member,
  variant = "full",
  onRefresh,
  teamNames = {},
}: {
  member: TeamMember
  variant?: "full" | "compact"
  onRefresh: () => void
  teamNames?: Record<string, string>
}) => {
  const router = useRouter()
  // Map member fields to TalentProfileCard props
  const user = {
    name:
      [member.firstName, member.lastName].filter(Boolean).join(" ") ||
      member.username ||
      member.email,
    username: member.username,
    avatarUrl:
      member.avatarUrl ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.userId}`,
    title: member.role,
    // yearsOfExperience: not present on TeamMember
    // location, localTime, minRate, maxRate, rating, projects, skills, badge: not present on TeamMember by default
    // These fields will be undefined unless you extend TeamMember or fetch more user data
  }
  const handleDelete = async () => {
    if (!member.teamId || !member.userId) return
    try {
      await TeamsAPI.removeTeamMember(member.teamId, member.userId)
      onRefresh()
    } catch (err) {
      console.error("Failed to delete member", err)
    }
  }

  const handleEdit = () => {
    if (member.username) router.push(`/talent/${member.username}?edit=1`)
  }

  const handleDuplicate = () => {
    console.info("Duplicate requested for", member.userId)
  }

  const handleRunTest = () => {
    console.info("Run Test requested for", member.userId)
  }

  // Get the team name for this member
  const teamName = teamNames[member.teamId] || member.teamId || "Unknown Team"

  return (
    <div className="relative flex flex-col items-center justify-center">
      {member.username ? (
        <>
          <TalentProfileCard
            username={member.username}
            variant={variant}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onRunTest={handleRunTest}
          />
          <div className="text-xs text-gray-500 mt-1">{teamName}</div>
        </>
      ) : (
        <div className="text-xs text-gray-400">No public profile available</div>
      )}
    </div>
  )
}

// ─── Member Card (List) ───────────────────────────────────────────────────────
const MemberCardLandscapeInternal = ({
  member,
  onDelete,
}: {
  member: TeamMember
  onDelete?: () => void
}) => {
  const displayName = toDisplayName(member)
  const avatarUrl =
    member.avatarUrl ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.userId}`
  const fallback = displayName.slice(0, 2).toUpperCase()
  const title = member.role || "Role"
  const status = "Active"
  const companyLogo = (member as any)?.companyLogoUrl

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-[0px_2px_5px_0px_theme(colors.black/.04)] p-4">
      <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
        <Avatar size="md">
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-semibold text-sm text-dark-blue-400">
            {displayName}
          </span>
          <span className="text-xs text-gray-600">{title}</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          {companyLogo && (
            <img
              src={companyLogo}
              alt="Company"
              className="h-8 object-contain"
            />
          )}
        </div>
        <div className="flex items-center gap-6 text-xs md:text-sm text-gray-700 flex-wrap">
          <span>
            Role{" "}
            <span className="font-semibold text-gray-800 capitalize">
              {title}
            </span>
          </span>
          <span>
            Status{" "}
            <span className="font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
              {status}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-gray-400 ml-auto">
          <IconButton aria-label="Message" variant="ghost" visual="gray">
            <Zap className="size-4" />
          </IconButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton aria-label="Actions" variant="ghost" visual="gray">
                <MoreHorizontal className="size-5" />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              <DropdownMenuItem>
                <Edit03 className="mr-2 size-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="mr-2 size-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem>
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
        </div>
      </div>
    </div>
  )
}

const MemberCardLandscapeNetwork = ({
  member,
  onDelete,
}: {
  member: TeamMember
  onDelete?: () => void
}) => {
  const displayName = toDisplayName(member)
  const avatarUrl =
    member.avatarUrl ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.userId}`
  const fallback = displayName.slice(0, 2).toUpperCase()
  const title = member.role || "Role"
  const status = "Unassigned"
  const rating = (member as any)?.client_success_rating ?? "5.0"
  const reviews = 24
  const availability = (member as any)?.availability || "40 hrs / wk"
  const rateDisplay = (member as any)?.rate_min
    ? `$${(member as any).rate_min}/hr`
    : "$55/hr"
  const skills: string[] = (member as any)?.skills || [
    "Wireframing",
    "Sketch App",
    "Axure RP",
    "UX Pin",
    "Visual Design",
    "Figma",
    "More...",
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-[0px_2px_5px_0px_theme(colors.black/.04)] p-4">
      <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
        <Avatar size="md">
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-semibold text-sm text-dark-blue-400">
            {displayName}
          </span>
          <span className="text-xs text-gray-600">{title}</span>
        </div>
        <div className="flex-1 flex items-center gap-6 text-xs md:text-sm text-gray-700 flex-wrap">
          <span className="flex items-center gap-2">
            <span className="bg-primary-100 text-primary-600 px-2 py-0.5 rounded-sm font-semibold">
              {rating}
            </span>
            <span className="text-gray-500">{reviews} reviews</span>
          </span>
          <span>
            Availability{" "}
            <span className="font-semibold text-gray-800">{availability}</span>
          </span>
          <span>
            Status <span className="font-semibold text-gray-800">{status}</span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-gray-400 ml-auto">
          <IconButton aria-label="Message" variant="ghost" visual="gray">
            <Zap className="size-4" />
          </IconButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton aria-label="Actions" variant="ghost" visual="gray">
                <MoreHorizontal className="size-5" />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              <DropdownMenuItem>
                <Edit03 className="mr-2 size-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="mr-2 size-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem>
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
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 text-sm text-primary-700 font-semibold">
        <span>{rateDisplay}</span>
        <div className="flex flex-wrap gap-2 text-gray-500 font-normal">
          {skills.slice(0, 10).map((s, idx) => (
            <span key={s + idx} className="text-xs">
              {s}
            </span>
          ))}
          {skills.length > 10 && (
            <span className="text-xs text-primary-600">More...</span>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Members Display ----------------------------------------------------------
const MembersDisplay = ({
  members,
  layout,
  loading,
  variant = "full",
  view = "network", // default fallback
  onRefresh,
  teamNames,
}: {
  members: MemberWithOrigin[]
  layout: string
  loading: boolean
  variant?: "full" | "compact"
  view?: "network" | "internal"
  onRefresh: () => void
  teamNames: Record<string, string>
}) => {
  if (loading) return <p className="text-sm text-gray-500 mt-6">Loading...</p>
  if (members.length === 0)
    return <p className="text-sm text-gray-500 mt-6">No team members found.</p>

  if (layout === GRID_LAYOUT) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        {members.map((m) => {
          const memberView = (m as MemberWithOrigin).origin ?? view
          const chosenVariant = memberView === "internal" ? "compact" : variant
          // const teamName = teamNames[m.teamId] || m.teamId || "Unknown Team"
          // <div className="text-xs text-gray-500 mb-1">{teamName}</div>
          return (
            <div key={m.userId}>
              <MemberCard
                member={m}
                variant={chosenVariant}
                onRefresh={onRefresh}
                teamNames={teamNames}
              />
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="grid gap-y-3">
      {members.map((m) => {
        const memberView = (m as MemberWithOrigin).origin ?? view
        // const teamName = teamNames[m.teamId] || m.teamId || "Unknown Team"
        // <div className="text-xs text-gray-500 mb-1">{teamName}</div>
        return memberView === "internal" ? (
          <div key={m.userId}>
            {/* <div className="text-xs text-gray-500 mb-1">{teamName}</div> */}
            <MemberCardLandscapeInternal
              member={m}
              onDelete={async () => {
                if (!m.teamId || !m.userId) return
                try {
                  await TeamsAPI.removeTeamMember(m.teamId, m.userId)
                  onRefresh()
                } catch (err) {
                  console.error("Failed to delete member", err)
                }
              }}
            />
          </div>
        ) : (
          <div key={m.userId}>
            {/* <div className="text-xs text-gray-500 mb-1">{teamName}</div> */}
            <MemberCardLandscapeNetwork
              member={m}
              onDelete={async () => {
                if (!m.teamId || !m.userId) return
                try {
                  await TeamsAPI.removeTeamMember(m.teamId, m.userId)
                  onRefresh()
                } catch (err) {
                  console.error("Failed to delete member", err)
                }
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

// --- Helpers ──────────────────────────────────────────────────────────────────
const Dropdown = () => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="focus-visible:outline-none shrink-0">
        <SortAs className="size-4 lg:size-6 text-gray-500" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <ScrollArea
        viewportClassName="max-h-[250px]"
        scrollBar={<ScrollBar className="w-4 p-1" />}
      >
        <DropdownMenuCheckItem>Name A–Z</DropdownMenuCheckItem>
        <DropdownMenuCheckItem>Name Z–A</DropdownMenuCheckItem>
        <DropdownMenuCheckItem>Role</DropdownMenuCheckItem>
      </ScrollArea>
    </DropdownMenuContent>
  </DropdownMenu>
)

const InviteWindowButton = () => (
  <InviteWindowTrigger asChild>
    <Button
      className="border-primary-500 xs:max-lg:text-[10px] xs:max-lg:leading-[18.63px] xs:max-lg:h-8 xs:max-lg:px-[11px] xs:max-lg:py-1.5 xs:max-lg:gap-x-1.5 text-primary-500 hover:text-white hover:bg-primary-500"
      variant="outlined"
      visual="gray"
      size="md"
    >
      <Plus className="size-[11.64px] lg:size-[15px]" /> Add Team Member
    </Button>
  </InviteWindowTrigger>
)

// Helper to fetch team details by IDs
async function fetchTeamNames(
  teamIds: string[]
): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  await Promise.all(
    teamIds.map(async (id) => {
      try {
        const res = await TeamsAPI.getTeam(id)
        const data = res?.data
        if (data && (data.name || data.teamName)) {
          map[id] = data.name || data.teamName || id
        } else {
          map[id] = id
        }
      } catch {
        map[id] = id
      }
    })
  )
  return map
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MyTeam() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [value, setValue] = useState([GRID_LAYOUT])
  const [pendingInvites, setPendingInvites] = useState<ApiInvitation[]>([])
  const [ownMembers, setOwnMembers] = useState<TeamMember[]>([])
  const [networkMembers, setNetworkMembers] = useState<TeamMember[]>([])
  const [allMembers, setAllMembers] = useState<TeamMember[]>([])
  const [teamNames, setTeamNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const currentUserId = useMemo(
    () => (user as any)?.id || (user as any)?.sub || "",
    [user]
  )

  const currentUserEmail = useMemo(
    () => ((user as any)?.email || "").toLowerCase(),
    [user]
  )

  const acceptedTeamId = searchParams.get("teamId") || undefined

  // ─── Fetch members for a list of teamIds, deduped by userId ────────────────
  const fetchMembersForTeams = async (
    teamIds: string[]
  ): Promise<TeamMember[]> => {
    if (teamIds.length === 0) return []
    const results = await Promise.all(
      teamIds.map((id) =>
        TeamsAPI.getTeamMembers(id)
          .then((r) => {
            const p = r?.data
            return Array.isArray(p)
              ? p
              : Array.isArray(p?.data)
                ? p.data
                : Array.isArray(p?.members)
                  ? p.members
                  : []
          })
          .catch(() => [])
      )
    )
    const flat: TeamMember[] = results.flat().filter(Boolean)
    const map: Record<string, TeamMember> = {}
    for (const m of flat) {
      if (m?.userId && !map[m.userId]) map[m.userId] = m
    }
    return Object.values(map)
  }

  const fetchAll = useCallback(async () => {
    if (!currentUserEmail) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)

      // 1. Fetch affiliated teams (new system)
      let affiliatedTeamIds: string[] = []
      try {
        const res = await TeamsAPI.getAffiliatedTeams()
        const payload = res?.data
        const list: AffiliatedTeam[] = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : []
        affiliatedTeamIds = list.map((t) => t.id)
      } catch {
        // non-fatal — fall through to legacy
      }

      // 2. Own team IDs = affiliated team IDs + legacy userId-as-teamId
      //    This ensures yesterday's data (teamId = userId) still shows up
      const ownTeamIds = Array.from(
        new Set(
          [
            ...affiliatedTeamIds,
            currentUserId, // ← legacy fallback
          ].filter(Boolean)
        )
      )

      // 3. Fetch invitations to find joined (network) teams
      const response = await InvitationsAPI.listInvitations({ limit: 100 })
      const payload = response?.data
      let rows: ApiInvitation[] = []
      if (Array.isArray(payload?.data)) rows = payload.data
      else if (Array.isArray(payload)) rows = payload

      const mine = rows.filter(
        (inv) => (inv?.invitedEmail || "").toLowerCase() === currentUserEmail
      )
      setPendingInvites(mine.filter((inv) => inv.status === "pending"))

      // Joined team IDs = accepted invites where teamId is NOT one of our own teams
      const joinedTeamIds = Array.from(
        new Set(
          mine
            .filter((inv) => inv.status === "accepted")
            .map((inv) => inv.teamId)
            .filter((id) => id && !ownTeamIds.includes(id))
        )
      )

      // 4. Fetch members
      const [ownRaw, networkRaw] = await Promise.all([
        fetchMembersForTeams(ownTeamIds),
        fetchMembersForTeams(joinedTeamIds),
      ])

      const own = ownRaw.map((m) => ({ ...m, origin: "internal" as const }))
      const network = networkRaw.map((m) => ({
        ...m,
        origin: "network" as const,
      }))

      setOwnMembers(own)
      setNetworkMembers(network)

      // All = own + network, deduped by userId
      const combinedMap: Record<string, TeamMember> = {}
      for (const m of [...own, ...network]) {
        if (m?.userId && !combinedMap[m.userId]) combinedMap[m.userId] = m
      }
      setAllMembers(Object.values(combinedMap))

      // Collect all unique teamIds from members
      const allTeamIds = Array.from(
        new Set(
          [
            ...ownRaw.map((m) => m.teamId),
            ...networkRaw.map((m) => m.teamId),
          ].filter(Boolean)
        )
      )

      // Fetch team names
      const teamNameMap = await fetchTeamNames(allTeamIds)
      console.log("DEBUG: teamNameMap", teamNameMap)
      setTeamNames(teamNameMap)
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load team data"
      )
    } finally {
      setLoading(false)
    }
  }, [currentUserId, currentUserEmail])

  useEffect(() => {
    fetchAll()
  }, [currentUserEmail, currentUserId, refreshKey, fetchAll])

  useEffect(() => {
    if (searchParams.get("inviteAccepted") !== "1") return

    toast({
      title: "Invitation accepted",
      description: acceptedTeamId
        ? "Your team access has been updated and the accepted team is ready."
        : "Your team access has been updated.",
    })

    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.delete("inviteAccepted")
    const nextQuery = nextParams.toString()

    router.replace(nextQuery ? `/my-team?${nextQuery}` : "/my-team")
    setRefreshKey((k) => k + 1)
  }, [acceptedTeamId, router, searchParams])

  const acceptInvite = async (token: string) => {
    try {
      await InvitationsAPI.acceptInvitation(token)
      setRefreshKey((k) => k + 1)
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to accept invitation")
    }
  }

  const layout = getFirstItem(value) as string

  return (
    <div className="p-3.5 md:p-6 2xl:py-[100px] 2xl:px-[200px]">
      <div className="md:hidden items-center flex flex-row-reverse justify-between">
        <div className="flex items-center gap-x-1.5 2xl:gap-x-6">
          <Dropdown />

          <ToggleGroupRoot
            value={value}
            onValueChange={(d) => setValue(d.value)}
          >
            <ToggleGroupItem value={GRID_LAYOUT}>
              <Grid className="size-4 2xl:size-6" />
            </ToggleGroupItem>
            <ToggleGroupItem value={LIST_LAYOUT}>
              <List className="size-4 2xl:size-6" />
            </ToggleGroupItem>
          </ToggleGroupRoot>
        </div>
        <InviteWindowButton />
      </div>

      <h1 className="text-lg leading-[21.78px] 2xl:text-[28px] 2xl:leading-[33.89px] font-bold text-dark-blue-400 xs:max-md:mt-6">
        My Team
      </h1>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Pending Invitations */}
      {!loading && pendingInvites.length > 0 && (
        <section className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-base font-semibold text-dark-blue-400">
            Pending Invitations For You
          </h2>
          <div className="mt-3 space-y-3">
            {pendingInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-200 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Team: {inv.teamName || inv.teamId}
                  </p>
                  <p className="text-xs text-gray-600">Role: {inv.role}</p>
                </div>
                <Button
                  className="border-primary-500 text-primary-500 hover:text-white hover:bg-primary-500"
                  variant="outlined"
                  visual="gray"
                  size="md"
                  onClick={() => acceptInvite(inv.token)}
                >
                  Accept
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Tabs */}

      <Tabs className="mt-7 2xl:mt-[19px]" defaultValue="Show All">
        <div className="border-b h-10 2xl:h-[60px] flex items-end justify-between border-gray-200">
          <div className="items-end inline-flex gap-x-3 2xl:gap-x-3.5">
            <Button
              className="text-gray-500"
              variant="ghost"
              visual="gray"
              size="md"
            >
              <SearchMd className="size-[18px]" />
            </Button>
            <TabsList className="flex justify-start border-b-0 px-0">
              <TabsTrigger
                className="xs:max-2xl:text-xs xs:max-2xl:leading-5"
                value="Show All"
              >
                Show All
              </TabsTrigger>
              <TabsTrigger
                className="xs:max-2xl:text-xs xs:max-2xl:leading-5"
                value="Internal Team"
              >
                Internal Team
              </TabsTrigger>
              <TabsTrigger
                className="xs:max-2xl:text-xs xs:max-2xl:leading-5"
                value="Talent Network"
              >
                Talent Network
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="hidden items-center gap-x-6 self-start md:flex">
            <div className="flex items-center gap-x-3 2xl:gap-x-3.5">
              <Dropdown />

              <ToggleGroupRoot
                value={value}
                onValueChange={(d) => setValue(d.value)}
              >
                <ToggleGroupItem value={GRID_LAYOUT}>
                  <Grid className="size-4 2xl:size-6" />
                </ToggleGroupItem>
                <ToggleGroupItem value={LIST_LAYOUT}>
                  <List className="size-4 2xl:size-6" />
                </ToggleGroupItem>
              </ToggleGroupRoot>
            </div>
            <InviteWindowButton />
            {/*
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outlined" visual="primary" size="md">
                  <Plus className="size-[11.64px] lg:size-[15px]" /> Create Team
                </Button>
              </DialogTrigger>
              <DialogContent>
                <CreateTeamForm onTeamCreated={() => setRefreshKey((k) => k + 1)} />
              </DialogContent>
            </Dialog>
            */}
          </div>
        </div>

        {/* Show All = own + network */}
        <TabsContent value="Show All">
          <div className="pt-3.5 lg:pt-6">
            <MembersDisplay
              members={allMembers}
              layout={layout}
              loading={loading}
              variant="full"
              view="network"
              onRefresh={() => setRefreshKey((k) => k + 1)}
              teamNames={teamNames}
            />
          </div>
        </TabsContent>

        {/* Internal Team = own affiliated teams + legacy userId-as-teamId */}
        <TabsContent value="Internal Team">
          <div className="pt-3.5 lg:pt-6">
            <MembersDisplay
              members={ownMembers}
              layout={layout}
              loading={loading}
              variant="compact"
              view="internal"
              onRefresh={() => setRefreshKey((k) => k + 1)}
              teamNames={teamNames}
            />
          </div>
        </TabsContent>

        {/* Talent Network = teams joined via invitation */}
        <TabsContent value="Talent Network">
          <div className="pt-3.5 lg:pt-6">
            <MembersDisplay
              members={networkMembers}
              layout={layout}
              loading={loading}
              variant="full"
              view="network"
              onRefresh={() => setRefreshKey((k) => k + 1)}
              teamNames={teamNames}
            />
          </div>
        </TabsContent>
      </Tabs>

      <InviteWindow />
    </div>
  )
}
