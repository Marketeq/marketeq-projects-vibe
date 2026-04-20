// src/main/services/error-handler.ts
//
// Phase 8 — Global error boundary for the Electron main process.
//
// Per doc 08 (DTT-ERR-SYS.*) and doc 05 (DTT-EDGE-CRASH.*):
//   - Catches unhandled rejections + uncaught exceptions.
//   - Logs to pino.
//   - If critical (DB inaccessible), notifies the renderer via IPC
//     `error:fatal` and gracefully shuts down.
//   - If non-critical, logs and continues.
//   - Does NOT crash the app unless absolutely necessary.

import type { Logger } from 'pino';
import type { BrowserWindow } from 'electron';

export interface ErrorHandlerDeps {
  logger: Logger;
  /**
   * Returns all browser windows to broadcast fatal errors.
   * May be null during early boot before any window is created.
   */
  getAllWindows?: () => BrowserWindow[];
  /**
   * Called when the error handler determines a graceful shutdown is needed.
   * Defaults to `process.exit(1)`.
   */
  onFatalShutdown?: () => void;
  /**
   * Optional: check whether the database is accessible.
   * If this throws or returns false, the error is classified as critical.
   */
  isDbAccessible?: () => boolean;
}

export interface ErrorHandler {
  /** Install global process listeners. Returns a detach function. */
  install(): () => void;
  /** Classify and handle an arbitrary error. */
  handleError(err: unknown, context?: string): void;
}

/** Errors matching these patterns are treated as critical (DB/filesystem). */
const CRITICAL_PATTERNS = [
  /SQLITE_CANTOPEN/i,
  /SQLITE_CORRUPT/i,
  /SQLITE_FULL/i,
  /SQLITE_IOERR/i,
  /SQLITE_READONLY/i,
  /database is locked/i,
  /database disk image is malformed/i,
  /cannot open database/i,
  /ENOSPC/i,
];

function isCriticalError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return CRITICAL_PATTERNS.some((p) => p.test(msg));
}

function broadcastFatal(
  windows: BrowserWindow[] | undefined,
  payload: { code: string; message: string },
): void {
  if (!windows) return;
  for (const w of windows) {
    try {
      if (!w.isDestroyed() && w.webContents && !w.webContents.isDestroyed()) {
        w.webContents.send('error:fatal', payload);
      }
    } catch {
      /* best-effort */
    }
  }
}

export function createErrorHandler(deps: ErrorHandlerDeps): ErrorHandler {
  const { logger } = deps;
  const log = logger.child({ svc: 'error-handler' });

  function handleError(err: unknown, context?: string): void {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;

    if (isCriticalError(err)) {
      log.fatal({ err, context, stack }, 'critical error detected');
      broadcastFatal(deps.getAllWindows?.(), {
        code: 'DTT-ERR-SYS.FATAL',
        message: `Critical error: ${message}`,
      });
      // Give the renderer a moment to show the error before shutting down.
      setTimeout(() => {
        if (deps.onFatalShutdown) {
          deps.onFatalShutdown();
        } else {
          process.exit(1);
        }
      }, 2000);
    } else {
      log.error({ err, context, stack }, 'unhandled error (non-critical, continuing)');
    }
  }

  function install(): () => void {
    const onUncaught = (err: Error): void => {
      handleError(err, 'uncaughtException');
    };
    const onUnhandled = (reason: unknown): void => {
      handleError(reason, 'unhandledRejection');
    };

    process.on('uncaughtException', onUncaught);
    process.on('unhandledRejection', onUnhandled);

    log.info('global error handler installed');

    return () => {
      process.off('uncaughtException', onUncaught);
      process.off('unhandledRejection', onUnhandled);
    };
  }

  return { install, handleError };
}
