// frontend/src/lib/api/claim.ts
import { getPublicApiUrl } from "@/lib/runtime-urls"

const apiBase = () =>
  (getPublicApiUrl() || "http://localhost:4000").replace(/\/$/, "")

export class ClaimConflictError extends Error {
  constructor(message = "This has just been claimed by someone else") {
    super(message)
    this.name = "ClaimConflictError"
  }
}

/**
 * Claim an unowned project. The server sets the owner only if it is still
 * unowned, so the first request to commit wins and any later one gets a 409.
 */
export async function claimProject(id: string): Promise<void> {
  const res = await fetch(`${apiBase()}/v1/projects/${id}/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  })

  if (res.status === 409) {
    const body = await res.json().catch(() => null)
    throw new ClaimConflictError(body?.message)
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? "Could not claim this project right now")
  }
}
