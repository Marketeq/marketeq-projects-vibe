import { DeliverableGroup, ScopePhaseInput } from './deliverables.types';

/**
 * DeliverablesAdapter — abstract seam for deriving deliverables from
 * a project's scope tree, matching spec §01 Deliverables.
 *
 * Mirrors the pattern already in the repo: `category-service`'s
 * `SuggestionsAdapter` (abstract) + `SuggestionsAdapterMock`
 * (DB-backed heuristic) + `SuggestionsAdapterReal` (ready-to-swap).
 * Heuristic and HuggingFace implementations plug into the same seam
 * here — the caller (ProjectSyncService.toRow) never changes when the
 * backing model evolves.
 */
export abstract class DeliverablesAdapter {
  abstract deriveDeliverables(
    scope: ScopePhaseInput[],
  ): Promise<DeliverableGroup[]>;
}

export const DELIVERABLES_ADAPTER = Symbol('DELIVERABLES_ADAPTER');
