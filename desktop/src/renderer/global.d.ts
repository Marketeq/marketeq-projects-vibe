// src/renderer/global.d.ts
// Declaration-merges additional fields onto the `Window.dtt` bridge for
// the capture + permissions surfaces. App.tsx declares the Phase 1
// subset inline; TypeScript merges both.

import type {
  ActivitySample,
  ActivityStats,
  CaptureHealth,
  OsPermissionKey,
  PermissionKindShort,
  PermissionStatusShort,
  PermissionStatuses,
  ScreenshotStats,
  ScreenshotTakenEvent,
} from '../shared/ipc-contracts';

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
