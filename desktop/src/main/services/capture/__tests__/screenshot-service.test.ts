// src/main/services/capture/__tests__/screenshot-service.test.ts
//
// Unit tests for the pure helpers exported by screenshot-service.
// The full service requires an Electron runtime which we do not
// bootstrap here; the captureOnce integration path is exercised via
// the smoke test in `scripts/smoke-capture.ts`.

import { describe, it, expect } from 'vitest';
import {
  computeNextIntervalMs,
  findRetentionCandidates,
  type RetentionCandidate,
} from '../screenshot-service';

describe('computeNextIntervalMs', () => {
  it('returns base interval when rng is 0.5 (delta=0)', () => {
    const ms = computeNextIntervalMs(600, 0.15, () => 0.5);
    expect(ms).toBe(600_000);
  });

  it('applies negative jitter when rng is 0', () => {
    const ms = computeNextIntervalMs(600, 0.15, () => 0);
    // 600_000 - 0.15*600_000 = 510_000
    expect(ms).toBe(510_000);
  });

  it('applies positive jitter when rng is 1', () => {
    const ms = computeNextIntervalMs(600, 0.15, () => 1);
    // 600_000 + 0.15*600_000 = 690_000
    expect(ms).toBe(690_000);
  });

  it('never returns below 5 seconds', () => {
    const ms = computeNextIntervalMs(1, 0.9, () => 0);
    expect(ms).toBeGreaterThanOrEqual(5000);
  });

  it('respects custom rng distribution', () => {
    const samples: number[] = [];
    let i = 0;
    const rng = () => {
      const v = [0, 0.25, 0.5, 0.75, 1][i % 5] ?? 0;
      i += 1;
      return v;
    };
    for (let k = 0; k < 20; k += 1) {
      samples.push(computeNextIntervalMs(600, 0.15, rng));
    }
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(5000);
    expect(Math.max(...samples)).toBeLessThanOrEqual(690_000);
  });
});

describe('findRetentionCandidates', () => {
  const now = 1_700_000_000_000;
  const rows: RetentionCandidate[] = [
    { id: 'a', taken_at: now - 5 * 24 * 3600 * 1000, local_path: '/a' },
    { id: 'b', taken_at: now - 40 * 24 * 3600 * 1000, local_path: '/b' },
    { id: 'c', taken_at: now - 100 * 24 * 3600 * 1000, local_path: '/c' },
    { id: 'd', taken_at: now, local_path: '/d' },
  ];

  it('returns rows strictly older than cutoff', () => {
    const out = findRetentionCandidates(rows, now, 30);
    expect(out.map((r) => r.id)).toEqual(['b', 'c']);
  });

  it('returns empty when maxAge is huge', () => {
    expect(findRetentionCandidates(rows, now, 10_000)).toEqual([]);
  });

  it('returns all old rows when maxAge is 0', () => {
    const out = findRetentionCandidates(rows, now, 0);
    expect(out.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });
});
