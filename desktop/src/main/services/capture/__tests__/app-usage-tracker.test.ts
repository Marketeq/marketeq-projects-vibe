// src/main/services/capture/__tests__/app-usage-tracker.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAppUsageTracker } from '../app-usage-tracker';

const logger = { child: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn() }) } as any;

describe('createAppUsageTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('drain returns distinct app names seen and clears afterward', async () => {
    const names = ['Google Chrome', 'Visual Studio Code', 'Google Chrome'];
    let i = 0;
    const detect = vi.fn(async () => names[Math.min(i++, names.length - 1)]);
    const tracker = createAppUsageTracker({ logger, detect: detect as any });

    tracker.start(); // samples once immediately: "Google Chrome"
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(60_000); // "Visual Studio Code"
    await vi.advanceTimersByTimeAsync(60_000); // "Google Chrome"

    const result = await tracker.drain(); // one more fresh sample too
    expect(result.sort()).toEqual(['Google Chrome', 'Visual Studio Code']);

    const second = await tracker.drain();
    expect(second.length).toBeLessThanOrEqual(1); // cleared; only the fresh sample from drain() itself
  });

  it('does not sample on an interval before start() is called', async () => {
    const detect = vi.fn(async () => 'Slack');
    const tracker = createAppUsageTracker({ logger, detect: detect as any });
    await vi.advanceTimersByTimeAsync(120_000);
    expect(detect).not.toHaveBeenCalled();
  });

  it('stop() halts further polling', async () => {
    const detect = vi.fn(async () => 'Slack');
    const tracker = createAppUsageTracker({ logger, detect: detect as any });
    tracker.start();
    await vi.advanceTimersByTimeAsync(0);
    tracker.stop();
    const callsAfterStop = detect.mock.calls.length;
    await vi.advanceTimersByTimeAsync(300_000);
    expect(detect.mock.calls.length).toBe(callsAfterStop);
  });

  it('a null detection result is never added to the seen set', async () => {
    const detect = vi.fn(async () => null);
    const tracker = createAppUsageTracker({ logger, detect: detect as any });
    tracker.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(await tracker.drain()).toEqual([]);
  });

  it('a throwing detector does not crash sampling', async () => {
    const detect = vi.fn(async () => {
      throw new Error('boom');
    });
    const tracker = createAppUsageTracker({ logger, detect: detect as any });
    expect(() => tracker.start()).not.toThrow();
    await vi.advanceTimersByTimeAsync(0);
    await expect(tracker.drain()).resolves.toEqual([]);
  });

  it('respects a custom pollIntervalMs', async () => {
    const detect = vi.fn(async () => 'Slack');
    const tracker = createAppUsageTracker({
      logger,
      detect: detect as any,
      options: { pollIntervalMs: 5_000 },
    });
    tracker.start();
    await vi.advanceTimersByTimeAsync(0);
    const callsAfterStart = detect.mock.calls.length;
    await vi.advanceTimersByTimeAsync(5_000);
    expect(detect.mock.calls.length).toBe(callsAfterStart + 1);
  });
});
