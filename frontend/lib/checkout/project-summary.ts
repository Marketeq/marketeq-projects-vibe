import { getPublicApiUrl } from "@/lib/runtime-urls"

export type CheckoutRawTeamMember = {
  id: string
  name: string
  username: string | null
  avatarUrl: string | null
  role: string | null
  location: string | null
  rate: number | null
  experienceLevel: string | null
  isLead: boolean
}

export type CheckoutProjectSummary = {
  id: string | null
  title: string
  mediaUrl: string
  teamMemberCount: number | null
  dateRangeLabel: string
  projectCost: number | null
  durationLabel: string | null
  teamMembers: CheckoutRawTeamMember[]
}

export const titleizeCheckoutSlug = (value: string): string =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

const getProjectCandidates = (slug: string): string[] => {
  const parts = slug.split("-")
  const stripped = parts.length > 1 ? parts.slice(0, -1).join("-") : slug
  return Array.from(new Set([slug, stripped]))
}

const getTeamMemberCount = (project: any): number | null => {
  // `team` is the real, currently-assigned roster (resolved from
  // teamMemberIds server-side) — trust it whenever it's present, even when
  // empty, rather than falling through to the scope role-name guess below,
  // which isn't actual assignment data and would contradict the Team
  // Members tab (which only ever shows the real `team` array).
  if (Array.isArray(project.team)) {
    return project.team.length > 0 ? project.team.length : null
  }
  if (typeof project.teamMemberCount === "number") return project.teamMemberCount

  const scope = Array.isArray(project.scope) ? project.scope : []
  const roles = new Set(
    scope.flatMap((phase: any) =>
      (phase.tasks ?? []).map((task: any) => task.roleName).filter(Boolean)
    )
  )

  return roles.size > 0 ? roles.size : null
}

const getTeamMembers = (project: any): CheckoutRawTeamMember[] => {
  if (!Array.isArray(project.team)) return []

  return project.team.map((member: any) => ({
    id: String(member.id),
    name: member.name || "Team Member",
    username: member.username ?? null,
    avatarUrl: member.avatarUrl ?? null,
    role: member.role ?? null,
    location: member.location ?? null,
    rate: typeof member.rate === "number" ? member.rate : null,
    experienceLevel: member.experienceLevel ?? null,
    isLead: Boolean(member.isLead),
  }))
}

const getProjectCost = (project: any): number | null => {
  const cost = project.budget ?? project.priceMin ?? project.priceMax
  return typeof cost === "number" && cost > 0 ? cost : null
}

const monthYearFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

const getDuration = (
  project: any
): { amount: number; unit: "day" | "week" | "month" } | null => {
  if (typeof project.duration === "string") {
    const match = project.duration.match(/(\d+)\s*(day|week|month)/i)
    if (match) {
      return {
        amount: Number(match[1]),
        unit: match[2].toLowerCase() as "day" | "week" | "month",
      }
    }
  }
  if (typeof project.durationMonths === "number" && project.durationMonths > 0) {
    return { amount: project.durationMonths, unit: "month" }
  }
  return null
}

const getComputedDateRange = (project: any): string | null => {
  const duration = getDuration(project)
  if (duration === null) return null

  const start = new Date()
  const end = new Date(start)
  if (duration.unit === "month") {
    end.setUTCMonth(end.getUTCMonth() + duration.amount)
  } else {
    const days = duration.unit === "week" ? duration.amount * 7 : duration.amount
    end.setUTCDate(end.getUTCDate() + days)
  }

  return `${monthYearFormatter.format(start)} - ${monthYearFormatter.format(end)}`
}

const getDateRangeLabel = (project: any): string => {
  if (project.dateRangeLabel) return project.dateRangeLabel
  if (project.startDate && project.endDate) {
    return `${project.startDate} - ${project.endDate}`
  }
  if (project.formattedDuration) return project.formattedDuration
  return getComputedDateRange(project) || "Timeline unavailable"
}

const getDurationLabel = (project: any): string | null => {
  if (typeof project.duration === "string" && project.duration.trim()) {
    return project.duration
  }
  if (typeof project.durationMonths === "number" && project.durationMonths > 0) {
    return `${project.durationMonths} month${project.durationMonths === 1 ? "" : "s"}`
  }
  return null
}

const mapProjectSummary = (project: any, slug: string): CheckoutProjectSummary => ({
  id: project.id ? String(project.id) : null,
  title: project.title || titleizeCheckoutSlug(slug),
  mediaUrl: project.mediaUrls?.[0] || project.featuredImage || "/dashboard.png",
  teamMemberCount: getTeamMemberCount(project),
  dateRangeLabel: getDateRangeLabel(project),
  projectCost: getProjectCost(project),
  durationLabel: getDurationLabel(project),
  teamMembers: getTeamMembers(project),
})

export const getCheckoutProjectSummary = async (
  slug: string,
  signal?: AbortSignal
): Promise<CheckoutProjectSummary | null> => {
  const apiBase = getPublicApiUrl() || "http://localhost:4000"

  for (const candidate of getProjectCandidates(slug)) {
    const projectResponse = await fetch(
      `${apiBase}/v1/projects/slug/${candidate}`,
      { signal }
    )
    if (projectResponse.ok) {
      return mapProjectSummary(await projectResponse.json(), candidate)
    }

    const serviceResponse = await fetch(
      `${apiBase}/v1/services/slug/${candidate}`,
      { signal }
    )
    if (serviceResponse.ok) {
      return mapProjectSummary(await serviceResponse.json(), candidate)
    }
  }

  return null
}
