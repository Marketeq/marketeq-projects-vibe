/**
 * Shared types for the deliverables adapter seam.
 *
 * One deliverable group per scope phase, items are client-facing
 * statements (one per bullet). Matches the jsonb column on
 * `public.projects.deliverables` and the frontend Figma mock.
 */
export interface DeliverableGroup {
  phaseLabel: string;
  phaseName: string;
  items: string[];
}

/**
 * Minimum scope shape the adapter needs. Structurally compatible with
 * the output of `ProjectSyncService.scopePhases()` so existing
 * normalization stays authoritative and adapters stay dumb.
 */
export interface ScopePhaseInput {
  phaseName: string;
  order: number;
  tasks: Array<{
    title: string;
    roleName?: string;
    description?: string;
  }>;
}

export interface ProjectContext {
  projectType?: string | null;
  projectDescription?: string | null;
}
