import { getPublicApiUrl } from "@/lib/runtime-urls"

export type CheckoutProjectSummary = {
  title: string
  mediaUrl: string
  teamMemberCount: number | null
  dateRangeLabel: string
  projectCost: number | null
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
  if (Array.isArray(project.teamMembers)) return project.teamMembers.length
  if (typeof project.teamMemberCount === "number") return project.teamMemberCount

  const scope = Array.isArray(project.scope) ? project.scope : []
  const roles = new Set(
    scope.flatMap((phase: any) =>
      (phase.tasks ?? []).map((task: any) => task.roleName).filter(Boolean)
    )
  )

  return roles.size > 0 ? roles.size : null
}

const getProjectCost = (project: any): number | null => {
  const cost = project.budget ?? project.priceMin ?? project.priceMax
  return typeof cost === "number" && cost > 0 ? cost : null
}

const getDateRangeLabel = (project: any): string => {
  if (project.dateRangeLabel) return project.dateRangeLabel
  if (project.startDate && project.endDate) {
    return `${project.startDate} - ${project.endDate}`
  }
  if (project.formattedDuration) return project.formattedDuration
  return "Timeline unavailable"
}

const mapProjectSummary = (project: any, slug: string): CheckoutProjectSummary => ({
  title: project.title || titleizeCheckoutSlug(slug),
  mediaUrl: project.mediaUrls?.[0] || project.featuredImage || "/dashboard.png",
  teamMemberCount: getTeamMemberCount(project),
  dateRangeLabel: getDateRangeLabel(project),
  projectCost: getProjectCost(project),
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
