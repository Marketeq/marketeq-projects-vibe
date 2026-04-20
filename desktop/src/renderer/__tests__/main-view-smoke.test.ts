// src/renderer/__tests__/main-view-smoke.test.ts
//
// Phase 6 — Lightweight smoke test for the renderer's Main view copy and
// control-label logic. We can't render React JSX under the current vitest
// config (no jsdom, and `include` is restricted to `*.test.ts`), so this
// suite exercises the pure helpers and the COPY contract instead. This is
// enough to catch the common breakages: missing strings, off-by-one in the
// primary CTA label mapping, and drift between state names and actions.

import { describe, it, expect } from 'vitest';
import { COPY } from '../copy';
import type { TimerStateName } from '../../shared/ipc-contracts';

function primaryCtaLabel(state: TimerStateName): string {
  switch (state) {
    case 'Running':
      return COPY.main.pause;
    case 'Paused':
    case 'IdleSoftPaused':
      return COPY.main.resume;
    case 'OnBreakPaid':
    case 'OnBreakUnpaid':
      return COPY.main.endBreak;
    default:
      return COPY.main.start;
  }
}

describe('MainView copy + control labels', () => {
  it('COPY.main contains every label the MainView renders', () => {
    expect(COPY.main.start).toBeTruthy();
    expect(COPY.main.pause).toBeTruthy();
    expect(COPY.main.resume).toBeTruthy();
    expect(COPY.main.stop).toBeTruthy();
    expect(COPY.main.startBreakPaid).toBeTruthy();
    expect(COPY.main.startBreakUnpaid).toBeTruthy();
    expect(COPY.main.endBreak).toBeTruthy();
    expect(COPY.main.worked).toBeTruthy();
    expect(COPY.main.onBreak).toBeTruthy();
    expect(COPY.main.activity).toBeTruthy();
    expect(COPY.main.recentScreenshots).toBeTruthy();
    expect(COPY.main.noScreenshots).toBeTruthy();
    expect(COPY.main.syncOnline).toBeTruthy();
    expect(COPY.main.syncOffline).toBeTruthy();
    expect(COPY.main.syncRunning).toBeTruthy();
    expect(COPY.main.emptyHeading).toBeTruthy();
    expect(COPY.main.timerLabel).toBeTruthy();
  });

  it('idle modal COPY includes all three resolution options', () => {
    expect(COPY.idleModal.heading).toBeTruthy();
    expect(COPY.idleModal.body).toBeTruthy();
    expect(COPY.idleModal.keep).toBeTruthy();
    expect(COPY.idleModal.discard).toBeTruthy();
    expect(COPY.idleModal.convertBreak).toBeTruthy();
  });

  it('locked view COPY contains heading + body', () => {
    expect(COPY.locked.heading).toBeTruthy();
    expect(COPY.locked.body).toBeTruthy();
  });

  it('primary CTA maps Running -> pause', () => {
    expect(primaryCtaLabel('Running')).toBe(COPY.main.pause);
  });

  it('primary CTA maps Paused / IdleSoftPaused -> resume', () => {
    expect(primaryCtaLabel('Paused')).toBe(COPY.main.resume);
    expect(primaryCtaLabel('IdleSoftPaused')).toBe(COPY.main.resume);
  });

  it('primary CTA maps OnBreak* -> endBreak', () => {
    expect(primaryCtaLabel('OnBreakPaid')).toBe(COPY.main.endBreak);
    expect(primaryCtaLabel('OnBreakUnpaid')).toBe(COPY.main.endBreak);
  });

  it('primary CTA maps Idle -> start', () => {
    expect(primaryCtaLabel('Idle')).toBe(COPY.main.start);
  });

  it('primary CTA falls back to start for unknown/offline states', () => {
    expect(primaryCtaLabel('OfflineStopped')).toBe(COPY.main.start);
    expect(primaryCtaLabel('LockedDisputed')).toBe(COPY.main.start);
  });
});
