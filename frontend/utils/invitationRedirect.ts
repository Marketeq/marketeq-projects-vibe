import { AcceptInvitationResponse } from "@/types/invitation"

// Backend error codes (InvitationExceptionFilter, see
// backend/apps/invitations-service/src/common/invitation-exceptions.ts)
// mapped to user-facing copy, instead of string-matching raw error messages
// (which breaks the moment a message's wording changes).
const INVITATION_ERROR_MESSAGES: Record<string, string> = {
  EMAIL_MISMATCH:
    "You are signed in with a different account. Please sign in using the invited email address and try again.",
  TOKEN_EXPIRED:
    "This invitation link is invalid or has expired. Please ask the team owner to send a new invite.",
  INVALID_TOKEN:
    "This invitation link is invalid or has expired. Please ask the team owner to send a new invite.",
  ALREADY_ACCEPTED:
    "This invitation has already been accepted. You can view your team from the My Team page.",
  INVITATION_CANCELED:
    "This invitation was canceled. Please ask the team owner to send a new invite if you still need access.",
  NOT_FOUND:
    "We couldn't find this invitation. Please check that you opened the latest invite link.",
  UNAUTHORIZED:
    "Please sign in with the invited account to accept this invitation.",
  FORBIDDEN:
    "Please sign in with the invited account to accept this invitation.",
}

export function getInvitationErrorMessage(
  code: string | undefined,
  rawMessage: string
): string {
  if (code && INVITATION_ERROR_MESSAGES[code]) {
    return INVITATION_ERROR_MESSAGES[code]
  }
  return rawMessage
}

export function getAcceptInvitationPayload(
  response?: AcceptInvitationResponse | null
): AcceptInvitationResponse | undefined {
  let current:
    | AcceptInvitationResponse
    | { data?: AcceptInvitationResponse }
    | undefined
    | null = response

  while (current && typeof current === "object") {
    if ("postAccept" in current || "acceptedUser" in current) {
      return current as AcceptInvitationResponse
    }

    if (!("data" in current)) {
      return undefined
    }

    current = current.data
  }

  return undefined
}
