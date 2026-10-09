import { CheckoutAPI } from "@/service/http/checkout"

export type CheckoutDraftTask = {
  id: string
  title: string
  roleName: string | null
  assigneeUserId: string | null
  location: string[] | null
  experienceLevel: string | null
  estimatedHours: number | null
  workSchedule: string | null
  customHoursPerWeek: number | null
  customHours: number | null
  customFrequency: string | null
  locked: boolean
}

export type CheckoutDraftPhase = {
  id: string
  phaseName: string
  order: number
  startDay?: number
  endDay?: number
  tasks: CheckoutDraftTask[]
}

export type CheckoutScopeSummary = {
  draftId: string
  version: number
  phases: CheckoutDraftPhase[]
  projectCost: number | null
}

export const getCheckoutScopeSummary = async (
  draftId: string
): Promise<CheckoutScopeSummary | null> => {
  try {
    const response = await CheckoutAPI.GetDraftScope(draftId)
    const data = response.data
    if (!data || !Array.isArray(data.phases)) return null

    return {
      draftId: data.draftId,
      version: data.version,
      phases: data.phases.map((phase: any) => ({
        id: phase.id,
        phaseName: phase.title,
        order: phase.order,
        startDay: phase.startDay,
        endDay: phase.endDay,
        tasks: (phase.tasks ?? []).map((task: any) => ({
          id: task.id,
          title: task.title,
          roleName: task.roleName,
          assigneeUserId: task.assigneeUserId,
          location: task.location,
          experienceLevel: task.experienceLevel,
          estimatedHours: task.durationHours,
          workSchedule: task.workSchedule ?? "full_time",
          customHoursPerWeek: task.customHoursPerWeek ?? null,
          customHours: task.customHours ?? null,
          customFrequency: task.customFrequency ?? null,
          locked: Boolean(task.locked),
        })),
      })),
      projectCost: null,
    }
  } catch {
    return null
  }
}
