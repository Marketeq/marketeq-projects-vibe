"use client"

/**
 * My Teams — the team profiles a talent owns or belongs to.
 *
 * Distinct from "My Network" (/my-team), which is the talent network plus
 * external members. This page is the collection of team profiles; that page
 * is the network. They were both labelled "My Team(s)" until 2026-09-03.
 *
 * Talent-only: clients never see this in either nav.
 *
 * Owned and member teams are separated into tabs because they are different
 * relationships — you administer one and belong to the other.
 *
 * Laid out for a SHORT list. Teams here are counted in single digits, so the
 * grid caps at two columns inside a constrained width; a three-up grid leaves
 * one card stranded beside empty space.
 */

import { useCallback, useEffect, useState } from "react"
import { Users01 } from "@blend-metrics/icons"
import { TeamsAPI } from "@/service/http/teams"
import { ListingCard } from "@/components/listing-card"
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
  teamSize?: number
  memberIds?: string[]
}

const OWNED = "Teams You Own"
const MEMBER = "Teams You're In"

/** Team entity -> the shared ListingCard's team shape. */
const toCardProps = (team: MyTeam) => ({
  kind: "team" as const,
  id: String(team.id),
  name: team.title ?? "Untitled team",
  tagline: team.description ?? undefined,
  skills: team.specializations?.length ? team.specializations : team.skills,
  rating: team.rating ?? undefined,
  projectCount: team.completedProjects ?? undefined,
  memberAvatars: undefined,
})

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center gap-y-3 rounded-lg border border-dashed border-gray-200 bg-white px-6 py-14">
    <Users01 className="size-6 text-gray-400" />
    <span className="text-sm font-light text-gray-500">{message}</span>
  </div>
)

const TeamGrid = ({ teams }: { teams: MyTeam[] }) => (
  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
    {teams.map((team) => (
      <ListingCard key={team.id} {...toCardProps(team)} />
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

  return (
    <div className="mx-auto w-full max-w-[860px] px-4 py-10">
      <h1 className="text-[26px] font-semibold leading-6 capitalize text-dark-blue-400">
        My Teams
      </h1>
      <p className="mt-3 text-sm font-light text-gray-500">
        Team profiles you own or belong to.
      </p>

      <Tabs className="mt-8" defaultValue={OWNED}>
        <TabsList className="flex justify-start border-b-0 px-0">
          <TabsTrigger className="pb-[11px]" value={OWNED}>
            {OWNED}
          </TabsTrigger>
          <TabsTrigger className="pb-[11px]" value={MEMBER}>
            {MEMBER}
          </TabsTrigger>
        </TabsList>

        <TabsContent className="mt-6" value={OWNED}>
          {isLoading ? null : owned.length > 0 ? (
            <TeamGrid teams={owned} />
          ) : (
            <EmptyState message="You haven't created a team yet." />
          )}
        </TabsContent>

        <TabsContent className="mt-6" value={MEMBER}>
          {isLoading ? null : member.length > 0 ? (
            <TeamGrid teams={member} />
          ) : (
            <EmptyState message="You're not a member of anyone else's team yet." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
