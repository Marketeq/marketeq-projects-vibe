import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { getTalentNetwork } from "@/service/http/contracts"
import { useInvitations } from "./useInvitations"

/**
 * The client's Talent Network from GET /contracts/talent-network. The
 * active/pending/past buckets are derived server-side from contracts per
 * "Talent Network & My Team — Final Logic". The UI renders them as-is and
 * never re-classifies raw contracts.
 */
export function useTalentNetwork(clientId?: string) {
  return useQuery({
    queryKey: ["team", "talent-network", clientId],
    queryFn: () => getTalentNetwork(),
    enabled: !!clientId,
  })
}

/** The My Team tab the count is scoped to, as carried in `?tab=`. */
export type OpenTeamTab = "talent" | "external"

/**
 * The "N team members" count. PMCM-720 AC-14.1 (R3-05): active members on the
 * **open tab only** — pending invitations of either kind, and Past Talent,
 * stay visible in their tabs but never count.
 *
 * The count is rendered by the shared secondary nav, which sits above the page
 * in the layout and cannot be told which tab is open, so My Team publishes the
 * tab as `?tab=talent|external` and this reads it back.
 *
 * With no `tab` param — every page other than My Team — it falls back to the
 * previous combined total rather than guessing, so nothing outside My Team
 * changes. An earlier comment here cited a "Final Logic doc" specifying that
 * sum; AC-14.1 supersedes it for My Team, and only for My Team.
 */
export function useTeamMemberCount(userId?: string) {
  const searchParams = useSearchParams()
  const openTab = searchParams?.get("tab") as OpenTeamTab | null

  const networkQuery = useTalentNetwork(userId)
  const acceptedQuery = useInvitations(
    userId ? { teamId: userId, status: "accepted" } : undefined
  )

  const count = useMemo(() => {
    const activeTalent = networkQuery.data?.counts.active ?? 0
    const acceptedExternal = acceptedQuery.data?.data?.length ?? 0
    if (openTab === "talent") return activeTalent
    if (openTab === "external") return acceptedExternal
    return activeTalent + acceptedExternal
  }, [networkQuery.data, acceptedQuery.data, openTab])

  return {
    count,
    isLoading: networkQuery.isLoading || acceptedQuery.isLoading,
  }
}
