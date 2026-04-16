// src/main/services/capture/register-ipc.ts
//
// Phase 3 IPC registration — kept out of the Phase 1 `src/main/ipc.ts`
// file to honor the "do not modify Phase 1 files" constraint. The Phase 1
// entry point imports this and calls `registerCaptureIpcHandlers(services)`
// at boot.

import { ipcMain, BrowserWindow } from 'electron';
import type { Logger } from 'pino';
import { IPC } from '../../../shared/ipc-contracts';
import type {
  ActivityStats,
  CaptureHealth,
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
    (_evt, kind: PermissionKindShort): PermissionStatusShort => {
      return deps.permissions.checkPermission(kind);
    },
  );
  ipcMain.handle(
    IPC.permissionsRequest,
    async (_evt, kind: PermissionKindShort): Promise<PermissionStatusShort> => {
      return await deps.permissions.requestPermission(kind);
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
    async (): Promise<ScreenshotTakenEvent[]> => {
      return await deps.screenshotService.captureOnce();
    },
  );
  ipcMain.handle(IPC.screenshotGetStats, (): ScreenshotStats => {
    return deps.screenshotService.getStats();
  });
  ipcMain.handle(IPC.screenshotDelete, (_evt, id: string): void => {
    deps.screenshotService.deleteById(id);
  });

  ipcMain.handle(IPC.activityGetStats, (): ActivityStats => {
    return deps.activityMonitor.getStats();
  });
  ipcMain.handle(
    IPC.activityGetRecent,
    (_evt, limit?: number): ActivitySample[] => {
      return deps.activityMonitor.getRecent(limit);
    },
  );

  ipcMain.handle(IPC.captureHealth, (): CaptureHealth => {
    return deps.captureSupervisor.getHealth();
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
