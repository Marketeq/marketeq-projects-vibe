// src/main/services/__tests__/power-monitor.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createPowerMonitorService } from '../power-monitor';
import pino from 'pino';

const nullLogger = pino({ level: 'silent' });

describe('PowerMonitorService', () => {
  it('checkClockSkew returns approximately zero for immediate calls', () => {
    const svc = createPowerMonitorService({
      logger: nullLogger,
      onSuspend: vi.fn(),
      onResume: vi.fn(),
    });
    const skew = svc.checkClockSkew();
    // Should be very close to 0 since the two reads are near-simultaneous.
    expect(Math.abs(skew)).toBeLessThan(2);
  });

  it('install returns a detach function when powerMonitor is unavailable', () => {
    const svc = createPowerMonitorService({
      logger: nullLogger,
      onSuspend: vi.fn(),
      onResume: vi.fn(),
    });
    // In test env, electron require will fail, so install returns a no-op detach.
    const detach = svc.install();
    expect(typeof detach).toBe('function');
    detach(); // should not throw
  });
});
