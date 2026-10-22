import { InternalServerErrorException } from '@nestjs/common'
import { AccountGateStateService } from './account-gate-state.service';

const A = '30000000-0000-4000-8000-000000000001';
const B = '30000000-0000-4000-8000-000000000002';
const C = '30000000-0000-4000-8000-000000000003';

// The SQL semantics the service relies on, modelled in memory: an upsert that only
// replaces a row when the incoming decision is not older, and a keyed select.
function fakeDataSource() {
  const rows = new Map<string, { gateOpen: boolean; occurredAt: number }>();
  const statements: string[] = [];
  let failReads = false;
  const ds = {
    rows,
    statements,
    failReads: (v: boolean) => (failReads = v),
    query: jest.fn(async (sql: string, params: any[]) => {
      statements.push(sql.trim().split(/\s+/)[0].toUpperCase());
      if (/^\s*INSERT/i.test(sql)) {
        const [userId, gateOpen, occurredAt] = params;
        const at = Date.parse(occurredAt);
        const cur = rows.get(userId);
        if (cur && at < cur.occurredAt) return []; // ON CONFLICT ... WHERE EXCLUDED."occurredAt" >= existing
        rows.set(userId, { gateOpen, occurredAt: at });
        return [{ userId }];
      }
      if (failReads) throw new InternalServerErrorException('relation "listings.account_gate_state" does not exist');
      const wanted: string[] = params[0];
      return wanted.filter((id) => rows.has(id)).map((id) => ({ userId: id, gateOpen: rows.get(id)!.gateOpen }));
    }),
  };
  return ds;
}

describe('AccountGateStateService (G5 last-known gate state)', () => {
  const build = () => {
    const ds = fakeDataSource();
    return { ds, state: new AccountGateStateService(ds as any) };
  };
  const t = (ms: number) => new Date(1_790_000_000_000 + ms);

  it('records a decision and reports only known-open accounts as open', async () => {
    const { state } = build();
    await state.apply(A, true, t(0));
    await state.apply(B, false, t(0));
    expect([...(await state.knownOpen([A, B, C]))]).toEqual([A]);
  });

  it('an older decision never overwrites a newer one (redelivery / out-of-order)', async () => {
    const { state } = build();
    expect(await state.apply(A, false, t(2000))).toBe(true);
    expect(await state.apply(A, true, t(1000))).toBe(false); // stale
    expect((await state.knownOpen([A])).has(A)).toBe(false);
    expect(await state.apply(A, true, t(3000))).toBe(true);
    expect((await state.knownOpen([A])).has(A)).toBe(true);
  });

  it('a repeat of the same decision is harmless', async () => {
    const { state } = build();
    await state.apply(A, true, t(1000));
    await state.apply(A, true, t(1000));
    expect((await state.knownOpen([A])).has(A)).toBe(true);
  });

  it('never received: not shown, and queued for the background reconcile to learn (once)', async () => {
    const { state } = build();
    await state.apply(A, true, t(0));
    await state.knownOpen([A, B, C]);
    expect(state.takePendingLearn().sort()).toEqual([B, C].sort());
    expect(state.takePendingLearn()).toEqual([]); // drained
  });

  it('learning an account removes it from the queue', async () => {
    const { state } = build();
    await state.knownOpen([B]);
    await state.apply(B, true, t(0));
    expect(state.takePendingLearn()).toEqual([]);
  });

  it('an account that could not be learned can be put back', async () => {
    const { state } = build();
    await state.knownOpen([B]);
    const ids = state.takePendingLearn();
    state.requeue(ids);
    expect(state.takePendingLearn()).toEqual([B]);
  });

  it('ignores ids that are not user ids and makes no query for an empty set', async () => {
    const { state, ds } = build();
    expect(await state.knownOpen(['not-a-uuid', '', null, undefined])).toEqual(new Set());
    expect(ds.query).not.toHaveBeenCalled();
    expect(await state.apply('not-a-uuid', true, t(0))).toBe(false);
  });

  it('an unreadable table shows nobody - never everybody - and throws nothing', async () => {
    const { state, ds } = build();
    await state.apply(A, true, t(0));
    ds.failReads(true);
    await expect(state.knownOpen([A])).resolves.toEqual(new Set());
  });

  it('reads are one local query however many accounts are asked about', async () => {
    const { state, ds } = build();
    ds.query.mockClear();
    await state.knownOpen([A, B, C, A]);
    expect(ds.query).toHaveBeenCalledTimes(1);
  });

  it('only writes the gate state table: a read is a SELECT, a write is an upsert', async () => {
    const { state, ds } = build();
    await state.apply(A, true, t(0));
    await state.knownOpen([A]);
    expect(ds.statements).toEqual(['INSERT', 'SELECT']);
  });
});
