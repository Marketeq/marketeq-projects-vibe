// src/main/services/updater/__tests__/updater-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createUpdaterService,
  type AutoUpdaterPort,
  type UpdaterPrefsStore,
  type UpdaterServiceEvent,
  type UpdateInfo,
  type ProgressInfo,
} from '../updater-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFakeUpdater(): AutoUpdaterPort & {
  _listeners: Map<string, Function[]>;
  _fire: (event: string, ...args: unknown[]) => void;
} {
  const listeners = new Map<string, Function[]>();

  return {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    allowPrerelease: false,
    _listeners: listeners,
    setFeedURL: vi.fn(),
    checkForUpdates: vi.fn().mockResolvedValue(null),
    downloadUpdate: vi.fn().mockResolvedValue(null),
    quitAndInstall: vi.fn(),
    on(event: string, cb: Function) {
      const arr = listeners.get(event) ?? [];
      arr.push(cb);
      listeners.set(event, arr);
    },
    removeAllListeners(event?: string) {
      if (event) listeners.delete(event);
      else listeners.clear();
    },
    _fire(event: string, ...args: unknown[]) {
      for (const cb of listeners.get(event) ?? []) {
        cb(...args);
      }
    },
  };
}

function makeFakePrefsStore(): UpdaterPrefsStore & { _data: Record<string, unknown> } {
  const data: Record<string, unknown> = {
    channel: 'stable',
    autoDownload: true,
    lastCheckAt: null,
    lastVersion: null,
  };
  return {
    _data: data,
    load: () => ({
      channel: (data.channel ?? 'stable') as 'stable' | 'beta' | 'alpha',
      autoDownload: data.autoDownload !== false,
      lastCheckAt: (data.lastCheckAt as number | null) ?? null,
      lastVersion: (data.lastVersion as string | null) ?? null,
    }),
    save: (partial) => Object.assign(data, partial),
  };
}

const fakeLogger = {
  child: () => fakeLogger,
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
} as unknown as import('pino').Logger;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UpdaterService', () => {
  let updater: ReturnType<typeof makeFakeUpdater>;
  let prefs: ReturnType<typeof makeFakePrefsStore>;
  let broadcasts: UpdaterServiceEvent[];

  beforeEach(() => {
    updater = makeFakeUpdater();
    prefs = makeFakePrefsStore();
    broadcasts = [];
  });

  function make() {
    return createUpdaterService({
      logger: fakeLogger,
      updater,
      prefs,
      currentVersion: '0.1.0',
      ghOwner: 'TestOrg',
      ghRepo: 'test-repo',
      broadcast: (e) => broadcasts.push(e),
    });
  }

  it('returns initial idle status', () => {
    const svc = make();
    const s = svc.getStatus();
    expect(s.currentVersion).toBe('0.1.0');
    expect(s.channel).toBe('stable');
    expect(s.state).toBe('idle');
    expect(s.availableVersion).toBeNull();
  });

  it('configures the updater on creation', () => {
    make();
    expect(updater.setFeedURL).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'github', owner: 'TestOrg', repo: 'test-repo' }),
    );
  });

  it('checkNow calls checkForUpdates', async () => {
    const svc = make();
    await svc.checkNow();
    expect(updater.checkForUpdates).toHaveBeenCalled();
    expect(svc.getStatus().lastCheckAt).toBeGreaterThan(0);
    expect(prefs._data.lastCheckAt).toBeGreaterThan(0);
  });

  it('handles update-available event', () => {
    const svc = make();
    const info: UpdateInfo = { version: '1.0.0', releaseName: 'v1.0.0' };
    updater._fire('update-available', info);
    const s = svc.getStatus();
    expect(s.availableVersion).toBe('1.0.0');
    expect(prefs._data.lastVersion).toBe('1.0.0');
    expect(broadcasts.some((e) => e.type === 'status-changed')).toBe(true);
  });

  it('handles update-not-available', () => {
    const svc = make();
    updater._fire('update-not-available', { version: '0.1.0' });
    expect(svc.getStatus().state).toBe('idle');
  });

  it('handles download-progress', () => {
    const svc = make();
    const progress: ProgressInfo = { total: 100, delta: 10, transferred: 50, percent: 50, bytesPerSecond: 1000 };
    updater._fire('download-progress', progress);
    expect(svc.getStatus().state).toBe('downloading');
    expect(broadcasts.some((e) => e.type === 'progress')).toBe(true);
  });

  it('handles update-downloaded', () => {
    const svc = make();
    updater._fire('update-downloaded', { version: '1.0.0' });
    expect(svc.getStatus().state).toBe('ready');
    expect(svc.getStatus().availableVersion).toBe('1.0.0');
  });

  it('handles error event', () => {
    const svc = make();
    updater._fire('error', new Error('network fail'));
    expect(svc.getStatus().state).toBe('error');
    expect(svc.getStatus().lastError).toBe('network fail');
    expect(broadcasts.some((e) => e.type === 'error')).toBe(true);
  });

  it('setChannel reconfigures feed URL', () => {
    const svc = make();
    svc.setChannel('beta');
    expect(svc.getStatus().channel).toBe('beta');
    expect(prefs._data.channel).toBe('beta');
    expect(updater.setFeedURL).toHaveBeenCalledTimes(2); // initial + change
    expect(updater.allowPrerelease).toBe(true);
  });

  it('downloadUpdate delegates to updater', async () => {
    const svc = make();
    await svc.downloadUpdate();
    expect(updater.downloadUpdate).toHaveBeenCalled();
  });

  it('quitAndInstall delegates to updater', () => {
    const svc = make();
    svc.quitAndInstall();
    expect(updater.quitAndInstall).toHaveBeenCalled();
  });

  it('setAutoDownload persists', () => {
    const svc = make();
    svc.setAutoDownload(false);
    expect(prefs._data.autoDownload).toBe(false);
    expect(updater.autoDownload).toBe(false);
  });

  it('dispose clears listeners and intervals', () => {
    const svc = make();
    svc.startPeriodicCheck();
    svc.dispose();
    expect(updater._listeners.size).toBe(0);
  });

  it('checkNow sets error state on failure', async () => {
    updater.checkForUpdates = vi.fn().mockRejectedValue(new Error('offline'));
    const svc = make();
    await svc.checkNow();
    expect(svc.getStatus().state).toBe('error');
    expect(svc.getStatus().lastError).toBe('offline');
  });
});
