// src/main/services/timer/break-manager.ts
//
// Tracks the active break (if any), computes remaining time for scheduled
// breaks, and emits `break:expiring` / `break:expired` events.
//
// Persistence is delegated to BreakRepo — this module only owns the in-memory
// countdown state and the scheduled timers for the expiry warnings.
//
// Doc 20 §6.2.

import { randomUUID } from 'node:crypto';
import type { BreakRepo } from '../../db/repos/break.repo';
import type { BreakKind } from '../../../shared/types';

export interface ActiveBreak {
  id: string;
  sessionId: string;
  kind: BreakKind;
  startedAt: number;
  /** null = open-ended break (user ends manually). */
  plannedDurationSec: number | null;
}

export interface BreakManagerEvents {
  onExpiring?: (brk: ActiveBreak) => void;
  onExpired?: (brk: ActiveBreak) => void;
}

const EXPIRING_WARNING_SEC = 60; // emit warning 1 min before expiry

export function createBreakManager(
  breakRepo: BreakRepo,
  events: BreakManagerEvents = {},
) {
  let active: ActiveBreak | null = null;
  let expiringHandle: NodeJS.Timeout | null = null;
  let expiredHandle: NodeJS.Timeout | null = null;

  function clearTimers() {
    if (expiringHandle) {
      clearTimeout(expiringHandle);
      expiringHandle = null;
    }
    if (expiredHandle) {
      clearTimeout(expiredHandle);
      expiredHandle = null;
    }
  }

  function start(input: {
    sessionId: string;
    kind: BreakKind;
    plannedDurationSec?: number | null;
  }): ActiveBreak {
    if (active) {
      // Defensive — close the previous one first.
      end();
    }
    const now = Date.now();
    const brk: ActiveBreak = {
      id: `brk_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      sessionId: input.sessionId,
      kind: input.kind,
      startedAt: now,
      plannedDurationSec: input.plannedDurationSec ?? null,
    };
    breakRepo.insert({
      id: brk.id,
      session_id: brk.sessionId,
      kind: brk.kind,
      started_at: brk.startedAt,
      ended_at: null,
      synced_at: null,
    });
    active = brk;

    if (brk.plannedDurationSec != null) {
      const totalMs = brk.plannedDurationSec * 1000;
      const warningMs = Math.max(0, totalMs - EXPIRING_WARNING_SEC * 1000);
      if (warningMs > 0 && events.onExpiring) {
        expiringHandle = setTimeout(() => {
          if (active?.id === brk.id) events.onExpiring?.(brk);
        }, warningMs);
      }
      if (events.onExpired) {
        expiredHandle = setTimeout(() => {
          if (active?.id === brk.id) events.onExpired?.(brk);
        }, totalMs);
      }
    }
    return brk;
  }

  function end(): ActiveBreak | null {
    if (!active) return null;
    const ending = active;
    breakRepo.close(ending.id, Date.now());
    clearTimers();
    active = null;
    return ending;
  }

  function getActive(): ActiveBreak | null {
    return active;
  }

  function remainingSeconds(): number | null {
    if (!active || active.plannedDurationSec == null) return null;
    const elapsedSec = Math.floor((Date.now() - active.startedAt) / 1000);
    return Math.max(0, active.plannedDurationSec - elapsedSec);
  }

  function elapsedSeconds(): number {
    if (!active) return 0;
    return Math.floor((Date.now() - active.startedAt) / 1000);
  }

  function dispose() {
    clearTimers();
    active = null;
  }

  return { start, end, getActive, remainingSeconds, elapsedSeconds, dispose };
}

export type BreakManager = ReturnType<typeof createBreakManager>;
