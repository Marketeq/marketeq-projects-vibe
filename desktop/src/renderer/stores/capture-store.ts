// src/renderer/stores/capture-store.ts
//
// Zustand store subscribing to the Phase 3 capture events exposed via
// `window.dtt.capture` and `window.dtt.permissions`. Keeps a compact
// view of the capture pipeline for the renderer to consume:
//
//   * screenshotsTakenToday    — mirror of ScreenshotStats.capturedToday
//   * lastCaptureAt            — last screenshot timestamp
//   * activityLevel            — rolling 0..1 level from ActivityStats
//   * permissions              — full long-form permission map
//   * health                   — CaptureHealth snapshot

import { create } from 'zustand';
import type {
  CaptureHealth,
  PermissionStatuses,
} from '../../shared/ipc-contracts';

export interface CaptureStoreState {
  initialized: boolean;
  screenshotsTakenToday: number;
  lastCaptureAt: number | null;
  nextCaptureAt: number | null;
  activityLevel: number;
  permissions: PermissionStatuses | null;
  health: CaptureHealth | null;

  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  captureNow: () => Promise<void>;
  requestPermission: (
    kind: 'screen' | 'accessibility' | 'notifications',
  ) => Promise<void>;
}

export const useCaptureStore = create<CaptureStoreState>((set, get) => ({
  initialized: false,
  screenshotsTakenToday: 0,
  lastCaptureAt: null,
  nextCaptureAt: null,
  activityLevel: 0,
  permissions: null,
  health: null,

  async initialize() {
    if (get().initialized) return;
    await get().refresh();

    // Event subscriptions: each returns an unsubscribe fn; we ignore the
    // returned handles because the store is a singleton for the lifetime
    // of the renderer. If the renderer ever tears down, the channels
    // close naturally.
    window.dtt.capture.onScreenshotTaken(() => {
      void get().refresh();
    });
    window.dtt.capture.onActivitySampled(() => {
      void get().refresh();
    });
    window.dtt.capture.onHealthChanged((h) => {
      set({ health: h });
    });
    set({ initialized: true });
  },

  async refresh() {
    try {
      const [shotStats, actStats, perms, health] = await Promise.all([
        window.dtt.capture.getScreenshotStats(),
        window.dtt.capture.getActivityStats(),
        window.dtt.permissions.getAll(),
        window.dtt.capture.getHealth(),
      ]);
      set({
        screenshotsTakenToday: shotStats.capturedToday,
        lastCaptureAt: shotStats.lastCaptureAt,
        nextCaptureAt: shotStats.nextCaptureAt,
        activityLevel: actStats.activityLevel,
        permissions: perms,
        health,
      });
    } catch (err) {
      // Swallow — the renderer keeps the last good snapshot and the next
      // tick will retry.
      // eslint-disable-next-line no-console
      console.warn('capture-store refresh failed', err);
    }
  },

  async captureNow() {
    try {
      await window.dtt.capture.captureNow();
    } finally {
      await get().refresh();
    }
  },

  async requestPermission(kind) {
    await window.dtt.permissions.request(kind);
    await get().refresh();
  },
}));
