// src/main/services/capture/__tests__/capture-supervisor.test.ts
//
// Covers handleTimerState() — the switch that pauses/resumes capture on
// real timer state — plus its interaction with the existing DB-poll
// backstop, now that both can fire for the same effective state.

import { describe, it, expect, vi } from 'vitest';
import { createCaptureSupervisor } from '../capture-supervisor';

const logger = { child: () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() }) } as any;

function fakeScreenshotService() {
  return {
    start: vi.fn(),
    stop: vi.fn(),
    captureOnce: vi.fn(async () => []),
    getStats: vi.fn(() => ({ isCapturing: false }) as any),
    deleteById: vi.fn(),
    setPrivacyMode: vi.fn(),
    subscribe: vi.fn(() => () => {}),
  };
}

function fakeActivityMonitor() {
  return {
    start: vi.fn(),
    stop: vi.fn(),
    getStats: vi.fn(() => ({ isRunning: false }) as any),
    getRecent: vi.fn(() => []),
    subscribe: vi.fn(() => () => {}),
  };
}

function fakeDeps(overrides: { openSessionId?: () => string | null } = {}) {
  const screenshotService = fakeScreenshotService();
  const activityMonitor = fakeActivityMonitor();
  const getOpenSessionId = overrides.openSessionId ?? (() => null);
  const db = {
    prepare: () => ({
      get: () => {
        const id = getOpenSessionId();
        return id ? { id } : undefined;
      },
    }),
  } as any;
  const cleanupJob = { start: vi.fn(), stop: vi.fn(), runOnce: vi.fn(() => ({ deletedRows: 0, deletedFiles: 0 })) };
  const permissions = {
    getAllPermissions: vi.fn(() => ({ screenRecording: 'granted' }) as any),
    checkPermission: vi.fn(),
    requestPermission: vi.fn(),
    requestLongForm: vi.fn(),
    isScreenRecordingAllowed: vi.fn(() => true),
    subscribe: vi.fn(() => () => {}),
    refresh: vi.fn(),
  };
  const preferenceRepo = { set: vi.fn(), get: vi.fn() } as any;
  const sessionRepo = {} as any;

  return {
    deps: {
      logger,
      screenshotService,
      activityMonitor,
      cleanupJob,
      permissions,
      preferenceRepo,
      sessionRepo,
      db,
      pollIntervalMs: 5000,
      // Explicit fake, not null/undefined — `deps.electron ?? loadElectron()`
      // would otherwise fall through to a real `require('electron')`, which
      // resolves to something in a Vitest/Node context but not a real
      // BrowserWindow-shaped object.
      electron: { BrowserWindow: { getAllWindows: () => [] } },
    } as any,
    screenshotService,
    activityMonitor,
    preferenceRepo,
  };
}

describe('capture-supervisor handleTimerState', () => {
  it('Running starts both screenshot capture and activity monitoring', () => {
    const { deps, screenshotService, activityMonitor } = fakeDeps();
    const sup = createCaptureSupervisor(deps);
    sup.handleTimerState({ state: 'Running', sessionId: 'sess-1' });
    expect(screenshotService.start).toHaveBeenCalledTimes(1);
    expect(activityMonitor.start).toHaveBeenCalledTimes(1);
  });

  it('SystemIdle (the idle-pause state) stops both screenshot capture and activity monitoring', () => {
    const { deps, screenshotService, activityMonitor } = fakeDeps();
    const sup = createCaptureSupervisor(deps);
    sup.handleTimerState({ state: 'Running', sessionId: 'sess-1' });
    sup.handleTimerState({ state: 'SystemIdle' });
    expect(screenshotService.stop).toHaveBeenCalledTimes(1);
    expect(activityMonitor.stop).toHaveBeenCalledTimes(1);
  });

  it('OnBreak stops both screenshot capture and activity monitoring', () => {
    const { deps, screenshotService, activityMonitor } = fakeDeps();
    const sup = createCaptureSupervisor(deps);
    sup.handleTimerState({ state: 'Running', sessionId: 'sess-1' });
    sup.handleTimerState({ state: 'OnBreak' });
    expect(screenshotService.stop).toHaveBeenCalledTimes(1);
    expect(activityMonitor.stop).toHaveBeenCalledTimes(1);
  });

  it('Paused stops both screenshot capture and activity monitoring', () => {
    const { deps, screenshotService, activityMonitor } = fakeDeps();
    const sup = createCaptureSupervisor(deps);
    sup.handleTimerState({ state: 'Running', sessionId: 'sess-1' });
    sup.handleTimerState({ state: 'Paused' });
    expect(screenshotService.stop).toHaveBeenCalledTimes(1);
    expect(activityMonitor.stop).toHaveBeenCalledTimes(1);
  });

  it('Stopped stops capture and clears the persisted active session id; the others do not', () => {
    const { deps, preferenceRepo } = fakeDeps();
    const sup = createCaptureSupervisor(deps);
    sup.handleTimerState({ state: 'Running', sessionId: 'sess-1' });
    preferenceRepo.set.mockClear();

    sup.handleTimerState({ state: 'SystemIdle' });
    expect(preferenceRepo.set).not.toHaveBeenCalledWith('dtt.activeSessionId', JSON.stringify(null));

    sup.handleTimerState({ state: 'Stopped' });
    expect(preferenceRepo.set).toHaveBeenCalledWith('dtt.activeSessionId', JSON.stringify(null));
  });

  it('redundant same-state calls (e.g. the event path and the DB-poll backstop both firing) do not error or double-capture', () => {
    const { deps, screenshotService, activityMonitor } = fakeDeps();
    const sup = createCaptureSupervisor(deps);
    expect(() => {
      sup.handleTimerState({ state: 'Running', sessionId: 'sess-1' });
      sup.handleTimerState({ state: 'Running', sessionId: 'sess-1' }); // e.g. poll edge firing for the same session
    }).not.toThrow();
    // Both calls reach the underlying service; the services themselves
    // (screenshot-service.ts / activity-monitor.ts) are what actually
    // guard against a real duplicate timer via their own `if (handle) return`.
    expect(screenshotService.start).toHaveBeenCalledTimes(2);
    expect(activityMonitor.start).toHaveBeenCalledTimes(2);

    expect(() => {
      sup.handleTimerState({ state: 'SystemIdle' });
      sup.handleTimerState({ state: 'SystemIdle' });
    }).not.toThrow();
    expect(screenshotService.stop).toHaveBeenCalledTimes(2);
    expect(activityMonitor.stop).toHaveBeenCalledTimes(2);
  });

  it('flapping Running -> SystemIdle -> Running -> SystemIdle stops/starts capture cleanly each time', () => {
    const { deps, screenshotService, activityMonitor } = fakeDeps();
    const sup = createCaptureSupervisor(deps);
    sup.handleTimerState({ state: 'Running', sessionId: 'sess-1' });
    sup.handleTimerState({ state: 'SystemIdle' });
    sup.handleTimerState({ state: 'Running', sessionId: 'sess-1' });
    sup.handleTimerState({ state: 'SystemIdle' });

    expect(screenshotService.start).toHaveBeenCalledTimes(2);
    expect(screenshotService.stop).toHaveBeenCalledTimes(2);
    expect(activityMonitor.start).toHaveBeenCalledTimes(2);
    expect(activityMonitor.stop).toHaveBeenCalledTimes(2);
  });
});

describe('capture-supervisor DB-poll backstop (unchanged by the event-bridge fix)', () => {
  it('still independently detects a session opening and closing across poll ticks', () => {
    vi.useFakeTimers();
    try {
      let openId: string | null = null;
      const { deps, screenshotService, activityMonitor } = fakeDeps({ openSessionId: () => openId });
      const sup = createCaptureSupervisor(deps);
      sup.start(); // immediate poll on start(); nothing open yet
      expect(screenshotService.start).not.toHaveBeenCalled();

      // Session opens; the poll (backstop, not the event bridge) should
      // pick up the edge on its next tick.
      openId = 'sess-poll-1';
      vi.advanceTimersByTime(5000);
      expect(screenshotService.start).toHaveBeenCalledTimes(1);
      expect(activityMonitor.start).toHaveBeenCalledTimes(1);

      // A same-session tick with nothing changed must not re-fire (edge-only).
      vi.advanceTimersByTime(5000);
      expect(screenshotService.start).toHaveBeenCalledTimes(1);

      // Session closes; the poll should pick up that edge too.
      openId = null;
      vi.advanceTimersByTime(5000);
      expect(screenshotService.stop).toHaveBeenCalledTimes(1);
      expect(activityMonitor.stop).toHaveBeenCalledTimes(1);

      sup.stop();
    } finally {
      vi.useRealTimers();
    }
  });

  it('a poll tick landing right after an event-driven pause does not stomp it back to Running (regression: confirmed against the real app)', () => {
    vi.useFakeTimers();
    try {
      // Matches the exact real-world ordering that exposed this bug: the
      // session doesn't exist in the DB yet when start() runs its first
      // poll (so that poll sees nothing), the event bridge reports
      // Running then almost immediately SystemIdle — faster than poll's
      // next scheduled tick — and only THEN does poll get its first real
      // chance to observe the (still open — idle never closes it) session.
      const sessionId = 'sess-regress-1';
      let sessionOpen = false;
      const { deps, screenshotService, activityMonitor } = fakeDeps({ openSessionId: () => (sessionOpen ? sessionId : null) });
      const sup = createCaptureSupervisor(deps);
      sup.start(); // immediate poll — nothing open yet
      expect(screenshotService.start).not.toHaveBeenCalled();

      sessionOpen = true; // the session now exists, same as the real FSM having opened it
      sup.handleTimerState({ state: 'Running', sessionId });
      sup.handleTimerState({ state: 'SystemIdle' });
      expect(screenshotService.start).toHaveBeenCalledTimes(1);
      expect(screenshotService.stop).toHaveBeenCalledTimes(1);
      expect(activityMonitor.stop).toHaveBeenCalledTimes(1);

      // The poll's own independent timer ticks next, with the session
      // still open (idle never closes it). Before the fix, this treated
      // the still-open session as a fresh edge and silently resumed
      // capture mid-idle-prompt.
      vi.advanceTimersByTime(5000);

      expect(screenshotService.start).toHaveBeenCalledTimes(1); // only the original Running call — not re-started
      expect(screenshotService.stop).toHaveBeenCalledTimes(1); // still just the one stop, state stays paused
      expect(activityMonitor.start).toHaveBeenCalledTimes(1);

      sup.stop();
    } finally {
      vi.useRealTimers();
    }
  });
});
