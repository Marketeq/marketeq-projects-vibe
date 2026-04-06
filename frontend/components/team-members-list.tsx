"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth"
import { TeamMember, TeamsAPI } from "@/service/http/teams"
import { Trash03 } from "@blend-metrics/icons"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
} from "@/components/ui"

interface TeamMembersListProps {
  teamId: string
  onMemberAdded?: () => void
  onMemberRemoved?: () => void
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

  // Last fallback: do not expose raw UUID as display name.
  if (uuidPattern.test(member.userId)) return "Team Member"

  return member.userId
}

function toUserDisplayName(
  user: {
    firstName?: string | null
    lastName?: string | null
    username?: string | null
    email?: string | null
  } | null
): string | null {
  if (!user) return null

  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim()
  if (fullName) return fullName

  if (user.username) return user.username

  if (user.email) {
    const local = String(user.email).split("@")[0] || ""
    if (local) return local
  }

  return null
}

export function TeamMembersList({
  teamId,
  onMemberAdded,
  onMemberRemoved,
}: TeamMembersListProps) {
  const { user } = useAuth()
  const currentUserId = user?.id
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await TeamsAPI.getTeamMembers(teamId)
      const payload = response?.data
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.members)
            ? payload.members
            : []

      if (list.length > 0 || payload?.success === true) {
        const typedMembers = list as TeamMember[]
        setMembers(typedMembers)
      } else {
        setMembers([])
        setError(payload?.message || "Failed to fetch team members")
      }
    } catch (err) {
      console.error("Error fetching team members:", err)
      setMembers([])
      setError("Failed to load team members. Please check teams API/gateway.")
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    if (teamId) {
      fetchMembers()
    }
  }, [teamId, fetchMembers])

  const handleRemoveMember = async (memberId: string) => {
    try {
      await TeamsAPI.removeTeamMember(teamId, memberId)
      setMembers(members.filter((m) => m.userId !== memberId))
      onMemberRemoved?.()
    } catch (err) {
      console.error("Error removing team member:", err)
    }
  }

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
    <div className="space-y-3">
      {members.map((member) => {
        const isCurrentUser = Boolean(
          currentUserId && member.userId === currentUserId
        )
        const fallbackUserName = isCurrentUser ? toUserDisplayName(user) : null
        const displayName = fallbackUserName || toDisplayName(member)
        const avatarUrl =
          member.avatarUrl ||
          (isCurrentUser && user?.avatarUrl ? user.avatarUrl : null) ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.userId}`
        const fallback = (displayName || member.userId)
          .slice(0, 2)
          .toUpperCase()

        return (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback>{fallback}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {displayName}
                </p>
                <Badge variant="rounded" className="text-xs mt-1" size="sm">
                  {member.role}
                </Badge>
              </div>
            </div>
            {currentUserId !== member.userId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveMember(member.userId)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash03 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}
