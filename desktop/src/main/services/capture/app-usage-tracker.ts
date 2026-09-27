// src/main/services/capture/app-usage-tracker.ts
//
// AppUsageTracker — records every distinct app seen in the foreground
// across a whole capture interval, not just whichever app happens to be
// frontmost at the exact instant a screenshot fires.
//
// Same "sample periodically, bucket it, flush on demand" shape already
// proven in activity-monitor.ts, sized for a much coarser cadence since
// each sample here is a real OS shell-out (detectActiveAppName, ~200-700ms
// measured), not a near-free API call like getSystemIdleTime().

import type { Logger } from 'pino';
import { detectActiveAppName } from './screenshot-service';

export interface AppUsageTrackerOptions {
  /** How often to sample the foreground app. Default 60s. */
  pollIntervalMs?: number;
}

interface Deps {
  logger: Logger;
  options?: AppUsageTrackerOptions;
  /** Injectable for tests; defaults to the real OS detector. */
  detect?: typeof detectActiveAppName;
}

export interface AppUsageTracker {
  start: () => void;
  stop: () => void;
  /** Distinct app names seen since the last drain (plus one fresh sample); clears state. */
  drain: () => Promise<string[]>;
}

export function createAppUsageTracker(deps: Deps): AppUsageTracker {
  const log = deps.logger.child({ svc: 'app-usage-tracker' });
  const detect = deps.detect ?? detectActiveAppName;
  const pollIntervalMs = deps.options?.pollIntervalMs ?? 60_000;
  const seen = new Set<string>();
  let handle: NodeJS.Timeout | null = null;

  async function sampleOnce(): Promise<void> {
    try {
      const name = await detect();
      if (name) seen.add(name);
    } catch (err) {
      log.debug({ err }, 'sample failed (non-fatal)');
    }
  }

  function start(): void {
    if (handle) return;
    void sampleOnce();
    handle = setInterval(() => void sampleOnce(), pollIntervalMs);
    if (handle.unref) handle.unref();
    log.info({ pollIntervalMs }, 'app usage tracker started');
  }

  function stop(): void {
    if (handle) clearInterval(handle);
    handle = null;
    log.info('app usage tracker stopped');
  }

  async function drain(): Promise<string[]> {
    await sampleOnce(); // catch whatever's frontmost right now before returning
    const result = Array.from(seen);
    seen.clear();
    return result;
  }

  return { start, stop, drain };
}
