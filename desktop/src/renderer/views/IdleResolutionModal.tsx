// src/renderer/views/IdleResolutionModal.tsx
//
// Phase 6 — Idle resolution modal. Shown when the timer FSM reports an
// idle window (no keyboard/mouse activity past the threshold) and asks
// the user what to do with the idle time: keep it, discard it, or
// convert it to a retroactive break.

import React from 'react';
import type { IdleResolutionNeededPayload } from '../../shared/ipc-contracts';
import type { IdleResolution } from '../../shared/types';

interface Props {
  payload: IdleResolutionNeededPayload;
  onResolve: (resolution: IdleResolution) => Promise<void> | void;
}

function formatMinutes(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

export function IdleResolutionModal({ payload, onResolve }: Props): JSX.Element {
  const [busy, setBusy] = React.useState(false);

  async function handle(resolution: IdleResolution) {
    if (busy) return;
    setBusy(true);
    try {
      await onResolve(resolution);
    } finally {
      setBusy(false);
    }
  }

  const range = `${new Date(payload.startedAt).toLocaleTimeString()} – ${new Date(
    payload.endedAt,
  ).toLocaleTimeString()}`;

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-[360px] rounded-lg bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.12)] border border-gray-100">
        <h2 className="text-base font-semibold text-dark-blue-400">
          You were idle for {formatMinutes(payload.seconds)}
        </h2>
        <p className="mt-1 text-xs text-gray-400">{range}</p>
        <p className="mt-3 text-sm text-dark-blue-400">What would you like to do with that time?</p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handle('keep')}
            className="w-full rounded-full bg-primary-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-600 disabled:opacity-50"
          >
            Keep it
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handle('discard')}
            className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-dark-blue-400 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Discard
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handle('convert_to_break')}
            className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-dark-blue-400 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Convert to break
          </button>
        </div>
      </div>
    </div>
  );
}
