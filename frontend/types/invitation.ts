export interface CreateInvitationDto {
  teamId: string
  role: "admin" | "editor" | "viewer"
  emails: string[]
  note?: string
}

export interface CreateInvitationLinkDto {
  teamId: string
  teamName: string
  role: "admin" | "editor" | "viewer"
}

export interface AcceptInvitationDto {
  token: string
}

export type InvitationPostAcceptNextStep = "go_to_team" | "continue_onboarding"

export type InvitationPostAcceptReason =
  | "existing_user_completed_onboarding"
  | "existing_user_needs_onboarding"

export interface AcceptInvitationAcceptedUser {
  id: string
  email: string
  role?: string
  onboardingDismissed?: boolean
  hasCompletedOnboarding?: boolean
  accountState?: string
}

export interface AcceptInvitationPostAccept {
  nextStep?: InvitationPostAcceptNextStep | string
  reason?: InvitationPostAcceptReason | string
  suggestedPath?: string
  teamId?: string
}

export interface AcceptInvitationResponse {
  acceptedUser?: AcceptInvitationAcceptedUser
  postAccept?: AcceptInvitationPostAccept
  token?: string
  note?: string | null
}

export interface Invitation {
  id: string
  email: string
  status: "pending" | "accepted" | "canceled" | "expired"
  role?: string
  note?: string | null
  teamId?: string
  teamName?: string
  invitedEmail?: string
  expiresAt?: string
  createdAt?: string
  alreadyInvited?: boolean
  token?: string
  /** Set when the invitation was accepted — the invitee's user ID */
  inviteeUserId?: string
  /** Invitee's display name (enriched by backend from user-service) */
  inviteeName?: string
  /** Invitee's avatar URL (enriched by backend from user-service) */
  avatarUrl?: string | null
}

export interface ListInvitationsParams {
  teamId?: string
  invitedEmail?: string
  status?: "pending" | "accepted" | "canceled" | "expired"
  limit?: number
  cursor?: string
}

export interface CreateInvitationResult {
  id: string
  email: string
  status: "pending" | "accepted" | "canceled" | "expired"
  expiresAt: string
  teamName?: string
  note?: string | null
  alreadyInvited: boolean
  token?: string
}

export interface InvitationLinkResponse {
  teamId: string
  teamName: string
  role: "admin" | "editor" | "viewer"
  status: "pending"
  token: string
  expiresAt: string
  url?: string
}

export interface InvitationListResponse {
  data: Invitation[]
  nextCursor: string | null
}
