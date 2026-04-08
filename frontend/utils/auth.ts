// utils/auth.ts
import { jwtDecode } from "jwt-decode"
import Cookies from "js-cookie"
import { Conversation } from "@/types/conversation"

export interface CurrentUser {
  id: string
  username: string
  avatarUrl?: string
}

/** Read the access token from cookies (primary) or localStorage (fallback) */
export function getAccessToken(): string | null {
  const cookie = Cookies.get("access_token") || Cookies.get("accessToken")
  if (cookie) return cookie
  if (typeof window === "undefined") return null
  return localStorage.getItem("access_token") || localStorage.getItem("token") || null
}

export const getCurrentUser = (): CurrentUser | null => {
  if (typeof window === "undefined") return null
  const token = getAccessToken()
  if (!token) return null

  try {
    const decoded = jwtDecode<{ sub: string; username?: string; avatarUrl?: string }>(token)
    return { id: decoded.sub, username: decoded.username ?? "", avatarUrl: decoded.avatarUrl }
  } catch (err) {
    console.error("Invalid token", err)
    return null
  }
}

function getOtherParticipantId(
  conv: Conversation,
  me: string
): string | undefined {
  return conv.participants.find((p) => p.userId !== me)?.userId
}
