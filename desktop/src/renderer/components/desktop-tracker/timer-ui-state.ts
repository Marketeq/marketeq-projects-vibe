// src/renderer/components/desktop-tracker/timer-ui-state.ts
//
// Pure, testable logic for deriving TimeTrackerApp's local UI state from the
// real backend timer snapshot. Kept separate from the component so the two
// things that were actually wrong (idle never mapped to "paused," and the
// displayed clock drifting from absolute time instead of a backend-confirmed
// baseline) are each one small, directly-testable function rather than logic
// buried inside a React effect.

import type { TimerStateName } from '../../../shared/ipc-contracts';

export function deriveUiRunningPaused(snap: {
  state: TimerStateName;
  isOnBreak: boolean;
}): { isRunning: boolean; isPaused: boolean } {
  const isRunning =
    snap.state !== 'Idle' &&
    snap.state !== 'Counting' &&
    snap.state !== 'OfflineStopped';
  const isPaused =
    snap.state === 'Paused' || snap.state === 'IdleSoftPaused' || snap.isOnBreak;
  return { isRunning, isPaused };
}

/**
 * The displayed clock is always "the last backend-confirmed elapsed seconds,
 * plus however much real time has passed since that confirmation" — never
 * "now minus the original absolute start time." The latter is what caused
 * the clock to silently include paused/idle time the instant ticking resumed
 * (confirmed live: pause 5 min, resume, display jumps forward by 5 min).
 * Resetting `baseline` on every real state change (see the component's
 * onStateChanged handler) is what keeps this correct across any number of
 * pause/resume or idle/resolve cycles, not just the first one.
 */
export function computeDisplayedElapsedSec(
  baseline: { sec: number; at: number },
  now: number,
): number {
  return baseline.sec + Math.max(0, Math.floor((now - baseline.at) / 1000));
}
