// frontend/src/lib/api/one-shot.ts
//
// A single delayed call that can be cancelled: the only timer the status refresher uses, and only
// as a bounded one-shot (never repeated, never an interval). Kept apart so status-refresh.ts itself
// stays free of timers and tests can substitute their own.
export type CancelOneShot = () => void

export function scheduleOneShot(
  run: () => void,
  delayMs: number
): CancelOneShot {
  const handle = setTimeout(run, Math.max(0, delayMs))
  return () => clearTimeout(handle)
}
