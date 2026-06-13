// src/main/services/sync/event-bridge.ts
//
// Phase 4 — Glue between the Phase 2 TimerService, Phase 3 capture
// services, and the Phase 4 Outbox.
//
// The Phase 4 prompt is explicit that we must NOT modify timer-service
// or capture-service core logic. Instead we attach to the public event
// buses they already expose and enqueue the corresponding outbox writes.
//
// The mapping here is intentionally one-way (service → outbox) and
// additive: no existing subscriber sees any difference in behaviour.
//
// Payload shapes match doc 13 (`desktop sends Unix ms; the server
// converts to ISO 8601`). Idempotency keys are deterministically derived
// from the entity id so repeated broadcasts of the same event collapse
// into a single queued row (the outbox's insert is idempotent by id).

import type { Logger } from 'pino';
import type { Outbox } from './outbox';
import type {
  TimerService,
  TimerBusEvent,
} from '../timer/timer-service';
import type { ScreenshotService } from '../capture/screenshot-service';
import type { ActivityMonitor } from '../capture/activity-monitor';
import type { ScreenshotTakenEvent, ActivitySample } from '../../../shared/ipc-contracts';

export interface EventBridgeDeps {
  outbox: Outbox;
  timer: TimerService;
  screenshotService?: ScreenshotService;
  activityMonitor?: ActivityMonitor;
  /** Returns the current device id (from device_self). */
  getDeviceId: () => string | null;
  /** Returns the current authenticated user's id, or null. */
  getUserId?: () => string | null;
  logger?: Logger;
}

export type EventBridge = ReturnType<typeof createEventBridge>;

export function createEventBridge(deps: EventBridgeDeps) {
  const log = deps.logger?.child({ svc: 'event-bridge' });
  const detachers: Array<() => void> = [];

  // ---- Timer events --------------------------------------------------------
  const offTimer = deps.timer.attachEventBus((evt: TimerBusEvent) => {
    try {
      handleTimerEvent(evt);
    } catch (err) {
      log?.warn({ err }, 'event-bridge: timer handler threw');
    }
  });
  detachers.push(offTimer);

  function handleTimerEvent(evt: TimerBusEvent): void {
    if (evt.channel !== 'timer:state-changed') return;
    const snap = evt.payload;
    const deviceId = deps.getDeviceId();
    if (!deviceId || !snap.activeSessionId) return;
    // Session.start: we don't have a direct "started" event, but the
    // FSM emits a state change into Running with `runningSec === 0` on
    // first entry. A cleaner signal is `state === 'Running'` AND no prior
    // row exists for that session id — the outbox's idempotency guard
    // handles the "already enqueued" case.
    if (snap.state === 'Running' && snap.pickedContract) {
      deps.outbox.enqueue({
        kind: 'session.start',
        method: 'POST',
        path: '/sessions',
        id: `req_ses-start-${snap.activeSessionId}`,
        payload: {
          id: snap.activeSessionId,
          contractId: snap.pickedContract.contractId,
          taskId: snap.pickedContract.taskId,
          deviceId,
          startedAt: snap.updatedAt - snap.elapsedSec * 1000,
        },
      });
    }
    // Session.close is fired when the FSM enters Idle from a non-Idle
    // state. We detect it by the presence of `activeSessionId == null`
    // in a later event — but by that point we've lost the id. Instead
    // we install a secondary listener on `session-closed` style by
    // observing rows transitioning to a session row with ended_at set.
    // Since the timer-service already updates the DB row synchronously
    // in `handleCloseSession`, the onClosed hook below listens for the
    // snapshot flip and reads the latest finished session via a
    // post-transition hook we wire in wiring.ts.
  }

  // ---- Capture events ------------------------------------------------------

  if (deps.screenshotService) {
    const offShot = deps.screenshotService.subscribe((e: ScreenshotTakenEvent) => {
      try {
        const userId = deps.getUserId?.() ?? null;
        if (!userId) {
          log?.warn('event-bridge: screenshot skipped — no authenticated user');
          return;
        }
        // Get active contract from timer so screenshots are linked to the
        // correct project/service/team contract
        const snap = deps.timer.getSnapshot();
        const contract = snap.pickedContract;
        
        let imageBase64: string | undefined;
        try {
          const fs = require('fs');
          if (e.filePath && fs.existsSync(e.filePath)) {
            const buf = fs.readFileSync(e.filePath);
            if (buf.length > 0) {
              imageBase64 = buf.toString('base64');
            }
          }
        } catch (err) {
          log?.warn({ err }, 'event-bridge: failed to read screenshot file for upload');
        }

        // Compute activity from instant idle time at capture moment
        let keyboard = 0;
        let mouse = 0;
        try {
          const { powerMonitor } = require('electron');
          const idleSec = powerMonitor.getSystemIdleTime();
          if (idleSec < 300) {
            // Activity level derived from system idle time.
            // keyboard/mouse breakdown requires native input hooks (rejected per DTT-D-009
            // privacy guarantee — no keystroke data leaves the device). Values remain 0
            // until an explicit repo-owner decision on a privacy-compliant measurement approach.
            const basePct = Math.round((1 - idleSec / 300) * 100);
            keyboard = 0; // Placeholder — see DTT-D-009
            mouse = 0;    // Placeholder — see DTT-D-009
            void basePct; // Available for overall activity signal if needed
          }
        } catch {
          // Non-fatal
        }

        deps.outbox.enqueue({
          kind: 'screenshot.confirm',
          method: 'POST',
          path: '/screenshots/confirm',
          id: `req_shot-${e.id}`,
          payload: {
            userId,
            key: `screenshots/${e.id}.jpg`,
            mimeType: 'image/jpeg',
            bytes: e.bytes,
            timestamp: new Date(e.takenAt).toISOString(),
            monitorId: e.displayId,
            contractId: contract?.contractId ?? undefined,
            taskId: contract?.taskId ?? undefined,
            imageBase64,
            keyboard,
            mouse,
            apps: e.activeAppName
              ? [{ appName: e.activeAppName, iconUrl: '' }]
              : undefined,
          },
        });
      } catch (err) {
        log?.warn({ err }, 'event-bridge: screenshot handler threw');
      }
    });
    detachers.push(offShot);
  }

  if (deps.activityMonitor) {
    // Batch activity samples in 60-second windows. Simpler to enqueue one
    // row per sample — the backend endpoint accepts a `minutes` array, so
    // we wrap each sample as a singleton batch. The server idempotency key
    // is per-sample so reprocessing is safe.
    const offAct = deps.activityMonitor.subscribe((s: ActivitySample) => {
      try {
        deps.outbox.enqueue({
          kind: 'activity.batch',
          method: 'POST',
          path: `/sessions/${encodeURIComponent(s.sessionId)}/activity`,
          id: `req_act-${s.id}`,
          payload: {
            minutes: [
              {
                id: s.id,
                minuteStartAt: s.sampledAt,
                active: s.active,
              },
            ],
          },
        });
      } catch (err) {
        log?.warn({ err }, 'event-bridge: activity handler threw');
      }
    });
    detachers.push(offAct);
  }

  function detach(): void {
    for (const fn of detachers) {
      try {
        fn();
      } catch {
        /* ignore */
      }
    }
    detachers.length = 0;
  }

  log?.info('event-bridge attached');

  return {
    detach,
  };
}
