// src/main/services/onboarding/register-ipc.ts
//
// Registers IPC handlers for the Phase 6 onboarding service. All inbound
// payloads are zod-validated at the boundary.

import type { IpcMain, WebContents } from 'electron';
import type { Logger } from 'pino';
import { IPC } from '../../../shared/ipc-contracts';
import {
  NotificationPrefsSchema,
  OnboardingMarkStepArgsSchema,
  type NotificationPrefs,
  type OnboardingState,
} from '../../../shared/ipc-contracts';
import type { OnboardingService } from './onboarding-service';

export interface RegisterOnboardingIpcDeps {
  ipcMain: IpcMain;
  logger: Logger;
  service: OnboardingService;
  getBroadcastTargets: () => readonly WebContents[];
}

export function registerOnboardingIpc(
  deps: RegisterOnboardingIpcDeps,
): () => void {
  const { ipcMain, service, logger, getBroadcastTargets } = deps;

  ipcMain.handle(IPC.onboardingGetState, (): OnboardingState => {
    return service.getState();
  });

  ipcMain.handle(
    IPC.onboardingMarkStep,
    (_evt, args: unknown): OnboardingState => {
      const parsed = OnboardingMarkStepArgsSchema.safeParse(args);
      if (!parsed.success) {
        logger.warn({ issues: parsed.error.issues }, 'invalid mark-step args');
        return service.getState();
      }
      return service.markStep(parsed.data);
    },
  );

  ipcMain.handle(IPC.onboardingComplete, (): OnboardingState => {
    return service.complete();
  });

  ipcMain.handle(
    IPC.onboardingGetNotificationPrefs,
    (): NotificationPrefs => service.getNotificationPrefs(),
  );

  ipcMain.handle(
    IPC.onboardingSetNotificationPrefs,
    (_evt, args: unknown): NotificationPrefs => {
      const parsed = NotificationPrefsSchema.safeParse(args);
      if (!parsed.success) {
        logger.warn(
          { issues: parsed.error.issues },
          'invalid notification prefs args',
        );
        return service.getNotificationPrefs();
      }
      return service.setNotificationPrefs(parsed.data);
    },
  );

  const unsubscribe = service.subscribe((state) => {
    for (const wc of getBroadcastTargets()) {
      if (!wc.isDestroyed()) {
        wc.send(IPC.onboardingStateChanged, state);
      }
    }
  });

  return () => {
    unsubscribe();
    ipcMain.removeHandler(IPC.onboardingGetState);
    ipcMain.removeHandler(IPC.onboardingMarkStep);
    ipcMain.removeHandler(IPC.onboardingComplete);
    ipcMain.removeHandler(IPC.onboardingGetNotificationPrefs);
    ipcMain.removeHandler(IPC.onboardingSetNotificationPrefs);
  };
}
