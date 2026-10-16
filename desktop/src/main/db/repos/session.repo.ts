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

const DailyTaskTotalRow = z.object({
  contract_id: z.string().min(1),
  task_id: z.string().min(1),
  total_billable_seconds: z.number().int().nonnegative(),
  first_started_at: z.number().int(),
  last_ended_at: z.number().int(),
});
export type DailyTaskTotal = z.infer<typeof DailyTaskTotalRow>;

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
     * Running checkpoint: persist the session's billable seconds so far and
     * stamp updated_at as "last moment we know the timer was alive". Written
     * every few seconds while Running and on every transition out of it, so a
     * crash / force-kill loses at most one checkpoint interval instead of the
     * whole session (billable_seconds was previously only ever written on a
     * graceful close). Nothing else writes session.updated_at, which is what
     * lets closeAllOpen() use it as the recovery end time.
     */
    checkpoint(input: { id: string; billableSeconds: number; at: number }): void {
      run(
        db,
        `UPDATE session SET billable_seconds = ?, updated_at = ?
           WHERE id = ? AND ended_at IS NULL`,
        [input.billableSeconds, input.at, input.id],
      );
    },

    /**
     * Crash-recovery sweep: close every session a previous process left open
     * (ended_at IS NULL). A raw local UPDATE — not an FSM transition, never a
     * DELETE.
     *
     * Each session is closed at its LAST CHECKPOINT (updated_at), not at the
     * relaunch time: the gap while the app was dead is not work, and billing
     * it would pay for hours nobody tracked (doc 01 §18: never silently bill
     * after an unclean restart). `endedAt` is only an upper bound.
     *
     * billable_seconds becomes the larger of the last checkpoint and the sum
     * of the session's time_entry segments (with any still-open segment cut
     * at the checkpoint) — so work that was recorded is never dropped to 0.
     *
     * Returns each closed row's id/endedAt/endReason/billableSeconds —
     * everything the caller needs to enqueue a backend session.close —
     * without a second lookup query.
     */
    closeAllOpen(input: {
      endedAt: number;
      reason: SessionRow['end_reason'];
    }): Array<{
      id: string;
      endedAt: number;
      endReason: SessionRow['end_reason'];
      billableSeconds: number;
    }> {
      return tx(db, () => {
        const open = many(
          db,
          SessionRow,
          `SELECT * FROM session WHERE ended_at IS NULL`,
        );
        return open.map((r) => {
          const endedAt = Math.min(
            input.endedAt,
            Math.max(r.started_at, r.updated_at),
          );
          run(
            db,
            `UPDATE time_entry
                SET ended_at = MAX(started_at, ?),
                    duration_seconds = CAST((MAX(started_at, ?) - started_at) / 1000 AS INTEGER)
              WHERE session_id = ? AND ended_at IS NULL`,
            [endedAt, endedAt, r.id],
          );
          const entrySeconds =
            (db
              .prepare(
                `SELECT COALESCE(SUM(duration_seconds), 0) AS s FROM time_entry WHERE session_id = ?`,
              )
              .get(r.id) as { s: number }).s;
          const billableSeconds = Math.max(r.billable_seconds, entrySeconds);
          run(
            db,
            `UPDATE session SET ended_at = ?, end_reason = ?, billable_seconds = ?, updated_at = ?
               WHERE id = ?`,
            [endedAt, input.reason, billableSeconds, endedAt, r.id],
          );
          return {
            id: r.id,
            endedAt,
            endReason: input.reason,
            billableSeconds,
          };
        });
      });
    },

    /**
     * Per-task totals for CLOSED sessions started in [startAt, endAt) — what
     * the tracker shows next to each task after a relaunch (time worked and
     * the day's first-start / last-end range). The open session is excluded
     * for the same reason as sumBillableSecondsByContract: its live total
     * comes from the timer snapshot, not this row.
     */
    sumBillableSecondsByTask(input: {
      userId: string;
      startAt: number;
      endAt: number;
    }): DailyTaskTotal[] {
      return many(
        db,
        DailyTaskTotalRow,
        `SELECT contract_id, task_id,
                SUM(billable_seconds) AS total_billable_seconds,
                MIN(started_at) AS first_started_at,
                MAX(ended_at) AS last_ended_at
           FROM session
          WHERE user_id = ? AND ended_at IS NOT NULL
            AND started_at >= ? AND started_at < ?
          GROUP BY contract_id, task_id`,
        [input.userId, input.startAt, input.endAt],
      );
    },

    /** The user's most recent session (open or closed), any day. */
    findLatest(userId: string): SessionRow | null {
      return one(
        db,
        SessionRow,
        `SELECT * FROM session WHERE user_id = ? ORDER BY started_at DESC LIMIT 1`,
        [userId],
      );
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
