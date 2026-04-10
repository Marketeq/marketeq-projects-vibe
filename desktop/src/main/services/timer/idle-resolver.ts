// src/main/services/timer/idle-resolver.ts
//
// Tracks the currently pending idle interval that the user has to resolve.
// Doc 20 §6.1 — when the FSM moves into IdleSoftPaused we record an
// `idle_event` row with a null resolution and tell the renderer to show the
// IdlePromptModal via an IPC event. The user's choice arrives as an
// IDLE_RESOLVED event; we update the row and return the resolution so the
// caller can dispatch the corresponding FSM event.

import { randomUUID } from 'node:crypto';
import type { IdleRepo } from '../../db/repos/idle.repo';
import type { IdleResolution } from '../../../shared/types';

export interface PendingIdlePrompt {
  idleEventId: string;
  sessionId: string;
  startedAt: number;
  endedAt: number;
  seconds: number;
}

export function createIdleResolver(idleRepo: IdleRepo) {
  let pending: PendingIdlePrompt | null = null;

  function open(input: {
    sessionId: string;
    startedAt: number;
    seconds: number;
  }): PendingIdlePrompt {
    const endedAt = Date.now();
    const row: PendingIdlePrompt = {
      idleEventId: `idl_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      sessionId: input.sessionId,
      startedAt: input.startedAt,
      endedAt,
      seconds: input.seconds,
    };
    idleRepo.insert({
      id: row.idleEventId,
      session_id: row.sessionId,
      started_at: row.startedAt,
      ended_at: row.endedAt,
      seconds: row.seconds,
      resolution: null,
      synced_at: null,
    });
    pending = row;
    return row;
  }

  function resolve(resolution: IdleResolution): PendingIdlePrompt | null {
    if (!pending) return null;
    idleRepo.setResolution(pending.idleEventId, resolution);
    const closed = pending;
    pending = null;
    return closed;
  }

  function getPending(): PendingIdlePrompt | null {
    return pending;
  }

  return { open, resolve, getPending };
}

export type IdleResolver = ReturnType<typeof createIdleResolver>;
