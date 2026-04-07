import { AcceptInvitationResponse } from "@/types/invitation"

type InvitationRedirectResult = {
  destination: string
  nextStep: "go_to_team" | "continue_onboarding"
  teamId?: string
}

const DEFAULT_TEAM_PATH = "/my-team"
const DEFAULT_ONBOARDING_PATH = "/onboarding"

function withTeamId(path: string, teamId?: string) {
  if (!teamId) return path

  const separator = path.includes("?") ? "&" : "?"
  return `${path}${separator}teamId=${encodeURIComponent(teamId)}`
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

export function getPostAcceptRedirect(
  response?: AcceptInvitationResponse | null
): InvitationRedirectResult {
  const normalizedResponse = getAcceptInvitationPayload(response)
  const nextStep = normalizedResponse?.postAccept?.nextStep
  const reason = normalizedResponse?.postAccept?.reason
  const suggestedPath = normalizedResponse?.postAccept?.suggestedPath
  const teamId = normalizedResponse?.postAccept?.teamId

  if (nextStep === "go_to_team") {
    return {
      destination: withTeamId(suggestedPath || DEFAULT_TEAM_PATH, teamId),
      nextStep,
      teamId,
    }
  }

  if (nextStep === "continue_onboarding") {
    return {
      destination: withTeamId(suggestedPath || DEFAULT_ONBOARDING_PATH, teamId),
      nextStep,
      teamId,
    }
  }

  if (reason === "existing_user_completed_onboarding") {
    return {
      destination: withTeamId(suggestedPath || DEFAULT_TEAM_PATH, teamId),
      nextStep: "go_to_team",
      teamId,
    }
  }

  if (reason === "existing_user_needs_onboarding") {
    return {
      destination: withTeamId(suggestedPath || DEFAULT_ONBOARDING_PATH, teamId),
      nextStep: "continue_onboarding",
      teamId,
    }
  }

  const acceptedUser = normalizedResponse?.acceptedUser
  const hasCompletedOnboarding =
    acceptedUser?.hasCompletedOnboarding ?? acceptedUser?.onboardingDismissed

  if (hasCompletedOnboarding) {
    return {
      destination: withTeamId(DEFAULT_TEAM_PATH, teamId),
      nextStep: "go_to_team",
      teamId,
    }
  }

  return {
    destination: withTeamId(DEFAULT_ONBOARDING_PATH, teamId),
    nextStep: "continue_onboarding",
    teamId,
  }
}
