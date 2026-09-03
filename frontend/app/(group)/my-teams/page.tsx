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
import AuthenticatedRoute from "@/hoc/AuthenticatedRoute"
import { FavoriteType } from "@/service/http/favorites"
import { TeamsAPI } from "@/service/http/teams"
import {
  useAddFavorite,
  useFavorites,
  useRemoveFavorite,
} from "@/src/hooks/useFavorites"
import { Users01 } from "@blend-metrics/icons"
import { LeftSidebar } from "@/components/talent-dashboard-comps"
import { TeamCardLandscape } from "@/components/team-card-landscape"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui"

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
}

const OWNED = "Teams You Own"
const MEMBER = "Teams You're In"

/**
 * Team entity -> the shared TeamCardLandscape row's shape.
 *
 * `tagline` is a single capitalised line in the row, not a paragraph, so the
 * team's primary specialization goes there and the long description is left
 * out -- the row has no slot for prose. `experience` carries the roster size,
 * which is the one line of detail the record can actually support.
 */
const toCardProps = (team: MyTeam) => {
  const skills = team.specializations?.length
    ? team.specializations
    : team.skills
  const size = team.teamSize ?? team.memberIds?.length

  return {
    id: String(team.id),
    name: team.title ?? "Untitled team",
    handle: team.slug ? `@${team.slug}` : undefined,
    tagline: skills?.[0] ?? undefined,
    // The row's one prose line. The team's own description goes here (the
    // `tagline` slot above it is a single capitalised heading, not a
    // paragraph), with the roster size appended since nothing else shows it.
    experience: [
      team.description?.trim() || undefined,
      typeof size === "number"
        ? `${size} member${size === 1 ? "" : "s"}`
        : undefined,
    ]
      .filter(Boolean)
      .join(" · "),
    skills,
    rating: team.rating != null ? Number(team.rating) : undefined,
    // The row renders this as "N reviews", so it must be the review count --
    // completedProjects is a different number and would mislabel it.
    projectCount: team.reviewCount ?? undefined,
    memberAvatars: team.mediaUrls?.length ? team.mediaUrls : undefined,
  }
}

const EmptyState = ({ message }: { message: string }) => (
  <div className="mt-3 flex flex-col items-center gap-y-3 rounded-lg border border-dashed border-gray-200 bg-white px-6 py-14">
    <Users01 className="size-6 text-gray-400" />
    <span className="text-sm font-light text-gray-500">{message}</span>
  </div>
)

const TeamList = ({
  teams,
  savedIds,
  onToggleSave,
}: {
  teams: MyTeam[]
  savedIds: Set<string>
  onToggleSave: (teamId: string) => void
}) => (
  <div className="flex flex-col gap-5 pt-3">
    {teams.map((team) => (
      <TeamCardLandscape
        key={team.id}
        {...toCardProps(team)}
        isSaved={savedIds.has(String(team.id))}
        onSaveClick={() => onToggleSave(String(team.id))}
      />
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

        <div className="flex-auto p-3.5 md:p-6 min-[1024px]:py-8 min-[1024px]:pl-[248px] min-[1024px]:pr-6 overflow-hidden">
          <div className="space-y-5 min-w-0">
            <div>
              <h1 className="text-xl font-bold text-dark-blue-400">My Teams</h1>
              <p className="mt-1 text-sm font-light text-gray-500">
                Team profiles you own or belong to.
              </p>
            </div>

            <Tabs defaultValue={OWNED}>
              <div className="border-b border-gray-200">
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
