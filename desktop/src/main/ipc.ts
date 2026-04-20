// src/main/ipc.ts
// Typed IPC channel registry. The preload bridge and the main process both
// reference IPC names via src/shared/ipc-contracts.ts so there's only one
// source of truth.

import { app, ipcMain, shell } from 'electron';
import { IPC } from '../shared/ipc-contracts';
import type { AppInfo, PingResult } from '../shared/types';
import { SCHEMA_VERSION } from '../shared/constants';
import { getDb } from './db/connection';
import { logger } from './logger';
import type { TimerService } from './services/timer/timer-service';
import { registerTimerIpc, collectBroadcastTargets } from './ipc/timer';

export function registerIpcHandlers(opts?: {
  timer?: TimerService;
}): () => void {
  ipcMain.handle(IPC.appInfo, (): AppInfo => {
    return {
      version: app.getVersion(),
      platform: process.platform,
      schemaVersion: SCHEMA_VERSION,
    };
  });

  ipcMain.handle(IPC.ping, (_evt, echo: string): PingResult => {
    logger.debug({ echo }, 'ipc ping');
    return { ok: true, receivedAt: Date.now(), echo };
  });

  ipcMain.handle(
    IPC.shellOpenExternal,
    async (_evt, url: string): Promise<void> => {
      // Whitelist: only http(s) URLs, to prevent abuse (file://, etc.)
      if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
        logger.warn({ url }, 'ipc shell:open-external refused non-http url');
        return;
      }
      try {
        await shell.openExternal(url);
      } catch (err) {
        logger.warn({ err, url }, 'ipc shell:open-external failed');
      }
    },
  );

  ipcMain.handle(IPC.dbTablesList, (): string[] => {
    const db = getDb();
    const rows = db
      .prepare<[], { name: string }>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
      )
      .all();
    return rows.map((r) => r.name);
  });

  let detachTimer: (() => void) | null = null;
  if (opts?.timer) {
    detachTimer = registerTimerIpc(
      ipcMain,
      opts.timer,
      () => collectBroadcastTargets(),
    );
  }

  return () => {
    ipcMain.removeHandler(IPC.appInfo);
    ipcMain.removeHandler(IPC.ping);
    ipcMain.removeHandler(IPC.dbTablesList);
    ipcMain.removeHandler(IPC.shellOpenExternal);
    detachTimer?.();
  };
}
