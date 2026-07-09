import { Conversation } from "@/types/conversation"

export interface CurrentUser {
  id: string
  username: string
  avatarUrl?: string
}

const CURRENT_USER_STORAGE_KEY = "marketeq-current-user"
let currentUserSnapshot: CurrentUser | null = null

/**
 * Marketeq auth tokens are HttpOnly cookies and are intentionally unreadable
 * from client JavaScript. This legacy shim remains only to avoid new token
 * storage dependencies while callers are migrated to AuthContext/user data.
 */
export function getAccessToken(): string | null {
  return "cookie-auth"
}

export function setCurrentUserSnapshot(user: CurrentUser | null): void {
  currentUserSnapshot = user
  if (typeof window === "undefined") return

  try {
    if (user) {
      window.sessionStorage.setItem(
        CURRENT_USER_STORAGE_KEY,
        JSON.stringify(user)
      )
    } else {
      window.sessionStorage.removeItem(CURRENT_USER_STORAGE_KEY)
    }
  } catch {}
}

export const getCurrentUser = (): CurrentUser | null => {
  if (currentUserSnapshot) return currentUserSnapshot
  if (typeof window === "undefined") return null

  try {
    const raw = window.sessionStorage.getItem(CURRENT_USER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CurrentUser
    if (!parsed?.id) return null
    currentUserSnapshot = parsed
    return parsed
  } catch {
    return null
  }
}

function getOtherParticipantId(
  conv: Conversation,
  me: string
): string | undefined {
  return conv.participantIds?.find((id) => id !== me)
}
