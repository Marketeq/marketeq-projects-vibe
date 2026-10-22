// src/renderer/views/CrashRecoveryModal.tsx
//
// Crash recovery prompt (doc 01 §18, DTT-US-131/132/133). Shown on launch
// when the app didn't shut down cleanly and left an unfinished session. It is
// modal and blocks the main view; nothing is decided silently. Same layout
// and button styles as IdleResolutionModal.
//
//   Recover  → the session comes back Paused at its last checkpoint; the
//              talent presses Resume (with the countdown) to continue.
//   Discard  → the session is closed at the crash point; nothing after the
//              crash is billed.

import React from 'react';
import type { CrashRecoveryDTO } from '../../shared/ipc-contracts';

interface Props {
  info: CrashRecoveryDTO;
  onRecover: () => Promise<boolean> | boolean;
  onDiscard: () => Promise<boolean> | boolean;
  /** Closes the modal after the Discard confirmation. */
  onDone: () => void;
}

function formatHms(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export function CrashRecoveryModal({ info, onRecover, onDiscard, onDone }: Props): JSX.Element {
  const [busy, setBusy] = React.useState(false);
  const [discarded, setDiscarded] = React.useState(false);

  async function handle(action: () => Promise<boolean> | boolean, after: (ok: boolean) => void) {
    if (busy) return;
    setBusy(true);
    try {
      after(await action());
    } finally {
      setBusy(false);
    }
  }

  const task = info.taskName ?? 'a task';
  const contract = info.contractName ?? 'your contract';

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-[360px] rounded-lg bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.12)] border border-gray-100">
        {discarded ? (
          <>
            <h2 className="text-base font-semibold text-dark-blue-400">Session discarded</h2>
            <p className="mt-3 text-sm text-dark-blue-400">
              Your unfinished session was closed. Nothing after the crash was billed.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={onDone}
                className="w-full rounded-full bg-primary-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-600"
              >
                OK
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-base font-semibold text-dark-blue-400">
              Marketeq Projects didn&apos;t shut down cleanly
            </h2>
            <p className="mt-3 text-sm text-dark-blue-400">
              We have an unfinished session for {task} on {contract} with {formatHms(info.elapsedSec)} of
              tracked time. Recover this session, or discard?
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                disabled={busy || !info.canRecover}
                title={
                  info.canRecover
                    ? undefined
                    : 'Contract was paused while you were away. Recover and stop instead?'
                }
                onClick={() => void handle(onRecover, (ok) => { if (ok) onDone(); })}
                className="w-full rounded-full bg-primary-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-600 disabled:opacity-50"
              >
                Recover
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handle(onDiscard, (ok) => { if (ok) setDiscarded(true); })}
                className="w-full rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-dark-blue-400 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Discard
              </button>
            </div>
            {!info.canRecover && (
              <p className="mt-3 text-xs text-gray-400">
                Contract was paused while you were away. Recover and stop instead?
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
