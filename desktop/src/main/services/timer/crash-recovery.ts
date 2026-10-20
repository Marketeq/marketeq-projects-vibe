// src/main/services/timer/crash-recovery.ts
//
// Crash recovery prompt — Recover / Discard (doc 01 §18, DTT-US-131/132/133).
//
// On launch the timer's restoreFromDb() sweep closes any session an unclean
// shutdown left open (at its last checkpoint, reason 'crash_recover'). That
// stays: closing first keeps capture off while the user decides (the capture
// supervisor starts screenshots for any open session). What changes is that
// the decision is no longer silent:
//
//   * The swept session is held as "pending" (persisted in the preference
//     table, so a second crash before the user answers still asks again) and
//     its backend close is NOT sent yet.
//   * Recover  → timer.recoverCrashedSession(): same session back in Paused at
//                the checkpoint; the backend never got a close, so it is still
//                open there. Nothing is enqueued.
//   * Discard  → the held backend close is enqueued now (reason crash_recover,
//                checkpoint billable seconds): nothing after the crash is
//                billed. Screenshots already uploaded before the crash remain —
//                they were real work (product decision, Oct 2026).
//
// Only the session's owner is asked. If someone else is signed in, the old
// behaviour applies (close it and tell the backend), so another person's
// work is never left hanging.

import type { Logger } from 'pino';
import type { Repos } from '../../db/repos';
import type { SessionRow } from '../../db/schema';
import type { TimerService } from './timer-service';

export const PENDING_CRASH_RECOVERY_KEY = 'dtt.pendingCrashRecovery';

export interface CrashRecoveryInfo {
  sessionId: string;
  taskName: string | null;
  contractName: string | null;
  /** Tracked seconds at the last checkpoint — what Recover restores. */
  elapsedSec: number;
  /** Recover is only offered while the contract can still be tracked (doc 05 CRASH.05). */
  canRecover: boolean;
}

export interface ClosedSession {
  id: string;
  endedAt: number;
  endReason: SessionRow['end_reason'];
  billableSeconds: number;
}

export interface CrashRecoveryDeps {
  repos: Pick<Repos, 'session' | 'task' | 'contract' | 'preference'>;
  timer: Pick<TimerService, 'recoverCrashedSession'>;
  getUserId: () => string | null;
  /** Enqueues the backend session close; null until the sync pipeline is up. */
  enqueueClose: () => ((s: ClosedSession) => void) | null;
  logger?: Logger;
}

export function createCrashRecovery(deps: CrashRecoveryDeps) {
  const log = deps.logger?.child({ svc: 'crash-recovery' });

  function readPendingId(): string | null {
    try {
      const pref = deps.repos.preference.get(PENDING_CRASH_RECOVERY_KEY);
      return pref ? (JSON.parse(pref.value_json) as string | null) : null;
    } catch {
      return null;
    }
  }

  function clearPending(): void {
    deps.repos.preference.delete(PENDING_CRASH_RECOVERY_KEY);
  }

  function toClosed(id: string): ClosedSession | null {
    const row = deps.repos.session.findById(id);
    if (!row || row.ended_at == null) return null;
    return { id: row.id, endedAt: row.ended_at, endReason: row.end_reason, billableSeconds: row.billable_seconds };
  }

  function sendClose(id: string): void {
    const closed = toClosed(id);
    const enqueue = deps.enqueueClose();
    if (!closed) return;
    if (!enqueue) {
      log?.warn({ id }, 'crash recovery: sync not ready, backend close not enqueued');
      return;
    }
    enqueue(closed);
  }

  /**
   * Startup: hold the session the sweep just closed (if any) for the user's
   * decision instead of telling the backend straight away. Returns the
   * sessions whose close should still be sent immediately (none today — only
   * one session can be open at a time, and it is the one being held).
   */
  function holdSweptSessions(swept: ClosedSession[]): ClosedSession[] {
    const pending = readPendingId();
    // The most recent unclean session is the one to ask about (doc 05 CRASH.01).
    const latest = [...swept].sort((a, b) => b.endedAt - a.endedAt)[0];
    const holdId = latest?.id ?? pending;
    if (!holdId) return [];
    deps.repos.preference.set(PENDING_CRASH_RECOVERY_KEY, JSON.stringify(holdId));
    log?.info({ sessionId: holdId }, 'crash recovery: holding unfinished session for Recover / Discard');
    // An older held session that is being replaced must not be lost.
    const sendNow = swept.filter((s) => s.id !== holdId);
    if (pending && pending !== holdId) {
      const old = toClosed(pending);
      if (old) sendNow.push(old);
    }
    return sendNow;
  }

  /** What the dialog shows, or null when there is nothing to ask the current user. */
  function getPending(): CrashRecoveryInfo | null {
    const id = readPendingId();
    if (!id) return null;
    const row = deps.repos.session.findById(id);
    if (!row || row.end_reason !== 'crash_recover') {
      clearPending();
      return null;
    }
    const userId = deps.getUserId();
    if (!userId) return null; // ask after sign-in
    if (row.user_id !== userId) {
      // Not this user's session: close it the old way and don't ask.
      sendClose(id);
      clearPending();
      log?.info({ sessionId: id }, 'crash recovery: session belongs to another user, closed without prompt');
      return null;
    }
    const task = deps.repos.task.findById(row.task_id);
    const contract = deps.repos.contract.findById(row.contract_id);
    return {
      sessionId: id,
      taskName: task?.name ?? null,
      contractName: contract?.name ?? null,
      elapsedSec: row.billable_seconds,
      canRecover: contract?.status === 'active',
    };
  }

  async function recover(): Promise<boolean> {
    const info = getPending();
    if (!info || !info.canRecover) return false;
    const ok = await deps.timer.recoverCrashedSession(info.sessionId);
    if (ok) clearPending();
    return ok;
  }

  function discard(): boolean {
    const info = getPending();
    if (!info) return false;
    sendClose(info.sessionId);
    clearPending();
    log?.info({ sessionId: info.sessionId }, 'crash recovery: discarded, backend close enqueued');
    return true;
  }

  return { holdSweptSessions, getPending, recover, discard };
}

export type CrashRecovery = ReturnType<typeof createCrashRecovery>;
