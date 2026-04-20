// src/main/services/capture/__tests__/activity-monitor.test.ts

import { describe, it, expect } from 'vitest';
import {
  aggregateBucket,
  aggregateMinute,
  rollingLevel,
  type BucketSample,
} from '../activity-monitor';

describe('aggregateBucket', () => {
  const bucketMs = 10_000;

  it('returns false when all samples are idle', () => {
    const samples: BucketSample[] = [
      { t: 1, idleSec: 30 },
      { t: 2, idleSec: 60 },
      { t: 3, idleSec: 90 },
    ];
    expect(aggregateBucket(samples, bucketMs)).toBe(false);
  });

  it('returns true if any sample has idleSec below threshold', () => {
    const samples: BucketSample[] = [
      { t: 1, idleSec: 30 },
      { t: 2, idleSec: 2 },
      { t: 3, idleSec: 90 },
    ];
    expect(aggregateBucket(samples, bucketMs)).toBe(true);
  });

  it('returns false for empty samples', () => {
    expect(aggregateBucket([], bucketMs)).toBe(false);
  });

  it('uses a strict "less than" comparison', () => {
    const samples: BucketSample[] = [{ t: 1, idleSec: 10 }];
    expect(aggregateBucket(samples, bucketMs)).toBe(false);
  });
});

describe('aggregateMinute', () => {
  it('returns true if any bucket was active', () => {
    expect(aggregateMinute([false, false, true, false, false, false])).toBe(true);
  });
  it('returns false if all buckets were inactive', () => {
    expect(aggregateMinute([false, false, false])).toBe(false);
  });
  it('returns false for empty input', () => {
    expect(aggregateMinute([])).toBe(false);
  });
});

describe('rollingLevel', () => {
  it('computes active ratio over last N entries', () => {
    const buckets = [true, false, true, true, false, true];
    expect(rollingLevel(buckets, 3)).toBeCloseTo(2 / 3);
  });

  it('uses full series when window is larger than length', () => {
    expect(rollingLevel([true, false], 10)).toBe(0.5);
  });

  it('returns 0 for empty buckets', () => {
    expect(rollingLevel([], 5)).toBe(0);
  });

  it('returns 0 for non-positive window', () => {
    expect(rollingLevel([true, true], 0)).toBe(0);
  });
});
