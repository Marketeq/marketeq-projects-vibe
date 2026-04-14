// src/main/services/updater/updater-service.ts
// Phase 7 — Auto-update service per doc 30.
// Uses a port-based design so the Electron autoUpdater dependency can be
// replaced by a fake in tests.

import type { Logger } from 'pino';
import { z } from 'zod';
import { type ReleaseChannel, RELEASE_CHANNELS, isValidChannel } from './channels';

// ---------------------------------------------------------------------------
// Port: the subset of electron-updater we actually use
// ---------------------------------------------------------------------------

export interface UpdateInfo {
  version: string;
  releaseNotes?: string | null;
  releaseName?: string;
  releaseDate?: string;
}

export interface ProgressInfo {
  total: number;
  delta: number;
  transferred: number;
  percent: number;
  bytesPerSecond: number;
}

export type UpdaterEvent =
  | 'checking-for-update'
  | 'update-available'
  | 'update-not-available'
  | 'download-progress'
  | 'update-downloaded'
  | 'error';

export interface AutoUpdaterPort {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  allowPrerelease: boolean;
  setFeedURL(opts: { provider: string; owner: string; repo: string; releaseType: string }): void;
  checkForUpdates(): Promise<unknown>;
  downloadUpdate(): Promise<unknown>;
  quitAndInstall(): void;
  on(event: 'checking-for-update', cb: () => void): void;
  on(event: 'update-available', cb: (info: UpdateInfo) => void): void;
  on(event: 'update-not-available', cb: (info: UpdateInfo) => void): void;
  on(event: 'download-progress', cb: (progress: ProgressInfo) => void): void;
  on(event: 'update-downloaded', cb: (info: UpdateInfo) => void): void;
  on(event: 'error', cb: (err: Error) => void): void;
  removeAllListeners(event?: string): void;
}

export interface UpdaterPrefsStore {
  load(): UpdaterPrefs;
  save(prefs: Partial<UpdaterPrefs>): void;
}

export interface UpdaterPrefs {
  channel: ReleaseChannel;
  autoDownload: boolean;
  lastCheckAt: number | null;
  lastVersion: string | null;
}

// ---------------------------------------------------------------------------
// Status type exposed via IPC
// ---------------------------------------------------------------------------

export type UpdaterState = 'idle' | 'checking' | 'downloading' | 'ready' | 'error';

export interface UpdaterStatus {
  currentVersion: string;
  channel: ReleaseChannel;
  state: UpdaterState;
  availableVersion: string | null;
  progress: ProgressInfo | null;
  lastError: string | null;
  lastCheckAt: number | null;
}

// ---------------------------------------------------------------------------
// Events emitted to the renderer via the broadcast callback
// ---------------------------------------------------------------------------

export type UpdaterServiceEvent =
  | { type: 'status-changed'; status: UpdaterStatus }
  | { type: 'progress'; progress: ProgressInfo }
  | { type: 'error'; message: string };

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface UpdaterServiceDeps {
  logger: Logger;
  updater: AutoUpdaterPort;
  prefs: UpdaterPrefsStore;
  currentVersion: string;
  ghOwner?: string;
  ghRepo?: string;
  /** Callback to broadcast events to renderer webContents. */
  broadcast?: (event: UpdaterServiceEvent) => void;
}

export interface UpdaterService {
  getStatus(): UpdaterStatus;
  checkNow(): Promise<void>;
  downloadUpdate(): Promise<void>;
  quitAndInstall(): void;
  setChannel(channel: ReleaseChannel): void;
  setAutoDownload(enabled: boolean): void;
  startPeriodicCheck(): void;
  stopPeriodicCheck(): void;
  dispose(): void;
}

export function createUpdaterService(deps: UpdaterServiceDeps): UpdaterService {
  const { logger: parentLogger, updater, prefs: prefsStore, currentVersion } = deps;
  const log = parentLogger.child({ module: 'updater' });

  const ghOwner = deps.ghOwner ?? process.env.GH_REPO_OWNER ?? 'Marketeq';
  const ghRepo = deps.ghRepo ?? process.env.GH_REPO_NAME ?? 'desktop-time-tracker';

  let prefs = prefsStore.load();
  let checkTimer: ReturnType<typeof setInterval> | null = null;

  const status: UpdaterStatus = {
    currentVersion,
    channel: prefs.channel,
    state: 'idle',
    availableVersion: null,
    progress: null,
    lastError: null,
    lastCheckAt: prefs.lastCheckAt,
  };

  // Configure updater with current prefs
  function applyConfig(): void {
    const channelCfg = RELEASE_CHANNELS[prefs.channel];
    updater.autoDownload = prefs.autoDownload;
    updater.autoInstallOnAppQuit = false;
    updater.allowPrerelease = channelCfg.allowPrerelease;

    const releaseType = prefs.channel === 'stable' ? 'release' : 'prerelease';
    updater.setFeedURL({
      provider: 'github',
      owner: ghOwner,
      repo: ghRepo,
      releaseType,
    });
  }

  function broadcast(event: UpdaterServiceEvent): void {
    deps.broadcast?.(event);
  }

  function emitStatus(): void {
    broadcast({ type: 'status-changed', status: { ...status } });
  }

  // Wire electron-updater events
  updater.on('checking-for-update', () => {
    status.state = 'checking';
    log.info('checking for updates');
    emitStatus();
  });

  updater.on('update-available', (info: UpdateInfo) => {
    status.state = prefs.autoDownload ? 'downloading' : 'idle';
    status.availableVersion = info.version;
    log.info({ version: info.version }, 'update available');
    prefsStore.save({ lastVersion: info.version });
    emitStatus();
  });

  updater.on('update-not-available', () => {
    status.state = 'idle';
    status.availableVersion = null;
    log.info('no update available');
    emitStatus();
  });

  updater.on('download-progress', (progress: ProgressInfo) => {
    status.state = 'downloading';
    status.progress = progress;
    broadcast({ type: 'progress', progress });
  });

  updater.on('update-downloaded', (info: UpdateInfo) => {
    status.state = 'ready';
    status.availableVersion = info.version;
    status.progress = null;
    log.info({ version: info.version }, 'update downloaded and ready');
    emitStatus();
  });

  updater.on('error', (err: Error) => {
    status.state = 'error';
    status.lastError = err.message;
    log.error({ err: err.message }, 'updater error');
    broadcast({ type: 'error', message: err.message });
    emitStatus();
  });

  applyConfig();

  // ----- public API -----

  async function checkNow(): Promise<void> {
    try {
      await updater.checkForUpdates();
      const now = Date.now();
      status.lastCheckAt = now;
      prefsStore.save({ lastCheckAt: now });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      status.state = 'error';
      status.lastError = msg;
      log.error({ err: msg }, 'check failed');
      emitStatus();
    }
  }

  async function downloadUpdate(): Promise<void> {
    try {
      status.state = 'downloading';
      emitStatus();
      await updater.downloadUpdate();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      status.state = 'error';
      status.lastError = msg;
      log.error({ err: msg }, 'download failed');
      emitStatus();
    }
  }

  function quitAndInstall(): void {
    log.info('quit and install');
    updater.quitAndInstall();
  }

  function setChannel(channel: ReleaseChannel): void {
    if (!isValidChannel(channel)) return;
    prefs = { ...prefs, channel };
    status.channel = channel;
    prefsStore.save({ channel });
    applyConfig();
    log.info({ channel }, 'channel changed');
    emitStatus();
  }

  function setAutoDownload(enabled: boolean): void {
    prefs = { ...prefs, autoDownload: enabled };
    prefsStore.save({ autoDownload: enabled });
    updater.autoDownload = enabled;
  }

  function startPeriodicCheck(): void {
    stopPeriodicCheck();
    const interval = RELEASE_CHANNELS[prefs.channel].checkIntervalMs;
    // Delay first check 30s after app ready
    setTimeout(() => {
      void checkNow().catch(() => {});
    }, 30_000);
    checkTimer = setInterval(() => {
      void checkNow().catch(() => {});
    }, interval);
    log.info({ intervalMs: interval }, 'periodic check started');
  }

  function stopPeriodicCheck(): void {
    if (checkTimer) {
      clearInterval(checkTimer);
      checkTimer = null;
    }
  }

  function dispose(): void {
    stopPeriodicCheck();
    updater.removeAllListeners();
  }

  return {
    getStatus: () => ({ ...status }),
    checkNow,
    downloadUpdate,
    quitAndInstall,
    setChannel,
    setAutoDownload,
    startPeriodicCheck,
    stopPeriodicCheck,
    dispose,
  };
}
