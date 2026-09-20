// src/renderer/dtt-bridge.d.ts
//
// Ambient declaration for the `window.dtt` bridge injected by the preload
// script (src/preload/index.ts). Every renderer file should import types
// from `@shared/ipc-contracts` and use this ambient window typing rather
// than redeclaring the bridge locally.
//
// NOTE: The shape here is intentionally a superset of every namespace —
// the preload is the source of truth. If you add a namespace, add it here.

import type {
  ActivitySample,
  ActivityStats,
  AuthLockedOutPayload,
  AuthLoginResult,
  AuthNeedsLoginPayload,
  AuthStatus,
  AuthStatusChangedPayload,
  BackendContract,
  BackendTask,
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
  TimerErrorPayload,
  TimerSnapshotDTO,
  TimerStartArgs,
  TimerStopArgs,
  TimerTickPayload,
  TodayStatsDTO,
} from '../shared/ipc-contracts';
import type { AppInfo, PingResult } from '../shared/types';

export interface DttTimerBridge {
  start: (args: TimerStartArgs) => Promise<TimerSnapshotDTO>;
  pause: () => Promise<TimerSnapshotDTO>;
  resume: () => Promise<TimerSnapshotDTO>;
  stop: (args?: TimerStopArgs) => Promise<TimerSnapshotDTO>;
  breakStart: (args: TimerBreakStartArgs) => Promise<TimerSnapshotDTO>;
  breakEnd: () => Promise<TimerSnapshotDTO>;
  getState: () => Promise<TimerSnapshotDTO>;
  resolveIdle: (args: IdleResolveArgs) => Promise<TimerSnapshotDTO>;
  onStateChanged: (cb: (snap: TimerSnapshotDTO) => void) => () => void;
  onTick: (cb: (p: TimerTickPayload) => void) => () => void;
  onError: (cb: (p: TimerErrorPayload) => void) => () => void;
  onIdleResolutionNeeded: (
    cb: (p: IdleResolutionNeededPayload) => void,
  ) => () => void;
  onBreakExpiring: (cb: (p: BreakExpiringPayload) => void) => () => void;
  onBreakExpired: (cb: (p: BreakExpiredPayload) => void) => () => void;
  onWorkReminder: (cb: (p: ReminderPayload) => void) => () => void;
  onBreakReminder: (cb: (p: ReminderPayload) => void) => () => void;
}

export interface DttCaptureBridge {
  captureNow: () => Promise<ScreenshotTakenEvent[]>;
  getScreenshotStats: () => Promise<ScreenshotStats>;
  deleteScreenshot: (id: string) => Promise<void>;
  getActivityStats: () => Promise<ActivityStats>;
  getRecentActivity: (limit?: number) => Promise<ActivitySample[]>;
  getHealth: () => Promise<CaptureHealth>;
  onScreenshotTaken: (cb: (e: ScreenshotTakenEvent) => void) => () => void;
  onActivitySampled: (cb: (s: ActivitySample) => void) => () => void;
  onHealthChanged: (cb: (h: CaptureHealth) => void) => () => void;
}

export interface DttPermissionsBridge {
  check: (kind: PermissionKindShort) => Promise<PermissionStatusShort>;
  request: (kind: PermissionKindShort) => Promise<PermissionStatusShort>;
  getAll: () => Promise<PermissionStatuses>;
  openSettings: (key: OsPermissionKey) => Promise<void>;
}

export interface DttAuthBridge {
  login: (args: { email: string; password: string }) => Promise<AuthLoginResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  getStatus: () => Promise<AuthStatus>;
  onStatusChanged: (cb: (p: AuthStatusChangedPayload) => void) => () => void;
  onNeedsLogin: (cb: (p: AuthNeedsLoginPayload) => void) => () => void;
  onLockedOut: (cb: (p: AuthLockedOutPayload) => void) => () => void;
  onLoggedIn: (cb: (p: AuthStatus) => void) => () => void;
  onLoggedOut: (cb: (p: { reason: string }) => void) => () => void;
}

export interface DttSyncBridge {
  getStatus: () => Promise<SyncStatusDTO>;
  forceRun: () => Promise<SyncStatusDTO>;
  onStatusChanged: (cb: (s: SyncStatusDTO) => void) => () => void;
  onProgress: (cb: (p: SyncProgressPayload) => void) => () => void;
  onError: (cb: (e: SyncErrorPayload) => void) => () => void;
  onIdle: (cb: () => void) => () => void;
  onOnlineChanged: (cb: (online: boolean) => void) => () => void;
}

export interface DttOnboardingBridge {
  getState: () => Promise<OnboardingState>;
  markStep: (args: OnboardingMarkStepArgs) => Promise<OnboardingState>;
  complete: () => Promise<OnboardingState>;
  getNotificationPrefs: () => Promise<NotificationPrefs>;
  setNotificationPrefs: (prefs: NotificationPrefs) => Promise<NotificationPrefs>;
  onStateChanged: (cb: (s: OnboardingState) => void) => () => void;
}

export interface DttContractsBridge {
  getMine: () => Promise<BackendContract[]>;
  getTasks: (contractId: string) => Promise<BackendTask[]>;
}

export interface DttStatsBridge {
  getToday: () => Promise<TodayStatsDTO>;
}

export interface DttBridgeGlobal {
  getAppInfo: () => Promise<AppInfo>;
  ping: (echo: string) => Promise<PingResult>;
  listDbTables: () => Promise<string[]>;
  shell: {
    openExternal: (url: string) => Promise<void>;
  };
  timer: DttTimerBridge;
  capture: DttCaptureBridge;
  permissions: DttPermissionsBridge;
  auth: DttAuthBridge;
  contracts: DttContractsBridge;
  stats: DttStatsBridge;
  sync: DttSyncBridge;
  onboarding: DttOnboardingBridge;
}

declare global {
  interface Window {
    dtt: DttBridgeGlobal;
  }
}

export {};
