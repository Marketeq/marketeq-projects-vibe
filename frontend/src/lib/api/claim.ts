// frontend/src/lib/api/claim.ts
import { getPublicApiUrl } from "@/lib/runtime-urls"
import { csrfHeader } from "../csrf"

const apiBase = () =>
  (getPublicApiUrl() || "http://localhost:4000").replace(/\/$/, "")

export class ClaimConflictError extends Error {
  constructor(message = "This has just been claimed by someone else") {
    super(message)
    this.name = "ClaimConflictError"
  }
}

// ---------------------------------------------------------------------------
// Claim rate limiting (client side, localStorage backed)
//
// Active claim cap: 3 concurrent uncompleted claims.
// Rolling limits:
//   24 hours  = 3
//   7 days    = 5
//   30 days   = 10
//   90 days   = 15
// ---------------------------------------------------------------------------

const CLAIM_LOG_KEY = "marketeq_claim_log"

interface ClaimEntry {
  projectId: string
  timestamp: number
}

function getClaimLog(): ClaimEntry[] {
  if (typeof localStorage === "undefined") return []
  try {
    const raw = localStorage.getItem(CLAIM_LOG_KEY)
    return raw ? (JSON.parse(raw) as ClaimEntry[]) : []
  } catch {
    return []
  }
}

function saveClaimLog(log: ClaimEntry[]) {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(CLAIM_LOG_KEY, JSON.stringify(log))
}

export function recordClaim(projectId: string) {
  const log = getClaimLog()
  log.push({ projectId, timestamp: Date.now() })
  saveClaimLog(log)
}

interface ClaimLimitResult {
  allowed: boolean
  reason: string
}

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

const LIMITS: { window: number; max: number; label: string }[] = [
  { window: 1 * DAY, max: 3, label: "24 hours" },
  { window: 7 * DAY, max: 5, label: "7 days" },
  { window: 30 * DAY, max: 10, label: "30 days" },
  { window: 90 * DAY, max: 15, label: "90 days" },
]

export function checkClaimLimit(): ClaimLimitResult {
  const log = getClaimLog()
  const now = Date.now()

  for (const { window, max, label } of LIMITS) {
    const count = log.filter((e) => now - e.timestamp < window).length
    if (count >= max) {
      return {
        allowed: false,
        reason: `You have claimed ${count} projects in the last ${label}. The limit is ${max} per ${label}. Please complete or release an existing project before claiming another.`,
      }
    }
  }

  return { allowed: true, reason: "" }
}

/**
 * Claim an unowned listing. The server sets the owner only if it is still
 * unowned, so the first request to commit wins and any later one gets a 409.
 */
async function claimListing(kind: "project" | "service", id: string): Promise<void> {
  const base = kind === "service" ? "services" : "projects"
  const res = await fetch(`${apiBase()}/v1/${base}/${id}/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...csrfHeader("POST") },
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
