// Smart Assistant scope-edit operation types. Shared between
// job-listing-ai.service.ts (builds/validates operations from the LLM
// response) and job-listing-scope.service.ts (applies them against the DB,
// and — via applyOperationsToSnapshot — against a stored history snapshot
// for retry). Kept in their own file since neither service otherwise
// imports from the other.
//
// Addressing: every phaseIndex/taskIndex in a batch of operations refers to
// the position of that phase/task in the PRE-EDIT snapshot (phases and
// tasks ordered by positionOrder), never to the result of an earlier
// operation in the same batch. See applyOperationsToSnapshot in
// job-listing-scope.service.ts for how a batch is resolved against a
// snapshot.

export interface TaskOperationFields {
  taskName?: string;
  roleTitle?: string;
  location?: string | null;
  experienceLevel?: string | null;
  workSchedule?: string;
  customHours?: number | null;
  customFrequency?: string | null;
  estimatedHours?: number;
}

export interface NewTaskInput {
  taskName: string;
  roleTitle: string;
  location: string | null;
  experienceLevel: string | null;
  workSchedule: string;
  customHours: number | null;
  customFrequency: string | null;
  estimatedHours: number;
}

export interface PhaseOperationFields {
  phaseName?: string;
  recurrenceSchedule?: string | null;
  recurrenceCount?: number | null;
  durationDays?: number | null;
}

export interface NewPhaseInput {
  phaseName: string;
  phaseType: string;
  recurrenceSchedule: string | null;
  recurrenceCount: number | null;
  durationDays: number | null;
  tasks: NewTaskInput[];
}

export type ScopeOperation =
  | { op: "update_task"; phaseIndex: number; taskIndex: number; fields: TaskOperationFields }
  | { op: "add_task"; phaseIndex: number; task: NewTaskInput }
  | { op: "remove_task"; phaseIndex: number; taskIndex: number }
  | { op: "update_phase"; phaseIndex: number; fields: PhaseOperationFields }
  | { op: "add_phase"; phase: NewPhaseInput; afterPhaseIndex?: number }
  | { op: "remove_phase"; phaseIndex: number };

// The shape a phase/task is trimmed to for both prompting the LLM and for
// applyOperationsToSnapshot's pure in-memory apply. Deliberately carries no
// id — operations address phases/tasks by index, not id (see module doc
// above) — and no calculated fields (startDay/endDay/hourlyRateUsdCents),
// which job-listing-budget.service.ts recomputes after operations are
// persisted.
export interface ScopeSnapshotTask {
  taskName: string;
  roleTitle: string;
  location: string | null;
  experienceLevel: string | null;
  workSchedule: string;
  customHours: number | null;
  customFrequency: string | null;
  estimatedHours: number;
}

export interface ScopeSnapshotPhase {
  phaseName: string;
  phaseType: string;
  recurrenceSchedule: string | null;
  recurrenceCount: number | null;
  durationDays: number | null;
  tasks: ScopeSnapshotTask[];
}
