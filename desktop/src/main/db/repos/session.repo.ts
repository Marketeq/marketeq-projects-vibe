// src/main/db/repos/session.repo.ts
// All session writes go through this repository. The TimerService (future
// phases) and SyncQueue call into here. Renderers never see SQL.

import { z } from 'zod';
import type { DbHandle } from '../connection';
import { SessionRow } from '../schema';
import { one, many, run, tx } from './base';

const DailyContractTotalRow = z.object({
  contract_id: z.string().min(1),
  total_billable_seconds: z.number().int().nonnegative(),
});
export type DailyContractTotal = z.infer<typeof DailyContractTotalRow>;

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

    listForUser(userId: string, limit = 200): SessionRow[] {
      return many(
        db,
        SessionRow,
        `SELECT * FROM session WHERE user_id = ? ORDER BY started_at DESC LIMIT ?`,
        [userId, limit],
      );
    },

    /**
     * Sums billable_seconds per contract for CLOSED sessions belonging to
     * userId whose started_at falls in [startAt, endAt). Excludes the
     * currently-open session (ended_at IS NULL) — its billable_seconds
     * isn't finalized yet; the caller adds the live elapsed seconds from
     * TimerService.getSnapshot() for that one.
     *
     * Known limitation: a session that starts before startAt and is still
     * running past it is bucketed entirely under the day it started — no
     * midnight-crossing split. Acceptable for v1.
     */
    sumBillableSecondsByContract(input: {
      userId: string;
      startAt: number;
      endAt: number;
    }): DailyContractTotal[] {
      return many(
        db,
        DailyContractTotalRow,
        `SELECT contract_id, SUM(billable_seconds) AS total_billable_seconds
           FROM session
          WHERE user_id = ?
            AND ended_at IS NOT NULL
            AND started_at >= ?
            AND started_at < ?
          GROUP BY contract_id`,
        [input.userId, input.startAt, input.endAt],
      );
    },
  };
}
export type SessionRepo = ReturnType<typeof createSessionRepo>;
