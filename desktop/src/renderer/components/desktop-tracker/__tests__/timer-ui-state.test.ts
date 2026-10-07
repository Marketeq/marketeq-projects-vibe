// src/renderer/components/desktop-tracker/__tests__/timer-ui-state.test.ts

import { describe, it, expect } from 'vitest';
import {
  deriveUiRunningPaused,
  computeDisplayedElapsedSec,
  decideActiveTaskAction,
} from '../timer-ui-state';
import type { TimerStateName } from '../../../../shared/ipc-contracts';

describe('deriveUiRunningPaused', () => {
  const cases: Array<{
    state: TimerStateName;
    isOnBreak: boolean;
    isRunning: boolean;
    isPaused: boolean;
  }> = [
    { state: 'Idle', isOnBreak: false, isRunning: false, isPaused: false },
    { state: 'Counting', isOnBreak: false, isRunning: false, isPaused: false },
    { state: 'Running', isOnBreak: false, isRunning: true, isPaused: false },
    { state: 'Paused', isOnBreak: false, isRunning: true, isPaused: true },
    { state: 'IdleSoftPaused', isOnBreak: false, isRunning: true, isPaused: true },
    { state: 'OnBreakPaid', isOnBreak: true, isRunning: true, isPaused: true },
    { state: 'OnBreakUnpaid', isOnBreak: true, isRunning: true, isPaused: true },
    { state: 'OfflineStopped', isOnBreak: false, isRunning: false, isPaused: false },
    { state: 'LockedDisputed', isOnBreak: false, isRunning: true, isPaused: false },
  ];

  for (const c of cases) {
    it(`${c.state} (isOnBreak=${c.isOnBreak}) -> isRunning=${c.isRunning}, isPaused=${c.isPaused}`, () => {
      expect(deriveUiRunningPaused({ state: c.state, isOnBreak: c.isOnBreak })).toEqual({
        isRunning: c.isRunning,
        isPaused: c.isPaused,
      });
    });
  }

  it('IdleSoftPaused is paused even when isOnBreak is (incorrectly) true — state wins', () => {
    expect(deriveUiRunningPaused({ state: 'IdleSoftPaused', isOnBreak: true })).toEqual({
      isRunning: true,
      isPaused: true,
    });
  });
});

describe('computeDisplayedElapsedSec', () => {
  it('returns exactly the baseline when no time has passed', () => {
    expect(computeDisplayedElapsedSec({ sec: 42, at: 1000 }, 1000)).toBe(42);
  });

  it('adds whole seconds elapsed since the baseline was captured', () => {
    expect(computeDisplayedElapsedSec({ sec: 42, at: 1000 }, 1000 + 5_000)).toBe(47);
  });

  it('floors partial seconds rather than rounding', () => {
    expect(computeDisplayedElapsedSec({ sec: 0, at: 0 }, 1_999)).toBe(1);
  });

  it('never goes negative if `now` is somehow before the baseline (clock skew)', () => {
    expect(computeDisplayedElapsedSec({ sec: 10, at: 5_000 }, 1_000)).toBe(10);
  });

  it('regression: a long idle/pause gap does not get silently added once ticking resumes', () => {
    // This is the exact shape of the bug this fix exists to prevent: pause for
    // 5 real minutes, then resume. The old code computed `now - absoluteStartTime`,
    // which always included the paused stretch. The baseline model must not.
    const baseline = { sec: 28, at: 1_000_000 }; // confirmed by the backend right as idle fired
    const fiveMinutesLater = 1_000_000 + 5 * 60 * 1000; // no ticks fired in between (paused)
    // Immediately after resuming, the baseline is reset to the backend's fresh
    // confirmation (also 28s, since paused time never accrues) — simulated here
    // as the baseline being captured anew at the resume moment, not advanced by
    // the 5 minutes that passed while paused.
    const freshBaselineAtResume = { sec: 28, at: fiveMinutesLater };
    expect(computeDisplayedElapsedSec(freshBaselineAtResume, fiveMinutesLater)).toBe(28);
    expect(computeDisplayedElapsedSec(freshBaselineAtResume, fiveMinutesLater + 1_000)).toBe(29);
  });
});

describe('decideActiveTaskAction', () => {
  const decide = (state: TimerStateName, hasPickedContract: boolean, hasActiveTask: boolean) => {
    const { isRunning } = deriveUiRunningPaused({ state, isOnBreak: false });
    return decideActiveTaskAction({ state, running: isRunning, hasPickedContract, hasActiveTask });
  };

  it('Counting never clears the task (it is the in-between step of Start)', () => {
    expect(decide('Counting', true, true)).toBe('keep');
    expect(decide('Counting', true, false)).toBe('keep');
  });

  it('Idle and OfflineStopped really end tracking -> clear', () => {
    expect(decide('Idle', false, true)).toBe('clear');
    expect(decide('OfflineStopped', true, true)).toBe('clear');
  });

  it('running with a pick but no task on screen (window reload) -> restore', () => {
    for (const s of ['Running', 'Paused', 'IdleSoftPaused', 'OnBreakUnpaid'] as const) {
      expect(decide(s, true, false)).toBe('restore');
    }
  });

  it('running with the task already on screen -> keep (no extra lookup)', () => {
    expect(decide('Running', true, true)).toBe('keep');
  });

  it('running with no pick -> keep', () => {
    expect(decide('Running', false, false)).toBe('keep');
  });

  // Mirrors applyTimerSnapshot: activeTaskRef only syncs after React commits,
  // so every snapshot in one batch sees the ref as it was before the batch.
  function deliver(batches: TimerStateName[][]) {
    let activeTask: string | null = 'optimistic-task'; // set by startTimerImmediate
    let pending: string | null = null;
    for (const batch of batches) {
      const refAtBatchStart = activeTask;
      let queuedTask: string | null | undefined;
      for (const state of batch) {
        const action = decide(state, state !== 'Idle', !!refAtBatchStart);
        if (action === 'clear') {
          queuedTask = null;
          pending = null;
        } else if (action === 'restore') {
          pending = 'picked';
        }
      }
      if (queuedTask !== undefined) activeTask = queuedTask;
      // the [pendingPickedContract, days] effect restores after commit
      if (pending && !activeTask) {
        activeTask = 'restored-task';
        pending = null;
      }
    }
    return activeTask;
  }

  it('regression: Counting + Running in ONE batch keeps the task (header stays)', () => {
    expect(deliver([['Counting', 'Running']])).toBe('optimistic-task');
  });

  it('Counting and Running in separate batches keeps the task', () => {
    expect(deliver([['Counting'], ['Running']])).toBe('optimistic-task');
  });

  it('Stop still clears the task', () => {
    expect(deliver([['Counting', 'Running'], ['Idle']])).toBeNull();
  });
});
