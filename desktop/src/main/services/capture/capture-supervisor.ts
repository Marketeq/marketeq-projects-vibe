// src/main/services/capture/capture-supervisor.ts
//
// Top-level coordinator for the Marketeq Time Tracker capture pipeline.
// Ties together ScreenshotService + ActivityMonitor + permission checks.
// We intentionally never import anything under `src/main/services/timer/` —
// timer state arrives as a plain call to handleTimerState() below, made by
// index.ts (the orchestrator, which already knows both sides) after
// translating the FSM's snapshot via timer-state-adapter.ts. This file only
// ever sees the minimal TimerStatePayload shape, never the real FSM types.
//
// A DB poll (below) is kept as a backstop for the Running/Stopped edge
// specifically, so capture still recovers correctly even if the event-driven
// call were ever missed for any reason — but it cannot see the
// Paused/OnBreak*/IdleSoftPaused sub-states on its own, since the session row
// stays open throughout all of them.

import { EventEmitter } from 'node:events';
import type { Logger } from 'pino';
import type { ScreenshotService } from './screenshot-service';
import type { ActivityMonitor } from './activity-monitor';
import type { AppUsageTracker } from './app-usage-tracker';
import type { CleanupJob } from './cleanup-job';
import type { PermissionsService } from '../permissions/permissions-service';
import type { PreferenceRepo } from '../../db/repos/preference.repo';
import type { SessionRepo } from '../../db/repos/session.repo';
import type { DbHandle } from '../../db/connection';
import type { CaptureHealth } from '../../../shared/ipc-contracts';
import { IPC } from '../../../shared/ipc-contracts';

interface ElectronIpcSurface {
  BrowserWindow: {
    getAllWindows: () => Array<{
      webContents: { send: (ch: string, payload: unknown) => void };
    }>;
  };
}

function loadElectron(): ElectronIpcSurface | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('electron') as ElectronIpcSurface;
  } catch {
    return null;
  }
}

interface Deps {
  logger: Logger;
  screenshotService: ScreenshotService;
  activityMonitor: ActivityMonitor;
  appUsageTracker?: AppUsageTracker;
  cleanupJob: CleanupJob;
  permissions: PermissionsService;
  preferenceRepo: PreferenceRepo;
  sessionRepo: SessionRepo;
  db: DbHandle;
  pollIntervalMs?: number;
  electron?: ElectronIpcSurface | null;
}

export type TimerStatePayload =
  | { state: 'Running'; sessionId: string }
  | { state: 'Paused' | 'Stopped' | 'OnBreak' | 'SystemIdle'; sessionId?: string };

export interface CaptureSupervisor {
  start: () => void;
  stop: () => void;
  getHealth: () => CaptureHealth;
  subscribe: (cb: (h: CaptureHealth) => void) => () => void;
  handleTimerState: (payload: TimerStatePayload) => void;
}

export function createCaptureSupervisor(deps: Deps): CaptureSupervisor {
  const log = deps.logger.child({ svc: 'capture-supervisor' });
  const electron = deps.electron ?? loadElectron();
  const bus = new EventEmitter();

  let health: CaptureHealth = {
    screenshotsRunning: false,
    activityRunning: false,
    permissionsOk: false,
    lastError: null,
    updatedAt: Date.now(),
  };

  function persistActiveSessionId(id: string | null): void {
    try {
      deps.preferenceRepo.set('dtt.activeSessionId', JSON.stringify(id));
    } catch (err) {
      log.warn({ err }, 'failed to persist active session id');
    }
  }

  function refreshHealth(): CaptureHealth {
    const perms = deps.permissions.getAllPermissions();
    const permissionsOk = perms.screenRecording === 'granted';
    health = {
      screenshotsRunning: deps.screenshotService.getStats().isCapturing,
      activityRunning: deps.activityMonitor.getStats().isRunning,
      permissionsOk,
      lastError: health.lastError,
      updatedAt: Date.now(),
    };
    bus.emit('health', health);
    if (electron) {
      for (const w of electron.BrowserWindow.getAllWindows()) {
        try {
          w.webContents.send(IPC.eventCaptureHealthChanged, health);
        } catch {
          /* ignore */
        }
      }
    }
    return health;
  }

  function startCapture(sessionId: string): void {
    persistActiveSessionId(sessionId);
    // Always attempt to start the screenshot loop. On macOS 15 (Sequoia),
    // getMediaAccessStatus('screen') may return 'denied' even when the app
    // has been granted permission (Apple's new one-time approval model).
    // The screenshot service itself handles empty sources gracefully.
    if (deps.permissions.isScreenRecordingAllowed()) {
      deps.screenshotService.start();
    } else {
      log.warn(
        'startCapture: screen recording permission reported as missing, attempting capture anyway (macOS 15 workaround)',
      );
      deps.screenshotService.start();
    }
    deps.activityMonitor.start();
    deps.appUsageTracker?.start();
    refreshHealth();
  }

  function pauseCapture(): void {
    deps.screenshotService.stop();
    deps.activityMonitor.stop();
    deps.appUsageTracker?.stop();
    refreshHealth();
  }

  function handleTimerState(payload: TimerStatePayload): void {
    log.info({ payload }, 'timer state changed');
    switch (payload.state) {
      case 'Running':
        // Keep the poll backstop's bookkeeping in sync, not just pollOnce()'s
        // own writes — otherwise its first tick after ANY session opens
        // sees stale state (still null/different), treats it as a fresh
        // Running edge, and stomps a legitimately-paused/idle/break state
        // right back to Running a few seconds later. Confirmed against the
        // real app: without this, SystemIdle correctly paused capture, then
        // the very next poll tick silently resumed it moments later, still
        // mid-idle-prompt.
        lastOpenSessionId = payload.sessionId;
        startCapture(payload.sessionId);
        break;
      case 'Paused':
      case 'OnBreak':
      case 'SystemIdle':
      case 'Stopped':
        pauseCapture();
        if (payload.state === 'Stopped') {
          lastOpenSessionId = null;
          persistActiveSessionId(null);
        }
        break;
    }
  }

  // --- DB-based timer state polling (backstop) --------------------------
  //
  // Backstop for the Running/Stopped edge only — see the file header for
  // the primary, event-driven path (index.ts calling handleTimerState()
  // directly). Cheap, zero-allocation SQL: poll the session table every
  // 5 seconds and derive a synthetic "Running" / "Stopped" edge from the
  // presence of an open session row. This alone can never see
  // Paused/OnBreak*/IdleSoftPaused, since the session row stays open
  // throughout all of them — it exists so capture still self-corrects to
  // the right Running/Stopped state even if the event-driven call were
  // ever missed.

  let pollHandle: NodeJS.Timeout | null = null;
  let lastOpenSessionId: string | null = null;
  const pollIntervalMs = deps.pollIntervalMs ?? 5000;

  function findOpenSessionId(): string | null {
    try {
      // Only an open session that belongs to THIS device counts as "the
      // timer is running" — a foreign device's row is never picked up. No
      // age bound here: the timer's own restart recovery (restoreFromDb)
      // already unconditionally closes every leftover open session before
      // this supervisor ever starts polling, so nothing stale can survive
      // to be found here regardless of how old it is. A contractor working
      // a normal day well past 8 hours is expected (doc 01 §"Daily cap") and
      // must keep being captured.
      const row = deps.db
        .prepare<[], { id: string }>(
          `SELECT id FROM session
             WHERE ended_at IS NULL
               AND device_id = (SELECT id FROM device_self LIMIT 1)
             ORDER BY started_at DESC LIMIT 1`,
        )
        .get();
      return row?.id ?? null;
    } catch (err) {
      log.debug({ err }, 'findOpenSessionId failed');
      return null;
    }
  }

  function pollOnce(): void {
    const openId = findOpenSessionId();
    if (openId && openId !== lastOpenSessionId) {
      lastOpenSessionId = openId;
      handleTimerState({ state: 'Running', sessionId: openId });
    } else if (!openId && lastOpenSessionId) {
      lastOpenSessionId = null;
      handleTimerState({ state: 'Stopped' });
    }
  }

  function start(): void {
    log.info('capture supervisor starting');

    // Daily retention sweep.
    deps.cleanupJob.start();

    // Kick off an immediate poll so we pick up any session left open by
    // a previous crash.
    pollOnce();

    pollHandle = setInterval(pollOnce, pollIntervalMs);
    if (pollHandle.unref) pollHandle.unref();

    refreshHealth();
  }

  function stop(): void {
    log.info('capture supervisor stopping');
    if (pollHandle) clearInterval(pollHandle);
    pollHandle = null;
    deps.cleanupJob.stop();
    pauseCapture();
  }

  return {
    start,
    stop,
    getHealth: refreshHealth,
    subscribe(cb) {
      bus.on('health', cb);
      return () => bus.off('health', cb);
    },
    handleTimerState,
  };
}
