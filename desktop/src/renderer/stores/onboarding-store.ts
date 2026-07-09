// src/renderer/stores/onboarding-store.ts
//
// Phase 6 — Zustand store wrapping the onboarding IPC surface. The store
// hydrates once on first use and subscribes to state-changed broadcasts
// so every component sees the same progress.

/// <reference path="../dtt-bridge.d.ts" />
import { create } from 'zustand';
import type {
  NotificationPrefs,
  OnboardingMarkStepArgs,
  OnboardingState,
} from '../../shared/ipc-contracts';

const DEFAULT_STATE: OnboardingState = {
  userId: null,
  version: 1,
  completed: false,
  completedAt: null,
  stepsCompleted: {},
};

const DEFAULT_PREFS: NotificationPrefs = {
  workReminders: true,
  breakReminders: true,
  idleAlerts: true,
  syncErrors: true,
  permissionChanges: true,
  authAlerts: true,
};

export interface OnboardingStoreState {
  hydrated: boolean;
  state: OnboardingState;
  prefs: NotificationPrefs;
  hydrate: () => Promise<void>;
  markStep: (args: OnboardingMarkStepArgs) => Promise<void>;
  complete: () => Promise<void>;
  setPrefs: (prefs: NotificationPrefs) => Promise<void>;
}

export const useOnboardingStore = create<OnboardingStoreState>((set, get) => ({
  hydrated: false,
  state: DEFAULT_STATE,
  prefs: DEFAULT_PREFS,

  async hydrate() {
    if (get().hydrated) return;
    const bridge = window.dtt?.onboarding;
    if (!bridge) {
      set({ hydrated: true });
      return;
    }
    bridge.onStateChanged((s) => set({ state: s }));
    try {
      const [state, prefs] = await Promise.all([
        bridge.getState(),
        bridge.getNotificationPrefs(),
      ]);
      set({ state, prefs, hydrated: true });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('onboarding-store hydrate failed', err);
      set({ hydrated: true });
    }
  },

  async markStep(args) {
    const next = await window.dtt.onboarding.markStep(args);
    set({ state: next });
  },

  async complete() {
    const next = await window.dtt.onboarding.complete();
    set({ state: next });
  },

  async setPrefs(prefs) {
    const next = await window.dtt.onboarding.setNotificationPrefs(prefs);
    set({ prefs: next });
  },
}));
