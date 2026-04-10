// src/renderer/stores/sync-store.ts
//
// Phase 4 — zustand store subscribing to the sync worker events exposed
// through `window.dtt.sync`. Keeps a compact view of the offline queue
// so the renderer can show a SyncQueueIndicator / DiagnosticsScreen:
//
//   * online            — current network state
//   * queueDepth        — pending + inflight rows
//   * deadLetterCount   — rows that blew the retry budget
//   * lastSyncAt        — most recent successful dispatch
//   * lastError         — most recent error message
//   * progress          — latest sync:progress payload (transient)

import { create } from 'zustand';
import type {
  SyncErrorPayload,
  SyncProgressPayload,
  SyncStatusDTO,
} from '../../shared/ipc-contracts';

export interface SyncStoreState {
  initialized: boolean;
  online: boolean;
  running: boolean;
  queueDepth: number;
  deadLetterCount: number;
  lastSyncAt: number | null;
  lastError: string | null;
  progress: SyncProgressPayload | null;
  recentErrors: SyncErrorPayload[];

  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  forceRun: () => Promise<void>;
}

const MAX_RECENT_ERRORS = 20;

function applyStatus(s: SyncStatusDTO): Partial<SyncStoreState> {
  return {
    online: s.online,
    running: s.running,
    queueDepth: s.queueDepth,
    deadLetterCount: s.deadLetterCount,
    lastSyncAt: s.lastSyncAt,
    lastError: s.lastError,
  };
}

export const useSyncStore = create<SyncStoreState>((set, get) => ({
  initialized: false,
  online: true,
  running: false,
  queueDepth: 0,
  deadLetterCount: 0,
  lastSyncAt: null,
  lastError: null,
  progress: null,
  recentErrors: [],

  async initialize() {
    if (get().initialized) return;
    try {
      const status = await window.dtt.sync.getStatus();
      set({ ...applyStatus(status), initialized: true });
    } catch (err) {
      // First refresh can fail during boot — install listeners anyway
      // and retry after they hand us a fresh status.
      // eslint-disable-next-line no-console
      console.warn('sync-store initialize: getStatus failed', err);
      set({ initialized: true });
    }

    window.dtt.sync.onStatusChanged((s) => {
      set(applyStatus(s));
    });
    window.dtt.sync.onProgress((p) => {
      set({ progress: p });
    });
    window.dtt.sync.onError((e) => {
      const recent = [e, ...get().recentErrors].slice(0, MAX_RECENT_ERRORS);
      set({ recentErrors: recent, lastError: e.message });
    });
    window.dtt.sync.onIdle(() => {
      set({ progress: null, running: false });
    });
    window.dtt.sync.onOnlineChanged((online) => {
      set({ online });
    });
  },

  async refresh() {
    try {
      const status = await window.dtt.sync.getStatus();
      set(applyStatus(status));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('sync-store refresh failed', err);
    }
  },

  async forceRun() {
    try {
      const status = await window.dtt.sync.forceRun();
      set(applyStatus(status));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('sync-store forceRun failed', err);
    }
  },
}));
