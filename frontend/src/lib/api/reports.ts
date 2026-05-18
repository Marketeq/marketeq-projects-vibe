import { apiFetch } from "@/src/lib/api"
import { getAccessToken } from "@/utils/auth"

interface Report {
  id: string
  reporterId: string
  reportedId: string
  reason: string
  contextThreadId: string | null
  contextMessageId: string | null
  status: "pending" | "reviewing" | "actioned" | "dismissed"
  createdAt: string
  wasAlreadyReported?: boolean
}

interface ReportPayload {
  reason: string
  contextThreadId?: string
  contextMessageId?: string
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function reportUser(
  userId: string,
  payload: ReportPayload,
): Promise<Report> {
  return apiFetch<Report>(`/users/${userId}/report`, {
    method: "POST",
    headers: authHeaders(),
    body: payload,
  })
}
