// src/main/services/timer/__tests__/time-caps.test.ts
//
// PMCM-829 — contract time caps (DTT-US-061–065, 193–197):
//   * a contract already at its cap can't start tracking;
//   * the timer warns once shortly before the cap;
//   * the timer stops at the cap, so time over it is never tracked;
//   * contracts without a cap are untouched.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import pino from 'pino';
import { createTimerService, startOfLocalWeek, TIMER_CHANNELS, type TimerBusEvent } from '../timer-service';
import type { DbHandle } from '../../../db/connection';
import type { Repos } from '../../../db/repos';

const logger = pino({ level: 'silent' });

function makeTimer(opts: { weeklyCapSec: number | null; dailyCapSec?: number | null; usedSec: number }) {
  const db = { prepare: () => ({ run: () => undefined, get: () => undefined, all: () => [] }) } as unknown as DbHandle;
  const repos = {
    task: { findById: vi.fn(() => ({ id: 'task_1', contract_id: 'con_1', name: 'Task' })) },
    contract: {
      findById: vi.fn(() => ({
        id: 'con_1', rate_minor: 0, currency: 'USD',
        weekly_cap_seconds: opts.weeklyCapSec, daily_cap_seconds: opts.dailyCapSec ?? null,
      })),
    },
    user: { findFirst: vi.fn(() => ({ id: 'user_1' })) },
    device: { findSelf: vi.fn(() => ({ id: 'dev_1' })) },
    session: {
      findById: vi.fn(() => null),
      sumBillableSecondsByContract: vi.fn(() =>
        opts.usedSec > 0 ? [{ contract_id: 'con_1', total_billable_seconds: opts.usedSec }] : [],
      ),
      insert: vi.fn(), closeActive: vi.fn(), checkpoint: vi.fn(), closeAllOpen: vi.fn(() => []),
    },
    timeEntry: { insert: vi.fn(), close: vi.fn() },
    break: { listForSession: vi.fn(() => []), closeOpenForSession: vi.fn() },
  } as unknown as Repos;
  const timer = createTimerService({
    db, repos, logger, getUserId: () => 'user_1', getDeviceId: () => 'dev_1', disableIdleDetector: true,
  });
  const events: TimerBusEvent[] = [];
  timer.attachEventBus((e: TimerBusEvent) => events.push(e));
  const of = (channel: string) => events.filter((e) => e.channel === channel);
  return { timer, repos, of };
}

describe('PMCM-829 time caps — timer', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date', 'hrtime'] });
    vi.setSystemTime(new Date(2026, 9, 28, 10, 0, 0)); // Wed 28 Oct 2026, local
  });
  afterEach(() => vi.useRealTimers());

  it('refuses to start a contract already at its weekly cap', async () => {
    const { timer, repos, of } = makeTimer({ weeklyCapSec: 3600, usedSec: 3600 });
    await timer.startTimer({ contractId: 'con_1', taskId: 'task_1' });
    expect(timer.getCurrentState()).toBe('Idle');
    expect(repos.session.insert).not.toHaveBeenCalled();
    expect(of(TIMER_CHANNELS.capReached)).toHaveLength(1);
    expect(of(TIMER_CHANNELS.error).map((e) => (e.payload as { code: string }).code)).toContain('DTT-ERR-CAP.01');
  });

  it('warns once 15 minutes before the cap, then stops at the cap', async () => {
    // 1 h cap, 30 min already tracked this week → 30 min left.
    const { timer, repos, of } = makeTimer({ weeklyCapSec: 3600, usedSec: 1800 });
    await timer.startTimer({ contractId: 'con_1', taskId: 'task_1' });
    expect(timer.getCurrentState()).toBe('Running');

    await vi.advanceTimersByTimeAsync(14 * 60 * 1000);
    expect(of(TIMER_CHANNELS.capWarning)).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(2 * 60 * 1000); // 16 min in → 14 min left
    expect(of(TIMER_CHANNELS.capWarning)).toHaveLength(1);
    expect(timer.getCurrentState()).toBe('Running');

    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    expect(of(TIMER_CHANNELS.capWarning)).toHaveLength(1); // not repeated

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000); // past 30 min
    expect(timer.getCurrentState()).toBe('Idle');
    expect(of(TIMER_CHANNELS.capReached)).toHaveLength(1);
    const closed = (repos.session.closeActive as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(closed.billableSeconds).toBe(1800); // nothing tracked over the cap
  });

  it('uses the tighter of the daily and weekly caps', async () => {
    const { timer, of } = makeTimer({ weeklyCapSec: 40 * 3600, dailyCapSec: 600, usedSec: 0 });
    await timer.startTimer({ contractId: 'con_1', taskId: 'task_1' });
    await vi.advanceTimersByTimeAsync(11 * 60 * 1000);
    expect(timer.getCurrentState()).toBe('Idle');
    expect(of(TIMER_CHANNELS.capReached)).toHaveLength(1);
  });

  it('never stops or warns a contract with no cap', async () => {
    const { timer, of } = makeTimer({ weeklyCapSec: null, usedSec: 100 * 3600 });
    await timer.startTimer({ contractId: 'con_1', taskId: 'task_1' });
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(timer.getCurrentState()).toBe('Running');
    expect(of(TIMER_CHANNELS.capWarning)).toHaveLength(0);
    expect(of(TIMER_CHANNELS.capReached)).toHaveLength(0);
    await timer.stopTimer();
  });
});

describe('startOfLocalWeek', () => {
  it('returns local Monday midnight for any day of the week', () => {
    const monday = new Date(2026, 9, 26, 0, 0, 0).getTime();
    expect(startOfLocalWeek(new Date(2026, 9, 26, 0, 0, 0))).toBe(monday);
    expect(startOfLocalWeek(new Date(2026, 9, 28, 15, 30))).toBe(monday);
    expect(startOfLocalWeek(new Date(2026, 10, 1, 23, 59))).toBe(monday); // Sunday
  });
});
