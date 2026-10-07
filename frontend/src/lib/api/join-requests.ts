import { apiFetch } from "@/src/lib/api"

export type JoinRequestStatus = "none" | "pending" | "accepted" | "rejected"

export async function getJoinRequestStatus(
  projectId: string
): Promise<JoinRequestStatus> {
  try {
    const res = await apiFetch<{ status: JoinRequestStatus }>(
      `/v1/projects/${projectId}/join-request/status`
    )
    return res.status
  } catch {
    return "none"
  }
}

export async function requestToJoinProject(
  projectId: string
): Promise<{ status: JoinRequestStatus }> {
  return apiFetch<{ status: JoinRequestStatus }>(
    `/v1/projects/${projectId}/join-request`,
    { method: "POST" }
  )
}

export async function cancelJoinRequest(
  projectId: string
): Promise<void> {
  await apiFetch(`/v1/projects/${projectId}/join-request`, {
    method: "DELETE",
  })
}
