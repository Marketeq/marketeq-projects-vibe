import { apiFetch } from "@/src/lib/api"
import { getAccessToken } from "@/utils/auth"

interface BlockedUser {
  id: string
  blockedId: string
  reason: string | null
  createdAt: string
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function blockUser(
  userId: string,
  reason?: string,
): Promise<BlockedUser> {
  return apiFetch<BlockedUser>(`/users/${userId}/block`, {
    method: "POST",
    headers: authHeaders(),
    body: reason ? { reason } : {},
  })
}

export async function unblockUser(userId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/users/${userId}/block`, {
    method: "DELETE",
    headers: authHeaders(),
  })
}

export async function listBlocked(): Promise<BlockedUser[]> {
  return apiFetch<BlockedUser[]>(`/users/me/blocked`, {
    method: "GET",
    headers: authHeaders(),
  })
}
