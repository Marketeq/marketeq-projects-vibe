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
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <h2>You were idle for {formatMinutes(payload.seconds)}</h2>
        <p className="modal-sub">{range}</p>
        <p>What would you like to do with that time?</p>
        <div className="modal-actions">
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={() => void handle('keep')}
          >
            Keep it
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handle('discard')}
          >
            Discard
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handle('convert_to_break')}
          >
            Convert to break
          </button>
        </div>
      </div>
    </div>
  );
}
