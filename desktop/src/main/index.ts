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
import { createRepos } from './db/repos';
import {
  createTimerService,
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
import { ipcMain } from 'electron';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import { createOnboardingService } from './services/onboarding/onboarding-service';
import { registerOnboardingIpc } from './services/onboarding/register-ipc';
import { registerContractsIpc } from './services/contracts/register-ipc';

const isDev = !app.isPackaged;

async function createMainWindow(): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    width: 340,
    height: 580,
    minWidth: 320,
    minHeight: 480,
    show: true,
    title: 'Marketeq',
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

async function bootstrap(): Promise<void> {
  ensureSingleInstance();
  logger.info({ version: app.getVersion() }, 'marketeq-time-tracker:boot');

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
    // Restore any open session that was left behind by a previous crash.
    timerService.restoreFromDb();
    detachIpcHandlers = registerIpcHandlers({ timer: timerService });
    logger.info('phase 2 timer service wired');
  } catch (err) {
    logger.error({ err }, 'failed to initialize timer service');
    detachIpcHandlers = registerIpcHandlers();
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
    void authService.tryResumeSession().catch((err) => {
      logger.warn({ err }, 'auth: tryResumeSession failed');
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
    });
    logger.info('contracts IPC wired');
  } catch (err) {
    logger.error({ err }, 'failed to initialize contracts IPC');
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
  try {
    const db = initDatabase();
    const repos = createRepos(db);
    const permissions = createPermissionsService({
      logger,
      permissionGrantRepo: repos.permissionGrant,
    });
    screenshotService = createScreenshotService({
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
      process.env.DTT_API_BASE_URL ?? 'http://localhost:4000';
    const api = createApiClient({
      baseUrl: apiBaseUrl,
      logger,
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
        getDeviceId: () => repos.device.findSelf()?.id ?? null,
        getUserId: () => authService?.getCurrentUser()?.id ?? null,
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

  app.on('before-quit', () => {
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
      detachContractsIpc?.();
    } catch (err) {
      logger.warn({ err }, 'error while detaching contracts ipc');
    }
    try {
      timerService?.dispatch({ type: 'APP_QUIT' }).catch(() => undefined);
      timerService?.dispose();
      detachIpcHandlers?.();
    } catch (err) {
      logger.warn({ err }, 'error while stopping timer service');
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

  await app.whenReady();
  await createMainWindow();

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

void bootstrap().catch((err) => {
  console.error('BOOTSTRAP FAILED:', err);
  logger.error({ err }, 'bootstrap failed');
  app.exit(1);
});
