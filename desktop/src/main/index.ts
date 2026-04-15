// src/main/index.ts
// Electron main process entry point for the Marketeq Time Tracker.
// Responsibilities:
//   1. Enforce single-instance lock.
//   2. Initialize logging.
//   3. Initialize the local SQLite database and run migrations.
//   4. Register typed IPC handlers (timer/capture/sync/auth/onboarding).
//   5. Create the main BrowserWindow via the Phase 6 window manager,
//      wire tray + notifications.

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { ensureSingleInstance } from './lifecycle/single-instance';
import { logger } from './logger';
import { initDatabase, closeDatabase } from './db/connection';
import { runMigrations } from './db/migrate';
import { registerIpcHandlers } from './ipc';
import { createRepos } from './db/repos';
import {
  createTimerService,
  TIMER_CHANNELS,
  type TimerService,
} from './services/timer/timer-service';
import { createPermissionsService } from './services/permissions/permissions-service';
import { createScreenshotService } from './services/capture/screenshot-service';
import { createActivityMonitor } from './services/capture/activity-monitor';
import { createCleanupJob } from './services/capture/cleanup-job';
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
import {
  createWindowManager,
  resolveRendererPaths,
  type WindowManager,
} from './services/window/window-manager';
import { createTrayService } from './services/tray/tray-service';
import { createNotificationService } from './services/notifications/notification-service';
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

const isDev = !app.isPackaged;

let windowManager: WindowManager | null = null;

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
    logger.error({ err }, 'fatal: failed to initialize local database');
    app.exit(1);
    return;
  }

  // --- Phase 2: Timer service (9-state FSM) ----------------------------
  let timerService: TimerService | null = null;
  let detachIpcHandlers: (() => void) | null = null;
  try {
    const db = initDatabase();
    const repos = createRepos(db);
    timerService = createTimerService({ db, repos, logger });
    // Restore any open session that was left behind by a previous crash.
    timerService.restoreFromDb();
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
    const authBaseUrl =
      process.env.DTT_API_BASE_URL ?? 'https://api.marketeq.com/tts/v1';
    const httpPort = createFetchAuthHttpPort({ logger, baseUrl: authBaseUrl });
    const authService = createAuthService({
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
    void authService.tryResumeSession().catch((err) => {
      logger.warn({ err }, 'auth: tryResumeSession failed');
    });
    logger.info('phase 5 auth service wired');
  } catch (err) {
    logger.error({ err }, 'failed to initialize auth service');
  }

  // --- Phase 3: capture pipeline ---------------------------------------
  let stopCaptureIpc: (() => void) | null = null;
  let captureSupervisor: ReturnType<typeof createCaptureSupervisor> | null =
    null;
  try {
    const db = initDatabase();
    const repos = createRepos(db);
    const permissions = createPermissionsService({
      logger,
      permissionGrantRepo: repos.permissionGrant,
    });
    const screenshotService = createScreenshotService({
      logger,
      screenshotRepo: repos.screenshot,
      sessionRepo: repos.session,
      preferenceRepo: repos.preference,
      permissions,
    });
    const activityMonitor = createActivityMonitor({
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
    logger.info('phase 3 capture pipeline wired');
  } catch (err) {
    logger.error({ err }, 'failed to initialize capture pipeline');
  }

  // --- Phase 4: sync queue + offline protocol --------------------------
  let stopSync: (() => Promise<void>) | null = null;
  let detachSyncIpc: (() => void) | null = null;
  let detachEventBridge: (() => void) | null = null;
  let realtimeClient: ReturnType<typeof createRealtimeClient> | null = null;
  try {
    const db = initDatabase();
    const repos = createRepos(db);
    const apiBaseUrl =
      process.env.DTT_API_BASE_URL ?? 'https://api.marketeq.com/tts/v1';
    const api = createApiClient({
      baseUrl: apiBaseUrl,
      logger,
    });
    const outbox = createOutbox({
      store: createSqliteOutboxStore(db),
      logger,
    });
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
    detachSyncIpc = registerSyncIpcHandlers({
      logger,
      worker,
      network,
    });

    if (timerService) {
      detachEventBridge = createEventBridge({
        outbox,
        timer: timerService,
        getDeviceId: () => repos.device.findSelf()?.id ?? null,
        logger,
      }).detach;
    }

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
  let detachOnboardingIpc: (() => void) | null = null;
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
      getTimerState: () =>
        timerService ? timerService.getCurrentState() : 'Idle',
    });

    detachOnboardingIpc = registerOnboardingIpc({
      ipcMain,
      logger,
      service: onboardingService,
      getBroadcastTargets: () => collectBroadcastTargets(),
    });

    const notificationService = createNotificationService({
      logger,
      windowManager,
      getPrefs: () => onboardingService.getNotificationPrefs(),
    });

    // Resolve tray icon dir from packaged resources or dev tree.
    const resourcesRoot = app.isPackaged
      ? process.resourcesPath
      : path.join(__dirname, '..', '..', 'resources');
    const fallbackIcon = path.join(resourcesRoot, 'icon.png');

    trayService = createTrayService({
      logger,
      iconsDir: resourcesRoot,
      fallbackIcon,
      windowManager,
      onStartTimer: () => {
        void timerService?.startTimer({
          contractId: 'default',
          taskId: 'default',
        });
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

    // Forward timer bus events into tray + notifications.
    if (timerService) {
      detachTimerBus = timerService.attachEventBus((evt) => {
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

  app.on('before-quit', (evt) => {
    // Confirm-before-quit when there's an active session.
    if (windowManager && !windowManager.isQuitting()) {
      evt.preventDefault();
      void (async () => {
        const ok = await windowManager!.confirmQuit();
        if (!ok) return;
        windowManager!.prepareToQuit();
        app.quit();
      })();
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
      detachTimerBus?.();
      trayService?.destroy();
    } catch (err) {
      logger.warn({ err }, 'error while stopping tray service');
    }
    try {
      windowManager?.closeAll();
    } catch (err) {
      logger.warn({ err }, 'error while closing windows');
    }
    try {
      updaterSvc?.dispose();
      detachUpdaterIpc?.();
    } catch (err) {
      logger.warn({ err }, 'error while stopping updater service');
    }
    try {
      timerService?.dispatch({ type: 'APP_QUIT' }).catch(() => undefined);
      timerService?.dispose();
      detachIpcHandlers?.();
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
  }

  app.on('activate', () => {
    if (windowManager) {
      void windowManager.showMainWindow();
    } else if (BrowserWindow.getAllWindows().length === 0) {
      // Shouldn't happen, but keep a safety net.
    }
  });
}

app.on('window-all-closed', () => {
  // Phase 6: close-to-tray — keep the app alive so the tray menu remains
  // accessible on both platforms. Users quit explicitly via tray → Quit
  // or the File menu, which calls `windowManager.prepareToQuit()` first.
});

app.on('before-quit', () => {
  try {
    closeDatabase();
  } catch (err) {
    logger.warn({ err }, 'error while closing database on quit');
  }
});

void bootstrap().catch((err) => {
  logger.error({ err }, 'bootstrap failed');
  app.exit(1);
});
