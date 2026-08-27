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
