// src/renderer/components/desktop-tracker/__tests__/timer-ui-state.test.ts

import { describe, it, expect } from 'vitest';
import { deriveUiRunningPaused, computeDisplayedElapsedSec } from '../timer-ui-state';
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
