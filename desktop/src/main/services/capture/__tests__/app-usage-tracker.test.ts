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

  it('drain returns distinct app names seen and clears afterward', () => {
    const names = ['Google Chrome', 'Visual Studio Code', 'Google Chrome'];
    let i = 0;
    const detect = vi.fn(() => names[Math.min(i++, names.length - 1)]);
    const tracker = createAppUsageTracker({ logger, detect: detect as any });

    tracker.start(); // samples once immediately: "Google Chrome"
    vi.advanceTimersByTime(60_000); // "Visual Studio Code"
    vi.advanceTimersByTime(60_000); // "Google Chrome"

    const result = tracker.drain(); // one more fresh sample too
    expect(result.sort()).toEqual(['Google Chrome', 'Visual Studio Code']);

    const second = tracker.drain();
    expect(second.length).toBeLessThanOrEqual(1); // cleared; only the fresh sample from drain() itself
  });

  it('does not sample on an interval before start() is called', () => {
    const detect = vi.fn(() => 'Slack');
    const tracker = createAppUsageTracker({ logger, detect: detect as any });
    vi.advanceTimersByTime(120_000);
    expect(detect).not.toHaveBeenCalled();
  });

  it('stop() halts further polling', () => {
    const detect = vi.fn(() => 'Slack');
    const tracker = createAppUsageTracker({ logger, detect: detect as any });
    tracker.start();
    tracker.stop();
    const callsAfterStop = detect.mock.calls.length;
    vi.advanceTimersByTime(300_000);
    expect(detect.mock.calls.length).toBe(callsAfterStop);
  });

  it('a null detection result is never added to the seen set', () => {
    const detect = vi.fn(() => null);
    const tracker = createAppUsageTracker({ logger, detect: detect as any });
    tracker.start();
    expect(tracker.drain()).toEqual([]);
  });

  it('a throwing detector does not crash sampling', () => {
    const detect = vi.fn(() => {
      throw new Error('boom');
    });
    const tracker = createAppUsageTracker({ logger, detect: detect as any });
    expect(() => tracker.start()).not.toThrow();
    expect(() => tracker.drain()).not.toThrow();
  });

  it('respects a custom pollIntervalMs', () => {
    const detect = vi.fn(() => 'Slack');
    const tracker = createAppUsageTracker({
      logger,
      detect: detect as any,
      options: { pollIntervalMs: 5_000 },
    });
    tracker.start();
    const callsAfterStart = detect.mock.calls.length;
    vi.advanceTimersByTime(5_000);
    expect(detect.mock.calls.length).toBe(callsAfterStart + 1);
  });
});
