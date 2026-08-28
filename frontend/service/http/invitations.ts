import {
  AcceptInvitationResponse,
  CreateInvitationDto,
  CreateInvitationLinkDto,
  CreateInvitationResult,
  Invitation,
  InvitationLinkResponse,
  InvitationListResponse,
  InvitationPreview,
  ListInvitationsParams,
} from "@/types/invitation"
import AxiosRequest from ".."

// /v1/invitations resolves to the same invitations-service as the legacy
// /invitations path (see backend/apps/api-gateway/src/proxy/proxy.controller.ts).
// The /v1 form is used going forward per the MyTeam epic doc.
const INVITATIONS_BASE = "/v1/invitations"

const unwrapList = (payload: unknown): InvitationListResponse => {
  if (payload && typeof payload === "object" && "data" in (payload as InvitationListResponse)) {
    const typed = payload as InvitationListResponse
    return { data: Array.isArray(typed.data) ? typed.data : [], nextCursor: typed.nextCursor ?? null }
  }
  return { data: Array.isArray(payload) ? (payload as Invitation[]) : [], nextCursor: null }
}

export const InvitationsAPI = {
  createInvitations: async (
    dto: CreateInvitationDto
  ): Promise<CreateInvitationResult[]> => {
    const res = await AxiosRequest.post(INVITATIONS_BASE, dto)
    return Array.isArray(res.data) ? res.data : []
  },

  createInvitationLink: async (
    dto: CreateInvitationLinkDto
  ): Promise<InvitationLinkResponse> => {
    const res = await AxiosRequest.post(`${INVITATIONS_BASE}/link`, dto)
    return res.data
  },

  listInvitations: async (
    params?: ListInvitationsParams
  ): Promise<InvitationListResponse> => {
    const query = new URLSearchParams()
    if (params?.teamId) query.set("teamId", params.teamId)
    if (params?.companyId) query.set("companyId", params.companyId)
    if (params?.invitedEmail) query.set("invitedEmail", params.invitedEmail)
    if (params?.status) query.set("status", params.status)
    if (params?.limit) query.set("limit", params.limit.toString())
    if (params?.cursor) query.set("cursor", params.cursor)

    const queryString = query.toString()
    const url = queryString
      ? `${INVITATIONS_BASE}?${queryString}`
      : INVITATIONS_BASE

    const res = await AxiosRequest.get(url)
    return unwrapList(res.data)
  },

  getInvitation: async (id: string): Promise<Invitation> => {
    const res = await AxiosRequest.get(`${INVITATIONS_BASE}/${id}`)
    return res.data
  },

  /** Pre-auth preview. Renders the invite banner without requiring the
   * visitor to be signed in (backend route is @Public()). */
  previewInvitation: async (token: string): Promise<InvitationPreview> => {
    const res = await AxiosRequest.get(
      `${INVITATIONS_BASE}/preview?token=${encodeURIComponent(token)}`
    )
    return res.data
  },

  resendInvitation: async (id: string): Promise<Invitation> => {
    const res = await AxiosRequest.post(`${INVITATIONS_BASE}/${id}/resend`, {})
    return res.data
  },

  cancelInvitation: async (id: string): Promise<void> => {
    await AxiosRequest.del(`${INVITATIONS_BASE}/${id}/cancel`)
  },

  acceptInvitation: async (
    inviteToken: string
  ): Promise<AcceptInvitationResponse> => {
    const res = await AxiosRequest.post(`${INVITATIONS_BASE}/accept`, {
      token: inviteToken,
    })
    return res.data
  },
}
