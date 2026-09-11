// src/main/db/repos/session.repo.ts
// All session writes go through this repository. The TimerService (future
// phases) and SyncQueue call into here. Renderers never see SQL.

import type { DbHandle } from '../connection';
import { SessionRow } from '../schema';
import { one, many, run, tx } from './base';

export function createSessionRepo(db: DbHandle) {
  return {
    findActive(userId: string): SessionRow | null {
      return one(
        db,
        SessionRow,
        `SELECT * FROM session WHERE user_id = ? AND ended_at IS NULL LIMIT 1`,
        [userId],
      );
    },

    findById(id: string): SessionRow | null {
      return one(db, SessionRow, `SELECT * FROM session WHERE id = ?`, [id]);
    },

    insert(row: SessionRow): void {
      run(
        db,
        `INSERT INTO session
         (id, user_id, contract_id, task_id, device_id, started_at, ended_at, end_reason,
          billable_seconds, paid_break_seconds, unpaid_break_seconds, idle_seconds,
          disputed, synced_at, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          row.id,
          row.user_id,
          row.contract_id,
          row.task_id,
          row.device_id,
          row.started_at,
          row.ended_at,
          row.end_reason,
          row.billable_seconds,
          row.paid_break_seconds,
          row.unpaid_break_seconds,
          row.idle_seconds,
          row.disputed,
          row.synced_at,
          row.created_at,
          row.updated_at,
        ],
      );
    },

    closeActive(input: {
      id: string;
      endedAt: number;
      reason: SessionRow['end_reason'];
      billableSeconds: number;
    }): void {
      tx(db, () => {
        run(
          db,
          `UPDATE session
             SET ended_at = ?, end_reason = ?, billable_seconds = ?, updated_at = ?
           WHERE id = ? AND ended_at IS NULL`,
          [
            input.endedAt,
            input.reason,
            input.billableSeconds,
            input.endedAt,
            input.id,
          ],
        );
        run(
          db,
          `UPDATE time_entry SET ended_at = ?, duration_seconds = CAST((? - started_at) / 1000 AS INTEGER)
             WHERE session_id = ? AND ended_at IS NULL`,
          [input.endedAt, input.endedAt, input.id],
        );
      });
    },

    /**
     * Crash-recovery sweep: close every session a previous process left open
     * (ended_at IS NULL). A raw local UPDATE — not an FSM transition, never a
     * DELETE. Mirrors closeActive's time_entry close, minus the per-session
     * filter. Deliberately does NOT rewrite billable_seconds — whatever was
     * persisted stays. Returns the rows that were open (id + synced_at) so the
     * caller can decide whether a backend session.close must be enqueued.
     */
    closeAllOpen(input: {
      endedAt: number;
      reason: SessionRow['end_reason'];
    }): Array<{ id: string; synced_at: number | null }> {
      return tx(db, () => {
        const open = many(
          db,
          SessionRow,
          `SELECT * FROM session WHERE ended_at IS NULL`,
        ).map((r) => ({ id: r.id, synced_at: r.synced_at }));
        run(
          db,
          `UPDATE session SET ended_at = ?, end_reason = ?, updated_at = ?
             WHERE ended_at IS NULL`,
          [input.endedAt, input.reason, input.endedAt],
        );
        run(
          db,
          `UPDATE time_entry SET ended_at = ?, duration_seconds = CAST((? - started_at) / 1000 AS INTEGER)
             WHERE ended_at IS NULL`,
          [input.endedAt, input.endedAt],
        );
        return open;
      });
    },

    listForUser(userId: string, limit = 200): SessionRow[] {
      return many(
        db,
        SessionRow,
        `SELECT * FROM session WHERE user_id = ? ORDER BY started_at DESC LIMIT ?`,
        [userId, limit],
      );
    },
  };
}
export type SessionRepo = ReturnType<typeof createSessionRepo>;
