import { CheckoutAPI } from "@/service/http/checkout"
import type { CheckoutScopeSummary } from "./scope-summary"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type TaskFields = {
  title: string
  roleName: string
  durationHours: number
  workSchedule: "full_time" | "part_time" | "custom"
  customHoursPerWeek: number | null
  experienceLevel: string
  location: string[]
  assigneeUserId: string | null
}

type SyncedTask = TaskFields & { phaseId: string }

export type ScopeSyncState = {
  draftId: string
  version: number
  phases: { id: string; title: string }[]
  tasks: Map<string, SyncedTask>
  order: Map<string, string[]>
  localToServer: Map<string, string>
}

export type ScopeSyncResult =
  | { status: "noop" }
  | { status: "structure" }
  | { status: "error"; error: unknown }
  | {
      status: "ok"
      version: number
      durationDays: number | null
      teamMemberCount: number | null
      phases: { id: string; startDay: number; endDay: number }[]
      editorPhaseIds: (string | null)[]
    }

type ScopeChangeResponse = {
  version: number
  durationDays?: number | null
  teamMemberCount?: number | null
  phases?: { id: string; startDay: number; endDay: number }[]
}

export const createScopeSyncState = (
  summary: CheckoutScopeSummary
): ScopeSyncState => {
  const tasks = new Map<string, SyncedTask>()
  const order = new Map<string, string[]>()
  for (const phase of summary.phases) {
    order.set(
      phase.id,
      phase.tasks.map((task) => task.id)
    )
    for (const task of phase.tasks) {
      tasks.set(task.id, {
        phaseId: phase.id,
        title: task.title,
        roleName: task.roleName ?? "",
        durationHours: task.estimatedHours ?? 0,
        workSchedule:
          task.workSchedule === "part_time" || task.workSchedule === "custom"
            ? task.workSchedule
            : "full_time",
        customHoursPerWeek: task.customHoursPerWeek ?? null,
        experienceLevel: task.experienceLevel ?? "",
        location: task.location ?? [],
        assigneeUserId: task.assigneeUserId,
      })
    }
  }
  return {
    draftId: summary.draftId,
    version: summary.version,
    phases: summary.phases.map((phase) => ({
      id: phase.id,
      title: phase.phaseName.trim(),
    })),
    tasks,
    order,
    localToServer: new Map(),
  }
}

export const findDuplicatedPhase = (
  phases: { rows?: { id: string }[] }[]
): { index: number; sourceRowId: string } | null => {
  const seen = new Set<string>()
  for (const [index, phase] of phases.entries()) {
    const rows = phase.rows ?? []
    if (rows.length > 0 && rows.every((row) => seen.has(row.id))) {
      return { index, sourceRowId: rows[0].id }
    }
    for (const row of rows) seen.add(row.id)
  }
  return null
}

const toFields = (task: {
  title: string
  roleName: string | null
  estimatedHours: number | null
  experienceLevel: string | null
  location: string[] | null
  assigneeUserId: string | null
  workSchedule: string | null
  customHoursPerWeek: number | null
}): TaskFields | null => {
  const title = task.title.trim()
  const roleName = (task.roleName ?? "").trim()
  const experienceLevel = (task.experienceLevel ?? "").trim()
  const durationHours = Math.round(Number(task.estimatedHours))
  if (!title || !roleName || !experienceLevel) return null
  if (!Number.isFinite(durationHours) || durationHours < 1) return null
  return {
    title,
    roleName,
    durationHours,
    experienceLevel,
    location: task.location ?? [],
    assigneeUserId:
      task.assigneeUserId && UUID_PATTERN.test(task.assigneeUserId)
        ? task.assigneeUserId
        : null,
    workSchedule:
      task.workSchedule === "part_time" || task.workSchedule === "custom"
        ? task.workSchedule
        : "full_time",
    customHoursPerWeek:
      task.workSchedule === "custom" ? task.customHoursPerWeek : null,
  }
}

const sameLocation = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index])

const normalizeTitle = (value: string) => value.trim().toLowerCase()

type Desired = { id: string; localId: string; fields: TaskFields | null }

type EditorPhase = {
  title: string
  serverId: string | null
  tasks: CheckoutScopeSummary["phases"][number]["tasks"]
}

export const syncScopeChanges = async (
  state: ScopeSyncState,
  summary: CheckoutScopeSummary
): Promise<ScopeSyncResult> => {
  const editorPhases: EditorPhase[] = []
  const claimed = new Set<string>()
  for (const phase of summary.phases) {
    const serverIds = new Set<string>()
    for (const task of phase.tasks) {
      const known = state.tasks.get(state.localToServer.get(task.id) ?? task.id)
      if (known) serverIds.add(known.phaseId)
    }
    if (serverIds.size > 1) return { status: "structure" }
    const serverId = serverIds.size === 1 ? Array.from(serverIds)[0] : null
    if (serverId) {
      if (claimed.has(serverId)) return { status: "structure" }
      claimed.add(serverId)
    }
    editorPhases.push({
      title: phase.phaseName.trim(),
      serverId,
      tasks: phase.tasks,
    })
  }
  for (const editorPhase of editorPhases) {
    if (editorPhase.serverId || !editorPhase.title) continue
    const match = state.phases.find(
      (item) =>
        !claimed.has(item.id) &&
        normalizeTitle(item.title) === normalizeTitle(editorPhase.title)
    )
    if (match) {
      editorPhase.serverId = match.id
      claimed.add(match.id)
    }
  }

  let last: Extract<ScopeSyncResult, { status: "ok" }> | null = null
  const apply = (data: ScopeChangeResponse) => {
    state.version = data.version
    last = {
      status: "ok",
      version: data.version,
      durationDays: data.durationDays ?? null,
      teamMemberCount: data.teamMemberCount ?? null,
      phases: data.phases ?? [],
      editorPhaseIds: [],
    }
  }

  try {
    for (const phase of [...state.phases]) {
      if (claimed.has(phase.id)) continue
      const response = await CheckoutAPI.DeleteDraftPhase(
        state.draftId,
        phase.id,
        state.version
      )
      apply(response.data)
      for (const [taskId, task] of Array.from(state.tasks)) {
        if (task.phaseId === phase.id) state.tasks.delete(taskId)
      }
      state.order.delete(phase.id)
      state.phases = state.phases.filter((item) => item.id !== phase.id)
    }

    let position = 0
    for (const editorPhase of editorPhases) {
      if (!editorPhase.serverId) {
        if (!editorPhase.title) continue
        const response = await CheckoutAPI.AddDraftPhase(state.draftId, {
          version: state.version,
          title: editorPhase.title,
          order: position + 1,
        })
        apply(response.data)
        const phaseId = response.data.phase.id as string
        state.phases.splice(position, 0, {
          id: phaseId,
          title: editorPhase.title,
        })
        state.order.set(phaseId, [])
        editorPhase.serverId = phaseId
        position += 1
        continue
      }

      const index = state.phases.findIndex(
        (item) => item.id === editorPhase.serverId
      )
      const current = state.phases[index]
      const changes: { title?: string; order?: number } = {}
      if (editorPhase.title && editorPhase.title !== current.title) {
        changes.title = editorPhase.title
      }
      if (index !== position) changes.order = position + 1
      if (Object.keys(changes).length > 0) {
        const response = await CheckoutAPI.UpdateDraftPhase(
          state.draftId,
          current.id,
          { version: state.version, ...changes }
        )
        apply(response.data)
        state.phases.splice(index, 1)
        state.phases.splice(position, 0, {
          id: current.id,
          title: changes.title ?? current.title,
        })
      }
      position += 1
    }

    const desired = new Map<string, Desired[]>()
    const desiredIds = new Set<string>()
    for (const editorPhase of editorPhases) {
      if (!editorPhase.serverId) continue
      const list: Desired[] = []
      for (const task of editorPhase.tasks) {
        const id = state.localToServer.get(task.id) ?? task.id
        list.push({ id, localId: task.id, fields: toFields(task) })
        desiredIds.add(id)
      }
      desired.set(editorPhase.serverId, list)
    }

    for (const id of Array.from(state.tasks.keys())) {
      if (desiredIds.has(id)) continue
      const task = state.tasks.get(id) as SyncedTask
      const response = await CheckoutAPI.DeleteDraftTask(
        state.draftId,
        id,
        state.version
      )
      apply(response.data)
      state.tasks.delete(id)
      state.order.set(
        task.phaseId,
        (state.order.get(task.phaseId) ?? []).filter((item) => item !== id)
      )
    }

    for (const [phaseId, list] of desired) {
      for (const item of list) {
        if (state.tasks.has(item.id) || !item.fields) continue
        const response = await CheckoutAPI.AddDraftTask(
          state.draftId,
          phaseId,
          { version: state.version, ...item.fields }
        )
        apply(response.data)
        const newId = response.data.task.id as string
        state.localToServer.set(item.localId, newId)
        state.tasks.set(newId, { phaseId, ...item.fields })
        state.order.set(phaseId, [...(state.order.get(phaseId) ?? []), newId])
        item.id = newId
      }
    }

    for (const list of desired.values()) {
      for (const item of list) {
        const known = state.tasks.get(item.id)
        if (!known || !item.fields) continue
        const changes: Partial<TaskFields> = {}
        if (item.fields.title !== known.title) changes.title = item.fields.title
        if (item.fields.roleName !== known.roleName) {
          changes.roleName = item.fields.roleName
        }
        if (item.fields.durationHours !== known.durationHours) {
          changes.durationHours = item.fields.durationHours
        }
        if (item.fields.workSchedule !== known.workSchedule) {
          changes.workSchedule = item.fields.workSchedule
        }
        if (item.fields.customHoursPerWeek !== known.customHoursPerWeek) {
          changes.customHoursPerWeek = item.fields.customHoursPerWeek
        }
        if (item.fields.experienceLevel !== known.experienceLevel) {
          changes.experienceLevel = item.fields.experienceLevel
        }
        if (!sameLocation(item.fields.location, known.location)) {
          changes.location = item.fields.location
        }
        if (item.fields.assigneeUserId !== known.assigneeUserId) {
          changes.assigneeUserId = item.fields.assigneeUserId
        }
        if (Object.keys(changes).length === 0) continue
        const response = await CheckoutAPI.UpdateDraftTask(
          state.draftId,
          item.id,
          { version: state.version, ...changes }
        )
        apply(response.data)
        Object.assign(known, changes)
      }
    }

    for (const [phaseId, list] of desired) {
      const wanted = list
        .map((item) => item.id)
        .filter((id) => state.tasks.has(id))
      const current = state.order.get(phaseId) ?? []
      for (const [index, id] of wanted.entries()) {
        if (current[index] === id) continue
        const response = await CheckoutAPI.UpdateDraftTask(state.draftId, id, {
          version: state.version,
          order: index + 1,
        })
        apply(response.data)
        current.splice(current.indexOf(id), 1)
        current.splice(index, 0, id)
      }
      state.order.set(phaseId, current)
    }
  } catch (error) {
    return { status: "error", error }
  }

  const finished = last as Extract<ScopeSyncResult, { status: "ok" }> | null
  if (!finished) return { status: "noop" }
  return {
    ...finished,
    editorPhaseIds: editorPhases.map((phase) => phase.serverId),
  }
}
