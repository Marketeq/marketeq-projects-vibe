import {
  CreateInvitationDto,
  Invitation,
  InvitationListResponse,
} from "@/types/invitation"
import AxiosRequest from ".."

// Invitations service runs on port 3011, accessed through gateway
const INVITATIONS_BASE =
  process.env.NEXT_PUBLIC_INVITATIONS_URL ?? "/invitations"

export const InvitationsAPI = {
  // Create invitations
  createInvitations: (dto: CreateInvitationDto) => {
    return AxiosRequest.post(`${INVITATIONS_BASE}`, dto)
  },

  // List invitations
  listInvitations: (params?: {
    teamId?: string
    status?: "pending" | "accepted" | "canceled" | "expired"
    limit?: number
    cursor?: string
  }) => {
    const query = new URLSearchParams()
    if (params?.teamId) query.set("teamId", params.teamId)
    if (params?.status) query.set("status", params.status)
    if (params?.limit) query.set("limit", params.limit.toString())
    if (params?.cursor) query.set("cursor", params.cursor)

    const queryString = query.toString()
    const url = queryString
      ? `${INVITATIONS_BASE}?${queryString}`
      : INVITATIONS_BASE

    return AxiosRequest.get(url)
  },

  // Get single invitation
  getInvitation: (id: string) => {
    return AxiosRequest.get(`${INVITATIONS_BASE}/${id}`)
  },

  // Resend invitation
  resendInvitation: (id: string) => {
    return AxiosRequest.post(`${INVITATIONS_BASE}/${id}/resend`, {})
  },

  // Cancel invitation
  cancelInvitation: (id: string) => {
    return AxiosRequest.del(`${INVITATIONS_BASE}/${id}/cancel`)
  },

  // Accept invitation (by token from email)
  acceptInvitation: (inviteToken: string) => {
    return AxiosRequest.post(`${INVITATIONS_BASE}/accept`, {
      token: inviteToken,
    })
  },
}
