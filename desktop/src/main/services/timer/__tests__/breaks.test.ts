// src/main/services/timer/__tests__/breaks.test.ts
//
// PMCM-830 — break subsystem (doc 20 §6.2, DTT-US-059/067–076):
//   * paid break time is billable, up to the contract's allowance;
//   * a paid break whose allowance runs out mid-break carries on unpaid;
//   * the allowance is per day, across sessions;
//   * the 4 h break cap is enforced live, not only when the break ends.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import pino from 'pino';
import { createTimerService, TIMER_CHANNELS, type TimerBusEvent } from '../timer-service';
import { transition } from '../state-machine';
import type { DbHandle } from '../../../db/connection';
import type { Repos } from '../../../db/repos';

const logger = pino({ level: 'silent' });

type BreakRow = { id: string; session_id: string; kind: 'paid' | 'unpaid'; started_at: number; ended_at: number | null };

function makeTimer(opts: { allowanceSec: number; paidUsedTodaySec?: number }) {
  const db = { prepare: () => ({ run: () => undefined, get: () => undefined, all: () => [] }) } as unknown as DbHandle;
  const breaks: BreakRow[] = [];
  const repos = {
    task: { findById: vi.fn(() => ({ id: 'task_1', contract_id: 'con_1', name: 'Task' })) },
    contract: {
      findById: vi.fn(() => ({
        id: 'con_1', rate_minor: 0, currency: 'USD',
        weekly_cap_seconds: null, daily_cap_seconds: null,
        paid_break_allowance_seconds: opts.allowanceSec,
      })),
    },
    user: { findFirst: vi.fn(() => ({ id: 'user_1' })) },
    device: { findSelf: vi.fn(() => ({ id: 'dev_1' })) },
    session: {
      findById: vi.fn(() => null),
      sumBillableSecondsByContract: vi.fn(() => []),
      insert: vi.fn(), closeActive: vi.fn(), checkpoint: vi.fn(), closeAllOpen: vi.fn(() => []),
    },
    timeEntry: { insert: vi.fn(), close: vi.fn() },
    break: {
      listForSession: vi.fn(() => breaks),
      insert: vi.fn((row: BreakRow) => void breaks.push({ ...row })),
      close: vi.fn((id: string, endedAt: number) => {
        const b = breaks.find((x) => x.id === id);
        if (b) b.ended_at = endedAt;
      }),
      closeOpenForSession: vi.fn(),
      sumPaidSecondsForContract: vi.fn(({ now }: { now: number }) =>
        (opts.paidUsedTodaySec ?? 0) +
        breaks
          .filter((b) => b.kind === 'paid')
          .reduce((s, b) => s + Math.floor(((b.ended_at ?? now) - b.started_at) / 1000), 0),
      ),
    },
  } as unknown as Repos;
  const timer = createTimerService({
    db, repos, logger, getUserId: () => 'user_1', getDeviceId: () => 'dev_1', disableIdleDetector: true,
  });
  const events: TimerBusEvent[] = [];
  timer.attachEventBus((e: TimerBusEvent) => events.push(e));
  const errors = () =>
    events.filter((e) => e.channel === TIMER_CHANNELS.error).map((e) => (e.payload as { code: string }).code);
  return { timer, repos, breaks, errors };
}

describe('PMCM-830 breaks — timer', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date', 'hrtime'] });
    vi.setSystemTime(new Date(2026, 9, 28, 10, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('counts a paid break within the allowance as billable time', async () => {
    const { timer, repos } = makeTimer({ allowanceSec: 15 * 60 });
    await timer.startTimer({ contractId: 'con_1', taskId: 'task_1' });
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000); // 10 min work
    await timer.startBreak({ kind: 'paid' });
    expect(timer.getCurrentState()).toBe('OnBreakPaid');
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000); // 5 min paid break
    expect(timer.getSnapshot().elapsedSec).toBe(15 * 60);
    await timer.endBreak();
    await vi.advanceTimersByTimeAsync(60 * 1000);
    await timer.stopTimer();
    const closed = (repos.session.closeActive as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(closed.billableSeconds).toBe(16 * 60);
  });

  it('switches a paid break to unpaid when the allowance runs out mid-break', async () => {
    const { timer, breaks, errors } = makeTimer({ allowanceSec: 5 * 60 });
    await timer.startTimer({ contractId: 'con_1', taskId: 'task_1' });
    await timer.startBreak({ kind: 'paid' });
    await vi.advanceTimersByTimeAsync(8 * 60 * 1000);

    expect(timer.getCurrentState()).toBe('OnBreakUnpaid');
    expect(errors()).toContain('DTT-ERR-BREAK.03');
    expect(breaks.map((b) => b.kind)).toEqual(['paid', 'unpaid']);
    expect(breaks[0].ended_at).not.toBeNull();
    // Only the 5 allowed minutes are billable, not the 8 on break.
    expect(timer.getSnapshot().elapsedSec).toBe(5 * 60);
  });

  it('uses the per-day allowance: paid breaks in earlier sessions today count', async () => {
    const { timer, errors } = makeTimer({ allowanceSec: 15 * 60, paidUsedTodaySec: 15 * 60 });
    await timer.startTimer({ contractId: 'con_1', taskId: 'task_1' });
    await timer.startBreak({ kind: 'paid' });
    expect(timer.getCurrentState()).toBe('Running');
    expect(errors()).toContain('DTT-ERR-BREAK.01');
  });

  it('stops the session live when a break reaches 4 hours', async () => {
    const { timer, errors } = makeTimer({ allowanceSec: 0 });
    await timer.startTimer({ contractId: 'con_1', taskId: 'task_1' });
    await timer.startBreak({ kind: 'unpaid' });
    await vi.advanceTimersByTimeAsync(4 * 60 * 60 * 1000 - 5000);
    expect(timer.getCurrentState()).toBe('OnBreakUnpaid');
    await vi.advanceTimersByTimeAsync(10 * 1000);
    expect(timer.getCurrentState()).toBe('Idle');
    expect(errors()).toContain('DTT-ERR-BREAK.02');
  });

  it('counts paid → unpaid as one break for the 4 h cap', async () => {
    const { timer } = makeTimer({ allowanceSec: 60 * 60 });
    await timer.startTimer({ contractId: 'con_1', taskId: 'task_1' });
    await timer.startBreak({ kind: 'paid' });
    await vi.advanceTimersByTimeAsync(2 * 60 * 60 * 1000); // downgraded at 1 h
    expect(timer.getCurrentState()).toBe('OnBreakUnpaid');
    await vi.advanceTimersByTimeAsync(2 * 60 * 60 * 1000 + 5000);
    expect(timer.getCurrentState()).toBe('Idle');
  });
});

describe('state machine — BREAK_ALLOWANCE_EXHAUSTED', () => {
  const ctx = { hasActiveSession: true, paidBreakRemainingSeconds: 0 };

  it('moves a paid break to unpaid, closing the paid row and opening an unpaid one', () => {
    const r = transition('OnBreakPaid', { type: 'BREAK_ALLOWANCE_EXHAUSTED' }, ctx);
    expect(r.next).toBe('OnBreakUnpaid');
    expect(r.effects.map((e) => e.kind)).toEqual(['close_break', 'open_break', 'audit']);
  });

  it('is ignored outside a paid break', () => {
    expect(transition('OnBreakUnpaid', { type: 'BREAK_ALLOWANCE_EXHAUSTED' }, ctx).next).toBe('OnBreakUnpaid');
    expect(transition('Running', { type: 'BREAK_ALLOWANCE_EXHAUSTED' }, ctx).next).toBe('Running');
  });
});
