// src/main/services/power-monitor.ts
//
// Phase 8 — System sleep/wake handler using Electron's powerMonitor.
//
// Per doc 05 (DTT-EDGE-SLEEP.*) and doc 08 (DTT-ERR-SYS.02):
//   - On suspend: pause the timer (soft-pause).
//   - On resume: detect clock skew, log warnings, allow the user to resume.
//   - Clock skew detection: if system clock jumps backward, log a warning
//     and do not accrue negative time (doc 05 XCUT.05).

import type { Logger } from 'pino';

export interface PowerMonitorDeps {
  logger: Logger;
  /**
   * Called when the system suspends (sleep/lid close).
   * The timer should be paused.
   */
  onSuspend: () => void;
  /**
   * Called when the system resumes from sleep.
   * Provides the duration of the sleep in seconds (approximate).
   */
  onResume: (sleepDurationSec: number) => void;
  /**
   * Called when a clock skew is detected (wall clock jumped backward).
   */
  onClockSkew?: (skewSec: number) => void;
  /**
   * Threshold in hours for stale session recovery.
   * If a session is older than this after resume, force-stop it.
   */
  staleSessionThresholdHours?: number;
}

export interface PowerMonitorService {
  install(): () => void;
  /** Manually check for clock skew. Returns skew in seconds (negative = backward). */
  checkClockSkew(): number;
}

export function createPowerMonitorService(deps: PowerMonitorDeps): PowerMonitorService {
  const log = deps.logger.child({ svc: 'power-monitor' });
  let lastWallClock = Date.now();
  let lastMonotonic = process.hrtime.bigint();

  function checkClockSkew(): number {
    const nowWall = Date.now();
    const nowMono = process.hrtime.bigint();
    const monoElapsedMs = Number((nowMono - lastMonotonic) / 1_000_000n);
    const wallElapsedMs = nowWall - lastWallClock;
    const skewMs = wallElapsedMs - monoElapsedMs;
    const skewSec = Math.round(skewMs / 1000);

    lastWallClock = nowWall;
    lastMonotonic = nowMono;

    return skewSec;
  }

  function install(): () => void {
    // Dynamically require electron so this can be tested without Electron context.
    interface PowerMonitorPort {
      on: (event: string, cb: () => void) => void;
      removeListener: (event: string, cb: () => void) => void;
    }

    let pm: PowerMonitorPort | null = null;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const electron = require('electron') as {
        powerMonitor: PowerMonitorPort | null;
      };
      pm = electron.powerMonitor;
    } catch {
      log.warn('powerMonitor not available (running outside Electron)');
      return () => {};
    }

    if (!pm) {
      log.warn('powerMonitor is null');
      return () => {};
    }

    // Capture into a const so TypeScript knows it's non-null in closures.
    const monitor = pm;
    let suspendedAt = Date.now();

    const onSuspend = (): void => {
      suspendedAt = Date.now();
      lastWallClock = suspendedAt;
      lastMonotonic = process.hrtime.bigint();
      log.info('system suspend detected — pausing timer');
      try {
        deps.onSuspend();
      } catch (err) {
        log.error({ err }, 'onSuspend callback failed');
      }
    };

    const onResume = (): void => {
      const now = Date.now();
      const sleepDurationSec = Math.max(0, Math.round((now - suspendedAt) / 1000));
      log.info({ sleepDurationSec }, 'system resume detected');

      // Check for clock skew on resume.
      const skew = checkClockSkew();
      if (skew < -5) {
        // Clock jumped backward by more than 5 seconds.
        log.warn(
          { skewSec: skew },
          'clock skew detected (backward jump) — will not accrue negative time',
        );
        deps.onClockSkew?.(skew);
      }

      try {
        deps.onResume(sleepDurationSec);
      } catch (err) {
        log.error({ err }, 'onResume callback failed');
      }
    };

    monitor.on('suspend', onSuspend);
    monitor.on('resume', onResume);
    log.info('power monitor installed');

    return () => {
      try {
        monitor.removeListener('suspend', onSuspend);
        monitor.removeListener('resume', onResume);
      } catch {
        /* ignore */
      }
    };
  }

  return { install, checkClockSkew };
}
