"use client"

/**
 * My Teams — the team profiles a talent owns or belongs to.
 *
 * Distinct from "My Network" (/my-network), which is the talent network plus
 * external members. This page is the collection of team profiles; that page
 * is the network. They were both labelled "My Team(s)" until 2026-09-03.
 *
 * Talent-only: clients never see this in either nav.
 *
 * Owned and member teams are separated into tabs because they are different
 * relationships — you administer one and belong to the other.
 *
 * This is an account page, not a marketplace one: it sits outside the
 * marketplace layout group so it gets the LeftSidebar shell and no secondary
 * nav. Chrome (sidebar offsets, h1, tab bar) is copied from /earnings so it
 * does not sit on its own margins.
 *
 * Teams render as the shared TeamCardLandscape row (the approved Figma team
 * row, also used by Browsing History's list view) stacked vertically. The list
 * is short and each row carries more detail than a portrait card would.
 */
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { FavoriteType } from "@/service/http/favorites"
import { TeamsAPI } from "@/service/http/teams"
import {
  useAddFavorite,
  useFavorites,
  useRemoveFavorite,
} from "@/src/hooks/useFavorites"
import { Plus, Users01 } from "@blend-metrics/icons"
import { LeftSidebar } from "@/components/talent-dashboard-comps"
import { TeamCardLandscape } from "@/components/team-card-landscape"
import {
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui"

type MyTeam = {
  id: string
  title?: string
  slug?: string
  logo?: string
  description?: string
  specializations?: string[]
  skills?: string[]
  rating?: number
  completedProjects?: number
  reviewCount?: number
  teamSize?: number
  memberIds?: string[]
  mediaUrls?: string[]
  category?: string
  location?: string | null
  yearsExperience?: number | null
  rateMin?: number | null
  rateMax?: number | null
  previousClientLogos?: string[]
}

const OWNED = "Teams You Own"
const MEMBER = "Teams You're In"

/** "digital-marketing" -> "Digital Marketing" */
const toTitleCase = (value: string) =>
  value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")

/**
 * Team entity -> the shared TeamCardLandscape row's shape.
 *
 * The row's slots are fixed by the design: `tagline` is a single capitalised
 * line naming the team's discipline, `experience` is the seniority line, and
 * the rate range and location each have their own slot. The description is not
 * shown -- the row has no slot for prose.
 */
const toCardProps = (team: MyTeam) => {
  const skills = team.specializations?.length
    ? team.specializations
    : team.skills
  const size = team.teamSize ?? team.memberIds?.length
  const { rateMin, rateMax, yearsExperience } = team

  return {
    id: String(team.id),
    name: team.title ?? "Untitled team",
    handle: team.slug ? `@${team.slug}` : undefined,
    // The type line is the team's own discipline, not its first skill --
    // skills carry the shared Top Categories taxonomy, so every card would
    // otherwise read the same word.
    tagline: team.category
      ? toTitleCase(team.category)
      : (skills?.[0] ?? undefined),
    experience:
      typeof yearsExperience === "number"
        ? `Average ${yearsExperience} years of experience`
        : undefined,
    locations: team.location ?? undefined,
    rate:
      typeof rateMin === "number" && typeof rateMax === "number"
        ? `$${rateMin} - $${rateMax}/hr`
        : undefined,
    skills,
    rating: team.rating != null ? Number(team.rating) : undefined,
    // The row renders this as "N reviews", so it must be the review count --
    // completedProjects is a different number and would mislabel it.
    projectCount: team.reviewCount ?? undefined,
    memberAvatars: team.mediaUrls?.length ? team.mediaUrls : undefined,
    // Roster size, so the cluster's "+N" bubble counts the whole team rather
    // than only the avatars stored on the record.
    memberCount: size,
    previousClientLogos: team.previousClientLogos?.length
      ? team.previousClientLogos
      : undefined,
  }
}

const EmptyState = ({ message }: { message: string }) => (
  <div className="mt-6 flex flex-col items-center gap-y-3 rounded-lg border border-dashed border-gray-200 bg-white px-6 py-14">
    <Users01 className="size-6 text-gray-400" />
    <span className="text-sm font-light text-gray-500">{message}</span>
  </div>
)

const CASCADE_DELAYS = [
  "delay-0",
  "delay-100",
  "delay-200",
  "delay-300",
  "delay-500",
  "delay-700",
]
const cascadeDelay = (i: number) =>
  CASCADE_DELAYS[Math.min(i, CASCADE_DELAYS.length - 1)]

const TeamList = ({
  teams,
  savedIds,
  onToggleSave,
  isOwner,
}: {
  teams: MyTeam[]
  savedIds: Set<string>
  onToggleSave: (teamId: string) => void
  isOwner: boolean
}) => (
  <div className="flex flex-col gap-3 pt-3">
    {teams.map((team, index) => (
      <div
        key={team.id}
        className={`animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out fill-mode-backwards ${cascadeDelay(index)}`}
      >
        <TeamCardLandscape
          {...toCardProps(team)}
          isOwner={isOwner}
          isSaved={savedIds.has(String(team.id))}
          onSaveClick={() => onToggleSave(String(team.id))}
        />
      </div>
    ))}
  </div>
)

export default function MyTeamsPage() {
  const [owned, setOwned] = useState<MyTeam[]>([])
  const [member, setMember] = useState<MyTeam[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await TeamsAPI.getMyTeams()
      const data = (res as { data?: { owned?: MyTeam[]; member?: MyTeam[] } })
        ?.data
      setOwned(Array.isArray(data?.owned) ? data.owned : [])
      setMember(Array.isArray(data?.member) ? data.member : [])
    } catch {
      // Non-fatal: an unreachable teams service leaves both lists empty and the
      // empty state explains it, rather than blanking the page.
      setOwned([])
      setMember([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Saving a team here writes to the same favorites store as the rest of the
  // marketplace, so a team starred on this page shows as starred everywhere.
  const { data: favorites } = useFavorites("team" as FavoriteType)
  const addFavorite = useAddFavorite()
  const removeFavorite = useRemoveFavorite()

  // The API returns groups, each holding its own favorites array.
  const savedByTeamId = useMemo(() => {
    const map = new Map<string, string>()
    const groups = Array.isArray(favorites) ? favorites : []
    for (const group of groups as Array<{
      favorites?: Array<{ id: string; type: string; itemId: string }>
    }>) {
      for (const fav of group.favorites ?? []) {
        if (fav.type === "team") map.set(String(fav.itemId), String(fav.id))
      }
    }
    return map
  }, [favorites])

  const savedIds = useMemo(() => new Set(savedByTeamId.keys()), [savedByTeamId])

  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)

  // Mirrors My Listings' "New Listing": create the record, then open it so the
  // owner names it on the team profile rather than in a dialog here.
  const onCreateTeam = useCallback(async () => {
    if (isCreating) return
    setIsCreating(true)
    try {
      const res = await TeamsAPI.createMyTeam()
      const created = (res as { data?: { id?: string } })?.data
      if (created?.id) router.push(`/team-profile?teamId=${created.id}`)
      else await load()
    } catch {
      // Leave the page as it is; the list is still valid and the owner can retry.
      setIsCreating(false)
    }
  }, [isCreating, router, load])

  const onToggleSave = useCallback(
    (teamId: string) => {
      const existingId = savedByTeamId.get(teamId)
      if (existingId) removeFavorite.mutate(existingId)
      else addFavorite.mutate({ type: "team" as FavoriteType, itemId: teamId })
    },
    [savedByTeamId, addFavorite, removeFavorite]
  )

  return (
    <AuthenticatedRoute>
      <div className="flex bg-gray-50 min-h-screen">
        <LeftSidebar />

        <div className="flex-auto p-3.5 md:p-6 min-[1024px]:pt-[50px] min-[1024px]:pb-8 min-[1024px]:pl-[274px] min-[1024px]:pr-[50px] overflow-hidden">
          <div className="space-y-5 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-dark-blue-400">
                  My Teams
                </h1>
                <p className="mt-1 text-sm font-light text-gray-500">
                  Team profiles you own or belong to.
                </p>
              </div>
              <Button disabled={isCreating} onClick={onCreateTeam}>
                <Plus className="size-[15px]" />
                Create a Team
              </Button>
            </div>

            <Tabs defaultValue={OWNED}>
              <div>
                <TabsList className="flex justify-start border-b-0 px-0">
                  <TabsTrigger value={OWNED}>{OWNED}</TabsTrigger>
                  <TabsTrigger value={MEMBER}>{MEMBER}</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value={OWNED}>
                {isLoading ? null : owned.length > 0 ? (
                  <TeamList
                    teams={owned}
                    savedIds={savedIds}
                    onToggleSave={onToggleSave}
                    isOwner
                  />
                ) : (
                  <EmptyState message="You haven't created a team yet." />
                )}
              </TabsContent>

              <TabsContent value={MEMBER}>
                {isLoading ? null : member.length > 0 ? (
                  <TeamList
                    teams={member}
                    savedIds={savedIds}
                    onToggleSave={onToggleSave}
                    isOwner={false}
                  />
                ) : (
                  <EmptyState message="You're not a member of anyone else's team yet." />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AuthenticatedRoute>
  )
}
