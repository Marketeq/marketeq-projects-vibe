// src/renderer/views/IdleResolutionModal.tsx
//
// Phase 6 — Modal shown when the timer service emits `idle:resolution-needed`.
// The user chooses what to do with the idle gap: keep as work, discard,
// or convert to break.

import React from 'react';
import type {
  IdleResolutionNeededPayload,
} from '../../shared/ipc-contracts';
import type { IdleResolution } from '../../shared/types';
import { COPY } from '../copy';

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

export interface IdleResolutionModalProps {
  payload: IdleResolutionNeededPayload;
  onResolve: (resolution: IdleResolution) => Promise<void> | void;
}

export function IdleResolutionModal(
  props: IdleResolutionModalProps,
): JSX.Element {
  const { payload, onResolve } = props;
  const [busy, setBusy] = React.useState(false);

  async function handle(r: IdleResolution) {
    setBusy(true);
    try {
      await onResolve(r);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="idle-modal-title"
    >
      <div className="modal">
        <h2 id="idle-modal-title">{COPY.idleModal.heading}</h2>
        <p>
          {COPY.idleModal.body} ({formatDuration(payload.seconds)} idle)
        </p>
        <div className="actions">
          <button
            type="button"
            onClick={() => void handle('discard')}
            disabled={busy}
          >
            {COPY.idleModal.discard}
          </button>
          <button
            type="button"
            onClick={() => void handle('convert_to_break')}
            disabled={busy}
          >
            {COPY.idleModal.convertBreak}
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => void handle('keep')}
            disabled={busy}
          >
            {COPY.idleModal.keep}
          </button>
        </div>
      </div>
    </div>
  );
}
