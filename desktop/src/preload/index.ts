// src/preload/index.ts
// Exposes a typed `window.dtt` bridge to the renderer via contextBridge.
// All wire names come from src/shared/ipc-contracts.ts so there is a single
// source of truth across main/preload/renderer.

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { IPC } from '../shared/ipc-contracts';
import type {
  ActivitySample,
  ActivityStats,
  AuthLockedOutPayload,
  AuthLoginResult,
  AuthNeedsLoginPayload,
  AuthStatus,
  AuthStatusChangedPayload,
  BreakExpiredPayload,
  BreakExpiringPayload,
  CaptureHealth,
  IdleResolutionNeededPayload,
  IdleResolveArgs,
  NotificationPrefs,
  OnboardingMarkStepArgs,
  OnboardingState,
  OsPermissionKey,
  PermissionKindShort,
  PermissionStatusShort,
  PermissionStatuses,
  ReminderPayload,
  ScreenshotStats,
  ScreenshotTakenEvent,
  SyncErrorPayload,
  SyncProgressPayload,
  SyncStatusDTO,
  TimerBreakStartArgs,
  TimerContractOptionDTO,
  TimerErrorPayload,
  TimerSnapshotDTO,
  TimerStartArgs,
  TimerStopArgs,
  TimerTaskOptionDTO,
  TimerTickPayload,
} from '../shared/ipc-contracts';
import type { AppInfo, PingResult } from '../shared/types';

const dtt = {
  getAppInfo: (): Promise<AppInfo> => ipcRenderer.invoke(IPC.appInfo),
  ping: (echo: string): Promise<PingResult> =>
    ipcRenderer.invoke(IPC.ping, echo),
  listDbTables: (): Promise<string[]> => ipcRenderer.invoke(IPC.dbTablesList),

  permissions: {
    check: (kind: PermissionKindShort): Promise<PermissionStatusShort> =>
      ipcRenderer.invoke(IPC.permissionsCheck, kind),
    request: (kind: PermissionKindShort): Promise<PermissionStatusShort> =>
      ipcRenderer.invoke(IPC.permissionsRequest, kind),
    getAll: (): Promise<PermissionStatuses> =>
      ipcRenderer.invoke(IPC.permissionsGetAll),
    openSettings: (key: OsPermissionKey): Promise<void> =>
      ipcRenderer.invoke(IPC.permissionsOpenSettings, key),
  },

  timer: {
    start: (args: TimerStartArgs): Promise<TimerSnapshotDTO> =>
      ipcRenderer.invoke(IPC.timerStart, args),
    pause: (): Promise<TimerSnapshotDTO> => ipcRenderer.invoke(IPC.timerPause),
    resume: (): Promise<TimerSnapshotDTO> => ipcRenderer.invoke(IPC.timerResume),
    stop: (args?: TimerStopArgs): Promise<TimerSnapshotDTO> =>
      ipcRenderer.invoke(IPC.timerStop, args ?? {}),
    breakStart: (args: TimerBreakStartArgs): Promise<TimerSnapshotDTO> =>
      ipcRenderer.invoke(IPC.timerBreakStart, args),
    breakEnd: (): Promise<TimerSnapshotDTO> =>
      ipcRenderer.invoke(IPC.timerBreakEnd),
    getState: (): Promise<TimerSnapshotDTO> =>
      ipcRenderer.invoke(IPC.timerGetState),
    listContracts: (): Promise<TimerContractOptionDTO[]> =>
      ipcRenderer.invoke(IPC.timerListContracts),
    listTasks: (contractId: string): Promise<TimerTaskOptionDTO[]> =>
      ipcRenderer.invoke(IPC.timerListTasks, contractId),
    resolveIdle: (args: IdleResolveArgs): Promise<TimerSnapshotDTO> =>
      ipcRenderer.invoke(IPC.idleResolve, args),

    onStateChanged: (cb: (snap: TimerSnapshotDTO) => void) => {
      const handler = (_evt: IpcRendererEvent, payload: TimerSnapshotDTO) =>
        cb(payload);
      ipcRenderer.on(IPC.timerStateChanged, handler);
      return () => ipcRenderer.off(IPC.timerStateChanged, handler);
    },
    onTick: (cb: (payload: TimerTickPayload) => void) => {
      const handler = (_evt: IpcRendererEvent, payload: TimerTickPayload) =>
        cb(payload);
      ipcRenderer.on(IPC.timerTick, handler);
      return () => ipcRenderer.off(IPC.timerTick, handler);
    },
    onError: (cb: (payload: TimerErrorPayload) => void) => {
      const handler = (_evt: IpcRendererEvent, payload: TimerErrorPayload) =>
        cb(payload);
      ipcRenderer.on(IPC.timerError, handler);
      return () => ipcRenderer.off(IPC.timerError, handler);
    },
    onIdleResolutionNeeded: (
      cb: (payload: IdleResolutionNeededPayload) => void,
    ) => {
      const handler = (
        _evt: IpcRendererEvent,
        payload: IdleResolutionNeededPayload,
      ) => cb(payload);
      ipcRenderer.on(IPC.idleResolutionNeeded, handler);
      return () => ipcRenderer.off(IPC.idleResolutionNeeded, handler);
    },
    onBreakExpiring: (cb: (payload: BreakExpiringPayload) => void) => {
      const handler = (
        _evt: IpcRendererEvent,
        payload: BreakExpiringPayload,
      ) => cb(payload);
      ipcRenderer.on(IPC.breakExpiring, handler);
      return () => ipcRenderer.off(IPC.breakExpiring, handler);
    },
    onBreakExpired: (cb: (payload: BreakExpiredPayload) => void) => {
      const handler = (_evt: IpcRendererEvent, payload: BreakExpiredPayload) =>
        cb(payload);
      ipcRenderer.on(IPC.breakExpired, handler);
      return () => ipcRenderer.off(IPC.breakExpired, handler);
    },
    onWorkReminder: (cb: (payload: ReminderPayload) => void) => {
      const handler = (_evt: IpcRendererEvent, payload: ReminderPayload) =>
        cb(payload);
      ipcRenderer.on(IPC.timerWorkReminder, handler);
      return () => ipcRenderer.off(IPC.timerWorkReminder, handler);
    },
    onBreakReminder: (cb: (payload: ReminderPayload) => void) => {
      const handler = (_evt: IpcRendererEvent, payload: ReminderPayload) =>
        cb(payload);
      ipcRenderer.on(IPC.timerBreakReminder, handler);
      return () => ipcRenderer.off(IPC.timerBreakReminder, handler);
    },
  },

  auth: {
    login: (args: { email: string; password: string }): Promise<AuthLoginResult> =>
      ipcRenderer.invoke(IPC.authLogin, args),
    logout: (): Promise<void> => ipcRenderer.invoke(IPC.authLogout),
    refresh: (): Promise<boolean> => ipcRenderer.invoke(IPC.authRefresh),
    getStatus: (): Promise<AuthStatus> => ipcRenderer.invoke(IPC.authGetStatus),

    onStatusChanged: (cb: (p: AuthStatusChangedPayload) => void) => {
      const handler = (_evt: IpcRendererEvent, payload: AuthStatusChangedPayload) =>
        cb(payload);
      ipcRenderer.on(IPC.authStatusChanged, handler);
      return () => ipcRenderer.off(IPC.authStatusChanged, handler);
    },
    onNeedsLogin: (cb: (p: AuthNeedsLoginPayload) => void) => {
      const handler = (_evt: IpcRendererEvent, payload: AuthNeedsLoginPayload) =>
        cb(payload);
      ipcRenderer.on(IPC.authNeedsLogin, handler);
      return () => ipcRenderer.off(IPC.authNeedsLogin, handler);
    },
    onLockedOut: (cb: (p: AuthLockedOutPayload) => void) => {
      const handler = (_evt: IpcRendererEvent, payload: AuthLockedOutPayload) =>
        cb(payload);
      ipcRenderer.on(IPC.authLockedOut, handler);
      return () => ipcRenderer.off(IPC.authLockedOut, handler);
    },
    onLoggedIn: (cb: (p: AuthStatus) => void) => {
      const handler = (_evt: IpcRendererEvent, payload: AuthStatus) => cb(payload);
      ipcRenderer.on(IPC.authLoggedIn, handler);
      return () => ipcRenderer.off(IPC.authLoggedIn, handler);
    },
    onLoggedOut: (cb: (p: { reason: string }) => void) => {
      const handler = (_evt: IpcRendererEvent, payload: { reason: string }) =>
        cb(payload);
      ipcRenderer.on(IPC.authLoggedOut, handler);
      return () => ipcRenderer.off(IPC.authLoggedOut, handler);
    },
  },

  capture: {
    captureNow: (): Promise<ScreenshotTakenEvent[]> =>
      ipcRenderer.invoke(IPC.screenshotCaptureNow),
    getScreenshotStats: (): Promise<ScreenshotStats> =>
      ipcRenderer.invoke(IPC.screenshotGetStats),
    deleteScreenshot: (id: string): Promise<void> =>
      ipcRenderer.invoke(IPC.screenshotDelete, id),
    getActivityStats: (): Promise<ActivityStats> =>
      ipcRenderer.invoke(IPC.activityGetStats),
    getRecentActivity: (limit?: number): Promise<ActivitySample[]> =>
      ipcRenderer.invoke(IPC.activityGetRecent, limit),
    getHealth: (): Promise<CaptureHealth> =>
      ipcRenderer.invoke(IPC.captureHealth),
    onScreenshotTaken: (cb: (e: ScreenshotTakenEvent) => void) => {
      const handler = (_evt: IpcRendererEvent, payload: ScreenshotTakenEvent) =>
        cb(payload);
      ipcRenderer.on(IPC.eventScreenshotTaken, handler);
      return () => ipcRenderer.off(IPC.eventScreenshotTaken, handler);
    },
    onActivitySampled: (cb: (s: ActivitySample) => void) => {
      const handler = (_evt: IpcRendererEvent, payload: ActivitySample) =>
        cb(payload);
      ipcRenderer.on(IPC.eventActivitySampled, handler);
      return () => ipcRenderer.off(IPC.eventActivitySampled, handler);
    },
    onHealthChanged: (cb: (h: CaptureHealth) => void) => {
      const handler = (_evt: IpcRendererEvent, payload: CaptureHealth) =>
        cb(payload);
      ipcRenderer.on(IPC.eventCaptureHealthChanged, handler);
      return () => ipcRenderer.off(IPC.eventCaptureHealthChanged, handler);
    },
  },

  onboarding: {
    getState: (): Promise<OnboardingState> =>
      ipcRenderer.invoke(IPC.onboardingGetState),
    markStep: (args: OnboardingMarkStepArgs): Promise<OnboardingState> =>
      ipcRenderer.invoke(IPC.onboardingMarkStep, args),
    complete: (): Promise<OnboardingState> =>
      ipcRenderer.invoke(IPC.onboardingComplete),
    getNotificationPrefs: (): Promise<NotificationPrefs> =>
      ipcRenderer.invoke(IPC.onboardingGetNotificationPrefs),
    setNotificationPrefs: (prefs: NotificationPrefs): Promise<NotificationPrefs> =>
      ipcRenderer.invoke(IPC.onboardingSetNotificationPrefs, prefs),
    onStateChanged: (cb: (s: OnboardingState) => void) => {
      const handler = (_evt: IpcRendererEvent, payload: OnboardingState) =>
        cb(payload);
      ipcRenderer.on(IPC.onboardingStateChanged, handler);
      return () => ipcRenderer.off(IPC.onboardingStateChanged, handler);
    },
  },

  sync: {
    getStatus: (): Promise<SyncStatusDTO> =>
      ipcRenderer.invoke(IPC.syncGetStatus),
    forceRun: (): Promise<SyncStatusDTO> =>
      ipcRenderer.invoke(IPC.syncForceRun),
    onStatusChanged: (cb: (s: SyncStatusDTO) => void) => {
      const handler = (_evt: IpcRendererEvent, payload: SyncStatusDTO) =>
        cb(payload);
      ipcRenderer.on(IPC.syncStatusChanged, handler);
      return () => ipcRenderer.off(IPC.syncStatusChanged, handler);
    },
    onProgress: (cb: (p: SyncProgressPayload) => void) => {
      const handler = (_evt: IpcRendererEvent, payload: SyncProgressPayload) =>
        cb(payload);
      ipcRenderer.on(IPC.syncProgress, handler);
      return () => ipcRenderer.off(IPC.syncProgress, handler);
    },
    onError: (cb: (e: SyncErrorPayload) => void) => {
      const handler = (_evt: IpcRendererEvent, payload: SyncErrorPayload) =>
        cb(payload);
      ipcRenderer.on(IPC.syncError, handler);
      return () => ipcRenderer.off(IPC.syncError, handler);
    },
    onIdle: (cb: () => void) => {
      const handler = (_evt: IpcRendererEvent) => cb();
      ipcRenderer.on(IPC.syncIdle, handler);
      return () => ipcRenderer.off(IPC.syncIdle, handler);
    },
    onOnlineChanged: (cb: (online: boolean) => void) => {
      const handler = (_evt: IpcRendererEvent, payload: boolean) => cb(payload);
      ipcRenderer.on(IPC.netOnlineChanged, handler);
      return () => ipcRenderer.off(IPC.netOnlineChanged, handler);
    },
  },
};

contextBridge.exposeInMainWorld('dtt', dtt);

export type DttBridge = typeof dtt;
