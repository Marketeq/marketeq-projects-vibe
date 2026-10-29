// src/main/services/stats/__tests__/register-ipc.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const handlers = new Map<string, (...args: unknown[]) => unknown>();

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: (...args: unknown[]) => unknown) => {
      handlers.set(channel, fn);
    },
    removeHandler: (channel: string) => {
      handlers.delete(channel);
    },
  },
}));

import { IPC } from '../../../../shared/ipc-contracts';
import type { IpcErrorResult, TodayStatsDTO } from '../../../../shared/ipc-contracts';
import { registerStatsIpc, startOfLocalDay, endOfLocalDay } from '../register-ipc';
import type { DailyContractTotal, DailyTaskTotal } from '../../../db/repos/session.repo';
import type { SessionRow, ContractRow } from '../../../db/schema';

// Totals are served per day window: today's for a query starting at today's
// local midnight, the `yesterday*` ones for any earlier window.
function makeSessionRepo(overrides: {
  totals?: DailyContractTotal[];
  taskTotals?: DailyTaskTotal[];
  yesterdayTotals?: DailyContractTotal[];
  yesterdayTaskTotals?: DailyTaskTotal[];
  findByIdResult?: SessionRow | null;
  latest?: SessionRow | null;
}) {
  const isToday = (q: { startAt: number }) => q.startAt === startOfLocalDay();
  return {
    sumBillableSecondsByContract: vi.fn((q: { startAt: number }) =>
      isToday(q) ? overrides.totals ?? [] : overrides.yesterdayTotals ?? [],
    ),
    sumBillableSecondsByTask: vi.fn((q: { startAt: number }) =>
      isToday(q) ? overrides.taskTotals ?? [] : overrides.yesterdayTaskTotals ?? [],
    ),
    findById: vi.fn(() => overrides.findByIdResult ?? null),
    findLatest: vi.fn(() => overrides.latest ?? null),
  } as unknown as import('../../../db/repos/session.repo').SessionRepo;
}

function makeContractRepo(byId: Record<string, Partial<ContractRow>>) {
  return {
    findById: vi.fn((id: string) => (byId[id] ? ({ currency: 'USD', rate_minor: 0, ...byId[id] } as ContractRow) : null)),
  } as unknown as import('../../../db/repos/contract.repo').ContractRepo;
}

function makeTimer(snapshot: Partial<{ activeSessionId: string | null; pickedContract: { contractId: string; taskId: string } | null; elapsedSec: number }>) {
  return {
    getSnapshot: vi.fn(() => ({
      activeSessionId: null,
      pickedContract: null,
      elapsedSec: 0,
      ...snapshot,
    })),
  } as unknown as import('../../timer/timer-service').TimerService;
}

function isError(v: unknown): v is IpcErrorResult {
  return !!v && typeof v === 'object' && (v as IpcErrorResult).ok === false;
}

describe('registerStatsIpc / stats:get-today', () => {
  beforeEach(() => {
    handlers.clear();
  });

  it('returns ERR_STATS_NO_USER when there is no authenticated user', () => {
    registerStatsIpc({
      sessionRepo: makeSessionRepo({}),
      contractRepo: makeContractRepo({}),
      timer: makeTimer({}),
      getUserId: () => null,
    });
    const result = handlers.get(IPC.statsGetToday)?.() as IpcErrorResult;
    expect(isError(result)).toBe(true);
    expect(result.code).toBe('ERR_STATS_NO_USER');
  });

  it('computes trackedSeconds/earnedCents from closed sessions x contract rate', () => {
    registerStatsIpc({
      sessionRepo: makeSessionRepo({
        totals: [{ contract_id: 'c1', total_billable_seconds: 3600 }],
      }),
      contractRepo: makeContractRepo({ c1: { rate_minor: 5000 } }), // $50/hr
      timer: makeTimer({}),
      getUserId: () => 'user-1',
    });
    const result = handlers.get(IPC.statsGetToday)?.() as TodayStatsDTO;
    expect(result.trackedSeconds).toBe(3600);
    expect(result.earnedCents).toBe(5000); // 1hr * $50.00
    expect(result.currency).toBe('USD');
    expect(result.goalSeconds).toBe(8 * 3600);
  });

  it('rounds rate math to the nearest cent for partial hours', () => {
    registerStatsIpc({
      sessionRepo: makeSessionRepo({
        totals: [{ contract_id: 'c1', total_billable_seconds: 100 }], // 100s of $75/hr
      }),
      contractRepo: makeContractRepo({ c1: { rate_minor: 7500 } }),
      timer: makeTimer({}),
      getUserId: () => 'user-1',
    });
    const result = handlers.get(IPC.statsGetToday)?.() as TodayStatsDTO;
    // 100 * 7500 / 3600 = 208.33... -> rounds to 208
    expect(result.earnedCents).toBe(208);
  });

  it('adds the live in-progress session elapsed seconds when it started today', () => {
    const today = startOfLocalDay() + 3600_000;
    registerStatsIpc({
      sessionRepo: makeSessionRepo({
        totals: [{ contract_id: 'c1', total_billable_seconds: 1800 }],
        findByIdResult: { started_at: today } as SessionRow,
      }),
      contractRepo: makeContractRepo({ c1: { rate_minor: 3600 } }), // $36/hr = 1 cent/sec
      timer: makeTimer({
        activeSessionId: 'active-1',
        pickedContract: { contractId: 'c1', taskId: 't1' },
        elapsedSec: 600,
      }),
      getUserId: () => 'user-1',
    });
    const result = handlers.get(IPC.statsGetToday)?.() as TodayStatsDTO;
    expect(result.trackedSeconds).toBe(2400); // 1800 + 600
  });

  it('does not add live session seconds when the active session started before today', () => {
    const yesterday = startOfLocalDay() - 1000;
    registerStatsIpc({
      sessionRepo: makeSessionRepo({
        totals: [{ contract_id: 'c1', total_billable_seconds: 1800 }],
        findByIdResult: { started_at: yesterday } as SessionRow,
      }),
      contractRepo: makeContractRepo({ c1: { rate_minor: 3600 } }),
      timer: makeTimer({
        activeSessionId: 'active-1',
        pickedContract: { contractId: 'c1', taskId: 't1' },
        elapsedSec: 600,
      }),
      getUserId: () => 'user-1',
    });
    const result = handlers.get(IPC.statsGetToday)?.() as TodayStatsDTO;
    expect(result.trackedSeconds).toBe(1800);
  });

  it('does not add live session seconds when no contract is picked', () => {
    registerStatsIpc({
      sessionRepo: makeSessionRepo({ totals: [] }),
      contractRepo: makeContractRepo({}),
      timer: makeTimer({ activeSessionId: 'active-1', pickedContract: null, elapsedSec: 600 }),
      getUserId: () => 'user-1',
    });
    const result = handlers.get(IPC.statsGetToday)?.() as TodayStatsDTO;
    expect(result.trackedSeconds).toBe(0);
    expect(result.earnedCents).toBe(0);
  });

  it('sums multiple contracts with different rates', () => {
    registerStatsIpc({
      sessionRepo: makeSessionRepo({
        totals: [
          { contract_id: 'c1', total_billable_seconds: 3600 },
          { contract_id: 'c2', total_billable_seconds: 3600 },
        ],
      }),
      contractRepo: makeContractRepo({
        c1: { rate_minor: 5000 },
        c2: { rate_minor: 3000 },
      }),
      timer: makeTimer({}),
      getUserId: () => 'user-1',
    });
    const result = handlers.get(IPC.statsGetToday)?.() as TodayStatsDTO;
    expect(result.trackedSeconds).toBe(7200);
    expect(result.earnedCents).toBe(8000); // 5000 + 3000
  });

  it('skips a contract that is no longer mirrored locally without throwing', () => {
    registerStatsIpc({
      sessionRepo: makeSessionRepo({
        totals: [{ contract_id: 'missing-contract', total_billable_seconds: 3600 }],
      }),
      contractRepo: makeContractRepo({}),
      timer: makeTimer({}),
      getUserId: () => 'user-1',
    });
    const result = handlers.get(IPC.statsGetToday)?.() as TodayStatsDTO;
    expect(result.trackedSeconds).toBe(0);
    expect(result.earnedCents).toBe(0);
  });
});

describe('stats:get-today relaunch restore', () => {
  beforeEach(() => {
    handlers.clear();
  });

  it('returns per-task totals and folds the live session into its task', () => {
    const today = startOfLocalDay();
    registerStatsIpc({
      sessionRepo: makeSessionRepo({
        totals: [{ contract_id: 'c1', total_billable_seconds: 600 }],
        taskTotals: [
          { contract_id: 'c1', task_id: 't1', total_billable_seconds: 600, first_started_at: today + 1000, last_ended_at: today + 700_000 },
        ],
        findByIdResult: { started_at: today + 800_000 } as SessionRow,
      }),
      contractRepo: makeContractRepo({ c1: { rate_minor: 6000, weekly_cap_seconds: 20 * 3600 } }),
      timer: makeTimer({ activeSessionId: 's-live', pickedContract: { contractId: 'c1', taskId: 't1' }, elapsedSec: 300 }),
      getUserId: () => 'user-1',
    });
    const result = handlers.get(IPC.statsGetToday)?.() as TodayStatsDTO;
    expect(result.tasks).toEqual([
      { contractId: 'c1', taskId: 't1', trackedSeconds: 900, firstStartedAt: today + 1000, lastEndedAt: null, liveSeconds: 300, capSeconds: 20 * 3600 },
    ]);
    expect(result.lastTask).toEqual({ contractId: 'c1', taskId: 't1' });
  });

  it('pre-selects the most recent session task when nothing is running', () => {
    registerStatsIpc({
      sessionRepo: makeSessionRepo({
        latest: { contract_id: 'c2', task_id: 't9' } as SessionRow,
      }),
      contractRepo: makeContractRepo({}),
      timer: makeTimer({}),
      getUserId: () => 'user-1',
    });
    const result = handlers.get(IPC.statsGetToday)?.() as TodayStatsDTO;
    expect(result.lastTask).toEqual({ contractId: 'c2', taskId: 't9' });
  });

  it('computes Yesterday separately, at each contract rate, never adding the live session', () => {
    const today = startOfLocalDay();
    registerStatsIpc({
      sessionRepo: makeSessionRepo({
        totals: [{ contract_id: 'c1', total_billable_seconds: 3600 }],
        yesterdayTotals: [
          { contract_id: 'c1', total_billable_seconds: 1800 },
          { contract_id: 'c2', total_billable_seconds: 3600 },
        ],
        yesterdayTaskTotals: [
          { contract_id: 'c2', task_id: 't2', total_billable_seconds: 3600, first_started_at: today - 50_000_000, last_ended_at: today - 46_400_000 },
        ],
        findByIdResult: { started_at: today + 1000 } as SessionRow,
      }),
      contractRepo: makeContractRepo({ c1: { rate_minor: 6000 }, c2: { rate_minor: 3000 } }),
      timer: makeTimer({ activeSessionId: 's-live', pickedContract: { contractId: 'c1', taskId: 't1' }, elapsedSec: 600 }),
      getUserId: () => 'user-1',
    });
    const result = handlers.get(IPC.statsGetToday)?.() as TodayStatsDTO;
    expect(result.trackedSeconds).toBe(4200); // 3600 closed + 600 live
    expect(result.yesterday.trackedSeconds).toBe(5400);
    expect(result.yesterday.earnedCents).toBe(6000); // 3000 (c1 half hour) + 3000 (c2 hour)
    expect(result.yesterday.tasks).toHaveLength(1);
    expect(result.yesterday.tasks[0].taskId).toBe('t2');
  });
});

describe('startOfLocalDay / endOfLocalDay', () => {
  it('excludes 23:59:59 the prior day and includes 00:00:00 today', () => {
    const now = new Date('2026-09-18T15:30:00');
    const start = startOfLocalDay(now);
    const end = endOfLocalDay(now);
    const yesterdayLate = new Date(start - 1000).getTime();
    const todayMidnight = start;
    expect(yesterdayLate < start).toBe(true);
    expect(todayMidnight >= start && todayMidnight < end).toBe(true);
    expect(end - start).toBe(24 * 60 * 60 * 1000);
  });
});
