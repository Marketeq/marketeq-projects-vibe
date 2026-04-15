// src/main/services/capture/register-ipc.ts
//
// Phase 3 IPC registration — kept out of the Phase 1 `src/main/ipc.ts`
// file to honor the "do not modify Phase 1 files" constraint. The Phase 1
// entry point imports this and calls `registerCaptureIpcHandlers(services)`
// at boot.

import { ipcMain, BrowserWindow } from 'electron';
import type { Logger } from 'pino';
import { IPC } from '../../../shared/ipc-contracts';
import {
  PermissionCheckArgsSchema,
} from '../../../shared/ipc-contracts';
import type {
  ActivityStats,
  CaptureHealth,
  IpcErrorResult,
  OsPermissionKey,
  PermissionKindShort,
  PermissionStatusShort,
  PermissionStatuses,
  ScreenshotStats,
  ScreenshotTakenEvent,
  ActivitySample,
} from '../../../shared/ipc-contracts';
import type { PermissionsService } from '../permissions/permissions-service';
import type { ScreenshotService } from './screenshot-service';
import type { ActivityMonitor } from './activity-monitor';
import type { CaptureSupervisor } from './capture-supervisor';

function ipcError(code: string, message: string): IpcErrorResult {
  return { ok: false, code, message };
}

export interface CaptureIpcDeps {
  logger: Logger;
  permissions: PermissionsService;
  screenshotService: ScreenshotService;
  activityMonitor: ActivityMonitor;
  captureSupervisor: CaptureSupervisor;
}

export function registerCaptureIpcHandlers(deps: CaptureIpcDeps): () => void {
  const log = deps.logger.child({ svc: 'capture-ipc' });

  ipcMain.handle(
    IPC.permissionsCheck,
    (_evt, kind: unknown): PermissionStatusShort | IpcErrorResult => {
      const parsed = PermissionCheckArgsSchema.safeParse(kind);
      if (!parsed.success) {
        return ipcError('ERR_VAL_PERM_CHECK', 'Invalid permission kind');
      }
      try {
        return deps.permissions.checkPermission(parsed.data);
      } catch (err) {
        return ipcError('ERR_PERM_CHECK', err instanceof Error ? err.message : String(err));
      }
    },
  );
  ipcMain.handle(
    IPC.permissionsRequest,
    async (_evt, kind: unknown): Promise<PermissionStatusShort | IpcErrorResult> => {
      const parsed = PermissionCheckArgsSchema.safeParse(kind);
      if (!parsed.success) {
        return ipcError('ERR_VAL_PERM_REQUEST', 'Invalid permission kind');
      }
      try {
        return await deps.permissions.requestPermission(parsed.data);
      } catch (err) {
        return ipcError('ERR_PERM_REQUEST', err instanceof Error ? err.message : String(err));
      }
    },
  );
  ipcMain.handle(IPC.permissionsGetAll, (): PermissionStatuses => {
    return deps.permissions.getAllPermissions();
  });
  ipcMain.handle(
    IPC.permissionsOpenSettings,
    async (_evt, _key: OsPermissionKey): Promise<void> => {
      // Deep link open is a stretch goal; no-op for Phase 3 so Phase 4 can
      // wire it. We still register the channel so the preload bridge type
      // matches exactly.
      log.debug({ _key }, 'openSettings called (no-op stub)');
    },
  );

  ipcMain.handle(
    IPC.screenshotCaptureNow,
    async (): Promise<ScreenshotTakenEvent[] | IpcErrorResult> => {
      try {
        return await deps.screenshotService.captureOnce();
      } catch (err) {
        log.error({ err }, 'screenshot capture failed');
        return ipcError('ERR_CAPTURE_SCREENSHOT', err instanceof Error ? err.message : String(err));
      }
    },
  );
  ipcMain.handle(IPC.screenshotGetStats, (): ScreenshotStats | IpcErrorResult => {
    try {
      return deps.screenshotService.getStats();
    } catch (err) {
      return ipcError('ERR_SCREENSHOT_STATS', err instanceof Error ? err.message : String(err));
    }
  });
  ipcMain.handle(IPC.screenshotDelete, (_evt, id: unknown): void | IpcErrorResult => {
    if (typeof id !== 'string' || id.length === 0) {
      return ipcError('ERR_VAL_SCREENSHOT_DELETE', 'Invalid screenshot id');
    }
    try {
      deps.screenshotService.deleteById(id);
    } catch (err) {
      return ipcError('ERR_SCREENSHOT_DELETE', err instanceof Error ? err.message : String(err));
    }
  });

  ipcMain.handle(IPC.activityGetStats, (): ActivityStats | IpcErrorResult => {
    try {
      return deps.activityMonitor.getStats();
    } catch (err) {
      return ipcError('ERR_ACTIVITY_STATS', err instanceof Error ? err.message : String(err));
    }
  });
  ipcMain.handle(
    IPC.activityGetRecent,
    (_evt, limit?: unknown): ActivitySample[] | IpcErrorResult => {
      const safeLimit = typeof limit === 'number' && Number.isInteger(limit) && limit > 0 && limit <= 1000
        ? limit
        : undefined;
      try {
        return deps.activityMonitor.getRecent(safeLimit);
      } catch (err) {
        return ipcError('ERR_ACTIVITY_RECENT', err instanceof Error ? err.message : String(err));
      }
    },
  );

  ipcMain.handle(IPC.captureHealth, (): CaptureHealth | IpcErrorResult => {
    try {
      return deps.captureSupervisor.getHealth();
    } catch (err) {
      return ipcError('ERR_CAPTURE_HEALTH', err instanceof Error ? err.message : String(err));
    }
  });

  // Broadcast wiring: pipe service events to all renderer windows.
  const unsubScreenshot = deps.screenshotService.subscribe((e) => {
    for (const w of BrowserWindow.getAllWindows()) {
      try {
        w.webContents.send(IPC.eventScreenshotTaken, e);
      } catch {
        /* ignore */
      }
    }
  });
  const unsubActivity = deps.activityMonitor.subscribe((s) => {
    for (const w of BrowserWindow.getAllWindows()) {
      try {
        w.webContents.send(IPC.eventActivitySampled, s);
      } catch {
        /* ignore */
      }
    }
  });

  log.info('capture IPC handlers registered');

  return () => {
    unsubScreenshot();
    unsubActivity();
    ipcMain.removeHandler(IPC.permissionsCheck);
    ipcMain.removeHandler(IPC.permissionsRequest);
    ipcMain.removeHandler(IPC.permissionsGetAll);
    ipcMain.removeHandler(IPC.permissionsOpenSettings);
    ipcMain.removeHandler(IPC.screenshotCaptureNow);
    ipcMain.removeHandler(IPC.screenshotGetStats);
    ipcMain.removeHandler(IPC.screenshotDelete);
    ipcMain.removeHandler(IPC.activityGetStats);
    ipcMain.removeHandler(IPC.activityGetRecent);
    ipcMain.removeHandler(IPC.captureHealth);
  };
}
