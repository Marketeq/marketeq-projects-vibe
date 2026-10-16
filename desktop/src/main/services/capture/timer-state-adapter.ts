// src/main/services/capture/timer-state-adapter.ts
//
// Translates the timer FSM's snapshot into the plain shape capture-supervisor.ts
// already understands, without capture-supervisor.ts (or this file) ever
// importing anything from services/timer/ — the input here is a minimal
// structural shape, not the real TimerSnapshot/TimerState types. This is the
// missing half of the bridge: capture-supervisor.ts's handleTimerState()
// switch already existed and was already correct, it just never received real
// data (see index.ts, where this is wired via timerService.attachEventBus()).

import type { TimerStatePayload } from './capture-supervisor';

export interface TimerStateInput {
  state: string;
  activeSessionId: string | null;
}

export function mapTimerStateToCapturePayload(
  input: TimerStateInput,
): TimerStatePayload {
  switch (input.state) {
    case 'Running':
      if (!input.activeSessionId) {
        // Shouldn't happen per FSM invariants (Running always has a session),
        // but a missing id would violate TimerStatePayload's 'Running' variant
        // — fail safe to Stopped rather than pass through an invalid payload.
        return { state: 'Stopped' };
      }
      return { state: 'Running', sessionId: input.activeSessionId };
    case 'IdleSoftPaused':
      return { state: 'SystemIdle' };
    case 'OnBreakPaid':
    case 'OnBreakUnpaid':
      return { state: 'OnBreak' };
    case 'Paused':
      return { state: 'Paused' };
    // 'Idle', 'Counting': no session exists yet, nothing to capture.
    // 'OfflineStopped': session is force-closed locally (doc 20 §6.3).
    // 'LockedDisputed': session is frozen pending dispute resolution.
    // None of these should ever be capturing.
    case 'Idle':
    case 'Counting':
    case 'OfflineStopped':
    case 'LockedDisputed':
    default:
      return { state: 'Stopped' };
  }
}
