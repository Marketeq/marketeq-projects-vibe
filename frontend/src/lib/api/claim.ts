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
 * Claim an unowned listing. The server sets the owner only if it is still
 * unowned, so the first request to commit wins and any later one gets a 409.
 */
async function claimListing(kind: "project" | "service", id: string): Promise<void> {
  const base = kind === "service" ? "services" : "projects"
  const res = await fetch(`${apiBase()}/v1/${base}/${id}/claim`, {
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
    throw new Error(body?.message ?? `Could not claim this ${kind} right now`)
  }

  // Signal the homepage to bypass cache on next fetch so the claimed
  // project's team data appears immediately after a page refresh.
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem("hp_fresh", "1")
  }
}

export const claimProject = (id: string) => claimListing("project", id)
export const claimService = (id: string) => claimListing("service", id)
