import { useEffect, useState } from "react"
import { TeamMember, TeamsAPI } from "@/service/http/teams"
import { Avatar, AvatarFallback, AvatarImage, Badge } from "@/components/ui"

interface AllTeamMembersGridProps {
  teamIds: string[]
  refreshKey: number
}

export function AllTeamMembersGrid({
  teamIds,
  refreshKey,
}: AllTeamMembersGridProps) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchAllMembers() {
      setLoading(true)
      setError(null)
      try {
        const results = await Promise.all(
          teamIds.map(async (teamId) => {
            try {
              const res = await TeamsAPI.getTeamMembers(teamId)
              const payload = res?.data
              const list = Array.isArray(payload)
                ? payload
                : Array.isArray(payload?.data)
                  ? payload.data
                  : Array.isArray(payload?.members)
                    ? payload.members
                    : []
              return list as TeamMember[]
            } catch {
              return []
            }
          })
        )
        // Flatten and dedupe by userId
        const allMembers = results.flat().filter(Boolean) as TeamMember[]
        const deduped: Record<string, TeamMember> = {}
        for (const member of allMembers) {
          if (member && member.userId && !deduped[member.userId]) {
            deduped[member.userId] = member
          }
        }
        if (!cancelled) setMembers(Object.values(deduped))
      } catch (err: any) {
        if (!cancelled) setError("Failed to load team members")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (teamIds.length > 0) fetchAllMembers()
    else setMembers([])
    return () => {
      cancelled = true
    }
  }, [refreshKey, teamIds])

  if (loading) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p className="text-sm">Loading team members...</p>
      </div>
    )
  }
  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">{error || "No team members yet"}</p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {members.map((member) => {
        const displayName =
          [member.firstName, member.lastName]
            .filter(Boolean)
            .join(" ")
            .trim() ||
          member.username ||
          member.email?.split("@")[0] ||
          "Team Member"
        const avatarUrl =
          member.avatarUrl ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.userId}`
        const fallback = (displayName || member.userId)
          .slice(0, 2)
          .toUpperCase()
        return (
          <div
            key={member.userId}
            className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{displayName}</p>
              <Badge variant="rounded" className="text-xs mt-1" size="sm">
                {member.role}
              </Badge>
            </div>
          </div>
        )
      })}
    </div>
  )
}
