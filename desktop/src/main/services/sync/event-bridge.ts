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
import { readIconAsBase64 } from '../capture/app-icon-service';
import { getInputLevels } from '../capture/input-activity';
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
  /**
   * Looks up a session's persisted row by id (repos.session.findById).
   * Used to read the authoritative ended_at/end_reason/billable_seconds
   * once a session closes — by the time the FSM's own state-changed
   * snapshot reflects the transition to Idle, activeSessionId and the
   * per-session fields have already been cleared from the in-memory
   * snapshot, so we go back to the DB row timer-service already wrote.
   */
  getSessionById?: (id: string) => {
    ended_at: number | null;
    end_reason: string | null;
    billable_seconds: number;
  } | null;
  /**
   * Lists a session's local time_entry rows (repos.timeEntry.listForSession).
   * Used to sync each closed segment to the backend once its parent session
   * closes — this was never wired up at all (same as session.close before
   * it), so time_entries stayed local-only and never appeared server-side,
   * even after the session.close fix made the session's own billable_seconds
   * correct.
   */
  listTimeEntriesForSession?: (sessionId: string) => Array<{
    id: string;
    started_at: number;
    ended_at: number | null;
    duration_seconds: number;
  }>;
  logger?: Logger;
}

export type EventBridge = ReturnType<typeof createEventBridge>;

export function createEventBridge(deps: EventBridgeDeps) {
  const log = deps.logger?.child({ svc: 'event-bridge' });
  const detachers: Array<() => void> = [];
  // Tracks the most recently seen active session id so that when a
  // state-changed snapshot arrives with activeSessionId back to null, we
  // still know which session just closed (see handleTimerEvent below).
  let lastActiveSessionId: string | null = null;

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

    // Session.close: the FSM enters Idle (activeSessionId back to null)
    // from a session that WAS active a moment ago. Read the closed
    // session's row back from the DB — timer-service's handleCloseSession
    // already wrote ended_at/end_reason/billable_seconds there
    // synchronously before this snapshot was emitted — and enqueue the
    // matching POST /sessions/:id/close. This previously never fired at
    // all (see git history), so no session end ever reached the backend.
    if (!snap.activeSessionId && lastActiveSessionId) {
      const closedId = lastActiveSessionId;
      lastActiveSessionId = null;
      const row = deps.getSessionById?.(closedId);
      if (row && row.ended_at != null) {
        deps.outbox.enqueue({
          kind: 'session.close',
          method: 'POST',
          path: `/sessions/${closedId}/close`,
          id: `req_ses-close-${closedId}`,
          payload: {
            endedAt: row.ended_at,
            reason: row.end_reason ?? 'user_stop',
            billableSeconds: row.billable_seconds,
          },
        });
      } else {
        log?.warn({ closedId }, 'event-bridge: session closed but no DB row found to sync');
      }

      // Sync every closed segment for this session. The backend's
      // CreateTimeEntryDto requires ISO8601 strings for startedAt/endedAt
      // (@IsISO8601()) — the local row stores unix-ms numbers, so these
      // must be converted here, not passed through raw (that would fail
      // validation with a 400).
      const entries = deps.listTimeEntriesForSession?.(closedId) ?? [];
      for (const entry of entries) {
        if (entry.ended_at == null) continue;
        deps.outbox.enqueue({
          kind: 'time-entry.create',
          method: 'POST',
          path: `/sessions/${closedId}/entries`,
          id: `req_ent-${entry.id}`,
          payload: {
            id: entry.id,
            startedAt: new Date(entry.started_at).toISOString(),
            endedAt: new Date(entry.ended_at).toISOString(),
            durationSeconds: entry.duration_seconds,
          },
        });
      }
    }

    if (!deviceId || !snap.activeSessionId) return;
    lastActiveSessionId = snap.activeSessionId;
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
  }

  // ---- Capture events ------------------------------------------------------

  if (deps.screenshotService) {
    const offShot = deps.screenshotService.subscribe(async (e: ScreenshotTakenEvent) => {
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

        // Real keyboard/mouse activity for the trailing screenshot interval,
        // measured separately. input-activity records only THAT input occurred,
        // never which key, so the DTT-D-009 privacy guarantee (no keystroke
        // data leaves the device) still holds — we send percentages, not keys.
        const { keyboardPct, mousePct } = getInputLevels();
        const keyboard = keyboardPct;
        const mouse = mousePct;

        // One entry per distinct app seen during the interval, each with
        // its real extracted icon (base64 — the backend saves it and
        // returns a real iconUrl, mirroring exactly how the screenshot
        // image itself is already sent as imageBase64 above). Best-effort:
        // an app whose icon extraction failed still gets an entry, just
        // without iconBase64 — the frontend's name-based guess covers it.
        const apps =
          e.activeApps.length > 0
            ? e.activeApps.map((appName) => {
                const iconPath = e.activeAppIcons[appName];
                const iconBase64 = iconPath ? readIconAsBase64(iconPath) : null;
                return {
                  appName,
                  iconUrl: '',
                  ...(iconBase64 ? { iconBase64 } : {}),
                };
              })
            : undefined;

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
            apps,
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
