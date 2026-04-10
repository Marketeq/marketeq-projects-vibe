// src/main/services/sync/register-ipc.ts
//
// Phase 4 — IPC wiring for the sync worker / outbox / network monitor.
// Kept out of `src/main/ipc.ts` so it can be attached/detached
// independently of the Phase 1 boot sequence (matches Phase 3 pattern).

import { ipcMain, BrowserWindow } from 'electron';
import type { Logger } from 'pino';
import { IPC } from '../../../shared/ipc-contracts';
import type {
  SyncErrorPayload,
  SyncProgressPayload,
  SyncStatusDTO,
} from '../../../shared/ipc-contracts';
import type { SyncWorker } from './sync-worker';
import type { NetworkMonitor } from './network-monitor';

export interface SyncIpcDeps {
  logger: Logger;
  worker: SyncWorker;
  network: NetworkMonitor;
}

function broadcast(channel: string, payload: unknown): void {
  for (const w of BrowserWindow.getAllWindows()) {
    try {
      if (!w.webContents.isDestroyed()) {
        w.webContents.send(channel, payload);
      }
    } catch {
      /* ignore */
    }
  }
}

export function registerSyncIpcHandlers(deps: SyncIpcDeps): () => void {
  const log = deps.logger.child({ svc: 'sync-ipc' });

  ipcMain.handle(IPC.syncGetStatus, (): SyncStatusDTO => {
    return deps.worker.getStatus();
  });

  ipcMain.handle(IPC.syncForceRun, async (): Promise<SyncStatusDTO> => {
    return await deps.worker.forceRun();
  });

  const onStatus = (s: SyncStatusDTO) =>
    broadcast(IPC.syncStatusChanged, s);
  const onProgress = (p: SyncProgressPayload) =>
    broadcast(IPC.syncProgress, p);
  const onError = (e: SyncErrorPayload) => broadcast(IPC.syncError, e);
  const onIdle = () => broadcast(IPC.syncIdle, undefined);
  const onOnlineChanged = (online: boolean) =>
    broadcast(IPC.netOnlineChanged, online);

  deps.worker.on('sync:status-changed', onStatus);
  deps.worker.on('sync:progress', onProgress);
  deps.worker.on('sync:error', onError);
  deps.worker.on('sync:idle', onIdle);
  deps.network.on('net:online-changed', onOnlineChanged);

  log.info('sync IPC handlers registered');

  return () => {
    try {
      deps.worker.off('sync:status-changed', onStatus);
      deps.worker.off('sync:progress', onProgress);
      deps.worker.off('sync:error', onError);
      deps.worker.off('sync:idle', onIdle);
      deps.network.off('net:online-changed', onOnlineChanged);
    } catch {
      /* ignore */
    }
    ipcMain.removeHandler(IPC.syncGetStatus);
    ipcMain.removeHandler(IPC.syncForceRun);
  };
}
