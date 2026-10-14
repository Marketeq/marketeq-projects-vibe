import { of, throwError } from 'rxjs';
import { AccountGateReconciler } from './account-gate-reconciler';
import { InMemoryGateState } from './testing/in-memory-gate-state.testing';

const A = '50000000-0000-4000-8000-000000000001';
const B = '50000000-0000-4000-8000-000000000002';
const C = '50000000-0000-4000-8000-000000000003';
const OPEN = { gateOpen: true, missingRequirements: 'none' };
const CLOSED = { gateOpen: false, missingRequirements: 'both' };

describe('AccountGateReconciler (G5 background safety net)', () => {
  const build = (opts: { sources?: Record<string, any[] | Error>; gate?: jest.Mock } = {}) => {
    const state = new InMemoryGateState();
    const checkGateBatch = opts.gate ?? jest.fn(async (ids: string[]) => new Map(ids.map((id) => [id, id === B ? CLOSED : OPEN])));
    const queries: string[] = [];
    const dataSource = {
      query: jest.fn(async (sql: string) => {
        queries.push(sql);
        const hit = Object.entries(opts.sources ?? {}).find(([needle]) => sql.includes(needle));
        if (!hit) return [];
        if (hit[1] instanceof Error) throw hit[1];
        return hit[1];
      }),
    };
    const algolia = { send: jest.fn(() => of({ updated: 1 })) };
    const rec = new AccountGateReconciler(dataSource as any, state.asService, { checkGateBatch } as any, algolia as any);
    return { rec, state, checkGateBatch, dataSource, algolia, queries };
  };

  describe('learn (accounts a roster asked about that have no state yet)', () => {
    it('asks identity once, in a batch, off the request path, and records the answers', async () => {
      const { rec, state, checkGateBatch } = build();
      await state.knownOpen([A, B]); // a roster read queues them
      const recorded = await rec.learnUnknown();
      expect(recorded).toBe(2);
      expect(checkGateBatch).toHaveBeenCalledTimes(1);
      expect(state.rows.get(A)?.gateOpen).toBe(true);
      expect(state.rows.get(B)?.gateOpen).toBe(false);
    });

    it('does nothing (no identity call) when nothing is unknown', async () => {
      const { rec, checkGateBatch } = build();
      expect(await rec.learnUnknown()).toBe(0);
      expect(checkGateBatch).not.toHaveBeenCalled();
    });

    it('identity unavailable: last known state is kept untouched and the accounts are retried next pass', async () => {
      const gate = jest.fn().mockRejectedValue(new Error('rabbit down'));
      const { rec, state } = build({ gate });
      state.set(A, true); // last known: open
      await state.knownOpen([B]);
      expect(await rec.learnUnknown()).toBe(0);
      expect(state.rows.get(A)?.gateOpen).toBe(true); // still served
      expect(state.takePendingLearn()).toEqual([B]); // retried later
    });
  });

  describe('reconcileAll (hourly + after boot)', () => {
    it('re-checks every account on a project, member row, team or role row, once each', async () => {
      const { rec, checkGateBatch, state } = build({
        sources: {
          'FROM listings.project WHERE "userId" IS NOT NULL': [{ id: A }],
          'unnest("teamMemberIds")': [{ id: A }, { id: B }],
          'FROM listings.project_members': [{ id: C }],
        },
      });
      await rec.reconcileAll();
      const asked = checkGateBatch.mock.calls.flatMap((c) => c[0]).sort();
      expect(asked).toEqual([A, B, C]);
      expect(state.rows.size).toBe(3);
    });

    it('a source that does not exist skips only itself, never the whole pass', async () => {
      const { rec, checkGateBatch } = build({
        sources: {
          'FROM listings.teams': new Error('relation "listings.teams" does not exist'),
          'FROM listings.project WHERE "userId" IS NOT NULL': [{ id: A }],
        },
      });
      await rec.reconcileAll();
      expect(checkGateBatch.mock.calls.flatMap((c) => c[0])).toEqual([A]);
    });

    it('identity unavailable during a reconcile keeps the last known state', async () => {
      const gate = jest.fn().mockRejectedValue(new Error('down'));
      const { rec, state } = build({ gate, sources: { 'unnest("teamMemberIds")': [{ id: A }] } });
      state.set(A, true);
      await rec.reconcileAll();
      expect(state.rows.get(A)?.gateOpen).toBe(true);
    });

    it('does not run twice at once', async () => {
      const { rec, dataSource } = build();
      const first = rec.reconcileAll();
      const second = await rec.reconcileAll();
      expect(second).toBe(0);
      await first;
      expect(dataSource.query).toHaveBeenCalled();
    });
  });

  describe('search index backfill (listing-owner gate)', () => {
    it('sends each owned published listing with its owner\'s last known gate, to algolia-service', async () => {
      const { rec, state, algolia } = build({
        sources: {
          '"listingType"': [
            { id: 'p1', listingType: 'project', ownerId: A },
            { id: 's1', listingType: 'service', ownerId: B },
          ],
          'FROM listings.teams\n            WHERE': [{ id: 't1', ownerId: C }],
        },
      });
      state.open(A).closed(B); // C: never received
      const sent = await rec.backfillIndexOwnerGate();
      expect(sent).toBe(3);
      const [pattern, payload] = (algolia.send.mock.calls[0] as unknown) as [string, any];
      expect(pattern).toBe('listing.owner_gate_backfill');
      expect(payload.entries).toEqual([
        { index: 'projects', id: 'p1', ownerId: A, ownerGateOpen: true },
        { index: 'services', id: 's1', ownerId: B, ownerGateOpen: false },
        { index: 'teams', id: 't1', ownerId: C, ownerGateOpen: false }, // unknown = hidden
      ]);
      expect(typeof payload.checkedAt).toBe('string');
    });

    it('is a no-op when no listing has an owner', async () => {
      const { rec, algolia } = build();
      expect(await rec.backfillIndexOwnerGate()).toBe(0);
      expect(algolia.send).not.toHaveBeenCalled();
    });

    it('an unreachable index service is skipped, not thrown (the next pass retries)', async () => {
      const { rec, state, algolia } = build({ sources: { '"listingType"': [{ id: 'p1', listingType: 'project', ownerId: A }] } });
      state.open(A);
      algolia.send.mockImplementation((() => throwError(() => new Error('queue down'))) as any);
      await expect(rec.backfillIndexOwnerGate()).resolves.toBe(0);
    });
  });
});
