// src/renderer/stores/updater-store.ts
// Phase 7 — Zustand store for auto-updater status.

import { create } from 'zustand';
import type { UpdaterStatusDTO, UpdaterProgressInfo } from '../../shared/ipc-contracts';

interface UpdaterStore {
  status: UpdaterStatusDTO | null;
  progress: UpdaterProgressInfo | null;
  lastError: string | null;

  // actions
  setStatus: (s: UpdaterStatusDTO) => void;
  setProgress: (p: UpdaterProgressInfo) => void;
  setError: (msg: string) => void;
  init: () => () => void;
}

const dtt = (window as unknown as { dtt: { updater: {
  getStatus: () => Promise<UpdaterStatusDTO>;
  onStatusChanged: (cb: (s: UpdaterStatusDTO) => void) => () => void;
  onProgress: (cb: (p: UpdaterProgressInfo) => void) => () => void;
  onError: (cb: (msg: string) => void) => () => void;
} } }).dtt;

export const useUpdaterStore = create<UpdaterStore>((set) => ({
  status: null,
  progress: null,
  lastError: null,

  setStatus: (s) => set({ status: s, progress: null }),
  setProgress: (p) => set({ progress: p }),
  setError: (msg) => set({ lastError: msg }),

  init: () => {
    // Fetch initial status
    dtt.updater.getStatus().then((s) => set({ status: s })).catch(() => {});

    const unsub1 = dtt.updater.onStatusChanged((s) => set({ status: s, progress: null }));
    const unsub2 = dtt.updater.onProgress((p) => set({ progress: p }));
    const unsub3 = dtt.updater.onError((msg) => set({ lastError: msg }));

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  },
}));
