// src/main/index.ts
// Electron main process entry point for the Marketeq Time Tracker.
// Responsibilities (Phase 1):
//   1. Enforce single-instance lock.
//   2. Initialize logging.
//   3. Initialize the local SQLite database and run migrations.
//   4. Register the typed IPC handlers.
//   5. Create the main BrowserWindow.

import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { ensureSingleInstance } from './lifecycle/single-instance';
import { logger } from './logger';
import { initDatabase, closeDatabase } from './db/connection';
import { runMigrations } from './db/migrate';
import { registerIpcHandlers } from './ipc';
import { registerCrashRecoveryIpc } from './ipc/crash-recovery';
import { createCrashRecovery, type ClosedSession } from './services/timer/crash-recovery';
import { createRepos } from './db/repos';
import {
  createTimerService,
  TIMER_CHANNELS,
  type TimerBusEvent,
  type TimerService,
} from './services/timer/timer-service';
import { createPermissionsService } from './services/permissions/permissions-service';
import { createScreenshotService } from './services/capture/screenshot-service';
import { createActivityMonitor } from './services/capture/activity-monitor';
import { startInputActivity, stopInputActivity } from './services/capture/input-activity';
import { createCleanupJob } from './services/capture/cleanup-job';
import { createAppUsageTracker, type AppUsageTracker } from './services/capture/app-usage-tracker';
import { createActivityWatchTracker } from './services/capture/activitywatch-tracker';
import { mapTimerStateToCapturePayload } from './services/capture/timer-state-adapter';
import { createCaptureSupervisor } from './services/capture/capture-supervisor';
import { registerCaptureIpcHandlers } from './services/capture/register-ipc';
import { createApiClient } from './services/sync/api-client';
import {
  createOutbox,
  createSqliteOutboxStore,
} from './services/sync/outbox';
import { createNetworkMonitor } from './services/sync/network-monitor';
import { createSyncWorker } from './services/sync/sync-worker';
import { createRealtimeClient } from './services/sync/realtime-client';
import { createEventBridge } from './services/sync/event-bridge';
import { registerSyncIpcHandlers } from './services/sync/register-ipc';
import { createAuthService } from './services/auth/auth-service';
import { createFetchAuthHttpPort } from './services/auth/http-port';
import { registerAuthIpc } from './services/auth/register-ipc';
import { collectBroadcastTargets } from './ipc/timer';
import { ipcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import { createOnboardingService } from './services/onboarding/onboarding-service';
import { registerOnboardingIpc } from './services/onboarding/register-ipc';
import {
  createUpdaterService,
  type UpdaterPrefsStore,
  type AutoUpdaterPort,
  type UpdaterService,
} from './services/updater/updater-service';
import { registerUpdaterIpc } from './services/updater/register-ipc';
import type { ReleaseChannel } from './services/updater/channels';
import { createErrorHandler } from './services/error-handler';
import { createPowerMonitorService } from './services/power-monitor';
import { registerContractsIpc } from './services/contracts/register-ipc';
import { registerStatsIpc } from './services/stats/register-ipc';
import {
  createWindowManager,
  resolveRendererPaths,
  type WindowManager,
} from './services/window/window-manager';
import { createTrayService } from './services/tray/tray-service';
import { createNotificationService } from './services/notifications/notification-service';

const isDev = !app.isPackaged;
let windowManager: WindowManager | null = null;

// The Marketeq logo ships next to the app (extraResources) when packaged and
// lives in desktop/resources/ in dev. Windows prefers the multi-size .ico.
const resourcesRoot = app.isPackaged
  ? process.resourcesPath
  : path.join(__dirname, '..', '..', '..', 'resources');
const appIconPath = path.join(
  resourcesRoot,
  process.platform === 'win32' ? 'icon.ico' : 'icon.png',
);

// Must match electron-builder's appId so the taskbar groups the window under
// the installed shortcut and shows its icon instead of a generic one.
if (process.platform === 'win32') {
  app.setAppUserModelId('com.marketeq.time-tracker');
}

async function createMainWindow(): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    width: 340,
    height: 580,
    minWidth: 320,
    minHeight: 480,
    show: true,
    title: 'Marketeq',
    icon: appIconPath,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 14 },
    webPreferences: {
      // `__dirname` at runtime is `dist/main/main/`, so we need three `..`
      // jumps to reach `dist/preload/preload/index.js`:
      //   dist/main/main -> dist/main -> dist -> dist/preload/preload/index.js
      preload: path.join(__dirname, '..', '..', 'preload', 'preload', 'index.js'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
    },
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const rendererIndex = path.join(
      __dirname,
      '..',
      '..',
      'renderer',
      'index.html',
    );
    await win.loadFile(rendererIndex);
  }

  win.once('ready-to-show', () => {
    win.show();
    win.focus();
    win.moveTop();
    app.dock?.bounce?.('informational');
  });
  return win;
}

let detachErrorHandler: (() => void) | null = null;
let detachPowerMonitor: (() => void) | null = null;

async function bootstrap(): Promise<void> {
  ensureSingleInstance();
  logger.info({ version: app.getVersion() }, 'marketeq-time-tracker:boot');

  // --- Phase 8: Global error handler ----------------------------------------
  const errorHandler = createErrorHandler({
    logger,
    getAllWindows: () => BrowserWindow.getAllWindows(),
    onFatalShutdown: () => {
      windowManager?.prepareToQuit();
      app.exit(1);
    },
  });
  detachErrorHandler = errorHandler.install();

  try {
    const db = initDatabase();
    runMigrations(db);
    logger.info('db ready, migrations applied');
  } catch (err) {
    console.error('FATAL: failed to initialize local database', err);
    logger.error({ err }, 'fatal: failed to initialize local database');
    app.exit(1);
    return;
  }

  // Forward-declare authService so the timer's lazy getUserId callback
  // can reference it (assigned in Phase 5 below).
  let authService: ReturnType<typeof createAuthService> | null = null;

  // --- Phase 2: Timer service (9-state FSM) ----------------------------
  let timerService: TimerService | null = null;
  let detachIpcHandlers: (() => void) | null = null;
  // Sessions the crash-recovery sweep closed at startup — each gets a backend
  // close enqueued once the outbox exists (Phase 4).
  let recoveredSessions: ReturnType<TimerService['restoreFromDb']>['closed'] =
    [];
  // Assigned in Phase 4 once the outbox exists; used for crash-swept sessions
  // and by the crash recovery prompt's Discard.
  let enqueueSessionClose: ((s: ClosedSession) => void) | null = null;
  let detachCrashRecoveryIpc: (() => void) | null = null;
  try {
    const db = initDatabase();
    const repos = createRepos(db);

    // Ensure device_self has a row — required for session creation.
    if (!repos.device.findSelf()) {
      const deviceId = `dev_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
      repos.device.insert({
        id: deviceId,
        installation_uuid: randomUUID(),
        os_name: process.platform === 'darwin' ? 'mac' : 'win',
        os_version: os.release(),
        app_version: app.getVersion(),
        arch: process.arch === 'arm64' ? 'arm64' : 'x64',
        created_at: Date.now(),
      });
      logger.info({ deviceId }, 'seeded device_self row');
    }

    timerService = createTimerService({
      db,
      repos,
      logger,
      // Lazy callbacks — auth is wired after timer, so these close
      // over the authService variable that gets assigned later.
      getUserId: () => authService?.getCurrentUser()?.id ?? repos.user.findFirst()?.id ?? null,
      getDeviceId: () => repos.device.findSelf()?.id ?? null,
    });
    // Close any session left open by a previous crash / force-kill. Never
    // silently resumes — the FSM stays Idle. Rows are kept (only ended_at set).
    // The swept session is then held for the Recover / Discard prompt
    // (DTT-US-131) instead of being reported closed to the backend.
    const crashRecovery = createCrashRecovery({
      repos,
      timer: timerService,
      getUserId: () => authService?.getCurrentUser()?.id ?? null,
      enqueueClose: () => enqueueSessionClose,
      logger,
    });
    recoveredSessions = crashRecovery.holdSweptSessions(timerService.restoreFromDb().closed);
    detachCrashRecoveryIpc = registerCrashRecoveryIpc(crashRecovery);
    detachIpcHandlers = registerIpcHandlers({ timer: timerService });
    logger.info('phase 2 timer service wired');
  } catch (err) {
    logger.error({ err }, 'failed to initialize timer service');
    detachIpcHandlers = registerIpcHandlers();
  }

  // --- Phase 8: Power monitor (suspend/resume) ---------------------------
  try {
    const powerMonitor = createPowerMonitorService({
      logger,
      onSuspend: () => {
        if (timerService && timerService.getCurrentState() === 'Running') {
          logger.info('power suspend — pausing timer');
          void timerService.pauseTimer().catch((err) =>
            logger.warn({ err }, 'failed to pause timer on suspend'),
          );
        }
      },
      onResume: (sleepDurationSec) => {
        logger.info({ sleepDurationSec }, 'power resume detected');
        // Don't auto-resume — user must explicitly resume (doc 05 SLEEP.01).
      },
      onClockSkew: (skewSec) => {
        logger.warn({ skewSec }, 'clock skew detected on resume');
      },
    });
    detachPowerMonitor = powerMonitor.install();
    logger.info('phase 8 power monitor wired');
  } catch (err) {
    logger.error({ err }, 'failed to initialize power monitor');
  }

  // --- Phase 5: auth + session management ------------------------------
  let detachAuthIpc: (() => void) | null = null;
  try {
    const db = initDatabase();
    const repos = createRepos(db);
    const httpPort = createFetchAuthHttpPort({ logger });
    authService = createAuthService({
      logger,
      repos,
      http: httpPort,
      timer: timerService
        ? {
            getCurrentState: () => timerService!.getCurrentState(),
            stopTimer: (reason) =>
              timerService!.stopTimer(
                (reason as
                  | 'forced_signout'
                  | 'user_stop'
                  | 'offline_stop'
                  | 'idle_discard'
                  | 'take_over'
                  | 'disputed'
                  | 'crash_recover'
                  | undefined) ?? 'forced_signout',
              ),
            dispatch: (event) =>
              timerService!.dispatch(
                event as { type: 'FORCED_SIGN_OUT' },
              ),
          }
        : undefined,
    });
    detachAuthIpc = registerAuthIpc({
      logger,
      ipcMain,
      auth: authService,
      getBroadcastTargets: () => collectBroadcastTargets(),
    });
    // Attempt to resume a persisted session. If no session is found the
    // service emits `auth:needs-login` — the renderer picks that up.
    const sessionResumed = authService.tryResumeSession().catch((err) => {
      logger.warn({ err }, 'auth: tryResumeSession failed');
    });

    // BTB-325: tell the web app this launch reached us, so its Log Time
    // button stops waiting and doesn't offer the installer. Wired here, right
    // after the stored session is restored, rather than after the sync
    // stack, so a cold start acknowledges as early as possible.
    const auth = authService;
    const launchApiBase = `${(process.env.DTT_API_BASE_URL ?? 'http://localhost:4000').replace(/\/+$/, '')}/time-tracking/desktop-launch`;
    const launchAckUrl = `${launchApiBase}/ack`;
    acknowledgeLaunch = (launchId) => {
      void (async () => {
        await sessionResumed;
        const token = auth.isAuthenticated() ? auth.getAccessToken() : null;
        if (!token) {
          logger.info('deep-link launch not acknowledged: not signed in');
          return;
        }
        const resp = await fetch(launchAckUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ launchId }),
        });
        if (!resp.ok) {
          logger.warn({ status: resp.status }, 'deep-link launch ack rejected');
        }
      })().catch((err) => logger.warn({ err }, 'deep-link launch ack failed'));
    };
    if (pendingLaunchId) {
      acknowledgeLaunch(pendingLaunchId);
      pendingLaunchId = null;
    }

    // BTB-325: record that this user has the tracker installed, so the web
    // Log Time button offers the installer immediately only to users who
    // don't — and never to users who do while Chrome's "Open Marketeq?"
    // prompt is still up. Re-sent on each new token (sign-in, refresh); the
    // backend upserts by installation id.
    auth.onTokenChange((token) => {
      const self = repos.device.findSelf();
      if (!token || !self) return;
      void fetch(`${launchApiBase}/installed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: self.id,
          installationUuid: self.installation_uuid,
          osName: self.os_name,
          osVersion: self.os_version,
          appVersion: app.getVersion(),
          arch: self.arch,
        }),
      })
        .then((resp) => {
          if (!resp.ok) {
            logger.warn({ status: resp.status }, 'install registration rejected');
          }
        })
        .catch((err) => logger.warn({ err }, 'install registration failed'));
    });
    logger.info('phase 5 auth service wired');
  } catch (err) {
    logger.error({ err }, 'failed to initialize auth service');
  }

  // --- Contracts IPC (fetches from backend API, not local DB) -----------
  let detachContractsIpc: (() => void) | null = null;
  try {
    const db = initDatabase();
    const repos = createRepos(db);
    const apiBaseUrl =
      process.env.DTT_API_BASE_URL ?? 'http://localhost:4000';
    detachContractsIpc = registerContractsIpc({
      logger,
      getAccessToken: () => authService?.getAccessToken() ?? null,
      getUserId: () => authService?.getCurrentUser()?.id ?? null,
      apiBaseUrl,
      contractRepo: repos.contract,
      taskRepo: repos.task,
      onUnauthorized: () => authService?.handleUnauthorized() ?? Promise.resolve(false),
    });
    logger.info('contracts IPC wired');
  } catch (err) {
    logger.error({ err }, 'failed to initialize contracts IPC');
  }

  // --- Today stats IPC (local SQLite aggregate, no network) -------------
  let detachStatsIpc: (() => void) | null = null;
  try {
    if (!timerService) throw new Error('timer service not initialized');
    const db = initDatabase();
    const repos = createRepos(db);
    detachStatsIpc = registerStatsIpc({
      logger,
      sessionRepo: repos.session,
      contractRepo: repos.contract,
      timer: timerService,
      getUserId: () => authService?.getCurrentUser()?.id ?? repos.user.findFirst()?.id ?? null,
    });
    logger.info('today stats IPC wired');
  } catch (err) {
    logger.error({ err }, 'failed to initialize today stats IPC');
  }

  // --- Phase 6: onboarding wizard --------------------------------------
  let detachOnboardingIpc: (() => void) | null = null;
  try {
    const db = initDatabase();
    const repos = createRepos(db);
    const onboardingService = createOnboardingService({
      db,
      logger,
    });
    detachOnboardingIpc = registerOnboardingIpc({
      ipcMain,
      logger,
      service: onboardingService,
      getBroadcastTargets: () => collectBroadcastTargets(),
    });
    logger.info('phase 6 onboarding service wired');
  } catch (err) {
    logger.error({ err }, 'failed to initialize onboarding service');
  }

  // --- Phase 3: capture pipeline ---------------------------------------
  let stopCaptureIpc: (() => void) | null = null;
  let captureSupervisor: ReturnType<typeof createCaptureSupervisor> | null =
    null;
  let screenshotService: ReturnType<typeof createScreenshotService> | null = null;
  let activityMonitor: ReturnType<typeof createActivityMonitor> | null = null;
  let detachCaptureTimerBridge: (() => void) | null = null;
  try {
    const db = initDatabase();
    const repos = createRepos(db);
    const permissions = createPermissionsService({
      logger,
      permissionGrantRepo: repos.permissionGrant,
    });
    // Real event-driven tracking via a locally-run ActivityWatch, with an
    // automatic fallback to 15s polling if the bundled binaries are
    // missing, blocked, or fail to start on this machine — app tracking
    // never drops to zero, it just degrades to the previous behavior.
    //
    // The polling tracker only ever runs when ActivityWatch has genuinely
    // failed — its own startup check came back negative, or one of its two
    // child processes exited mid-session — never as a standing "just in
    // case" companion. Each polling sample shells out to PowerShell/
    // osascript; running that on a timer for the length of every session
    // regardless of whether it's needed was wasted work for the common
    // case where ActivityWatch is working fine.
    const pollingTracker = createAppUsageTracker({
      logger,
      options: { pollIntervalMs: 15_000 },
    });
    let fallbackActive = false;
    const awTracker = createActivityWatchTracker({
      logger,
      options: { dbPath: path.join(app.getPath('userData'), 'dtt', 'activitywatch') },
      onAvailabilityChange: (available) => {
        if (!available && !fallbackActive) {
          fallbackActive = true;
          pollingTracker.start();
          logger.info('activitywatch unavailable — starting polling tracker fallback');
        }
      },
    });
    const appUsageTracker: AppUsageTracker = {
      start: () => {
        fallbackActive = false;
        awTracker.start();
      },
      stop: () => {
        pollingTracker.stop();
        awTracker.stop();
        fallbackActive = false;
      },
      drain: () => (awTracker.isAvailable() ? awTracker.drain() : pollingTracker.drain()),
    };
    screenshotService = createScreenshotService({
      logger,
      screenshotRepo: repos.screenshot,
      sessionRepo: repos.session,
      preferenceRepo: repos.preference,
      permissions,
      appUsageTracker,
    });
    activityMonitor = createActivityMonitor({
      logger,
      activityRepo: repos.activity,
      preferenceRepo: repos.preference,
    });
    const cleanupJob = createCleanupJob({
      logger,
      screenshotRepo: repos.screenshot,
      preferenceRepo: repos.preference,
    });
    captureSupervisor = createCaptureSupervisor({
      logger,
      screenshotService,
      activityMonitor,
      appUsageTracker,
      cleanupJob,
      permissions,
      preferenceRepo: repos.preference,
      sessionRepo: repos.session,
      db,
    });
    stopCaptureIpc = registerCaptureIpcHandlers({
      logger,
      permissions,
      screenshotService,
      activityMonitor,
      captureSupervisor,
    });
    captureSupervisor.start();

    // Bridge real timer state into capture — this is what actually pauses
    // screenshots/activity during idle, pause, and breaks. Its own
    // subscription (not the Phase 6 one below, which is for
    // tray/notifications) so it's live from the moment capture starts, not
    // whenever Phase 6 happens to run.
    if (timerService && captureSupervisor) {
      const cs = captureSupervisor;
      detachCaptureTimerBridge = timerService.attachEventBus((evt: TimerBusEvent) => {
        if (evt.channel === TIMER_CHANNELS.stateChanged) {
          try {
            cs.handleTimerState(
              mapTimerStateToCapturePayload({
                state: evt.payload.state,
                activeSessionId: evt.payload.activeSessionId,
              }),
            );
          } catch (err) {
            logger.warn({ err }, 'timer bus → capture bridge failed');
          }
        }
      });
    }

    // Separate keyboard/mouse activity measurement — feeds real percentages
    // into each screenshot upload (see event-bridge.ts). Non-fatal if the
    // native input hook is unavailable.
    startInputActivity(logger);
    logger.info('phase 3 capture pipeline wired');
  } catch (err) {
    logger.error({ err }, 'failed to initialize capture pipeline');
  }

  // --- Phase 4: sync queue + offline protocol --------------------------
  let stopSync: (() => Promise<void>) | null = null;
  // Shared with phase 6 so the tray and notifications can follow sync state.
  let networkMonitor: ReturnType<typeof createNetworkMonitor> | null = null;
  let syncWorker: ReturnType<typeof createSyncWorker> | null = null;
  let detachSyncIpc: (() => void) | null = null;
  let detachEventBridge: (() => void) | null = null;
  let realtimeClient: ReturnType<typeof createRealtimeClient> | null = null;
  try {
    const db = initDatabase();
    const repos = createRepos(db);
    const apiBaseUrl =
      process.env.DTT_API_BASE_URL ?? 'http://localhost:4000';
    const api = createApiClient({
      baseUrl: apiBaseUrl,
      logger,
      // doc 15 §7: the HttpClient itself is responsible for guaranteeing
      // "no stale tokens are possible" — on a 401 it refreshes and
      // transparently retries the same request, so no caller (including
      // the doc 16 sync queue) ever needs to know a token expired.
      onUnauthorized: () => authService?.handleUnauthorized() ?? Promise.resolve(false),
    });
    const outbox = createOutbox({
      store: createSqliteOutboxStore(db),
      logger,
    });
    // Wire the auth token into the API client so sync requests are authenticated
    if (authService) {
      authService.setApiClient({ setAuthToken: (t) => api.setAuthToken(t) });
    }
    const network = createNetworkMonitor({ api, logger });
    const worker = createSyncWorker({
      api,
      outbox,
      network,
      logger,
    });
    realtimeClient = createRealtimeClient({ api, logger });
    network.start();
    worker.start();
    networkMonitor = network;
    syncWorker = worker;


    // Mirror the web "Screen Capture Settings" choice into local preferences,
    // where the screenshot service reads it at each capture.
    const syncCapturePreference = () => {
      if (!authService?.getCurrentUser()) return;
      api
        .getTimePreferences()
        .then((prefs) => {
          if (prefs.captureMode) {
            repos.preference.set('dtt.captureMode', JSON.stringify(prefs.captureMode));
          }
        })
        .catch((err) => logger.debug({ err }, 'capture preference sync failed'));
    };
    syncCapturePreference();
    const capturePrefTimer = setInterval(syncCapturePreference, 5 * 60 * 1000);
    app.on('before-quit', () => clearInterval(capturePrefTimer));
    detachSyncIpc = registerSyncIpcHandlers({
      logger,
      worker,
      network,
    });

    if (timerService) {
      detachEventBridge = createEventBridge({
        outbox,
        timer: timerService,
        screenshotService: screenshotService ?? undefined,
        activityMonitor: activityMonitor ?? undefined,
        getDeviceId: () => repos.device.findSelf()?.id ?? null,
        getUserId: () => authService?.getCurrentUser()?.id ?? null,
        getSessionById: (id) => repos.session.findById(id),
        listTimeEntriesForSession: (sessionId) => repos.timeEntry.listForSession(sessionId),
        logger,
      }).detach;
    }

    // Push a close to the backend for a crash-swept session. If the
    // backend never knew about it (session.start hadn't synced yet), this
    // 404s and the outbox dead-letters it immediately — same idempotent,
    // non-retryable-4xx handling every other outbox write already relies on.
    // FIFO puts this after the original POST /sessions.
    enqueueSessionClose = (s) => {
      outbox.enqueue({
        kind: 'session.close',
        method: 'POST',
        path: `/sessions/${s.id}/close`,
        id: `req_ses-close-${s.id}`,
        payload: {
          endedAt: s.endedAt,
          reason: s.endReason ?? 'crash_recover',
          billableSeconds: s.billableSeconds,
        },
      });
    };
    // The session held for the Recover / Discard prompt is not in this list:
    // its close is only sent if the user chooses Discard.
    for (const s of recoveredSessions) enqueueSessionClose(s);

    stopSync = async () => {
      try {
        detachEventBridge?.();
      } catch {
        /* ignore */
      }
      try {
        detachSyncIpc?.();
      } catch {
        /* ignore */
      }
      try {
        realtimeClient?.disconnect();
      } catch {
        /* ignore */
      }
      try {
        await worker.stop();
      } catch {
        /* ignore */
      }
      try {
        network.stop();
      } catch {
        /* ignore */
      }
      try {
        api.close();
      } catch {
        /* ignore */
      }
    };
    logger.info({ apiBaseUrl }, 'phase 4 sync pipeline wired');
  } catch (err) {
    logger.error({ err }, 'failed to initialize sync pipeline');
  }

  // --- Phase 6: window manager, onboarding, tray, notifications --------
  let trayService: ReturnType<typeof createTrayService> | null = null;
  let detachTimerBus: (() => void) | null = null;
  try {
    const db = initDatabase();
    const onboardingService = createOnboardingService({
      db,
      logger,
      getUserId: () => null,
    });

    const { preloadPath, rendererIndexPath } = resolveRendererPaths(__dirname);
    windowManager = createWindowManager({
      logger,
      isDev,
      devServerUrl: process.env.VITE_DEV_SERVER_URL,
      preloadPath,
      rendererIndexPath,
      iconPath: appIconPath,
      getTimerState: () =>
        timerService ? timerService.getCurrentState() : 'Idle',
    });

    const notificationService = createNotificationService({
      logger,
      windowManager,
      getPrefs: () => onboardingService.getNotificationPrefs(),
    });

    const fallbackIcon = appIconPath;

    trayService = createTrayService({
      logger,
      iconsDir: resourcesRoot,
      fallbackIcon,
      windowManager,
      onStartTimer: () => {
        // The tray cannot know which task to start — bring the window forward
        // so the user selects a contract + task there. Starting requires a real
        // task (see timer-service.startTimer).
        void windowManager?.showMainWindow();
      },
      onPauseTimer: async () => {
        await timerService?.pauseTimer();
      },
      onResumeTimer: async () => {
        await timerService?.resumeTimer();
      },
      onStopTimer: async () => {
        await timerService?.stopTimer('user_stop');
      },
      onStartBreak: async (kind) => {
        await timerService?.startBreak({ kind, durationSec: 15 * 60 });
      },
      onSyncNow: () => undefined,
      onLogout: () => undefined,
      onQuit: () => {
        windowManager?.prepareToQuit();
        app.quit();
      },
    });
    // Tray start is deferred until after app.whenReady() — see below.

    // Offline-first awareness. Tracking never stops for a lost connection —
    // work queues locally and uploads on reconnect — so the talent is told
    // instead: the tray follows sync state (red icon + "offline" tooltip
    // while offline), and a notification fires when the connection drops
    // during a session and again when it's back.
    if (syncWorker && networkMonitor) {
      const worker = syncWorker;
      const pushTraySync = (s: { online: boolean; queueDepth: number }) =>
        trayService?.setSyncSnapshot({ online: s.online, queueDepth: s.queueDepth });
      pushTraySync(worker.getStatus());
      worker.on('sync:status-changed', pushTraySync);
      let offlineNoticeShown = false;
      networkMonitor.on('net:online-changed', (online: boolean) => {
        pushTraySync(worker.getStatus());
        if (!online) {
          const state = timerService?.getCurrentState() ?? 'Idle';
          if (authService?.getCurrentUser() && state !== 'Idle' && state !== 'Counting') {
            notificationService.networkOffline();
            offlineNoticeShown = true;
          }
          return;
        }
        const { queueDepth } = worker.getStatus();
        if (offlineNoticeShown || queueDepth > 0) notificationService.networkRestored(queueDepth);
        offlineNoticeShown = false;
      });
    }

    // Forward timer bus events into tray + notifications.
    if (timerService) {
      detachTimerBus = timerService.attachEventBus((evt: TimerBusEvent) => {
        try {
          if (evt.channel === TIMER_CHANNELS.stateChanged) {
            trayService?.setTimerState(evt.payload.state, evt.payload.elapsedSec);
          } else if (evt.channel === TIMER_CHANNELS.tick) {
            trayService?.setTimerState(evt.payload.state, evt.payload.elapsedSec);
          } else if (evt.channel === TIMER_CHANNELS.workReminder) {
            notificationService.workReminder(evt.payload.elapsedSec);
          } else if (evt.channel === TIMER_CHANNELS.breakReminder) {
            notificationService.breakReminder(evt.payload.elapsedSec);
          } else if (evt.channel === TIMER_CHANNELS.breakExpiring) {
            notificationService.breakExpiring(evt.payload.remainingSec);
          } else if (evt.channel === TIMER_CHANNELS.breakExpired) {
            notificationService.breakExpired();
          } else if (evt.channel === TIMER_CHANNELS.idleResolutionNeeded) {
            notificationService.idleDetected(evt.payload.seconds);
          }
        } catch (err) {
          logger.warn({ err }, 'timer bus → tray/notifications failed');
        }
      });
    }

    logger.info('phase 6 window/tray/notifications/onboarding wired');
  } catch (err) {
    logger.error({ err }, 'failed to initialize phase 6 services');
  }

  // --- Phase 7: auto-updater (doc 30) ------------------------------------
  let detachUpdaterIpc: (() => void) | null = null;
  let updaterSvc: UpdaterService | null = null;
  if (!isDev) {
    try {
      const db = initDatabase();
      const prefsStore: UpdaterPrefsStore = {
        load() {
          const row = db
            .prepare('SELECT channel, auto_download, last_check_at, last_version FROM updater_prefs WHERE id = 1')
            .get() as { channel: string; auto_download: number; last_check_at: number | null; last_version: string | null } | undefined;
          return {
            channel: (row?.channel ?? 'stable') as ReleaseChannel,
            autoDownload: row?.auto_download !== 0,
            lastCheckAt: row?.last_check_at ?? null,
            lastVersion: row?.last_version ?? null,
          };
        },
        save(partial) {
          const sets: string[] = [];
          const params: unknown[] = [];
          if (partial.channel !== undefined) { sets.push('channel = ?'); params.push(partial.channel); }
          if (partial.autoDownload !== undefined) { sets.push('auto_download = ?'); params.push(partial.autoDownload ? 1 : 0); }
          if (partial.lastCheckAt !== undefined) { sets.push('last_check_at = ?'); params.push(partial.lastCheckAt); }
          if (partial.lastVersion !== undefined) { sets.push('last_version = ?'); params.push(partial.lastVersion); }
          if (sets.length > 0) {
            sets.push('updated_at = unixepoch()');
            db.prepare(`UPDATE updater_prefs SET ${sets.join(', ')} WHERE id = 1`).run(...params);
          }
        },
      };

      // Dynamic require to avoid crash in dev mode (electron-updater
      // throws when running unpackaged).
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { autoUpdater } = require('electron-updater') as { autoUpdater: AutoUpdaterPort };

      updaterSvc = createUpdaterService({
        logger,
        updater: autoUpdater,
        prefs: prefsStore,
        currentVersion: app.getVersion(),
        broadcast: (event) => {
          const targets = collectBroadcastTargets();
          for (const wc of targets) {
            if (event.type === 'status-changed') wc.send('updater:status-changed', event.status);
            else if (event.type === 'progress') wc.send('updater:progress', event.progress);
            else if (event.type === 'error') wc.send('updater:error', event.message);
          }
        },
      });

      detachUpdaterIpc = registerUpdaterIpc({ ipcMain, logger, service: updaterSvc });
      updaterSvc.startPeriodicCheck();
      logger.info('phase 7 auto-updater wired');
    } catch (err) {
      logger.error({ err }, 'failed to initialize auto-updater');
    }
  } else {
    logger.info('phase 7 auto-updater skipped (dev mode)');
  }

  // Close the active session BEFORE anything is torn down. APP_QUIT's
  // effects write ended_at/billable_seconds and the event-bridge enqueues the
  // backend session.close into the (SQLite) outbox — both need the DB and the
  // timer's bus alive. It used to be fired without awaiting, right before
  // dispose() and the DB close, so it never landed: every quit left the
  // session open and the next boot "crash-recovered" it with 0 billable.
  let sessionClosedForQuit = false;
  const closeSessionForQuit = async () => {
    if (sessionClosedForQuit) return;
    sessionClosedForQuit = true;
    try {
      if (timerService && timerService.getSnapshot().activeSessionId) {
        await timerService.dispatch({ type: 'APP_QUIT' });
      }
    } catch (err) {
      logger.warn({ err }, 'error while closing the active session on quit');
    }
  };

  app.on('before-quit', (evt) => {
    // Confirm-before-quit when there's an active session.
    if (windowManager && !windowManager.isQuitting()) {
      evt.preventDefault();
      void (async () => {
        const ok = await windowManager!.confirmQuit();
        if (!ok) return;
        await closeSessionForQuit();
        windowManager!.prepareToQuit();
        app.quit();
      })();
      return;
    }

    // Quit paths that skip the confirm (updater restart, OS shutdown, no
    // window manager): hold the quit once to close the session first.
    if (!sessionClosedForQuit && timerService?.getSnapshot().activeSessionId) {
      evt.preventDefault();
      void closeSessionForQuit().then(() => app.quit());
      return;
    }


    // Fire off the async sync shutdown but don't block the quit path —
    // Electron gives us ~2 s before force-killing anyway.
    if (stopSync) {
      void stopSync().catch((err) =>
        logger.warn({ err }, 'error while stopping sync pipeline'),
      );
    }
    try {
      stopCaptureIpc?.();
      captureSupervisor?.stop();
      stopInputActivity();
    } catch (err) {
      logger.warn({ err }, 'error while stopping capture supervisor');
    }
    try {
      detachAuthIpc?.();
    } catch (err) {
      logger.warn({ err }, 'error while detaching auth ipc');
    }
    try {
      detachOnboardingIpc?.();
    } catch (err) {
      logger.warn({ err }, 'error while detaching onboarding ipc');
    }
    try {
      detachContractsIpc?.();
    } catch (err) {
      logger.warn({ err }, 'error while detaching contracts ipc');
    }
    try {
      detachStatsIpc?.();
    } catch (err) {
      logger.warn({ err }, 'error while detaching stats ipc');
    }
    try {
      updaterSvc?.dispose();
      detachUpdaterIpc?.();
    } catch (err) {
      logger.warn({ err }, 'error while stopping updater service');
    }
    try {
      // The session was already closed by closeSessionForQuit() above.
      timerService?.dispose();
      detachIpcHandlers?.();
      detachCrashRecoveryIpc?.();
    } catch (err) {
      logger.warn({ err }, 'error while stopping timer service');
    }
    try {
      detachPowerMonitor?.();
    } catch (err) {
      logger.warn({ err }, 'error while detaching power monitor');
    }
    try {
      detachErrorHandler?.();
    } catch (err) {
      logger.warn({ err }, 'error while detaching error handler');
    }
    // IMPORTANT: closeDatabase MUST be the last thing we do in shutdown,
    // otherwise capture-supervisor / timer / sync-worker handlers above
    // will try to persist state against a closed connection and throw.
    try {
      closeDatabase();
    } catch (err) {
      logger.warn({ err }, 'error while closing database on quit');
    }
  });

  logger.info('waiting for app.whenReady()...');
  await app.whenReady();
  logger.info('app is ready');

  // Tray must be created after app is ready (Electron requirement).
  try {
    trayService?.start();
  } catch (err) {
    logger.warn({ err }, 'tray service failed to start');
  }

  if (windowManager) {
    await windowManager.ensureMainWindow();
  } else {
    await createMainWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow();
    }
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// NOTE: the `before-quit` handler that closes the DB is registered inside
// `bootstrap()` AFTER the capture / sync / timer teardown steps. A module-level
// handler here would fire BEFORE the bootstrap handler (Electron invokes
// listeners in registration order, and module code runs before the async
// bootstrap completes), causing a shutdown race where capture-supervisor
// tries to persist permission-grant rows against an already-closed DB.

// The web app's Log Time button opens this app through `marketeq://open`
// (BTB-325). A second launch — from that link or a shortcut — must focus the
// running tracker rather than start another one against the same local DB.
const DEEP_LINK_SCHEME = 'marketeq';
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A launch id that arrived before bootstrap wired up the API client.
let pendingLaunchId: string | null = null;
let acknowledgeLaunch: ((launchId: string) => void) | null = null;

/** The `launch` id from a marketeq://open?launch=<uuid> argument, if any. */
function launchIdFrom(args: readonly string[]): string | null {
  const link = args.find((a) => a.toLowerCase().startsWith(`${DEEP_LINK_SCHEME}://`));
  if (!link) return null;
  try {
    const id = new URL(link).searchParams.get('launch');
    return id && UUID_RE.test(id) ? id : null;
  } catch {
    return null;
  }
}

function handleDeepLink(args: readonly string[]): void {
  const launchId = launchIdFrom(args);
  if (!launchId) return;
  if (acknowledgeLaunch) acknowledgeLaunch(launchId);
  else pendingLaunchId = launchId;
}

function focusFromDeepLink(): void {
  if (!app.isReady()) return; // bootstrap shows the window itself
  if (windowManager) {
    void windowManager.showMainWindow();
    return;
  }
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  } else {
    void createMainWindow();
  }
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // In dev the app runs as `electron <script>`, so Windows needs the script
  // path to relaunch it; packaged builds are also registered by the installer
  // (electron-builder.yml `protocols`).
  if (isDev && process.argv[1]) {
    app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME, process.execPath, [
      path.resolve(process.argv[1]),
    ]);
  } else {
    app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME);
  }

  // Windows passes the link on the command line: to this process on a cold
  // start, to the running one via second-instance.
  handleDeepLink(process.argv);
  app.on('second-instance', (_evt, argv) => {
    handleDeepLink(argv);
    focusFromDeepLink();
  });
  // macOS delivers the link via open-url, on a cold start as well.
  app.on('open-url', (evt, url) => {
    evt.preventDefault();
    handleDeepLink([url]);
    focusFromDeepLink();
  });

  void bootstrap().catch((err) => {
    console.error('BOOTSTRAP FAILED:', err);
    logger.error({ err }, 'bootstrap failed');
    app.exit(1);
  });
}
