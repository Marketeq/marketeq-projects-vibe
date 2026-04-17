import { Injectable } from '@nestjs/common';
import { DeliverablesAdapter } from './deliverables.adapter';
import { DeliverableGroup, ScopePhaseInput } from './deliverables.types';

/**
 * Heuristic adapter — one deliverable group per scope phase, items =
 * unique task titles (case-insensitive exact-match dedup). No model
 * calls, always safe.
 *
 * Used as:
 *   • the default when `HUGGINGFACE_API_KEY` is absent (dev, CI)
 *   • the fallback path inside `DeliverablesAdapterHuggingFace` on any
 *     inference error, so the sync pipeline never fails on model
 *     issues
 */
@Injectable()
export class DeliverablesAdapterHeuristic extends DeliverablesAdapter {
  async deriveDeliverables(
    scope: ScopePhaseInput[],
  ): Promise<DeliverableGroup[]> {
    return scope
      .map((phase, index) => {
        const seen = new Set<string>();
        const items: string[] = [];
        for (const task of phase.tasks) {
          const title =
            typeof task?.title === 'string' ? task.title.trim() : '';
          if (!title) continue;
          const key = title.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          items.push(title);
        }
        if (items.length === 0) return null;
        return {
          phaseLabel: `Phase ${index + 1}`,
          phaseName: phase.phaseName,
          items,
        };
      })
      .filter((p): p is DeliverableGroup => !!p);
  }
}
