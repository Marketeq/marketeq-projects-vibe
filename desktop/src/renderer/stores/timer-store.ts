// src/renderer/stores/timer-store.ts
//
// Renderer-side single source of truth for timer state (doc 06). Subscribes
// to the main-process broadcast events exposed via window.dtt.timer and
// mirrors the snapshot locally so every component can read via a selector
// without hitting IPC on every render.
//
// This store exposes commands that call the IPC surface. It NEVER touches
// the DB directly — all mutations go through main.

/// <reference path="../dtt-bridge.d.ts" />
import { create } from 'zustand';
import type {
  IdleResolutionNeededPayload,
  TimerBreakStartArgs,
  TimerErrorPayload,
  TimerSnapshotDTO,
  TimerStartArgs,
  TimerStopArgs,
} from '../../shared/ipc-contracts';
import type { IdleResolution } from '../../shared/types';

// ---- store shape -----------------------------------------------------------

export interface TimerStoreState {
  snapshot: TimerSnapshotDTO | null;
  /** Current tick-driven billable seconds (1Hz push from main). */
  elapsedSec: number;
  runningSec: number;
  /** Last error from main, if any. */
  lastError: TimerErrorPayload | null;
  /** Pending idle prompt needing user resolution. */
  pendingIdle: IdleResolutionNeededPayload | null;
  /** True once we've attached listeners + fetched initial state. */
  hydrated: boolean;

  // --- derived helpers (cheap getters) ---
  state: TimerSnapshotDTO['state'] | 'Idle';
  isOnBreak: boolean;
  breakRemainingSec: number | null;
  currentEntryId: string | null;
  contract: { contractId: string; taskId: string } | null;

  // --- actions ---
  hydrate: () => Promise<void>;
  startTimer: (args: TimerStartArgs) => Promise<void>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  stopTimer: (args?: TimerStopArgs) => Promise<void>;
  startBreak: (args: TimerBreakStartArgs) => Promise<void>;
  endBreak: () => Promise<void>;
  resolveIdle: (resolution: IdleResolution) => Promise<void>;
  clearError: () => void;
  clearPendingIdle: () => void;
}

function snapToDerived(snap: TimerSnapshotDTO | null) {
  return {
    state: (snap?.state ?? 'Idle') as TimerSnapshotDTO['state'],
    isOnBreak: snap?.isOnBreak ?? false,
    breakRemainingSec: snap?.breakRemainingSec ?? null,
    currentEntryId: snap?.activeSessionId ?? null,
    contract: snap?.pickedContract ?? null,
  };
}

export const useTimerStore = create<TimerStoreState>((set, get) => ({
  snapshot: null,
  elapsedSec: 0,
  runningSec: 0,
  lastError: null,
  pendingIdle: null,
  hydrated: false,
  ...snapToDerived(null),

  async hydrate() {
    if (get().hydrated) return;
    const bridge = window.dtt?.timer;
    if (!bridge) {
      // Not running inside Electron (e.g. Storybook) — nothing to do.
      set({ hydrated: true });
      return;
    }
    // Attach all listeners FIRST so we don't miss the first broadcast.
    bridge.onStateChanged((snap) => {
      set({
        snapshot: snap,
        elapsedSec: snap.elapsedSec,
        runningSec: snap.runningSec,
        ...snapToDerived(snap),
      });
    });
    bridge.onTick((tick) => {
      set({ elapsedSec: tick.elapsedSec, runningSec: tick.runningSec });
    });
    bridge.onError((err) => set({ lastError: err }));
    bridge.onIdleResolutionNeeded((p) => set({ pendingIdle: p }));
    // Reminders & break expiry land on the same error channel for now — UI
    // surface is TBD; we expose them via a CustomEvent so any component can
    // subscribe without polluting the store.
    bridge.onBreakExpiring((p) =>
      window.dispatchEvent(new CustomEvent('dtt:break-expiring', { detail: p })),
    );
    bridge.onBreakExpired((p) =>
      window.dispatchEvent(new CustomEvent('dtt:break-expired', { detail: p })),
    );
    bridge.onWorkReminder((p) =>
      window.dispatchEvent(new CustomEvent('dtt:work-reminder', { detail: p })),
    );
    bridge.onBreakReminder((p) =>
      window.dispatchEvent(new CustomEvent('dtt:break-reminder', { detail: p })),
    );

    const initial = await bridge.getState();
    set({
      snapshot: initial,
      elapsedSec: initial.elapsedSec,
      runningSec: initial.runningSec,
      hydrated: true,
      ...snapToDerived(initial),
    });
  },

  async startTimer(args) {
    const snap = await window.dtt.timer.start(args);
    set({ snapshot: snap, ...snapToDerived(snap) });
  },
  async pauseTimer() {
    const snap = await window.dtt.timer.pause();
    set({ snapshot: snap, ...snapToDerived(snap) });
  },
  async resumeTimer() {
    const snap = await window.dtt.timer.resume();
    set({ snapshot: snap, ...snapToDerived(snap) });
  },
  async stopTimer(args) {
    const snap = await window.dtt.timer.stop(args);
    set({
      snapshot: snap,
      elapsedSec: 0,
      runningSec: 0,
      ...snapToDerived(snap),
    });
  },
  async startBreak(args) {
    const snap = await window.dtt.timer.breakStart(args);
    set({ snapshot: snap, ...snapToDerived(snap) });
  },
  async endBreak() {
    const snap = await window.dtt.timer.breakEnd();
    set({ snapshot: snap, ...snapToDerived(snap) });
  },
  async resolveIdle(resolution) {
    const snap = await window.dtt.timer.resolveIdle({ resolution });
    set({ snapshot: snap, pendingIdle: null, ...snapToDerived(snap) });
  },
  clearError: () => set({ lastError: null }),
  clearPendingIdle: () => set({ pendingIdle: null }),
}));
