import {
  AcceptInvitationDto,
  AcceptInvitationResponse,
  CreateInvitationDto,
  CreateInvitationLinkDto,
  ListInvitationsParams,
} from "@/types/invitation"
import AxiosRequest from ".."

const INVITATIONS_BASE = "/invitations"

interface InvitationsAPIType {
  createInvitations: (
    dto: CreateInvitationDto
  ) => ReturnType<typeof AxiosRequest.post<CreateInvitationDto>>
  createInvitationLink: (
    dto: CreateInvitationLinkDto
  ) => ReturnType<typeof AxiosRequest.post<CreateInvitationLinkDto>>
  listInvitations: (
    params?: ListInvitationsParams
  ) => ReturnType<typeof AxiosRequest.get>
  getInvitation: (id: string) => ReturnType<typeof AxiosRequest.get>
  resendInvitation: (
    id: string
  ) => ReturnType<typeof AxiosRequest.post<Record<string, never>>>
  cancelInvitation: (id: string) => ReturnType<typeof AxiosRequest.del>
  acceptInvitation: (
    inviteToken: string
  ) => ReturnType<typeof AxiosRequest.post<AcceptInvitationResponse>>
}

export const InvitationsAPI: InvitationsAPIType = {
  createInvitations: (dto) => {
    return AxiosRequest.post(`${INVITATIONS_BASE}`, dto)
  },

  createInvitationLink: (dto) => {
    return AxiosRequest.post(`${INVITATIONS_BASE}/link`, dto)
  },

  listInvitations: (params) => {
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

  getInvitation: (id: string) => {
    return AxiosRequest.get(`${INVITATIONS_BASE}/${id}`)
  },

  resendInvitation: (id: string) => {
    return AxiosRequest.post(`${INVITATIONS_BASE}/${id}/resend`, {})
  },

  cancelInvitation: (id: string) => {
    return AxiosRequest.del(`${INVITATIONS_BASE}/${id}/cancel`)
  },

  acceptInvitation: (inviteToken: string) => {
    return AxiosRequest.post(`${INVITATIONS_BASE}/accept`, {
      token: inviteToken,
    })
  },
}
