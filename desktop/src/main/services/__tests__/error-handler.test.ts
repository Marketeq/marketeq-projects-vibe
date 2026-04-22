// src/main/services/__tests__/error-handler.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createErrorHandler } from '../error-handler';
import pino from 'pino';

const nullLogger = pino({ level: 'silent' });

describe('ErrorHandler', () => {
  let originalListeners: {
    uncaughtException: Function[];
    unhandledRejection: Function[];
  };

  beforeEach(() => {
    // Save original listeners to restore later.
    originalListeners = {
      uncaughtException: process.listeners('uncaughtException') as Function[],
      unhandledRejection: process.listeners('unhandledRejection') as Function[],
    };
  });

  afterEach(() => {
    // Restore original listeners.
    process.removeAllListeners('uncaughtException');
    process.removeAllListeners('unhandledRejection');
    for (const fn of originalListeners.uncaughtException) {
      process.on('uncaughtException', fn as NodeJS.UncaughtExceptionListener);
    }
    for (const fn of originalListeners.unhandledRejection) {
      process.on('unhandledRejection', fn as NodeJS.UnhandledRejectionListener);
    }
  });

  it('installs and detaches process listeners', () => {
    const handler = createErrorHandler({ logger: nullLogger });
    const initialCount = process.listenerCount('uncaughtException');
    const detach = handler.install();
    expect(process.listenerCount('uncaughtException')).toBe(initialCount + 1);
    expect(process.listenerCount('unhandledRejection')).toBeGreaterThan(0);
    detach();
    expect(process.listenerCount('uncaughtException')).toBe(initialCount);
  });

  it('classifies SQLITE errors as critical and calls onFatalShutdown', () => {
    vi.useFakeTimers();
    const onFatal = vi.fn();
    const handler = createErrorHandler({
      logger: nullLogger,
      onFatalShutdown: onFatal,
    });

    handler.handleError(new Error('SQLITE_CANTOPEN: unable to open database'));
    expect(onFatal).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2500);
    expect(onFatal).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('classifies ENOSPC as critical', () => {
    vi.useFakeTimers();
    const onFatal = vi.fn();
    const handler = createErrorHandler({
      logger: nullLogger,
      onFatalShutdown: onFatal,
    });

    handler.handleError(new Error('ENOSPC: no space left on device'));
    vi.advanceTimersByTime(2500);
    expect(onFatal).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('does NOT call onFatalShutdown for non-critical errors', () => {
    vi.useFakeTimers();
    const onFatal = vi.fn();
    const handler = createErrorHandler({
      logger: nullLogger,
      onFatalShutdown: onFatal,
    });

    handler.handleError(new Error('some random error'));
    vi.advanceTimersByTime(5000);
    expect(onFatal).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('broadcasts fatal errors to browser windows', () => {
    vi.useFakeTimers();
    const sendMock = vi.fn();
    const mockWindow = {
      isDestroyed: () => false,
      webContents: {
        isDestroyed: () => false,
        send: sendMock,
      },
    };
    const handler = createErrorHandler({
      logger: nullLogger,
      getAllWindows: () => [mockWindow] as never[],
      onFatalShutdown: vi.fn(),
    });

    handler.handleError(new Error('SQLITE_CORRUPT: database is corrupt'));
    expect(sendMock).toHaveBeenCalledWith('error:fatal', {
      code: 'DTT-ERR-SYS.FATAL',
      message: 'Critical error: SQLITE_CORRUPT: database is corrupt',
    });
    vi.useRealTimers();
  });

  it('handles non-Error thrown values', () => {
    const handler = createErrorHandler({ logger: nullLogger });
    // Should not throw.
    handler.handleError('string error');
    handler.handleError(42);
    handler.handleError(null);
    handler.handleError(undefined);
  });

  it('classifies database disk image is malformed as critical', () => {
    vi.useFakeTimers();
    const onFatal = vi.fn();
    const handler = createErrorHandler({
      logger: nullLogger,
      onFatalShutdown: onFatal,
    });
    handler.handleError(new Error('database disk image is malformed'));
    vi.advanceTimersByTime(2500);
    expect(onFatal).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
