import { apiFetch } from "@/src/lib/api"

interface BlockedUser {
  id: string
  blockedId: string
  reason: string | null
  createdAt: string
}

export async function blockUser(
  userId: string,
  reason?: string
): Promise<BlockedUser> {
  return apiFetch<BlockedUser>(`/users/${userId}/block`, {
    method: "POST",
    body: reason ? { reason } : {},
  })
}

export async function unblockUser(
  userId: string
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/users/${userId}/block`, {
    method: "DELETE",
  })
}

export async function listBlocked(): Promise<BlockedUser[]> {
  return apiFetch<BlockedUser[]>(`/users/me/blocked`, {
    method: "GET",
  })
}
