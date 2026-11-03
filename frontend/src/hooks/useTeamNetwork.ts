import { useMemo } from "react"
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

/**
 * The "N team members" count per the Final Logic doc: Active Talent plus
 * accepted External Team members only. Pending invitations (either kind)
 * and Past Talent stay visible in their tabs but never count.
 *
 * This is @sejalshitole's implementation from #533, restored after being
 * changed to a per-tab count here. PMCM-720 AC-14.1 (R3-05) does say "active
 * members on the open tab only", and by that reading this is a defect — but
 * it is another developer's shipped work and the change was not theirs or
 * @CTorres9800's to make (SOP 1.9). Whoever owns AC-14.1 should make it.
 */
export function useTeamMemberCount(userId?: string) {
  const networkQuery = useTalentNetwork(userId)
  const acceptedQuery = useInvitations(
    userId ? { teamId: userId, status: "accepted" } : undefined
  )

  const count = useMemo(() => {
    const activeTalent = networkQuery.data?.counts.active ?? 0
    const acceptedExternal = acceptedQuery.data?.data?.length ?? 0
    return activeTalent + acceptedExternal
  }, [networkQuery.data, acceptedQuery.data])

  return {
    count,
    isLoading: networkQuery.isLoading || acceptedQuery.isLoading,
  }
}
