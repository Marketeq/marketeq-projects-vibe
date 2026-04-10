// src/main/services/capture/activity-monitor.ts
//
// ActivityMonitor — records per-minute activity booleans for the active
// session. Implements doc 17 §6 (Activity Recorder) as an idle-time-only
// heuristic, which doc 17 §6 explicitly allows. The native hook path
// was rejected because `uiohook-napi` and `node-global-key-listener`
// both require elevated prebuilt binaries that do not install cleanly
// on macOS arm64 + Windows x64 in CI. Switching to `powerMonitor.
// getSystemIdleTime()` keeps the dependency surface pure-Electron and
// satisfies the privacy guarantee `DTT-D-009` that **no keystroke data
// leaves the device**.
//
// The monitor:
//   * Polls `getSystemIdleTime()` every second (cheap — tens of µs).
//   * Aggregates into a bucket "was there any input in this interval?"
//     defaulting to a 10-second interval (matches spec).
//   * On every minute boundary, persists one row into `activity_minute`
//     as per the existing Phase 1 schema.
//
// No native hook, no keystroke capture, no mouse-content capture.

import { EventEmitter } from 'node:events';
import { v4 as uuid } from 'uuid';
import type { Logger } from 'pino';
import type { ActivityRepo } from '../../db/repos/activity.repo';
import type { PreferenceRepo } from '../../db/repos/preference.repo';
import type {
  ActivitySample,
  ActivityStats,
} from '../../../shared/ipc-contracts';

interface ElectronPowerSurface {
  powerMonitor: { getSystemIdleTime: () => number };
}

function loadElectron(): ElectronPowerSurface | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('electron') as ElectronPowerSurface;
  } catch {
    return null;
  }
}

export interface ActivityMonitorOptions {
  sampleIntervalMs?: number; // default 1000
  bucketIntervalMs?: number; // default 10_000 (doc 17: typical 10s)
  minuteWindowMs?: number; // default 60_000 (persisted granularity)
}

interface Deps {
  logger: Logger;
  activityRepo: ActivityRepo;
  preferenceRepo: PreferenceRepo;
  options?: ActivityMonitorOptions;
  electron?: ElectronPowerSurface | null;
  resolveSessionId?: () => string | null;
}

export interface ActivityMonitor {
  start: () => void;
  stop: () => void;
  getStats: () => ActivityStats;
  getRecent: (limit?: number) => ActivitySample[];
  subscribe: (cb: (s: ActivitySample) => void) => () => void;
}

export function createActivityMonitor(deps: Deps): ActivityMonitor {
  const log = deps.logger.child({ svc: 'activity' });
  const opts = deps.options ?? {};
  const sampleIntervalMs = opts.sampleIntervalMs ?? 1000;
  const bucketIntervalMs = opts.bucketIntervalMs ?? 10_000;
  const minuteWindowMs = opts.minuteWindowMs ?? 60_000;
  const electron = deps.electron ?? loadElectron();
  const bus = new EventEmitter();

  let handle: NodeJS.Timeout | null = null;
  let currentMinuteStart = -1;
  let currentMinuteHadInput = false;
  let sampledCount = 0;
  let activeCount = 0;
  let idleCount = 0;
  let lastSampleAt: number | null = null;
  const recentSamples: ActivitySample[] = [];
  const recentBucketResults: boolean[] = []; // last 10 for rolling level

  function resolveSessionId(): string | null {
    if (deps.resolveSessionId) return deps.resolveSessionId();
    try {
      const pref = deps.preferenceRepo.get('dtt.activeSessionId');
      if (!pref) return null;
      const v = JSON.parse(pref.value_json) as string | null;
      return v ?? null;
    } catch {
      return null;
    }
  }

  function flushMinute(minuteStart: number, hadInput: boolean): void {
    const sessionId = resolveSessionId();
    if (!sessionId) return;
    const id = `act_${uuid()}`;
    try {
      deps.activityRepo.upsert({
        id,
        session_id: sessionId,
        minute_start_at: minuteStart,
        active: hadInput ? 1 : 0,
        synced_at: null,
      });
    } catch (err) {
      log.warn({ err }, 'failed to persist activity minute');
      return;
    }
    const sample: ActivitySample = {
      id,
      sessionId,
      sampledAt: minuteStart,
      active: hadInput,
    };
    recentSamples.push(sample);
    if (recentSamples.length > 120) recentSamples.shift();
    recentBucketResults.push(hadInput);
    if (recentBucketResults.length > 10) recentBucketResults.shift();
    sampledCount += 1;
    if (hadInput) activeCount += 1;
    else idleCount += 1;
    lastSampleAt = minuteStart;
    bus.emit('sample', sample);
  }

  function tick(): void {
    const now = Date.now();
    const minute = Math.floor(now / minuteWindowMs) * minuteWindowMs;
    if (currentMinuteStart < 0) currentMinuteStart = minute;

    if (electron) {
      try {
        // idle time is in seconds; < bucketInterval (in seconds) means at
        // least one input event occurred within the bucket window.
        const idleSec = electron.powerMonitor.getSystemIdleTime();
        if (idleSec * 1000 < bucketIntervalMs) {
          currentMinuteHadInput = true;
        }
      } catch (err) {
        log.debug({ err }, 'powerMonitor.getSystemIdleTime failed');
      }
    }

    if (minute !== currentMinuteStart) {
      flushMinute(currentMinuteStart, currentMinuteHadInput);
      currentMinuteStart = minute;
      currentMinuteHadInput = false;
    }
  }

  function start(): void {
    if (handle) return;
    currentMinuteStart = -1;
    currentMinuteHadInput = false;
    handle = setInterval(tick, sampleIntervalMs);
    log.info({ sampleIntervalMs, bucketIntervalMs }, 'activity monitor started');
  }

  function stop(): void {
    if (!handle) return;
    clearInterval(handle);
    handle = null;
    // Flush any in-flight minute so we don't lose the partial bucket.
    if (currentMinuteStart > 0) {
      flushMinute(currentMinuteStart, currentMinuteHadInput);
    }
    currentMinuteStart = -1;
    log.info('activity monitor stopped');
  }

  function getStats(): ActivityStats {
    const total = recentBucketResults.length;
    const activeInWindow = recentBucketResults.filter(Boolean).length;
    const level = total === 0 ? 0 : activeInWindow / total;
    return {
      sampledCount,
      activeCount,
      idleCount,
      lastSampleAt,
      activityLevel: Math.max(0, Math.min(1, level)),
      isRunning: handle !== null,
    };
  }

  function getRecent(limit = 20): ActivitySample[] {
    return recentSamples.slice(-limit);
  }

  return {
    start,
    stop,
    getStats,
    getRecent,
    subscribe(cb) {
      bus.on('sample', cb);
      return () => bus.off('sample', cb);
    },
  };
}

// ---- Pure helpers for unit tests ---------------------------------------

export interface BucketSample {
  t: number;
  idleSec: number;
}

export function aggregateBucket(
  samples: BucketSample[],
  bucketIntervalMs: number,
): boolean {
  // The bucket is considered "active" iff at least one sample reports
  // idleSec < bucketIntervalMs/1000.
  const threshold = bucketIntervalMs / 1000;
  return samples.some((s) => s.idleSec < threshold);
}

export function aggregateMinute(buckets: boolean[]): boolean {
  return buckets.some(Boolean);
}

export function rollingLevel(buckets: boolean[], window: number): number {
  if (buckets.length === 0 || window <= 0) return 0;
  const slice = buckets.slice(-window);
  const active = slice.filter(Boolean).length;
  return slice.length === 0 ? 0 : active / slice.length;
}
