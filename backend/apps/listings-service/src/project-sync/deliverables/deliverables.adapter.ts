import { DeliverableGroup, ProjectContext, ScopePhaseInput } from './deliverables.types';

/**
 * DeliverablesAdapter — abstract seam for deriving deliverables from
 * a project's scope tree using an LLM.
 *
 * Inputs per task: task title, job title (role), task description.
 * Project-level context: project type (category), project description.
 *
 * The LLM evaluates each task and generates between 3-6 contextually
 * relevant deliverables per phase based on the richness of the input.
 */
export abstract class DeliverablesAdapter {
  abstract deriveDeliverables(
    scope: ScopePhaseInput[],
    projectContext?: ProjectContext,
  ): Promise<DeliverableGroup[]>;
}

export const DELIVERABLES_ADAPTER = Symbol('DELIVERABLES_ADAPTER');
