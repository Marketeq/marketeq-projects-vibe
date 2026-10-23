// src/main/services/timer/__tests__/crash-recovery.test.ts
//
// Crash recovery prompt (doc 01 §18, DTT-US-131/132/133):
//   * the swept session is held for a decision, not reported closed;
//   * Recover restores the same session into Paused at its checkpoint;
//   * Discard sends the held backend close exactly once;
//   * the decision survives a restart and is never made silently.

import { describe, expect, it, vi } from 'vitest';
import pino from 'pino';
import { createCrashRecovery, PENDING_CRASH_RECOVERY_KEY, type ClosedSession } from '../crash-recovery';
import { createTimerService } from '../timer-service';
import type { DbHandle } from '../../../db/connection';
import type { Repos } from '../../../db/repos';

const logger = pino({ level: 'silent' });

type Row = {
  id: string; user_id: string; contract_id: string; task_id: string; started_at: number;
  ended_at: number | null; end_reason: string | null; billable_seconds: number;
};

const crashed = (over: Partial<Row> = {}): Row => ({
  id: 'ses_crash', user_id: 'user_1', contract_id: 'con_1', task_id: 'task_1',
  started_at: 1_000_000, ended_at: 1_600_000, end_reason: 'crash_recover', billable_seconds: 540,
  ...over,
});

function makePrefs() {
  const store = new Map<string, string>();
  return {
    store,
    repo: {
      get: (k: string) => (store.has(k) ? { key: k, value_json: store.get(k)!, updated_at: 0 } : null),
      set: (k: string, v: string) => void store.set(k, v),
      delete: (k: string) => void store.delete(k),
    },
  };
}

function makeCoordinator(opts: { row?: Row | null; userId?: string | null; contractStatus?: string; recoverOk?: boolean } = {}) {
  const prefs = makePrefs();
  const row = opts.row === undefined ? crashed() : opts.row;
  const enqueued: ClosedSession[] = [];
  const timer = { recoverCrashedSession: vi.fn(async () => opts.recoverOk ?? true) };
  const cr = createCrashRecovery({
    repos: {
      session: { findById: (id: string) => (row && row.id === id ? row : null) },
      task: { findById: () => ({ id: 'task_1', name: 'Design review' }) },
      contract: { findById: () => ({ id: 'con_1', name: 'Seed Test Contract', status: opts.contractStatus ?? 'active' }) },
      preference: prefs.repo,
    } as unknown as Parameters<typeof createCrashRecovery>[0]['repos'],
    timer,
    getUserId: () => (opts.userId === undefined ? 'user_1' : opts.userId),
    enqueueClose: () => (s) => enqueued.push(s),
    logger,
  });
  const swept: ClosedSession[] = row
    ? [{ id: row.id, endedAt: row.ended_at!, endReason: 'crash_recover', billableSeconds: row.billable_seconds }]
    : [];
  return { cr, prefs, enqueued, timer, swept };
}

describe('crash recovery — holding the decision', () => {
  it('holds the swept session instead of sending its close at startup', () => {
    const { cr, prefs, swept } = makeCoordinator();
    expect(cr.holdSweptSessions(swept)).toEqual([]);
    expect(JSON.parse(prefs.store.get(PENDING_CRASH_RECOVERY_KEY)!)).toBe('ses_crash');
  });

  it('offers the owner the spec dialog data: task, contract, checkpoint time', () => {
    const { cr, swept } = makeCoordinator();
    cr.holdSweptSessions(swept);
    expect(cr.getPending()).toEqual({
      sessionId: 'ses_crash', taskName: 'Design review', contractName: 'Seed Test Contract',
      elapsedSec: 540, canRecover: true,
    });
  });

  it('survives a restart: no new sweep, still asks (never decided silently)', () => {
    const { cr, swept } = makeCoordinator();
    cr.holdSweptSessions(swept);
    cr.holdSweptSessions([]); // next launch, nothing new swept
    expect(cr.getPending()?.sessionId).toBe('ses_crash');
  });

  it('waits for sign-in before asking', () => {
    const { cr, swept, enqueued } = makeCoordinator({ userId: null });
    cr.holdSweptSessions(swept);
    expect(cr.getPending()).toBeNull();
    expect(enqueued).toHaveLength(0);
  });

  it("someone else's session is closed the old way, without a prompt", () => {
    const { cr, swept, enqueued, prefs } = makeCoordinator({ userId: 'user_2' });
    cr.holdSweptSessions(swept);
    expect(cr.getPending()).toBeNull();
    expect(enqueued.map((s) => s.id)).toEqual(['ses_crash']);
    expect(prefs.store.has(PENDING_CRASH_RECOVERY_KEY)).toBe(false);
  });
});

describe('crash recovery — Recover / Discard', () => {
  it('Recover restores via the timer, sends no backend close, and clears the prompt', async () => {
    const { cr, swept, enqueued, timer, prefs } = makeCoordinator();
    cr.holdSweptSessions(swept);
    expect(await cr.recover()).toBe(true);
    expect(timer.recoverCrashedSession).toHaveBeenCalledWith('ses_crash');
    expect(enqueued).toHaveLength(0);
    expect(prefs.store.has(PENDING_CRASH_RECOVERY_KEY)).toBe(false);
  });

  it('Recover is refused when the contract is no longer active (doc 05 CRASH.05)', async () => {
    const { cr, swept, timer } = makeCoordinator({ contractStatus: 'paused' });
    cr.holdSweptSessions(swept);
    expect(cr.getPending()?.canRecover).toBe(false);
    expect(await cr.recover()).toBe(false);
    expect(timer.recoverCrashedSession).not.toHaveBeenCalled();
  });

  it('Discard sends the held close exactly once (checkpoint billable, crash_recover) and clears', () => {
    const { cr, swept, enqueued, prefs } = makeCoordinator();
    cr.holdSweptSessions(swept);
    expect(cr.discard()).toBe(true);
    expect(enqueued).toEqual([{ id: 'ses_crash', endedAt: 1_600_000, endReason: 'crash_recover', billableSeconds: 540 }]);
    expect(prefs.store.has(PENDING_CRASH_RECOVERY_KEY)).toBe(false);
    expect(cr.discard()).toBe(false); // nothing pending any more
    expect(enqueued).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// timer-service.recoverCrashedSession — the Recover side effects
// ---------------------------------------------------------------------------

function makeTimer(row: Row, reopenOk = true) {
  const db = { prepare: () => ({ run: () => undefined, get: () => undefined, all: () => [] }) } as unknown as DbHandle;
  const repos = {
    task: { findById: vi.fn(() => ({ id: 'task_1', contract_id: 'con_1', name: 'Task' })) },
    contract: { findById: vi.fn(() => ({ id: 'con_1', rate_minor: 0, currency: 'USD' })) },
    user: { findFirst: vi.fn(() => ({ id: 'user_1' })) },
    device: { findSelf: vi.fn(() => ({ id: 'dev_1' })) },
    session: {
      findById: vi.fn(() => row),
      reopenCrashRecovered: vi.fn(() => reopenOk),
      insert: vi.fn(), closeActive: vi.fn(), checkpoint: vi.fn(), closeAllOpen: vi.fn(() => []),
    },
    timeEntry: { insert: vi.fn(), close: vi.fn(), markRecovered: vi.fn() },
    break: { listForSession: vi.fn(() => []), closeOpenForSession: vi.fn() },
  } as unknown as Repos;
  const timer = createTimerService({
    db, repos, logger, getUserId: () => 'user_1', getDeviceId: () => 'dev_1', disableIdleDetector: true,
  });
  return { timer, repos };
}

describe('timer-service — recoverCrashedSession', () => {
  it('restores the SAME session into Paused at its checkpoint; Resume then tracks a new live entry', async () => {
    const { timer, repos } = makeTimer(crashed());
    expect(await timer.recoverCrashedSession('ses_crash')).toBe(true);

    const snap = timer.getSnapshot();
    expect(snap.state).toBe('Paused');
    expect(snap.activeSessionId).toBe('ses_crash');
    expect(snap.pickedContract).toEqual({ contractId: 'con_1', taskId: 'task_1' });
    expect(snap.elapsedSec).toBe(540);
    expect(repos.session.reopenCrashRecovered).toHaveBeenCalledWith('ses_crash');
    expect(repos.break.closeOpenForSession).toHaveBeenCalledWith('ses_crash', 1_600_000);
    expect(repos.timeEntry.markRecovered).toHaveBeenCalledWith('ses_crash');
    expect(repos.session.insert).not.toHaveBeenCalled(); // no new session

    await timer.resumeTimer();
    expect(timer.getCurrentState()).toBe('Running');
    expect(repos.timeEntry.insert).toHaveBeenCalledTimes(1);
    expect((repos.timeEntry.insert as ReturnType<typeof vi.fn>).mock.calls[0][0].session_id).toBe('ses_crash');
  });

  it('changes nothing when the row cannot be reopened', async () => {
    const { timer, repos } = makeTimer(crashed(), false);
    expect(await timer.recoverCrashedSession('ses_crash')).toBe(false);
    expect(timer.getCurrentState()).toBe('Idle');
    expect(repos.timeEntry.markRecovered).not.toHaveBeenCalled();
  });

  it('refuses a session that was not crash-swept', async () => {
    const { timer, repos } = makeTimer(crashed({ end_reason: 'user_stop' }));
    expect(await timer.recoverCrashedSession('ses_crash')).toBe(false);
    expect(repos.session.reopenCrashRecovered).not.toHaveBeenCalled();
    expect(timer.getCurrentState()).toBe('Idle');
  });
});
