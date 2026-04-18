// src/main/services/timer/audit.ts
//
// Writes every timer FSM transition to the `timer_event_log` table for
// forensics. This is local-only — never synced to the server. See doc 20 §7.

import { randomUUID } from 'node:crypto';
import type { DbHandle } from '../../db/connection';
import type { TimerEvent, TimerState } from './state-machine';

export interface AuditInput {
  from: TimerState;
  to: TimerState;
  event: TimerEvent;
  sessionId: string | null;
  reason?: string | null;
}

export function writeAudit(db: DbHandle, input: AuditInput): void {
  db.prepare(
    `INSERT INTO timer_event_log
       (id, at, from_state, to_state, event, payload_json, session_id, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    `evt_${randomUUID().replace(/-/g, '')}`,
    Date.now(),
    input.from,
    input.to,
    input.event.type,
    JSON.stringify(input.event),
    input.sessionId,
    input.reason ?? null,
  );
}
