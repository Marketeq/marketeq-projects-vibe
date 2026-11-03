// src/main/services/capture/cleanup-job.ts
//
// Retention sweep per doc 17 §Retention: purge local screenshot rows when
// they are older than N days (default 30, tunable via the
// `dtt.screenshotRetentionDays` preference). Also deletes any JPEG + blur
// file a build from before PMCM-832 wrote to disk.
//
// Runs once at boot and then on a fixed 24-hour timer. All errors are
// logged but never bubble — the loop must survive transient I/O issues.

import fs from 'node:fs';
import type { Logger } from 'pino';
import type { ScreenshotRepo } from '../../db/repos/screenshot.repo';
import type { PreferenceRepo } from '../../db/repos/preference.repo';

export interface CleanupJobOptions {
  defaultRetentionDays?: number;
  tickMs?: number;
  clock?: () => number;
}

interface Deps {
  logger: Logger;
  screenshotRepo: ScreenshotRepo;
  preferenceRepo: PreferenceRepo;
  options?: CleanupJobOptions;
}

export interface CleanupJob {
  start: () => void;
  stop: () => void;
  runOnce: () => { deletedRows: number; deletedFiles: number };
}

const DEFAULT_RETENTION_DAYS = 30;
const DAY_MS = 24 * 3600 * 1000;

export function createCleanupJob(deps: Deps): CleanupJob {
  const log = deps.logger.child({ svc: 'capture-cleanup' });
  const opts = deps.options ?? {};
  const tickMs = opts.tickMs ?? DAY_MS;
  const clock = opts.clock ?? (() => Date.now());
  let handle: NodeJS.Timeout | null = null;

  function resolveRetentionDays(): number {
    try {
      const pref = deps.preferenceRepo.get('dtt.screenshotRetentionDays');
      if (pref) {
        const parsed = JSON.parse(pref.value_json);
        if (typeof parsed === 'number' && parsed > 0) return parsed;
      }
    } catch {
      /* ignore */
    }
    return opts.defaultRetentionDays ?? DEFAULT_RETENTION_DAYS;
  }

  function runOnce(): { deletedRows: number; deletedFiles: number } {
    const now = clock();
    const days = resolveRetentionDays();
    const cutoff = now - days * DAY_MS;
    let deletedRows = 0;
    let deletedFiles = 0;
    const unlinkFiles = (paths: Array<string | null | undefined>): void => {
      for (const p of paths) {
        if (p && typeof p === 'string') {
          try {
            fs.unlinkSync(p);
            deletedFiles += 1;
          } catch (err) {
            const code = (err as { code?: string }).code;
            if (code !== 'ENOENT') {
              log.debug({ err, p }, 'failed to unlink screenshot file');
            }
          }
        }
      }
    };
    try {
      // PMCM-832: screenshots are no longer written to disk. Image files an
      // older build left behind are removed whatever their age; the rows
      // stay until the retention cutoff like any other.
      for (const row of deps.screenshotRepo.listWithLocalFiles()) {
        unlinkFiles([row.local_path, row.blur_path]);
        deps.screenshotRepo.clearLocalFiles(row.id);
      }
      const rows = deps.screenshotRepo.listOlderThan(cutoff);
      for (const row of rows) {
        unlinkFiles([row.local_path, row.blur_path]);
        try {
          deps.screenshotRepo.deleteById(row.id);
          deletedRows += 1;
        } catch (err) {
          log.warn({ err, id: row.id }, 'failed to delete screenshot row');
        }
      }
      log.info({ deletedRows, deletedFiles, days }, 'retention sweep complete');
    } catch (err) {
      log.error({ err }, 'retention sweep failed');
    }
    return { deletedRows, deletedFiles };
  }

  function start(): void {
    if (handle) return;
    runOnce();
    handle = setInterval(runOnce, tickMs);
    if (handle.unref) handle.unref();
    log.info({ tickMs }, 'cleanup job started');
  }

  function stop(): void {
    if (!handle) return;
    clearInterval(handle);
    handle = null;
    log.info('cleanup job stopped');
  }

  return { start, stop, runOnce };
}
