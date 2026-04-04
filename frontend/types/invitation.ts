export interface CreateInvitationDto {
  teamId: string
  role: "admin" | "editor" | "viewer"
  emails: string[]
  note?: string
}

export interface Invitation {
  id: string
  email: string
  status: "pending" | "accepted" | "canceled" | "expired"
  role?: string
  teamId?: string
  expiresAt?: string
  createdAt?: string
  alreadyInvited?: boolean
}

export interface InvitationListResponse {
  invitations: Invitation[]
  cursor?: string
  hasMore: boolean
}
