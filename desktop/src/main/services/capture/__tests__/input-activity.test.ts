// src/main/services/capture/__tests__/input-activity.test.ts

import { describe, it, expect, afterEach } from 'vitest';
import {
  startInputActivity,
  stopInputActivity,
  getInputLevels,
} from '../input-activity';

// `uiohook-napi` is a native module that is not installed / not loadable in the
// unit-test runtime, so these tests exercise the graceful-degradation path:
// the module must never throw and must report 0 when no input hook is active.

describe('input-activity (no native hook available)', () => {
  afterEach(() => {
    stopInputActivity();
  });

  it('reports 0/0 before starting', () => {
    expect(getInputLevels()).toEqual({ keyboardPct: 0, mousePct: 0 });
  });

  it('start() does not throw when uiohook-napi is unavailable', () => {
    expect(() => startInputActivity()).not.toThrow();
    expect(getInputLevels()).toEqual({ keyboardPct: 0, mousePct: 0 });
  });

  it('start() is idempotent and stop() is safe to call unstarted', () => {
    expect(() => {
      startInputActivity();
      startInputActivity();
      stopInputActivity();
      stopInputActivity();
    }).not.toThrow();
  });

  it('always returns integers in the 0..100 range', () => {
    startInputActivity();
    const { keyboardPct, mousePct } = getInputLevels();
    for (const v of [keyboardPct, mousePct]) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});
