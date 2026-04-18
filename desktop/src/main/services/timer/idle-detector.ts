// src/main/services/timer/idle-detector.ts
//
// Polls Electron's powerMonitor.getSystemIdleTime() every 5 seconds and
// raises IDLE_DETECTED when the user has been idle longer than the
// configured threshold (default: 5 minutes, per doc 20 §6.1).
//
// Also subscribes to powerMonitor lifecycle events:
//   suspend / lock-screen     -> treated as implicit pause via SYSTEM_SUSPEND / SYSTEM_LOCK
//   resume  / unlock-screen   -> raises SYSTEM_RESUME / SYSTEM_UNLOCK (renderer prompts user)
//
// The detector is *pure-observer*: it only emits events to a caller-provided
// dispatch function. It never touches the FSM or DB directly.

const DEFAULT_POLL_MS = 5_000;
const DEFAULT_THRESHOLD_SEC = 5 * 60;

export interface IdleDetectorOptions {
  thresholdSeconds?: number;
  pollMs?: number;
  /** Called when the user transitions from active -> idle past threshold. */
  onIdleDetected: (payload: { idleStartedAt: number; idleSeconds: number }) => void;
  /** Called when the user transitions back from idle -> active. */
  onActive?: () => void;
  onSuspend?: () => void;
  onResume?: () => void;
  onLock?: () => void;
  onUnlock?: () => void;
  /** Supply for testing; defaults to Electron powerMonitor. */
  powerMonitorAdapter?: PowerMonitorLike;
  /** Only fire IDLE_DETECTED while this returns true (e.g. when FSM state is Running). */
  shouldFire?: () => boolean;
}

export interface PowerMonitorLike {
  getSystemIdleTime(): number;
  on(event: 'suspend' | 'resume' | 'lock-screen' | 'unlock-screen', cb: () => void): void;
  off?(event: string, cb: () => void): void;
  removeListener?(event: string, cb: () => void): void;
}

export function createIdleDetector(opts: IdleDetectorOptions) {
  const threshold = opts.thresholdSeconds ?? DEFAULT_THRESHOLD_SEC;
  const pollMs = opts.pollMs ?? DEFAULT_POLL_MS;
  const shouldFire = opts.shouldFire ?? (() => true);

  let handle: NodeJS.Timeout | null = null;
  let firedIdle = false; // hysteresis — don't re-fire until we see activity

  let pm: PowerMonitorLike | null = opts.powerMonitorAdapter ?? null;

  // -- lifecycle handlers wired once on start(), unwired on stop() ------------
  const suspendHandler = () => opts.onSuspend?.();
  const resumeHandler = () => {
    firedIdle = false;
    opts.onResume?.();
  };
  const lockHandler = () => opts.onLock?.();
  const unlockHandler = () => {
    firedIdle = false;
    opts.onUnlock?.();
  };

  function tick() {
    if (!pm) return;
    if (!shouldFire()) {
      // Reset hysteresis whenever the FSM leaves the fire-eligible state, so
      // the next Running session starts fresh.
      firedIdle = false;
      return;
    }
    const idleSec = pm.getSystemIdleTime();
    if (idleSec >= threshold && !firedIdle) {
      firedIdle = true;
      opts.onIdleDetected({
        idleStartedAt: Date.now() - idleSec * 1000,
        idleSeconds: idleSec,
      });
    } else if (idleSec < 1 && firedIdle) {
      firedIdle = false;
      opts.onActive?.();
    }
  }

  function start() {
    if (handle) return;
    if (!pm) {
      // Lazy import of Electron so unit tests can instantiate without an
      // Electron context.
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const electron = require('electron') as { powerMonitor: PowerMonitorLike };
        pm = electron.powerMonitor;
      } catch {
        pm = null;
      }
    }
    if (pm) {
      pm.on('suspend', suspendHandler);
      pm.on('resume', resumeHandler);
      pm.on('lock-screen', lockHandler);
      pm.on('unlock-screen', unlockHandler);
    }
    handle = setInterval(tick, pollMs);
  }

  function stop() {
    if (handle) {
      clearInterval(handle);
      handle = null;
    }
    if (pm) {
      const rm =
        (pm.off?.bind(pm) as typeof pm.off) ??
        (pm.removeListener?.bind(pm) as typeof pm.removeListener);
      if (rm) {
        rm('suspend', suspendHandler);
        rm('resume', resumeHandler);
        rm('lock-screen', lockHandler);
        rm('unlock-screen', unlockHandler);
      }
    }
    firedIdle = false;
  }

  function reset() {
    firedIdle = false;
  }

  return { start, stop, reset };
}

export type IdleDetector = ReturnType<typeof createIdleDetector>;
