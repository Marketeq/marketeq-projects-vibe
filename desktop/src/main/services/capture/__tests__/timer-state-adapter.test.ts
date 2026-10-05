// src/main/services/capture/__tests__/timer-state-adapter.test.ts

import { describe, it, expect } from 'vitest';
import { mapTimerStateToCapturePayload } from '../timer-state-adapter';

describe('mapTimerStateToCapturePayload', () => {
  it('maps Running (with a session id) to Running + sessionId', () => {
    expect(
      mapTimerStateToCapturePayload({ state: 'Running', activeSessionId: 'sess-1' }),
    ).toEqual({ state: 'Running', sessionId: 'sess-1' });
  });

  it('falls back to Stopped if Running has no session id (should not happen per FSM invariants, but must not throw)', () => {
    expect(
      mapTimerStateToCapturePayload({ state: 'Running', activeSessionId: null }),
    ).toEqual({ state: 'Stopped' });
  });

  it('maps IdleSoftPaused to SystemIdle', () => {
    expect(
      mapTimerStateToCapturePayload({ state: 'IdleSoftPaused', activeSessionId: 'sess-1' }),
    ).toEqual({ state: 'SystemIdle' });
  });

  it('maps OnBreakPaid to OnBreak', () => {
    expect(
      mapTimerStateToCapturePayload({ state: 'OnBreakPaid', activeSessionId: 'sess-1' }),
    ).toEqual({ state: 'OnBreak' });
  });

  it('maps OnBreakUnpaid to OnBreak', () => {
    expect(
      mapTimerStateToCapturePayload({ state: 'OnBreakUnpaid', activeSessionId: 'sess-1' }),
    ).toEqual({ state: 'OnBreak' });
  });

  it('maps Paused to Paused', () => {
    expect(
      mapTimerStateToCapturePayload({ state: 'Paused', activeSessionId: 'sess-1' }),
    ).toEqual({ state: 'Paused' });
  });

  it('maps Idle to Stopped', () => {
    expect(
      mapTimerStateToCapturePayload({ state: 'Idle', activeSessionId: null }),
    ).toEqual({ state: 'Stopped' });
  });

  it('maps Counting to Stopped', () => {
    expect(
      mapTimerStateToCapturePayload({ state: 'Counting', activeSessionId: null }),
    ).toEqual({ state: 'Stopped' });
  });

  it('maps OfflineStopped to Stopped', () => {
    expect(
      mapTimerStateToCapturePayload({ state: 'OfflineStopped', activeSessionId: null }),
    ).toEqual({ state: 'Stopped' });
  });

  it('maps LockedDisputed to Stopped', () => {
    expect(
      mapTimerStateToCapturePayload({ state: 'LockedDisputed', activeSessionId: 'sess-1' }),
    ).toEqual({ state: 'Stopped' });
  });

  it('falls back to Stopped for any unrecognized state, rather than throwing', () => {
    expect(
      mapTimerStateToCapturePayload({ state: 'SomeFutureState', activeSessionId: null }),
    ).toEqual({ state: 'Stopped' });
  });
});
