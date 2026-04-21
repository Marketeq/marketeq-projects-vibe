// src/main/services/updater/register-ipc.ts
// Phase 7 — IPC handlers for the auto-updater.

import type { IpcMain } from 'electron';
import type { Logger } from 'pino';
import { z } from 'zod';
import { IPC } from '../../../shared/ipc-contracts';
import type { UpdaterService } from './updater-service';
import { isValidChannel, type ReleaseChannel } from './channels';

export interface RegisterUpdaterIpcDeps {
  ipcMain: IpcMain;
  logger: Logger;
  service: UpdaterService;
}

export function registerUpdaterIpc(deps: RegisterUpdaterIpcDeps): () => void {
  const { ipcMain, logger, service } = deps;
  const log = logger.child({ module: 'updater-ipc' });

  ipcMain.handle(IPC.updaterGetStatus, () => {
    return service.getStatus();
  });

  ipcMain.handle(IPC.updaterCheckNow, async () => {
    await service.checkNow();
    return service.getStatus();
  });

  ipcMain.handle(IPC.updaterSetChannel, (_event, channel: unknown) => {
    if (!isValidChannel(channel)) {
      log.warn({ channel }, 'invalid channel');
      return { ok: false, code: 'ERR_VAL_UPDATER_CHANNEL', message: 'Invalid release channel' };
    }
    try {
      service.setChannel(channel);
      return service.getStatus();
    } catch (err) {
      return { ok: false, code: 'ERR_UPDATER_SET_CHANNEL', message: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle(IPC.updaterDownload, async () => {
    await service.downloadUpdate();
    return service.getStatus();
  });

  ipcMain.handle(IPC.updaterQuitAndInstall, () => {
    service.quitAndInstall();
  });

  return () => {
    ipcMain.removeHandler(IPC.updaterGetStatus);
    ipcMain.removeHandler(IPC.updaterCheckNow);
    ipcMain.removeHandler(IPC.updaterSetChannel);
    ipcMain.removeHandler(IPC.updaterDownload);
    ipcMain.removeHandler(IPC.updaterQuitAndInstall);
  };
}
