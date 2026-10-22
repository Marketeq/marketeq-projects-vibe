// src/main/services/sync/__tests__/event-bridge.test.ts
//
// Activity minutes → outbox. The bridge must queue one `activity.batch` row
// per monitor sample, in the shape time-tracking-service accepts:
// `minuteStartAt` is validated there as an ISO 8601 string (@IsISO8601), so
// the sample's epoch-ms time has to be sent as an ISO date.

import { describe, it, expect, vi } from 'vitest';

vi.mock('../../capture/input-activity', () => ({ getInputLevels: () => null }));
vi.mock('../../capture/app-icon-service', () => ({ readIconAsBase64: async () => null }));

import { createEventBridge } from '../event-bridge';
import type { Outbox } from '../outbox';
import type { TimerService } from '../../timer/timer-service';
import type { ActivityMonitor } from '../../capture/activity-monitor';
import type { ActivitySample } from '../../../../shared/ipc-contracts';

const ISO_8601_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function makeOutbox() {
  const enqueue = vi.fn();
  return { outbox: { enqueue } as unknown as Outbox, enqueue };
}

function makeTimer() {
  return {
    attachEventBus: vi.fn(() => () => undefined),
    getSnapshot: vi.fn(() => ({ activeSessionId: null, pickedContract: null, elapsedSec: 0 })),
  } as unknown as TimerService;
}

// A monitor whose `subscribe` hands back the listener so the test can emit.
function makeMonitor() {
  let listener: ((s: ActivitySample) => void) | null = null;
  const monitor = {
    subscribe: vi.fn((cb: (s: ActivitySample) => void) => {
      listener = cb;
      return () => {
        listener = null;
      };
    }),
  } as unknown as ActivityMonitor;
  return {
    monitor,
    emit: (s: ActivitySample) => listener?.(s),
    isSubscribed: () => listener !== null,
  };
}

const sample = (over: Partial<ActivitySample> = {}): ActivitySample => ({
  id: 'act_1',
  sessionId: 'ses_abc',
  sampledAt: Date.UTC(2026, 9, 8, 14, 31, 0),
  active: true,
  ...over,
});

const activityRows = (enqueue: ReturnType<typeof vi.fn>) =>
  enqueue.mock.calls.map(([row]) => row).filter((row) => row.kind === 'activity.batch');

describe('event-bridge — activity minutes', () => {
  it('queues one activity.batch row per sample with an ISO 8601 minuteStartAt', () => {
    const { outbox, enqueue } = makeOutbox();
    const m = makeMonitor();
    createEventBridge({ outbox, timer: makeTimer(), activityMonitor: m.monitor, getDeviceId: () => 'dev_1' });

    m.emit(sample());

    const rows = activityRows(enqueue);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kind: 'activity.batch',
      method: 'POST',
      path: '/sessions/ses_abc/activity',
      id: 'req_act-act_1',
    });
    const [minute] = rows[0].payload.minutes;
    expect(minute).toEqual({ id: 'act_1', minuteStartAt: '2026-10-08T14:31:00.000Z', active: true });
    expect(typeof minute.minuteStartAt).toBe('string');
    expect(minute.minuteStartAt).toMatch(ISO_8601_UTC);
  });

  it('keeps an idle minute as active=false and URL-encodes the session id', () => {
    const { outbox, enqueue } = makeOutbox();
    const m = makeMonitor();
    createEventBridge({ outbox, timer: makeTimer(), activityMonitor: m.monitor, getDeviceId: () => 'dev_1' });

    m.emit(sample({ id: 'act_2', sessionId: 'ses/x y', active: false }));

    const [row] = activityRows(enqueue);
    expect(row.path).toBe('/sessions/ses%2Fx%20y/activity');
    expect(row.payload.minutes[0].active).toBe(false);
  });

  it('queues nothing for activity when no monitor is given (unchanged behaviour)', () => {
    const { outbox, enqueue } = makeOutbox();
    createEventBridge({ outbox, timer: makeTimer(), getDeviceId: () => 'dev_1' });

    expect(activityRows(enqueue)).toHaveLength(0);
  });

  it('stops queueing activity after detach', () => {
    const { outbox, enqueue } = makeOutbox();
    const m = makeMonitor();
    const bridge = createEventBridge({ outbox, timer: makeTimer(), activityMonitor: m.monitor, getDeviceId: () => 'dev_1' });

    bridge.detach();
    m.emit(sample());

    expect(m.isSubscribed()).toBe(false);
    expect(activityRows(enqueue)).toHaveLength(0);
  });
});

describe('event-bridge — time entries on session close (crash recovery source tag)', () => {
  it("tags only crash-recovered entries with source 'recovered'; normal entries are unchanged", () => {
    const { outbox, enqueue } = makeOutbox();
    let emit: ((evt: unknown) => void) | null = null;
    const timer = {
      attachEventBus: vi.fn((cb: (evt: unknown) => void) => { emit = cb; return () => undefined; }),
      getSnapshot: vi.fn(() => ({ activeSessionId: null, pickedContract: null, elapsedSec: 0 })),
    } as unknown as TimerService;
    createEventBridge({
      outbox,
      timer,
      getDeviceId: () => 'dev_1',
      getSessionById: () => ({ ended_at: 2_000_000, end_reason: 'user_stop', billable_seconds: 600 }),
      listTimeEntriesForSession: () => [
        { id: 'ent_pre', started_at: 1_000_000, ended_at: 1_300_000, duration_seconds: 300, source: 'recovered' as const },
        { id: 'ent_post', started_at: 1_700_000, ended_at: 2_000_000, duration_seconds: 300, source: 'live' as const },
      ],
    });

    const state = (activeSessionId: string | null) =>
      emit!({ channel: 'timer:state-changed', payload: { activeSessionId, pickedContract: null, elapsedSec: 0, updatedAt: 0 } });
    state('ses_crash');
    state(null); // session closed

    const entries = enqueue.mock.calls.map(([row]) => row).filter((r) => r.kind === 'time-entry.create');
    expect(entries.map((r) => r.payload.id)).toEqual(['ent_pre', 'ent_post']);
    expect(entries[0].payload.source).toBe('recovered');
    expect('source' in entries[1].payload).toBe(false);
  });
});
